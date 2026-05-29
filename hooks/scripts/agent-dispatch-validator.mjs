#!/usr/bin/env node
/**
 * agent-dispatch-validator (v2.2.0+)
 *
 * PreToolUse hook que intercepta chamadas ao `Agent` tool.
 *
 * Bloqueia (com mensagem acionável) quando `subagent_type` começa com
 * "dev-team-kit-fv:" e o nome **não** corresponde a um subagent válido
 * em `agents/` — tipicamente porque é o nome de uma SKILL numerada.
 *
 * Telemetria: cada bloqueio é logado em `.bot/agent-dispatch-errors.jsonl`.
 *
 * Desativar (não recomendado):
 *   - env: DEVKIT_DISABLED_HOOKS=agent-dispatch-validator
 *   - profile: hook_profiles.profiles.<profile>.disabled inclui "agent-dispatch-validator"
 *
 * Referências:
 *   - policies/skills-vs-agents.md (policy canônica)
 *   - AGENTS.md seção "Subagents Despacháveis" (tabela de nomes válidos)
 */

import { existsSync, mkdirSync, appendFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { isHookDisabled, resolveBotPath } from "./utils.mjs";

const HOOK_ID = "agent-dispatch-validator";
const KIT_PREFIX = "dev-team-kit-fv:";

// Resolve agents/ e skills/ relativos ao plugin root (onde o kit está instalado)
// __dirname → hooks/scripts/, então subir 2 níveis → repo root.
const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || join(__dirname, "..", "..");

function listValidSubagents() {
  const agentsDir = join(PLUGIN_ROOT, "agents");
  if (!existsSync(agentsDir)) return new Set();
  try {
    return new Set(
      readdirSync(agentsDir)
        .filter((f) => f.endsWith(".md") && f !== "README.md")
        .map((f) => f.slice(0, -3)) // strip .md
    );
  } catch {
    return new Set();
  }
}

function listSkills() {
  const skillsDir = join(PLUGIN_ROOT, "skills");
  if (!existsSync(skillsDir)) return new Set();
  try {
    return new Set(
      readdirSync(skillsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && /^\d{2}-/.test(d.name))
        .map((d) => d.name)
    );
  } catch {
    return new Set();
  }
}

function looksLikeSkillName(name) {
  // Convenção: skills começam com 2 dígitos + "-"
  return /^\d{2}-/.test(name);
}

/**
 * Warning não-bloqueante: Agent() spawn sem `model:` explícito.
 * Loga em .bot/missing-model.jsonl pra telemetria. NÃO bloqueia o dispatch.
 *
 * Ver policies/model-routing-real.md — hook não pode forçar model, só sugerir.
 * Sem model:, o subagent herda o do parent. Em sessão Opus = 10x mais caro.
 */
function maybeWarnMissingModel(input, agentName) {
  if (isHookDisabled('agent-dispatch-validator.missing-model')) return;
  const model = input?.tool_input?.model;
  if (model && typeof model === "string" && model.length > 0) return;  // OK

  try {
    const botDir = resolveBotPath();
    mkdirSync(botDir, { recursive: true });
    appendFileSync(
      resolveBotPath("missing-model.jsonl"),
      JSON.stringify({
        ts: new Date().toISOString(),
        hook: HOOK_ID,
        warned: "missing-model",
        subagent_type: KIT_PREFIX + agentName,
        description: input?.tool_input?.description || null,
        hint: "passe model: 'haiku'|'sonnet'|'opus' para evitar herdar do parent (policies/model-routing-real.md)",
      }) + "\n",
      "utf-8",
    );
  } catch {
    // Silencioso — telemetria não bloqueia
  }
}

function logTelemetry(record) {
  try {
    const botDir = resolveBotPath();
    mkdirSync(botDir, { recursive: true });
    const path = resolveBotPath("agent-dispatch-errors.jsonl");
    appendFileSync(path, JSON.stringify(record) + "\n", "utf-8");
  } catch {
    // Silencioso — telemetria não bloqueia o hook
  }
}

function buildBlockMessage(name, isSkill, skillsList) {
  const lines = [];
  lines.push(`❌ "dev-team-kit-fv:${name}" não é um subagent_type válido.`);
  lines.push("");

  if (isSkill) {
    lines.push(`Detectado: este nome é uma SKILL (skills/${name}/), não um subagent.`);
    lines.push("");
    lines.push("Correções possíveis:");
    lines.push("");
    lines.push("  1. Carregar o playbook no contexto atual:");
    lines.push(`     Skill({ skill: "dev-team-kit-fv:${name}" })`);
    lines.push("");
    lines.push("  2. Paralelizar com worktree (cada subagent carrega a skill internamente):");
    lines.push(`     Agent({`);
    lines.push(`       subagent_type: "general-purpose",`);
    lines.push(`       isolation: "worktree",`);
    lines.push(`       description: "...",`);
    lines.push(`       prompt: "PASSO 1 OBRIGATÓRIO: invoque Skill({ skill: \\"dev-team-kit-fv:${name}\\" }).\\n\\nDepois implemente: ..."`);
    lines.push(`     })`);
    lines.push("");
    lines.push("Ver policies/skills-vs-agents.md (anti-padrão 1).");
  } else {
    lines.push(`Subagents válidos (${skillsList.size}):`);
    for (const s of [...skillsList].sort()) {
      lines.push(`  - dev-team-kit-fv:${s}`);
    }
    lines.push("");
    lines.push("Se queria carregar um playbook de skill, use Skill tool.");
    lines.push("Ver policies/skills-vs-agents.md.");
  }

  return lines.join("\n");
}

// === Main ===

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => {
  inputBuffer += chunk;
});

process.stdin.on("end", () => {
  // Fail-open por design: erro de parse, telemetria offline, etc → passa.
  // Só bloqueia caso claramente identificado.

  if (isHookDisabled(HOOK_ID)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let input = {};
  try {
    input = JSON.parse(inputBuffer);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const toolName = input.tool_name || "";
  // Aceita "Agent" (nome canônico) e variações futuras
  if (toolName !== "Agent" && toolName !== "Task") {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const subagentType = input?.tool_input?.subagent_type || "";
  if (!subagentType.startsWith(KIT_PREFIX)) {
    // Não é do nosso kit → não interfere
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const name = subagentType.slice(KIT_PREFIX.length);
  const validAgents = listValidSubagents();
  const skills = listSkills();

  if (validAgents.has(name)) {
    // Subagent legítimo → libera. Mas avisa se model não foi explícito.
    maybeWarnMissingModel(input, name);
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Não é agent válido. É skill?
  const isSkill = skills.has(name) || looksLikeSkillName(name);

  // BLOQUEIA
  const reason = buildBlockMessage(name, isSkill, validAgents);

  logTelemetry({
    ts: new Date().toISOString(),
    hook: HOOK_ID,
    blocked: true,
    subagent_type: subagentType,
    detected_as: isSkill ? "skill" : "unknown",
    description: input?.tool_input?.description || null,
  });

  // PreToolUse decision schema: deny → bloqueia ANTES da execução.
  // Mensagem volta como feedback acionável pro modelo.
  process.stdout.write(JSON.stringify({
    continue: true, // continua a sessão, só nega ESTE tool call
    decision: "block",
    reason,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
});
