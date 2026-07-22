#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { appendRouteFeedback, summarizeRouteFeedback, summarizeRouteFeedbackSync } from "../lib/route-feedback.mjs";

const root = await mkdtemp(path.join(os.tmpdir(), "devkit-route-feedback-"));
try {
  await appendRouteFeedback({ root, decision: "accepted", task: "implement endpoint", source: "auto", selected: ["development"] });
  await appendRouteFeedback({ root, decision: "overridden", task: "landing", source: "run-program", selected: ["product-marketing"], reason: "design-only scope" });
  await appendRouteFeedback({ root, decision: "rejected", task: "rename local variable", source: "auto" });
  const report = await summarizeRouteFeedback({ root });
  assert.equal(report.total, 3);
  assert.deepEqual(report.by_decision, { accepted: 1, overridden: 1, rejected: 1 });
  assert.equal(report.acceptance_rate, 1 / 3);
  assert.equal(report.top_plugins[0].plugin, "development");
  const syncReport = summarizeRouteFeedbackSync({ root });
  assert.deepEqual(syncReport.by_decision, report.by_decision);
  const routeScript = path.resolve("scripts", "route-task.mjs");
  execFileSync(process.execPath, [routeScript, "--json", "--out", "route.json", "implemente endpoint com testes"], { cwd: root, encoding: "utf8" });
  const artifact = JSON.parse(await readFile(path.join(root, "route.json"), "utf8"));
  assert.equal(artifact.plugins[0].id, "development");
  assert.equal(artifact.skill_count, artifact.skills.length);

  const routedIds = artifact.plugins.map((plugin) => plugin.id);
  await appendRouteFeedback({ root, decision: "accepted", task: artifact.prompt, source: "route-task", selected: routedIds });
  const endToEndReport = await summarizeRouteFeedback({ root });
  assert.equal(endToEndReport.total, 4);
  const routedStats = endToEndReport.top_plugins.find((entry) => entry.plugin === routedIds[0]);
  assert.ok(routedStats, "feedback recorded against the plugin id routeTask() actually returned");
  assert.equal(routedStats.accepted, 2);

  console.log("route-feedback: 11 assertions passed");
} finally {
  await rm(root, { recursive: true, force: true });
}
