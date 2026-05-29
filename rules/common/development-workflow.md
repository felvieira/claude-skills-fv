# Development workflow — universal

- **Understand before changing.** Read the surrounding code and the existing pattern first. Reuse `docs/repo-audit/current.md` and `memory/patterns.md` instead of re-exploring.
- **Smallest change that solves it.** A bugfix doesn't need surrounding cleanup; a one-shot doesn't need a helper.
- **Verify behavior, not just types.** Type-check and tests prove code correctness, not feature correctness. For UI, exercise it in a browser. If you can't verify, say so — don't claim success.
- **Re-read a file before editing it after a long session.** Context may be stale (auto-compaction). Editing against stale state causes regressions.
- **Prefer editing existing files** over creating new ones. Don't create docs/READMEs unless asked.
- **Confirm risky/irreversible actions** (deletes, force-push, dropping tables, sending messages, shared-state changes) before doing them. Local reversible edits — just do them.

Pipeline / which specialist next → skill `09-orchestrator`. Task tracking → skill `08-context-manager`.
