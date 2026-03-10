# Data Analytics Guide

> Guia auxiliar da skill `21-data-analytics`.  
> Abrir apenas quando o plano de eventos for complexo ou quando precisar do template completo de `analytics-plan.md`.

---

## O que esta skill faz

O Data Analytics fecha o gap entre feature entregue e medicao real de resultado. Define eventos, naming de tracking, funis, metricas de produto e instrumentacao analitica alinhados com objetivos de negocio — sem PII desnecessaria e com owner claro de cada metrica.

---

## Quando acionar

| Situacao | Acionar? |
|----------|----------|
| Feature nova com criterio de sucesso mensuravel | Sim |
| PO precisar de KPIs para sprint review | Sim |
| Funil existente estiver quebrado ou incompleto | Sim |
| Instrumentacao analitica sem criterio de negocio | Nao |
| Substituir observabilidade operacional (SRE) | Nao |
| Substituir SEO para metricas de busca | Nao |

---

## Principios de naming

### Formato: `verbo_objeto` (snake_case)

```
usuario_cadastrado         ✓
botao_clicado              ✗  (generico demais)
CadastroUsuarioCompletado  ✗  (PascalCase — evitar)
user_registered            ✓  (se o projeto usa en-US)
```

### Convencoes comuns

| Padrao | Exemplo |
|--------|---------|
| Visualizacao de tela | `tela_visualizada`, `page_viewed` |
| Inicio de fluxo | `checkout_iniciado`, `onboarding_started` |
| Conclusao de fluxo | `compra_concluida`, `signup_completed` |
| Erro | `pagamento_falhou`, `upload_error` |
| Interacao | `botao_cta_clicado`, `filtro_aplicado` |

### Regras de naming

- **Verbo no passado** — o evento ja aconteceu
- **Objeto especifico** — nao `item_clicado`, mas `produto_adicionado_ao_carrinho`
- **Sem PII** — nunca incluir email, nome, CPF ou dado pessoal como propriedade de evento
- **Consistencia** — se o projeto usa en-US, usar em todos; se pt-BR, manter em todos

---

## Estrutura de um evento

```json
{
  "event": "compra_concluida",
  "properties": {
    "produto_id": "string",
    "valor_total": "number",
    "metodo_pagamento": "string",
    "origem": "string"
  },
  "owner": "produto",
  "metrica_ligada": "taxa_de_conversao",
  "funil": "checkout"
}
```

### Propriedades minimas por evento

| Propriedade | Tipo | Obrigatorio? |
|-------------|------|-------------|
| `event` | string | Sim |
| `timestamp` | ISO8601 | Sim (geralmente automatico) |
| `session_id` | string | Recomendado |
| `origem` | string | Recomendado |
| Propriedades de contexto da feature | variado | Conforme relevancia |

---

## Taxonomia de funis

### Estrutura basica

```
Etapa 1: Exposicao        → usuario viu o ponto de entrada
Etapa 2: Engajamento      → usuario interagiu com a feature
Etapa 3: Intencao         → usuario iniciou a acao principal
Etapa 4: Conclusao        → usuario completou a acao
Etapa 5: Retencao         → usuario voltou e repetiu
```

### Exemplo: Funil de onboarding

| Etapa | Evento | Metrica |
|-------|--------|---------|
| Cadastro iniciado | `cadastro_iniciado` | 100% (base) |
| Email confirmado | `email_confirmado` | % de completude |
| Perfil preenchido | `perfil_configurado` | % de ativacao |
| Primeira acao real | `primeira_acao_concluida` | % de ativacao completa |

### Metricas-chave por tipo de funil

| Funil | Metrica principal |
|-------|------------------|
| Aquisicao | Taxa de cadastro, custo por lead |
| Ativacao | % usuarios que completam onboarding |
| Engajamento | DAU/MAU, sessoes por semana |
| Conversao | Taxa de compra, revenue por usuario |
| Retencao | Cohort retention D7, D30 |
| Churn | % cancelamentos, motivo de saida |

---

## Template: plano de eventos de feature

```markdown
## Plano de Analytics — [Nome da Feature]

**Objetivo de negocio:** [ex: aumentar taxa de ativacao de novos usuarios]
**Metrica de sucesso:** [ex: +10pp na taxa de conclusao do onboarding em 30 dias]
**Owner:** [equipe ou pessoa responsavel por ler os resultados]

### Eventos

| Evento | Trigger | Propriedades | Funil |
|--------|---------|-------------|-------|
| `feature_visualizada` | usuario acessa a tela | `origem`, `versao` | topo |
| `feature_iniciada` | clique no CTA principal | `origem` | meio |
| `feature_concluida` | acao principal completa | `tempo_decorrido`, `resultado` | fundo |
| `feature_abandonada` | saida sem conclusao | `etapa_abandono` | fundo |

### Funil esperado

```
feature_visualizada → feature_iniciada → feature_concluida
       100%               ~60%                ~30%
```

### Gaps e riscos

- [ ] Propriedade X nao disponivel no backend ainda — agendar para sprint +1
- [ ] Evento Y pode duplicar se usuario recarregar — validar com Frontend
```

---

## Integracao com outras skills

| Skill | Relacao com Data Analytics |
|-------|---------------------------|
| `PO Feature Spec` | PO define objetivos; Data Analytics define como medir |
| `Frontend` | Implementa os eventos no cliente (track calls) |
| `Backend API` | Implementa eventos server-side quando necessario |
| `Documenter` | Registra o plano de eventos como documentacao da feature |
| `Observability SRE` | Complementar — SRE cuida de logs e alertas operacionais |

---

## Evidencia de conclusao

- [ ] Eventos principais definidos com nome, trigger e propriedades
- [ ] Funil mapeado com etapas e metricas esperadas
- [ ] Metrica de sucesso vinculada ao objetivo de negocio
- [ ] Owner da metrica definido
- [ ] Riscos de medicao e lacunas registrados
- [ ] Handoff entregue para Frontend e/ou Backend
