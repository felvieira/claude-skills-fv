#!/usr/bin/env node
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { isHookDisabled, readHookConfig, resolveBotPath, isAiMemoryActive } from './utils.mjs';

const BOOTSTRAP_DEFAULTS = {
  inject_meta_skill: true,
  meta_skill_path: 'docs/skill-guides/skill-discovery.md',
};
const MAX_META_SKILL_CHARS = 2000;
const PROXY_CHARS_PER_TOKEN = 4;

function firstExisting(candidates) {
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function runtimePath(relativePath) {
  return firstExisting([resolveBotPath(relativePath), relativePath]);
}

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  if (isHookDisabled('session-start')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const parts = [];
  const addPart = (text, priority) => parts.push({ text: String(text), priority, order: parts.length });
  const focusPath = runtimePath('docs/context/current-focus.md');
  const rulesPath = runtimePath('GLOBAL.md');

  // --- Current focus ---
  if (focusPath) {
    try {
      const focus = readFileSync(focusPath, 'utf-8');
      const firstLine = focus.split('\n').find(l => l.trim() && !l.startsWith('#')) || '';
      if (firstLine) addPart(`Last focus: "${firstLine.trim()}"`, 100);
    } catch {}
  }

  // --- Pattern conformity (skill 47) — inject memory/patterns.md if present ---
  // Padrão inspirado em addozhang/mem9 user-prompt-submit hook (Apache-2.0):
  // injetar contexto de memória automaticamente sem exigir invocação manual da skill.
  const patternsCandidates = ['memory/patterns.md', '.bot/memory/patterns.md'];
  for (const pPath of patternsCandidates) {
    if (existsSync(pPath)) {
      try {
        const pContent = readFileSync(pPath, 'utf-8');
        const pHeader = pContent.split('\n').find(l => l.startsWith('last_extracted:')) || '';
        // Só injetar se gerado nos últimos 14 dias (TTL da skill 47)
        if (pHeader) {
          const dateMatch = pHeader.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            const age = (Date.now() - new Date(dateMatch[1]).getTime()) / (1000 * 60 * 60 * 24);
            if (age <= 14) {
              const MAX_PATTERNS_CHARS = 4000;
              const snippet = pContent.length > MAX_PATTERNS_CHARS
                ? pContent.slice(0, MAX_PATTERNS_CHARS) + '\n[...truncated — ver memory/patterns.md completo]'
                : pContent;
              addPart(`[Code Style Map — skill 47]\n${snippet}`, 30);
            }
          }
        }
      } catch {}
      break;
    }
  }

  // --- Meta-skill bootstrap ---
  const config = readHookConfig('session_bootstrap', BOOTSTRAP_DEFAULTS);
  if (config.inject_meta_skill && config.meta_skill_path) {
    const candidates = [
      resolveBotPath(config.meta_skill_path),
      config.meta_skill_path,
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        try {
          if (config.meta_skill_path === BOOTSTRAP_DEFAULTS.meta_skill_path) {
            // The full routing guide is available on demand; a clipped table at
            // every session start costs context and can hide relevant routes.
            addPart(
              `[Skill Discovery] Unsure which kit skill, command or agent fits? Read ${candidate} ` +
              `(decision tree). Invoke numbered skills with Skill(), subagents with Agent(); ` +
              `do not dispatch a numbered skill as an agent.`,
              90,
            );
          } else {
            // Explicit custom bootstrap content retains the existing injection contract.
            let content = readFileSync(candidate, 'utf-8');
            if (content.length > MAX_META_SKILL_CHARS) {
              content = content.slice(0, MAX_META_SKILL_CHARS) + '\n[...truncated]';
            }
            addPart(`[Skill Discovery]\n${content}`, 90);
          }
        } catch {}
        break;
      }
    }
  }

  // --- Write .auto/session.json for context_guard + smart_suggestions ---
  try {
    mkdirSync('.auto', { recursive: true });
    writeFileSync('.auto/session.json', JSON.stringify({
      session_start: new Date().toISOString(),
      estimated_tokens: 0,
      tool_calls: 0,
    }, null, 2), 'utf-8');
  } catch {
    // silent — never block session start
  }

  // --- Async hook integrity check (silent, non-blocking) ---
  // Uses spawn + detached/unref so it cannot delay session start.
  try {
    const verifierCandidates = [
      resolveBotPath('hooks/scripts/verify-integrity.mjs'),
      'hooks/scripts/verify-integrity.mjs',
    ];
    const verifier = verifierCandidates.find(p => existsSync(p));
    if (verifier) {
      const child = spawn(process.execPath, [verifier, '--silent'], {
        stdio: 'ignore',
        detached: true,
      });
      child.unref();
      child.on('error', () => { /* silent */ });
    }
  } catch {
    // silent — integrity check is advisory, never blocks
  }

  // --- Autonomous memory curator (v2.24.0) ---
  // Dispara o curador de memoria em BACKGROUND (detached/unref) — nunca bloqueia
  // o inicio da sessao. Ele decide sozinho se o vault esta "sujo" e, se estiver,
  // aplica a parte mecanica (decay/archive/dedup) e registra trabalho semantico
  // em .curator-pending.md. ZERO custo de LLM — a parte semantica e injetada
  // abaixo pro agente JA PAGO da sessao corrente.
  // Desligado quando ai-memory (backend Docker) esta ativo: os dois sistemas
  // curando/escrevendo a mesma historia em paralelo e o bug que motivou este guard.
  const aiMemoryActive = isAiMemoryActive();
  try {
    const ccCfg = readHookConfig('memory_curator', { enabled: true });
    if (ccCfg.enabled && !isHookDisabled('memory-curator') && !aiMemoryActive) {
      const curatorCandidates = [
        resolveBotPath('hooks/scripts/memory-curator.mjs'),
        'hooks/scripts/memory-curator.mjs',
      ];
      const curator = curatorCandidates.find(p => existsSync(p));
      if (curator) {
        const child = spawn(process.execPath, [curator, '--silent'], {
          stdio: 'ignore',
          detached: true,
        });
        child.unref();
        child.on('error', () => { /* silent */ });
      }
    }
  } catch {
    // silent — curator is autonomous + non-blocking, never breaks session start
  }

  // --- Inject pending semantic curation work (v2.24.0) ---
  // Se o curador (de uma sessao ANTERIOR) deixou trabalho semantico pendente,
  // injeta como instrucao pro agente da sessao atual resolver. Sem forkar LLM:
  // usa o agente que ja esta presente. Procura o pending no vault resolvido.
  // N/A quando ai-memory esta ativo — o curador nativo nunca roda, entao nunca
  // gera pending.
  try {
    if (!aiMemoryActive) {
      const vaultCandidates = [
        readHookConfig('memory_curator', {}).vault_path,
        'D:/claude-memory',
        join(homedir(), 'claude-memory'),
        resolveBotPath('docs/memory'),
      ].filter(Boolean);
      for (const v of vaultCandidates) {
        const pending = join(v, '.curator-pending.md');
        if (existsSync(pending)) {
          try {
            const body = readFileSync(pending, 'utf-8');
            addPart(
              `[memory-curator] O curador autonomo aplicou a manutencao mecanica da memoria ` +
              `(decay, archive, dedup) e deixou trabalho SEMANTICO que precisa do seu julgamento ` +
              `em ${pending}. Quando houver folga nesta sessao, resolva os candidatos a merge ` +
              `listados la e delete o arquivo. Conteudo:\n\n${body.slice(0, 1500)}`,
              40,
            );
          } catch { /* skip unreadable */ }
          break; // so o primeiro vault encontrado
        }
      }
    }
  } catch { /* never block */ }

  // --- Context-cost awareness (v2.21.0) ---
  // Inspirado nas dicas 5 (CLAUDE.md enxuto) e 2 (cuidado com MCPs) de
  // "Nunca mais fique sem creditos no Claude". So reporta o que da pra medir com
  // certeza — nada de numeros enganosos. Opt-out: hook config context_cost.enabled=false.
  try {
    const ccCfg = readHookConfig('context_cost', {
      enabled: true,
      claude_md_warn_lines: 200,   // recomendacao oficial da Anthropic
      mcp_warn_count: 5,
    });
    if (ccCfg.enabled) {
      // dica 5 — CLAUDE.md gordo onera toda sessao. Checa projeto + .bot.
      const claudeMdCandidates = ['CLAUDE.md', resolveBotPath('CLAUDE.md'), 'AGENTS.md'];
      for (const md of claudeMdCandidates) {
        if (existsSync(md)) {
          try {
            const lines = readFileSync(md, 'utf-8').split('\n').length;
            if (lines > ccCfg.claude_md_warn_lines) {
              addPart(
                `[context-cost] ${md} tem ${lines} linhas (recomendado < ${ccCfg.claude_md_warn_lines}). ` +
                `Cada sessao carrega esse arquivo inteiro — considere modulariza-lo como indice ` +
                `(ex: "regras de design em docs/design.md") pra reduzir custo por sessao. Ver policies/token-efficiency.md.`,
                20,
              );
            }
          } catch { /* skip unreadable */ }
          break; // so reporta o primeiro encontrado (evita ruido)
        }
      }

      // dica 2 — MCPs vao junto em todo prompt. So conta o que da pra ver com
      // CERTEZA no settings do projeto. Diz "pelo menos N" porque MCPs tambem
      // vem de ~/.claude.json, plugins e enterprise — nao da pra somar tudo aqui.
      const mcpCandidates = ['.mcp.json', '.claude/settings.json', '.claude/settings.local.json'];
      let projectMcpCount = 0;
      for (const sp of mcpCandidates) {
        if (existsSync(sp)) {
          try {
            const j = JSON.parse(readFileSync(sp, 'utf-8'));
            const servers = j.mcpServers || j.mcp?.servers || {};
            projectMcpCount += Object.keys(servers).length;
          } catch { /* skip malformed */ }
        }
      }
      if (projectMcpCount >= ccCfg.mcp_warn_count) {
        addPart(
          `[context-cost] Pelo menos ${projectMcpCount} MCP server(s) configurado(s) neste projeto ` +
          `(o total real pode ser maior — ha MCPs globais e de plugins). Cada MCP ativo entra no ` +
          `contexto de TODO prompt, mesmo sem uso. Onde possivel, prefira skills (lazy-load) a MCPs. Ver policies/token-efficiency.md.`,
          20,
        );
      }
    }
  } catch { /* never block session start */ }

  // --- Token budget guard ---
  // Estimate the complete emitted systemMessage (wrapper + parts). The ratio
  // is a proxy; only host telemetry can measure provider tokens.
  const configuredBudget = Number.parseInt(process.env.DEVKIT_SESSION_INJECT_TOKENS || '2000', 10);
  const budgetTokens = Number.isFinite(configuredBudget) ? Math.max(0, configuredBudget) : 2000;
  const budgetChars = budgetTokens * PROXY_CHARS_PER_TOKEN;
  const renderMessage = (selectedParts) => {
    const body = selectedParts.length ? ` ${selectedParts.join('\n\n')}` : '';
    const focusInstruction = focusPath ? ` Read ${focusPath} for session state.` : '';
    const rulesInstruction = rulesPath ? ` Kit rules: ${rulesPath}.` : '';
    return `[DevTeamKit] Session started.${body}${focusInstruction}${rulesInstruction}`;
  };

  const selected = [];
  const candidates = parts.slice().sort((a, b) => b.priority - a.priority || a.order - b.order);
  for (const part of candidates) {
    const ordered = [...selected, part].sort((a, b) => a.order - b.order);
    if (renderMessage(ordered.map((item) => item.text)).length <= budgetChars) {
      selected.push(part);
      continue;
    }
    const currentLength = renderMessage(selected.sort((a, b) => a.order - b.order).map((item) => item.text)).length;
    const separatorLength = selected.length ? 2 : 1;
    const available = budgetChars - currentLength - separatorLength;
    if (available > 16) {
      selected.push({ ...part, text: `${part.text.slice(0, available - 1).trimEnd()}…` });
    }
  }

  const additionalContext = renderMessage(
    selected.sort((a, b) => a.order - b.order).map((item) => item.text),
  );

  // SessionStart hooks: hookSpecificOutput NOT in the canonical event list.
  // Use systemMessage at top-level instead.
  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: additionalContext,
  }));
});
