#!/usr/bin/env node
/**
 * investigate-first-guard.mjs (PreToolUse)
 *
 * Intercepta AskUserQuestion. Se a pergunta que a IA esta prestes a fazer ao
 * usuario for AUTO-DESCOBRIVEL (resposta disponivel via terminal/fs/config/rede),
 * injeta additionalContext instruindo a investigar primeiro com o comando correto.
 *
 * NUNCA bloqueia (sem continue:false). Educa e deixa a IA refazer a decisao.
 * Conservador: precisao > cobertura. So dispara em padroes claros.
 *
 * Ver policies/investigate-first.md.
 */
import { appendFileSync, mkdirSync } from "fs";
import { resolveBotPath, isHookDisabled, readHookConfig } from "./utils.mjs";

// Cada regra: pattern (regex testado contra o texto concatenado das perguntas),
// hint (o que rodar), label (curto, pro log).
const DISCOVERABLE_RULES = [
  {
    label: "github-user",
    pattern: /\b(?:seu|qual|what|which|your)\b[^?]*\b(?:user(?:name)?|usuario|login|conta|handle|account)\b[^?]*\b(?:github|gh)\b|\bgithub\b[^?]*\b(?:user(?:name)?|usuario|login|conta|handle)\b/i,
    hint: "`gh api user --jq .login` (ou `gh auth status`, ou `git config user.name`)",
  },
  {
    label: "gh-installed-or-logged",
    pattern: /\b(?:voce |vc |tu )?(?:tem|possui|esta com|usa|have|got|is)\b[^?]*\b(?:gh|github cli)\b[^?]*\b(?:instalad|logad|configurad|autenticad|installed|logged|authenticat|set up)|\b(?:gh|github cli)\b[^?]*\b(?:instalad|logad|autenticad|installed|logged in|authenticated)/i,
    hint: "`gh auth status` (exit 0 = logado e instalado)",
  },
  {
    label: "git-email",
    pattern: /\b(?:seu|qual|what|which|your)\b[^?]*\b(?:e-?mail)\b[^?]*\b(?:git|commit|github)\b|\b(?:git|commit)\b[^?]*\be-?mail\b/i,
    hint: "`git config user.email`",
  },
  {
    label: "repo-name-or-remote",
    pattern: /\b(?:qual|what|which|nome do|name of (?:the )?)\b[^?]*\b(?:repo(?:sitorio|sitory)?|remote)\b/i,
    hint: "`git remote -v` ou `gh repo view --json nameWithOwner -q .nameWithOwner`",
  },
  {
    label: "current-branch",
    pattern: /\b(?:qual|what|which|em que|on what)\b[^?]*\bbranch\b[^?]*\b(?:voce|vc|esta|estou|atual|current|are you|am i|i'?m)\b|\b(?:branch atual|current branch)\b/i,
    hint: "`git branch --show-current`",
  },
  {
    label: "package-manager",
    pattern: /\b(?:qual|what|which)\b[^?]*\b(?:package manager|gerenciador de pacote|pacote manager|npm ou yarn|yarn ou pnpm|pnpm ou npm|usa npm|usa yarn|usa pnpm)\b/i,
    hint: "detectar lockfile: Glob `pnpm-lock.yaml`/`yarn.lock`/`package-lock.json`/`bun.lockb`",
  },
  {
    label: "runtime-version",
    pattern: /\b(?:qual|what|which)\b[^?]*\b(?:versao|version)\b[^?]*\b(?:node|node\.?js|python|go|rust|java|ruby|php|deno|bun)\b|\b(?:node|python|go|rust)\b[^?]*\b(?:versao|version)\b[^?]*\b(?:voce|usa|projeto|are you using)\b/i,
    hint: "`node -v` / `python --version` / `go version`, ou ler `.nvmrc` / `.python-version` / `go.mod`",
  },
  {
    label: "stack-or-framework",
    pattern: /\b(?:qual|what|which)\b[^?]*\b(?:stack|framework|biblioteca principal|main (?:framework|library)|linguagem|language)\b[^?]*\b(?:projeto|repo|do projeto|esse|this|of (?:the )?(?:project|repo))\b/i,
    hint: "ler `package.json`/`pyproject.toml`/`go.mod`/`Cargo.toml` ou `docs/repo-audit/current.md` (ou `.bot/docs/repo-audit/current.md`)",
  },
  {
    label: "test-runner",
    pattern: /\b(?:tem|ha|existe|qual|what|which|are there|is there)\b[^?]*\b(?:testes?|tests?|test runner|test framework|suite de teste)\b[^?]*(?:\?|$)|\bqual\b[^?]*\b(?:runner|jest|vitest|pytest|mocha)\b/i,
    hint: "Grep `package.json` scripts por `vitest`/`jest`/`mocha`, ou procurar `pytest.ini`/`go test`",
  },
  {
    label: "build-dev-script",
    pattern: /\b(?:qual|what|which|como (?:rodo|inicio|subo|builda)|how (?:do i|to))\b[^?]*\b(?:script de|comando de|command to|script to)?\s*(?:build|dev|start|run|test|lint)\b[^?]*\b(?:projeto|repo|app|this|of)\b|\bcomo (?:rodo|subo|inicio) (?:o|a|esse|essa)\b/i,
    hint: "ler `package.json` scripts, `Makefile`, `justfile`, ou `docs/repo-audit/current.md`",
  },
  {
    label: "server-port-running",
    pattern: /\b(?:qual|what|which|em que|on what)\b[^?]*\b(?:porta|port)\b[^?]*\b(?:servidor|server|app|roda|running|listening)\b|\b(?:servidor|server|app)\b[^?]*\b(?:esta rodando|ta rodando|is running|esta no ar)\b/i,
    hint: "`curl -s localhost:PORT`, `lsof -i -P -n | grep LISTEN`, ou ler config de porta no projeto",
  },
  {
    label: "binary-exists",
    pattern: /\b(?:voce |vc |tu )?(?:tem|possui|esta com|have|got)\b[^?]*\b(?:instalad|installed)[^?]*\b(?:docker|kubectl|terraform|aws|gcloud|psql|redis|make|cargo|go|python|node|deno|bun|pnpm|yarn)\b|\b(?:docker|kubectl|terraform|psql|make)\b[^?]*\b(?:instalad|disponivel|installed|available)/i,
    hint: "`command -v <bin>` (exit code 0 = existe) ou `<bin> --version`",
  },
  {
    label: "mcp-account-whoami",
    pattern: /\b(?:qual|what|which|seu|your)\b[^?]*\b(?:conta|usuario|account|user|workspace|org(?:anizacao|anization)?)\b[^?]*\b(?:conectad|logad|connected|do mcp|no mcp|figma|notion|supabase|linear|slack)/i,
    hint: "a maioria dos MCP tem tool `whoami`/`get_me`/`accounts_get` — chame-a antes de perguntar",
  },
  {
    label: "env-vars",
    pattern: /\b(?:quais|que|what|which)\b[^?]*\b(?:variaveis|vars?|environment|ambiente)\b[^?]*\b(?:existem|definidas|configuradas|estao|set|defined|available)\b|\b\.env\b[^?]*\b(?:tem|existe|contem)\b/i,
    hint: "ler `.env.example` / `.env`, ou `printenv` (cuidado: nao ecoar secrets)",
  },
  {
    label: "installed-version",
    pattern: /\b(?:qual|what|which)\b[^?]*\b(?:versao|version)\b[^?]*\b(?:instalad|installed|do plugin|da lib|da dependencia|of the (?:plugin|lib|package|dependency))\b/i,
    hint: "ler `package.json`/`requirements.txt`/lockfile, ou `<tool> --version`",
  },
];

function extractQuestionText(toolInput) {
  // AskUserQuestion: { questions: [{ question, header, options:[{label,description}] }] }
  const parts = [];
  const qs = toolInput?.questions;
  if (Array.isArray(qs)) {
    for (const q of qs) {
      if (q?.question) parts.push(String(q.question));
      if (q?.header) parts.push(String(q.header));
      if (Array.isArray(q?.options)) {
        for (const o of q.options) {
          if (o?.label) parts.push(String(o.label));
        }
      }
    }
  }
  return parts.join(" — ");
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (c) => { inputBuffer += c; });
process.stdin.on("end", () => {
  let input = {};
  try { input = JSON.parse(inputBuffer); } catch {}

  if (isHookDisabled("investigate-first-guard")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const cfg = readHookConfig("investigate_first", { enabled: true });
  if (cfg.enabled === false) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const toolName = input.tool_name || "";
  if (toolName !== "AskUserQuestion") {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const text = extractQuestionText(input.tool_input || {});
  if (!text) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const matches = DISCOVERABLE_RULES.filter((r) => r.pattern.test(text));
  if (matches.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const bullets = matches
    .map((m) => `  - ${m.label}: investigue com ${m.hint}`)
    .join("\n");

  const guidance = [
    `[investigate-first-guard] ⚠ Voce esta prestes a perguntar algo AUTO-DESCOBRIVEL.`,
    ``,
    `A(s) pergunta(s) detectada(s) tem resposta disponivel no ambiente (terminal/fs/config/rede).`,
    `Investigar e barato; interromper o usuario e caro. NAO pergunte isto:`,
    ``,
    bullets,
    ``,
    `Faca agora:`,
    `  1. Rode o(s) comando(s) acima (Bash / Read / Glob / a tool MCP whoami).`,
    `  2. Use o resultado direto. Nao anuncie "vou verificar" — apenas faca.`,
    `  3. So pergunte ao usuario SE o comando falhar/for inconclusivo — e mencione o que ja tentou.`,
    `  4. Se parte da pergunta for genuinamente do usuario (preferencia, intencao, trade-off),`,
    `     mantenha SO essa parte e remova o que e descobrivel.`,
    ``,
    `Reescreva: cancele este AskUserQuestion, investigue, e so volte a perguntar o que sobrar (se sobrar).`,
    ``,
    `Ver policies/investigate-first.md. (Toggle: hooks/config.json -> investigate_first.enabled=false)`,
  ].join("\n");

  // Best-effort telemetry pro /savings (riscos prevenidos / interrupcoes evitadas).
  try {
    mkdirSync(resolveBotPath(), { recursive: true });
    appendFileSync(
      resolveBotPath("investigate-first-guard.jsonl"),
      JSON.stringify({ ts: new Date().toISOString(), hook: "investigate-first-guard", matched: matches.map((m) => m.label) }) + "\n",
      "utf-8"
    );
  } catch {}

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: guidance,
    },
  }));
});
