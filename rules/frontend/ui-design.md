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

Start with the product, its users, content and tasks. A coherent visual direction should make those specific needs clear and preserve the existing brand and behavior when appropriate.

## Before writing any CSS or styling a component

1. Establish a direction from the brand, task, audience and supplied references. One or more influences can be combined when the result is coherent. Existing product tokens and platform conventions are evidence.
2. Choose typography, color, spacing, imagery and motion for their role. A common font, color, gradient or component is not a defect by itself. Check the complete composition rather than banning isolated styles.
3. Design applicable loading, empty, error, success and permission states. Preserve useful information and existing functionality during a redesign.
4. Match the product's language and use truthful content. Do not invent testimonials, metrics, certifications or working integrations.
5. Verify responsive behavior, semantics, keyboard access, focus, contrast and reduced motion as applicable. Record what was not tested.

## Why this exists

A generic result often comes from decisions that do not reflect the product. The remedy is to connect visual choices with real content and tasks, not to substitute another fixed palette.

That bench ran once and exposed a repeated composition; it did not prove a universal rule. `bench/ab/score-design.mjs` reports limited contrast measurements and style signals that need visual review.

## Checks and limits

Use these tools when applicable:

```bash
node scripts/check-design-generic.mjs <path>   # advisory signals; --strict is opt-in
node scripts/check-contrast.mjs <path>         # identifiable opaque token pairs; inspect each used theme
```

The `design-anchor-guard` hook offers a nonblocking reminder when several patterns co-occur. Neither its output nor a clean scan proves visual quality. Contrast must be checked against the actual rendered colors and relevant states.

Whole product → skill `92-design-director`. Deep playbook → `02-ui-ux-design`; existing product redesign → `89-ui-facelift`; component implementation → `04-frontend-integration`.
