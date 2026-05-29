# Git workflow — universal

- **Commit only when asked.** Don't create commits proactively. If unclear, ask.
- **One logical change per commit.** The message explains the *why*, not a restatement of the diff.
- **Stage specific files by name.** Avoid `git add -A`/`.` — it sweeps in `.env`, credentials, build artifacts.
- **New commits over amends.** When a pre-commit hook fails, the commit didn't happen — fix, re-stage, new commit. Don't `--amend` (it rewrites the *previous* commit).
- **Never skip hooks.** No `--no-verify` / `--no-gpg-sign` unless the user explicitly asks. A failing hook is a real problem — fix the cause.
- **Destructive ops need explicit OK.** `push --force`, `reset --hard`, `branch -D`, force-push to main — confirm with the user first. Never force-push main/master.
- **Don't touch git config.**

Releases / versioning / changelog → skill `24-release-manager`.
