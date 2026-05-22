---
scenario: orchestrator-csv-pdf-export
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 5800
tokens_out_approx: 2900
time_seconds: 68
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.7
notes: "Classified task as multi-layer feature, applied vertical slicing, named skills by number, specified model tier per step, placed human gates with explicit criteria, flagged async job risk for S3, no implementation code leaked"
---

# Plano de Execução — Export CSV/PDF de Relatórios (Next.js + Prisma + S3)

## 1. Classificação da Task

| Campo | Valor |
|---|---|
| Tipo | Feature multi-camada (DB + back + S3 + front + assincronia) |
| Complexidade | Média–Alta |
| Risco | Médio (dados do usuário, S3 policies, jobs longos podem timeout) |
| Modo de pipeline | **A — `/pipeline` Clássico** (stack definida, escopo claro) |
| Multi-camada? | **Sim → vertical slicing obrigatório** |

Não é Modo B (`/pipeline-discovery`) porque:
- stack nomeada (Next.js, Prisma, S3)
- escopo delimitado ("export CSV/PDF de relatórios")
- não precisa publicar PRD em issue tracker antes de começar

---

## 2. Pre-Execution Gate

**Perguntas que bloqueiam o plano se não respondidas:**

1. **Que relatórios?** Quais entidades/queries Prisma alimentam cada relatório? Tamanho estimado de linhas?
2. **Síncrono ou assíncrono?** Relatórios pequenos (<5k linhas) → download direto. Relatórios grandes → job assíncrono com presigned URL por email/webhook.
3. **PDF via?** Puppeteer (render HTML → PDF), `@react-pdf/renderer` (React → PDF), ou `pdfkit` (programático)? Escolha muda infra (Lambda mem, cold start).
4. **Quem pode exportar quê?** Há filtragem por tenant/role (RBAC)? A query do relatório já respeita isso ou vai vazar dados cross-tenant?
5. **S3 bucket já existe** com CORS configurado? Ou criar do zero?

**Veredito:** Se respostas 1–2 forem conhecidas, prosseguir. Se não, gate humano aqui antes de qualquer implementação.

---

## 3. Pesquisa Obrigatória (search-first + source-driven)

Antes de invocar Backend/Frontend:

- [ ] **`docs/repo-audit/current.md`** — se inexistente, invocar Skill 18 (Repo Auditor). Confirmar:
  - versão do Next.js (App Router vs Pages Router muda o streaming handler)
  - se há `BullMQ`/`pg-boss`/`inngest` ou equivalente já instalado (job queue)
  - se há lib de PDF já instalada
  - bucket S3 existente e variáveis de env (`AWS_BUCKET`, `AWS_REGION`)
