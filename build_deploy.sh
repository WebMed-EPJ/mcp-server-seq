docker build -t webmed-seq-connector .

# ── test (juju-context-test) → https://seq-mcp.public.webmedepj.no, upstream seq.k8s.webmedepj.no ──
docker tag  webmed-seq-connector harbor.k8s.webmedepj.no:443/webmed/seq-test-mcp:latest
docker push harbor.k8s.webmedepj.no:443/webmed/seq-test-mcp:latest
kubectl --context juju-context-test rollout restart -n webmed-admin deployment/seq-mcp-test

# ── prod (juju-context) → https://seq-mcp.public.webmed.no, upstream seq.intern.webmed.no ──
docker tag  webmed-seq-connector harbor.k8s.webmedepj.no:443/webmed/seq-prod-mcp:latest
docker push harbor.k8s.webmedepj.no:443/webmed/seq-prod-mcp:latest
kubectl --context juju-context rollout restart -n webmed-admin deployment/seq-mcp-prod
