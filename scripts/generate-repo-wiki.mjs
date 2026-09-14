#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectSources } from './repo-wiki-sources.mjs';

const GENERATOR_VERSION = '3.0.0';
const pageDefinitions = {
  overview: ['Visão geral do repositório', 'overview.md'],
  architecture: ['Arquitetura e organograma', 'architecture.md'],
  workflows: ['Workflows e fluxos', 'workflows.md'],
  boundaries: ['Boundaries e contratos', 'boundaries.md'],
  database: ['Banco de dados', 'database.md'],
  verification: ['Verificação de execução', 'verification.md'],
  business_rules: ['Regras de negócio e comportamento', 'business-rules.md'],
  security: ['Segurança', 'security.md'],
  automations: ['Automações', 'automations.md'],
  rpa: ['RPA', 'rpa.md'],
  improvements: ['Melhorias do repositório', 'improvements.md'],
};
const functionalTracks = ['business_rules', 'security', 'automations', 'rpa', 'improvements'];
const args = { repo: process.cwd(), output: 'docs/repo-wiki', mode: 'Full', analysis: null, runtime: null, focus: null };

for (let i = 2; i < process.argv.length; i += 1) {
  const key = process.argv[i].replace(/^--/, '');
  if (!['repo', 'output', 'mode', 'analysis', 'runtime', 'focus'].includes(key) || !process.argv[i + 1]) throw new Error(`Argumento inválido: ${process.argv[i]}`);
  args[key] = process.argv[++i];
}

