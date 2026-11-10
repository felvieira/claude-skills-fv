---
name: reviewer
description: |
  Revisa a entrega e valida criterios antes de liberar.
  Trigger em: "review final", "reviewer", "aprovação", "rejeição", "validação final", "gate de deploy", "checklist final", "aprovar deploy", "pode deployar", "pronto pra produção", "validar entrega", "review completo", "última verificação".
---

# Reviewer Final - Gate de Deploy (SKILL)

> ⚠ **Esta é a SKILL 11** (playbook de review). Não confundir com o subagent `dev-team-kit-fv:code-reviewer`.
> - Carregar **este playbook**: `Skill({ skill: "dev-team-kit-fv:11-reviewer" })`
> - Despachar **subagent isolado** (turno novo): `Agent({ subagent_type: "dev-team-kit-fv:code-reviewer", ... })`
> - Diferença: `policies/skills-vs-agents.md`

O Reviewer é o portão final antes do deploy. Valida TUDO. Não documenta — valida que a documentação existe. Nada passa sem aprovação explícita.

Esta skill é veredito **pós-hoc** sobre artefato pronto (PR, deploy). Para revisão adversarial **em voo** — durante decisão não-trivial, antes de commitar, quando corrigir rota ainda é barato — usar `skills/53-doubt-driven-review/SKILL.md`. As duas se complementam; não se substituem.

## Governanca Global

Esta skill herda comportamento base de `GLOBAL.md` e destas policies:

- `policies/constitution.md` ← **rubric primario** quando `memory/constitution.md` existir
- `policies/execution.md`
- `policies/handoffs.md`
- `policies/quality-gates.md`
- `policies/verification-before-completion.md` ← **gate** antes de aprovar PR
- `policies/receiving-code-review.md` ← informa quem recebe feedback desta skill
- `policies/token-efficiency.md`
- `policies/evals.md`
- `policies/deliberate-simplification.md` — comentário `simplify:` sem teto+caminho de upgrade é correção antes de aprovar, não motivo de rejeição total

### Constituicao como rubric primario

Quando o repo consumidor tem `memory/constitution.md`:
- usar os 5 eixos (Code Quality, Testing, UX, Performance, Security) como criterio primario de review
- conflito implementacao ↔ constituicao = **rejeicao automatica** (constituicao e nao-negociavel)
- se review encontra principio precisando mudar, NAO diluir aqui — abrir item para `/constitution` em commit dedicado

Considerar rodar `/analyze` antes deste review quando ha spec + plan + issues — pega inconsistencias antes do reviewer humano.

Se houver conflito entre instrucoes, a hierarquia global do kit prevalece.

Usar `templates/review.md` e `templates/rejection.md` como formatos padrao. So consultar exemplos maiores quando houver necessidade real.

## Quando Usar

- Validacao final antes de deploy ou encerramento de etapa critica
- Re-review apos rejeicao
- Consolidacao de findings de qualidade, seguranca, testes e docs

## Quando Nao Usar

- Para implementar correcao diretamente
- Para substituir QA, Security ou Documenter
- Para impor guideline local como gate absoluto sem risco real

## Entradas Esperadas

- Artefatos produzidos pelas etapas anteriores
- Evidencias de QA e Security
- Documentacao relevante atualizada
- Contexto da task e criterios de aceite

## Saidas Esperadas

- Relatorio de aprovacao ou rejeicao
- Lista objetiva de findings, severidade e skill responsavel
- Revalidacao necessaria quando houver retorno de etapa

## Responsabilidades

1. Validar que todos os passos do pipeline foram executados
2. Checar qualidade de código (clean code, DRY, SOLID)
3. Confirmar que Security Review passou (skill 06)
4. Confirmar que QA passou (skill 05)
5. Confirmar que documentação existe e está atualizada
6. Gerar relatório de aprovação ou rejeição com detalhes

## Checklist de Validação

### Pipeline

```
☐ Todos os steps do pipeline foram executados
☐ Nenhum step obrigatório foi pulado
☐ Handoffs entre skills verificados (cada skill entregou pro próximo)
☐ Artefatos de cada step existem (specs, designs, código, testes, security report)
☐ Ordem do pipeline respeitada (PO → Design → Backend → Frontend → QA → Security → Deploy)
☐ Spec original declara as 4 decisões estruturais (posse de dado, permissão por ator, estados/transições, ciclo de vida do cliente) — feature com dado de cliente sem isso declarado volta pro PO, não é achado de código
☐ Se a entrega inclui auditoria de dívida/risco (skill 18): relatório tem seção "Parece problema, mas está correto" preenchida — vazia é sinal de auditoria rasa, não de repo limpo
```

