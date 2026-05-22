---
scenario: 35-skill-author
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 1840
tokens_out_approx: 1680
time_seconds: 34
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: n/a
delta_vs_baseline: +1.7
notes: "cited real kit conventions (numeracao, template obrigatorio, 8-lugar-checklist), correct next number (41), eval table matches evals/skill-quality.md rubric, trigger words explicit, overlap check against skill 34 called out"
---

# Treatment — Criar skill `audit-dependencies` (skill 41)

## Fase 1: Spec da skill — gap check

Antes de criar, verificar overlap com skills existentes:

- **Skill 06 (Security Review):** review manual, nao automatizado. Nao cobre npm audit.
- **Skill 34 (Static Analysis):** Semgrep/CodeQL em codigo fonte. Nao le package.json nem CVE databases.
- **Skill 07 (Deploy Docker):** nao toca deps JS.

Gap real: nenhuma skill do kit analisa dependencias de pacotes (npm/yarn/pnpm) para CVEs,
bumps de versao e breaking changes. Skill 41 preenche esse gap sem duplicar skill 34.

Proxima skill livre: **41** (ultima ocupada: 40-parallel-dispatcher).

---

## Fase 2: SKILL.md completo para `skills/41-audit-dependencies/SKILL.md`

```markdown
---
name: audit-dependencies
description: |
  Analisa package.json e gera relatorio de CVEs, bumps de versao recomendados e breaking changes.
  Use antes de releases, em PRs que adicionam/atualizam deps, ou em auditorias periodicas de seguranca.
  Trigger em: "audit", "auditoria de dependencias", "CVE", "vulnerabilidade de pacote",
  "npm audit", "yarn audit", "package.json", "bumps recomendados", "breaking changes de dep",
  "dependencias desatualizadas", "security scan deps", "dep audit".
argument-hint: "[caminho/package.json] [--severity=critical|high|medium|low] [--check-breaking]"
allowed-tools: Read, Bash(npm *), Bash(npx *), Bash(node *), Bash(cat *), Grep, Glob, Write
---

# Audit Dependencies — CVEs, Bumps e Breaking Changes

Inspeciona `package.json` (e lockfile quando presente) para detectar vulnerabilidades conhecidas,
recomendar versoes seguras e alertar sobre breaking changes em major bumps.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/tool-safety.md`,
`policies/quality-gates.md`, `policies/writing-clarity.md`, `policies/source-driven.md`.

Handoff natural para Skill 06 (Security Review) quando CVEs criticos sao encontrados.
Handoff para Skill 34 (Static Analysis) quando a vulnerabilidade de dep e explorada no codigo fonte.

## Quando Usar

- pre-release: toda release passa por audit antes do go/no-go
- PR que adiciona, remove ou altera versao de dependencia
- auditoria periodica (semanal ou mensal em projetos ativos)
- onboarding em repositorio legado (primeira leitura do estado de deps)
- incidente de seguranca: identificar se dep comprometida esta no lockfile
- quando `npm audit` ou `yarn audit` retornar saida nao trivial e precisar de triagem

## Quando Nao Usar

- repositorio sem `package.json` (Python, Go, Rust — usar ferramenta especifica da linguagem)
- scan de codigo fonte para bugs logicos (use Skill 34)
- review de arquitetura ou qualidade de codigo (use Skill 11)
- bump mecanico sem contexto de breaking changes (use `npm update` direto)

## Entradas Esperadas

- `package.json` (obrigatorio) — path absoluto ou relativo
- `package-lock.json` ou `yarn.lock` (opcional, aumenta precisao)
- severidade minima de interesse (default: high + critical)
- flag `--check-breaking` para incluir analise de breaking changes em major bumps

## Saidas Esperadas

- `audit-report.md` na raiz do projeto (ou path especificado)
- Secao 1: CVEs por severidade (critical → low), com GHSA ID, pacote afetado, versao segura
- Secao 2: Tabela de bumps recomendados (pacote | atual | recomendado | tipo: patch/minor/major)
- Secao 3: Breaking changes em bumps major (changelog linkado quando disponivel)
- Secao 4: Resumo executivo (N CVEs criticos, N high, acao imediata necessaria sim/nao)
- Handoff para Skill 06 se CVE critico confirmado

## Responsabilidades / Protocolo

