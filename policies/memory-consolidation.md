# Memory Consolidation

**Objetivo:** rotina periódica de manutenção do vault de memória persistente — merge de duplicatas, fix de fatos stale, prune do índice. Complementa `policies/memory-tiers.md` (que define a hierarquia 4-tier).

> **Como escrever no vault:** toda nota produzida/atualizada na consolidação segue `policies/memory-write-rules.md` (anti-fabricação, false-absence, recency markers, preâmbulo "For future Claude"). **Contradições** entre notas (decisão revertida não atualizada) não são tarefa deste command — são do `/reconcile-memory`.

**Quando rodar:**
- semanalmente (cron / schedule)
- após período de uso intenso (50+ sessions logadas)
- antes de release major do projeto consumidor (para limpar stale facts)
- sob demanda quando vault crescer demais (> 500 arquivos ou > 100MB)

## O que consolidar

### 1. Logs de sessão (`D:\claude-memory\logs\`)

- **Duplicatas exatas** — dois logs do mesmo dia/projeto com conteúdo similar → merge num só
- **Logs órfãos** — log de projeto que não existe mais → arquivar em `logs/archived/<ano>/`
- **Logs antigos** — > 90 dias sem referência cruzada → arquivar
- **Logs corrompidos** — sem frontmatter ou sem conteúdo útil → flag para review

### 2. Architecture decisions (`D:\claude-memory\architecture\<projeto>\`)

- **Decisões superseded** — nova decisão revoga antiga → marcar antiga `status: superseded` em vez de deletar
- **Decisões duplicadas** — mesmo tópico decidido em 2 lugares → manter uma, linkar outra
- **Decisões stale** — refere-se a stack que não existe mais → flag para review humano
- **Decisões sem owner** — promover para sem-owner ou flag

### 3. Working set / context packs

- **Files referenciados mas inexistentes** — remover entrada
- **Files modificados há > 6 meses sem ser tocados** — demote da working set ativa
- **Duplicatas de path** — mesma file em 2 entries → merge metadata

### 4. Learned skills

- **Score < 0.3 e idade > 30 dias** — archive (low confidence + stale)
- **Score ≥ 0.8 e usado em 5+ sessões** — promote para semantic tier
- **Triggers conflitantes** — duas skills com mesmo trigger → resolver

### 5. Índice principal (`D:\claude-memory\index.md`)

- Reconstruir do zero a partir dos arquivos que sobraram
- Tags consolidadas (mesmo tag escrito de 2 jeitos → escolher canônico)
- Backlinks atualizados

## Workflow seguro

**NUNCA delete sem backup.** Workflow padrão:

1. **Snapshot** — `git commit -am "snapshot pré-consolidação $(date)"` no vault (se for repo) OU `cp -r D:\claude-memory D:\claude-memory.bak.YYYY-MM-DD`
2. **Dry run** — listar tudo que SERIA mudado (sem mudar) e apresentar relatório
3. **Confirmação** — usuário aprova (ou rejeita itens específicos)
4. **Apply** — executar mudanças aprovadas
5. **Verify** — checar que vault ainda navega (índice abre, links funcionam)
6. **Report** — relatório final: X duplicatas merged, Y arquivos archived, Z stale flagged

## Anti-padrões

- **Delete sem archive** — perdeu contexto de sessão antiga = perdeu para sempre
- **Merge automático com conteúdos divergentes** — merge só se similaridade > 90%
- **Archive sem manter buscável** — arquivado deve ser indexado também (busca semântica precisa)
- **Promote sem evidência** — promover skill para semantic tier sem 5+ usos é ruído

## Integração

- `/consolidate-memory` slash command executa o workflow
- skill 30 (cost-tracker) já monitora archive candidates por score — esta policy formaliza o resto
- `policies/memory-tiers.md` define **estrutura**; esta define **manutenção**
- `policies/persistence.md` define **o que persistir**; esta define **o que limpar**

## Cadência recomendada

| Frequência | O que rodar |
|---|---|
| Semanal | dry-run + apply de duplicatas óbvias |
| Mensal | review de stale (> 30 dias) + promote/demote learned skills |
| Trimestral | archive de logs > 90 dias + reconstrução de índice |
| Anual | revisão completa + clean de arquivos > 1 ano não acessados |
