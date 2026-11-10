#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const STATES = new Set(['measured', 'missing', 'failed', 'stale', 'unsupported']);
const MUTATION_COUNTS = ['killed', 'survived', 'uncovered', 'timeout', 'invalid', 'equivalent', 'error'];
const MAX_INPUT_BYTES = 2 * 1024 * 1024;

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}: objeto esperado.`);
  return value;
}

function string(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > 1000 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`${label}: texto não vazio, sem controles e com até 1000 caracteres esperado.`);
  }
  return value.trim();
}

function number(value, min, max, label, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value))) {
    throw new Error(`${label}: número ${integer ? 'inteiro ' : ''}entre ${min} e ${max} esperado.`);
  }
  return value;
}

function list(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10000) throw new Error(`${label}: lista com até 10000 itens esperada.`);
  return value;
}

function point(value, label) {
  object(value, label);
  return {
    file: string(value.file, `${label}.file`),
    line: number(value.line, 1, Number.MAX_SAFE_INTEGER, `${label}.line`, true),
  };
}

function measurement(value, label, revision) {
  if (value === undefined) return { status: 'missing' };
  object(value, label);
  if (!STATES.has(value.status)) throw new Error(`${label}.status: estado inválido.`);
  if (value.status !== 'measured') return { status: value.status, reason: string(value.reason, `${label}.reason`) };
  const reportedRevision = string(value.revision, `${label}.revision`);
  const evidence = string(value.evidence, `${label}.evidence`);
  return {
    status: reportedRevision === revision ? 'measured' : 'stale',
    revision: reportedRevision, evidence,
    ...(reportedRevision !== revision ? { reason: 'Revisão declarada diferente do relatório.' } : {}),
  };
}

function functionReport(value, index, revision) {
  const label = `functions[${index}]`;
  const location = point(value, label);
  const name = string(value.name, `${label}.name`);
  const complexity = measurement(value.complexity, `${label}.complexity`, revision);
  const coverage = measurement(value.coverage, `${label}.coverage`, revision);
  let cc = null, ratio = null, coverageKind = null;
  if (value.complexity?.status === 'measured') {
    const declared = number(value.complexity.value, 1, 1000000, `${label}.complexity.value`, true);
    if (complexity.status === 'measured') cc = declared;
  }
  if (value.coverage?.status === 'measured') {
    const covered = number(value.coverage.covered, 0, Number.MAX_SAFE_INTEGER, `${label}.coverage.covered`, true);
    const total = number(value.coverage.total, 0, Number.MAX_SAFE_INTEGER, `${label}.coverage.total`, true);
    if (covered > total) throw new Error(`${label}.coverage: covered não pode exceder total.`);
    if (!['branch', 'line', 'instruction'].includes(value.coverage.kind)) throw new Error(`${label}.coverage.kind: tipo inválido.`);
    coverageKind = value.coverage.kind;
    if (coverage.status === 'measured' && total > 0) ratio = covered / total;
    if (coverage.status === 'measured' && total === 0) coverage.status = 'no-samples';
  }
  const status = ['failed', 'stale', 'unsupported', 'missing', 'no-samples']
    .find((state) => complexity.status === state || coverage.status === state) || 'measured';
  return {
    ...location, name, status, complexity: cc, coverageRatio: ratio, coverageKind,
    crap: status === 'measured' ? Math.round((cc ** 2 * (1 - ratio) ** 3 + cc) * 100) / 100 : null,
    reasons: [complexity.reason, coverage.reason].filter(Boolean),
    evidence: [...new Set([complexity.evidence, coverage.evidence].filter(Boolean))],
  };
}

function mutationReport(value, revision) {
  if (value === undefined) return { status: 'missing', detectionPercent: null, complete: false };
  const measured = measurement(value, 'mutation', revision);
  if (value.status !== 'measured') return { ...measured, detectionPercent: null, complete: false };
  if (!['passed', 'failed', 'not-run'].includes(value.baseline)) throw new Error('mutation.baseline: estado inválido.');
  object(value.counts, 'mutation.counts');
  const counts = Object.fromEntries(MUTATION_COUNTS.map((key) => [
    key, number(value.counts[key], 0, 10000000, `mutation.counts.${key}`, true),
  ]));
  const triageEvidence = counts.equivalent > 0 ? string(value.triageEvidence, 'mutation.triageEvidence') : null;
  const eligible = counts.killed + counts.survived;
  const usable = measured.status === 'measured' && value.baseline === 'passed';
  const complete = usable && eligible > 0 && counts.timeout + counts.invalid + counts.error + counts.uncovered === 0;
  return {
    ...measured,
    status: measured.status !== 'measured' ? measured.status : value.baseline === 'passed' ? (eligible > 0 ? 'measured' : 'no-samples') : 'baseline-unavailable',
    baseline: value.baseline, counts, triageEvidence,
    detectionPercent: usable && eligible > 0 ? Math.round(counts.killed / eligible * 10000) / 100 : null,
    denominator: eligible, denominatorKind: 'assertion-killed-plus-survived', complete,
  };
}

function duplicateReport(value, index, revision) {
  const label = `duplications[${index}]`;
  object(value, label);
  if (!['candidate', 'confirmed', 'justified'].includes(value.status)) throw new Error(`${label}.status: estado inválido.`);
  const reportedRevision = string(value.revision, `${label}.revision`);
  return {
    left: point(value.left, `${label}.left`), right: point(value.right, `${label}.right`),
    similarity: number(value.similarity, 0, 1, `${label}.similarity`), status: value.status,
    revision: reportedRevision, dataStatus: reportedRevision === revision ? 'measured' : 'stale',
    evidence: string(value.evidence, `${label}.evidence`),
    reason: value.status === 'candidate' ? null : string(value.reason, `${label}.reason`),
  };
}

export function buildReport(input) {
  object(input, 'input');
  if (input.schema_version !== 1) throw new Error('schema_version deve ser 1.');
  const scope = string(input.scope, 'scope');
  const revision = string(input.revision, 'revision');
  if (typeof input.synthetic !== 'boolean') throw new Error('synthetic deve ser booleano.');
  const functions = list(input.functions, 'functions').map((value, index) => functionReport(value, index, revision));
  const keys = functions.map((item) => JSON.stringify([item.file, item.name, item.line]));
  if (new Set(keys).size !== keys.length) throw new Error('functions: função repetida no mesmo local.');
  const duplications = list(input.duplications, 'duplications').map((value, index) => duplicateReport(value, index, revision));
  const mutation = mutationReport(input.mutation, revision);
  return {
    schema_version: 1, scope, revision, synthetic: input.synthetic,
    evidenceValidation: 'declared-only',
    functions, duplications, mutation,
    summary: {
      functions: functions.length, functionsWithCrap: functions.filter((item) => item.crap !== null).length,
      functionsWithoutCrap: functions.filter((item) => item.crap === null).length,
      duplicationCandidates: duplications.filter((item) => item.dataStatus === 'measured' && item.status === 'candidate').length,
    },
    limitations: [
      'Consolida dados declarados; não coleta métricas nem verifica os artefatos citados.',
      'Revisões e escopos precisam corresponder ao código e aos testes realmente executados.',
      'CRAP, similaridade e mutação são sinais para investigação; o relatório não aprova arquitetura ou release.',
    ],
  };
}

function cell(value) {
  return String(value ?? 'não medido').replace(/[\\`|<>\[\]!\r\n]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '\r': ' ', '\n': ' ' }[char] || `\\${char}`));
}

