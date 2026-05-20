#!/usr/bin/env node
/**
 * savings-report.mjs — aggregates all dev-team-kit-fv telemetry sources into
 * a single actionable report showing what the kit saved/prevented for the user.
 *
 * Sources (all best-effort, fail-open):
 *   .auto/events.jsonl                         — every tool call (session-event-logger)
 *   .bot/.tool-usage.json                      — reads/searches/writes counters (pre-tool-enforcer)
 *   .bot/agent-dispatch-errors.jsonl           — skill-as-subagent blocks (agent-dispatch-validator, v2.2.1+)
 *   .bot/pre-execution-gate.jsonl              — gate decisions (v2.4.0+)
 *   .swarm/classifier.jsonl                    — intent classifier decisions
 *
 * Usage:
 *   node scripts/savings-report.mjs                          # full report, current project, all-time
 *   node scripts/savings-report.mjs --since 24h              # last 24 hours
 *   node scripts/savings-report.mjs --since 7d               # last 7 days
 *   node scripts/savings-report.mjs --mini                   # 3-line summary (for Stop hook)
 *   node scripts/savings-report.mjs --format json            # machine-readable
 *   node scripts/savings-report.mjs --root /path/to/project  # override project root
 */

import fs from "node:fs";
import path from "node:path";

// ─── Pricing table (Anthropic Sonnet 4.x range, May 2026 estimates) ───────────
const PRICING_USD_PER_MTOK = {
  input:  3.00,
  output: 15.00,
  cache_read: 0.30,
  cache_write: 3.75,
};

// ─── Heuristics for "tokens saved" estimates ──────────────────────────────────
// All declared inline so users can audit. NOT marketing numbers.
const SAVINGS_HEURISTICS = {
  REREAD_AVG_FILE_TOKENS: 800,
  SKILL_AS_SUBAGENT_TOKENS_SAVED: 1500,
  ENRICHED_PROMPT_TOKENS_SAVED: 2500,
  REPEATED_SEARCH_TOKENS_SAVED: 400,
  BUG_PREVENTED_USD: 0.50,
  HOURS_PER_BUG_PREVENTED: 0.5,
};

function parseArgs(argv) {
  const args = { since: null, mini: false, format: "markdown", root: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--since") args.since = argv[++i];
    else if (a === "--mini") args.mini = true;
    else if (a === "--format") args.format = argv[++i];
    else if (a === "--root") args.root = argv[++i];
  }
  return args;
}

function parseSince(spec) {
  if (!spec) return null;
  const m = spec.match(/^(\d+)\s*([smhd])$/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  const mul = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  return Date.now() - n * mul;
}

function findProjectRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(dir, ".git")) ||
        fs.existsSync(path.join(dir, ".bot")) ||
        fs.existsSync(path.join(dir, ".auto"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

function readJsonl(file, sinceMs) {
  if (!fs.existsSync(file)) return [];
  try {
    const lines = fs.readFileSync(file, "utf-8").split("\n").filter(Boolean);
    const records = [];
    for (const line of lines) {
      try {
        const r = JSON.parse(line);
        if (sinceMs && r.ts && new Date(r.ts).getTime() < sinceMs) continue;
        records.push(r);
      } catch {}
    }
    return records;
  } catch {
    return [];
  }
}

function readJson(file, fallback = {}) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function collectAgentDispatchBlocks(root, sinceMs) {
  const records = readJsonl(path.join(root, ".bot/agent-dispatch-errors.jsonl"), sinceMs);
  const blocked = records.filter(r => r.blocked === true);
  const skillBlocks = blocked.filter(r => r.detected_as === "skill").length;
  const unknownBlocks = blocked.filter(r => r.detected_as === "unknown").length;
  const tokens_saved =
    skillBlocks * SAVINGS_HEURISTICS.SKILL_AS_SUBAGENT_TOKENS_SAVED +
    unknownBlocks * (SAVINGS_HEURISTICS.SKILL_AS_SUBAGENT_TOKENS_SAVED / 2);
  return {
    total_blocks: blocked.length,
    skill_as_subagent_blocks: skillBlocks,
    unknown_name_blocks: unknownBlocks,
    tokens_saved,
    top_offenders: topN(records, r => r.subagent_type, 5),
  };
}

function collectToolUsage(root) {
  const usage = readJson(path.join(root, ".bot/.tool-usage.json"), {
    reads: {}, searches: {}, writes: {}, repeated_signals: [], bytes_read: 0, large_reads: []
  });
  const repeatedReads = Object.entries(usage.reads || {}).filter(([, n]) => n >= 3);
  const repeatedSearches = Object.entries(usage.searches || {}).filter(([, n]) => n >= 3);
  const tokens_saved =
    repeatedReads.length * SAVINGS_HEURISTICS.REREAD_AVG_FILE_TOKENS +
    repeatedSearches.length * SAVINGS_HEURISTICS.REPEATED_SEARCH_TOKENS_SAVED;
  return {
    total_reads: Object.values(usage.reads || {}).reduce((a, b) => a + b, 0),
    total_searches: Object.values(usage.searches || {}).reduce((a, b) => a + b, 0),
    total_writes: Object.values(usage.writes || {}).reduce((a, b) => a + b, 0),
    repeated_reads_flagged: repeatedReads.length,
    repeated_searches_flagged: repeatedSearches.length,
    bytes_read: usage.bytes_read || 0,
    large_reads_count: (usage.large_reads || []).length,
    repeated_signals_count: (usage.repeated_signals || []).length,
    hot_files: repeatedReads.sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, n]) => ({ file: shortPath(f), reads: n })),
    tokens_saved,
  };
}

