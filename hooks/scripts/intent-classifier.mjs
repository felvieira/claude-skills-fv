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

import { readFileSync, existsSync, appendFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readHookConfig, isHookDisabled } from "./utils.mjs";
import { classifyWithLLM, getTelemetryPath } from "./llm-classifier.mjs";
import { routeTask } from "../../scripts/lib/plugin-catalog.mjs";

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

// Mapeamento intent → program/command recomendado (v2.1.0 expanded)
const INTENT_PATTERNS = [
  // Bug fix → /auto (C — leve)
  {
    program: null,
    command: "/auto",
    category: "C",
    patterns: [
      /\b(bug|crash|crasha|crashou|erro|broken|quebrou|nao funciona|não funciona|stopped working)\b/i,
      /\bfix .* (bug|issue|problema)\b/i,
    ],
    confidence: "high",
    why: "Bug fix isolado merece /auto (não swarm) — sem overhead de worktree+review pra task pequena",
  },
  // Issue do GitHub → /swarm fix #N (extrai número)
  {
    program: null,
    command: "/swarm fix",  // será expandido com #N pelo extractor
    category: "A",
    extractIssueNumber: true,
    patterns: [
      /\b(fix|resolve|implementa|implement) #\d+/i,
      /\bissue #?\d+/i,
      /\b#\d+\b/,
    ],
    confidence: "high",
    why: "Issue GitHub → swarm pega via gh issue view, implementa, abre PR linkado",
  },
  // Refactor seguro → refactor-safely (B)
  {
    program: "refactor-safely",
    category: "B",
    patterns: [
      /\b(refator|refactor|extrair|extract|decompor|decompose|split|break up)\b/i,
      /\b(modulariz|extract module|módulos? menores)\b/i,
    ],
    confidence: "high",
    why: "Refactor merece pipeline com baseline tests + behavior verification",
  },
  // Criar testes → /test (C)
  {
    program: null,
    command: "/test",
    category: "C",
    patterns: [
      /\b(criar tests?|add tests?|adicionar tests?|cobertura|coverage|testar X|escrever tests?)\b/i,
      /\b(unit tests?|integration tests?|e2e tests?) (pra|para|for)\b/i,
    ],
    confidence: "high",
    why: "Skill 05 (qa-testing) cobre — sem overhead de program",
  },
  // Investigar/debug → /auto + debugger
  {
    program: null,
    command: "/auto",
    category: "C",
    patterns: [
      /\b(investigar|investigate|por que .* lento|por que .* travando|debug|diagnost)\b/i,
      /\b(performance|profil|slow|lento|trav)\b.*\b(endpoint|api|módulo)\b/i,
    ],
    confidence: "medium",
    why: "Investigação merece debugger subagent + /auto — não pipeline formal",
  },
  // Spike / PoC → /auto --no-tdd
  {
    program: null,
    command: "/auto --no-tdd",
    category: "C",
    patterns: [
      /\b(spike|poc|prova de conceito|proof of concept|ver se da|ver se dá|testar se|experimentar)\b/i,
    ],
    confidence: "medium",
    why: "Spike é descartável — sem TDD, sem PR ceremony",
  },
  // Assets visuais → /web-assets
  {
    program: null,
    command: "/web-assets",
    category: "C",
    patterns: [
      /\b(hero image|favicon|og card|open graph|social card|asset visual|imagem .* landing)\b/i,
    ],
    confidence: "high",
    why: "Skill 36 (web-asset-generator) gera direto",
  },
  // Agendado → /schedule
  {
    program: null,
    command: "/schedule",
    category: "E",
    patterns: [
      /\b(agendar|schedule|toda quarta|todo dia|semanal|mensal|cron|recurring)\b/i,
      /\brodar .* (todo|toda|a cada)\b/i,
    ],
    confidence: "high",
    why: "Tarefa recorrente — skill /schedule",
  },
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

function logTelemetry(record) {
  try {
    const path = getTelemetryPath();
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, JSON.stringify(record) + "\n");
  } catch {
    // telemetry opcional, nunca quebra hook
  }
}

