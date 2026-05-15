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

const AI_PATTERNS = [
  // Vocabulário de alta frequência
  { pattern: /\b(delve|pivotal|tapestry|underscore|vibrant|intricate|foster|garner|embark|testament|indelible|showcasing|elevating)\b/gi, category: "AI vocabulary" },
  // Copula avoidance
  { pattern: /\b(serves as|stands as|boasts a|functions as|acts as)\b/gi, category: "copula avoidance" },
  // Signposting
  { pattern: /\b(let'?s dive (in|into)|here'?s what you need to know|without further ado|let'?s explore|let'?s break (this|it) down)\b/gi, category: "signposting" },
  // Conclusões genéricas
  { pattern: /\b(the future looks bright|exciting times (lie )?ahead|journey toward excellence|step in the right direction)\b/gi, category: "generic conclusion" },
  // Frases de enchimento
  { pattern: /\b(in order to|it is important to note( that)?|at this point in time|due to the fact that|in the event that)\b/gi, category: "filler phrases" },
  // Sycofância / chatbot artifacts
  { pattern: /\b(great question|I hope this helps|let me know if you'?d? like|certainly!|of course!)\b/gi, category: "chatbot artifact" },
  // Inflação de significado
  { pattern: /\b(pivotal moment|evolving landscape|underscores (its|the) (vital|crucial|important)|reflects broader|setting the stage for)\b/gi, category: "significance inflation" },
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
  for (const { pattern, category } of AI_PATTERNS) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      const unique = [...new Set(matches.map((m) => m.toLowerCase()))];
      findings.push(`${category}: ${unique.join(", ")}`);
    }
  }

  if (findings.length === 0) process.exit(0);

  const advice = [
    `⚠️ ai-writing-detector: found ${findings.length} AI writing pattern(s) in ${filePath.split(/[\\/]/).pop()}`,
    "",
    ...findings.map((f) => `  • ${f}`),
    "",
    "Run `/humanize` to clean up, or check `policies/anti-ai-writing.md` for all 29 patterns.",
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
