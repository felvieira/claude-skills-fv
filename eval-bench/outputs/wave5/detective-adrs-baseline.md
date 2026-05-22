---
scenario: detective-adrs
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 210
tokens_out_approx: 890
time_seconds: 18
quality_score: 2.5
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 2
  discipline: 3
pass_fail: baseline
delta_vs_baseline: n/a
notes: "generic ADR template advice; does not probe source artifacts; no rationale extraction from code/config; no consequence modeling"
---

# Baseline — Inferir ADRs Retroativos (sem skill)

## Resposta fria do modelo

Para inferir ADRs retroativos quando ninguém lembra o porquê das decisões originais, você pode seguir esta abordagem:

### 1. Escolha um template de ADR

O formato mais comum é o de Michael Nygard:

```
# ADR-001: Uso de MongoDB

## Status
Aceito (inferido retroativamente)

## Contexto
...

## Decisão
...

## Consequências
...
```

### 2. Para cada tecnologia (MongoDB, RabbitMQ, JWT custom)

Tente responder:
- **Por que foi escolhida?** (consulte commits antigos, documentos de design, código antigo)
- **Quais alternativas existiam?** (consulte RFCs, issues antigas)
- **Quais foram as consequências?** (problemas atuais, benefícios observados)

### 3. MongoDB — possíveis rationales genéricos

- Flexibilidade de schema (dados não estruturados)
- Escalabilidade horizontal
- Integração com Node.js (Mongoose)
- Equipe já conhecia

**Consequências positivas:** schema flexível, fácil prototipagem  
**Consequências negativas:** sem transações ACID nativas (antes do 4.x), consistência eventual

### 4. RabbitMQ — possíveis rationales genéricos

- Desacoplamento entre serviços
- Filas persistentes
- Suporte a múltiplos protocolos (AMQP, STOMP)

**Consequências positivas:** resiliência, async processing  
**Consequências negativas:** infraestrutura adicional, complexidade operacional

### 5. JWT custom — possíveis rationales genéricos

- Evitar dependência externa de auth
- Controle total sobre claims
- Simplicidade para MVP

**Consequências positivas:** flexibilidade  
**Consequências negativas:** risco de implementação incorreta, sem rotação automática de chaves

### 6. Fontes a consultar

- `git log --all --oneline --grep="mongo\|rabbit\|jwt"` para encontrar commits relevantes
- Issues fechadas no GitHub/GitLab
- Documentos de onboarding antigos
- Variáveis de ambiente (`.env.example`)
- `package.json` / `requirements.txt` para versões originais

### 7. Processo recomendado

1. Reúna o time para uma sessão de 1h de "arqueologia"
2. Use sticky notes para hipóteses de rationale
3. Vote nas mais prováveis
4. Documente como "inferido" no status do ADR
5. Adicione campo `confidence: low/medium/high`

### Template final sugerido

```markdown
# ADR-001: Uso de MongoDB

## Status
Aceito — inferido retroativamente (confiança: média)

## Contexto
Sistema precisava de [X]. Equipe avaliou [Y] e [Z].

## Decisão
Adotar MongoDB como banco principal.

## Consequências
**Positivas:** ...
**Negativas:** ...

## Fonte da inferência
Commit [hash], arquivo [path], conversa com [pessoa].
```

---

*Este processo funciona melhor combinado com entrevistas com membros originais da equipe, mesmo que de memória parcial.*
