---
name: tdd-engineer
description: |
  Test-Driven Development com red-green-refactor enforced. Use quando construir feature ou
  fix de bug usando TDD, mencionar "red-green-refactor", quiser tracer bullets, ou pedir
  desenvolvimento test-first. Combate o anti-padrao "horizontal slicing" (escrever todos
  os testes antes de toda a implementacao).
  Trigger em: "tdd", "test-first", "red-green-refactor", "tracer bullet", "behavior test",
  "integration test", "deep module", "interface design test".
argument-hint: "[--module=path] [--behavior=descricao]"
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# TDD Engineer — Red-Green-Refactor Enforced

Skill que **forca** o ciclo TDD correto: 1 teste → 1 implementacao → repete. Combate o anti-padrao "escrevo 5 testes, depois 5 implementacoes" — que produz testes ruins (testam shape, nao behavior).

Adaptado de [mattpocock/skills/engineering/tdd](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd) e integrado ao kit (skill 05 QA + `policies/vertical-slices.md`).

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/quality-gates.md`, `policies/vertical-slices.md`, `policies/source-driven.md`, `policies/writing-clarity.md` e `policies/verification-before-completion.md` (cada passo red→green→refactor exige output verificável da mudança de estado).

## Filosofia

> **Tests should verify behavior through public interfaces, not implementation details.**
> **Code can change entirely; tests shouldn't.**

**Bom teste** e integration-style: exercita codigo real atraves de API publica. Descreve **o que** o sistema faz, nao **como**. Le como spec — "user can checkout with valid cart" diz exatamente que capacidade existe. Sobrevive a refactor.

**Mau teste** acopla a implementacao: mocka colaboradores internos, testa metodo privado, verifica via DB direto. Sinal de alerta: teste quebra ao refactorar **sem** mudar comportamento. Se renomear funcao interna quebra teste, o teste estava testando implementacao.

## Quando Usar

- nova feature com complexidade nao trivial
- bug fix em codigo critico (TDD garante regressao)
- refactor de modulo nao testado (escrever testes pegando o comportamento atual antes de mexer)
- design de modulo novo onde interface ainda nao esta clara (TDD revela interface boa)
- equipe nova precisando convencao de testabilidade

## Quando NAO Usar

- script throwaway (data migration uma vez, scaffolding)
- spike exploratorio (descobrir se algo e possivel)
- bug trivial em area amplamente coberta (basta adicionar teste de regressao)
- UI puramente visual (snapshot test pode bastar)

## Entradas Esperadas

- spec ou criterio de aceitacao da feature (skill 01 PO ou issue do tracker)
- modulo alvo (path) ou descricao do comportamento
- (opcional) lista de comportamentos prioritarios fornecida pelo usuario
- (opcional) plano de deepening da skill 38 (Architecture Deepener)
- glossario de dominio do projeto (`CONTEXT.md` ou `docs/glossary.md`)
- ADRs relevantes (`docs/adr/`)

## Saidas Esperadas

- todos os comportamentos priorizados em verde
- N novos arquivos de teste em `tests/` ou `__tests__/` (path conforme convencao do projeto)
- relatorio curto: comportamentos cobertos, comportamentos NAO cobertos (escalados para skill 05 QA)
- nenhum teste mocka colaborador interno
- nenhum teste verifica metodo privado
- testes leem como spec ("user can X when Y")
- (se houver refactor pos-GREEN) lista de modulos deepened para skill 38 validar

## Anti-Padrao: Horizontal Slicing

**NAO escrever todos os testes primeiro, depois toda a implementacao.** Isso e horizontal slicing — tratar RED como "escrever todos os testes" e GREEN como "escrever todo o codigo".

Produz testes ruins:
- testes em massa testam comportamento **imaginado**, nao **real**
- voce acaba testando **shape** (estrutura de dados, assinatura) em vez de comportamento user-facing
- testes ficam insensiveis a mudancas reais — passam quando comportamento quebra, falham quando comportamento esta ok
- voce ultrapassa seus farois — commit a estrutura de teste antes de entender a implementacao

```
ERRADO (horizontal):
  RED:   test1, test2, test3, test4, test5
  GREEN: impl1, impl2, impl3, impl4, impl5

CERTO (vertical):
  RED→GREEN: test1→impl1
  RED→GREEN: test2→impl2
  RED→GREEN: test3→impl3
  ...
