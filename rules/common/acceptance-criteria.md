# Acceptance criteria — decide "done" before you build (universal)

> The most expensive failure is building the wrong thing correctly. It happens when "done" is never defined, so the agent invents requirements (an extra field nobody asked for) or stops short (no error handling because no one said it was needed). Define done first.

## Before implementing any feature

1. **Write the acceptance criteria — even one line each.** What must be true for this to be "done"? Phrase as observable behavior, not implementation:
   - "Creating a todo with empty title returns 400 with a clear message" — testable.
   - "Uses a clean architecture" — not testable, not a criterion.

2. **Cover the four paths, not just the happy one.** For each behavior:
   - Happy path (the main case).
   - Error path (invalid input, missing resource, conflict).
   - Edge case (empty, zero, max, boundary, concurrent).
   - Regression (for any bug you're fixing, a test that proves it stays fixed).

3. **Don't invent scope.** Implement exactly what the criteria say. If the request is "todo list with CRUD", don't add tags, due dates, priorities, or a "description" field nobody asked for. New scope = ask or note the assumption, don't silently expand.

4. **Don't under-deliver either.** "A complete app" implies it runs, persists, handles errors, and a human can use it. "Complete" is part of the criteria — a happy-path-only prototype is not "complete".

5. **The criteria become the test list.** Each acceptance criterion maps to at least one test. If you can't write a test for a criterion, it's not concrete enough — sharpen it.

## Anti-patterns this prevents

- Inventing a `description` field, `priority`, or `tags` that the spec never mentioned.
- Shipping happy-path only because no one explicitly asked for error handling.
- "Done" meaning "code compiles" instead of "behavior is proven by a test".

Deep playbook → skill `01-po-feature-spec` (acceptance criteria, user stories). Test strategy → skill `05-qa-testing` + `rules/common/testing.md`.
