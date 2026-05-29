---
paths:
  - "**/*.ts"
  - "**/*.mts"
  - "**/*.cts"
  - "**/*.js"
  - "**/*.mjs"
---
# TypeScript / JavaScript coding style

> Extends [common/coding-style.md](../common/coding-style.md) with TS/JS specifics.

- **`strict: true`** in tsconfig. No implicit `any`. Treat `any` as a code smell — reach for `unknown` + narrowing.
- **No non-null `!` to silence the compiler.** If it can be null, handle it. `!` hides the bug the type system caught.
- **`const` by default**, `let` only when reassigned, never `var`.
- **Discriminated unions over boolean flags** for state. Model variants so impossible combos don't typecheck.
- **`type` for unions/aliases, `interface` for object shapes you extend.** Be consistent within a file.
- **Prefer `readonly` / `as const`** for data that shouldn't mutate.
- **Async:** `async/await`, not `.then()` chains. Never leave a promise unawaited (floating promise) — await it or explicitly `void` it.
- **Errors:** throw `Error` (or a subclass), never a string/object literal. Don't `catch` to return `null` silently.
- **No default exports** for modules with one clear thing — named exports refactor and autocomplete better. (Follow the repo's existing convention if it differs.)
- **ESM import order:** external → internal → relative, no unused imports.

Tools: `tsc --noEmit` for types, ESLint + Prettier for style. Run them before committing.