function git(repo, ...argv) {
  try { return execFileSync('git', ['-C', repo, ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function prose(text) { return String(text).replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
function tableCell(text) { return String(text).replaceAll('|', '/').replaceAll('\n', ' '); }
function mermaidId(id) { return `N_${String(id).replace(/[^a-zA-Z0-9_]/g, '_')}`; }
function mermaidLabel(text) { return String(text).replace(/[\[\]"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 70); }
function evidenceLabel(ref) { return `[evidence: ${ref.path}:${ref.start}-${ref.end}]`; }
function requiredString(value, field, owner) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Campo obrigatório ${owner}.${field}`);
  return value;
}
function evidenceHasSecret(text) {
  return /-----BEGIN .*PRIVATE KEY-----|\b(?:sk_(?:live|test)_|ghp_|github_pat_|xox[baprs]-|AKIA)[A-Za-z0-9_./-]{12,}|(?:api[_-]?key|secret|password|token|authorization)\s*[:=]\s*["']?[^\s"',;]{10,}/i.test(text);
}
function validateEvidence(refs, sourceMap, reviewed, owner) {
  if (!Array.isArray(refs) || !refs.length) throw new Error(`Achado sem código: ${owner}`);
  return refs.map((ref) => {
    const source = sourceMap.get(ref.path);
    if (!source || !reviewed.has(ref.path)) throw new Error(`Evidência excluída ou não lida: ${ref.path}`);
    if (!ref.quote?.trim() || source.text.indexOf(ref.quote) < 0 || source.text.indexOf(ref.quote) !== source.text.lastIndexOf(ref.quote)) throw new Error(`Trecho ausente ou ambíguo: ${ref.path}`);
    if (evidenceHasSecret(ref.quote)) throw new Error(`Trecho sensível não pode virar evidência: ${ref.path}`);
    const start = source.text.slice(0, source.text.indexOf(ref.quote)).split('\n').length;
    return { ...ref, start, end: start + ref.quote.split('\n').length - 1, sha256: source.sha256 };
  });
}
function validateItemList(items, fields, label, sourceMap, reviewed) {
  if (!Array.isArray(items)) throw new Error(`Lista inválida ${label}`);
  return items.map((item, index) => {
    for (const field of fields) requiredString(item[field], field, `${label}[${index}]`);
    return { ...item, evidence: validateEvidence(item.evidence, sourceMap, reviewed, `${label}[${index}]`) };
  });
}
function validateOverview(raw, sourceMap, reviewed) {
  if (raw === undefined) return null;
  requiredString(raw.summary, 'summary', 'overview');
  requiredString(raw.purpose, 'purpose', 'overview');
  return {
    status: 'partial', summary: raw.summary, purpose: raw.purpose,
    audience: raw.audience || 'Não identificado no recorte revisado.',
    technologies: validateItemList(raw.technologies, ['name', 'role'], 'overview.technologies', sourceMap, reviewed),
    entrypoints: validateItemList(raw.entrypoints, ['name', 'role'], 'overview.entrypoints', sourceMap, reviewed),
    commands: validateItemList(raw.commands, ['command', 'purpose'], 'overview.commands', sourceMap, reviewed),
    structure: validateItemList(raw.structure, ['path', 'role'], 'overview.structure', sourceMap, reviewed),
    gaps: Array.isArray(raw.gaps) ? raw.gaps.map(String) : [],
  };
}
function validateArchitecture(raw, sourceMap, reviewed) {
  if (raw === undefined) return null;
  requiredString(raw.summary, 'summary', 'architecture');
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) throw new Error('Arquitetura deve conter nodes e edges');
  const ids = new Set();
  const nodes = raw.nodes.map((node) => {
    for (const field of ['id', 'label', 'kind', 'responsibility']) requiredString(node[field], field, 'architecture.nodes');
    if (!/^[a-zA-Z0-9_-]+$/.test(node.id) || ids.has(node.id)) throw new Error(`ID inválido ou duplicado de arquitetura: ${node.id}`);
    if (!['module', 'interface', 'external', 'control'].includes(node.kind)) throw new Error(`Tipo inválido de arquitetura: ${node.id}`);
    ids.add(node.id);
    return { ...node, level: node.level || 'component', evidence: validateEvidence(node.evidence, sourceMap, reviewed, node.id) };
  });
  const edges = raw.edges.map((edge) => {
    for (const field of ['from', 'to', 'relationship']) requiredString(edge[field], field, 'architecture.edges');
    if (!ids.has(edge.from) || !ids.has(edge.to)) throw new Error(`Relação aponta para nó inexistente: ${edge.from} -> ${edge.to}`);
    if (!['observed', 'inferred'].includes(edge.confidence)) throw new Error(`Confiança inválida na relação: ${edge.from} -> ${edge.to}`);
    return { ...edge, evidence: validateEvidence(edge.evidence, sourceMap, reviewed, `${edge.from} -> ${edge.to}`) };
  });
  const contexts = Array.isArray(raw.contexts) ? raw.contexts.map((context, index) => ({
    ...context,
    id: requiredString(context.id, 'id', `architecture.contexts[${index}]`),
    label: requiredString(context.label, 'label', `architecture.contexts[${index}]`),
    summary: requiredString(context.summary, 'summary', `architecture.contexts[${index}]`),
    evidence: validateEvidence(context.evidence, sourceMap, reviewed, `architecture.contexts[${index}]`),
  })) : [];
  const levels = Array.isArray(raw.levels) ? raw.levels.map((level, index) => ({
    ...level,
    id: requiredString(level.id, 'id', `architecture.levels[${index}]`),
    label: requiredString(level.label, 'label', `architecture.levels[${index}]`),
    summary: requiredString(level.summary, 'summary', `architecture.levels[${index}]`),
    evidence: validateEvidence(level.evidence, sourceMap, reviewed, `architecture.levels[${index}]`),
  })) : [];
  return { status: 'partial', summary: raw.summary, contexts, levels, nodes, edges, gaps: Array.isArray(raw.gaps) ? raw.gaps.map(String) : [] };
}
function validateWorkflows(raw, sourceMap, reviewed) {
  if (raw === undefined) return null;
  requiredString(raw.summary, 'summary', 'workflows');
  const items = validateItemList(raw.items, ['id', 'title', 'trigger', 'actors', 'success', 'failure', 'confidence'], 'workflows.items', sourceMap, reviewed);
  for (const item of items) if (!Array.isArray(item.steps) || !item.steps.length) throw new Error(`Workflow sem steps: ${item.id}`);
  for (const item of items) if (!['observed', 'inferred'].includes(item.confidence)) throw new Error(`Confiança inválida no workflow: ${item.id}`);
  return { status: 'partial', summary: raw.summary, items, gaps: Array.isArray(raw.gaps) ? raw.gaps.map(String) : [] };
}
function validateBoundaries(raw, sourceMap, reviewed) {
  if (raw === undefined) return null;
  requiredString(raw.summary, 'summary', 'boundaries');
  const items = validateItemList(raw.items, ['id', 'kind', 'name', 'interface', 'auth', 'input', 'output', 'errors', 'confidence'], 'boundaries.items', sourceMap, reviewed);
  for (const item of items) if (!['observed', 'inferred'].includes(item.confidence)) throw new Error(`Confiança inválida no boundary: ${item.id}`);
  return { status: 'partial', summary: raw.summary, items, gaps: Array.isArray(raw.gaps) ? raw.gaps.map(String) : [] };
}
function validateDatabase(raw, sourceMap, reviewed) {
  if (raw === undefined) return null;
  const status = raw.status || 'partial';
  if (!['partial', 'not_applicable', 'not_reviewed'].includes(status)) throw new Error(`Status inválido do banco: ${status}`);
  if (status === 'not_applicable') return { status, summary: raw.summary || 'Nenhum schema ou persistência aplicável foi revisado.', entities: [], gaps: Array.isArray(raw.gaps) ? raw.gaps.map(String) : [] };
  requiredString(raw.summary, 'summary', 'database');
  const entities = validateItemList(raw.entities, ['name', 'kind', 'fields', 'relations'], 'database.entities', sourceMap, reviewed);
  return { status, summary: raw.summary, entities, gaps: Array.isArray(raw.gaps) ? raw.gaps.map(String) : [] };
}
function validateModules(raw, sourceMap, reviewed) {
  if (raw === undefined) return null;
  requiredString(raw.summary, 'summary', 'modules');
  const items = validateItemList(raw.items, ['id', 'name', 'path', 'purpose', 'inputs', 'outputs', 'dependencies', 'tests', 'risks'], 'modules.items', sourceMap, reviewed);
  return { status: 'partial', summary: raw.summary, items, gaps: Array.isArray(raw.gaps) ? raw.gaps.map(String) : [] };
}
function validateRuntime(raw) {
  if (raw === undefined) return { status: 'not_run', commands: [], gaps: ['Nenhuma verificação de runtime foi registrada.'] };
  const status = raw.status || 'not_run';
  if (!['pass', 'partial', 'fail', 'not_run'].includes(status)) throw new Error(`Status inválido de runtime: ${status}`);
  if (!Array.isArray(raw.commands)) throw new Error('runtime_verification.commands deve ser uma lista');
  for (const [index, item] of raw.commands.entries()) {
    requiredString(item.command, 'command', `runtime_verification.commands[${index}]`);
    requiredString(item.purpose, 'purpose', `runtime_verification.commands[${index}]`);
    if (!['pass', 'fail', 'not_run', 'skipped'].includes(item.status)) throw new Error(`Status inválido do comando de runtime: ${item.command}`);
    if (item.output && evidenceHasSecret(item.output)) throw new Error(`Saída de runtime contém possível secret: ${item.command}`);
  }
  return { status, commands: raw.commands, gaps: Array.isArray(raw.gaps) ? raw.gaps.map(String) : [] };
}
async function readJsonIfPresent(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return null; }
}
function sourceDelta(previous, sources) {
  const oldMap = new Map((previous?.source_snapshot || []).map((item) => [item.path, item.sha256]));
  const currentMap = new Map(sources.map((item) => [item.path, item.sha256]));
  const changed = sources.filter((item) => oldMap.get(item.path) && oldMap.get(item.path) !== item.sha256).map((item) => item.path);
  const added = sources.filter((item) => !oldMap.has(item.path)).map((item) => item.path);
  const removed = [...oldMap.keys()].filter((file) => !currentMap.has(file));
  return { changed, added, removed, unchanged: sources.length - changed.length - added.length };
}
function touchesChanged(item, changed, currentMap) {
  return (item?.evidence || []).some((evidence) => changed.has(evidence.path) || currentMap.get(evidence.path)?.sha256 !== evidence.sha256);
}
function mergeSectionItems(current, previous, changed, currentMap, identity, count) {
  const currentItems = Array.isArray(current) ? current : [];
  const identities = new Set(currentItems.map(identity));
  const carried = (Array.isArray(previous) ? previous : []).filter((item) => !touchesChanged(item, changed, currentMap) && !identities.has(identity(item)));
  count.value += carried.length;
  return [...currentItems, ...carried];
}
function mergeIncrementalAnalysis(input, previous, sources, delta, reused) {
  if (!previous) return { analysis: input, reused: 0 };
  const currentMap = new Map(sources.map((source) => [source.path, source]));
  const changed = new Set([...delta.changed, ...delta.added, ...delta.removed]);
  const previousReviewed = (previous.source_snapshot || []).filter((item) => !changed.has(item.path) && currentMap.get(item.path)?.sha256 === item.sha256).map((item) => ({ path: item.path, sha256: item.sha256 }));
  const semanticSection = (section) => previous[section]?.status && previous[section].status !== 'not_reviewed' ? previous[section] : undefined;
  const previousInput = { schema_version: 2, scope: previous.scope, reviewed_files: previousReviewed, findings: previous.findings || [], overview: semanticSection('overview'), architecture: semanticSection('architecture'), workflows: semanticSection('workflows'), boundaries: semanticSection('boundaries'), database: semanticSection('database'), modules: semanticSection('modules'), runtime_verification: semanticSection('runtime_verification') };
  const merged = { ...previousInput, ...(input || {}) };
  merged.reviewed_files = [...new Map([...(previousReviewed.map((item) => [item.path, item])), ...((input?.reviewed_files || []).map((item) => [item.path, item]))]).values()];
  merged.findings = mergeSectionItems(input?.findings, previousInput.findings, changed, currentMap, (item) => item.id, reused);
  for (const [section, identity] of [['workflows', (item) => item.id], ['boundaries', (item) => item.id], ['database', (item) => item.name], ['modules', (item) => item.id]]) {
    if (previousInput[section] || input?.[section]) merged[section] = { ...(previousInput[section] || {}), ...(input?.[section] || {}), items: mergeSectionItems(input?.[section]?.items, previousInput[section]?.items, changed, currentMap, identity, reused), entities: section === 'database' ? mergeSectionItems(input?.[section]?.entities, previousInput[section]?.entities, changed, currentMap, identity, reused) : undefined };
    if (section === 'database' && merged[section]) { merged[section].entities = merged[section].entities || []; delete merged[section].items; }
  }
  if (input?.overview || previousInput.overview) merged.overview = { ...(previousInput.overview || {}), ...(input?.overview || {}) };
  if (merged.overview) for (const key of ['technologies', 'entrypoints', 'commands', 'structure']) merged.overview[key] = mergeSectionItems(input?.overview?.[key], previousInput.overview?.[key], changed, currentMap, (item) => item.name || item.command || item.path, reused);
  if (input?.architecture || previousInput.architecture) merged.architecture = { ...(previousInput.architecture || {}), ...(input?.architecture || {}) };
  if (merged.architecture) {
    merged.architecture.contexts = mergeSectionItems(input?.architecture?.contexts, previousInput.architecture?.contexts, changed, currentMap, (item) => item.id, reused);
    merged.architecture.levels = mergeSectionItems(input?.architecture?.levels, previousInput.architecture?.levels, changed, currentMap, (item) => item.id, reused);
    merged.architecture.nodes = mergeSectionItems(input?.architecture?.nodes, previousInput.architecture?.nodes, changed, currentMap, (item) => item.id, reused);
    merged.architecture.edges = mergeSectionItems(input?.architecture?.edges, previousInput.architecture?.edges, changed, currentMap, (item) => `${item.from}->${item.to}`, reused);
  }
  if (!input?.runtime_verification && previousInput.runtime_verification) merged.runtime_verification = previousInput.runtime_verification;
  return { analysis: merged, reused: reused.value };
}
function evidenceRows(item) { return item.evidence.map(evidenceLabel).join(', '); }
function overviewPage(report) {
  const item = report.overview;
  if (item.status === 'not_reviewed') return `# Visão geral do repositório\n\n${prose(report.scope)}\n\nNenhuma visão geral foi revisada semanticamente. O inventário, sozinho, não explica o propósito nem confirma a stack.\n\n## Lacunas\n\n- Fornecer a seção overview com propósito, tecnologias, pontos de entrada, comandos e estrutura evidenciados.\n`;
  const rows = (values, columns) => values.map((value) => `| ${columns.map((column) => column(value)).join(' | ')} |`).join('\n');
  return `# Visão geral do repositório\n\n${prose(report.scope)}\n\n${prose(item.summary)}\n\n## O que é e para que serve\n\n${prose(item.purpose)}\n\n**Público ou consumidor identificado:** ${prose(item.audience)}\n\n## Tecnologias\n\n| Tecnologia | Versão | Papel | Evidência |\n|---|---|---|---|\n${rows(item.technologies, [x => tableCell(x.name), x => tableCell(x.version || 'não informado'), x => tableCell(x.role), evidenceRows])}\n\n## Pontos de entrada\n\n| Entrada | Papel | Evidência |\n|---|---|---|\n${rows(item.entrypoints, [x => tableCell(x.name), x => tableCell(x.role), evidenceRows])}\n\n## Comandos úteis\n\n| Comando | Finalidade | Evidência |\n|---|---|---|\n${rows(item.commands, [x => tableCell(x.command), x => tableCell(x.purpose), evidenceRows])}\n\n## Estrutura relevante\n\n| Caminho | Papel | Evidência |\n|---|---|---|\n${rows(item.structure, [x => tableCell(x.path), x => tableCell(x.role), evidenceRows])}\n\n## Limites\n\n${item.gaps.length ? item.gaps.map((gap) => `- ${prose(gap)}`).join('\n') : '- Nenhuma lacuna adicional registrada nesta leitura.'}\n`;
}
function architecturePage(report) {
  const item = report.architecture;
  if (item.status === 'not_reviewed') return `# Arquitetura e organograma\n\n${prose(report.scope)}\n\nArquitetura ainda não revisada semanticamente.\n\n## Lacunas\n\n- Fornecer a seção architecture com nós, relações e evidências exatas do código.\n`;
  const fence = String.fromCharCode(96).repeat(3);
  const diagram = ['flowchart LR', ...item.nodes.map((node) => `  ${mermaidId(node.id)}[${mermaidLabel(node.label)}]`), ...item.edges.map((edge) => `  ${mermaidId(edge.from)} -->|${mermaidLabel(edge.relationship)}| ${mermaidId(edge.to)}`)].join('\n');
  const nodeRows = item.nodes.map((node) => `| ${tableCell(node.label)} | ${tableCell(node.level)} | ${tableCell(node.kind)} | ${tableCell(node.responsibility)} | ${node.evidence.map(evidenceLabel).join(', ')} |`).join('\n');
  const edgeRows = item.edges.map((edge) => `| ${tableCell(edge.from)} → ${tableCell(edge.to)} | ${tableCell(edge.relationship)} | ${edge.confidence} | ${edge.evidence.map(evidenceLabel).join(', ')} |`).join('\n');
  const contextRows = (item.contexts || []).map((context) => `| ${tableCell(context.label)} | ${tableCell(context.summary)} | ${context.evidence.map(evidenceLabel).join(', ')} |`).join('\n');
  const levelRows = (Array.isArray(item.levels) ? item.levels : []).map((level) => `| ${tableCell(level.label)} | ${tableCell(level.summary)} | ${level.evidence.map(evidenceLabel).join(', ')} |`).join('\n');
  const contexts = contextRows ? `## Contextos e limites\n\n| Contexto | O que representa | Evidência |\n|---|---|---|\n${contextRows}\n\n` : '';
  const levels = levelRows ? `## Níveis arquiteturais\n\n| Nível | O que representa | Evidência |\n|---|---|---|\n${levelRows}\n\n` : '';
  return `# Arquitetura e organograma\n\n${prose(report.scope)}\n\n${prose(item.summary)}\n\nO mapa separa níveis C4 quando eles foram identificados e mantém relações inferidas explícitas. Não é organograma de pessoas nem prova de deploy.\n\n## Organograma de módulos\n\n${fence}mermaid\n${diagram}\n${fence}\n\n## Mapa de módulos\n\n| Módulo ou limite | Nível | Tipo | Responsabilidade | Evidência |\n|---|---|---|---|---|\n${nodeRows}\n\n## Relações\n\n| Origem → destino | Relação | Confiança | Evidência |\n|---|---|---|---|\n${edgeRows}\n\n## Lacunas e limites\n\n${item.gaps.length ? item.gaps.map((gap) => `- ${prose(gap)}`).join('\n') : '- Nenhuma lacuna adicional registrada nesta leitura.'}\n`;
}
function architectureContextSections(report, page) {
  const item = report.architecture;
  const contextRows = (item.contexts || []).map((context) => `| ${tableCell(context.label)} | ${tableCell(context.summary)} | ${context.evidence.map(evidenceLabel).join(', ')} |`).join('\n');
  const levelRows = (Array.isArray(item.levels) ? item.levels : []).map((level) => `| ${tableCell(level.label)} | ${tableCell(level.summary)} | ${level.evidence.map(evidenceLabel).join(', ')} |`).join('\n');
  const contexts = contextRows ? `## Contextos e limites\n\n| Contexto | O que representa | Evidência |\n|---|---|---|\n${contextRows}\n\n` : '';
  const levels = levelRows ? `## Níveis arquiteturais\n\n| Nível | O que representa | Evidência |\n|---|---|---|\n${levelRows}\n\n` : '';
  return contexts || levels ? page.replace('\n## Organograma de módulos\n', `\n${contexts}${levels}## Organograma de módulos\n`) : page;
}
function workflowsPage(report) {
  const item = report.workflows;
  if (item.status === 'not_reviewed') return `# Workflows e fluxos\n\n${prose(report.scope)}\n\nNenhum workflow foi revisado semanticamente.\n`;
  const sections = item.items.map((flow) => {
    const diagram = ['flowchart LR', `  start_${flow.id}([${mermaidLabel(flow.trigger)}])`, ...flow.steps.map((step, index) => `  step_${flow.id}_${index}[${mermaidLabel(step)}]`), `  end_${flow.id}([${mermaidLabel(flow.success)}])`, `  start_${flow.id} --> step_${flow.id}_0`, ...flow.steps.slice(0, -1).map((_, index) => `  step_${flow.id}_${index} --> step_${flow.id}_${index + 1}`), `  step_${flow.id}_${flow.steps.length - 1} --> end_${flow.id}`].join('\n');
    return `## ${flow.id} — ${prose(flow.title)}\n\n**Disparador:** ${prose(flow.trigger)}\n\n**Atores:** ${prose(flow.actors)}\n\n**Passos:**\n${flow.steps.map((step) => `- ${prose(step)}`).join('\n')}\n\n**Sucesso:** ${prose(flow.success)}\n\n**Falha, retry ou exceção:** ${prose(flow.failure)}\n\n**Confiança:** ${flow.confidence}\n\n${String.fromCharCode(96).repeat(3)}mermaid\n${diagram}\n${String.fromCharCode(96).repeat(3)}\n\n${flow.evidence.map(evidenceLabel).join(', ')}`;
  }).join('\n\n');
  return `# Workflows e fluxos\n\n${prose(report.scope)}\n\n${prose(item.summary)}\n\n${sections}\n\n## Lacunas\n\n${item.gaps.length ? item.gaps.map((gap) => `- ${prose(gap)}`).join('\n') : '- Nenhuma lacuna adicional registrada nesta leitura.'}\n`;
}
function boundariesPage(report) {
  const item = report.boundaries;
  if (item.status === 'not_reviewed') return `# Boundaries e contratos\n\n${prose(report.scope)}\n\nNenhum boundary foi revisado semanticamente.\n`;
  const rows = item.items.map((entry) => `| ${tableCell(entry.name)} | ${tableCell(entry.kind)} | ${tableCell(entry.interface)} | ${tableCell(entry.auth)} | ${tableCell(entry.input)} | ${tableCell(entry.output)} | ${tableCell(entry.errors)} | ${entry.confidence} | ${entry.evidence.map(evidenceLabel).join(', ')} |`).join('\n');
  return `# Boundaries e contratos\n\n${prose(report.scope)}\n\n${prose(item.summary)}\n\n| Boundary | Tipo | Interface | Auth | Entrada | Saída | Erros | Confiança | Evidência |\n|---|---|---|---|---|---|---|---|---|\n${rows}\n\n## Lacunas\n\n${item.gaps.length ? item.gaps.map((gap) => `- ${prose(gap)}`).join('\n') : '- Nenhuma lacuna adicional registrada nesta leitura.'}\n`;
}
function databasePage(report) {
  const item = report.database;
  if (item.status === 'not_applicable') return `# Banco de dados\n\n${prose(report.scope)}\n\n${prose(item.summary)}\n\nA ausência desta página não prova que nenhum consumidor externo tenha banco; apenas não houve schema/persistência aplicável revisado nesta execução.\n\n## Lacunas\n\n${item.gaps.map((gap) => `- ${prose(gap)}`).join('\n') || '- Nenhuma.'}\n`;
  if (item.status === 'not_reviewed') return `# Banco de dados\n\n${prose(report.scope)}\n\nPersistência detectada, mas ainda não revisada semanticamente.\n`;
  const rows = item.entities.map((entity) => `| ${tableCell(entity.name)} | ${tableCell(entity.kind)} | ${tableCell(entity.fields)} | ${tableCell(entity.relations)} | ${entity.evidence.map(evidenceLabel).join(', ')} |`).join('\n');
  return `# Banco de dados\n\n${prose(report.scope)}\n\n${prose(item.summary)}\n\n| Entidade | Tipo | Campos importantes | Relações | Evidência |\n|---|---|---|---|---|\n${rows}\n\n## Lacunas\n\n${item.gaps.map((gap) => `- ${prose(gap)}`).join('\n') || '- Nenhuma.'}\n`;
}
function modulePages(report) {
  const item = report.modules;
  if (!item || item.status === 'not_reviewed') return { 'modules/index.md': `# Módulos centrais\n\n${prose(report.scope)}\n\nNenhum deep dive de módulo foi revisado semanticamente.\n` };
  const pages = { 'modules/index.md': `# Módulos centrais\n\n${prose(report.scope)}\n\n${prose(item.summary)}\n\n${item.items.map((module) => `- [${prose(module.name)}](./${module.id}.md) — ${prose(module.purpose)}`).join('\n')}\n\n## Lacunas\n\n${item.gaps.map((gap) => `- ${prose(gap)}`).join('\n') || '- Nenhuma.'}\n` };
  for (const module of item.items) pages[`modules/${module.id}.md`] = `# ${prose(module.name)}\n\n**Caminho:** ${tableCell(module.path)}\n\n## Propósito\n\n${prose(module.purpose)}\n\n## Entradas e saídas\n\n- **Entradas:** ${prose(module.inputs)}\n- **Saídas:** ${prose(module.outputs)}\n\n## Dependências\n\n${prose(module.dependencies)}\n\n## Testes\n\n${prose(module.tests)}\n\n## Riscos\n\n${prose(module.risks)}\n\n## Evidências\n\n${module.evidence.map(evidenceLabel).join(', ')}\n`;
  return pages;
}
function verificationPage(report) {
  const item = report.runtime_verification;
  const rows = item.commands.length ? item.commands.map((command) => `| ${tableCell(command.command)} | ${tableCell(command.purpose)} | ${command.status} | ${command.exit_code ?? '—'} | ${command.duration_ms ?? '—'} | ${tableCell(command.notes || '')} |`).join('\n') : '| — | Nenhum comando executado | not_run | — | — | — |';
  return `# Verificação de execução\n\n${prose(report.scope)}\n\nEsta página separa prova de execução de leitura estática.\n\n| Comando | Finalidade | Status | Exit code | Duração (ms) | Notas |\n|---|---|---|---|---|---|\n${rows}\n\n**Status geral:** ${item.status}\n\n## Lacunas\n\n${item.gaps.length ? item.gaps.map((gap) => `- ${prose(gap)}`).join('\n') : '- Nenhuma.'}\n`;
}
async function main() {
  if (!['Full', 'Focused', 'Incremental', 'Drift'].includes(args.mode)) throw new Error(`Modo inválido: ${args.mode}`);
  if (args.mode === 'Focused' && !args.focus) throw new Error('Focused exige --focus <caminho-ou-módulo>');
  const repo = path.resolve(args.repo);
  const output = path.resolve(repo, args.output);
  if (output === repo || !output.startsWith(`${repo}${path.sep}`)) throw new Error('Saída deve ser subdiretório do repositório');
  const { sources: allSources, skipped } = await collectSources(repo);
  const sources = args.mode === 'Focused' ? allSources.filter((source) => source.path.toLowerCase().includes(String(args.focus).replaceAll('\\', '/').toLowerCase())) : allSources;
  const previousReportPath = path.join(output, 'report.json');
  const previousReport = await readJsonIfPresent(previousReportPath);
  const delta = sourceDelta(previousReport, sources);
  if (args.mode === 'Drift') {
    const drift = { schema_version: 3, generator_version: GENERATOR_VERSION, mode: 'Drift', project: path.basename(repo), sha: git(repo, 'rev-parse', 'HEAD'), branch: git(repo, 'branch', '--show-current'), generated_at: new Date().toISOString(), base_report: previousReport ? { generated_at: previousReport.generated_at, sha: previousReport.sha, working_tree_sha: previousReport.working_tree_sha } : null, source_counts: { previous: previousReport?.source_snapshot?.length || 0, current: sources.length }, delta, gaps: previousReport ? [] : ['Não havia report.json anterior para comparar.'] };
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'drift.json'), `${JSON.stringify(drift, null, 2)}\n`);
    console.log(JSON.stringify({ status: 'drift', repo, report: path.join(output, 'drift.json'), delta }, null, 2));
    return;
  }
  const sourceMap = new Map(sources.map((file) => [file.path, file]));
  let analysis = args.analysis ? JSON.parse(await fs.readFile(path.resolve(repo, args.analysis), 'utf8')) : null;
  let reusedSemanticItems = 0;
  if (args.mode === 'Incremental') {
    const reused = { value: 0 };
    const merged = mergeIncrementalAnalysis(analysis, previousReport, allSources, delta, reused);
    analysis = merged.analysis;
    reusedSemanticItems = merged.reused;
  }
  if (analysis && (analysis.schema_version !== 2 || !Array.isArray(analysis.findings) || !Array.isArray(analysis.reviewed_files))) throw new Error('Análise deve seguir schema_version 2');
  const reviewed = new Set();
  for (const ref of analysis?.reviewed_files || []) {
    if (!sourceMap.has(ref.path) || sourceMap.get(ref.path).sha256 !== ref.sha256) throw new Error(`Fonte excluída ou revisão obsoleta: ${ref.path}`);
    reviewed.add(ref.path);
  }
  const findings = [];
  const ids = new Set();
  for (const item of analysis?.findings || []) {
    if (!functionalTracks.includes(item.track) || !['observed', 'inferred'].includes(item.confidence) || !['product', 'operational', 'reference'].includes(item.kind)) throw new Error(`Classificação inválida: ${item.id}`);
    for (const field of ['id', 'title', 'domain', 'condition', 'effect', 'exceptions', 'verification']) requiredString(item[field], field, item.id);
    if (ids.has(item.id)) throw new Error(`ID duplicado ${item.id}`);
    ids.add(item.id);
    findings.push({ ...item, evidence: validateEvidence(item.evidence, sourceMap, reviewed, item.id) });
  }
  const overview = validateOverview(analysis?.overview, sourceMap, reviewed) || { status: 'not_reviewed', summary: '', purpose: '', audience: '', technologies: [], entrypoints: [], commands: [], structure: [], gaps: ['Visão geral não foi revisada semanticamente nesta execução.'] };
  const architecture = validateArchitecture(analysis?.architecture, sourceMap, reviewed) || { status: 'not_reviewed', summary: '', contexts: [], levels: [], nodes: [], edges: [], gaps: ['Arquitetura não foi revisada semanticamente nesta execução.'] };
  const workflows = validateWorkflows(analysis?.workflows, sourceMap, reviewed) || { status: 'not_reviewed', summary: '', items: [], gaps: ['Workflows não foram revisados semanticamente nesta execução.'] };
  const boundaries = validateBoundaries(analysis?.boundaries, sourceMap, reviewed) || { status: 'not_reviewed', summary: '', items: [], gaps: ['Boundaries e contratos não foram revisados semanticamente nesta execução.'] };
  const database = validateDatabase(analysis?.database, sourceMap, reviewed) || { status: 'not_reviewed', summary: '', entities: [], gaps: ['Banco de dados não foi revisado semanticamente nesta execução.'] };
  const modules = validateModules(analysis?.modules, sourceMap, reviewed) || { status: 'not_reviewed', summary: '', items: [], gaps: ['Deep dives de módulos não foram revisados semanticamente nesta execução.'] };
  const runtime = validateRuntime(args.runtime ? await readJsonIfPresent(path.resolve(repo, args.runtime)) : (analysis?.runtime_verification || analysis?.runtime));
  const languageCounts = {};
  for (const source of sources) { const ext = path.extname(source.path).toLowerCase() || path.basename(source.path).toLowerCase(); languageCounts[ext] = (languageCounts[ext] || 0) + 1; }
  const head = git(repo, 'rev-parse', 'HEAD');
  const diff = git(repo, 'diff', '--binary', 'HEAD') || '';
  const warnings = [];
  if (sources.length > reviewed.size) warnings.push(`${sources.length - reviewed.size} fontes foram inventariadas, mas não tiveram leitura semântica nesta execução.`);
  if (skipped.length) warnings.push(`${skipped.length} fontes foram excluídas pelo escopo, por serem ocultas, binárias, sensíveis, ignoradas ou fora do limite.`);
  if (runtime.status !== 'pass') warnings.push(`Verificação de runtime está em ${runtime.status}; leitura estática não substitui execução.`);
  const report = {
    schema_version: 3, generator_version: GENERATOR_VERSION, mode: args.mode, focus: args.focus,
    project: path.basename(repo), sha: head, branch: git(repo, 'branch', '--show-current'), dirty: Boolean(git(repo, 'status', '--porcelain')),
    working_tree_sha: hash(diff), generated_at: new Date().toISOString(),
    analysis_method: 'agent-reviewed-code', scope: analysis?.scope || 'Inventário de código; leitura semântica ainda não realizada.',
    exclusions: ['qualquer componente de caminho iniciado por ponto', 'gitignore', 'symlinks/junctions', 'dependências, builds, docs, logs, caches', 'arquivos acima de 512 KiB'],
    source_snapshot: sources.map(({ path: sourcePath, sha256 }) => ({ path: sourcePath, sha256 })), reviewed_files: [...reviewed], skipped,
    coverage: { source_files: sources.length, reviewed_files: reviewed.size, unreviewed_files: sources.length - reviewed.size, by_extension: languageCounts, by_domain: Object.fromEntries(functionalTracks.map((track) => [track, findings.filter((finding) => finding.track === track).length])) },
    tracks: {}, findings, overview, architecture, workflows, boundaries, database, modules, runtime_verification: runtime,
    source_state: { head, branch: git(repo, 'branch', '--show-current'), dirty: Boolean(git(repo, 'status', '--porcelain')), working_tree_sha: hash(diff) },
    cache: { enabled: false, hits: 0, misses: 0 }, warnings, external_sources: [], diagrams: { architecture: architecture.nodes.length ? 1 : 0, workflows: workflows.items.length },
    incremental: args.mode === 'Incremental' ? { base_report: previousReport?.generated_at || null, delta, reused_semantic_items: reusedSemanticItems, note: 'Itens sem evidência em arquivos alterados são preservados; itens alterados precisam ser reapresentados pelo agente.' } : null,
    pages_generated: [], verification: { markdown: 'pending', html: 'pending' },
    gaps: analysis?.gaps || ['Falta ler o código e fornecer --analysis; inventário não é extração de regras.'],
  };
  const pages = {};
  pages['overview.md'] = overviewPage(report);
  pages['architecture.md'] = architectureContextSections(report, architecturePage(report));
  pages['workflows.md'] = workflowsPage(report);
  pages['boundaries.md'] = boundariesPage(report);
  pages['database.md'] = databasePage(report);
  pages['verification.md'] = verificationPage(report);
  const fence = String.fromCharCode(96).repeat(3);
  for (const track of functionalTracks) {
    const [title, filename] = pageDefinitions[track];
    const items = findings.filter((finding) => finding.track === track);
    const sections = items.map((item) => [
      `## ${item.id} — ${prose(item.title)}`,
      `Domínio: ${prose(item.domain)}. Natureza: ${item.kind}. Evidência: ${item.confidence}.`,
      `**Quando:** ${prose(item.condition)}`, `**O que acontece:** ${prose(item.effect)}`,
      `**Exceções e limites:** ${prose(item.exceptions)}`, `**Verificação:** ${prose(item.verification)}`,
      ...item.evidence.map((ref) => `${evidenceLabel(ref)}\n\n${fence}text\n${ref.quote}\n${fence}`),
    ].join('\n\n')).join('\n\n');
    pages[filename] = `# ${title}\n\n${prose(report.scope)}\n\n${items.length ? `${items.length} comportamentos descritos a partir de código lido. Cobertura parcial; não equivale a execução em produção.` : 'Nenhum achado revisado nesta trilha. Não é prova de ausência no projeto.'}\n\n${sections}\n`;
  }
  Object.assign(pages, modulePages(report));
  report.pages_generated = ['README.md', ...Object.values(pageDefinitions).map(([, filename]) => filename), ...Object.keys(pages).filter((file) => file.startsWith('modules/'))];
  report.pages_generated = [...new Set(report.pages_generated)];
  report.tracks.overview = { status: overview.status, technologies: overview.technologies.length, entrypoints: overview.entrypoints.length };
  report.tracks.architecture = { status: architecture.status, contexts: architecture.contexts.length, levels: architecture.levels.length, nodes: architecture.nodes.length, edges: architecture.edges.length };
  report.tracks.workflows = { status: workflows.status, workflows: workflows.items.length };
  report.tracks.boundaries = { status: boundaries.status, boundaries: boundaries.items.length };
  report.tracks.database = { status: database.status, entities: database.entities.length };
  report.tracks.modules = { status: modules.status, modules: modules.items.length };
  report.tracks.verification = { status: runtime.status, commands: runtime.commands.length };
  for (const track of functionalTracks) { const items = findings.filter((finding) => finding.track === track); report.tracks[track] = { status: items.length ? 'partial' : 'not_reviewed', findings: items.length }; }
  const links = report.pages_generated.filter((file) => file !== 'README.md').map((file) => `- [${file === 'modules/index.md' ? 'Módulos centrais' : pageDefinitions[Object.keys(pageDefinitions).find((key) => pageDefinitions[key][1] === file)]?.[0] || file}](./${file})`).join('\n');
  pages['README.md'] = `# ${report.project} — documentação do código\n\n${prose(report.scope)}\n\n${links}\n\n## Cobertura\n\n${reviewed.size} arquivos lidos e revisados semanticamente de ${sources.length} fontes inventariadas. ${findings.length} achados documentados; ${architecture.nodes.length} nós de arquitetura, ${workflows.items.length} workflows, ${boundaries.items.length} boundaries e ${modules.items.length} módulos centrais. Pastas ocultas são excluídas antes da leitura.\n\n## Snapshot\n\n- HEAD: ${report.sha || 'não disponível'}\n- Working tree hash: ${report.working_tree_sha}\n- Modo: ${report.mode}${report.focus ? ` (foco: ${prose(report.focus)})` : ''}\n\n## Lacunas\n\n${report.gaps.map((gap) => `- ${prose(gap)}`).join('\n')}\n`;
  await fs.mkdir(output, { recursive: true });
  for (const [file, text] of Object.entries(pages)) { const target = path.join(output, file); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, text); }
  await fs.writeFile(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'generated', generator_version: GENERATOR_VERSION, repo, markdown_dir: output, report: path.join(output, 'report.json'), findings: findings.length, pages: report.pages_generated.length, overview: { technologies: overview.technologies.length, entrypoints: overview.entrypoints.length, status: overview.status }, architecture: { nodes: architecture.nodes.length, edges: architecture.edges.length, status: architecture.status }, structured: { workflows: workflows.items.length, boundaries: boundaries.items.length, database_entities: database.entities.length, modules: modules.items.length, runtime: runtime.status }, coverage: report.coverage, tracks: report.tracks }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
