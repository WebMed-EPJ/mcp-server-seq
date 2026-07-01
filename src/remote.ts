#!/usr/bin/env node
/**
 * WebMed Seq MCP connector — REMOTE (hosted) entry point.
 *
 * Serves the same tools as the stdio connector (seq-server.ts) over HTTP, as an
 * OAuth-protected MCP server. Authorization is a full OAuth 2.1 flow (dynamic
 * client registration, PKCE) federated to Microsoft Entra — the SAME sign-in
 * model as the WebMed Lime/m365 connectors (see src/remote/provider.ts). The
 * Seq API key is GLOBAL and lives only on this server, so the Entra leg purely
 * AUTHENTICATES the user — there is no per-user downstream token. Every
 * authenticated user is then served by the same shared Seq client, and every
 * log response is still PII-redacted by redactDeep before it leaves the process.
 *
 * Endpoints (mounted by the SDK auth router unless noted):
 *   /.well-known/oauth-authorization-server, /.well-known/oauth-protected-resource
 *   /register  /authorize  /token  /revoke
 *   /callback  (our route — Entra redirects here)
 *   /healthz   (our route — unauthenticated liveness probe)
 *   /mcp       (bearer-protected MCP Streamable HTTP; POST only, GET/DELETE → 405)
 *
 * RUN: REMOTE_PUBLIC_URL=https://seq-mcp.webmed.no PORT=8790 \
 *      TENANT_ID=… CLIENT_ID=… CLIENT_SECRET=… \
 *      SEQ_BASE_URL=… SEQ_API_KEY=… npm run start:remote
 *
 * DEPLOYMENT: terminate TLS in front of this process (it speaks plain HTTP);
 * REMOTE_PUBLIC_URL must be the public https origin. The OAuth state is in-memory
 * — single instance only; see src/remote/stores.ts.
 */
import express from "express";
import 'dotenv/config';
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";

import { loadRemoteConfig } from "./remote-config.js";
import { accessLogMiddleware, errorFields, loggerFromEnv } from "./logger.js";
import { createSeqServer, SEQ_API_KEY, SEQ_BASE_URL } from "./server.js";
import { EntraOAuthProvider } from "./remote/provider.js";
import { createServiceTokenVerifier } from "./remote/service-auth.js";

const logger = loggerFromEnv();

