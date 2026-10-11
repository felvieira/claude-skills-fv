# Skill Portfolio Health

> Regenerado automaticamente por `scripts/skill-health.mjs` em 2026-10-11T00:01:41.545Z.
> Não editar manualmente — alterações são sobrescritas.

## Sumário

- **Skills:** 86
- **Subagents:** 16
- **Commands:** 47
- **Eval fixtures:** 86
- **Overlaps detectados (cross-section):** 10
- **Dead policies (zero refs externas):** 1
- **Description inventory on disk:** 56,398 chars / 57,056 UTF-8 bytes (~14,100 proxy tokens; not measured host payload)
- **Catalog entry inventory on disk:** 57,991 chars / 58,649 UTF-8 bytes (name + description; ~14,498 proxy tokens)
- **Root instruction candidates on disk:** 19,804 chars / 19,981 UTF-8 bytes; host loading not observed
- **SessionStart source on disk:** 12,480 chars / 12,518 UTF-8 bytes; emitted payload not observed
- **Observed host payload:** not available; pass --observed <json> with captured systemMessage
- **Fat descriptions (>400 chars):** 74/86 — exceeds design target; host truncation/selection is not inferred

## Flags

### Skills com description curta (<80 chars)

- (nenhuma — todas têm descriptions ricas)

### Skills com description gorda (>400 chars) — catalog bloat

Descriptions acima de 400 chars são inventário local acima do alvo. O host pode carregar, truncar, selecionar ou reformatar o catálogo; só um payload capturado prova o que foi enviado. O body do `SKILL.md` é lazy conforme o host. Teto de design: 160 chars na primeira frase + ≤12 triggers, total ≤400. Ver `policies/skill-manifest.md` e `scripts/skill-catalog-budget.mjs`.

- 74 skills acima do teto. Top 15:
  - 86-code-motion-film — `1266` chars
  - 02-ui-ux-design — `1221` chars
  - 61-content-growth-engine — `1132` chars
  - 75-ffmpeg-media — `1038` chars
  - 78-business-discovery — `1026` chars
  - 73-saas-conversion-playbook — `1016` chars
  - 63-mobile-paywall-checkout — `1015` chars
  - 66-game-architecture-design — `1006` chars
  - 62-persona-driven-issue-audit — `1004` chars
  - 69-character-pipeline-2d — `1000` chars
  - 14-seo-specialist — `996` chars
  - 68-character-animation-3d — `992` chars
  - 67-game-engine-development — `988` chars
  - 84-ai-video-direction — `988` chars
  - 74-web3d-scene-runtime — `975` chars

### Skills sem "Trigger em:" no description

- (todas OK)

### Skills sem fixture em `evals/triggers/`

- (cobertura 100%)

### Skills sem seção Gotchas (informativo)

- 4/86 têm a seção. Crescer a partir de falhas reais (learned-skills aceitos, bugs que voltaram) — ver skill 35.
- Sem a seção: 01-po-feature-spec, 02-ui-ux-design, 03-backend-api, 04-frontend-integration, 05-qa-testing, 06-security-review, 07-deploy-docker, 08-context-manager, 09-orchestrator, 10-documenter, 11-reviewer, 12-motion-design, 13-marketing-copy, 14-seo-specialist, 15-mobile-tauri, 17-image-generator, 18-repo-auditor, 19-asset-librarian, 20-observability-sre, 21-data-analytics, 22-accessibility-specialist, 23-migration-refactor-specialist, 24-release-manager, 25-ai-integration-architect, 26-prompt-engineer, 27-video-integration-specialist, 28-claude-md-generator, 29-design-intelligence, 30-cost-tracker, 31-session-summary, 32-smart-suggestions, 33-detective-spec, 34-static-analysis, 36-web-asset-generator, 37-tdd-engineer, 38-architecture-deepener, 39-program-router, 40-parallel-dispatcher, 41-blog-publisher, 42-blog-screenshot, 43-canary-deployment, 44-zoom-out, 46-post-deploy-canary-monitor, 47-pattern-conformity, 48-research-prep, 49-context-budget, 50-direct-response-copy, 51-ux-research, 52-ui-polish, 53-doubt-driven-review, 54-video-analysis, 55-marketing-reporting-analytics, 56-responsive-conversion, 57-mobile-ux-foundations, 58-i18n-localization, 59-closed-loop-revenue, 60-app-reference-architecture, 61-content-growth-engine, 62-persona-driven-issue-audit, 63-mobile-paywall-checkout, 64-scroll-storytelling, 65-using-git-worktrees, 66-game-architecture-design, 67-game-engine-development, 68-character-animation-3d, 69-character-pipeline-2d, 70-campaign-research-strategy, 71-campaign-copywriting, 72-campaign-visual-direction, 73-saas-conversion-playbook, 74-web3d-scene-runtime, 75-ffmpeg-media, 76-diagram-validated, 77-frontend-slides, 78-business-discovery, 80-jev-opportunity-scout, 79-react-useeffect-review, 81-artemis-android-testing, 82-retention-loops, 83-growth-action-plan, 84-ai-video-direction, 87-reverse-engineer-anything

### Subagents com description curta (<80 chars)

- (nenhum)

### Commands com description curta (<40 chars)

- (nenhum)

### Triggers compartilhados cross-section (overlap)

- `discovery` → skill:01-po-feature-spec, skill:39-program-router, skill:51-ux-research
- `responsivo` → skill:02-ui-ux-design, skill:56-responsive-conversion
- `wcag` → skill:02-ui-ux-design, skill:22-accessibility-specialist
- `skeleton` → skill:04-frontend-integration, skill:57-mobile-ux-foundations
- `loading` → skill:04-frontend-integration, skill:57-mobile-ux-foundations
- `haptic` → skill:12-motion-design, skill:57-mobile-ux-foundations
- `headline` → skill:13-marketing-copy, skill:50-direct-response-copy
- `mobile` → skill:15-mobile-tauri, skill:56-responsive-conversion
- `onboarding` → skill:28-claude-md-generator, skill:57-mobile-ux-foundations
- `lead magnet` → skill:50-direct-response-copy, skill:61-content-growth-engine

### Dead policies (zero referências externas)

- pre-code-ladder — candidato a archive ou consolidação

## Top 10 skills por description quality

| Skill | Chars | Triggers | Fixture |
|-------|-------|----------|---------|
| 86-code-motion-film | 1266 | 26 | 19 prompts |
| 02-ui-ux-design | 1221 | 43 | 21 prompts |
| 61-content-growth-engine | 1132 | 37 | 25 prompts |
| 75-ffmpeg-media | 1038 | 23 | 15 prompts |
| 78-business-discovery | 1026 | 11 | 15 prompts |
| 73-saas-conversion-playbook | 1016 | 26 | 13 prompts |
| 63-mobile-paywall-checkout | 1015 | 21 | 19 prompts |
| 66-game-architecture-design | 1006 | 23 | 15 prompts |
| 62-persona-driven-issue-audit | 1004 | 13 | 23 prompts |
| 69-character-pipeline-2d | 1000 | 12 | 15 prompts |

## Ações sugeridas

- Enxugar 74 descriptions gordas com revisão por fixture: `node scripts/skill-catalog-budget.mjs` (dry-run). Não usar `--apply` sem revisar triggers descartados; o script bloqueia skills cobertas por fixture positiva salvo `--force`.
- Revisar overlaps (10) — considerar consolidação ou triggers mais específicos
- Considerar archive/consolidação das policies sem refs externas
