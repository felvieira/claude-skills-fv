#!/usr/bin/env node
/**
 * init-vault.mjs — cria o vault de memória persistente se não existir.
 *
 * Roda no final do install do kit (setup/install.sh) e também sob demanda.
 * Idempotente: se o vault já existe, não sobrescreve nada — só reporta.
 *
 * Cria em ~/.claude-memory (ou $CLAUDE_MEMORY_VAULT):
 *   ├── CLAUDE.md            ← manual do vault (instruções pro futuro-Claude)
 *   ├── README.md            ← o que é o vault
 *   ├── .gitignore           ← protege secrets/, .index/, caches
 *   ├── logs/                ← logs de sessão (um por sessão)
 *   ├── architecture/        ← decisões por projeto (decisions.md)
 *   ├── secrets/             ← NUNCA versionado (gitignored)
 *   └── (git init)           ← repo local pra ter undo
 *
 * Uso: node init-vault.mjs            → cria em ~/.claude-memory
 *      node init-vault.mjs --path X   → cria em X
 *      node init-vault.mjs --dry-run  → mostra o que faria
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, execFileSync } from "node:child_process";
import { defaultVaultPath } from "./vault-resolver.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const arg = (f) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : null; };
const DRY = process.argv.includes("--dry-run");
const VAULT = arg("--path") || process.env.CLAUDE_MEMORY_VAULT || defaultVaultPath();

const DIRS = ["logs", "architecture", "templates", "secrets", "inbox"];

const GITIGNORE = `# Vault de memória — nunca versionar
secrets/
.index/
.cache/
*.db
*.db-shm
*.db-wal
.curator-pending.md
__pycache__/
*.pyc
.bak.*
`;

const CLAUDE_MD = `# Claude Memory Vault — Instruções

> Este é o vault de memória persistente, criado pelo dev-team-kit. Vale para TODOS os projetos.
> Os hooks do kit leem este vault no SessionStart e injetam o contexto da sessão anterior.

## Regra de 3 Camadas (consultar nesta ordem)

1. **Primeiro:** \`graphify-out/graph.json\` na raiz do repo de trabalho (se existir) — estrutura.
2. **Segundo:** este vault — \`logs/\` e \`architecture/\` para contexto de sessões anteriores.
3. **Terceiro:** só leia arquivos brutos do repo ao editar ou quando as camadas acima não resolverem.

## Como escrever aqui (policies/memory-write-rules.md do kit)

- **Preâmbulo "For future Claude"**: todo log começa com 2-3 linhas que o futuro-Claude lê em 10s.
- **Frontmatter rico**: \`date\`, \`type\`, \`project\`, \`tags\`, \`ai-first: true\`.
- **Anti-fabricação**: busque exaustivamente antes de afirmar que algo não existe (false absence). \`TBD\` para o desconhecido. Seção vazia é correta — não invente.
- **Recency markers**: \`(as of YYYY-MM, fonte)\` em todo claim externo.

## Estrutura

- \`logs/YYYY-MM-DD-<projeto>-<descrição>.md\` — uma sessão por arquivo.
- \`architecture/<projeto>/decisions.md\` — decisões arquiteturais por projeto.
- \`secrets/\` — **nunca versionado** (gitignored). Você gerencia.

## Comandos do kit que operam este vault

- \`/consolidate-memory\` — dedup, archive, prune (manutenção).
- \`/reconcile-memory\` — resolve contradições (decisão revertida não atualizada).
- O \`memory-curator\` roda async no SessionStart e cura sozinho (decay/archive/dedup).

## Versionamento

Vault é repo git local (tem undo). Para versionar remoto, adicione um remote privado:
\`git -C <vault> remote add origin <url-privada>\`. **Nunca** num remote público — \`secrets/\` e logs podem ter contexto sensível.
`;

const README = `# Claude Memory Vault

Memória persistente cross-projeto do dev-team-kit. Criado por \`scripts/init-vault.mjs\`.
Veja \`CLAUDE.md\` para as instruções de uso. Os hooks do kit leem/escrevem aqui automaticamente.
`;

function write(path, content) {
  if (existsSync(path)) return "exists";
  if (DRY) return "would-create";
  writeFileSync(path, content);
  return "created";
}

function main() {
  console.log(`${DRY ? "[DRY-RUN] " : ""}Vault: ${VAULT}`);

  const vaultExisted = existsSync(VAULT);
  if (!DRY) mkdirSync(VAULT, { recursive: true });

  for (const d of DIRS) {
    const p = join(VAULT, d);
    if (existsSync(p)) { console.log(`  · ${d}/ (existe)`); continue; }
    if (!DRY) mkdirSync(p, { recursive: true });
    console.log(`  ${DRY ? "+" : "✓"} ${d}/`);
  }

  for (const [name, content] of [
    [".gitignore", GITIGNORE],
    ["CLAUDE.md", CLAUDE_MD],
    ["README.md", README],
  ]) {
    const r = write(join(VAULT, name), content);
    console.log(`  ${r === "created" ? "✓" : r === "would-create" ? "+" : "·"} ${name} (${r})`);
  }

  // git init (só se ainda não é repo)
  if (!existsSync(join(VAULT, ".git"))) {
    if (DRY) {
      console.log("  + git init");
    } else {
      try {
        execSync("git init -q", { cwd: VAULT, stdio: "pipe" });
        execSync("git add -A && git commit -q -m \"init vault (dev-team-kit)\"", { cwd: VAULT, stdio: "pipe" });
        console.log("  ✓ git init + commit inicial");
      } catch (e) {
        console.log("  ⚠ git init falhou (vault criado, sem versionamento):", e.message.slice(0, 80));
      }
    }
  } else {
    console.log("  · git (já é repo)");
  }

  console.log(vaultExisted
    ? `\n✅ Vault já existia — nada sobrescrito. Pronto para uso.`
    : `\n✅ Vault criado em ${VAULT}. Os hooks do kit já vão usá-lo no próximo SessionStart.`);

  if (process.env.CLAUDE_MEMORY_VAULT) {
    console.log(`   (usando CLAUDE_MEMORY_VAULT=${process.env.CLAUDE_MEMORY_VAULT})`);
  } else {
    console.log(`   Dica: para usar outro path, defina CLAUDE_MEMORY_VAULT=<path> no seu ambiente.`);
  }

  // --- ai-memory backend (opt-out via DEVKIT_MEMORY_BACKEND=native) ---
  // Best-effort, non-fatal: se Docker não estiver disponível ou o setup
  // falhar por qualquer razão, o vault nativo criado acima já é funcional
  // como fallback. Ver scripts/ai-memory-setup.mjs e policies/memory-backends.md.
  if (!DRY) {
    console.log("");
    try {
      execFileSync(process.execPath, [join(__dirname, "ai-memory-setup.mjs")], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
    } catch {
      console.log("[ai-memory] setup opcional falhou — vault nativo continua ativo normalmente.");
    }
  }
}

main();
