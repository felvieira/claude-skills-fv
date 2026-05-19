#!/usr/bin/env node
/**
 * UserPromptSubmit hook (v1.8.0): classifica intent do prompt e sugere program
 * apropriado de `programs/*.yml` antes do agente começar.
 *
 * NÃO bloqueia execução. Apenas emite `additionalContext` com sugestão.
 * Agente decide se segue a sugestão ou ignora.
 *
 * Padrões detectados:
 * - "nova feature / criar feature / build feature"          → spec-driven-development
 * - "discovery / interrogar / vaga ideia"                   → pipeline-discovery
 * - "review do PR / comprehensive review / 5 agents"        → comprehensive-review
 * - "build app from scratch / greenfield / from zero"       → adversarial-dev
 * - "reverse engineering / legado / sem docs"               → detective-spec
 * - "loop autônomo / auto / polish"                         → loop-polishing
 * - "bug fix simples / trivial / typo"                      → SEM program (skip)
 * - "pergunta informacional / explica / o que é"           → SEM program (skip)
 *
 * Ativação:
 *   - default: enabled
 *   - desabilitar: hook config `intent_classifier.enabled: false`
 *   - silenciar sugestões para keywords específicas: `intent_classifier.suppress: [keyword]`
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readHookConfig, isHookDisabled } from "./utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Padrões de prompts informacionais — não sugerir nada
const INFORMATIONAL = [
  /\b(o que (e|é) (um|uma|o|a)?\s)/i,
  /\b(como funciona|explica|explain|what is|how does|tell me about|para que serve)\b/i,
  /^(quem|qual|quando|onde|por que|porque|why|when|where|which|who)\b/i,
  /\?\s*$/,   // termina com ? = provavelmente pergunta
];

// Padrões de prompts triviais — não sugerir program (overhead)
const TRIVIAL = [
  /\b(typo|format|rename|prettier|eslint|lint fix)\b/i,
  /\bjust (a|one) (small|quick|simple|trivial)/i,
];

// Mapeamento intent → program recomendado
const INTENT_PATTERNS = [
  {
    program: "spec-driven-development",
    patterns: [
      /\b(nova feature|criar feature|build feature|implementar feature|adicionar feature)\b/i,
      /\b(spec.driven|constitution|memory\/constitution)\b/i,
      /\bfeature .* com (analise|gate|review)/i,
    ],
    confidence: "high",
    why: "Feature nova merece pipeline com constitution + checklist + analyze gates",
  },
  {
    program: "pipeline-discovery",
    patterns: [
      /\b(ideia vaga|vague idea|discovery|interrogar|grill[- ]?me)\b/i,
      /\b(precisa de PRD|formal spec|N issues)\b/i,
      /\bnao sei (exatamente|direito) o que quero/i,
    ],
    confidence: "medium",
    why: "Ideia ainda em formação merece grill-me + PRD + slicing",
  },
  {
    program: "comprehensive-review",
    patterns: [
      /\b(comprehensive review|5[- ]agent|review profundo|review completo)\b/i,
      /\breview .* PR (#?\d+|crítico|critical)/i,
      /\b(auto[- ]?fix|review .* synthesize)\b/i,
    ],
    confidence: "high",
    why: "PR crítico merece 5 agents paralelos + security + auto-fix",
  },
  {
    program: "adversarial-dev",
    patterns: [
      /\b(from scratch|do zero|greenfield|build app|construir app)\b/i,
      /\b(adversari[ao]l|GAN|generator.*evaluator)\b/i,
      /\bvaga? ideia .* (app|product)/i,
    ],
    confidence: "medium",
    why: "App from-scratch merece planner + adversarial scoring por sprint",
  },
  {
    program: "detective-spec",
    patterns: [
      /\b(legacy|legado|reverse[- ]?engineer|engenharia reversa|sem docs|undocumented)\b/i,
      /\b(detective|extrair specs|reconstruir contratos)\b/i,
    ],
    confidence: "high",
    why: "Codebase legado merece detective-spec read-only para extrair contratos",
  },
  {
    program: "loop-polishing",
    patterns: [
      /\b(auto[- ]?loop|autonom[oa]|fire[- ]and[- ]forget|polish .* commit)\b/i,
      /\bdeix(a|e) (ele|o agente) trabalh/i,
      /\bcomeca .* e (so para|para .* quando) (funcion|pass)/i,
    ],
    confidence: "medium",
    why: "Task autônoma com quality polishing pre-commit",
  },
];

function isInformational(text) {
  return INFORMATIONAL.some((p) => p.test(text));
}
function isTrivial(text) {
  return TRIVIAL.some((p) => p.test(text));
}

function classify(text) {
  // Sem sugestão para informacional/trivial
  if (isInformational(text) || isTrivial(text)) return null;

  const matches = [];
  for (const intent of INTENT_PATTERNS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(text)) {
        matches.push(intent);
        break;
      }
    }
  }
  // Devolve o de maior confidence (high > medium)
  if (matches.length === 0) return null;
  matches.sort((a, b) => (b.confidence === "high" ? 1 : 0) - (a.confidence === "high" ? 1 : 0));
  return matches[0];
}

async function main() {
  if (isHookDisabled("intent-classifier")) {
    process.exit(0);
  }
  // Defaults: Active mode (Nível 2) since v1.9.0
  //   - enabled: true (sempre sugere)
  //   - auto_dry_run: true (Claude auto-roda --dry-run pra mostrar plano)
  //   - autonomous: false (gates humanos no program ainda pausam — não pula confirmações)
  // Para mudar:
  //   - Manual:     enabled: false
  //   - Passive:    enabled: true, auto_dry_run: false
  //   - Autonomous: enabled: true, autonomous: true   ⚠ CI only
  const cfg = readHookConfig("intent_classifier", {
    enabled: true,
    auto_dry_run: true,
    autonomous: false,
    suppress: [],
  });
  if (!cfg.enabled) process.exit(0);

  let raw = "";
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", () => {
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      process.exit(0);
    }

    const userPrompt = payload?.prompt || payload?.user_message || "";
    if (!userPrompt || typeof userPrompt !== "string" || userPrompt.length < 15) {
      process.exit(0);
    }

    // Skip se usuário já invocou slash command explícito
    if (userPrompt.trim().startsWith("/")) process.exit(0);

    const intent = classify(userPrompt);
    if (!intent) process.exit(0);

    // Skip se program está em suppress list
    if (cfg.suppress && cfg.suppress.includes(intent.program)) process.exit(0);

    // Em modo Autonomous, intents de feature/issue/refactor roteiam pra /swarm (autonomia total)
    // Em modos Active/Passive, mantém o program específico
    const SWARM_ELIGIBLE = ["spec-driven-development", "pipeline-discovery"];
    const routeToSwarm = cfg.autonomous && SWARM_ELIGIBLE.includes(intent.program);

    // Determinar level efetivo
    let level, levelLabel, action;
    if (cfg.autonomous) {
      level = 3;
      levelLabel = "Autonomous";
      if (routeToSwarm) {
        action = `**EXECUTE AGORA via /swarm** (modo autônomo total): \`/swarm "${userPrompt.replace(/"/g, '\\"').slice(0, 200)}"\` — cria worktree isolado, Ralph loop por story (fresh context), 4-agent paralelo review, self-fix CRITICAL/HIGH, auto PR. Zero gates humanos. ⚠ Termina em PR aberto pra você revisar.`;
      } else {
        action = `**EXECUTE AGORA** (modo autônomo): \`/run-program ${intent.program} --auto-yes\` — gates pulam automaticamente. ⚠ Pause se program tem bash destrutivo.`;
      }
    } else if (cfg.auto_dry_run) {
      level = 2;
      levelLabel = "Active";
      action = `**EXECUTE AUTOMATICAMENTE DRY-RUN** (modo active): \`/run-program ${intent.program} --dry-run\` — mostra o plano resolvido. Depois pergunte ao usuário se aprova rodar de verdade. Gates humanos durante execução ainda pausam.`;
    } else {
      level = 1;
      levelLabel = "Passive";
      action = `**SUGIRA AO USUÁRIO** (modo passive): apresente \`/run-program ${intent.program}\` como recomendação. Espere usuário confirmar antes de executar.`;
    }

    const suggestion = [
      `💡 **Auto-orchestration suggestion** (intent-classifier hook — Level ${level} ${levelLabel}):`,
      ``,
      `Este prompt parece pedir um workflow estruturado. Sugestão de program:`,
      ``,
      `\`/run-program ${intent.program}\``,
      ``,
      `**Por quê:** ${intent.why}`,
      `**Confidence:** ${intent.confidence}`,
      ``,
      `**Ação esperada (nível ${level} = ${levelLabel}):**`,
      action,
      ``,
      `Suprimir sugestão pra esta keyword: \`intent_classifier.suppress: ["${intent.program}"]\` no hook config.`,
      `Mudar nível: ver \`policies/auto-orchestration.md\`.`,
    ].join("\n");

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: suggestion,
      },
    }));
    process.exit(0);
  });
}

main();
