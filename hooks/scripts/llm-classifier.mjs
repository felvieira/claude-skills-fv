/**
 * LLM-based intent classifier (v2.1.0).
 *
 * Usa Claude Haiku via `claude --print` (CLI) pra classificar prompts em
 * categorias da policy auto-orchestration + USE-CASES.md.
 *
 * Output JSON: {category, command, args, confidence, reasoning}
 *
 * Categories:
 *   A — Autônomo (manda e esquece, retorna em PR)
 *   B — Pipeline com gates (controle, programs YAML)
 *   C — Direto/leve (task simples, /auto ou skill direta)
 *   D — Conversacional (Q&A, sem command)
 *   E — Agendado/contínuo (/schedule)
 *
 * Fallback: se LLM falha ou confidence baixa, retorna null e caller usa regex.
 */

import { spawnSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Catálogo compacto pra prompt (caber em budget de tokens)
const SYSTEM_PROMPT = `Você é classifier de intent pro Dev Team Kit. Recebe prompt do usuário, decide qual fluxo usar.

CATEGORIAS:
- A=Autônomo (manda e esquece, retorna PR): /swarm
- B=Pipeline com gates: /run-program <X>
- C=Direto/leve: /auto, skill direta, subagent
- D=Conversa: sem command
- E=Agendado: /schedule

COMANDOS DISPONÍVEIS:
- /swarm                            → A. Feature em projeto / "fix #N" issue
- /run-program adversarial-dev      → B. MVP greenfield/from scratch
- /run-program spec-driven-development → B. Feature com constitution + gates
- /run-program detective-spec       → B. Documentar legacy
- /run-program comprehensive-review → B. PR review profundo (5 agents)
- /run-program refactor-safely      → B. Refactor com behavior preservation
- /run-program loop-polishing       → B. Autonomous loop com polish
- /run-program pipeline-discovery   → B. Ideia vaga → discovery
- /auto                             → C. Bug fix, task simples
- /test                             → C. Adicionar testes
- /web-assets                       → C. Assets visuais
- /devkit-install-fv                → Setup
- /schedule                         → E. Recorrente

SINAIS:
- "criar feature", "adicionar X" → /swarm (A)
- "fix #N", "issue N" → /swarm fix #N (A)
- "from scratch", "MVP do zero" → adversarial-dev (B)
- "refatorar", "extrair módulo" → refactor-safely (B)
- "bug", "crash", "erro" → /auto (C)
- "criar testes", "coverage" → /test (C)
- "review PR" → comprehensive-review (B) ou /review (C) dependendo do escopo
- "legacy", "sem docs" → detective-spec (B)
- "investigar", "performance" → /auto + debugger (C)
- "spike", "PoC" → /auto --no-tdd (C)
- "o que é", "como funciona" → D (conversa, command: null)
- "rodar semanal", "agendar" → /schedule (E)

OUTPUT (somente JSON, nada antes/depois):
{"category": "A|B|C|D|E", "command": "/swarm" | "/run-program X" | "/auto" | "/test" | "/schedule" | null, "args": "..." | null, "confidence": 0.0-1.0, "reasoning": "1 frase"}

Confidence:
- 0.9+ = match óbvio (palavras-gatilho fortes)
- 0.7-0.9 = match razoável (contexto claro)
- < 0.7 = duvidoso (não recomende)`;

/**
 * Classifica prompt via Claude Haiku CLI.
 * Retorna {category, command, args, confidence, reasoning} ou null se falhar.
 */
export function classifyWithLLM(prompt, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const claudeCli = opts.claudeCli ?? "claude";

  // Tenta CLI; se não existir, retorna null
  const checkCli = spawnSync(claudeCli, ["--version"], { encoding: "utf8", timeout: 3000 });
  if (checkCli.status !== 0) {
    return { error: "claude-cli-unavailable", fallback: true };
  }

  const userMsg = `Classifique este prompt do usuário:\n\n"${prompt.slice(0, 2000)}"`;

  const result = spawnSync(claudeCli, [
    "--print",                         // non-interactive
    "--model", "haiku",                // cheap + fast
    "--append-system-prompt", SYSTEM_PROMPT,
    userMsg,
  ], {
    encoding: "utf8",
    timeout: timeoutMs,
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error || result.status !== 0) {
    return { error: `cli-failed: ${result.error?.message || `exit ${result.status}`}`, fallback: true };
  }

  const output = (result.stdout || "").trim();

  // Tenta extrair JSON (Haiku às vezes adiciona texto antes/depois)
  let parsed = null;
  try {
    parsed = JSON.parse(output);
  } catch {
    // tenta extrair primeiro {...} válido
    const match = output.match(/\{[\s\S]*?\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {}
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return { error: `parse-failed: ${output.slice(0, 200)}`, fallback: true };
  }

  // Validate shape
  if (!parsed.category || !["A", "B", "C", "D", "E"].includes(parsed.category)) {
    return { error: `invalid-category: ${parsed.category}`, fallback: true };
  }
  if (typeof parsed.confidence !== "number" || parsed.confidence < 0 || parsed.confidence > 1) {
    return { error: `invalid-confidence: ${parsed.confidence}`, fallback: true };
  }

  return parsed;
}

/**
 * Helper: lê config do swarm telemetry path.
 */
export function getTelemetryPath() {
  // .swarm/classifier.jsonl no cwd (project-level)
  return join(process.cwd(), ".swarm", "classifier.jsonl");
}
