# Boil the Lake — Filosofia de Completude

> **Inspiração:** [Garry Tan / gstack ETHOS](https://github.com/garrytan/gstack/blob/main/ETHOS.md) (MIT).
> Adaptado pra voz e estrutura do kit. Argumento econômico que complementa o "Senior Dev Override" do CLAUDE.md global e a hierarquia de `trade-off-resolution.md`.

## O argumento

A barreira de engenharia caiu. O que sobrou é gosto, julgamento e disposição para fazer a coisa completa. Quando o custo marginal de completude é segundos (não horas), **completar é o default — não a exceção**.

### Tabela de compressão (humano vs AI-assistido)

| Tipo de trabalho | Time humano | AI-assistido | Compressão |
|------------------|-------------|--------------|------------|
| Boilerplate / scaffolding | 2 dias | 15 min | ~100x |
| Escrever testes | 1 dia | 15 min | ~50x |
| Implementar feature | 1 semana | 30 min | ~30x |
| Bug fix + regression test | 4h | 15 min | ~20x |
| Arquitetura / design | 2 dias | 4h | ~5x |
| Pesquisa / exploração | 1 dia | 3h | ~3x |

Os últimos 10% de completude que times pulavam? Custam segundos agora.

## Lake vs Ocean

- **Lake (boilable):** cobertura de testes 100% do módulo, todos os edge cases, todos os caminhos de erro, doc completa do contrato. **Faça.**
- **Ocean (não boilable):** reescrever sistema inteiro, migração multi-quarter, refactor de plataforma. **Marque como fora de escopo e pare.**

A pergunta certa não é "isso é viável?". É: **"isso é um lake ou um oceano?"**

## Quando aplicar

Antes de aceitar uma trade-off "shortcut vs completo", pergunte:

1. O completo custa **minutos** com AI? → faça o completo
2. O completo custa **horas**? → trade-off real, decida com `policies/trade-off-resolution.md`
3. O completo custa **dias**? → é oceano, pare e flag

## Anti-padrões a recusar

- ❌ *"Vou implementar só o caminho feliz, edge cases ficam pra depois."* — edge cases é o lake mais barato pra ferver
- ❌ *"Testes ficam num PR de follow-up."* — testes custam 15 min com AI
- ❌ *"Coloquei 90% pra economizar 70 linhas."* — 70 linhas com AI são 90 segundos
- ❌ *"Isso levaria 2 semanas."* — diga: "2 semanas humanas / ~1h AI-assistido"

## Quando NÃO aplicar (o oceano)

Ferver oceanos é desperdício, não virtude. Sinais de oceano:

- migrações multi-sistema (banco + app + cache + clientes)
- substituir framework principal (React → outro)
- reescritas de >10k LOC sem destination claro
- "vamos refatorar tudo enquanto isso"

Para oceanos: **fragmente em lakes**. Cada lake é uma unidade fervível. Cada lake é uma vertical slice (`policies/vertical-slices.md`).

## Encaixe com outras policies

- **`GLOBAL.md`** — "Senior Dev Override" do CLAUDE.md global ganha o argumento *qualitativo* (rejeite o que sênior rejeitaria). Esta policy ganha o argumento *quantitativo* (por que custa segundos)
- **`trade-off-resolution.md`** — hierarquia diz **quem ganha**; boil-the-lake diz **se a trade-off é real ou ilusória**
- **`goal-driven-execution.md`** — execute pra valor entregue, não pra ticar caixa. Lake fervido vale mais que checklist parcial
- **`verification-before-completion.md`** — completar inclui verificar. Lake fervido tem prova de fervimento
- **`vertical-slices.md`** — slice é uma porção bebível do lake; nunca um pedaço de oceano

## Aplicações por skill

- **skill 01 (PO)** — ao definir MVP, prefira o lake completo da feature core a 3 features pela metade
- **skill 09 (Orchestrator)** — ao montar pipeline, inclua testes + docs no slice, não como follow-up
- **skill 23 (Migration/Refactor)** — refactor completo do módulo > band-aid + TODO. Se o módulo é oceano, fragmente
- **skill 37 (TDD)** — todo behavior tem teste antes de fechar. Cobertura 80%+ é o lake
- **skill 38 (Architecture Deepener)** — deep module completo > shallow module com TODO de "depois eu aprofundo"
