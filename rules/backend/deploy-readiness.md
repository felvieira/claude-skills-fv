---
paths:
  - "**/server.*"
  - "**/app.*"
  - "**/main.*"
  - "**/index.*"
  - "**/Dockerfile"
  - "**/docker-compose*"
  - "**/*.service.*"
---
# Backend — deploy readiness (decide before you call it "done")

> Code that passes tests locally is not code that runs in production. The gap is the operational layer: how it starts, how it's observed, how it fails. Decide these when you build the entry point, not during the 2am incident.

## When building a server / service entry point

1. **Healthcheck endpoint.** A `GET /health` (or `/healthz`) that returns 200 when the process can serve traffic — including a real dependency check (DB ping) when cheap. Load balancers and orchestrators need it.

2. **Config from the environment, with a documented contract.** Every external value (port, DB path/URL, secrets, feature flags) comes from `process.env` / config — never hardcoded. List the required env vars in the README. Fail fast on boot if a required one is missing, with a clear message.

3. **Graceful shutdown.** Handle `SIGTERM`/`SIGINT`: stop accepting new connections, finish in-flight requests, close the DB, then exit. A `process.exit()` mid-request loses data.

4. **Structured, leveled logs.** Log to stdout in a parseable form (JSON in prod). Include enough to debug (request id, error, context) and nothing sensitive (no secrets, no PII, no full request bodies). One log line per meaningful event, not a debug dump.

5. **Port binding is configurable.** `const PORT = process.env.PORT ?? 3000` — never a hardcoded literal that collides with everything else on the box.

## Anti-patterns this prevents

- `app.listen(3000)` hardcoded → port collision, can't run two instances, can't deploy behind a proxy.
- No `/health` → orchestrator can't tell if the app is alive, routes traffic to a dead process.
- `console.log(req.body)` leaking secrets into logs.
- No SIGTERM handler → rolling deploy drops in-flight requests.

Deep playbook → skill `07-deploy-docker` (containerization) + `20-observability-sre` (logs, metrics, healthchecks). Canary → skill `43-canary-deployment`.
