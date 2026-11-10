---
name: qa-testing
description: |
  Planeja QA, escreve testes e verifica comportamento, regressao e cobertura antes de release.
  Trigger em: "teste", "test", "QA", "Playwright", "Vitest", "Jest", "E2E", "coverage", "mock", "fixture", "regressao", "teste de integracao", "testing library", "mutation testing", "teste de mutação", "mutantes sobreviventes".
---

# QA Engineer - Testes Unitarios e E2E (SKILL)

> ⚠ **Esta é a SKILL 05** (playbook de QA). Não confundir com o subagent `dev-team-kit-fv:test-engineer`.
> - Carregar **este playbook**: `Skill({ skill: "dev-team-kit-fv:05-qa-testing" })`
> - Despachar **subagent isolado** (turno novo): `Agent({ subagent_type: "dev-team-kit-fv:test-engineer", ... })`
> - Diferença: `policies/skills-vs-agents.md`

O QA garante que o comportamento entregue continua correto antes de avancar no pipeline.

## Mutation Testing como sensor avançado (v2.6.0+)

> **Inspiração:** Birgitta Böckeler — _"Mutation and structural testing are computational feedback sensors that have been underused in the past, but are now having a resurgence."_ Ver `docs/inspiration/harness-engineering.md`.

Cobertura informa quais partes foram exercitadas, não quais defeitos os testes detectariam. Mutação introduz diferenças controladas no código para investigar essa sensibilidade.

Um mutante sobrevivente exige triagem: pode indicar lacuna de teste, diferença fora do contrato ou mutação equivalente. Timeout, erro de infraestrutura e código que não compila não comprovam detecção por asserção.

### Quando aplicar

| Situação | Recomendação |
|---|---|
| Regra crítica alterada, cálculo ou decisão com limites | Começar por essa função e seus testes relevantes |
| Cobertura alta e regressões recorrentes | Investigar asserções e casos de fronteira |
| Pouca cobertura no módulo escolhido | Criar testes úteis antes ou junto da análise; percentual global não decide sozinho |
| Prototipagem descartável ou alteração mecânica | Avaliar se o custo acrescenta evidência útil |
| CI lento ou testes com efeitos externos | Limitar tempo/workers e controlar os efeitos antes de executar |

### Tools por linguagem

