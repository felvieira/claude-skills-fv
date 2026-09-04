# Memory backends — native vault vs ai-memory

O kit suporta dois backends de memória persistente, mutuamente exclusivos por
máquina, decididos automaticamente no install (com opt-out do usuário).

## Native vault (default, zero dependência)

O backend histórico do kit: markdown Zettelkasten em `~/.claude-memory` (ou
`$CLAUDE_MEMORY_VAULT`), curado por `hooks/scripts/memory-curator.mjs`
(autônomo, ver [`policies/memory-curator.md`](memory-curator.md)). Roda em
Node puro — nenhuma dependência além do que o kit já exige. Funciona em
qualquer máquina, sempre.

## ai-memory (opcional, quando Docker está disponível)

[github.com/akitaonrails/ai-memory](https://github.com/akitaonrails/ai-memory)
— servidor Rust standalone (MCP + hooks nativos + FTS5/busca híbrida + wiki
git-versionada em OKF v0.2), com suporte cross-agent (Claude Code, Codex,
Cursor, Gemini CLI e mais) e cross-machine (servidor compartilhado). Upgrade
de qualidade de busca e continuidade entre agentes, mas **exige Docker**
rodando (ou WSL2/binário nativo experimental no Windows) — uma dependência
nova e pesada que o kit historicamente não pedia.

## Decisão automática no install

`scripts/ai-memory-setup.mjs`, chamado do fim de `scripts/init-vault.mjs`
(que por sua vez roda no fim de `setup/install.sh`):

1. Detecta `docker version` — se ausente, fica no vault nativo, sem perguntar.
2. Se Docker existe, sobe (ou reaproveita) o container `ai-memory` em
   `127.0.0.1:49374`, idempotente, sem perguntar (mesmo padrão de "npx MCPs
   auto-instalam" que o kit já usa).
3. Se o binário CLI `ai-memory` está no PATH, registra hooks + MCP para
   `claude-code` automaticamente (`install-hooks` / `install-mcp`).
4. Grava o backend ativo em `~/.dev-team-kit/memory-backend.json` — a fonte
   da verdade que os hooks nativos consultam para saber se devem ceder.

## Escolha explícita do usuário

- `bash setup/install.sh --memory-backend native` — força o vault nativo
  mesmo com Docker disponível.
- `bash setup/install.sh --memory-backend ai-memory` — força a tentativa do
  ai-memory (falha graciosamente pro nativo se Docker não existir).
- `--profile lean` / `--no-input` sempre caem no nativo — uma instalação
  não-interativa nunca deve baixar uma imagem Docker (~200MB) silenciosamente.
- Standalone: `node scripts/ai-memory-setup.mjs --skip` ou
  `DEVKIT_MEMORY_BACKEND=native` em qualquer ambiente.

## Mutuamente exclusivo, nunca os dois em paralelo

Rodar os dois sistemas ao mesmo tempo duplica captura e curadoria da mesma
história — foi o bug real que motivou este guard (dois hooks de auto-save
concorrentes na mesma sessão, descoberto ao migrar um vault de produção).
`hooks/scripts/utils.mjs` expõe `isAiMemoryActive()`, lida por:

- `session-start.mjs` — não dispara `memory-curator.mjs` nem injeta
  `.curator-pending.md` quando `ai-memory` está ativo.
- `memory-curator.mjs` — recusa rodar (mesmo chamado direto/manualmente) a
  menos que `--force` seja passado explicitamente.

## Migração de um vault nativo existente

Ver `scripts/export_ai_memory.py` (gerado durante a migração original) para
o padrão de exportar páginas do `ai-memory` de volta a markdown legível — útil
para apontar um Obsidian, já que o volume Docker interno usa pastas UUID e
não deve ser editado diretamente (risco de corromper o índice SQLite vivo).

## Anti-padrões

- ❌ Baixar/subir Docker silenciosamente num install `--no-input` — sempre
  cair no nativo nesse modo.
- ❌ Rodar `memory-curator.mjs` e o `ai-memory` juntos sem `--force` explícito.
- ❌ Editar arquivos direto dentro do volume Docker do `ai-memory`
  (`docker volume inspect ai-memory-data`) — usar `write-page`/`read-page`
  do CLI, ou o export script.
- ❌ Usar `ANTHROPIC_API_KEY`/`claude setup-token` via `anthropic-oauth` no
  ai-memory — a própria doc do projeto marca essa rota como não-oficial e
  contra os termos de uso da Anthropic. Prefira `openai` (API key) ou
  `openai-oauth` (assinatura ChatGPT, suportada oficialmente) como LLM
  provider, e `embedding_provider = local` (zero custo, zero chave) para
  embeddings.
