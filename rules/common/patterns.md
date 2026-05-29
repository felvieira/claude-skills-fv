# Design patterns — universal

- **Deep modules.** A module should hide a lot behind a small interface. A shallow module (complex interface, trivial body) earns its keep only if deleting it concentrates complexity somewhere worse. See skill `38-architecture-deepener`.
- **Make illegal states unrepresentable.** Model with types/enums so the compiler rejects the bad case, instead of validating it at runtime everywhere.
- **Single source of truth.** No duplicated state. Derive, don't copy.
- **Composition over inheritance.** Prefer small composable pieces to deep class hierarchies.
- **Errors are values or exceptions — pick the language's idiom and be consistent.** Never swallow them silently (no empty `catch`, no `.catch(() => [])` that hides failure). A caught error is either handled, rethrown, or logged-with-context.
- **Dependencies point inward.** Domain logic doesn't import framework/IO. Inject the boundary.
- **YAGNI.** Don't build extension points, config flags, or abstractions for futures that aren't here.

The repo's actual patterns (codified) → skill `47-pattern-conformity` → `memory/patterns.md`.
