#!/usr/bin/env node
/**
 * PostToolUse hook (opt-in, disabled by default): detecta padrões comuns de
 * AI-generated writing em arquivos de prosa escritos/editados pelo agente.
 *
 * Ativação: setar "ai_writing_detector.enabled": true em hook config.
 *
 * Monitora: Write, Edit, MultiEdit em paths de prosa (*.md excluindo código
 * como SKILL.md, policies/, hooks/, schemas/).
 *
 * Output: additionalContext com os padrões detectados e sugestão de /humanize.
 * NÃO bloqueia (exit 0 sempre).
 *
 * Padrões verificados (subset de alto recall dos 29 em policies/anti-ai-writing.md):
 * - Vocabulário AI de alta frequência (delve, pivotal, tapestry, underscore, vibrant...)
 * - Copula avoidance (serves as, stands as, boasts)
 * - Signposting (let's dive in, here's what you need to know)
 * - Conclusões genéricas (future looks bright, exciting times)
 * - Frases de enchimento (in order to, it is important to note)
 * - Sycofância (great question, I hope this helps)
 */

import { readHookConfig, isHookDisabled } from "./utils.mjs";

// Each pattern includes a rewrite_hint that the model can apply directly.
// Follows policies/self-correcting-sensors.md: tell the model HOW to fix, not just WHAT is wrong.
const AI_PATTERNS = [
  {
    pattern: /\b(delve|pivotal|tapestry|underscore|vibrant|intricate|foster|garner|embark|testament|indelible|showcasing|elevating)\b/gi,
    category: "AI vocabulary",
    rewrite_hint: "Replace with plain English: delve→explore, pivotal→key, tapestry→mix, underscore→show, vibrant→active, intricate→complex, foster→build, garner→get, embark→start, testament→proof, indelible→lasting, showcasing→showing, elevating→raising.",
  },
  {
    pattern: /\b(serves as|stands as|boasts a|functions as|acts as)\b/gi,
    category: "copula avoidance",
    rewrite_hint: "Use plain 'is' or 'has': 'X serves as a Y' → 'X is a Y'; 'boasts a 30% improvement' → 'has 30% improvement' or 'improves 30%'.",
  },
  {
    pattern: /\b(let'?s dive (in|into)|here'?s what you need to know|without further ado|let'?s explore|let'?s break (this|it) down)\b/gi,
    category: "signposting",
    rewrite_hint: "Delete the signpost — start with the actual content. 'Let's dive into auth' → '## Auth'.",
  },
  {
    pattern: /\b(the future looks bright|exciting times (lie )?ahead|journey toward excellence|step in the right direction)\b/gi,
    category: "generic conclusion",
    rewrite_hint: "Either delete the closer entirely OR replace with a concrete next step / metric. 'The future looks bright' → '' or 'Next: ship v2 in Q3'.",
  },
  {
    pattern: /\b(in order to|it is important to note( that)?|at this point in time|due to the fact that|in the event that)\b/gi,
    category: "filler phrases",
    rewrite_hint: "Cut filler: 'in order to' → 'to'; 'it is important to note that' → '' (delete); 'at this point in time' → 'now'; 'due to the fact that' → 'because'; 'in the event that' → 'if'.",
  },
  {
    pattern: /\b(great question|I hope this helps|let me know if you'?d? like|certainly!|of course!)\b/gi,
    category: "chatbot artifact",
    rewrite_hint: "Delete entirely. These add zero information — they only soften tone. Answer directly.",
  },
  {
    pattern: /\b(pivotal moment|evolving landscape|underscores (its|the) (vital|crucial|important)|reflects broader|setting the stage for)\b/gi,
    category: "significance inflation",
    rewrite_hint: "Cut the inflation. If the thing matters, the reader sees it; if it doesn't, no adjective will save it. 'a pivotal moment in auth' → 'auth change'.",
  },
];

// Paths que NÃO são prosa de usuário — ignorar
const SKIP_PATTERNS = [
  /\/skills\//,
  /\/policies\//,
  /\/hooks\//,
  /\/schemas\//,
  /\/scripts\//,
  /\/evals\//,
  /\/programs\//,
  /\/templates\//,
  /SKILL\.md$/,
  /GLOBAL\.md$/,
  /AGENTS\.md$/,
  /CONTRIBUTING\.md$/,
];

// Paths que SÃO prosa de usuário — monitorar
const PROSE_PATTERNS = [
  /docs\/specs\//,
  /docs\/prd\//,
  /docs\/analysis\//,
  /\.taskmaster\/docs\//,
  /README.*\.md$/i,
  /CHANGELOG\.md$/,
  /docs\/.*\.md$/,
];

function main() {
  if (isHookDisabled("ai-writing-detector")) {
    process.exit(0);
  }

  const cfg = readHookConfig("ai_writing_detector", { enabled: false });
  if (!cfg.enabled) {
    process.exit(0);
  }

  let raw = "";
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", () => {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      process.exit(0);
    }
    handle(payload);
  });
}

function handle(payload) {
  const toolName = payload?.tool_name || "";
  if (!["Write", "Edit", "MultiEdit"].includes(toolName)) process.exit(0);

  const filePath = payload?.tool_input?.file_path || payload?.tool_input?.path || "";
  if (!filePath.endsWith(".md")) process.exit(0);

  // Skip non-prose paths
  if (SKIP_PATTERNS.some((p) => p.test(filePath))) process.exit(0);

  // Only act on prose paths (if none match, be permissive and exit)
  const isProse = PROSE_PATTERNS.some((p) => p.test(filePath));
  if (!isProse) process.exit(0);

  // Get content from tool input or new_string
  const content =
    payload?.tool_input?.content ||
    payload?.tool_input?.new_string ||
    "";

  if (!content || content.length < 100) process.exit(0);

  const findings = [];
  for (const { pattern, category, rewrite_hint } of AI_PATTERNS) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      const unique = [...new Set(matches.map((m) => m.toLowerCase()))];
      findings.push({ category, unique, rewrite_hint });
    }
  }

  if (findings.length === 0) process.exit(0);

  const fileName = filePath.split(/[\\/]/).pop();
  const advice = [
    `[ai-writing-detector] ⚠ found ${findings.length} AI writing pattern(s) in ${fileName}`,
    ``,
    `Where: ${fileName} (recent Write/Edit)`,
    ``,
    `Why this matters: prose that reads as AI-generated reduces trust and signals lack of editorial care. See policies/anti-ai-writing.md (29 patterns catalogued).`,
    ``,
    `Findings + Fix:`,
    ``,
    ...findings.flatMap((f) => [
      `• ${f.category}: ${f.unique.join(", ")}`,
      `  Fix: ${f.rewrite_hint}`,
      ``,
    ]),
    `Quick action: edit ${fileName} now applying the fixes above.`,
    `Bulk action: run \`/humanize ${fileName}\` to apply all 29 patterns from policies/anti-ai-writing.md.`,
    ``,
    `References: policies/anti-ai-writing.md, policies/self-correcting-sensors.md`,
  ].join("\n");

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: advice,
      },
    }),
  );
  process.exit(0);
}

main();
