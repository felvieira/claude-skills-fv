---
scenario: 35-skill-author
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 380
tokens_out_approx: 920
time_seconds: 18
quality_score: 2.8
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 2
pass_fail: n/a
delta_vs_baseline: n/a
notes: "generic advice, no kit-specific structure, missed eval format, no trigger wording"
---

# Baseline — Criar skill `audit-dependencies`

## Como escrever a SKILL.md

Uma skill bem escrita precisa de algumas seções principais:

### 1. Descrição / Objetivo
Explique o que a skill faz em 1-2 frases. Ex:
> "Analisa package.json e gera relatório de vulnerabilidades CVE, bumps de versão recomendados e breaking changes associados."

### 2. Input esperado
- Arquivo `package.json` (obrigatório)
- Opcional: `package-lock.json` ou `yarn.lock` para análise mais precisa de versões exatas

### 3. Output esperado
- Lista de CVEs por dependência (com severidade: critical, high, medium, low)
- Recomendações de bump de versão (`lodash 4.17.15 → 4.17.21`)
- Breaking changes por major version bump (baseado em changelogs)

### 4. Como executar
A skill deve descrever quais ferramentas usa internamente:
- `npm audit` ou `yarn audit`
- Opcionalmente consultar APIs como Snyk, OSV, ou NPM Advisory

### 5. Seções sugeridas para o SKILL.md

```markdown
# audit-dependencies

## Trigger
Quando o usuário mencionar: "audit", "vulnerabilidade", "CVE", "dependências desatualizadas", "npm audit", "security scan", "package.json".

## Input
- `package.json` (obrigatório)
- `package-lock.json` (opcional, melhora precisão)

## Processo
1. Ler package.json e extrair dependências (dependencies + devDependencies)
2. Rodar `npm audit --json` ou equivalente
3. Para cada CVE encontrado: classificar severidade, listar versão afetada e versão segura
4. Para bumps major: verificar breaking changes conhecidos no CHANGELOG ou docs do pacote
5. Gerar relatório markdown

## Output
- Seção de CVEs por severidade
- Tabela de bumps recomendados
- Notas de breaking changes

## Limitações
- Breaking changes só são detectados se o changelog estiver disponível publicamente
- CVEs podem ter falsos positivos dependendo do contexto de uso
```

## Evals para a skill

Para avaliar se a skill funciona bem, você precisa de cenários de teste:

### Cenário 1 — Package com CVEs conhecidos
Input: `package.json` com versão antiga de `lodash` (< 4.17.21) e `axios` (< 1.6.0)
Esperado: relatório listando CVEs, sugerindo bump correto

### Cenário 2 — Package limpo
Input: `package.json` com todas dependências atualizadas
Esperado: relatório vazio confirmando "sem vulnerabilidades conhecidas"

### Cenário 3 — Major bump com breaking change
Input: `package.json` com `react: "^17.0.0"`
Esperado: sugestão de bump para 18.x com nota sobre breaking changes (StrictMode, concurrent features)

## Critérios de avaliação
- A skill lista todos os CVEs presentes? (completeness)
- As versões sugeridas são reais e corretas? (correctness)
- O relatório é legível e acionável em < 10min? (actionability)
