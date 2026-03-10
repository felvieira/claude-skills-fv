# Reviewer Guide

Guia pratico da skill `11-reviewer` para validacao final, formato de rejeicao e re-validacao.

## Checklist de Validacao

O Reviewer verifica quatro areas obrigatorias antes de aprovar:

| Area         | Itens-chave                                              |
|--------------|----------------------------------------------------------|
| Codigo       | nomes descritivos, sem TODO, sem console.log, sem any, DRY, SOLID |
| Testes       | unitarios e E2E passando, cobertura >= 80%, CI green     |
| Seguranca    | Security Review (skill 06) aprovado, OWASP Top 10, sem credenciais expostas |
| Documentacao | feature documentada, API documentada, ADR se houve decisao arquitetural |

Se **qualquer** item falhar, o status final e `REJECTED`. Nao existe aprovacao parcial.

## Como Emitir Rejeicao

Formato curto e direto. Cada finding deve conter tres campos:

```
## REJECTED

### Findings

1. **Skill responsavel:** backend-api (03)
   **Finding:** endpoint POST /users retorna 500 sem payload — falta validacao de body vazio
   **Classificacao:** codigo
   **Prioridade:** alta

2. **Skill responsavel:** qa-testing (05)
   **Finding:** cobertura em 62%, abaixo do gate de 80%
   **Classificacao:** teste
   **Prioridade:** alta

3. **Skill responsavel:** documenter (07)
   **Finding:** endpoint /users sem documentacao de erros 4xx
   **Classificacao:** documentacao
   **Prioridade:** media
```

Listar **todos** os problemas encontrados, nao apenas o primeiro. Cada rejeicao vai para o Orchestrator, que delega para a skill responsavel.

## Gate Real vs Guideline

Nem todo item do checklist tem o mesmo peso:

| Tipo      | Comportamento                          | Exemplo                          |
|-----------|----------------------------------------|----------------------------------|
| **Gate**      | Bloqueia aprovacao. Sem excecao.       | testes falhando, credencial exposta, sem Security Review |
| **Guideline** | Sugere melhoria. Nao bloqueia sozinho. | nomes pouco descritivos, imports desordenados, bundle ligeiramente maior |

Gates sao inegociaveis — se falhar, o status e `REJECTED`. Guidelines geram observacoes no relatorio mas nao impedem deploy se o resto passou.

Regra pratica: se o problema pode causar bug em producao ou expor dados, e gate. Se e melhoria de legibilidade ou convencao, e guideline.

## Workflow de Re-validacao

Apos a skill responsavel corrigir, o Reviewer recebe o retorno. O re-review valida apenas o **delta**:

1. Verificar que o finding original foi corrigido
2. Verificar que a correcao nao introduziu problemas novos no escopo alterado
3. **Nao** re-executar o checklist inteiro — apenas as areas afetadas
4. Se o fix envolver seguranca: exigir Security Review (skill 06) antes
5. Se o fix envolver logica de negocio: exigir re-teste do QA (skill 05)

```
Ciclo: Reviewer rejeita → Orchestrator delega → Skill corrige → Reviewer re-valida delta
```

Maximo de 3 ciclos de rejeicao. Se nao resolver, escalar para o Orchestrator re-avaliar o pipeline.

## Integracao com Orchestrator no Fluxo de Rejeicao

```
Reviewer (11)          Orchestrator (09)         Skill responsavel
     |                       |                         |
     |-- REJECTED ---------->|                         |
     |   (relatorio)         |-- delega correcao ----->|
     |                       |                         |-- corrige
     |                       |<-- handoff de retorno --|
     |<-- re-validar --------|                         |
     |                       |                         |
     |-- APPROVED ---------->|                         |
```

O Reviewer nunca corrige — aponta e retorna. O Orchestrator e o unico que decide roteamento.

## Regras Rapidas

- Nunca aprovar com finding critico de seguranca
- Nunca aprovar sem testes passando
- Ser especifico: arquivo, linha, problema, skill responsavel
- Re-review valida delta, nao tudo
- "Parcialmente corrigido" nao existe — ou passou ou rejeitou de novo
