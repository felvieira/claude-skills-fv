# Trigger Fixtures

Fixtures versionadas para medir a qualidade de descoberta (triggering) das skills.

A premissa: a descricao de cada `SKILL.md` declara palavras-chave em "Trigger em:".
Em conversas reais, o usuario raramente usa essas palavras exatas. Mede-se entao se
prompts em linguagem natural ainda acionariam a skill.

Cada fixture vive em `evals/triggers/<skill-id>.json` e tem dois pools:

- `should_trigger`: prompts em PT/EN que **devem** acionar a skill
- `shouldnt_trigger`: prompts vizinhos/ambiguos que **nao** devem acionar

## Formato

```json
{
  "skill": "43-canary-deployment",
  "should_trigger": [
    "vou fazer um canary deployment na proxima sprint",
    "como fazer rollout gradual de uma feature pra producao"
  ],
  "shouldnt_trigger": [
    "criar novo branch git",
    "rodar testes unitarios localmente"
  ]
}
```

Recomendado: 10 entradas em `should_trigger`, 5 em `shouldnt_trigger`.
Mesclar PT e EN, variar registro (formal/informal, gerundio/imperativo, com erro de
digitacao se for realista).

## Como rodar

Implementado em `scripts/eval-triggers.mjs` (zero-dep, Node 18+):

```bash
node scripts/eval-triggers.mjs                                     # todas, tabela
node scripts/eval-triggers.mjs --json                              # JSON puro
node scripts/eval-triggers.mjs --skill 43-canary-deployment       # uma fixture
node scripts/eval-triggers.mjs --min-should 80 --max-shouldnt 20  # threshold custom
node scripts/eval-triggers.mjs --strict                           # exit 1 se algum FAIL
```

A heuristica e simples: extrai triggers entre aspas dentro do campo `description`
do frontmatter da skill alvo (ex: "design", "wireframe"), faz match
case-insensitive substring contra cada prompt. Se ANY trigger casa, o prompt e
considerado "matched". Reporta hits/total por pool e veredito PASS/FAIL.

## Threshold sugerido

Uma skill passa o eval quando:

- `should_trigger`: pelo menos 8 de 10 prompts encontram match em algum trigger
  declarado (>= 80%)
- `shouldnt_trigger`: no maximo 1 de 5 prompts encontra match (<= 20%)

Skills que falham:
- score baixo em `should_trigger`: triggers muito especificos / falta vocabulario
  natural na descricao
- score alto em `shouldnt_trigger`: triggers genericos demais, vao competir com
  outras skills e poluir descoberta

## Como adicionar nova fixture

1. Criar `evals/triggers/<skill-id>.json` seguindo o formato acima
2. `should_trigger`: variar registro, lingua, termos vizinhos do dominio real
3. `shouldnt_trigger`: pegar prompts de skills adjacentes que nao deveriam acionar
   esta (ex: para `43-canary-deployment`, usar prompts de `07-deploy-docker` que
   sao puramente sobre build/imagem, sem rollout gradual)
4. Rodar o eval (manual por enquanto) e iterar a descricao da skill ate atingir
   os thresholds

## Manutencao

- Quando alterar `description` de uma skill, re-rodar o eval da fixture
  correspondente
- Quando criar nova skill, criar a fixture junto (parte do checklist da skill
  35-skill-author)
- Quando um falso positivo aparece em producao, adicionar o prompt em
  `shouldnt_trigger` e ajustar a descricao
