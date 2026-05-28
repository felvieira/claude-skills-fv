#!/usr/bin/env node
/**
 * UserPromptSubmit hook (v2.21.0): detecta MUDANCA DE ASSUNTO entre prompts
 * consecutivos e sugere /clear para evitar pagar pelo historico irrelevante.
 *
 * Inspirado na dica 1 de "Nunca mais fique sem creditos no Claude" (Deborah Folloni):
 * cada prompt carrega TODO o historico da sessao. Assunto novo na mesma sessao =
 * o historico do assunto antigo (ja irrelevante) vai junto em cada prompt novo,
 * inflando custo silenciosamente.
 *
 * FILOSOFIA: PRECISAO > COBERTURA. Falso positivo (sugerir /clear no meio de um
 * fluxo continuo) e mais caro que perder um aviso — treina o user a ignorar todos
 * os avisos. So dispara em mudanca de assunto OBVIA:
 *   - dominio tecnico claramente diferente do prompt anterior, E
 *   - prompt atual NAO referencia o trabalho anterior (sem "isso", "agora testa",
 *     "continua", pronomes de continuidade, paths/simbolos compartilhados), E
 *   - intervalo minimo entre avisos respeitado (nao spamar).
 *
 * NAO bloqueia. Apenas emite additionalContext nao-vinculante.
 *
 * Config (hooks/config.json -> topic_shift):
 *   enabled: true
 *   min_interval_ms: 300000  (5min — nao avisar duas vezes seguidas)
 *   require_domain_jump: true (so avisa se os dominios sao realmente distintos)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import { readHookConfig, isHookDisabled, resolveBotPath } from "./utils.mjs";

// Dominios tecnicos mutuamente distantes. Mudar de um pra outro = sinal forte de
// novo assunto. Dentro do mesmo dominio (ex: dois prompts sobre frontend) NAO conta.
const DOMAINS = {
  frontend: /\b(component|css|tailwind|react|vue|svelte|ui|ux|button|layout|responsiv|jsx|tsx|styling|design system)\b/i,
  backend: /\b(api|endpoint|route|controller|service|repository|database|sql|query|migration|orm|prisma|drizzle|schema)\b/i,
  infra: /\b(docker|kubernetes|k8s|deploy|ci\/cd|pipeline|terraform|helm|nginx|infra|container|workflow yml)\b/i,
  testing: /\b(test|spec|jest|vitest|pytest|coverage|mock|fixture|e2e|tdd)\b/i,
  security: /\b(auth|jwt|oauth|vulnerab|xss|csrf|injection|secret|encrypt|security audit|owasp)\b/i,
  docs: /\b(readme|changelog|documentation|docs|wiki|markdown|tutorial|guide)\b/i,
  data: /\b(analytics|dashboard|metric|chart|report|etl|data pipeline|aggregation)\b/i,
  content: /\b(blog|post|copy|marketing|seo|newsletter|social|instagram|youtube)\b/i,
};

// Sinais de CONTINUIDADE — se o prompt atual tem qualquer um destes, e quase
// certo que e continuacao do assunto anterior, NAO mudanca. Suprime o aviso.
const CONTINUITY_SIGNALS = [
  /\b(isso|isto|esse|essa|este|esta|aquele|aquela|o mesmo|a mesma)\b/i,
  /\b(agora|depois|entao|tambem|tb|ainda|continua|continue|segue|prossegue)\b/i,
  /\b(testa|teste|valida|verifica|confirma|roda|comita|commit|push|pusha)\b/i,
  /\b(it|that|this|same|also|now|then|continue|keep|still|next)\b/i,
  /\b(arruma|conserta|ajusta|corrige|fix|melhora|refatora)\s+(isso|esse|o|a|essa)\b/i,
  /^(e |mas |ok |sim |nao |não |beleza|blz|certo|perfeito|otimo|ótimo)\b/i,
  // Referencia a arquivo/simbolo (path, extensao, camelCase) = provavel continuacao
  /(?:[A-Za-z]:)?(?:\/|\\)[\w./\\-]+\.\w+/,
  /\b\w+\.(ts|tsx|js|jsx|py|go|rs|md)\b/,
];

function detectDomains(text) {
  const found = new Set();
  for (const [name, re] of Object.entries(DOMAINS)) {
    if (re.test(text)) found.add(name);
  }
  return found;
}

function hasContinuitySignal(text) {
  return CONTINUITY_SIGNALS.some((p) => p.test(text));
}

function getSession() {
  try {
    return JSON.parse(readFileSync(resolveBotPath(".hook-session.json"), "utf-8"));
  } catch {
    return {};
  }
}

function saveSession(state) {
  try {
    const p = resolveBotPath(".hook-session.json");
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(state, null, 2));
  } catch {
    /* never block */
  }
}

