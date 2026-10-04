#!/usr/bin/env node
/**
 * install-memory-hooks — registra SO os hooks de memoria do kit em agentes que
 * nao carregam o plugin do Claude Code.
 *
 * Por que: o Grok Build tem `[compat.claude] hooks = false` (nao le os hooks do
 * plugin) e so carrega `~/.grok/hooks/*.json`. Registrar o conjunto completo do
 * kit la despejaria gates de prompt/ferramenta escritos no vocabulario do
 * Claude. O perfil "memory" do dispatcher roda so a injecao de learned-skills
 * (sem gatilhos de skill) e a captura pre-compactacao. No Grok o perfil e
 * "memory-deferred": o host descarta o contexto do UserPromptSubmit, entao ele e
 * guardado ali e entregue no primeiro PostToolUse.
 *
 * Uso:
 *   node scripts/install-memory-hooks.mjs --runtime grok              # dry-run: mostra o arquivo
 *   node scripts/install-memory-hooks.mjs --runtime grok --apply      # grava ~/.grok/hooks/dev-team-kit-memory.json
 *   node scripts/install-memory-hooks.mjs --runtime grok --uninstall  # remove so o arquivo do kit
 *   node scripts/install-memory-hooks.mjs --runtime codex             # imprime o bloco para ~/.codex/hooks.json (nao edita)
 *   --guards           tambem registra PreToolUse com o perfil "guards" (/careful e /freeze) — opcional
 *   --kit-root <dir>   raiz do kit (padrao: o repo deste script); precisa ser um caminho estavel
 *   --home <dir>       HOME alternativo (testes)
 *
 * Nunca toca nos arquivos de outras ferramentas (ex.: ai-memory.json): escreve um
 * arquivo proprio e so remove esse.
 */
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// O Grok descarta o additionalContext do UserPromptSubmit (doc: "an allowing hook's stdout /
// additionalContext is discarded"), mas aceita em PostToolUse. Por isso o perfil dele e
// `memory-deferred` (guarda no prompt, entrega no primeiro PostToolUse) e registra PostToolUse.
const PROFILES = {
  grok: { profile: "memory-deferred", events: ["UserPromptSubmit", "PostToolUse", "PreCompact"] },
  codex: { profile: "memory", events: ["UserPromptSubmit", "PreCompact"] },
};
const FILE_NAME = "dev-team-kit-memory.json";

const fwd = (p) => String(p).replace(/\\/g, "/"); // CLAUDE.md global: barra normal em JSON de hook

export function buildHooksConfig(kitRoot, runtime = "codex", { guards = false } = {}) {
  const dispatcher = `${fwd(kitRoot)}/hooks/scripts/runtime-dispatcher.mjs`;
  const { profile, events } = PROFILES[runtime];
  const hooks = {};
  for (const event of events) {
    hooks[event] = [{
      matcher: "",
      hooks: [{ type: "command", command: `node "${dispatcher}" ${event} ${profile}`, timeout: 30 }],
    }];
  }
  // Opcional: /careful e /freeze (perfil "guards"). Inertes ate alguem liga-los; custam 1 processo por chamada.
  if (guards) {
    hooks.PreToolUse = [{
      matcher: "",
      hooks: [{ type: "command", command: `node "${dispatcher}" PreToolUse guards`, timeout: 30 }],
    }];
  }
  return { hooks };
}

export function grokTarget(home = homedir()) {
  return join(home, ".grok", "hooks", FILE_NAME);
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback = "") => { const i = args.indexOf(name); return i !== -1 && args[i + 1] ? args[i + 1] : fallback; };
  const runtime = opt("--runtime");
  const kitRoot = resolve(opt("--kit-root", resolve(dirname(fileURLToPath(import.meta.url)), "..")));
  const home = opt("--home", homedir());
  const apply = args.includes("--apply");
  const uninstall = args.includes("--uninstall");

  if (!["grok", "codex"].includes(runtime)) {
    console.error("Uso: --runtime grok|codex [--apply|--uninstall] [--kit-root <dir>]");
    process.exit(2);
  }
  if (!uninstall && !existsSync(join(kitRoot, "hooks", "scripts", "runtime-dispatcher.mjs"))) {
    console.error(`runtime-dispatcher.mjs nao encontrado em ${kitRoot}/hooks/scripts (use --kit-root).`);
    process.exit(1);
  }

  if (runtime === "codex") {
    console.log("Bloco para mesclar em ~/.codex/hooks.json (nao editado automaticamente: o arquivo global tem hooks de outras ferramentas):\n");
    const cfg = buildHooksConfig(kitRoot, "codex", { guards: args.includes("--guards") });
    for (const blocks of Object.values(cfg.hooks)) for (const b of blocks) delete b.matcher;
    console.log(JSON.stringify(cfg, null, 2));
    return;
  }

  const target = grokTarget(home);
  if (uninstall) {
    if (existsSync(target)) { rmSync(target); console.log(`Removido: ${target}`); } else console.log(`Nada a remover: ${target}`);
    return;
  }

  const cfg = buildHooksConfig(kitRoot, "grok", { guards: args.includes("--guards") });
  if (!apply) {
    console.log(`Dry-run. Gravaria ${target}:\n`);
    console.log(JSON.stringify(cfg, null, 2));
    console.log("\nNada foi gravado. Use --apply.");
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");
  const events = Object.keys(cfg.hooks).join(", ");
  console.log(`Gravado: ${target}\nEventos: ${events} (perfil "${PROFILES.grok.profile}": sem gates de prompt/ferramenta${cfg.hooks.PreToolUse ? "; PreToolUse so com as guardas /careful e /freeze" : ""}).`);
  console.log("Reinicie o Grok Build para carregar. Para desfazer: --uninstall.");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
