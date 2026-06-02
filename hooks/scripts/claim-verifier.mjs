#!/usr/bin/env node
/**
 * claim-verifier.mjs (PostToolUse)
 *
 * Detecta quando o modelo acabou de produzir output que afirma um resultado
 * sem evidência observável — o padrão "email enviado" quando não rodou query,
 * "deploy OK" quando não checou endpoint, "teste passou" sem log de saída.
 *
 * POR QUE ISSO IMPORTA: LLMs completam padrões plausíveis. Quando a cadeia
 * de raciocínio aponta pra "deveria ter funcionado", o modelo escreve o resultado
 * esperado no output em vez do resultado real. Não é mentira intencional — é
 * preenchimento de padrão. Este hook intercepta o momento em que isso está
 * prestes a acontecer e exige evidência antes de afirmar.
 *
 * ABORDAGEM: conservadora (precisão > cobertura). Só dispara quando:
 * 1. A tool foi Bash, Read, Edit ou Write (gerou output potencialmente acionável)
 * 2. O output contém padrão de afirmação de resultado SEM evidência imediata
 * 3. O padrão NÃO está acompanhado de evidência inline (exit code, query result, URL)
 *
 * NÃO bloqueia (continue: true). Educa — injeta additionalContext exigindo evidência.
 *
 * Ver policies/claim-verification.md
 */
import { appendFileSync, mkdirSync } from "fs";
import { resolveBotPath, isHookDisabled, readHookConfig } from "./utils.mjs";

// Tools cujo output pode gerar afirmações problemáticas
const ACTIONABLE_TOOLS = new Set([
  "Bash", "Edit", "Write", "NotebookEdit",
  "mcp__Desktop_Commander__write_file",
  "mcp__Desktop_Commander__edit_block",
  "mcp__Desktop_Commander__start_process",
]);

// Padrões de afirmação de resultado SEM evidência
// Cada entrada: { pattern, label, hint }
const CLAIM_PATTERNS = [
  // Email / notificação
  {
    label: "email-sent-claim",
    pattern: /\b(?:email|e-?mail|mensagem|message|notifica[cç][aã]o)\b[^.!?]*\b(?:enviado|enviada|sent|disparado|disparada|delivered|entregue)\b/i,
    hint: "Verifique antes de afirmar: `SELECT status FROM email_queue WHERE id=... LIMIT 1` ou cheque o log do SES/SMTP. Se status não for 'sent', NÃO afirme que foi enviado.",
  },
  // Deploy / release
  {
    label: "deploy-ok-claim",
    pattern: /\b(?:deploy|deployment|release|publicado|published|subiu|rodando|running|no ar|up and running)\b[^.!?]*\b(?:ok|feito|done|concluido|concluído|completo|successful|com sucesso|funcionando)\b|\bdeploy\b[^.!?]*\bOK\b/i,
    hint: "Verifique antes de afirmar: `curl -s https://seu-dominio.com/health` ou `docker ps | grep nome-container`. Só afirme 'deploy OK' com HTTP 200 ou container running em mãos.",
  },
  // Teste / CI
  {
    label: "test-passed-claim",
    pattern: /\b(?:teste|test|spec|suite)\b[^.!?]*\b(?:passou|passando|passed|passing|verde|green|funcionou|funcionando|OK)\b|\btodos os testes\b[^.!?]*\b(?:passam|passaram|passed)\b/i,
    hint: "Verifique antes de afirmar: cole a saída real do test runner (exit code 0, linha 'X passing'). Sem output concreto, escreva 'código implementado — rodar `npm test` para confirmar'.",
  },
  // Banco de dados / query
  {
    label: "db-operation-claim",
    pattern: /\b(?:dado|registro|record|row|linha)\b[^.!?]*\b(?:inserido|atualizado|deletado|criado|salvo|inserted|updated|deleted|created|saved)\b[^.!?]*\b(?:com sucesso|successfully|OK|feito)?\b/i,
    hint: "Verifique antes de afirmar: rode a query de leitura correspondente (`SELECT` ou `COUNT`) e mostre o resultado. Sem confirmação da DB, escreva 'query executada — verificar resultado'.",
  },
  // Migração
  {
    label: "migration-ran-claim",
    pattern: /\b(?:migra[cç][aã]o|migration)\b[^.!?]*\b(?:rodou|executou|aplicada|aplicado|ran|applied|ok|feita|feito|com sucesso)\b/i,
    hint: "Verifique antes de afirmar: `SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 3` ou equivalente. Mostre que a migration aparece na tabela de histórico.",
  },
  // Arquivo criado/deletado
  {
    label: "file-operation-claim",
    pattern: /\barquivo\b[^.!?]*\b(?:criado|deletado|removido|atualizado|salvo|gerado)\b[^.!?]*\b(?:com sucesso|OK|feito|successfully)?\b|\bfile\b[^.!?]*\b(?:created|deleted|removed|updated|saved|generated)\b[^.!?]*\b(?:successfully|OK)?\b/i,
    hint: "A tool Edit/Write já confirma escrita — se o harness não reportou erro, o arquivo foi salvo. Este aviso é para quando você afirma resultado de file operation SEM ter usado a tool correspondente.",
    skipIfTools: new Set(["Edit", "Write", "NotebookEdit"]), // tool já prova
  },
  // Credencial / autenticação
  {
    label: "auth-success-claim",
    pattern: /\b(?:autenticad|logado|logada|autenticou|connected|conectado|authenticated|login\s+(?:ok|feito|com sucesso))\b/i,
    hint: "Verifique antes de afirmar: rode o comando de verificação (`gh auth status`, `aws sts get-caller-identity`, etc.) e mostre o output real.",
  },
];