let raw = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  if (isHookDisabled("topic-shift-detector")) {
    process.exit(0);
  }

  const cfg = readHookConfig("topic_shift", {
    enabled: true,
    min_interval_ms: 300000,
    require_domain_jump: true,
  });
  if (!cfg.enabled) process.exit(0);

  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const prompt = payload?.prompt || payload?.user_message || "";
  if (!prompt || typeof prompt !== "string" || prompt.length < 15) process.exit(0);

  // Slash commands sao acao explicita, nunca mudanca de assunto organica
  if (prompt.trim().startsWith("/")) process.exit(0);

  // Prefixo force:/! = intencao explicita, nao interromper com aviso
  if (/^\s*(force:|!)/i.test(prompt)) process.exit(0);

  const session = getSession();
  const prevDomainsArr = session.topic_domains || null;
  const prevPrompt = session.topic_last_prompt || "";

  const currDomains = detectDomains(prompt);

  // Sempre atualiza o estado pro proximo prompt (mesmo que nao avise agora)
  const newState = {
    ...session,
    topic_domains: [...currDomains],
    topic_last_prompt: prompt.slice(0, 300),
  };

  // Sem dominio detectavel no prompt atual → nao da pra julgar shift. So salva.
  if (currDomains.size === 0) {
    saveSession(newState);
    process.exit(0);
  }

  // Primeiro prompt da sessao com dominio → estabelece baseline, nao avisa.
  if (!prevDomainsArr || prevDomainsArr.length === 0) {
    saveSession(newState);
    process.exit(0);
  }

  const prevDomains = new Set(prevDomainsArr);

  // Continuidade explicita → suprime (ex: "agora testa isso")
  if (hasContinuitySignal(prompt)) {
    saveSession(newState);
    process.exit(0);
  }

  // Interseccao de dominios → mesmo territorio, nao e mudanca
  const overlap = [...currDomains].some((d) => prevDomains.has(d));
  if (overlap) {
    saveSession(newState);
    process.exit(0);
  }

  // require_domain_jump: so avisa se o dominio anterior tambem era nitido
  // (evita avisar quando o anterior era vago). Aqui ambos tem dominio E sao disjuntos.

  // Respeita intervalo minimo entre avisos
  const now = Date.now();
  const lastWarn = session.topic_shift_last_warn_ms || 0;
  if (now - lastWarn < cfg.min_interval_ms) {
    saveSession(newState);
    process.exit(0);
  }

  // ===== Mudanca de assunto OBVIA confirmada =====
  newState.topic_shift_last_warn_ms = now;
  saveSession(newState);

  const prevLabel = prevDomainsArr.join("/");
  const currLabel = [...currDomains].join("/");

  const msg = [
    `[topic-shift] 🔄 Mudanca de assunto detectada: ${prevLabel} → ${currLabel}`,
    ``,
    `Where: prompt anterior era sobre "${prevLabel}", o atual e sobre "${currLabel}" (dominios disjuntos, sem sinal de continuidade).`,
    ``,
    `Why this matters: cada prompt carrega TODO o historico da sessao. O contexto do assunto anterior (${prevLabel}) ja nao e relevante mas continua indo junto em cada prompt novo, inflando custo de tokens silenciosamente.`,
    ``,
    `Fix: se voce realmente trocou de tarefa, rode /clear para comecar uma sessao limpa. Se ainda e o mesmo trabalho, ignore este aviso.`,
    ``,
    `References: policies/token-efficiency.md (dica 1: assunto novo, sessao nova).`,
  ].join("\n");

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: msg,
      },
    })
  );
  process.exit(0);
});
