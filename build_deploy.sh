#!/usr/bin/env bash
set -euo pipefail

# Build the remote Seq connector and push it to both Harbor registries.
#
# The image is pushed under TWO tags: the service's own package.json version and
# "latest". The version tag is the one the tenant overlays PIN
# (kustomize-tenants-{test,prod}/mcp/seq-mcp) — a mutable tag is how grafana-mcp
# took the prod pod down on 2026-08-26, since Kubernetes can pull different code
# on a restart without the manifest having changed. "latest" is pushed alongside
# it only while the overlays still ask for it; once they are pinned, drop it.
#
# A version bump therefore means editing package.json AND each overlay's
# newTag — pushing alone rolls out nothing for a pinned tag, deliberately.
#
#   TAG=… ./build_deploy.sh     # override the tag (default: package.json version)

TAG="${TAG:-$(node -p "require('./package.json').version")}"

docker build -t webmed-seq-connector .

# ── test (juju-context-test) → https://seq-mcp.public.webmedepj.no, upstream seq.k8s.webmedepj.no ──
TEST_IMAGE="harbor.k8s.webmedepj.no:443/webmed/seq-test-mcp"
docker tag  webmed-seq-connector "${TEST_IMAGE}:${TAG}"
docker push "${TEST_IMAGE}:${TAG}"
docker tag  webmed-seq-connector "${TEST_IMAGE}:latest"
docker push "${TEST_IMAGE}:latest"
kubectl --context juju-context-test rollout restart -n webmed-mcp deployment/seq-mcp-test

# ── prod (juju-context) → https://seq-mcp.public.webmed.no, upstream seq.intern.webmed.no ──
PROD_IMAGE="harbor.k8s.webmed.no:443/webmed/seq-prod-mcp"
docker tag  webmed-seq-connector "${PROD_IMAGE}:${TAG}"
docker push "${PROD_IMAGE}:${TAG}"
docker tag  webmed-seq-connector "${PROD_IMAGE}:latest"
docker push "${PROD_IMAGE}:latest"
kubectl --context juju-context rollout restart -n webmed-mcp deployment/seq-mcp-prod

echo
echo "Pushed ${TAG} (and latest) to both registries."
echo "The overlays pin the tag — bump newTag to ${TAG} in:"
echo "  kustomize-tenants-test/mcp/seq-mcp/kustomization.yaml"
echo "  kustomize-tenants-prod/mcp/seq-mcp/kustomization.yaml"
