---
scenario: "Usuário disse 'preciso refatorar src/auth/ pra extrair em módulos menores sem quebrar comportamento'. Qual program devo executar e por quê?"
pass: baseline
tokens_in_approx: 180
tokens_out_approx: 210
time_seconds: 4
quality_score: 7
---

# Baseline — sem skill, resposta genérica

## Resposta do assistente genérico

Para refatorar `src/auth/` em módulos menores sem quebrar comportamento, a abordagem padrão é:

1. **Mapeie dependências** — entenda o que `src/auth/` exporta e quem consome.
2. **Escreva testes antes** — garanta cobertura das interfaces públicas atuais.
3. **Extraia incrementalmente** — mova um módulo de cada vez (ex: `token.ts`, `session.ts`, `middleware.ts`).
4. **Valide a cada passo** — rode os testes após cada extração.
5. **Atualize os imports** — use find/replace ou refactor automático do editor.

Sem noção de "programs" do kit, sem roteamento baseado em classificação de task, sem referência a skills específicas (migration-refactor-specialist, TDD, etc.). Resposta genérica de boas práticas de engenharia sem contexto do dev-team-kit.

## Pontuação (1-5)

| Critério | Score |
|---|---|
| specificity | 1 |
| completeness | 2 |
| correctness | 3 |
| actionability | 2 |
| discipline | 1 |
| **TOTAL** | **9/25** |
