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

## Install, diagnóstico e upgrade

`scripts/init-vault.mjs` roda no fim de `setup/install.sh` e chama
`scripts/ai-memory-setup.mjs`:

1. Sem Docker, mantém o vault nativo. `--no-input`/`--profile lean` sem
   pedido explícito de upgrade não baixam imagem Docker; `--memory-backend native`
   força o vault nativo.
2. Primeira instalação Docker: baixa `akitaonrails/ai-memory:latest`, inicia
   servidor local em `127.0.0.1:39374` (override: `DEVKIT_AI_MEMORY_PORT`) com
   volume nomeado `ai-memory-data:/data`. A porta evita a faixa dinâmica
   49152+ às vezes reservada pelo Hyper-V no Windows. Quando há host CLI
   compatível, registra hooks/MCP do Claude Code e troca o marcador
   `~/.dev-team-kit/memory-backend.json` para `ai-memory`.
3. Instalação repetida **não** recria nem atualiza silenciosamente um servidor
   já existente: verifica o contrato do container; se reconhecido, mantém o
   servidor e avisa que a versão remota ainda não foi verificada. Container
   personalizado, volume órfão ou Docker indisponível exigem revisão humana.
   `node scripts/ai-memory-setup.mjs --check` inspeciona sem modificar o
   marcador; `--skip` ou `DEVKIT_MEMORY_BACKEND=native` escolhe o nativo.

Para atualizar um container standalone do kit, use:

```bash
node scripts/ai-memory-setup.mjs --upgrade --backup-to /caminho/absoluto/novo/ai-memory.tar.gz
# Ou durante instalação interativa ou explícita não interativa:
bash setup/install.sh /caminho/do/repo --upgrade-ai-memory --backup-to /caminho/absoluto/novo/ai-memory.tar.gz
```

O arquivo de backup deve ser **novo, fora do volume Docker**, num diretório
existente. O upgrade valida o container e a saúde do servidor, executa
`ai-memory backup` e verifica a cópia externa antes de baixar a nova imagem,
recriar o servidor com o mesmo volume e conferir o healthcheck. O container anterior
fica parado, nomeado `ai-memory-previous-*`; não é removido. A CLI do host
também precisa ser atual: `ai-memory upgrade` em instalações binárias
compatíveis baixa um release com SHA-256 verificado. Se a CLI for antiga
(anterior a 2.3), baixe o binário e o `.sha256` de
[Releases do ai-memory](https://github.com/akitaonrails/ai-memory/releases/latest),
confira o checksum, preserve o executável antigo e só então rode o upgrade do
kit. Para agentes além do Claude Code, revise os hooks/MCP registrados conforme
[documentação Windows](https://github.com/akitaonrails/ai-memory/blob/main/docs/windows.md)
e reexecute o instalador de hooks deles quando necessário.

**Rollback:** migrações do banco são forward-only; jamais reinicie o container
antigo contra o volume possivelmente migrado. Se o servidor novo falhar,
restaure o backup externo em volume separado seguindo a
[documentação upstream](https://github.com/akitaonrails/ai-memory/blob/main/docs/install.md#keeping-ai-memory-up-to-date).
Sem backup verificável ou diante de configuração customizada, o kit recusa
o upgrade automático em vez de perder dados ou segredos.

## Escolha explícita do usuário

- `bash setup/install.sh --memory-backend native` — força o vault nativo.
- `bash setup/install.sh --memory-backend ai-memory` — tenta ativar o
  ai-memory; instalação normal não atualiza um servidor existente.
- `--profile lean` / `--no-input` caem no nativo **exceto** quando o usuário
  pede `--upgrade-ai-memory --backup-to` explicitamente.

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

- ❌ Baixar/subir Docker silenciosamente num install `--no-input` sem pedido
  explícito de upgrade e backup externo — usar o vault nativo nesse caso.
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