function collectGateDecisions(root, sinceMs) {
  const records = readJsonl(path.join(root, ".bot/pre-execution-gate.jsonl"), sinceMs);
  const counts = { concrete_bypass: 0, open_discussion_bypass: 0, force_bypass: 0, enrich: 0, guided_enrich: 0, pass_through: 0 };
  for (const r of records) {
    if (r.decision && counts[r.decision] !== undefined) counts[r.decision]++;
  }
  const enrichedTotal = counts.enrich + counts.guided_enrich;
  return {
    total_prompts: records.length,
    ...counts,
    enrichment_rate: records.length ? (enrichedTotal / records.length) : 0,
    tokens_saved: enrichedTotal * SAVINGS_HEURISTICS.ENRICHED_PROMPT_TOKENS_SAVED,
  };
}

function collectEvents(root, sinceMs) {
  const records = readJsonl(path.join(root, ".auto/events.jsonl"), sinceMs);
  const total = records.length;
  const errors = records.filter(r => r.status === "error").length;
  const byTool = {};
  let totalBytes = 0;
  for (const r of records) {
    byTool[r.tool] = (byTool[r.tool] || 0) + 1;
    totalBytes += r.bytes_out || 0;
  }
  return {
    total_tool_calls: total,
    error_count: errors,
    error_rate: total ? (errors / total) : 0,
    total_bytes_returned: totalBytes,
    top_tools: Object.entries(byTool).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tool, n]) => ({ tool, calls: n })),
    span_hours: spanHours(records),
  };
}

function collectClassifier(root, sinceMs) {
  const records = readJsonl(path.join(root, ".swarm/classifier.jsonl"), sinceMs);
  const decisions = records.filter(r => r.result === "suggested");
  const byCategory = {};
  let llmUsed = 0;
  for (const r of decisions) {
    if (r.category) byCategory[r.category] = (byCategory[r.category] || 0) + 1;
    if (r.used_llm) llmUsed++;
  }
  return {
    total_classifications: decisions.length,
    llm_calls: llmUsed,
    regex_calls: decisions.length - llmUsed,
    by_category: byCategory,
  };
}

function topN(records, keyFn, n) {
  const counts = {};
  for (const r of records) {
    const k = keyFn(r);
    if (!k) continue;
    counts[k] = (counts[k] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ name: k, count: v }));
}

function shortPath(p) {
  if (!p) return p;
  const parts = String(p).split(/[/\\]/);
  return parts.length <= 3 ? p : `…/${parts.slice(-3).join("/")}`;
}

function spanHours(records) {
  if (!records.length) return 0;
  const tss = records.map(r => new Date(r.ts).getTime()).filter(Boolean);
  if (!tss.length) return 0;
  return ((Math.max(...tss) - Math.min(...tss)) / 3_600_000).toFixed(1);
}

