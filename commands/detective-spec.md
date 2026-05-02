# detective-spec

Engenharia reversa de specs para sistemas legados. Roda o Detetive que extrai contratos executaveis a partir de codigo existente sem modificar uma linha.

## Sintaxe

```
/detective-spec [escopo] [--phase=N] [--resume]
```

## Argumentos

- `[escopo]` (opcional):
  - vazio → repo inteiro
  - `--module=src/checkout` → so esse modulo
  - `--feature=auth` → so arquivos relacionados a feature

- `--phase=N` (opcional): rodar apenas uma fase (1 a 5). Default: pipeline completo.
- `--resume` (opcional): retomar do ultimo checkpoint em `.detective/state.json`.

## Fluxo

1. Carrega `skills/33-detective-spec/SKILL.md`
2. Verifica `graphify-out/graph.json` e `docs/repo-audit/current.md` (gera se faltarem)
3. Cria `.detective/state.json` (ou retoma se `--resume`)
4. Roda 5 fases sequenciais despachando personas:
   - Fase 1: Reconhecimento (orchestrator)
   - Fase 2: Modulos → `personas/detective-contracts.md`
   - Fase 3: Regras de Negocio → `personas/detective-business-rules.md`
   - Fase 4: Fluxos → `personas/detective-flows.md`
   - Fase 5: ADRs + Sintese → `personas/detective-adrs.md`
5. Output em `_detective_sdd/`
6. Handoff: sumario + top 5 regras + lista de items low-confidence

## Garantias

- **Zero writes** fora de `.detective/` e `_detective_sdd/` (enforced por `policies/detective-write-guardrails.md`)
- Resume-friendly via checkpoints
- Cada spec rastreavel ate `file:line` ou commit-sha

## Quando usar

- legado sem doc / vibe coded
- antes de evoluir feature em modulo desconhecido
- migracao ou reescrita
- onboarding em codebase grande

## Quando nao usar

- projeto novo → use `/spec`
- bug fix localizado → use `/build` ou debugger
- so quer mapa estrutural → use `/audit-repo`

## Exemplos

```
/detective-spec
/detective-spec --module=src/billing
/detective-spec --resume
/detective-spec --phase=3
```

## Pre-requisitos opcionais (recomendados)

```bash
pip install graphifyy && graphify update .
```

## Saida

- `_detective_sdd/00-overview.md` — mapa do sistema
- `_detective_sdd/01-modules/<name>.md` — contratos de modulo
- `_detective_sdd/02-business-rules/<domain>.md` — regras extraidas
- `_detective_sdd/03-flows/<flow>.md` — fluxos end-to-end
- `_detective_sdd/04-adrs/ADR-NNN.md` — decisoes retroativas
- `_detective_sdd/99-traceability.md` — mapa spec → evidencia + items para validacao humana
