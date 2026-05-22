---
scenario: orchestrator-csv-pdf-export
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 520
time_seconds: 18
quality_score: 2.8
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 3
  actionability: 2
  discipline: 3
pass_fail: n/a
delta_vs_baseline: n/a
notes: "generic pipeline advice, no skill mapping, no gate specification, no stack-specific detail"
---

# Baseline — CSV/PDF Export Pipeline Planning

## Skills / Agents Order

1. **Product Owner / Spec** — define requirements: which reports, filters, columns, file formats, async or sync, download link or email delivery.
2. **Backend Developer** — implement export endpoints:
   - CSV: use a streaming library (csv-stringify or papaparse server-side).
   - PDF: use puppeteer, pdfkit, or react-pdf.
   - Store generated files in S3 with presigned URLs.
   - Add Prisma queries for report data.
3. **Frontend Developer** — add export buttons to report pages, call the endpoint, handle loading states, trigger download.
4. **QA / Testing** — unit test CSV/PDF generation logic, integration test the endpoint, E2E test the download flow.
5. **Security Review** — check authorization (users can only export their own data), S3 bucket policies, presigned URL expiry.
6. **DevOps / Deploy** — ensure Lambda/server has enough memory for PDF generation, configure S3 CORS if needed.

## Minimum Pipeline

```
spec → backend API → frontend integration → QA → security → deploy
```

## Human Gates

- After spec: confirm which reports, columns, and format options are in scope.
- After backend: review SQL queries for performance (large exports can be slow).
- Before deploy: security sign-off on S3 policies and auth checks.

## Risks

- PDF generation is CPU-heavy; consider offloading to a background job (queue + webhook).
- Large CSV exports can time out on serverless; use streaming responses or async job pattern.
- S3 presigned URLs expire; communicate TTL to users.
