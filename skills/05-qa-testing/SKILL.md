---
name: qa-testing
description: |
  Skill do QA Engineer para testes unitarios, integracao e E2E. Use quando precisar escrever testes,
  validar regressao, revisar cobertura, configurar estrategia de QA, ou evidenciar qualidade antes de release.
  Trigger em: "teste", "test", "QA", "Playwright", "Vitest", "Jest", "E2E", "coverage", "mock",
  "fixture", "regressao", "teste de integracao", "testing library".
---

# QA Engineer - Testes Unitarios e E2E (SKILL)

> ⚠ **Esta é a SKILL 05** (playbook de QA). Não confundir com o subagent `dev-team-kit-fv:test-engineer`.
> - Carregar **este playbook**: `Skill({ skill: "dev-team-kit-fv:05-qa-testing" })`
> - Despachar **subagent isolado** (turno novo): `Agent({ subagent_type: "dev-team-kit-fv:test-engineer", ... })`
> - Diferença: `policies/skills-vs-agents.md`

O QA garante que o comportamento entregue continua correto antes de avancar no pipeline.

## Mutation Testing como sensor avançado (v2.6.0+)

> **Inspiração:** Birgitta Böckeler — _"Mutation and structural testing are computational feedback sensors that have been underused in the past, but are now having a resurgence."_ Ver `docs/inspiration/harness-engineering.md`.

**Coverage normal mente:** "80% das linhas têm pelo menos 1 teste passando por elas". Mas isso não diz se os testes **detectam bugs**. Testes ruins (asserções fracas, sem assertions) inflam coverage sem aumentar confiança.

**Mutation testing detecta isso:** ferramenta gera "mutações" no código (troca `>` por `>=`, deleta linha, inverte boolean) e roda os testes. Se os testes **não falham** após mutação, eles são fracos.

### Quando aplicar

| Situação | Recomendação |
|---|---|
| Coverage > 60% mas bugs ainda escapam | ✅ Forte — sinal claro de testes fracos |
| Lógica complexa de negócio (cálculos, regras) | ✅ Forte — todo edge case importa |
| Greenfield, time aprendendo TDD | ✅ Médio — ensina a escrever assertions melhores |
| Prototype/spike throwaway | ❌ Skip — overhead > ganho |
| Coverage < 40% | ❌ Skip antes — coverage primeiro, mutation depois |
| CI lento (>10min) | 🟡 Cuidado — mutation roda em paralelo a coverage |

### Tools por linguagem

| Linguagem | Tool | Notas |
|---|---|---|
| JS/TS | [Stryker Mutator](https://stryker-mutator.io/) | `@stryker-mutator/core` — config via stryker.config.json |
| Python | [mutmut](https://github.com/boxed/mutmut) | `pip install mutmut`, simples |
| Python | [Cosmic Ray](https://github.com/sixty-north/cosmic-ray) | Mais sofisticado, configurável |
| Java | [PIT (Pitest)](https://pitest.org/) | Padrão de mercado JVM |
| .NET | [Stryker.NET](https://stryker-mutator.io/docs/stryker-net/introduction/) | mesma família do JS |
| Rust | [cargo-mutants](https://github.com/sourcefrog/cargo-mutants) | Maduro, integra com cargo |
| Go | [go-mutesting](https://github.com/zimmski/go-mutesting) | Menos popular mas funciona |
| Ruby | [mutant](https://github.com/mbj/mutant) | Tipo gold standard pra Ruby |

### Workflow recomendado

```
1. Tem coverage instalado? Se não, comece por isso (skill 05 normal flow)
2. Coverage > 60%? Se não, focar em coverage antes
3. Sim → adicione mutation tool ao package.json/equivalent
4. Roda primeiro full: `npx stryker run` (vai demorar)
5. Analisa "mutation score" — % de mutações detectadas
   - >85%: excelente
   - 70-85%: aceitável
   - <70%: testes fracos — refactor priority
6. Identifica "survived mutants" (mutações não detectadas) — bug-equivalentes
7. Pra cada survived, escreva teste que mata o mutante
8. Plug no CI:
   - Diário (não cada commit — caro)
   - Threshold mínimo (não regression)
```

### Plug no kit

Esta skill (05) deve **automaticamente sugerir** mutation testing quando detectar:
- `package.json` com `coverage > 60%`
- ou `pyproject.toml` com pytest + coverage
- ou ambiente similar maduro

Sugestão padrão:
```
"Coverage está em X% — bom suficiente pra adicionar mutation testing.
 Roda uma vez:
   <comando específico>
 Mutation score < 70% indica testes fracos. Veja policies/quality-gates.md."
```

### Integração com skill 37 (TDD)

Skill 37 (TDD) usa **approved fixtures** para behaviour harness gap.
Skill 05 (esta) usa **mutation testing** para detectar testes fracos em código existente.

Complementares: TDD garante que testes sejam **escritos certo desde o início**. Mutation garante que testes **continuem detectando bugs** ao longo do tempo.

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

## Codigo Limpo

Codigo deve priorizar clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.

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
