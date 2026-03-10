# Release Manager Guide

> Guia auxiliar da skill `24-release-manager`.  
> Abrir apenas quando a release for complexa ou quando precisar dos templates completos de changelog e release notes.

---

## O que esta skill faz

O Release Manager profissionaliza a ponta final do fluxo: define o que vai na release, prepara changelog e release notes, define rollout e rollback, e coordena a comunicacao interna. Nao substitui o `Deploy` na execucao tecnica nem o `Reviewer` na validacao de qualidade.

---

## Quando acionar

| Situacao | Acionar? |
|----------|----------|
| Release com multiplas features ou breaking changes | Sim |
| Comunicacao formal para stakeholders necessaria | Sim |
| Rollout gradual (canary, feature flag, % de usuarios) | Sim |
| Release com risco elevado que precisa de rollback explicito | Sim |
| Hotfix simples sem changelog formal | Opcional |
| Deploy automatico de CI sem artefato humano | Opcional |

---

## Ciclo de release

```
1. Fechar escopo
   └── O que entra, o que fica fora, qual versao

2. Preparar artefatos
   ├── Changelog (para o time e historico)
   └── Release notes (para usuarios/stakeholders)

3. Definir rollout
   ├── Estrategia: big bang, canary, feature flag, %
   └── Criterios de progressao

4. Definir rollback
   ├── Criterio de ativacao
   └── Procedimento e responsavel

5. Comunicar
   ├── Canal interno (Slack, email, ticket)
   └── Canal externo se necessario (blog, in-app, email)

6. Monitorar pos-release
   └── Janela de observabilidade antes de fechar o release
```

---

## Versionamento semantico

```
MAJOR.MINOR.PATCH

MAJOR: breaking change — incompativel com versao anterior
MINOR: nova feature compativel com versao anterior
PATCH: bugfix ou melhoria sem quebra de contrato

Exemplos:
  1.0.0 → 2.0.0   migracao de auth com mudanca de contrato
  1.0.0 → 1.1.0   nova feature de notificacoes
  1.0.0 → 1.0.1   correcao de bug no formulario de login
```

**Pre-releases:** `1.1.0-beta.1`, `1.1.0-rc.1`

---

## Template: Changelog

```markdown
# Changelog

## [1.2.0] — 2026-03-10

### Adicionado
- Notificacoes em tempo real para atualizacoes de status de pedido
- Filtro por data no historico de transacoes

### Alterado
- Fluxo de onboarding simplificado: etapa de perfil opcional na primeira sessao
- Performance do carregamento da listagem de produtos melhorada (~40%)

### Corrigido
- Crash ao tentar fazer upload de imagem maior que 10MB
- Tooltip de preco nao aparecia em mobile com zoom habilitado

### Removido
- Endpoint legado `/api/v1/orders` desligado (migrado para `/api/v2/orders` desde v1.1.0)

### Seguranca
- Atualizacao de dependencia X para corrigir CVE-YYYY-NNNNN
```

---

## Template: Release Notes (para usuarios/stakeholders)

```markdown
# Release v1.2.0 — 10 de marco de 2026

## O que ha de novo

**Notificacoes em tempo real**
Voce agora recebe atualizacoes instantaneas sobre o status dos seus pedidos, sem precisar recarregar a pagina.

**Historico com filtro por data**
Encontre transacoes antigas com mais facilidade usando o novo filtro de datas no historico.

## Melhorias
- Onboarding mais rapido: o preenchimento de perfil agora e opcional na primeira sessao.
- Listagem de produtos carrega mais rapido.

## Correcoes
- Upload de imagens grandes nao causa mais erro.
- Tooltip de preco agora aparece corretamente em todos os dispositivos.

---
_Release executada em: 10/03/2026 02:00 UTC_  
_Responsavel: [nome]_
```

---

## Template: Release Plan

```markdown
## Release Plan — v[X.Y.Z]

**Data alvo:** YYYY-MM-DD
**Responsavel:** [nome]
**Aprovador:** [nome]

### Escopo

| Item | Tipo | PR/Ticket |
|------|------|-----------|
| Feature A | Nova feature | #123 |
| Bug B | Correcao | #124 |
| Dependencia C | Seguranca | #125 |

### Fora do escopo desta release

- Feature D (movida para v1.3.0 — complexidade)

### Rollout

- [ ] Estrategia: [big bang / canary 10%→50%→100% / feature flag]
- [ ] Ambiente de staging validado
- [ ] Deploy em producao: [data e hora]
- [ ] Responsavel pelo deploy: [nome]

### Rollback

- **Criterio:** [ex: taxa de erro > 1% em 10 min pos-deploy]
- **Procedimento:** [ex: reverter via `git revert` + re-deploy, ou desativar feature flag X]
- **Responsavel:** [nome]
- **Tempo maximo para decisao:** 30 min

### Comunicacao

| Audiencia | Canal | Quando | Responsavel |
|-----------|-------|--------|-------------|
| Time de produto | Slack #releases | Imediatamente | Release Manager |
| Stakeholders | Email | D+1 | PM |
| Usuarios | In-app banner | D+1 | Marketing |

### Monitoramento pos-release

- Janela de observabilidade: [ex: 2 horas]
- Metricas a acompanhar: [ex: taxa de erro, p95 de latencia, conversao]
- Dashboard: [link]
```

---

## Estrategias de rollout

| Estrategia | Quando usar | Risco |
|-----------|-------------|-------|
| Big bang | Features simples, reversiveis, com testes solidos | Medio |
| Canary (% progressivo) | Features de alto impacto ou incerteza | Baixo |
| Feature flag | Features que precisam de controle pos-deploy | Muito baixo |
| Blue-green | Infra critica, zero-downtime obrigatorio | Baixo |
| Dark launch | Testar em producao sem expor ao usuario | Muito baixo |

---

## Integracao com outras skills

| Skill | Relacao com Release Manager |
|-------|-----------------------------|
| `Reviewer` | Valida qualidade antes de fechar escopo |
| `Deploy` | Executa o rollout definido pelo Release Manager |
| `Observability SRE` | Monitora os sinais durante e apos o rollout |
| `QA Testing` | Confirma que a suite esta verde antes do release |
| `Documenter` | Atualiza docs e changelog no repositorio |

---

## Evidencia de conclusao

- [ ] Escopo da release fechado (o que entra e o que fica fora)
- [ ] Changelog e release notes preparados
- [ ] Rollout definido com estrategia e criterios de progressao
- [ ] Rollback definido com criterio de ativacao e responsavel
- [ ] Comunicacao planejada para cada audiencia relevante
- [ ] Janela de monitoramento pos-release definida
