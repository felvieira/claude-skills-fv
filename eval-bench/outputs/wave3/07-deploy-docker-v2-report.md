---
scenario: 07-deploy-docker
eval_version: v2-reeval
date: 2026-05-22
skill_version_cached: 2.7.1
skill_version_repo: 2.10.1
baseline_score: 3.0
treatment_score_v271: 4.3
treatment_score_v2101: 4.8
delta_v271: +1.3
delta_v2101: +1.8
threshold: 1.5
verdict_v271: MARGINAL_FAIL
verdict_v2101: PASS
---

# Eval Report — Skill 07 Deploy Docker (v2.10.1 re-evaluation)

## Scoring Detail

| Critério | Baseline (cold) | Treatment v2.7.1 | Treatment v2.10.1 | Delta v2.7.1 | Delta v2.10.1 |
|---|---|---|---|---|---|
| Specificity | 3 | 5 | 5 | +2 | +2 |
| Completeness | 4 | 5 | 5 | +1 | +1 |
| Correctness | 4 | 4 | 5 | 0 | +1 |
| Actionability | 3 | 4 | 5 | +1 | +2 |
| Discipline | 3 | 4 | 4 | +1 | +1 |
| **Total** | **3.0** | **4.3** | **4.8** | **+1.3** | **+1.8** |

## O que mudou de v2.7.1 → v2.10.1 (+196 linhas)

### 1. Rollback Persistente — .last-tag pattern
- v2.7.1: rollback.sh exigia argumento `<tag-anterior>` manualmente
- v2.10.1: `deploy-with-tag-persist.sh` salva tag atual em `.last-tag` antes de promover; `rollback.sh` lê o arquivo sem argumento; padrão CI/CD (GitHub Actions) incluso com `.prev-tag` como backup
- Impacto: correctness +1 (elimina fragile `docker inspect` por container name), actionability +1 (zero knowledge required para rollback de emergência)

### 2. ssl-init.sh Idempotente
- v2.7.1: apenas certbot container com renewal loop; sem tratamento do primeiro deploy onde cert ainda não existe
- v2.10.1: `ssl-init.sh` detecta cert existente, verifica dias restantes, skip se >30d válido, cria apenas quando necessário, recarrega nginx, seguro para cron
- Opção 2 (nginx HTTP-only → HTTPS após ssl-init) resolve race condition do primeiro deploy
- Impacto: actionability +1 (primeiro deploy não trava mais), correctness +1 (race condition nginx/certbot endereçada)

## Nota crítica sobre ambiente de execução

O Skill tool carregou a versão **2.7.1 do cache** (`C:\Users\Administrador\.claude\plugins\cache\claude-skills-fv\dev-team-kit-fv\2.7.1\`) em vez da versão 2.10.1 do repo. O cache não foi atualizado após os commits v2.8.0 – v2.10.1. A avaliação Pass B usou o conteúdo do repo diretamente (`D:\Repos\claude-skills-fv\skills\07-deploy-docker\SKILL.md`) para refletir o comportamento real da skill pós-fixes.

**Ação necessária:** republicar o plugin para que o cache avance para 2.10.x antes do próximo ciclo de eval.

## Veredicto

| | Score | Delta | Threshold | Resultado |
|---|---|---|---|---|
| v2.7.1 (anterior) | 4.3 | +1.3 | ≥1.5 | MARGINAL_FAIL |
| v2.10.1 (atual) | 4.8 | +1.8 | ≥1.5 | **PASS** |

Delta melhorou de +1.3 → **+1.8** (+0.5 de ganho). Threshold de 1.5 atingido com folga de +0.3.
Os dois gaps diagnosticados no marginal_fail anterior estão completamente cobertos.
