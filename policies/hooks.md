# Hooks Policy

## Objetivo
Definir regras de comportamento nos lifecycle events do agente. Para Claude Code: implementadas como hooks nativos em `hooks/scripts/`. Para outras plataformas (Copilot, Windsurf, Gemini CLI): seguir estas regras como instrucoes de comportamento.

## Context Guard

Antes de encerrar qualquer sessao:
- Se contexto estiver > 75% (muitas mensagens, arquivos grandes lidos, respostas longas): executar `/compact` antes de parar
- Se contexto estiver > 90%: compactar imediatamente, nao esperar pedido
- Nao parar no meio de pipeline ativo sem compactar e registrar estado

Em Claude Code: `context-guard-stop.mjs` faz isso automaticamente.

## Pre-execution Gate

Antes de montar pipeline para task nova, verificar se o prompt tem sinais concretos:
- file path, issue number, simbolo de codigo, steps numerados, acceptance criteria, stack trace, codigo
- Prefixo `force:` ou `!` bypassa o gate

Se nao ha sinais concretos:
- score < 0.4: prosseguir normalmente
- score 0.4-0.7: ENRICH — inferir escopo do repo-audit e confirmar com 3 opcoes
- score > 0.7: GUIDED ENRICH — fazer uma pergunta com multipla escolha, inferir o resto

Principio: nunca devolver "escreva mais". Inferir e confirmar. Sempre oferecer: "Bora assim? / Quer ajustar? / Ou era outra coisa?"

Em Claude Code: `pre-execution-gate.mjs` faz isso automaticamente.

## Keyword Sanitization

Antes de acionar skill por trigger keyword:
- Ignorar keywords dentro de code blocks, inline code, URLs, file paths, stack traces
- Verificar se o contexto ao redor (80 chars) indica pergunta informacional ("o que e", "como funciona")
- Se for pergunta sobre a skill: responder — nao executar a skill
- Acionar skill apenas quando intencao e claramente de acao

Em Claude Code: `keyword-detector.mjs` faz isso automaticamente.

## Learned Skills

Ao resolver problema nao-trivial durante debugging:
- Avaliar 3 criterios: (1) nao e Googleavel, (2) especifico deste codebase, (3) exigiu debugging real (3+ tentativas ou 3+ arquivos)
- Se os 3 passam: salvar em `.bot/learned-skills/` com formato padrão (ver `templates/` para exemplo)
- Em sessoes futuras: ao detectar trigger de learned skill, injetar como contexto antes de agir
- Max 3 learned skills injetadas por sessao

Em Claude Code: `post-tool-verifier.mjs` detecta padroes e sugere extracao automaticamente.

## Persistent Mode

Quando pipeline esta ativo, nao parar ate concluir a etapa atual:
- Verificar se `.bot/docs/context/pipeline-active.json` existe e `active: true`
- Se sim: completar o stage atual antes de parar
- Para forcar parada: deletar `.bot/docs/context/pipeline-active.json`

Em Claude Code: `persistent-mode.mjs` bloqueia o stop automaticamente.

## Pre-tool Enforcer

Antes de editar arquivo em sessao longa (10+ mensagens):
- Re-ler o arquivo alvo antes de editar (Context Decay Awareness do GLOBAL.md)
- Validar que o conteudo lido ainda e o atual

Em Claude Code: `pre-tool-enforcer.mjs` injeta este lembrete automaticamente.

## Code Exploration

Quando ferramentas de code intelligence estiverem disponiveis, preferir na seguinte ordem:

1. **Graph** (codebase-memory): `search_graph`, `trace_call_path`, `get_architecture`
2. **Symbol** (cymbal): `investigate`, `structure`, `impact`, `trace`
3. **Semantic** (lumen): `semantic_search`
4. **Bruto** (Grep/Glob/Read): apenas como fallback

Nunca ler arquivo inteiro para entender estrutura. Nunca grep por nome de funcao para achar callers.

Se nenhuma ferramenta externa esta instalada, explorar normalmente com Grep/Glob/Read.

Ver `policies/code-exploration.md` para regras completas e exemplos.

Em Claude Code: `pre-tool-enforcer.mjs` sugere a ferramenta correta automaticamente.

## Model Routing

Sugerir troca de modelo em dois contextos:

- **Plan mode**: sugerir opus ao entrar (`EnterPlanMode`), sonnet ao sair (`ExitPlanMode`)
- **Agent spawn**: avisar quando subagent nao tem `model` explicito e sugerir tier baseado no prompt (keywords → Deep/Balanced/Fast)

Regras:
- Anti-spam de 60s entre sugestoes (configuravel em `hooks/config.json`)
- Se agente ja definiu `model`, passar silenciosamente
- Sugestao, nao bloqueio — o agente decide

Config em `hooks/config.json` secao `model_routing`.
Ver `policies/model-routing.md` para regras completas de selecao.

Em Claude Code: `model-routing-hook.mjs` faz isso automaticamente.