// Evidências inline que INVALIDAM o disparo (se presentes, provavelmente tem prova)
const EVIDENCE_PATTERNS = [
  /exit\s+(?:code\s+)?0\b/i,
  /\b(?:HTTP|status)\s+(?:200|201|204)\b/i,
  /\b\d+\s+(?:passing|passed|tests?\s+OK)\b/i,
  /\bSELECT\b.*\bFROM\b/i,            // query inline
  /\bcurl\s+-/i,                        // curl command presente
  /\bdocker\s+ps\b/i,
  /\bgh\s+auth\s+status\b/i,
  /\brows?\s+affected:\s*\d+/i,
  /\b\d+\s+row[s]?\b/i,               // resultado de query
];

function hasEvidence(text) {
  return EVIDENCE_PATTERNS.some((p) => p.test(text));
}

function getOutputText(toolOutput) {
  if (!toolOutput) return "";
  if (typeof toolOutput === "string") return toolOutput;
  // Claude Code tool outputs vary: { type, text } or { content: [...] } or plain string
  if (toolOutput.text) return String(toolOutput.text);
  if (Array.isArray(toolOutput.content)) {
    return toolOutput.content
      .map((c) => (c.text || c.content || ""))
      .join(" ");
  }
  return JSON.stringify(toolOutput).slice(0, 2000);
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (c) => { inputBuffer += c; });
process.stdin.on("end", () => {
  let input = {};
  try { input = JSON.parse(inputBuffer); } catch {}

  if (isHookDisabled("claim-verifier")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const cfg = readHookConfig("claim_verifier", { enabled: true });
  if (cfg.enabled === false) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const toolName = input.tool_name || "";
  if (!ACTIONABLE_TOOLS.has(toolName)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const outputText = getOutputText(input.tool_response || input.tool_output || input.output);
  if (!outputText || outputText.length < 20) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Se já tem evidência inline, passa livre
  if (hasEvidence(outputText)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Checar cada padrão de afirmação
  const matches = CLAIM_PATTERNS.filter((r) => {
    if (r.skipIfTools && r.skipIfTools.has(toolName)) return false;
    return r.pattern.test(outputText);
  });

  if (matches.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const bullets = matches
    .map((m) => `  - [${m.label}] ${m.hint}`)
    .join("\n");

  const guidance = [
    `[claim-verifier] ⚠ Afirmação de resultado sem evidência detectada.`,
    ``,
    `O output contém ${matches.length > 1 ? matches.length + " padrões" : "um padrão"} de afirmação sem prova observável.`,
    `Afirmar resultado sem evidência é o padrão que causa logs enganosos e falsa confiança.`,
    ``,
    `ANTES de escrever "X funcionou" no output final:`,
    bullets,
    ``,
    `Regra: se não tem evidência (exit code, query result, HTTP status, log line) →`,
    `  escreva "código implementado — rodar [comando] para confirmar" em vez de afirmar sucesso.`,
    ``,
    `Prossiga com o output real (não bloqueado) — mas revise a afirmação acima.`,
    `Ver policies/claim-verification.md.`,
  ].join("\n");

  // Telemetria best-effort
  try {
    mkdirSync(resolveBotPath(), { recursive: true });
    appendFileSync(
      resolveBotPath("claim-verifier.jsonl"),
      JSON.stringify({
        ts: new Date().toISOString(),
        hook: "claim-verifier",
        tool: toolName,
        matched: matches.map((m) => m.label),
      }) + "\n",
      "utf-8"
    );
  } catch {}

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: guidance,
    },
  }));
});