async function main() {
  if (isHookDisabled("intent-classifier")) {
    process.exit(0);
  }
  // Defaults v2.1.0:
  //   - enabled: true
  //   - auto_dry_run: true (Level 2 Active default)
  //   - autonomous: false (Level 3 user-wide opcional)
  //   - use_llm: false (regex é rápido 0ms, LLM adiciona ~10s latência por prompt)
  //   - llm_timeout_ms: 15000 (timeout do Claude CLI quando habilitado)
  //   - llm_confidence_threshold: 0.7 (abaixo cai pro fallback)
  // Para ativar LLM classifier (custo: ~$0.0001 + ~10s por prompt):
  //   intent_classifier.use_llm = true
  const cfg = readHookConfig("intent_classifier", {
    enabled: true,
    auto_dry_run: true,
    autonomous: false,
    use_llm: false,
    llm_timeout_ms: 15000,
    llm_confidence_threshold: 0.7,
    suppress: [],
  });
  const pluginRoutingCfg = readHookConfig("plugin_routing", {
    enabled: true,
    max_plugins: 3,
    max_skills: 6,
  });
  if (!cfg.enabled) process.exit(0);

  let raw = "";
  process.stdin.on("data", (chunk) => (raw += chunk));
  process.stdin.on("end", async () => {
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

    if (userPrompt.trim().startsWith("/")) process.exit(0);

    // Keep routing cheap and non-blocking: the catalog only references bundled
    // skills and a failure here must never stop the intent classifier.
    let pluginRoute = null;
    if (pluginRoutingCfg.enabled && !isInformational(userPrompt) && !isTrivial(userPrompt)) {
      try {
        const candidate = await routeTask(userPrompt, {
          maxPlugins: pluginRoutingCfg.max_plugins,
          maxSkills: pluginRoutingCfg.max_skills,
        });
        if (candidate.plugins.length > 0 || candidate.external_plugins.length > 0) pluginRoute = candidate;
      } catch (error) {
        logTelemetry({
          ts: new Date().toISOString(),
          prompt: userPrompt.slice(0, 200),
          plugin_routing_error: error.message,
        });
      }
    }

    // ===== Phase 1: try LLM classifier first =====
    let llmResult = null;
    let usedLLM = false;
    if (cfg.use_llm) {
      llmResult = classifyWithLLM(userPrompt, { timeoutMs: cfg.llm_timeout_ms || 15000 });
      if (llmResult && !llmResult.error && llmResult.confidence >= cfg.llm_confidence_threshold) {
        usedLLM = true;
      } else if (llmResult && llmResult.error) {
        // log fallback reason (non-blocking)
        logTelemetry({
          ts: new Date().toISOString(),
          prompt: userPrompt.slice(0, 200),
          llm_error: llmResult.error,
          fallback: "regex",
        });
      }
    }

    // ===== Phase 2: fallback regex if LLM unavailable/low confidence =====
    let category, command, args, confidence, reasoning, programName;

    if (usedLLM) {
      category = llmResult.category;
      command = llmResult.command;
      args = llmResult.args;
      confidence = llmResult.confidence;
      reasoning = llmResult.reasoning;
      programName = command && command.startsWith("/run-program ") ? command.split(" ")[1] : null;
    } else {
      // Fallback: regex-based classification (v1.x behavior expanded)
      const intent = classify(userPrompt);
      if (!intent && !pluginRoute) {
        logTelemetry({
          ts: new Date().toISOString(),
          prompt: userPrompt.slice(0, 200),
          result: "skip",
          reason: "no-match",
        });
        process.exit(0);
      }
      if (!intent) {
        programName = "plugin_routing";
        command = null;
        confidence = 0.7;
        category = "C";
        reasoning = "Task matches a bundled plugin composition, but not a full declarative program.";
      } else {
        programName = intent.program;
      // intent pode ter command direto (ex: /auto) ou program (cai em /run-program X)
      if (intent.command) {
        command = intent.command;
        // Extrai número de issue se aplicável
        if (intent.extractIssueNumber) {
          const m = userPrompt.match(/#?(\d+)/);
          if (m) command = `${command} #${m[1]}`;
        }
      } else {
        command = `/run-program ${intent.program}`;
      }
      confidence = intent.confidence === "high" ? 0.85 : 0.6;
      reasoning = intent.why;
      // Category vem do pattern, ou inferida do program
      if (intent.category) {
        category = intent.category;
      } else if (["spec-driven-development", "pipeline-discovery"].includes(intent.program)) {
        category = "A";
        } else {
          category = "B";
        }
      }
    }

    // Skip se program/command está em suppress list
    if (cfg.suppress && (cfg.suppress.includes(programName) || (command && cfg.suppress.includes(command)))) {
      logTelemetry({
        ts: new Date().toISOString(),
        prompt: userPrompt.slice(0, 200),
        result: "suppressed",
        suppressed: programName || command,
        used_llm: usedLLM,
      });
      process.exit(0);
    }

    // Category D = conversa, sem sugestão
    if (category === "D" && !pluginRoute) {
      logTelemetry({
        ts: new Date().toISOString(),
        prompt: userPrompt.slice(0, 200),
        result: "skip",
        reason: "conversational",
        used_llm: usedLLM,
      });
      process.exit(0);
    }

    // ===== Phase 3: route based on category + autonomy level =====
    const SWARM_ELIGIBLE = ["spec-driven-development", "pipeline-discovery"];
    const routeToSwarm = cfg.autonomous && (
      category === "A" ||
      (category === "B" && programName && SWARM_ELIGIBLE.includes(programName))
    );

    let level, levelLabel, action, suggestedCmd;
    if (!command && pluginRoute) {
      level = cfg.autonomous ? 3 : cfg.auto_dry_run ? 2 : 1;
      levelLabel = cfg.autonomous ? "Autonomous" : cfg.auto_dry_run ? "Active" : "Passive";
      suggestedCmd = "composicao minima de skills";
      action = pluginRoute.requires_human_review
        ? "**PARE NO GATE HUMANO**: a composicao envolve risco alto. Planeje e apresente evidencias antes de qualquer acao externa."
        : "**APLIQUE A COMPOSICAO MINIMA**: carregue somente as skills recomendadas abaixo; nao rode um program inteiro.";
    } else if (cfg.autonomous) {
      level = 3;
      levelLabel = "Autonomous";
      if (routeToSwarm && category === "A") {
        suggestedCmd = command && command.startsWith("/swarm") ? command : `/swarm "${userPrompt.replace(/"/g, '\\"').slice(0, 200)}"`;
        action = `**EXECUTE AGORA via /swarm** (autônomo total): \`${suggestedCmd}\` — worktree, Ralph loop, 4-agent review, self-fix, auto PR. Zero gates humanos.`;
      } else if (routeToSwarm) {
        suggestedCmd = `/swarm "${userPrompt.replace(/"/g, '\\"').slice(0, 200)}"`;
        action = `**EXECUTE AGORA via /swarm** (autônomo total): \`${suggestedCmd}\``;
      } else if (category === "C") {
        suggestedCmd = command;
        action = `**EXECUTE AGORA** (autônomo): \`${suggestedCmd}\` — task leve, sem program overhead.`;
      } else if (category === "E") {
        suggestedCmd = command;
        action = `**EXECUTE** (autônomo): \`${suggestedCmd}\` — agendamento.`;
      } else {
        suggestedCmd = `${command} --auto-yes`;
        action = `**EXECUTE AGORA** (autônomo): \`${suggestedCmd}\` — gates pulam.`;
      }
    } else if (cfg.auto_dry_run) {
      level = 2;
      levelLabel = "Active";
      if (category === "C" || category === "E") {
        suggestedCmd = command;
        action = `**EXECUTE** (active): \`${suggestedCmd}\` — task leve, sem overhead de dry-run.`;
      } else if (command && command.startsWith("/run-program ")) {
        suggestedCmd = `${command} --dry-run`;
        action = `**EXECUTE AUTOMATICAMENTE DRY-RUN** (active): \`${suggestedCmd}\` — mostra plano. Depois pergunte se aprova rodar de verdade. Gates humanos durante execução ainda pausam.`;
      } else {
        suggestedCmd = command;
        action = `**EXECUTE** (active): \`${suggestedCmd}\``;
      }
    } else {
      level = 1;
      levelLabel = "Passive";
      suggestedCmd = command;
      action = `**SUGIRA AO USUÁRIO** (passive): apresente \`${suggestedCmd}\` como recomendação. Espere confirmar antes de executar.`;
    }

    // ===== Phase 4: emit + telemetry =====
    logTelemetry({
      ts: new Date().toISOString(),
      prompt: userPrompt.slice(0, 200),
      result: "suggested",
      used_llm: usedLLM,
      category,
      command: suggestedCmd,
      confidence,
      level,
      reasoning: reasoning?.slice(0, 200),
      plugins: [
        ...(pluginRoute?.plugins.map((plugin) => plugin.id) || []),
        ...(pluginRoute?.external_plugins.map((plugin) => plugin.id) || []),
      ],
    });

    const composition = pluginRoute ? [
      "",
      pluginRoute.plugins.length ? `**Plugin composition:** ${pluginRoute.plugins.map((plugin) => plugin.id).join(", ")}` : null,
      pluginRoute.external_plugins.length
        ? `**External plugins (not installed):** ${pluginRoute.external_plugins.map((plugin) => `${plugin.id} via ${plugin.install.provider}`).join(", ")}`
        : null,
      pluginRoute.skills.length ? `**Load only these skills:** ${pluginRoute.skills.join(", ")}` : null,
      pluginRoute.policies.length ? `**Policies:** ${pluginRoute.policies.join(", ")}` : null,
      pluginRoute.requires_human_review ? "**Risk gate:** high-risk route; require human review before external action." : null,
    ].filter(Boolean) : [];

    const suggestion = [
      `💡 **Smart routing** (intent-classifier v2 — Level ${level} ${levelLabel}, ${usedLLM ? "LLM" : "regex fallback"}):`,
      ``,
      `**Category ${category}** — ${suggestedCmd}`,
      ``,
      `**Reasoning:** ${reasoning || "(no reasoning provided)"}`,
      `**Confidence:** ${confidence.toFixed(2)}`,
      ...composition,
      ``,
      action,
      ``,
      `Mudar nível: ver \`policies/auto-orchestration.md\`. Suprimir sugestão: \`intent_classifier.suppress: ["${programName || command}"]\`. Telemetry: \`.swarm/classifier.jsonl\`.`,
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