```

Esta diretriz ecoa `policies/vertical-slices.md` — fatia vertical, nao horizontal.

## Workflow

### Fase 1 — Planning

Ao explorar codebase, usar glossario de dominio do projeto para que nomes de teste e vocabulario de interface batam com a linguagem do projeto. Respeitar ADRs na area tocada.

Antes de escrever qualquer codigo:

- [ ] Confirmar com usuario quais mudancas de interface sao necessarias
- [ ] Confirmar com usuario quais comportamentos testar (priorizar)
- [ ] Identificar oportunidades de **deep modules** (interface pequena, implementacao profunda — ver skill 38)
- [ ] Desenhar interfaces para testabilidade
- [ ] Listar comportamentos a testar (NAO passos de implementacao)
- [ ] Obter aprovacao do usuario no plano

Pergunta-chave: "Como deve ser a interface publica? Quais comportamentos sao mais importantes testar?"

**Voce nao pode testar tudo.** Confirmar com usuario quais comportamentos importam mais. Foco em paths criticos e logica complexa, nao todo edge case possivel.

### Fase 2 — Tracer Bullet

Escrever UM teste que confirma UMA coisa sobre o sistema:

```
RED:   Escrever teste para o primeiro comportamento → teste falha
GREEN: Escrever codigo minimo para passar → teste passa
```

Esse e o **tracer bullet** — prova que o caminho funciona end-to-end.

### Fase 3 — Loop Incremental

Para cada comportamento restante:

```
RED:   Escrever proximo teste → falha
GREEN: Codigo minimo para passar → passa
```

Regras:
- **um teste por vez**
- **so codigo suficiente para passar o teste atual**
- **nao antecipe testes futuros**
- mantenha testes focados em comportamento observavel

### Fase 4 — Refactor

Apos todos os testes passarem, procurar oportunidades de refactor:

- [ ] Extrair duplicacao
- [ ] Aprofundar modulos (mover complexidade atras de interface simples — coordenar com skill 38)
- [ ] Aplicar SOLID onde natural
- [ ] Considerar o que o codigo novo revela sobre codigo existente
- [ ] Rodar testes apos cada passo de refactor

**Nunca refactore enquanto RED.** Chegue ao GREEN primeiro.

## Checklist Por Ciclo

```
[ ] Teste descreve comportamento, nao implementacao
[ ] Teste usa apenas interface publica
[ ] Teste sobreviveria a refactor interno
[ ] Codigo e minimo para esse teste
[ ] Nenhuma feature especulativa adicionada
```

## Anti-Rationalization Table

Pensamentos que indicam STOP — voce esta racionalizando:

| Pensamento | Realidade |
|---|---|
| "Vou escrever os 5 testes agora porque ja sei o que precisa" | Horizontal slicing. Volte ao tracer bullet. |
| "Esse teste vai precisar de mock do DB pra rodar" | Provavelmente esta testando implementacao. Reescreva pra usar interface publica. |
| "Adicionar funcionalidade extra agora porque ja estou aqui" | Nao antecipe. Codigo minimo para o teste atual. |
| "Refactor enquanto vermelho — vai ficar mais limpo" | Nao. GREEN primeiro, refactor depois. |
| "O teste passou na primeira tentativa, sem ter visto vermelho" | Voce pode estar testando algo que ja existia. Garanta que o teste falha sem o codigo novo. |
| "Vou testar metodo privado pra cobrir tudo" | Metodo privado nao e contrato. Teste comportamento via interface publica. |
| "Vou querer esse teste depois entao escrevo agora" | Especulativo. Escreva quando precisar. |
| "Esse cenario e improvavel" | Se e improvavel, nao teste. Se e critico, escreva o teste agora. |
| "Vou pular TDD nesta feature porque e simples" | "Simples" muitas vezes vira complexo. Comece TDD, abandone se ficar obvio que nao agrega. |

## Heuristicas de Boa Interface (para testabilidade)

- **Deep module:** interface pequena, comportamento rico. Test count baixo + cobertura alta.
- **Argumentos primitivos > objetos complexos:** facilita setup de teste sem mocks elaborados.
- **Funcao pura > stateful:** input → output testavel sem fixture.
- **Side effect declarado > escondido:** facilita asserir que aconteceu.
- **Erro e retorno > excecao:** simplifica matrix de teste (sem try/catch).

Coordenar com skill 38 (Architecture Deepener) para identificar modulos shallow que merecem deepening antes de escrever teste.

## Integracao com Vertical Slices

TDD opera **dentro** de uma vertical slice. Sequencia:

1. `/to-issues` quebra feature em vertical slices
2. Cada worker pega 1 slice
3. Dentro do slice: TDD red-green-refactor por comportamento
4. Slice completa quando todos os comportamentos prioritarios estao verdes

NAO tentar TDD cross-slice — comportamento de slice X nao deve depender de teste de slice Y.

## Evidencia de Conclusao

- todos os comportamentos priorizados verdes
- nenhum teste foi escrito antes de ver o respectivo RED
- refactor passada apos GREEN final, todos os testes ainda verdes
- nenhum teste mocka colaborador interno
- nenhum teste verifica metodo privado
- testes leem como spec ("user can X when Y")

## Handoff

Apos conclusao:
- caminho dos testes adicionados
- contagem (N novos testes, M cobertura aumentada)
- modulos que ganharam deepening (se aplicavel) → skill 38 valida
- proxima: skill 11 (Reviewer) valida que testes nao mockam implementacao

## Integracao com Pipeline

- **PO (skill 01):** criterios de aceitacao alimentam lista de comportamentos prioritarios
- **Backend (03) + Frontend (04):** implementacao do GREEN
- **QA Engineer (05):** complementa com edge cases nao priorizados em TDD
- **Reviewer (11):** valida disciplina TDD (sem mock interno, sem teste de privado)
- **Architecture Deepener (38):** coordena para identificar deep modules antes do RED
- **`/build`:** pode ativar TDD se task descrita como "TDD" ou "test-first"

## Material Adicional

Para deep dives consultar:
- `docs/skill-guides/tdd-deep-modules.md` (a criar conforme demanda) — adaptacao de [tdd/deep-modules.md](https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/deep-modules.md)
- `docs/skill-guides/tdd-interface-design.md` — interface design para testabilidade
- `docs/skill-guides/tdd-mocking.md` — quando mockar (raramente) e como
- `docs/skill-guides/tdd-refactoring.md` — refactor checklist apos GREEN
