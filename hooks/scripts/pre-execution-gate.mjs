#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { readHookConfig, isHookDisabled, resolveBotPath } from './utils.mjs';

const CONCRETE_SIGNALS = [
  /(?:[A-Za-z]:)?(?:\/|\\)[\w./\\-]+\.\w+/,
  /\bsrc\/\S+/,
  /\.(?:ts|tsx|js|jsx|py|go|rs|rb|java|cs|md)\b/,
  /#\d+/,
  /\bissue\s+\d+/i,
  /\bpr\s+\d+/i,
  /\b[a-z][a-zA-Z0-9]{3,}[A-Z][a-zA-Z0-9]+\b/,
  /\b[A-Z][a-zA-Z0-9]{3,}\b/,
  /\b\w+_\w+_\w+\b/,
  /^\s*(?:1\.|step\s+1)/im,
  /- \[ \]/,
  /\b(?:DADO|QUANDO|ENTAO|GIVEN|WHEN|THEN)\b/i,
  /\b(?:TypeError|Error|Exception|ENOENT|undefined is not)/i,
  /at\s+\w[\w.<>]+\s*\(/,
  /```/,
  /^(?:force:|!)/,
];

// Open-ended discussion / opinion / feedback prompts. These are deliberately broad and
// asking the model to ask clarifying questions defeats their purpose.
const OPEN_DISCUSSION_PATTERNS = [
  /\b(?:o que (?:voce |vc |tu )?(?:acha|pensa|recomenda|sugere|melhoraria|faria|diria))\b/i,
  /\b(?:me (?:explique|conta|diz|fala|d[ea]) (?:uma )?(?:opiniao|doc|sugestao|ideia|visao|analise))\b/i,
  /\b(?:what (?:do you|would you) (?:think|recommend|suggest|improve))\b/i,
  /\b(?:dry|clean code|seguranca|security|performance|organizacao|features|melhorias|improvements|sugestoes|suggestions|ideias|ideas)\b.*\b(?:dry|clean code|seguranca|security|performance|organizacao|features|melhorias|improvements|sugestoes|suggestions|ideias|ideas)\b/i,
  /\b(?:audit(?:oria)?|review (?:do|of) (?:the |o |a )?(?:codigo|code|sistema|system|projeto|project))\b/i,
  /\b(?:brainstorm|discuss(?:ao|ion)?|trade.?offs?)\b/i,
];

function hasConcreteSignal(text) {
  return CONCRETE_SIGNALS.some(p => p.test(text));
}

function isOpenDiscussion(text) {
  return OPEN_DISCUSSION_PATTERNS.some(p => p.test(text));
}

function scoreAmbiguity(text) {
  const hasVerb = /\b(?:add|create|fix|remove|update|refactor|implement|build|change|improve|migrate|make|faz|cria|adiciona|remove|corrige|melhora|refatora)\b/i.test(text);
  const words = text.trim().split(/\s+/).length;
  const hasScope = /\b(?:in|on|for|when|at|na|no|em|para|quando)\s+\w+/i.test(text);
  const goalScore = (hasVerb ? 0.4 : 0) + (words > 4 ? 0.3 : 0) + (hasScope ? 0.3 : 0);

  const lower = text.toLowerCase();
  const constraintScore = Math.min(1, (lower.match(/\b(?:max|min|must|cannot|without|no more|at least|sem|nao pode|precisa|obrigatorio)\b/g) || []).length * 0.35);
  const criteriaScore = Math.min(1, (lower.match(/\b(?:when|then|should|returns?|loads?|displays?|shows?|retorna|carrega|mostra|quando|entao)\b/g) || []).length * 0.25);

  const ambiguity = 1 - (goalScore * 0.40 + constraintScore * 0.30 + criteriaScore * 0.30);
  return Math.max(0, Math.min(1, ambiguity));
}

function readRepoAuditSnippet() {
  const paths = ['.bot/docs/repo-audit/current.md', 'docs/repo-audit/current.md'];
  for (const p of paths) {
    if (existsSync(p)) {
      try {
        return readFileSync(p, 'utf-8').slice(0, 500);
      } catch {}
    }
  }
  return null;
}

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(_input); } catch {}

  if (isHookDisabled('pre-execution-gate')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const prompt = (input.prompt || '').trim();

  // Save last_prompt for context-guard-stop strategic compact
  try {
    const sessionPath = resolveBotPath('.hook-session.json');
    let session = {};
    try { session = JSON.parse(readFileSync(sessionPath, 'utf-8')); } catch {}
    session.last_prompt = prompt.slice(0, 80).replace(/\s+/g, ' ').trim();
    mkdirSync(dirname(sessionPath), { recursive: true });
    writeFileSync(sessionPath, JSON.stringify(session));
  } catch {}

  if (hasConcreteSignal(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Open-ended discussion/opinion prompts are NOT "ambiguous" — they're deliberately broad
  // and the right response is to engage, not interrogate. Bypass the gate.
  if (isOpenDiscussion(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const score = scoreAmbiguity(prompt);

  const cfg = readHookConfig('pre_execution_gate', { enrich_threshold: 0.40, block_threshold: 0.70 });

  if (score < cfg.enrich_threshold) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const auditSnippet = readRepoAuditSnippet();
  const auditHint = auditSnippet ? `\n\nContexto do projeto (repo-audit):\n${auditSnippet}` : '';

  // NEVER block with continue:false on UserPromptSubmit — Claude Code renders that as
  // "Operation stopped by hook" with no visible context, which is hostile UX.
  // Instead, always continue and let the MODEL decide if it should ask for clarification.
  const guidance = score < cfg.block_threshold
    ? `[PreExecutionGate] Prompt com ambiguidade media (score: ${score.toFixed(2)}). Se for task de implementacao/refactor, inferir escopo do repo-audit e confirmar com 3 opcoes: "Bora assim? / Quer ajustar? / Ou era outra coisa?". Se for pergunta aberta/conversa, responder normalmente sem perguntas.`
    : `[PreExecutionGate] Prompt vago (score: ${score.toFixed(2)}). Para tasks de implementacao, considere fazer UMA pergunta focada com multipla escolha antes de agir. Para perguntas abertas de discussao/feedback ("o que voce acha de X", "melhorias", etc), responda normalmente — nao force estruturacao. Prefixo "force:" ou "!" reforca intencao direta.`;

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: guidance + auditHint
    }
  }));
});