async function main(): Promise<void> {
  const config = loadRemoteConfig();

  // The upstream Seq target lives in server.ts (shared with the stdio entry).
  // The remote server is useless without an API key — most Seq instances reject
  // unauthenticated API calls — so fail closed rather than start a server that
  // can only ever return upstream 401s.
  if (!SEQ_API_KEY) {
    throw new Error(
      "Missing required environment variable SEQ_API_KEY. The remote connector refuses to start without it (fail-closed).",
    );
  }
  // server.ts defaults SEQ_BASE_URL to http://localhost:8080 for the local stdio
  // dev path, but a hosted remote server silently targeting localhost is a
  // misconfiguration (it contradicts the docs/.env.example). Require it
  // explicitly in remote mode rather than inheriting that default.
  if (!process.env.SEQ_BASE_URL?.trim()) {
    throw new Error(
      "Missing required environment variable SEQ_BASE_URL. The remote connector refuses to start without it (fail-closed) — it must point at the Seq server explicitly (no localhost default in remote mode).",
    );
  }

  const port = Number(process.env.PORT?.trim() || "8790");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535 (got "${process.env.PORT}").`);
  }
  // Number of reverse-proxy hops in front of this process (TLS-terminating
  // ingress/load balancer). The SDK auth router rate-limits per client IP via
  // express-rate-limit, which refuses to read a forwarded IP unless Express is
  // told to trust the proxy — without this it throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
  // Default 1 = a single ingress. NEVER set this larger than the real hop count:
  // each trusted hop lets the client spoof one more X-Forwarded-For entry and evade
  // the rate limiter. Set 0 only when nothing proxies us. Treat an empty/whitespace
  // value as unset (Number("") is 0, which would silently trust ZERO hops).
  const rawHops = process.env.TRUST_PROXY_HOPS?.trim();
  const trustProxyHops = Number(rawHops || "1");
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error(
      `TRUST_PROXY_HOPS must be a non-negative integer (got "${process.env.TRUST_PROXY_HOPS}").`,
    );
  }

  const serviceVerifier = config.serviceAuth
    ? createServiceTokenVerifier(config.serviceAuth, undefined, logger)
    : undefined;
  if (config.serviceAuth) {
    logger.info("service-token (machine) auth enabled", {
      requiredRole: config.serviceAuth.requiredRole,
      audiences: config.serviceAuth.audiences.length,
      allowedClients: config.serviceAuth.allowedClientIds.length,
    });
  }
  const provider = new EntraOAuthProvider({ entra: config.entra, publicBaseUrl: config.publicBaseUrl, logger, serviceVerifier });

  // Evict expired OAuth state every minute so abandoned flows / unused tokens
  // can't accumulate (lazy expiry alone never reclaims them). unref() so the
  // timer never keeps the process alive on its own.
  setInterval(() => provider.sweepExpired(), 60_000).unref();

  const app = express();
  // Don't advertise the framework/version in responses (X-Powered-By).
  app.disable("x-powered-by");

  // Access-log every incoming HTTP request (method/path/status/size, /healthz
  // skipped). Query VALUES are masked so the OAuth /callback code never lands.
  app.use(accessLogMiddleware(logger));
  // Trust exactly `trustProxyHops` proxy hops so express-rate-limit (mounted by
  // the SDK auth router) keys on the real client IP from X-Forwarded-For instead
  // of throwing. A fixed hop count — not `true` — so a client can't spoof XFF.
  app.set("trust proxy", trustProxyHops);
  // Tool calls are small; 1mb leaves ample headroom.
  const maxJsonBody = process.env.MAX_JSON_BODY?.trim() || "1mb";
  app.use(express.json({ limit: maxJsonBody }));

  // Unauthenticated liveness/readiness probe for load balancers, reverse-proxy
  // upstream checks, and the container HEALTHCHECK. Cheap and side-effect free.
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", service: "seq-mcp-server", uptime: Math.round(process.uptime()) });
  });

  // OAuth authorization-server + protected-resource metadata, DCR, /authorize,
  // /token, /revoke. Must be mounted at the app root.
  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl: new URL(config.publicBaseUrl),
      scopesSupported: config.entra.scopes,
      resourceName: "WebMed Seq MCP connector",
      resourceServerUrl: new URL("/mcp", config.publicBaseUrl),
    }),
  );

  // Entra redirects the browser here after sign-in.
  app.get("/callback", (req, res) => {
    provider.handleEntraCallback(req.query as Record<string, unknown>, res).catch((err) => {
      // Log the detail (PII-safe via errorFields) but never reflect the raw
      // exception message back to the browser — it can carry internal/OAuth
      // detail. The user gets a generic message.
      logger.error("Entra callback failed", errorFields(err));
      if (!res.headersSent) {
        res.status(500).send("Sign-in callback failed. Please try signing in again.");
      }
    });
  });

  const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(new URL("/mcp", config.publicBaseUrl));
  const bearer = requireBearerAuth({ verifier: provider, resourceMetadataUrl });

  // MCP endpoint. Stateless: a fresh server + transport per request. A valid
  // bearer means an authenticated WebMed user; redactDeep still scrubs PII from
  // every log response inside the tools regardless of who is signed in.
  app.post("/mcp", bearer, async (req, res) => {
    const server = createSeqServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close().catch(() => {});
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      logger.error("MCP request handling failed", errorFields(err));
      if (!res.headersSent) {
        res.status(500).json({ error: "internal_error" });
      }
    }
  });

  // Streamable HTTP also probes GET/DELETE; stateless mode has no session to serve.
  const methodNotAllowed = (_req: express.Request, res: express.Response) =>
    res.status(405).set("Allow", "POST").json({ error: "method_not_allowed" });
  app.get("/mcp", bearer, methodNotAllowed);
  app.delete("/mcp", bearer, methodNotAllowed);

  // Bind errors (EADDRINUSE/EACCES) arrive on the server's "error" event, not
  // as a throw from app.listen() — await them so they hit main()'s fatal path.
  await new Promise<void>((resolve, reject) => {
    const httpServer = app.listen(port, () => {
      httpServer.removeListener("error", reject);
      // Never log the API key.
      logger.info("remote listening", {
        port,
        publicBaseUrl: config.publicBaseUrl,
        trustProxyHops,
        auth: "Microsoft Entra OAuth",
        tenantId: config.entra.tenantId,
        seqBaseUrl: SEQ_BASE_URL,
      });
      resolve();
    });
    httpServer.once("error", reject);
  });
}

try {
  await main();
} catch (err) {
  logger.error("remote fatal", errorFields(err));
  process.exit(1);
}
