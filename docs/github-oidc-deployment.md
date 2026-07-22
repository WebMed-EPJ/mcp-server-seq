# Deploying GitHub Actions OIDC auth for the Seq MCP connector

This note describes the deployment-side change needed to turn on the keyless
**GitHub Actions OIDC** auth path added to `src/remote.ts` (see the README
[GitHub Actions OIDC auth](../README.md#github-actions-oidc-auth-keyless-automation)
section). The server code is in this repo; the runtime configuration lives in the
**infra / kustomize repo**, so the configmap edit below must be made there.

## Kustomize configmap change (test environment)

The two hosted instances are rolled out from `build_deploy.sh`:

- **test** → deployment `seq-mcp-test` in namespace `webmed-admin`
  (`kustomize-base/microservices/seq-mcp/`), public origin
  `https://seq-mcp.public.webmedepj.no`, upstream `seq.k8s.webmedepj.no`.
- **prod** → deployment `seq-mcp-prod`, public origin
  `https://seq-mcp.public.webmed.no`.

Add the following environment variables to the **test** service's configmap
(e.g. `kustomize-base/microservices/seq-mcp/overlays/test/configmap.yaml`, or the
env block of the test deployment/kustomization — match the repo's existing
convention):

```yaml
# GitHub Actions OIDC (keyless) auth — test environment.
GITHUB_OIDC_ENABLED: "true"
GITHUB_OIDC_AUDIENCE: "https://seq-mcp.public.webmedepj.no"
GITHUB_OIDC_ALLOWED_REPOSITORIES: "WebMed-EPJ/epj"
# Optional, currently unset:
# GITHUB_OIDC_ALLOWED_OWNERS: "WebMed-EPJ"
# GITHUB_OIDC_ALLOWED_SUBJECTS: "repo:WebMed-EPJ/epj:*"
# GITHUB_OIDC_ISSUER defaults to https://token.actions.githubusercontent.com
```

Notes:

- `GITHUB_OIDC_AUDIENCE` **must** equal what the caller sends. gh-aw's
  `auth.audience` defaults to the MCP server URL, so keep both equal to
  `https://seq-mcp.public.webmedepj.no`.
- These are **not secrets** (no token or key), so a plain configmap is fine —
  `SEQ_API_KEY` and the Entra `CLIENT_SECRET` stay in their existing secret.
- Leaving **prod** untouched keeps GitHub OIDC off there (`GITHUB_OIDC_ENABLED`
  unset → default `false`); enable it separately once the test rollout is
  validated, using `GITHUB_OIDC_AUDIENCE=https://seq-mcp.public.webmed.no`.
- Fail-closed: if `GITHUB_OIDC_ENABLED=true` is set without any of the three
  allow-lists, every GitHub token is rejected and the server logs a startup
  warning — so always ship at least `GITHUB_OIDC_ALLOWED_REPOSITORIES`.

## Rollout

The image is rebuilt and rolled out exactly as today (no new build step):

```bash
./build_deploy.sh   # docker build + push + kubectl rollout restart (test & prod)
```

After the configmap change is merged in the infra repo and this image is pushed,
`kubectl --context juju-context-test rollout restart -n webmed-admin deployment/seq-mcp-test`
picks up both.
