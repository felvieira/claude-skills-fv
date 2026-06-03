---
paths:
  - "**/*.css"
  - "**/*.scss"
  - "**/public/**"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/components/**"
  - "**/views/**"
---
# Frontend UI — aesthetic direction (always-on when touching visual files)

> The single most common failure of AI-generated UI is the *generic default*: indigo/blue accent, `system-ui` font, white card on grey, rounded corners, no point of view. It happens because no aesthetic decision was made — the model fell back to the statistical mean. This rule forces a decision.

## Before writing any CSS or styling a component

1. **Pick exactly ONE aesthetic anchor and commit to it.** Mixing anchors dilutes into the same generic mean. Choose one:
   - **Brutally minimal** — black/white/grey, precise neutral type (Helvetica, Söhne, Aktiv), generous whitespace, zero ornament
   - **Editorial** — serif display type, asymmetric layout, strong typographic hierarchy, magazine feel
   - **Warm / organic** — earthy palette, soft shadows, rounded but not generic, humanist sans
   - **Technical / data-dense** — monospace accents, tight grid, high information density, terminal-adjacent
   - **Playful / bold** — saturated color, oversized type, motion, personality
   - **Refined dark** — true dark (not grey-on-grey), one vivid accent, high contrast, premium feel

2. **Derive tokens from the anchor**, not from defaults:
   - **Never** default to `#4f46e5` / `#6366f1` indigo. If you reach for indigo, you skipped the decision.
   - **Never** default to `system-ui` / `-apple-system` alone — choose a typeface that fits the anchor (even a Google Font import is a decision; the system stack is the absence of one).
   - Define a real palette (bg, surface, border, text, muted, accent, danger) tied to the anchor.

3. **Empty states, loading states, and error states are part of the design** — not afterthoughts. A skeleton over a spinner; an empty state with a clear next action.

4. **Match the user's language.** If the prompt/spec is in Portuguese, the UI copy is in Portuguese. Don't ship English UI for a Portuguese product.

## Why this exists

A bench of "crie um app completo todo list" across 3 agents produced three near-identical indigo-on-grey UIs with `system-ui` — because none picked an anchor. The fix is not "try harder", it's "decide first". One anchor, executed precisely, beats the average of all of them.

Deep playbook → skill `02-ui-ux-design` (aesthetic anchors, tokens, accessibility, responsive). Component patterns → skill `04-frontend-integration`.