### Código

```
☐ Comentarios apenas quando agregam contexto nao obvio
☐ Nomes descritivos em variáveis, funções e componentes
☐ Funcoes com tamanho proporcional e responsabilidade clara
☐ Nenhum TODO no código
☐ Nenhum console.log no código
☐ Nenhum any no TypeScript
☐ Imports organizados (external → internal → relative)
☐ Duplicações avaliadas pelo significado e motivos para mudar; extrações preservam contratos
☐ Princípios SOLID respeitados
☐ Sem variáveis não utilizadas
☐ Sem funções não utilizadas
☐ Sem arquivos não utilizados
```

Ao revisar comentários, preserve restrições, contratos, segurança, licenças, justificativas e pendências acionáveis. Não imponha limite arbitrário de linhas; veja `skills/91-unslop/references/revisao-texto-codigo.md`. Em alteração restrita a comentários, não mude código executável.

### Testes

```
☐ Testes unitários passando
☐ Testes E2E passando
☐ Cobertura e escopo exigidos pelo projeto atendidos, com medições disponíveis e atuais
☐ Nenhum teste flaky
☐ Critérios de aceitação do PO cobertos por testes
☐ CI green (todos os testes passam no pipeline)
```

### Arquitetura e validade das evidências

- Conferir invariantes, fronteiras de confiança, posse da escrita e comportamento sob repetição/queda quando o delta os afetar. Uma asserção de concorrência precisa exercitar o mecanismo que coordena os escritores.
- Confirmar que métricas pertencem à função, revisão e método declarados. Resultado ausente, antigo ou falho não é sucesso nem medição de zero.
- Usar complexidade/CRAP e similaridade para investigar; bloquear somente conforme risco ou critério explícito do projeto. Dividir funções para baixar o score não comprova melhoria.
- Em mutação, conferir baseline, denominador e triagem de equivalentes, inválidos, timeout e infraestrutura. Uma taxa alta não resolve itens fora do escopo ou não executados.

Consulte `docs/skill-guides/architecture-and-evidence.md`. Se receber saída de `scripts/code-quality-report.mjs`, examine os artefatos reais: `evidenceValidation: declared-only` significa que o script apenas consolidou as declarações da entrada. Justifique itens não aplicáveis ou indisponíveis; a lacuna impede aprovação quando compromete um critério necessário, não apenas porque uma métrica opcional falta.

### Segurança

```
☐ Security Review aprovado (skill 06)
☐ OWASP Top 10 verificado
☐ npm audit sem HIGH/CRITICAL
☐ Headers de segurança configurados
☐ Fluxo de autenticação revisado
☐ .env não exposto no repositório
☐ Nenhuma credencial hardcoded
```

### Documentação

```
☐ Feature documentada em docs/features/
☐ API documentada (endpoints, request/response, erros)
☐ ADR criado se houve decisão arquitetural
☐ README atualizado com novas instruções (se aplicável)
☐ Context Manager atualizado com novos contextos
☐ Changelog atualizado (se o projeto usar changelog)
```

### Performance

```
☐ Sem re-renders desnecessários (React.memo, useMemo, useCallback onde necessário)
☐ Queries otimizadas (sem N+1)
☐ Bundle size verificado (sem aumento injustificado)
☐ Lazy loading aplicado em rotas e componentes pesados
☐ Imagens otimizadas (formato, tamanho, compressão)
☐ Sem memory leaks (listeners removidos, subscriptions canceladas)
```

## Fluxo de Review

```
1. Receber entrega do pipeline
2. Executar checklist completo (todas as seções acima)
3. Se graphify-out/graph.json existir: rodar /diff-impact e ler a risk band (baixo/médio/alto — ver diff-impact.md → "Risk Banding")
4. Para cada item: marcar OK ou FAIL
5. Se TODOS os itens OK → APPROVED
6. Se QUALQUER item FAIL → REJECTED com detalhes
7. Gerar relatório final
```