export function renderMarkdown(report) {
  const rows = [
    `# Evidência de qualidade${report.synthetic ? ' — exemplo sintético' : ''}`, '',
    `Escopo: ${cell(report.scope)}. Revisão declarada: ${cell(report.revision)}.`, '',
    '| Função | Estado | Complexidade | Cobertura | CRAP |',
    '|---|---|---:|---:|---:|',
    ...report.functions.map((item) => `| ${cell(item.file)}:${item.line} ${cell(item.name)} | ${item.status} | ${item.complexity ?? '—'} | ${item.coverageRatio === null ? '—' : `${(item.coverageRatio * 100).toFixed(2)}% ${item.coverageKind}`} | ${item.crap ?? '—'} |`),
    '', '## Duplicação', '',
    ...report.duplications.map((item) => `- ${cell(item.left.file)}:${item.left.line} ↔ ${cell(item.right.file)}:${item.right.line}: ${item.similarity.toFixed(2)}, ${item.status}, dados ${item.dataStatus}${item.reason ? ` — ${cell(item.reason)}` : ''}`),
    '', '## Mutação', '',
    `Estado: ${report.mutation.status}. Baseline: ${report.mutation.baseline ?? 'não informado'}. Detecção nos mutantes válidos executados: ${report.mutation.detectionPercent === null ? 'não medida' : `${report.mutation.detectionPercent}%`}. Escopo declarado completo: ${report.mutation.complete ? 'sim' : 'não'}.`,
  ];
  if (report.mutation.reason) rows.push(`Motivo: ${cell(report.mutation.reason)}`);
  if (report.mutation.counts) rows.push(`Contagens: ${MUTATION_COUNTS.map((key) => `${key}=${report.mutation.counts[key]}`).join(', ')}.`);
  const evidence = [...new Set(report.functions.flatMap((item) => item.evidence).concat(report.duplications.map((item) => item.evidence), report.mutation.evidence || [], report.mutation.triageEvidence || []))];
  rows.push('', '## Referências declaradas', '', ...evidence.map((item) => `- ${cell(item)}`));
  const reasons = report.functions.flatMap((item) => item.reasons.map((reason) => `${item.file}:${item.line}: ${reason}`));
  rows.push('', ...reasons.map((reason) => `- ${cell(reason)}`), '', ...report.limitations.map((item) => `- ${item}`));
  return `${rows.join('\n')}\n`;
}

export function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  let input, json = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json' && !json) json = true;
    else if (args[i] === '--input' && !input && args[i + 1] && !args[i + 1].startsWith('--')) input = args[++i];
    else throw new Error(`Argumento desconhecido, repetido ou incompleto: ${args[i]}`);
  }
  if (!input) throw new Error('Informe --input <relatorio.json>.');
  return { input, json };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Uso: node scripts/code-quality-report.mjs --input arquivo.json [--json]\nLê medições normalizadas e escreve em stdout. Não executa testes/scanners nem instala ferramentas.');
    return;
  }
  const info = await stat(args.input);
  if (!info.isFile() || info.size > MAX_INPUT_BYTES) throw new Error('Input deve ser arquivo JSON com até 2 MiB.');
  const report = buildReport(JSON.parse(await readFile(args.input, 'utf8')));
  process.stdout.write(args.json ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`code-quality-report: ${error.message}`); process.exitCode = 2; });
}
