---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
---
# React / Next.js patterns

> Extends [common/patterns.md](../common/patterns.md) with React specifics.

- **Function components + hooks only.** No class components in new code.
- **Rules of Hooks:** call hooks at the top level, never in conditions/loops. One concern per custom hook.
- **Derive, don't duplicate state.** If a value is computable from props/state, compute it during render — don't mirror it in another `useState` + `useEffect`.
- **`useEffect` is for synchronizing with external systems** (subscriptions, DOM, network), not for reacting to props to set state. Most "effect to update state" is a bug — derive instead.
- **Stable keys** for lists — a real id, never the array index when the list reorders/filters.
- **Lift state only as far as needed.** Co-locate; reach for context/store (Zustand) only when prop-drilling genuinely hurts.
- **Server state ≠ client state.** Fetch/cache with React Query / RSC, not `useEffect` + `useState` hand-rolled.
- **Memoize on evidence, not reflex.** `useMemo`/`useCallback`/`memo` add cost; add them when a profile shows a real re-render problem.
- **Skeletons over spinners** for loading; handle error and empty states explicitly.

Deep frontend playbook → skill `04-frontend-integration`. Accessibility → skill `22-accessibility-specialist`.
