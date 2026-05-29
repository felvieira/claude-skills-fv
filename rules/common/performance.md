# Performance — universal

- **Measure before optimizing.** No perf change without a baseline number. Guessing at hotspots wastes time and adds complexity.
- **Watch for N+1.** A query/request inside a loop is the most common real-world slowdown. Batch or join.
- **Don't load what you won't use.** Paginate, stream, select only needed columns/fields. Avoid loading whole collections into memory.
- **Cache deliberately, invalidate honestly.** A cache without an invalidation story is a future bug.
- **Async I/O, don't block.** Don't serialize independent I/O — run it concurrently.
- **One change, one hypothesis, re-measure.** Keep the winner only if the number moved and correctness held.

Big perf work → treat it as a measured loop (baseline → variants → correctness gate → promote). Observability/SLOs → skill `20-observability-sre`.
