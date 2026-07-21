#!/usr/bin/env node

import { summarizeRouteFeedback } from "./lib/route-feedback.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const rootIndex = args.indexOf("--root");
const root = rootIndex >= 0 ? args[rootIndex + 1] : process.cwd();

try {
  const report = await summarizeRouteFeedback({ root });
  const recommendations = [];
  if (report.total === 0) {
    recommendations.push("No feedback recorded yet. Record accept/override/reject after a routed run before calibrating catalog matches.");
  } else if (report.overrides_or_rejections / report.total >= 0.3) {
    recommendations.push("Overrides/rejections are at least 30%; review capability triggers before adding more skills.");
  } else {
    recommendations.push("Routing feedback is within the current calibration threshold; keep collecting decisions by task type.");
  }
  const output = { ...report, recommendations };
  if (json) console.log(JSON.stringify(output, null, 2));
  else {
    console.log(`Routing feedback: ${report.total} decisions`);
    console.log(`accepted=${report.by_decision.accepted} overridden=${report.by_decision.overridden} rejected=${report.by_decision.rejected}`);
    for (const recommendation of recommendations) console.log(`- ${recommendation}`);
  }
} catch (error) {
  console.error(`Could not generate routing insights: ${error.message}`);
  process.exit(1);
}
