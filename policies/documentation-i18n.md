# Documentation i18n Policy

> 🌎 [English] · 🇧🇷 [Português]: same content, English is canonical

## Languages

The Dev Team Kit maintains documentation in two languages:

- **English** — canonical, source of truth (`README.md`, `docs/`, etc.)
- **pt-BR** — translated copy (`README.pt-BR.md`, `docs/*.pt-BR.md` where applicable)

## Rules

1. **English is primary.** When changing user-facing docs, edit the English version first; the pt-BR translation must be updated in the same change.
2. **Cross-link.** Each language file must link to the other at the top and bottom.
3. **Same structure.** Section ordering, headers, and code blocks must match across versions. Don't add a section to one without adding it to the other.
4. **Untranslated terms.** Brand names, code blocks, file paths, command names, and domain terms (`skill`, `agent`, `worktree`, `polish`, `runId`) stay verbatim.
5. **Plans and design docs** (`docs/plans/*.md`) — author in whichever language the conversation happened in; translation only required if the doc graduates to user-facing reference material.
6. **Commit message** — when both files change, mention "(en + pt-BR)" in the commit body.

## Files currently bilingual

- `README.md` ↔ `README.pt-BR.md`

(Add to this list as more docs are translated.)