### Passo 1 — Ler package.json

```bash
cat package.json
```

Extrair: `dependencies`, `devDependencies`, `peerDependencies`, `engines`.

### Passo 2 — Executar audit

```bash
# npm
npm audit --json 2>/dev/null

# yarn (se yarn.lock presente)
yarn audit --json 2>/dev/null

# pnpm (se pnpm-lock.yaml presente)
pnpm audit --json 2>/dev/null
```

Se nenhum lockfile existe: avisar que resultado e estimado (sem lockfile, versoes exatas sao ambiguas).

### Passo 3 — Parsear resultado

Do JSON de audit extrair por vulnerabilidade:
- nome do pacote + versao instalada
- CVE / GHSA ID
- severidade (critical / high / moderate / low)
- versao segura disponivel (se `fixAvailable: true`)
- `isPatchable` vs requer major bump

### Passo 4 — Tabela de bumps

Para cada dep em `dependencies` (nao devDependencies, a menos que `--include-dev`):

```bash
npx npm-check-updates --json 2>/dev/null
```

Classificar cada bump:
- **patch** (1.2.3 → 1.2.4): seguro, aplicar
- **minor** (1.2.x → 1.3.x): verificar CHANGELOG
- **major** (1.x → 2.x): verificar breaking changes — obrigatorio quando `--check-breaking`

### Passo 5 — Breaking changes em major bumps

Para cada major bump identificado:
1. Consultar `CHANGELOG.md` do pacote no npm registry: `https://registry.npmjs.org/<pkg>`
2. Listar breaking changes entre versao atual e recomendada
3. Indicar se projeto usa APIs removidas (grep no codigo — usa Grep tool)

### Passo 6 — Gerar relatorio

Escrever `audit-report.md` com as 4 secoes acima.
Resumo executivo primeiro (inversao de piramide).

### Passo 7 — Handoff condicional

- CVE critical encontrado → handoff imediato para Skill 06 (Security Review)
- Major bump com breaking change confirmado em codigo → handoff para Skill 23 (Migration & Refactor)
- Resultado limpo → confirmar para Orchestrator (Skill 09) que gate passou

## Heuristicas / Boas Praticas

- Separar `dependencies` de `devDependencies` no relatorio: vulnerabilidade em devDep raramente afeta producao
- CVE em dep transitiva (nao direta): indicar caminho completo `app → lib-a → vuln-lib`
- Nao recomendar bump que quebra `engines.node` declarado no package.json
- `npm audit` reporta advisory por caminho de instalacao; colapsar duplicatas pelo CVE ID antes de exibir

## Anti-Padroes

### "Bump cego"
Recomendar `npm update` sem verificar breaking changes. Major bumps sem leitura de CHANGELOG causam regressoes.

### "Ignorar devDependencies"
CVEs em `webpack`, `jest`, `eslint` raramente afetam producao. Separar no relatorio; nao tratar com mesma urgencia.

### "Falso alarme em dep transitiva"
Reportar CVE em dep que nao e acessivel pelo codigo do projeto. Verificar se o caminho de uso existe antes de classificar como urgente.

### "Relatorio sem acao imediata"
Relatorio que lista 30 CVEs sem priorizar os 2 que precisam de acao hoje. Resumo executivo e obrigatorio.

### "Audit sem lockfile"
Rodar sem lockfile e relatar versoes hipoteticas. Sempre avisar quando lockfile esta ausente.

## Evidencia de Conclusao

- `audit-report.md` criado com as 4 secoes
- CVEs classificados por severidade com GHSA ID real (nao inventado)
- Bumps com tipo correto (patch/minor/major)
- Breaking changes listados quando `--check-breaking` ativo
- Handoff para Skill 06 enviado se CVE critical encontrado
- Nenhum pacote inventado no relatorio (source-driven)

## Handoff

- **Skill 06 (Security Review):** CVE critical/high confirmado
- **Skill 23 (Migration & Refactor):** major bump com breaking changes em uso
- **Skill 09 (Orchestrator):** resultado limpo — gate passou, liberar proximo passo de release
- **Skill 24 (Release Manager):** incluir audit-report.md no bundle de release

## Integracao com Pipeline

