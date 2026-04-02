#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';

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

function hasConcreteSignal(text) {
  return CONCRETE_SIGNALS.some(p => p.test(text));
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
  const prompt = (input.prompt || '').trim();

  if (hasConcreteSignal(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const score = scoreAmbiguity(prompt);

  let cfg = { enrich_threshold: 0.40, block_threshold: 0.70 };
  try {
    const raw = JSON.parse(readFileSync('hooks/config.json', 'utf-8'));
    if (raw.pre_execution_gate) Object.assign(cfg, raw.pre_execution_gate);
  } catch {}

  if (score < cfg.enrich_threshold) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const auditSnippet = readRepoAuditSnippet();
  const auditHint = auditSnippet ? `\n\nContexto do projeto (repo-audit):\n${auditSnippet}` : '';

  if (score < cfg.block_threshold) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        additionalContext: `[PreExecutionGate] Prompt com ambiguidade media (score: ${score.toFixed(2)}). Antes de montar pipeline, inferir escopo do repo-audit e confirmar com o usuario usando 3 opcoes: "Bora assim? / Quer ajustar? / Ou era outra coisa?".${auditHint}`
      }
    }));
  } else {
    process.stdout.write(JSON.stringify({
      continue: false,
      hookSpecificOutput: {
        additionalContext: `[PreExecutionGate] Prompt vago (score: ${score.toFixed(2)}). Antes de agir, fazer UMA pergunta focada com opcoes multipla escolha para capturar a intencao. Usar repo-audit e session para inferir o resto. Oferecer sempre: "Bora assim? / Quer ajustar? / Ou era outra coisa?". Prefixo "force:" ou "!" bypassa este gate.${auditHint}`
      }
    }));
  }
});
