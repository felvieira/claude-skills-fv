# Token Optimization — Padrões e Integrações Externas

Como reduzir o consumo de tokens em sessões longas de coding agents.
Cobre tanto as tools nativas do Dev Team Kit quanto integração com compressores externos (squeez, rtk).

---

## Ferramentas Nativas do Dev Team Kit

### `devkit_compress_output`
Compressor Node.js zero-deps embutido no MCP server.

```
devkit_compress_output(
  text: "<output longo de bash>",
  hint: "npm install",   // "generic" | "git log" | "npm install" | "test"
  max_lines: 40,
  strategy: "head_tail"  // "head" | "tail" | "head_tail"
)
```

Pipeline de 4 estágios:
1. Strip ANSI codes (`\x1b[...m`)
2. Dedup linhas adjacentes idênticas → `[×N]`
3. Colapso de listagens de diretório (≥5 linhas no mesmo dir → `dir/  N files`)
4. Truncação por estratégia com marcador `[... X lines dropped ...]`

**Quando usar:** antes de passar output grande de `Bash` para o modelo.
**Redução típica:** 60-85% em `npm install`, 50-70% em `git log`.

---

### `devkit_session_events` / `devkit_seen_files` / `devkit_seen_errors`
Consultam `.auto/events.jsonl` gravado pelo hook `session-event-logger.mjs`.

```
devkit_seen_files()          // "que arquivos li/editei nesta sessão?"
devkit_seen_errors()         // "que erros se repetiram?"
devkit_session_events(       // query filtrada
  tool: "Bash",
  status: "error",
  since: "2026-04-17T10:00:00Z"
)
```

**Quando usar:** para evitar re-explorar arquivos já lidos ou diagnosticar padrões de erro.

---

### `devkit_context_guard`
Monitora uso de contexto e sugere ação antes de parar.

```
devkit_context_guard()  // lê .auto/session.json automaticamente
// ou
devkit_context_guard(input_tokens: 85000, context_window: 200000)
```

**`suggested_action`:** `compact_now` | `save_context` | `spawn_subagent_for_heavy_work` | `continue`

---

## Integração com squeez (externo)

**Repo:** https://github.com/claudioemmanuel/squeez  
**Stack:** Rust binary + MCP server com 14 tools  
**Diferencial:** MinHash fuzzy dedup (captura linhas quase-idênticas) + histórico cross-sessão

### Quando preferir squeez ao compressor nativo

| Situação | Use |
|---|---|
| Output com variação pequena entre linhas (ex: stack traces com addresses) | squeez (MinHash) |
| Histórico persistente entre sessões (não só a atual) | squeez |
| Integração com outros MCP clients (Cursor, Windsurf) sem o Dev Team Kit | squeez standalone |
| Já tem o kit instalado e quer zero deps adicionais | `devkit_compress_output` |
| Output de npm install, git log, test runner | `devkit_compress_output` com hint |

### Instalação no repo consumidor

```bash
# Requer Rust toolchain
cargo install squeez

# Ou via release binário (ver releases do repo)
```

### Configuração para coexistir com nossos hooks

No `.claude/settings.json` do repo consumidor, o squeez pode ser registrado como MCP adicional sem conflito com o `dev-team-kit`:

```json
{
  "mcpServers": {
    "dev-team-kit": { ... },
    "squeez": {
      "command": "squeez",
      "args": ["mcp"],
      "disabled": false
    }
  }
}
```

Os hooks PostToolUse rodam sequencialmente — `session-event-logger` e squeez não interferem entre si.

---

## Integração com rtk (externo)

**Repo:** https://github.com/rtk-ai/rtk  
**Stack:** Rust binary, reescreve comandos para equivalentes token-eficientes  
**Diferencial:** TOML DSL com 70+ mapeamentos, discover module, SQLite analytics

### Quando preferir rtk

| Situação | Use |
|---|---|
| Quer reescrever comandos antes de executar (ex: `ls -la` → versão compacta) | rtk |
| Quer analytics SQL sobre histórico de ferramentas | rtk (SQLite) |
| Quer subagents rtk além dos 5 do kit | rtk |
| Quer TOML DSL para filtros customizados por projeto | rtk |
| Kit já instalado, foco em análise de sessão atual | tools nativas |

### Coexistência com o kit

rtk opera como proxy de comandos Bash — não conflita com nossos hooks MCP. Os subagents de rtk (`.claude/agents/`) podem coexistir com os 5 do Dev Team Kit desde que tenham nomes diferentes.

```bash
# Instalar rtk
cargo install rtk-cli   # ver repo para instruções atualizadas

# Verificar coexistência
rtk verify              # deve passar sem conflitos com hooks do kit
```

---

## Tabela Comparativa

| Feature | Dev Team Kit | squeez | rtk |
|---|---|---|---|
| Compressor de output | ✅ Node.js, sem deps | ✅ Rust, MinHash | ❌ |
| Event log por sessão | ✅ JSONL | ✅ JSONL+histórico | ✅ SQLite |
| Subagents | ✅ 5 agents | ❌ | ✅ 6 agents |
| Slash commands | ✅ 11 commands | ❌ | ✅ |
| Skills de domínio | ✅ 31 skills | ❌ | ❌ |
| Fuzzy dedup (MinHash) | ❌ (MD5 normalizado) | ✅ | ❌ |
| TOML DSL para filtros | ❌ (config.json) | ❌ | ✅ |
| Reescrita de comandos | ❌ | ❌ | ✅ |
| Zero install extra | ✅ | ❌ Rust | ❌ Rust |
| Cross-sessão analytics | ❌ | ✅ | ✅ |

**Recomendação:** use o kit como base; adicione squeez se precisar de MinHash ou histórico cross-sessão; adicione rtk se precisar de reescrita de comandos ou TOML DSL.