- [ ] **Context7 MCP** para `aws-sdk v3` (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`) — API mudou de v2 para v3
- [ ] **Context7 MCP** para biblioteca de PDF escolhida (pdfkit / @react-pdf / puppeteer)
- [ ] **Grep** por `s3`, `export`, `csv`, `pdf`, `download` no repo — detectar implementações parciais ou utilitários reutilizáveis

---

## 4. Vertical Slicing (feature multi-camada — obrigatório)

**PROIBIDO** plano "escrever toda a API, depois todo o front". Cada slice entrega ponta-a-ponta.

### Plano de Slices

| # | Slice | Worker | Inclui | Depende de |
|---|---|---|---|---|
| 0 | **Foundation S3 + lib PDF** | A | `lib/s3.ts` (upload + presigned URL), escolha + install da lib PDF, variáveis de env, IAM policy mínima | nada |
| 1 | **Export CSV — 1 relatório** (o mais simples) | A | Prisma query do relatório, streaming CSV com `csv-stringify`, endpoint `GET /api/reports/[id]/export?format=csv`, botão de download na UI, teste E2E do happy path | Slice 0 |
| 2 | **Export PDF — mesmo relatório** | A (ou B em paralelo) | template HTML/React do PDF, geração do buffer, upload S3, endpoint `GET /api/reports/[id]/export?format=pdf`, presigned URL retornada, botão na UI | Slice 0 |
| 3 | **Export assíncrono (job + notificação)** | A | job queue (BullMQ ou equivalente), worker que gera arquivo + faz upload S3 + envia link por email, endpoint `POST /api/exports` + polling/webhook, UI de "export em andamento" | Slices 1+2 |
| 4 | **Extensão para demais relatórios** | A | adaptar Slices 1–2 para os outros relatórios mapeados no repo-audit | Slice 1+2 |

> Slice 2 pode rodar em paralelo com Slice 1 após Slice 0 fechar, se workers disponíveis. Slices 1 e 2 não compartilham código além de `lib/s3.ts`.

---

## 5. Pipeline Base — Dentro de Cada Slice

```
[Slice 0 — Foundation]
Repo Auditor (18, Deep) →
PO (01, Balanced) — spec curta: contratos de lib/s3.ts + choice PDF lib →
Backend (03, Balanced) — implementar lib/s3.ts + env vars + smoke test →
Security (06, Deep) — IAM policy least-privilege, bucket CORS, presigned URL TTL →
Reviewer (11, Deep)

GATE HUMANO: aprovar lib/s3.ts e choice de PDF lib antes de prosseguir

[Slice 1 — CSV]
PO (01, Balanced) — acceptance criteria: quais colunas, encoding UTF-8 com BOM?, rows limit →
Backend (03, Balanced) — Prisma query + csv-stringify streaming + endpoint →
Frontend (04, Balanced) — botão download + loading state + erro handling →
QA (05, Balanced) — teste unitário do formatter, E2E do download →
Security (06, Deep) — validar authz: usuário só exporta seus dados →
Reviewer (11, Deep)

GATE HUMANO: revisar query Prisma (performance em dataset grande)

[Slice 2 — PDF]
PO (01, Balanced) — acceptance: layout do PDF, logo, paginação →
UI/UX (02, Balanced) — template visual do PDF (React-pdf ou HTML template) →
Backend (03, Balanced) — geração buffer + upload S3 + presigned URL →
Frontend (04, Balanced) — botão → request → polling ou direct download →
QA (05, Balanced) — teste geração PDF com dados reais, teste do presigned URL →
Security (06, Deep) — presigned URL TTL, S3 object ACL, não expor S3 path diretamente →
Reviewer (11, Deep)

[Slice 3 — Async job, se necessário]
PO (01, Balanced) — spec do job: timeout, retry, entrega por email ou webhook →
Backend (03, Balanced) — worker + queue + job table Prisma (status: pending/done/failed) →
Frontend (04, Balanced) — UI de progresso + notificação →
Observability SRE (20, Deep) — logs estruturados do job, alertas de falha, dead-letter queue →
QA (05, Balanced) — E2E do fluxo async + teste de falha/retry →
Security (06, Deep) — authn do worker, não expor jobs de outros tenants →
Reviewer (11, Deep)

GATE HUMANO: decidir se Slice 3 entra nesta sprint ou é backlog

[Final — todos slices merged]
Release Manager (24, Balanced) — changelog, feature flag se houver →
Deploy (07, Balanced/Deep) — env vars em prod, S3 CORS em prod, memory do Lambda →
```

---

## 6. Skills Puladas com Justificativa

| Skill | Pulada? | Justificativa |
|---|---|---|
| Design Intelligence (29) | sim | não é overhaul de UI, são botões de export em tela existente |
| Motion (12) | sim | loading spinner padrão é suficiente |
| Copy (13) | sim | "Exportar CSV" / "Exportar PDF" é copy convencional |
| SEO (14) | sim | funcionalidade interna de SaaS, não indexada |
| Image Generator (17) | sim | logo no PDF vem de asset existente do repo |
| Data Analytics (21) | **não pular** — rastrear evento `export_triggered`, `export_completed`, `export_failed` por formato e relatório |
| Accessibility (22) | **não pular** — botão de export deve ter `aria-label` correto, estado de loading anunciado para screen readers |
| AI Integration (25) | sim | não envolve IA |

---

## 7. Riscos e Blockers

| Risco | Severidade | Mitigação |
|---|---|---|
| PDF generation (Puppeteer) mata Lambda por memória | Alto | aumentar memory limit ou usar container; avaliar alternativa sem headless browser |
| Export cross-tenant: query sem filtro de tenant/userId | Alto | Security obrigatório em Slice 1 antes de merge |
| CSV com encoding errado → Excel abre lixo | Médio | UTF-8 BOM para compatibilidade Windows; testar com Excel real |
| Presigned URL expirada antes do usuário clicar | Médio | TTL ≥ 15 min; comunicar expiração na UI |
| Relatório grande → timeout da requisição HTTP | Alto | Slice 3 (async job) é a solução; não tentar servir 100k linhas síncronos |
| S3 CORS bloqueando download direto no browser | Médio | testar CORS em dev com bucket de teste antes de prod |
| Arquivo temporário acumulando em S3 | Baixo | lifecycle rule S3 para deletar exports após N dias |

---

## 8. Gates Humanos — Resumo

| Gate | Quando | Critério de aprovação |
|---|---|---|
| **G0 — Pre-execution** | Antes de qualquer slice | Respostas às 5 perguntas do item 2 confirmadas |
| **G1 — Foundation** | Após Slice 0 | `lib/s3.ts` revisado, IAM policy aprovada, escolha PDF lib confirmada |
| **G2 — Query review** | Após Slice 1 (CSV) | Query Prisma com EXPLAIN ANALYZE aceitável, authz validado |
| **G3 — Async decision** | Antes de Slice 3 | Decidir se export assíncrono entra nesta sprint ou fica para próxima |
| **G4 — Security sign-off** | Antes de Deploy | Todos os Security reviews dos slices aprovados; S3 policy em prod revisada |

---

## 9. Handoff — Próxima Etapa

**Etapa atual:** plano apresentado. Aguardando aprovação ou ajuste de escopo (especialmente G0).

**Próxima skill:** `Skill({ skill: "dev-team-kit-fv:18-repo-auditor" })` para gerar `docs/repo-audit/current.md` e confirmar:
- qual relatório atacar primeiro no Slice 1
- se job queue já existe no projeto
- qual lib PDF está disponível ou deve ser instalada

Após auditoria, despachar Slice 0:

```markdown
## Handoff → Backend (Slice 0)
- Contexto: ver docs/repo-audit/current.md seções S3, PDF libs, job queue
- Objetivo: lib/s3.ts (upload + presigned URL) + instalar lib PDF escolhida + env vars documentadas
- Entrada: AWS_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (confirmar nomes reais no .env)
- Output esperado: lib/s3.ts com assinatura getPresignedUrl(key, ttl) + uploadBuffer(key, buffer, contentType); smoke test passa
- Search-first: Context7 MCP para @aws-sdk/client-s3 v3 + @aws-sdk/s3-request-presigner
```

---

## 10. Critério de Conclusão

A feature está pronta quando:

- [ ] Slices 1 e 2 passaram por QA + Security + Reviewer
- [ ] CSV abre corretamente no Excel (UTF-8 BOM, sem encoding issues)
- [ ] PDF renderiza com logo + paginação conforme template aprovado
- [ ] Authz validado: usuário só acessa exports dos seus dados
- [ ] Presigned URLs com TTL configurado e comunicado na UI
- [ ] S3 CORS funcional em prod
- [ ] Evento de analytics disparado em export_triggered e export_completed
- [ ] Botão de export acessível (aria-label, loading state)
- [ ] Slice 3 (async) em prod **ou** documentado como backlog com critério de ativação (ex: relatório > X linhas)
- [ ] Documenter (10) atualizou docs internos de exportação
- [ ] Release Manager preparou changelog

---

**Nota de disciplina:** Este plano não contém código de implementação. Implementação é responsabilidade de Backend (03) e Frontend (04) dentro de cada slice. O Orquestrador para aqui e aguarda G0 antes de invocar o Repo Auditor.
