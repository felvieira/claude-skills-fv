# Development workflow — universal

- **Understand before changing.** Read the surrounding code and the existing pattern first. Reuse `docs/repo-audit/current.md` and `memory/patterns.md` instead of re-exploring.
- **Smallest change that solves it.** A bugfix doesn't need surrounding cleanup; a one-shot doesn't need a helper.
- **Verify behavior, not just types.** Type-check and tests prove code correctness, not feature correctness. For UI, exercise it in a browser. If you can't verify, say so — don't claim success.
- **Re-read a file before editing it after a long session.** Context may be stale (auto-compaction). Editing against stale state causes regressions.
- **Prefer editing existing files** over creating new ones. Don't create docs/READMEs unless asked.
- **Confirm risky/irreversible actions** (deletes, force-push, dropping tables, sending messages, shared-state changes) before doing them. Local reversible edits — just do them.
- **Infer the full scope, not just the literal words.** "App", "sistema", "plataforma", "ferramenta", "dashboard" almost always imply a UI a human uses — not just an API. When the request says "app" without saying "API only", deliver fullstack (UI + backend) and note the assumption. Conversely "API", "endpoint", "serviço", "CLI", "lib" mean backend-only — don't bolt on a UI nobody asked for. When genuinely ambiguous, pick the interpretation a non-technical user most likely meant and state it.

Pipeline / which specialist next → skill `09-orchestrator`. Task tracking → skill `08-context-manager`. UI work → skill `02-ui-ux-design` + `rules/frontend/ui-design.md`.