function formatTokens(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function tokensToUSD(tokens, kind = "input") {
  return (tokens / 1_000_000) * (PRICING_USD_PER_MTOK[kind] || 3);
}

function formatUSD(usd) {
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

function formatBytes(b) {
  if (!b) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}

function collectHarnessCoverage(root, sinceMs) {
  // Inspired by Birgitta Böckeler: "harness coverage similar to code coverage".
  // Counts which declared sensors actually fired in the window.
  // Plus trust calibration (v2.6.0+): alarm sensors silent for too long.
  const sensors = {
    "agent-dispatch-validator": { source: ".bot/agent-dispatch-errors.jsonl", category: "maintainability" },
    "pre-execution-gate":       { source: ".bot/pre-execution-gate.jsonl",   category: "behaviour" },
    "intent-classifier":        { source: ".swarm/classifier.jsonl",         category: "meta" },
    "session-event-logger":     { source: ".auto/events.jsonl",              category: "meta" },
  };
  const SILENT_ALARM_DAYS = 7; // sensor silent > 7d = trust calibration alarm
  const coverage = {};
  for (const [name, meta] of Object.entries(sensors)) {
    // Read full file (not just window) to find last firing
    const allRecords = readJsonl(path.join(root, meta.source), null);
    const windowRecords = readJsonl(path.join(root, meta.source), sinceMs);
    const lastTs = allRecords.length ? allRecords[allRecords.length - 1].ts : null;
    const daysSinceLastFiring = lastTs
      ? (Date.now() - new Date(lastTs).getTime()) / 86400000
      : null;

    const silentAlarm = daysSinceLastFiring !== null && daysSinceLastFiring > SILENT_ALARM_DAYS;

    coverage[name] = {
      ...meta,
      fired: windowRecords.length,
      active: windowRecords.length > 0,
      last_fired_at: lastTs,
      days_since_last_firing: daysSinceLastFiring,
      silent_alarm: silentAlarm,
    };
  }
  const total = Object.keys(coverage).length;
  const active = Object.values(coverage).filter(c => c.active).length;
  const silentAlarms = Object.values(coverage).filter(c => c.silent_alarm).length;
  return {
    declared: total,
    active,
    silent_alarms: silentAlarms,
    coverage_pct: total ? (active / total) * 100 : 0,
    sensors: coverage,
  };
}

function aggregate({ root, since }) {
  const sinceMs = parseSince(since);
  const agentDispatch = collectAgentDispatchBlocks(root, sinceMs);
  const toolUsage = collectToolUsage(root);
  const gate = collectGateDecisions(root, sinceMs);
  const events = collectEvents(root, sinceMs);
  const classifier = collectClassifier(root, sinceMs);
  const harnessCoverage = collectHarnessCoverage(root, sinceMs);

  const totalTokensSaved = agentDispatch.tokens_saved + toolUsage.tokens_saved + gate.tokens_saved;
  const usdSaved = tokensToUSD(totalTokensSaved, "input");

  const bugsPrevented =
    agentDispatch.skill_as_subagent_blocks +
    agentDispatch.unknown_name_blocks +
    Math.floor(toolUsage.repeated_signals_count / 2);

  const hoursEquivalent = bugsPrevented * SAVINGS_HEURISTICS.HOURS_PER_BUG_PREVENTED;
  const usdBugs = bugsPrevented * SAVINGS_HEURISTICS.BUG_PREVENTED_USD;

  const efficiency = events.total_tool_calls
    ? Math.round(events.total_bytes_returned / events.total_tool_calls)
    : 0;

  return {
    meta: {
      generated_at: new Date().toISOString(),
      project_root: root,
      since: since || "all-time",
      window_hours: sinceMs ? ((Date.now() - sinceMs) / 3_600_000).toFixed(1) : null,
    },
    totals: {
      tokens_saved_estimated: totalTokensSaved,
      usd_saved_estimated: usdSaved,
      bugs_prevented: bugsPrevented,
      usd_bugs_prevented: usdBugs,
      hours_equivalent: hoursEquivalent,
    },
    harness_coverage: harnessCoverage,
    agent_dispatch: agentDispatch,
    tool_usage: toolUsage,
    gate,
    events,
    classifier,
    efficiency_bytes_per_call: efficiency,
  };
}

function renderMini(report) {
  const t = report.totals;
  const lines = [];
  lines.push(`[Savings] ~${formatTokens(t.tokens_saved_estimated)} tokens saved (~${formatUSD(t.usd_saved_estimated)}) · ${t.bugs_prevented} risks prevented · ${report.gate.total_prompts} prompts processed`);
  if (report.agent_dispatch.skill_as_subagent_blocks > 0) {
    lines.push(`  • ${report.agent_dispatch.skill_as_subagent_blocks}× blocked skill-as-subagent dispatch (v2.2.1 hook)`);
  }
  if (report.tool_usage.repeated_signals_count > 0) {
    lines.push(`  • ${report.tool_usage.repeated_signals_count} repeated-read/search signals flagged`);
  }
  lines.push(`  Run '/savings' for full report.`);
  return lines.join("\n");
}

function renderMarkdown(report) {
  const t = report.totals;
  const md = [];
  md.push(`# 📊 dev-team-kit-fv — Savings Report`);
  md.push(``);
  md.push(`> **Window:** ${report.meta.since} ${report.meta.window_hours ? `(${report.meta.window_hours}h)` : ""}  `);
  md.push(`> **Project:** \`${shortPath(report.meta.project_root)}\`  `);
  md.push(`> **Generated:** ${report.meta.generated_at}`);
  md.push(``);
  md.push(`## 💰 Bottom line`);
  md.push(``);
  md.push(`| Metric | Value |`);
  md.push(`|---|---|`);
  md.push(`| **Tokens saved (estimated)** | ${formatTokens(t.tokens_saved_estimated)} (~${formatUSD(t.usd_saved_estimated)}) |`);
  md.push(`| **Risks / bugs prevented** | ${t.bugs_prevented} (~${formatUSD(t.usd_bugs_prevented)} downstream cost avoided) |`);
  md.push(`| **Dev hours equivalent saved** | ~${t.hours_equivalent.toFixed(1)} h |`);
  md.push(`| **Combined value** | ~${formatUSD(t.usd_saved_estimated + t.usd_bugs_prevented)} |`);
  md.push(``);
  md.push(`> Heuristics declared in \`policies/savings-metrics.md\`. These are estimates, not billing data.`);
  md.push(``);

  // Harness coverage (v2.5.0+) — inspired by Birgitta Böckeler
  md.push(`## 🎯 Harness Coverage`);
  md.push(``);
  md.push(`${report.harness_coverage.active}/${report.harness_coverage.declared} sensors fired in this window (**${report.harness_coverage.coverage_pct.toFixed(0)}%** harness coverage)`);
  if (report.harness_coverage.silent_alarms > 0) {
    md.push(``);
    md.push(`🚨 **${report.harness_coverage.silent_alarms} sensor(s) silent for > 7 days** — possible trust calibration issue. See alarms below.`);
  }
  md.push(``);
  md.push(`| Sensor | Category | Fired (window) | Days since last firing | Status |`);
  md.push(`|---|---|---|---|---|`);
  for (const [name, meta] of Object.entries(report.harness_coverage.sensors)) {
    const days = meta.days_since_last_firing === null
      ? "never"
      : meta.days_since_last_firing < 1
        ? "<1d"
        : `${meta.days_since_last_firing.toFixed(1)}d`;
    let status = "✅ active";
    if (meta.silent_alarm) status = "🚨 silent alarm";
    else if (!meta.active) status = "⚪ silent";
    md.push(`| \`${name}\` | ${meta.category} | ${meta.fired} | ${days} | ${status} |`);
  }
  md.push(``);
  md.push(`> 🚨 **Silent alarm** = sensor hasn't fired in >7 days. Two possibilities:`);
  md.push(`> 1. **Project hygiene improved** — the sensor's pattern stopped happening (good). Verify by checking if the policy still matters.`);
  md.push(`> 2. **Sensor is broken or misconfigured** — Birgitta Böckeler: _"If sensors never fire, is that a sign of high quality or inadequate detection mechanisms?"_`);
  md.push(`> See \`policies/harness-categories.md\` Principle 5 + \`policies/self-correcting-sensors.md\`.`);
  md.push(``);

  md.push(`## 🛡 Agent Dispatch Validator (v2.2.1)`);
  md.push(``);
  if (report.agent_dispatch.total_blocks > 0) {
    md.push(`Blocked **${report.agent_dispatch.total_blocks}** invalid Agent dispatches:`);
    md.push(`- ${report.agent_dispatch.skill_as_subagent_blocks}× passing skill name as \`subagent_type\` (would have caused InputValidationError)`);
    md.push(`- ${report.agent_dispatch.unknown_name_blocks}× unknown subagent name (typos, made-up names)`);
    md.push(``);
    if (report.agent_dispatch.top_offenders.length) {
      md.push(`**Top offenders:**`);
      for (const o of report.agent_dispatch.top_offenders) {
        md.push(`- \`${o.name}\` × ${o.count}`);
      }
      md.push(``);
    }
  } else {
    md.push(`No invalid Agent dispatches detected. ✅`);
    md.push(``);
  }

  md.push(`## 🎯 Pre-Execution Gate (v2.3.0)`);
  md.push(``);
  if (report.gate.total_prompts > 0) {
    md.push(`Processed **${report.gate.total_prompts}** prompts:`);
    md.push(`- ${report.gate.concrete_bypass} concrete signal (file:line, error, code block) → fast pass`);
    md.push(`- ${report.gate.open_discussion_bypass} open discussion / opinion → bypass (no interrogation)`);
    md.push(`- ${report.gate.force_bypass} \`force:\` escape → bypass`);
    md.push(`- ${report.gate.enrich} ENRICH mode → infer + 3 options offered`);
    md.push(`- ${report.gate.guided_enrich} GUIDED ENRICH mode → 1 focused question asked`);
    md.push(`- **Enrichment rate:** ${(report.gate.enrichment_rate * 100).toFixed(1)}% of prompts received structured help`);
    md.push(``);
  } else {
    md.push(`No prompts recorded yet. Gate telemetry started in v2.4.0.`);
    md.push(``);
  }

  md.push(`## 📂 Tool Usage`);
  md.push(``);
  md.push(`| | Count |`);
  md.push(`|---|---|`);
  md.push(`| Total reads | ${report.tool_usage.total_reads} |`);
  md.push(`| Total searches | ${report.tool_usage.total_searches} |`);
  md.push(`| Total writes | ${report.tool_usage.total_writes} |`);
  md.push(`| Bytes read | ${formatBytes(report.tool_usage.bytes_read)} |`);
  md.push(`| Large reads (≥20KB) | ${report.tool_usage.large_reads_count} |`);
  md.push(`| Repeated signals flagged | ${report.tool_usage.repeated_signals_count} |`);
  md.push(``);
  if (report.tool_usage.hot_files.length) {
    md.push(`**🔥 Hot files (re-read ≥3×) — candidates for learned-skill extraction:**`);
    md.push(``);
    for (const h of report.tool_usage.hot_files) {
      md.push(`- \`${h.file}\` × ${h.reads}`);
    }
    md.push(``);
  }

  if (report.events.total_tool_calls > 0) {
    md.push(`## ⚙ Tool Call Activity`);
    md.push(``);
    md.push(`- **Total calls:** ${report.events.total_tool_calls}`);
    md.push(`- **Errors:** ${report.events.error_count} (${(report.events.error_rate * 100).toFixed(1)}% error rate)`);
    md.push(`- **Bytes returned:** ${formatBytes(report.events.total_bytes_returned)}`);
    md.push(`- **Avg bytes/call:** ${formatBytes(report.efficiency_bytes_per_call)}`);
    md.push(`- **Activity span:** ${report.events.span_hours}h`);
    md.push(``);
    if (report.events.top_tools.length) {
      md.push(`**Top tools used:**`);
      for (const tt of report.events.top_tools) {
        md.push(`- \`${tt.tool}\` × ${tt.calls}`);
      }
      md.push(``);
    }
  }

  if (report.classifier.total_classifications > 0) {
    md.push(`## 🧠 Intent Classifier`);
    md.push(``);
    md.push(`- **Total classifications:** ${report.classifier.total_classifications}`);
    md.push(`- **LLM-assisted:** ${report.classifier.llm_calls} (${((report.classifier.llm_calls / report.classifier.total_classifications) * 100).toFixed(1)}%)`);
    md.push(`- **Regex (free):** ${report.classifier.regex_calls}`);
    if (Object.keys(report.classifier.by_category).length) {
      md.push(`- **By category:**`);
      for (const [cat, n] of Object.entries(report.classifier.by_category).sort((a, b) => b[1] - a[1])) {
        md.push(`  - ${cat}: ${n}`);
      }
    }
    md.push(``);
  }

  md.push(`---`);
  md.push(``);
  md.push(`*Generated by \`scripts/savings-report.mjs\`. Heuristics audit: \`policies/savings-metrics.md\`. Re-run with \`/savings --since 7d\` for weekly view.*`);

  return md.join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = args.root || findProjectRoot();
  const report = aggregate({ root, since: args.since });

  if (args.format === "json") {
    process.stdout.write(JSON.stringify(report, null, 2));
    return;
  }
  if (args.mini) {
    process.stdout.write(renderMini(report));
    return;
  }
  process.stdout.write(renderMarkdown(report));
}

main();
