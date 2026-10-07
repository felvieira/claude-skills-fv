# Skill Portfolio Health

> Regenerado automaticamente por `scripts/skill-health.mjs` em 2026-10-07T12:30:09.680Z.
> Não editar manualmente — alterações são sobrescritas.

## Sumário

- **Skills:** 85
- **Subagents:** 16
- **Commands:** 47
- **Eval fixtures:** 77
- **Overlaps detectados (cross-section):** 10
- **Dead policies (zero refs externas):** 1

## Flags

### Skills com description curta (<80 chars)

- (nenhuma — todas têm descriptions ricas)

### Skills sem "Trigger em:" no description

- (todas OK)

### Skills sem fixture em `evals/triggers/`

- 8 skills sem fixture:
  - 56-responsive-conversion
  - 57-mobile-ux-foundations
  - 58-i18n-localization
  - 59-closed-loop-revenue
  - 60-app-reference-architecture
  - 65-using-git-worktrees
  - 73-saas-conversion-playbook
  - 79-react-useeffect-review

### Skills sem seção Gotchas (informativo)

- 4/85 têm a seção. Crescer a partir de falhas reais (learned-skills aceitos, bugs que voltaram) — ver skill 35.
- Sem a seção: 01-po-feature-spec, 02-ui-ux-design, 03-backend-api, 04-frontend-integration, 05-qa-testing, 06-security-review, 07-deploy-docker, 08-context-manager, 09-orchestrator, 10-documenter, 11-reviewer, 12-motion-design, 13-marketing-copy, 14-seo-specialist, 15-mobile-tauri, 17-image-generator, 18-repo-auditor, 19-asset-librarian, 20-observability-sre, 21-data-analytics, 22-accessibility-specialist, 23-migration-refactor-specialist, 24-release-manager, 25-ai-integration-architect, 26-prompt-engineer, 27-video-integration-specialist, 28-claude-md-generator, 29-design-intelligence, 30-cost-tracker, 31-session-summary, 32-smart-suggestions, 33-detective-spec, 34-static-analysis, 36-web-asset-generator, 37-tdd-engineer, 38-architecture-deepener, 39-program-router, 40-parallel-dispatcher, 41-blog-publisher, 42-blog-screenshot, 43-canary-deployment, 44-zoom-out, 46-post-deploy-canary-monitor, 47-pattern-conformity, 48-research-prep, 49-context-budget, 50-direct-response-copy, 51-ux-research, 52-ui-polish, 53-doubt-driven-review, 54-video-analysis, 55-marketing-reporting-analytics, 56-responsive-conversion, 57-mobile-ux-foundations, 58-i18n-localization, 59-closed-loop-revenue, 60-app-reference-architecture, 61-content-growth-engine, 62-persona-driven-issue-audit, 63-mobile-paywall-checkout, 64-scroll-storytelling, 65-using-git-worktrees, 66-game-architecture-design, 67-game-engine-development, 68-character-animation-3d, 69-character-pipeline-2d, 70-campaign-research-strategy, 71-campaign-copywriting, 72-campaign-visual-direction, 73-saas-conversion-playbook, 74-web3d-scene-runtime, 75-ffmpeg-media, 76-diagram-validated, 77-frontend-slides, 78-business-discovery, 80-jev-opportunity-scout, 79-react-useeffect-review, 81-artemis-android-testing, 82-retention-loops, 83-growth-action-plan, 84-ai-video-direction

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
| 02-ui-ux-design | 1221 | 43 | 21 prompts |
| 61-content-growth-engine | 1132 | 37 | 25 prompts |
| 86-code-motion-film | 1049 | 17 | 15 prompts |
| 75-ffmpeg-media | 1038 | 23 | 15 prompts |
| 78-business-discovery | 1026 | 11 | 15 prompts |
| 73-saas-conversion-playbook | 1016 | 26 | — |
| 63-mobile-paywall-checkout | 1015 | 21 | 19 prompts |
| 66-game-architecture-design | 1006 | 23 | 15 prompts |
| 62-persona-driven-issue-audit | 1004 | 13 | 23 prompts |
| 69-character-pipeline-2d | 1000 | 12 | 15 prompts |

## Ações sugeridas

- Criar `evals/triggers/<slug>.json` pras skills sem fixture (formato JSON com should_trigger/shouldnt_trigger)
- Revisar overlaps (10) — considerar consolidação ou triggers mais específicos
- Considerar archive/consolidação das policies sem refs externas