- chamada por Skill 09 (Orchestrator) como gate pre-release (entre QA e deploy)
- complementa Skill 34 (Static Analysis): esta skill olha para CVEs de deps; aquela olha para bugs no codigo
- alimenta Skill 06 (Security Review) com findings de dependencias para review manual aprofundado
- resultado entra no bundle de Skill 24 (Release Manager) como evidencia de audit
```

---

## Fase 3: Onde registrar (8 lugares)

Apos criar `skills/41-audit-dependencies/SKILL.md`:

1. `.claude-plugin/plugin.json` — adicionar `"skills/41-audit-dependencies/SKILL.md"` na lista `skills`
2. `README.md` — linha na tabela "The N Specialists" + bump contadores (badge, hero, install)
3. `README.pt-BR.md` — espelhar linha da tabela
4. `AGENTS.md` — **somente se** criar slash command `/audit-deps` (nao obrigatorio nesta skill)
5. `docs/WIKI.md` — entrada completa formato aihero
6. `docs/WIKI.pt-BR.md` — idem em portugues
7. `docs/SKILLS-OVERVIEW.md` — linha curta no indice
8. `CHANGELOG.md` — entrada `Added: skill 41-audit-dependencies`

---

## Fase 4: Evals (3 cenarios minimos)

Criar `evals/commands/audit-dependencies/golden.json`:

```json
[
  {
    "id": "happy-path-cves",
    "description": "package.json com lodash 4.17.15 (CVE-2021-23337) e axios 0.21.1 (CVE-2021-3749)",
    "input": { "package_json": "fixtures/vuln-package.json" },
    "expected": {
      "cve_ids": ["CVE-2021-23337", "CVE-2021-3749"],
      "bumps": [
        { "pkg": "lodash", "from": "4.17.15", "to": "4.17.21", "type": "patch" },
        { "pkg": "axios", "from": "0.21.1", "to": "1.6.0", "type": "major" }
      ],
      "handoff_triggered": "skill-06"
    }
  },
  {
    "id": "clean-package",
    "description": "package.json sem vulnerabilidades conhecidas",
    "input": { "package_json": "fixtures/clean-package.json" },
    "expected": {
      "cve_count": 0,
      "summary": "sem vulnerabilidades criticas ou high",
      "handoff_triggered": null
    }
  },
  {
    "id": "major-bump-breaking",
    "description": "react 17.0.2 com --check-breaking flag",
    "input": { "package_json": "fixtures/react17-package.json", "flags": "--check-breaking" },
    "expected": {
      "major_bumps": [{ "pkg": "react", "from": "17.0.2", "to": "18.x" }],
      "breaking_changes_mentioned": true,
      "handoff_triggered": "skill-23"
    }
  },
  {
    "id": "devdep-separation",
    "description": "CVE em jest (devDependency) — nao deve gerar handoff para skill-06",
    "input": { "package_json": "fixtures/devdep-vuln.json" },
    "expected": {
      "cve_in_section": "devDependencies",
      "handoff_triggered": null,
      "severity_label": "low-risk-devdep"
    }
  }
]
```

---

## Fase 5: Score de qualidade da skill (checklist evals/skill-quality.md)

| Criterio | Score | Justificativa |
|---|---|---|
| Triggering: description tem palavras-gatilho concretas? | 3 | 11 trigger words, inclui "npm audit", "CVE", "package.json" |
| Quando usar: 3+ bullets concretos? | 3 | 6 bullets com contexto real |
| Quando NAO usar: 3+ bullets? | 3 | 4 bullets com linguagens alternativas mencionadas |
| Output: formato e caminho declarados? | 3 | `audit-report.md`, 4 secoes definidas |
| Tools: minimo necessario? | 3 | Bash(npm *), Bash(npx *), Grep, Write — sem wildcards desnecessarios |
| Anti-padroes: lista de armadilhas reais? | 3 | 5 anti-padroes com nome + causa + consequencia |
| Integracao: upstream/downstream declarados? | 3 | Skill 06, 09, 23, 24, 34 referenciados |
| Verbosidade: cabe em ~400 linhas? | 3 | Estimado ~280 linhas |
| Writing clarity: respeita policies? | 2 | Revisar secao "Breaking changes" — pode ser mais concisa |
| Anti-rationalization (N/A para skill flexivel) | N/A | — |

**Score estimado: 26/27 (desconsiderando N/A). Acima do threshold 22 — aprovado para merge.**
