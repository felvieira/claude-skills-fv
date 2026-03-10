# Repo Audit
- Status: inicial preenchido
- Ultima revisao: 2026-03-10
- Stack real: kit de skills em markdown para Claude/OpenCode, com `GLOBAL.md`, `policies/`, `templates/`, `skills/`, `docs/` e `evals/`
- Convencoes detectadas: governanca global persistida, skills numeradas por papel, guides sob demanda, templates curtos, evals versionados e auditoria reutilizavel do proprio repo
- Assets e contexto visual: ha `Image Generator`, `Asset Librarian` e `docs/repo-audit/assets.md`; o sistema espera reutilizacao de contexto visual antes de gerar novos assets
- Testes e qualidade: o repo usa evals documentais em `evals/` e quality gates via policies; nao ha suite automatizada de app, pois o repo e um kit de instrucoes e artefatos
- Deploy e observabilidade: ha skill dedicada de deploy e skill dedicada de observabilidade; orientacoes operacionais vivem em skills, guides e templates
- Riscos/Gaps: README ainda carrega exemplos e trechos historicos mais longos que poderiam ser enxugados; algumas skills tecnicas ainda sao extensas; a qualidade do uso depende de manter `docs/repo-audit/current.md` e `docs/repo-audit/assets.md` atualizados