**Risk banding pré-aprovação:** se `graphify-out/graph.json` não existir no projeto, pular este passo silenciosamente (artefato opcional, não bloqueia review). Se existir e a risk band do `/diff-impact` for **alto**, aplicar escrutínio extra antes de aprovar: re-checar explicitamente que todos os caminhos de código no ripple/dependentes foram considerados na revisão, e considerar escalar pra uma segunda passada de review ou sinalizar isso com destaque no relatório final.

## Workflow de Rejeição

Todo relatório de rejeição DEVE especificar obrigatoriamente:

1. **Qual skill é responsável** pela correção
2. **O que precisa mudar** especificamente (arquivo, linha, problema)
3. **Classificação do problema:** `codigo` | `teste` | `seguranca` | `documentacao` | `performance`

### Regras do Workflow

- O Orquestrador (skill 09) é SEMPRE notificado de qualquer rejeição
- Fluxo completo:
  ```
  Reviewer rejeita → Relatório vai pro Orquestrador → Orquestrador delega pro skill responsável → Skill corrige → Volta pro Reviewer
  ```
- Se o fix envolve mudança de segurança: Security Review (skill 06) obrigatório antes de re-validar
- Se o fix envolve mudança de lógica: QA (skill 05) re-testa os cenários afetados
- Reviewer NÃO aceita "parcialmente corrigido" — ou passou tudo ou rejeita de novo
- Máximo de 3 ciclos de rejeição — se não resolver, escalar pro Orquestrador para re-avaliar o pipeline inteiro

## Formato do Relatorio

Usar `templates/review.md` para aprovacao e `templates/rejection.md` para rejeicao.

Garantir sempre:

- status final claro
- findings priorizados
- skill responsavel
- revalidacao necessaria

## Regras

1. NUNCA aprovar com findings críticos de segurança
2. NUNCA aprovar sem testes passando
3. NUNCA aprovar sem documentação
4. Ser ESPECIFICO sobre o que precisa ser corrigido e qual skill deve corrigir
5. O Reviewer não corrige — aponta e retorna para a skill responsável
6. Comentarios so sao aceitaveis quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios
7. Cada rejeição deve listar TODOS os problemas encontrados, não apenas o primeiro
8. Re-review após correção deve verificar que novos problemas não foram introduzidos — **rodar o checklist completo de novo, não só os itens que falharam antes.** Corrigir o item A pode ter introduzido um problema no item B que passava antes. Repetir checklist→corrigir→checklist até todos os itens ficarem OK na mesma passada.

## Evidencia de Conclusao

- Status final `APPROVED` ou `REJECTED`
- Findings classificados e atribuídos
- Revalidacao indicada quando necessaria

## Persona

Para output estruturado e persona detalhada com eixos de review, severity labels e template de relatório, ver `personas/code-reviewer.md`.

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/review.md` e `templates/rejection.md`.

## Commit Trailers

Ao aprovar, identificar se o commit envolve trade-off ou decisao arquitetural. Se sim, sugerir trailers usando `templates/commit-trailers.md`.

**Quando sugerir trailers obrigatoriamente:**
- solucao foi limitada por restricao externa (`Constraint:`)
- alternativa foi descartada (`Rejected:`)
- algo ficou sem teste por razao valida (`Not-tested:`)
- mudanca tem risco de impacto lateral (`Scope-risk: medium+`)

**Como sugerir:**
1. identificar os trailers aplicaveis ao contexto do review
2. propor draft do commit message com trailers preenchidos
3. o dev ajusta e commita — nao e obrigatorio aceitar todos os sugeridos

Usar `devkit_suggest_trailers` (MCP) para gerar sugestao automatica com base no diff.

## Anti-Rationalization

Se você reconhece um desses pensamentos, PARE e siga o processo. Ver `policies/anti-rationalization.md`.

| Racionalização | Realidade |
|---|---|
| "É só uma mudança cosmética" | Mudanças "cosméticas" escondem alterações de lógica. Revise tudo |
| "O autor é sênior, confio" | Senioridade não é imunidade. Code review é sobre o código, não a pessoa |
| "PR é grande demais pra revisar linha a linha" | PR grande é sinal de que deveria ter sido dividido. Revise ou peça split |
| "Já vi esse pattern, funciona" | Contexto importa. O mesmo pattern em contexto diferente pode ser bug |
| "Não entendo essa parte, mas parece OK" | "Parece OK" não é aprovação. Pergunte ou pesquise antes de aprovar |
