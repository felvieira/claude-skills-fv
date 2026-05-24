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

A execucao formal vai viver em `scripts/eval-triggers.mjs` (ainda nao implementado).
A ideia: o script carrega todas as fixtures, para cada prompt simula a heuristica de
matching (substring case-insensitive contra os triggers declarados no frontmatter da
skill alvo) e reporta taxa de acerto.

Enquanto o script nao existe, o eval pode ser feito manualmente:

1. Abrir `skills/<skill-id>/SKILL.md` e extrair a lista de triggers do frontmatter
2. Para cada prompt em `should_trigger`, marcar se algum trigger casa via substring
   (case-insensitive)
3. Repetir para `shouldnt_trigger`
4. Conferir contra o threshold abaixo

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
