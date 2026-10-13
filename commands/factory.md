---
description: Linha de montagem multi-agente (Software Factory) — spec-writer → builder em worktree isolado → 4 revisores paralelos (Security, Code, UI, UX) → approver com gate de risco e dashboard visual
---

# /factory — Software Factory Autônoma

Linha de montagem industrial multi-agente para desenvolvimento de features. Transforma um pedido em especificação formal, implementação isolada em git worktree com porta dedicada, banca de 4 revisores paralelos com contrato de veredito estrito e gatekeeper de risco que decide entre auto-merge para a branch principal ou escalonamento para humano.

---

## Diferença Fundamental: `/factory` vs `/loop` vs `/auto`

| Dimensão | `/auto` | `/loop` (Auto-Loop v2) | `/factory` (Software Factory) |
|---|---|---|---|
| **Paradigma** | Prompt-based | Process-based CLI runner | **Linha de montagem multi-agente** |
| **Execução** | Contexto atual da conversa | Subprocesso Node iterativo (`auto-loop.mjs`) | **Orquestrador de sessão + 7 subagentes especializados** |
| **Papéis** | Agente único faz tudo | Agente único iterando em loop de turnos | **Separação estrita de funções (Spec, Build, 4 Reviewers, Approver)** |
| **Isolamento** | Branch atual / local | `--worktree` opcional | **Worktree obrigatório + portas dedicadas (`5100 + 10n`)** |
| **Revisão de Código** | Review pontual final | Polishing pass configurável | **Banca 4D paralela (Security, Code, UI, UX) com veredito `PASS/CHANGES`** |
| **Gate de Merge** | Agente decide ou pergunta | Commit automático se testes passarem | **Approver autônomo com taxonomia de risco (merge vs escalate)** |
| **Fila e Monitoramento** | Conversacional | Argumentos CLI | **Backlog Markdown atômico (`/factory next`) + Dashboard HTML local** |

---

## O Ciclo da Fábrica (The Assembly Line)

```
feature → spec-writer → builder → [security, code, ui, ux] (PARALELO)
                           ▲                        │
                           │                        ▼
                           └── any CHANGES: ◄── WAIT FOR ALL
                               (máx 2 reaberturas)  │
                                                    ▼ all PASS
                             merge to main ◄── APPROVE ── approver ── ESCALATE ──► needs-human
```

### Contrato de Arquivos por Etapa

| Etapa | Agente Responsável | Arquivo Produzido | Contrato Obrigatório |
|---|---|---|---|
| **1. Spec** | `spec-writer` | `factory/jobs/<id>/spec.md` | Critérios de aceitação testáveis e premissas |
| **2. Build** | `builder` | `factory/jobs/<id>/build.md` | Primeira linha: `STATUS: READY` ou `STATUS: BLOCKED` |
| **3. Review** | `reviewer-security` | `round-N/review-security.md` | Primeira linha: `VERDICT: PASS` ou `VERDICT: CHANGES` |
| | `reviewer-code` | `round-N/review-code.md` | Primeira linha: `VERDICT: PASS` ou `VERDICT: CHANGES` |
| | `reviewer-ui` | `round-N/review-ui.md` | Primeira linha: `VERDICT: PASS` ou `VERDICT: CHANGES` |
| | `reviewer-ux` | `round-N/review-ux.md` | Primeira linha: `VERDICT: PASS` ou `VERDICT: CHANGES` |
| **4. Approver** | `approver` | `factory/jobs/<id>/decision.md` | Primeira linha: `APPROVE` ou `ESCALATE` |

---

## Alocação Determinística de Portas

Para que múltiplos jobs e sessões rodem em paralelo sem colisão de servidores de teste web:
Para cada job de índice `n` (`001` → 1, `002` → 2...):

- **Porta do Builder:** `5100 + 10n` (ex.: Job 003 → `5130`)
- **Porta do Revisor de UX:** `5101 + 10n` (ex.: Job 003 → `5131`)
- **Porta do Revisor de UI:** `5102 + 10n` (ex.: Job 003 → `5132`)

---

## Taxonomia de Risco do Gatekeeper (`approver`)

O agente `approver` não faz merge cego. Ele só dá **`APPROVE`** se:
1. Todos os 4 revisores emitiram `VERDICT: PASS`.
2. Todos os critérios da spec possuem evidência de teste aprovada no `build.md`.
3. A simulação `git merge-tree --write-tree main <branch>` tem zero conflitos.

O `approver` DEVE **`ESCALATE`** (requer aprovação humana) se o diff:
- Tocar em **autenticação, senhas, tokens de sessão, permissões ou pagamentos**;
- Alterar **pipelines de CI/CD, deploy ou Dockerfiles de produção**;
- Executar **migrations de banco de dados** ou DDL destrutivo;
- Envolver **decisões de negócio/preço/termos legais** que o agente não deve assumir.

---

## Subcomandos

### 1. Iniciar uma feature específica
```text
/factory Implementar exportação de relatórios em CSV e JSON
```
Cria o job em `factory/jobs/<id>/`, sobe o worktree em `../<repo>-factory/<id>/` na branch `factory/<id>` e orquestra as 5 fases.

### 2. Consumir próximo item do backlog
```text
/factory next
```
Lê `factory/backlog.md`, dá claim atômico no primeiro `- [ ]`, converte para `- [x] <item> → <job-id>` e inicia o job.

### 3. Aprovar job escalado para humano
```text
/factory approve 003-rate-limiting
```
Verifica o checkout principal limpo, faz `git merge --no-ff`, remove o worktree temporário, deleta a branch do job e marca `stage: "merged"`.

### 4. Enviar job para retrabalho
```text
/factory rework 003-rate-limiting Ajustar mensagem de erro para incluir segundos restantes
```
Grava `rework-<k>.md`, reabre o builder com a nota e inicia uma nova rodada de revisão.

### 5. Verificar status dos jobs
```bash
node scripts/factory-cli.mjs status
# ou formato JSON para integrações:
node scripts/factory-cli.mjs status --json
```

### 6. Subir o Dashboard Visual
```bash
node scripts/factory-cli.mjs serve --port 8000
```
Abre o painel web em `http://localhost:8000/dashboard.html` que consome `/api/jobs` e atualiza os cards a cada 2 segundos.

---

## Inicialização em Repositórios Consumidores

Para habilitar a fábrica em qualquer projeto com o Dev Team Kit:

```bash
node scripts/factory-cli.mjs init
```
Isso scaffolda:
- `factory/backlog.md` (fila de tarefas)
- `factory/dashboard.html` (painel web visual)
- `factory/jobs/` (diretório de estado dos jobs)
- `.claude/agents/` (os 7 agentes especializados: `spec-writer`, `builder`, `reviewer-security`, `reviewer-code`, `reviewer-ui`, `reviewer-ux`, `approver`).
