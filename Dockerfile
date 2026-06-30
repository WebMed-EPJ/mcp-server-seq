# Container image for the WebMed Seq MCP REMOTE connector — the hosted,
# OAuth-protected HTTP MCP server. Multi-stage: compile TypeScript, then ship a
# slim prod-only runtime.
#
# Build (from this directory):
#   docker build -t webmed-seq-connector .
#
# Run (terminate TLS in front; REMOTE_PUBLIC_URL is the public https origin):
#   docker run --rm -p 8790:8790 \
#     -e REMOTE_PUBLIC_URL=https://seq-mcp.webmed.no \
#     -e TENANT_ID=… -e CLIENT_ID=… -e CLIENT_SECRET=… \
#     -e SEQ_BASE_URL=https://seq.internal.webmed.no \
#     -e SEQ_API_KEY=… \
#     webmed-seq-connector
#
# This serves only the REMOTE (HTTP/OAuth) connector. The local stdio connector
# (build/seq-server.js, run by the Claude Code seq-ops plugin) does not need a
# container.

FROM node:22-alpine AS build
LABEL maintainer="WebMed EPJ"
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json --outDir dist-server

FROM node:22-alpine AS runtime
LABEL maintainer="WebMed EPJ"
ENV NODE_ENV=production
ENV PORT=8790
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist-server ./dist-server
EXPOSE 8790
USER node

# Liveness: the unauthenticated /healthz endpoint must answer 200.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8790)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist-server/remote.js"]
