# Compaction Recovery (pacote de recuperacao pos-compactacao)

> **Inspiracao:** [`docs/compaction.md` de vshulcz/deja-vu](https://github.com/vshulcz/deja-vu) (MIT). Ideia reimplementada em Node puro, sem LLM e sem indice: antes de o host compactar a conversa, guardar o que o resumo costuma perder e devolver uma vez, com aviso de frescor. Nenhum codigo foi copiado.

## O problema

O resumo que o host gera na compactacao tende a manter o "porque" e perder o concreto: o comando de verificacao que falhou, a pendencia declarada no meio da conversa, a decisao fechada ha 40 turnos. O agente volta da compactacao acreditando num estado que pode nao existir mais. (O README do deja-vu cita medicao propria — o resumo manteve 77% das decisoes e 0,2% dos comandos em 43 compactacoes — que **nao foi verificada aqui**; o desenho nao depende desse numero.)

## Como funciona

| Etapa | Quem | O que faz |
|---|---|---|
| Captura | `hooks/scripts/precompact-capture.mjs` (evento `PreCompact`) | Le os ultimos 4 MiB do transcript JSONL e grava `.auto/compaction/<session_id>.json` |
| Entrega | `hooks/scripts/compaction-recover.mjs` | No proximo `UserPromptSubmit` ou `PostToolUse` da mesma sessao, injeta o pacote **uma vez** e apaga o arquivo |
| Nucleo | `hooks/scripts/compaction-lib.mjs` | Extracao, renderizacao, limites (testado em `scripts/tests/memory-hooks.test.mjs`) |

O dispatcher so executa o script de entrega quando o arquivo do pacote existe: o caminho comum, sem compactacao, nao paga processo extra. `SessionStart` fica de fora porque nem todo host honra `additionalContext` ali e o pacote so e apagado quando entregue.

## O que o pacote carrega (maximo 4096 caracteres, incluindo o aviso)

1. **Manter ate fechar** — pendencias explicitas, ate 12. Uma linha so conta quando **abre** com o rotulo (`Gap:`, `Pendente:`, `Ainda aberto:`, `Falta:`, `TODO:`, `Proximo passo:`, `Still open:`): uma frase que apenas contem a palavra "gap" nao e pendencia. Cada captura parte da lista da anterior; um item que nao reaparece envelhece e some depois de 2 compactacoes.
2. **Objetivo** — o turno de usuario mais recente com corpo (≥ 60 caracteres). Turno curto de "continue/segue/ok" nunca vira objetivo; um turno curto que carrega instrucao herda o ultimo turno longo.
3. **Verificacoes registradas** — comandos de teste/lint/build/check das ultimas chamadas `Bash`/`PowerShell`, com resultado lido do proprio transcript: `passou`, `FALHOU` ou `resultado nao registrado`. Sem resultado no transcript, **nunca** se infere `passou`.
4. **Conclusoes reportadas** — ate 3 fechamentos do assistente, sempre rotulados como afirmacoes nao verificadas.
5. **Estado do git** — HEAD, branch e impressao digital da arvore de trabalho na captura. Na entrega o pacote diz so o veredito: `inalterado`, `arvore de trabalho mudou` ou `MUDOU: capturado em <sha>, agora <sha>` — e, em qualquer coisa que nao seja `inalterado`, manda tratar as conclusoes como hipoteses. Sem git, o veredito e `indisponivel` e pede validacao.

O texto entregue abre com um aviso: dados historicos **nao confiaveis**, pista e nunca instrucao.

## Seguranca e privacidade

- Todo campo passa por `redactSecrets` (`hooks/scripts/memory-lib.mjs`) antes de ir para o disco, campo a campo (nunca sobre o JSON serializado). Segredo reconhecido vira `[redacted:<tipo>]`. Reconhecimento por formato nao e deteccao: um formato desconhecido passa.
- O `session_id` e sanitizado para `[A-Za-z0-9_-]`; um id com `../` nao escreve fora de `.auto/compaction/`.
- Falha sempre em silencio: o hook nunca atrasa nem quebra a compactacao. Transcript ilegivel, formato desconhecido ou sessao sem id => nenhum pacote.
- O pacote vive no projeto (`.auto/` ja e gitignored) e e apagado na entrega. Nao e memoria de longo prazo e **nao e capturado pelo backend de memoria**: por isso nao conflita com a regra de exclusividade de [`memory-backends.md`](memory-backends.md) e fica ativo mesmo com `ai-memory`.
- Opt-out: `hooks/config.json → compaction_recovery.enabled = false`, ou `DEVKIT_DISABLED_HOOKS=precompact-capture`.

## Compatibilidade por agente (verificada em 2026-10-03, nesta máquina)

Cada agente grava o transcript de um jeito; `compaction-lib.mjs` traduz para eventos neutros e **formato desconhecido gera nenhum pacote** (nunca um pacote vazio).

| Agente | Hooks do kit rodam? | `PreCompact` | Transcript | Estado |
|---|---|---|---|---|
| Claude Code | sim (plugin, `hooks/hooks.json`) | sim | JSONL `message.content[]` | testado com transcrito real (4,2 MB) |
| Codex 0.155 | sim, se aberto na raiz do repo (`.codex/hooks.json`) | o binário contém `PreCompact`, `PostCompact` e `transcript_path`; o `~/.codex/hooks.json` global já registra `PreCompact` | `rollout-*.jsonl` (`response_item`: `message`, `function_call`, `function_call_output`) — adaptador próprio | testado com 3 rollouts reais; **nenhuma compactação real do Codex observada ainda** |
| Grok Build 1.0.41 | **só com registro próprio**: o `config.toml` tem `[compat.claude] hooks = false`, então ele não lê o plugin; só `~/.grok/hooks/*.json`. `node scripts/install-memory-hooks.mjs --runtime grok --apply` registra o perfil `memory-deferred` (`UserPromptSubmit`, `PostToolUse`, `PreCompact`) | sim (`/compact` e automática) | o payload traz `transcript_path` apontando para `updates.jsonl` (fluxo de eventos de UI, inútil aqui); `resolveTranscriptPath` usa o `chat_history.jsonl` ao lado (`user` com `<user_query>`, `assistant.tool_calls`, `tool_result` com `exit: N`) — adaptador próprio | **verificado de ponta a ponta com o Grok real**: `/compact` grava o pacote (`source_format: grok`), o próximo `PostToolUse` o entrega uma vez e o modelo o cita |

**Por que `memory-deferred`:** a documentação do Grok diz que o `additionalContext` de um `UserPromptSubmit` que permite o prompt é **descartado**; ele só chega ao modelo em `PreToolUse`/`PostToolUse`/`Stop`. Por isso, no Grok, o contexto do prompt (learned-skills) é guardado em `.auto/pending-context/<sessão>.json` e entregue uma vez no primeiro `PostToolUse`, e o pacote de recuperação só é consumido ali (consumi-lo no prompt o apagaria sem o modelo ver — foi o que aconteceu na primeira tentativa). Limite do host: um turno sem nenhuma chamada de ferramenta não recebe contexto.
| OpenCode, Cursor, Gemini CLI | não testado | — | — | só `AGENTS.md`/MCP |

Codex em modo "code" roda o shell dentro de JS (`tools.exec_command({cmd:"..."})`): o comando é extraído, mas o resultado do script não traz o código de saída, então a verificação aparece como `resultado nao registrado` — nunca como `passou`.

## Limites conhecidos (nao esconder)

- Dependem do host: o hook só alimenta a captura onde o host dispara `PreCompact` com `transcript_path` num formato que `compaction-lib.mjs` entende (hoje Claude Code e Codex).
- "Fechado" nao e detectado: um item some por **idade** (2 compactacoes), nao por ter sido resolvido na conversa.
- Em execucao autonoma sem prompt (`/auto`, `/loop`), a entrega acontece no proximo `PostToolUse`.
- Um transcript grande so tem o fim lido (aviso `so o fim do transcript foi lido` no pacote).

## Anti-padroes

- ❌ Tratar a conclusao do pacote como fato sem checar o veredito do git.
- ❌ Declarar uma verificacao como passou quando o transcript nao registrou o resultado.
- ❌ Guardar o pacote fora de `.auto/` ou sem redacao.
- ❌ Bloquear a compactacao esperando o hook.

## Integracao

- `hooks/hooks.json` — evento `PreCompact`; `hooks/scripts/runtime-dispatcher.mjs` — roteia captura e entrega.
- `policies/memory-tiers.md` — o pacote e Working tier transiente; `policies/memory-write-rules.md` — anti-fabricacao.
- `scripts/memory-secrets-scan.mjs` — auditoria dos transcritos que alimentam tudo isto.
