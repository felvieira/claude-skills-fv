import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

export const ROUTE_DECISIONS = new Set(["accepted", "overridden", "rejected"]);

// Same rotation/retention approach as hooks/scripts/session-event-logger.mjs
// (events.jsonl) -- keeps the technique consistent across the kit's JSONL logs.
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB rotation threshold
const RETENTION_DAYS = 14; // prune rotated feedback logs older than this

function feedbackPath(root) {
  return path.join(path.resolve(root), ".bot", "route-feedback.jsonl");
}

function normalizeIds(ids) {
  return [...new Set((ids || []).map((id) => String(id).trim()).filter(Boolean))];
}

async function maybeRotate(destination) {
  try {
    const stat = await fs.stat(destination);
    if (stat.size < MAX_BYTES) return;
    const date = new Date().toISOString().slice(0, 10);
    const rotated = destination.replace(".jsonl", `.${date}.jsonl`);
    const dest = fsSync.existsSync(rotated) ? rotated.replace(".jsonl", `-${Date.now()}.jsonl`) : rotated;
    await fs.rename(destination, dest);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function maybePrune(destination) {
  // Throttle: only prune ~1 in 200 writes to avoid overhead per call.
  if (Math.random() > 0.005) return;
  try {
    const dir = path.dirname(destination);
    const base = path.basename(destination);
    const rotatedPattern = new RegExp(`^${base.replace(".jsonl", "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.[0-9]{4}-[0-9]{2}-[0-9]{2}.*\\.jsonl$`);
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const name of await fs.readdir(dir)) {
      if (!rotatedPattern.test(name)) continue;
      const full = path.join(dir, name);
      try {
        const stat = await fs.stat(full);
        if (stat.mtimeMs < cutoff) await fs.unlink(full);
      } catch {
        // per-file failure is fine
      }
    }
  } catch {
    // directory unreadable — nothing to prune
  }
}

export async function appendRouteFeedback({ root = process.cwd(), decision, task, source = "manual", selected = [], reason } = {}) {
  if (!ROUTE_DECISIONS.has(decision)) {
    throw new Error("decision must be accepted, overridden, or rejected");
  }
  const record = {
    schema_version: "1.0",
    ts: new Date().toISOString(),
    decision,
    source: String(source || "manual").slice(0, 80),
    task: String(task || "").slice(0, 500),
    selected: normalizeIds(selected),
    ...(reason ? { reason: String(reason).slice(0, 500) } : {}),
  };
  const destination = feedbackPath(root);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await maybeRotate(destination);
  await fs.appendFile(destination, `${JSON.stringify(record)}\n`, "utf8");
  await maybePrune(destination);
  return { file: destination, record };
}

export async function summarizeRouteFeedback({ root = process.cwd(), sinceMs = null } = {}) {
  const source = feedbackPath(root);
  let records = [];
  try {
    const lines = (await fs.readFile(source, "utf8")).split("\n").filter(Boolean);
    records = lines.flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    }).filter((record) => !sinceMs || !record.ts || new Date(record.ts).getTime() >= sinceMs);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return summarizeRecords(source, records);
}

export function summarizeRouteFeedbackSync({ root = process.cwd(), sinceMs = null } = {}) {
  const source = feedbackPath(root);
  let records = [];
  try {
    records = fsSync.readFileSync(source, "utf8").split("\n").filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    }).filter((record) => !sinceMs || !record.ts || new Date(record.ts).getTime() >= sinceMs);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return summarizeRecords(source, records);
}

function summarizeRecords(source, records) {
  const byDecision = { accepted: 0, overridden: 0, rejected: 0 };
  const plugins = new Map();
  for (const record of records) {
    if (ROUTE_DECISIONS.has(record.decision)) byDecision[record.decision]++;
    for (const plugin of normalizeIds(record.selected)) {
      const stats = plugins.get(plugin) || { plugin, accepted: 0, overridden: 0, rejected: 0, total: 0 };
      if (ROUTE_DECISIONS.has(record.decision)) stats[record.decision]++;
      stats.total++;
      plugins.set(plugin, stats);
    }
  }
  return {
    file: source,
    total: records.length,
    by_decision: byDecision,
    acceptance_rate: records.length ? byDecision.accepted / records.length : null,
    overrides_or_rejections: byDecision.overridden + byDecision.rejected,
    top_plugins: [...plugins.values()].sort((a, b) => b.total - a.total || a.plugin.localeCompare(b.plugin)).slice(0, 8),
  };
}
