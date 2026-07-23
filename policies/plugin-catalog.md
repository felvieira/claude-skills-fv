# Plugin Catalog Policy

## Objective

Make the kit select the smallest useful composition of existing skills for a task. The catalog is a routing layer, not a second skill tree and not an installer.

## Contract v1

Each `plugins/catalog/*.json` manifest declares:

- `id`, `name`, `description`, `risk`, `trust`
- `capabilities[]`, each with `id`, `when_any`, and existing `skills[]`
- optional `policies` and per-capability `commands`
- `availability` when a plugin is not bundled
- `install.provider` and an HTTPS `install.reference` for an external plugin

Skill identifiers must point to `skills/<id>/SKILL.md`. The catalog never copies, moves, or silently installs skills.
Every referenced policy must be an existing `policies/*.md` file.

`trust` is displayed before an external recommendation: `core` (maintained here), `official` (first-party provider), `verified-upstream` (maintained upstream integration), or `community` (third-party). Trust is provenance, not permission: risk gates still apply.

## Routing Rules

1. Honor an explicit user command or explicitly named skill first.
2. Match task language against capabilities and return at most three plugins and six skills by default.
3. Load only the returned skills; use skill 09 for a task with no reliable route.
4. Treat `high` risk as a human-review boundary. It cannot authorize external actions or professional advice.
5. External plugins are discoverable metadata only until the user installs and authorizes them. Include their provider and reference in the recommendation, never a simulated invocation.

## Validation

Run these after changing a manifest or routing logic:

```bash
node scripts/validate-plugin-catalog.mjs
node scripts/eval-plugin-routing.mjs --strict
node scripts/devkit-doctor.mjs --strict
```

`eval-plugin-routing.mjs` (and the fixtures under `evals/routing/`, `evals/triggers/`) check WHAT
the router recommends — string/keyword assertions against known prompts. They catch a wrong or
missing recommendation but cannot catch a broken MCP build.

`scripts/verify-mcp-runtime.mjs` (run automatically inside `devkit-doctor.mjs` when
`mcp-server/dist` is built, and in CI) checks whether the recommending SYSTEM itself boots: it
spawns the built MCP server as a real child process and performs a live `initialize` +
`tools/list` JSON-RPC round trip over stdio, asserting a non-empty tool list within 10s. It
catches a different failure mode — a broken build, a crashing constructor, a malformed tool
schema — that no amount of routing-keyword matching can catch. Run it directly with:

```bash
cd mcp-server && npm run build && cd ..
node scripts/verify-mcp-runtime.mjs
```

## Non-goals of v1

- selective physical installation
- a marketplace resolver
- calling external connectors automatically
- replacing the orchestrator or existing slash commands

Those need usage evidence and a compatibility migration first.