| Linguagem | Tool | Notas |
|---|---|---|
| JS/TS | [Stryker Mutator](https://stryker-mutator.io/) | Verificar compatibilidade com o runner do projeto |
| Python | [mutmut](https://github.com/boxed/mutmut) | Usar ambiente do projeto |
| Python | [Cosmic Ray](https://github.com/sixty-north/cosmic-ray) | Avaliar configuração e orçamento |
| Java | [PIT (Pitest)](https://pitest.org/) | Verificar integração com o build |
| .NET | [Stryker.NET](https://stryker-mutator.io/docs/stryker-net/introduction/) | mesma família do JS |
| Rust | [cargo-mutants](https://github.com/sourcefrog/cargo-mutants) | Verificar toolchain e comandos de teste |
| Go | [go-mutesting](https://github.com/zimmski/go-mutesting) | Verificar suporte à versão da linguagem |
| Ruby | [mutant](https://github.com/mbj/mutant) | Verificar ambiente e runner |

### Workflow recomendado

1. Definir contrato, revisão/estado dos arquivos, funções-alvo, tempo máximo e limite de workers.
2. Reutilizar ferramentas disponíveis. Instalação ou regeneração de relatórios deve estar coberta pelo trabalho autorizado; não executá-la como efeito oculto de um relatório.
3. Rodar o baseline dos testes relevantes no ambiente controlado. Se falhar, resolver a causa antes de interpretar mutações.
4. Executar primeiro o escopo selecionado. Ampliar somente quando os resultados ou riscos justificarem.
5. Separar detecção de mutante válido por asserção, sobrevivente, não coberto, equivalente justificado, timeout, inválido e erro de infraestrutura. Registrar denominador e itens não executados.
6. Corrigir lacunas de teste que alteram comportamento observável; justificar equivalentes sem mudar a regra correta. Revalidar o escopo afetado.
7. Se o projeto adotar gate, usar baseline e limite acordados para aquela área, com orçamento de CI. Resultado cacheado precisa ser revalidado quando testes, dependências ou configuração mudarem.

### Plug no kit

Use `docs/skill-guides/architecture-and-evidence.md` para a triagem e os testes de repetição, concorrência e recuperação. `scripts/code-quality-report.mjs --input <json> [--json]` consolida medições normalizadas; ele não executa ferramentas nem verifica os artefatos declarados. Não use esse relatório como prova de execução.

### Integração com skill 37 (TDD)

Skill 37 (TDD) usa **approved fixtures** para behaviour harness gap.
Skill 05 (esta) usa **mutation testing** para detectar testes fracos em código existente.

TDD ajuda a formular contratos testáveis; mutação investiga a sensibilidade dos testes existentes. As duas técnicas exigem critérios corretos e evidência de execução; nenhuma garante ausência de defeitos.

## QA Tradicional (resto da skill)

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/evals.md` e `policies/verification-before-completion.md` (gate obrigatório — toda claim "tests pass" precisa output verificável).

Para setups completos e exemplos longos, consultar `docs/skill-guides/qa-testing.md` apenas quando necessario.

Quando a validacao exigir browser real com navegacao e screenshots, esta skill pode configurar ou reutilizar `Playwright MCP` localmente.

## Quando Usar

- escrever ou revisar testes unitarios, integracao e E2E
- validar regressao, smoke e baseline de performance

## Quando Nao Usar

- para substituir Security ou Reviewer
- para decidir sozinho contrato ou regra de negocio ambigua

## Entradas Esperadas

- criterios de aceitacao
- artefatos implementados
- riscos conhecidos e fluxos criticos

## Saidas Esperadas

- cobertura de cenarios relevantes
- evidencias de validacao e regressao
- handoff claro para Security ou retorno ao implementador

## Responsabilidades

1. Escrever testes unitarios para hooks, stores e utils
2. Escrever testes de componente para interacoes e estados criticos
3. Escrever testes E2E para caminho feliz, erros principais e regressao
4. Validar criterios de aceitacao do PO via testes
5. Sinalizar gaps de cobertura, flakiness e risco residual

## Estrategia Base de Testes

- unitario e componente para logica local e UI critica
- integracao para contratos e fluxos entre camadas
- E2E para auth, navegacao, erros principais e regressao
- smoke tests apos deploy em fluxos criticos

## Padroes de Teste

- falhar em requests nao mockadas quando o teste depender de mock
- usar dados de teste simples e deterministicos
- cobrir caminho feliz, erro principal e uma regressao conhecida quando houver
- manter testes legiveis e focados em comportamento observavel

## Playwright MCP

Usar `Playwright MCP` quando a tarefa exigir:

- navegacao real no app rodando
- verificacao visual de layout e estados
- screenshots de evidencias
- inspecao manual assistida de regressao em browser

Isso complementa os testes e2e formais e ajuda especialmente em verificacoes visuais ou exploratorias.

Em QA de interface web, usar `skills/02-ui-ux-design/references/web-interface-review.md` como roteiro complementar para teclado, foco, formulários, movimento reduzido e conteúdo extremo. Confirmar os estados no browser e registrar evidência; a presença de atributos no código, sozinha, não comprova que a interação funciona.

## Padroes de Teste Playwright (referencia)

`references/playwright-patterns.md` — quando escolher Page Object Model vs Fixtures vs Helper function (e por que fixtures e o ponto de partida padrao), arvore de decisao pra debugar teste flaky (UI-driven, race condition, data/paralelismo, state leak, CI-only), sharding paralelo (`--workers` vs `--shard`) e mock de OAuth/SSO em teste E2E (interceptar callback + endpoint de sessao, nunca o provider real).

### Pattern: cleanup SQLite WAL no Windows

Windows mantém lock em arquivos SQLite WAL/SHM por alguns ms após `db.close()`. Cleanup síncrono em `afterAll` falha com EBUSY. Use retry diferido:

```js
afterAll(() => {
  db.close();
  setTimeout(() => {
    const tryUnlink = (p) => { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {} };
    [TEST_DB, TEST_DB + '-wal', TEST_DB + '-shm'].forEach(tryUnlink);
  }, 200);
});
```

Descoberto em eval-bench/Teste 2 (2026-05-23). Pattern não é Windows-only — também previne problema em CI Linux com discos lentos.

## Cobertura Minima Recomendada

- hooks, stores e utils com logica propria
- componentes com comportamento relevante ao usuario
- fluxos de auth, navegacao e erro principal
- smoke tests apos deploy em caminhos criticos

## Checklist de QA antes de Aprovar

- testes unitarios e E2E passando
- cobertura minima atendida ou gap documentado
- criterios de aceitacao cobertos pelos cenarios principais
- sem flakiness relevante em CI
- falhas conhecidas classificadas por impacto

**Checkpoint:** rodar a suite → item que falhar, corrigir o teste ou reportar o bug ao dev (nunca marcar `skip`/`todo` pra passar) → rodar de novo. Repetir até os 5 itens acima serem verdade sem excecao nao-documentada. "Passou na segunda tentativa depois que ajustei o mock" so conta se o mock ajustado ainda testa o comportamento real — mock ajustado pra sempre retornar sucesso e um teste que nao testa nada.

## Evidencia de Conclusao

- cenarios criticos cobertos
- regressao principal verificada
- falhas ou gaps classificados por impacto

## Persona

Para output estruturado e persona detalhada com tipos de cenário, coverage analysis e template de relatório, ver `personas/test-engineer.md`.

## Handoff para Security Review

Entregar:
1. resultado geral dos testes
2. cenarios cobertos e gaps conhecidos
3. notas sobre regressao, flakiness ou risco residual

## Integracao com Pipeline

- **Orquestrador (skill 09):** define quando QA entra e se precisa reexecucao
- **Context Manager (skill 08):** registra estado da validacao
- **Documentador (skill 10):** registra evidencias quando necessario
- **TDD Engineer (skill 37):** quando ativo, escreve **behavior tests** (red-green-refactor) primeiro. QA (esta skill) **complementa** com edge cases nao cobertos pelo TDD: cenarios raros, falhas de infra, performance, regressao cross-feature. **Nao duplicar** o que TDD ja cobriu — o relatorio do TDD lista comportamentos cobertos; comecar dai.

## Anti-Rationalization

Se você reconhece um desses pensamentos, PARE e siga o processo. Ver `policies/anti-rationalization.md`.

| Racionalização | Realidade |
|---|---|
| "Vou adicionar testes depois" | Código sem teste é código que não funciona até prova em contrário |
| "É refactor, não muda comportamento" | Refactor sem teste é aposta. Testes provam que comportamento não mudou |
| "Coverage já está boa o suficiente" | Coverage mede linhas executadas, não cenários cobertos. Verifique edge cases |
| "Esse código é trivial demais pra testar" | Código trivial que quebra em produção causa vergonha desproporcional |
| "Mock resolve, não preciso de teste de integração" | Mock prova que seu mock funciona. Integração prova que o sistema funciona |

## Fontes Externas

- Padroes de arquitetura (POM vs fixtures), debug de flaky test, sharding paralelo e mock de OAuth/SSO adaptados de [currents-dev/playwright-best-practices-skill](https://github.com/currents-dev/playwright-best-practices-skill) (MIT). Ver `references/playwright-patterns.md`.
