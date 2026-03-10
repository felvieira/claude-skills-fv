# Migration Refactor Specialist Guide

> Guia auxiliar da skill `23-migration-refactor-specialist`.  
> Abrir apenas quando a migracao for complexa ou quando precisar dos templates de plano de migracao.

---

## O que esta skill faz

O Migration Refactor Specialist reduz risco em mudancas grandes que nao cabem no fluxo comum de feature ou bugfix: upgrades de framework, migracao de auth, extracao de monolito, modernizacao de legacy, rollout incremental com compatibilidade temporaria e rollback claro.

---

## Quando acionar

| Situacao | Acionar? |
|----------|----------|
| Upgrade de framework com breaking changes | Sim |
| Migracao de auth (ex: JWT -> OAuth, Firebase -> custom) | Sim |
| Extracao de modulo de monolito para servico separado | Sim |
| Modernizacao de sistema legado com risco elevado | Sim |
| Refactor estrutural de mais de 3 modulos | Sim |
| Pequenos refactors locais (renomear funcao, mover arquivo) | Nao |
| Upgrades mecanicos de dependencia sem breaking change | Nao |

---

## Padroes de migracao

### Strangler Fig Pattern

Substituir o sistema legado incrementalmente sem parar o servico.

```
         ┌─────────────┐
         │   Facade /  │
Requests │   Proxy     │
────────►│             │
         └──────┬──────┘
                │
        ┌───────┴────────┐
        ▼                ▼
  ┌──────────┐    ┌──────────────┐
  │  Legacy  │    │  New System  │
  │ (antigo) │    │  (novo, %X)  │
  └──────────┘    └──────────────┘
```

- Manter o sistema antigo funcionando durante a transicao
- Rotear % do trafego para o novo progressivamente
- Desligar o legado apenas quando o novo estiver estavel

### Branch by Abstraction

Para refactors internos sem trocar o sistema externo:

```
1. Criar interface/abstraction sobre o codigo a mudar
2. Migrar callers para usar a abstraction
3. Implementar nova versao por tras da abstraction
4. Remover a implementacao antiga
5. Simplificar a abstraction se necessario
```

### Expand-Contract (Parallel Change)

Para mudancas de contrato (API, schema, eventos):

```
Fase 1 — Expand:   adicionar novo campo/endpoint SEM remover o antigo
Fase 2 — Migrate:  migrar todos os consumidores para o novo
Fase 3 — Contract: remover o campo/endpoint antigo
```

---

## Estrutura de um plano de migracao

```markdown
## Plano de Migracao — [Nome]

**Estado atual:** [descricao objetiva do que existe hoje]
**Estado alvo:** [descricao objetiva do que queremos atingir]
**Motivacao:** [por que agora, qual o risco de nao fazer]
**Prazo estimado:** [sprints ou datas chave]

### Fases

| Fase | Descricao | Criterio de entrada | Criterio de saida | Rollback |
|------|-----------|--------------------|--------------------|----------|
| 1 | Setup da abstraction | — | Testes verdes, zero impacto | Remover abstraction |
| 2 | Migracao incremental X% | Fase 1 concluida | X% dos endpoints migrados | Feature flag OFF |
| 3 | Migracao completa | Fase 2 estavel por Nd | 100% migrado, legado desligado | Reversao planejada |

### Compatibilidade temporaria

- Campos legados mantidos ate fase X
- Endpoints antigos com deprecation header a partir de fase Y
- Prazo de suporte ao legado: [data]

### Rollback

- Feature flag para desligar o novo codigo
- Script de reversao de schema (se houver migracao de DB)
- Criterio de ativacao do rollback: [metrica ou incidente]

### Riscos

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| Perda de dados em migracao de schema | Baixa | Alto | Backup antes + rollback script |
| Performance degradada na transicao | Media | Medio | Benchmark antes de cada fase |
```

---

## Checklist por fase

### Antes de comecar

- [ ] Estado atual documentado e compreendido
- [ ] Estado alvo definido com criterios verificaveis
- [ ] Dependencias mapeadas (quem consome o que sera mudado)
- [ ] Estrategia de compatibilidade temporaria escolhida
- [ ] Rollback definido antes de comecar a fase 1

### Durante cada fase

- [ ] Testes existentes continuam passando
- [ ] Nova logica coberta por testes proprios
- [ ] Performance nao degradou em relacao ao baseline
- [ ] Logs e observabilidade adequados para a transicao
- [ ] Feature flag ou toggle disponivel para rollback rapido

### Antes de desligar o legado

- [ ] Zero chamadas ativas para o codigo antigo (confirmar via logs/metricas)
- [ ] Janela de rollback encerrada com seguranca
- [ ] Codigo legado removido ou marcado como deprecated com prazo
- [ ] Documentacao atualizada

---

## Armadilhas comuns

| Armadilha | Como evitar |
|-----------|-------------|
| "Migracao de um sabado" — fazer tudo de uma vez | Sempre usar fases com rollback |
| Testar so o happy path do novo sistema | Incluir testes de regressao do legado ate a fase final |
| Remover o legado antes dos consumidores migrarem | Usar Expand-Contract; so remover quando zero dependencias confirmadas |
| Migracao de DB sem backup + rollback script | Regra absoluta: backup antes, script de reversao testado |
| Subestimar o "tail" de trafego para o legado | Monitorar por periodo real antes de desligar |

---

## Integracao com outras skills

| Skill | Relacao com Migration Refactor Specialist |
|-------|------------------------------------------|
| `Orchestrator` | Coordena o pipeline da migracao entre skills |
| `Backend API` | Implementa as fases de migracao no servidor |
| `Frontend` | Adapta o cliente para novo contrato em paralelo |
| `QA Testing` | Valida cada fase com testes de regressao |
| `Deploy` | Executa o rollout e monitora pos-deploy |
| `Observability SRE` | Monitora sinais durante a transicao |
| `Reviewer` | Valida o plano e o codigo de cada fase |

---

## Evidencia de conclusao

- [ ] Plano de migracao com fases, criterios de entrada/saida e rollback
- [ ] Estrategia de compatibilidade temporaria definida
- [ ] Riscos registrados com mitigacao
- [ ] Handoff entregue para Orchestrator, Backend, Frontend e QA
