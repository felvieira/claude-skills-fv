/**
 * Contexto adiado: entrega, num evento posterior, o que nao pode ser entregue no UserPromptSubmit.
 *
 * O Grok Build descarta o `additionalContext` de um UserPromptSubmit que permite o prompt (so aceita
 * em PreToolUse/PostToolUse/Stop). O perfil `memory-deferred` do dispatcher guarda o contexto aqui
 * quando o prompt chega e o entrega UMA vez no primeiro PostToolUse do mesmo turno ou de um turno
 * seguinte. Um turno sem nenhuma ferramenta nao recebe nada — limite do host, nao do kit.
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { redact } from "./memory-lib.mjs";

const MAX_CHARS = 8000; // o Grok corta additionalContext em 10 000
const MAX_AGE_MS = 30 * 60 * 1000;

const safeId = (id) => String(id || "").replace(/[^A-Za-z0-9_-]/g, "");

export function pendingContextPath(cwd, sessionId) {
  const sid = safeId(sessionId);
  return sid ? join(cwd || process.cwd(), ".auto", "pending-context", `${sid}.json`) : null;
}

export function hasPendingContext(cwd, sessionId) {
  const file = pendingContextPath(cwd, sessionId);
  return Boolean(file) && existsSync(file);
}

export function savePendingContext(cwd, sessionId, text) {
  const file = pendingContextPath(cwd, sessionId);
  if (!file || !text) return false;
  try {
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, JSON.stringify({ v: 1, created: Date.now(), text: redact(String(text)).slice(0, MAX_CHARS) }));
    return true;
  } catch {
    return false;
  }
}

/** Le e apaga. Devolve "" se nao ha nada, se esta velho demais ou se o arquivo esta corrompido. */
export function consumePendingContext(cwd, sessionId, now = Date.now()) {
  const file = pendingContextPath(cwd, sessionId);
  if (!file || !existsSync(file)) return "";
  try {
    const record = JSON.parse(readFileSync(file, "utf8"));
    return record?.v === 1 && now - Number(record.created) <= MAX_AGE_MS ? String(record.text || "") : "";
  } catch {
    return "";
  } finally {
    try { unlinkSync(file); } catch { /* ja apagado */ }
  }
}
