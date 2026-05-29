# Code review — universal

What a senior, perfectionist reviewer rejects (fix it before asking for review):

- **Correctness first.** Off-by-one, null/undefined, unhandled error path, race condition, wrong boundary.
- **Duplicated state or logic.** DRY violations that will drift out of sync.
- **Swallowed errors.** Empty catch, ignored return value, `.catch(() => …)` that hides failure, missing rollback.
- **Inconsistent with the codebase.** New pattern where an established one exists. Conform first.
- **Scope creep.** Unrelated refactors riding along in a bugfix. Keep the diff to the task.
- **Untested behavior.** New logic with no test proving it; a bugfix with no regression test.
- **Leaky abstractions / shallow modules.** Complex interface hiding little.
- **Comments that restate code, or that reference the task/PR.**

Reviewing your own work before review is cheaper than a round-trip. Deep review → skill `11-reviewer` / subagent `code-reviewer`. New prose (docs/PRDs/copy) → subagent `anti-ai-writing`.
