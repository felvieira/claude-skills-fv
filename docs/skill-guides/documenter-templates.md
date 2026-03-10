# Documenter Templates Guide

> Guia auxiliar da skill `10-documenter`.  
> Abrir apenas quando precisar dos templates completos de feature doc, ADR, runbook e playbook.  
> Para atualizacoes curtas, usar `templates/doc-update.md`.

---

## Templates disponiveis

1. [Feature Doc](#feature-doc)
2. [API Contract Doc](#api-contract-doc)
3. [ADR — Architecture Decision Record](#adr)
4. [Runbook](#runbook)
5. [Incident Playbook](#incident-playbook)

---

## Feature Doc

> Salvar em `docs/features/<feature-name>/README.md`

```markdown
# [Nome da Feature]

_Status: [Em desenvolvimento | Em producao | Descontinuada]_  
_Atualizado em: YYYY-MM-DD_

## Objetivo

[O que essa feature faz e por que existe. 2-3 frases.
Responda: qual problema resolve, para quem, qual o valor entregue.]

## Regras de Negocio

[Liste TODAS as regras. Seja especifico. Use bullets.]

- Regra 1: [descricao]
- Regra 2: [descricao]
- Regra 3: [descricao com restricoes e excecoes]

## Fluxo do Usuario

[Happy path completo, passo a passo.]

1. Usuario faz X
2. Sistema responde com Y
3. Usuario ve Z
4. [etc]

## Casos de Borda

[Tudo que pode fugir do fluxo principal.]

- Se [condicao], entao [comportamento esperado]
- Se [usuario nao estiver logado], entao [redirecionar para login]
- Se [timeout], entao [mensagem de erro + retry]

## Criterios de Aceitacao

[DADO/QUANDO/ENTAO verificaveis.]

- **DADO** usuario logado **QUANDO** clicar em X **ENTAO** ver Y em menos de 2s
- **DADO** campo vazio **QUANDO** submeter **ENTAO** ver mensagem de erro inline

## Dependencias

- Backend: [endpoints usados]
- Servicos externos: [se houver]
- Features relacionadas: [links]

## Historico de Decisoes

- YYYY-MM-DD: [decisao tomada e motivo]
```

---

## API Contract Doc

> Salvar em `docs/features/<feature-name>/api.md` ou `docs/api/<recurso>.md`

```markdown
# API — [Nome do Recurso ou Feature]

_Versao: v[X]_  
_Atualizado em: YYYY-MM-DD_

## Autenticacao

[Tipo: Bearer JWT | API Key | Session Cookie]

```
Authorization: Bearer <token>
```

## Endpoints

### POST /api/v1/[recurso]

**Descricao:** [O que faz]

**Request:**

```json
{
  "campo1": "string (obrigatorio)",
  "campo2": 123,
  "campo3": "string (opcional)"
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| campo1 | string | Sim | [descricao, max 255 chars] |
| campo2 | number | Sim | [descricao, min 0] |
| campo3 | string | Nao | [descricao, default: null] |

**Response 201:**

```json
{
  "id": "uuid",
  "campo1": "string",
  "createdAt": "2026-03-10T00:00:00Z"
}
```

**Erros:**

| Codigo | Descricao |
|--------|-----------|
| 400 | Payload invalido — campo1 obrigatorio |
| 401 | Token ausente ou expirado |
| 403 | Sem permissao para este recurso |
| 422 | Violacao de regra de negocio: [descricao] |
| 429 | Rate limit atingido |
| 500 | Erro interno — reportar ao suporte |

**Exemplo curl:**

```bash
curl -X POST https://api.exemplo.com/api/v1/recurso \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"campo1": "valor", "campo2": 42}'
```

---

### GET /api/v1/[recurso]

[Repetir estrutura acima]

## Paginacao

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Codigos de Erro Globais

| Codigo | Descricao |
|--------|-----------|
| 401 | Nao autenticado |
| 403 | Sem permissao |
| 404 | Recurso nao encontrado |
| 500 | Erro interno |
```

---

## ADR

> Salvar em `docs/architecture/decisions/adr-NNN-<slug>.md`

```markdown
# ADR-[NNN]: [Titulo da Decisao]

_Data: YYYY-MM-DD_  
_Status: [Proposto | Aceito | Depreciado | Substituido por ADR-XXX]_  
_Autores: [nomes]_

## Contexto

[Descreva o problema ou situacao que gerou a necessidade desta decisao.
O que estava acontecendo? Quais eram as forcas em jogo?
Seja factual e conciso.]

## Decisao

[A decisao tomada, em uma frase clara.
Ex: "Adotaremos PostgreSQL como banco de dados principal para todos os servicos."]

## Alternativas Consideradas

| Alternativa | Pros | Contras |
|-------------|------|---------|
| Opcao A (escolhida) | [pros] | [contras] |
| Opcao B | [pros] | [contras] |
| Opcao C | [pros] | [contras] |

## Consequencias

**Positivas:**
- [beneficio 1]
- [beneficio 2]

**Negativas / Trade-offs:**
- [custo ou limitacao 1]
- [custo ou limitacao 2]

**Riscos:**
- [risco 1 e mitigacao]

## Criterios de Revisao

[Quando ou sob quais condicoes esta decisao deve ser revisitada.
Ex: "Revisar se o volume de dados ultrapassar 10TB ou se latencia de query superar 100ms em P95."]
```

---

## Runbook

> Salvar em `docs/ops/runbooks/<slug>.md`

```markdown
# Runbook: [Nome do Procedimento]

_Atualizado em: YYYY-MM-DD_  
_Owner: [equipe ou pessoa]_  
_Tempo estimado: [X minutos]_

## Quando usar este runbook

[Descreva o cenario ou alerta que dispara este runbook.
Ex: "Alerta: latencia de API acima de 500ms por mais de 5 minutos."]

## Pre-requisitos

- Acesso a [sistema/ferramenta]
- Permissao de [nivel]
- [outros requisitos]

## Passos

### 1. Verificar o problema

```bash
# verificar logs do servico
kubectl logs -n production deployment/api --tail=100

# verificar metricas
# acessar dashboard: [link]
```

[O que voce espera ver. O que indica que o problema e X.]

### 2. [Proxima acao]

[Instrucoes claras, com comandos quando aplicavel.]

### 3. Resolver

```bash
# exemplo de correcao
kubectl rollout restart deployment/api -n production
```

### 4. Verificar resolucao

[Como confirmar que o problema foi resolvido. Qual metrica voltar ao normal.]

## Escalacao

Se os passos acima nao resolverem em [X minutos], escalar para:

- L2: [canal / pessoa]
- L3: [canal / pessoa]

## Pos-resolucao

- [ ] Registrar o incidente em [sistema]
- [ ] Atualizar este runbook se os passos precisarem de ajuste
- [ ] Abrir ticket de post-mortem se o impacto foi significativo
```

---

## Incident Playbook

> Salvar em `docs/ops/runbooks/incident-playbook.md`

```markdown
# Incident Playbook

_Owner: SRE / On-call_  
_Atualizado em: YYYY-MM-DD_

## Severidades

| Severidade | Criterio | Tempo de resposta |
|-----------|----------|-------------------|
| SEV-1 | Sistema fora do ar para todos os usuarios | Imediato (< 5 min) |
| SEV-2 | Funcionalidade critica degradada | < 15 min |
| SEV-3 | Funcionalidade nao critica afetada | < 1 hora |
| SEV-4 | Impacto minimo, workaround disponivel | Proximo dia util |

## Papeis durante o incidente

| Papel | Responsabilidade |
|-------|-----------------|
| Incident Commander (IC) | Coordena o response, toma decisoes |
| Tech Lead | Diagnostica e implementa a correcao |
| Comunicador | Atualiza stakeholders e status page |
| Scribe | Registra a timeline em tempo real |

## Timeline de resposta

### T+0 min: Deteccao

- [ ] Identificar a fonte do alerta
- [ ] Confirmar que e um incidente real (nao falso positivo)
- [ ] Declarar severidade inicial

### T+5 min: Mobilizacao

- [ ] Chamar IC se SEV-1 ou SEV-2
- [ ] Abrir canal de incidente: `#incident-YYYY-MM-DD-slug`
- [ ] Iniciar registro da timeline

### T+15 min: Comunicacao inicial

- [ ] Notificar stakeholders internos
- [ ] Atualizar status page se necessario
- [ ] Definir proximo update (ex: "proximo update em 30 min")

### T+Resolucao: Fechamento

- [ ] Confirmar que o sistema voltou ao normal
- [ ] Notificar stakeholders
- [ ] Atualizar status page para "Resolved"
- [ ] Agendar post-mortem (blameless) para as proximas 48h

## Template de comunicacao de incidente

```
[INCIDENTE ATIVO] SEV-[N] — [Descricao curta]
Hora de inicio: [HH:MM UTC]
Impacto: [o que esta afetado]
Status: [investigando | mitigando | resolvido]
Proximo update: [HH:MM UTC]
```

## Post-mortem (blameless)

Agendar reuniao dentro de 48h com:

1. **Timeline** — o que aconteceu, em ordem cronologica
2. **Root cause** — causa raiz (nao culpa de pessoa)
3. **Impacto** — usuarios afetados, duracao, revenue se aplicavel
4. **O que funcionou bem** — o que ajudou na resolucao
5. **Action items** — o que fazer para evitar recorrencia, com owner e prazo
```

---

## Notas de uso

- Preferir `templates/doc-update.md` para atualizacoes pontuais em docs existentes
- Estes templates sao ponto de partida — adaptar ao contexto do projeto
- ADRs sao imutaveis apos aceitos; mudancas de decisao criam novo ADR com status "Substituido por ADR-XXX"
- Runbooks devem ser testados em staging antes de usar em producao
