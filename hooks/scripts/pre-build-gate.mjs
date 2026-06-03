#!/usr/bin/env node
/**
 * pre-build-gate.mjs — UserPromptSubmit hook
 *
 * Leva o "pare e decida antes de codar" de cada disciplina (que o /auto tem
 * nas suas fases) para o MODO PASSIVO. Detecta a intenção de CRIAÇÃO no prompt
 * e injeta o checklist de decisão da disciplina certa — apontando para a rule
 * profunda em vez de duplicar conteúdo.
 *
 * Dispara uma vez por disciplina por sessão (não repete o mesmo checklist).
 * Ignora prompts informacionais ("o que é", "como funciona", "explica").
 *
 * Output: { continue: true, hookSpecificOutput: { additionalContext } }
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { readHookConfig, isHookDisabled, resolveBotPath } from "./utils.mjs";

function getSessionState() {
  try {
    return JSON.parse(readFileSync(resolveBotPath(".hook-session.json"), "utf-8"));
  } catch {
    return {};
  }
}

function saveSessionState(state) {
  try {
    mkdirSync(resolveBotPath(), { recursive: true });
    writeFileSync(resolveBotPath(".hook-session.json"), JSON.stringify(state));
  } catch {}
}

const INFORMATIONAL = [
  /\bo que [eé]\b/i, /\bcomo funciona\b/i, /\bexplica\b/i, /\bexplain\b/i,
  /\bwhat is\b/i, /\bhow does\b/i, /\btell me about\b/i, /\bpara que serve\b/i,
];

function isInformational(text) {
  return INFORMATIONAL.some((p) => p.test(text));
}

// Cada disciplina: gatilhos (regex) + checklist injetado + rule de referência.
// A ordem importa: a primeira que casar "ganha" o slot de fullstack/app.
const DISCIPLINES = [
  {
    id: "acceptance",
    label: "📋 Critérios de aceite",
    triggers: [/\b(feature|funcionalidade|app|aplica\w*|sistema|projeto|plataforma|ferramenta|crud|tela|m[óo]dulo)\b/i],
    checklist: [
      "Antes de implementar, defina os critérios de aceite (observáveis, testáveis) — o que precisa ser verdade para estar 'done'.",
      "Cubra os 4 caminhos: happy, error, edge, regression. Não só o happy.",
      "NÃO invente escopo: implemente o que foi pedido, não campos/features extras que ninguém pediu.",
      "'App completo' implica: roda, persiste, trata erro, um humano usa. Protótipo happy-path-only não é 'completo'.",
    ],
    rule: "rules/common/acceptance-criteria.md",
    skill: "01-po-feature-spec",
  },
  {
    id: "ui-design",
    label: "🎨 Direção de design",
    triggers: [/\b(app|site|interface|tela|dashboard|frontend|front-end|ui|p[aá]gina|landing|portal|visual|design|layout)\b/i],
    checklist: [
      "Antes de estilizar, escolha UMA âncora estética (Brutally minimal / Editorial / Warm-organic / Technical / Playful / Refined dark) e comprometa-se.",
      "PROIBIDO o default genérico: indigo #4f46e5/#6366f1 + system-ui sozinho = ausência de decisão.",
      "Derive tokens reais (paleta + tipografia escolhida) da âncora. Trate empty/loading/error states como parte do design.",
      "UI no idioma do usuário (prompt em PT → UI em PT).",
    ],
    rule: "rules/frontend/ui-design.md",
    skill: "02-ui-ux-design",
  },
  {
    id: "api-contract",
    label: "⚙️ Contrato de API",
    triggers: [/\b(api|endpoint|rest|graphql|backend|back-end|servi[çc]o|microservi\w*|rota|route|controller)\b/i],
    checklist: [
      "Antes do primeiro endpoint, decida o formato de erro padrão (uma forma só) e o mapa de status codes (400/401/403/404/409/429/500).",
      "Um serializer por recurso — booleans são boolean (não 0/1 do SQLite), datas ISO, ids estáveis.",
      "Valide na fronteira, uma vez. JSON malformado → 400, nunca 500.",
      "Nomeie up-front: paginação (offset/cursor), versionamento (/v1/ vs header), idempotência para verbos retryáveis.",
    ],
    rule: "rules/backend/api-contract.md",
    skill: "03-backend-api",
  },
  {
    id: "schema",
    label: "🗄️ Integridade de schema",
    triggers: [/\b(tabela|table|schema|modelo|model|migration|migra[çc]|banco de dados|database|db|sqlite|postgres|mysql|prisma|drizzle)\b/i],
    checklist: [
      "Constraints no SCHEMA, não só no app: NOT NULL, CHECK (domínio), FOREIGN KEY (com ON DELETE), UNIQUE.",
      "Habilite enforcement de FK quando o engine precisa (SQLite: PRAGMA foreign_keys = ON — off por padrão!).",
      "Índices nas colunas de WHERE/JOIN/ORDER BY frequentes. ORDER BY com tiebreaker estável.",
      "Migrations versionadas e forward-only. Timestamps que o servidor controla, nunca do cliente.",
    ],
    rule: "rules/database/schema-integrity.md",
    skill: "03-backend-api",
  },
  {
    id: "deploy",
    label: "🚀 Prontidão de deploy",
    triggers: [/\b(servidor|server|deploy|produ[çc][aã]o|production|docker|container|service|microservi\w*|app|api|servi[çc]o)\b/i],
    checklist: [
      "Healthcheck (GET /health) que retorna 200 quando pode servir tráfego — com ping de dependência quando barato.",
      "Config do ambiente: PORT, DB, secrets via env (nunca hardcoded). Liste env vars no README, fail-fast no boot se faltar.",
      "Graceful shutdown (SIGTERM): para de aceitar conexões, finaliza in-flight, fecha DB, sai.",
      "Logs estruturados em stdout, sem secrets/PII. Porta configurável (PORT ?? 3000), nunca literal fixo.",
    ],
    rule: "rules/backend/deploy-readiness.md",
    skill: "07-deploy-docker",
  },
];

// "criar" precisa estar presente para os gates de criação dispararem (evita
// disparar em "rode a API", "abra o app"). Exceção: schema/db sempre relevante.
// radicais que cobrem conjugações: cri(ar/e/ou/ando), implement, constru, desenvolv, ger(ar/e), mont(ar/e)
const CREATE_VERBS = /\b(cri[aeo]\w*|implement\w*|constr[uó]\w*|desenvolv\w*|fa[çz]\w*|fazer|build\w*|ger[ae]\w*|mont[ae]\w*|setup|nov[oa]s?|new|create\w*)\b/i;

function matchesDiscipline(d, text) {
  const hasTrigger = d.triggers.some((t) => t.test(text));
  if (!hasTrigger) return false;
  // disciplinas de criação exigem verbo de criação no prompt
  if (d.id !== "schema") {
    if (!CREATE_VERBS.test(text)) return false;
  }
  return true;
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { inputBuffer += chunk; });

process.stdin.on("end", () => {
  if (isHookDisabled("pre-build-gate")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let input = {};
  try { input = JSON.parse(inputBuffer); } catch {}

  const cfg = readHookConfig("pre_build_gate", {
    max_disciplines_per_prompt: 3,
  });

  const prompt = input.prompt || "";
  if (!prompt || isInformational(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const session = getSessionState();
  const gated = session.preBuildGated || []; // disciplinas já injetadas nesta sessão

  const parts = [];
  let injectedNow = 0;
  const maxPerPrompt = cfg.max_disciplines_per_prompt || 3;

  for (const d of DISCIPLINES) {
    if (injectedNow >= maxPerPrompt) break;
    if (gated.includes(d.id)) continue;
    if (!matchesDiscipline(d, prompt)) continue;

    parts.push(
      [
        `[pre-build-gate] ${d.label} — decida ANTES de codar`,
        ``,
        `Detectei intenção de criação que toca esta disciplina. No /auto isto seria uma fase com gate. No modo passivo, é esta injeção: pare e decida antes de escrever código.`,
        ``,
        ...d.checklist.map((c) => `  • ${c}`),
        ``,
        `Playbook profundo: skill ${d.skill}. Standard always-on: ${d.rule}.`,
        `Pular se: o prompt é informacional, ou a decisão já foi tomada explicitamente nesta conversa.`,
      ].join("\n")
    );
    gated.push(d.id);
    injectedNow++;
  }

  session.preBuildGated = gated;
  saveSessionState(session);

  if (parts.length > 0) {
    process.stdout.write(
      JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: parts.join("\n\n---\n\n"),
        },
      })
    );
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
