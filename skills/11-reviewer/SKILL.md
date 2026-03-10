---
name: reviewer
description: |
  Skill do Reviewer Final para validação completa antes do deploy. Use quando precisar validar que todos
  os passos do pipeline foram executados, checar qualidade de código, confirmar segurança, confirmar QA,
  confirmar documentação, ou gerar relatório de aprovação/rejeição. Trigger em: "review final", "reviewer",
  "aprovação", "rejeição", "validação final", "gate de deploy", "checklist final", "aprovar deploy",
  "pode deployar", "pronto pra produção", "validar entrega", "review completo", "última verificação".
---

# Reviewer Final - Gate de Deploy

O Reviewer é o portão final antes do deploy. Valida TUDO. Não documenta — valida que a documentação existe. Nada passa sem aprovação explícita.

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
```

### Código

```
☐ Zero comentários no código — código é auto-explicativo
☐ Nomes descritivos em variáveis, funções e componentes
☐ Funções com no máximo 20 linhas
☐ Nenhum TODO no código
☐ Nenhum console.log no código
☐ Nenhum any no TypeScript
☐ Imports organizados (external → internal → relative)
☐ Sem código duplicado (DRY)
☐ Princípios SOLID respeitados
☐ Sem variáveis não utilizadas
☐ Sem funções não utilizadas
☐ Sem arquivos não utilizados
```

### Testes

```
☐ Testes unitários passando
☐ Testes E2E passando
☐ Cobertura >= 80%
☐ Nenhum teste flaky
☐ Critérios de aceitação do PO cobertos por testes
☐ CI green (todos os testes passam no pipeline)
```

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
☐ Changelog atualizado
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
3. Para cada item: marcar OK ou FAIL
4. Se TODOS os itens OK → APPROVED
5. Se QUALQUER item FAIL → REJECTED com detalhes
6. Gerar relatório final
```

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

## Template do Relatório

```markdown
# Review Final — [Nome da Feature]

**Data:** [YYYY-MM-DD]
**Status:** APPROVED | REJECTED

## Resumo
[1-2 frases sobre o que foi entregue e o resultado geral]

## Pipeline
- [OK/FAIL] Todos os steps executados
- [OK/FAIL] Nenhum step obrigatório pulado
- [OK/FAIL] Handoffs verificados

## Código
- [OK/FAIL] Zero comentários
- [OK/FAIL] Nomes descritivos
- [OK/FAIL] Funções max 20 linhas
- [OK/FAIL] Sem TODO
- [OK/FAIL] Sem console.log
- [OK/FAIL] Sem TypeScript any
- [OK/FAIL] Imports organizados
- [OK/FAIL] DRY
- [OK/FAIL] SOLID

## Testes
- [OK/FAIL] Unitários passando
- [OK/FAIL] E2E passando
- [OK/FAIL] Cobertura >= 80%
- [OK/FAIL] Sem testes flaky
- [OK/FAIL] Critérios de aceitação cobertos

## Segurança
- [OK/FAIL] Security Review aprovado
- [OK/FAIL] OWASP verificado
- [OK/FAIL] npm audit clean
- [OK/FAIL] Headers de segurança
- [OK/FAIL] Auth flow revisado
- [OK/FAIL] .env não exposto

## Documentação
- [OK/FAIL] Feature documentada em docs/features/
- [OK/FAIL] API documentada
- [OK/FAIL] ADR criado (se aplicável)
- [OK/FAIL] README atualizado
- [OK/FAIL] Context Manager atualizado

## Performance
- [OK/FAIL] Sem re-renders desnecessários
- [OK/FAIL] Queries otimizadas
- [OK/FAIL] Bundle size verificado
- [OK/FAIL] Lazy loading aplicado
- [OK/FAIL] Imagens otimizadas

## Decisão

**[APPROVED/REJECTED]**

[Se REJECTED:]
Itens que precisam correção:
1. [Item FAIL] — [Descrição específica do problema] — [Skill responsável pela correção]
2. [Item FAIL] — [Descrição específica do problema] — [Skill responsável pela correção]

Ação: retornar para [skill X] para correção e re-submeter para review.
```

## Regras

1. NUNCA aprovar com findings críticos de segurança
2. NUNCA aprovar sem testes passando
3. NUNCA aprovar sem documentação
4. Ser ESPECÍFICO sobre o que precisa ser corrigido e qual skill deve corrigir
5. O Reviewer não corrige — aponta e retorna para a skill responsável
6. Código limpo não precisa de comentários — se precisa de comentário, o código não está claro
7. Cada rejeição deve listar TODOS os problemas encontrados, não apenas o primeiro
8. Re-review após correção deve verificar que novos problemas não foram introduzidos
