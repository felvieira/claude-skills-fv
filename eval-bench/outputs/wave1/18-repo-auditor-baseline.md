---
scenario: 18-repo-auditor
pass: baseline
model: claude-opus-4-7
tokens_in_approx: 90
tokens_out_approx: 850
time_seconds: 25
quality_score: 2.5
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 2
pass_fail: baseline
delta_vs_baseline: 0
notes: "generic onboarding advice, no persistence strategy, no audit artifact, generic checklist"
---

# Por onde começar num repo Node.js + Express + Mongo legado

Quando você herda um repo de 4 anos com 200+ arquivos e README desatualizado, a estratégia é "mapear antes de mexer". Aqui está o caminho que eu seguiria:

## 1. Inventário rápido (30 min)

- Rodar `cloc` ou `tokei` pra saber o tamanho real do código (LOC por linguagem)
- Ler o `package.json`: scripts, dependências, versão do Node esperada
- Olhar `node_modules` pra ver se as deps instalam sem erro
- Verificar `.env.example` (se houver) pra entender variáveis de ambiente
- Conferir se existe `docker-compose.yml`, `Makefile`, ou scripts de bootstrap

## 2. Subir o ambiente local (1-2h)

- Tentar `npm install && npm start` ou `npm run dev`
- Se quebrar, anotar TODOS os erros num arquivo `ONBOARDING.md`
- Resolver versão de Node (`.nvmrc`?), variáveis de env, conexão Mongo
- Critério de sucesso: app sobe e responde num endpoint básico (`/health` ou `/`)

## 3. Mapear estrutura

Olhar diretórios top-level:
- `src/`, `routes/`, `controllers/`, `models/`, `middleware/` — padrão Express
- `tests/` ou `__tests__/` — cobertura de testes existente
- `scripts/`, `migrations/`, `seeds/` — operações de banco
- `docs/`, `wiki/` — documentação interna (provavelmente também desatualizada)

## 4. Entender o domínio via Mongo

- Conectar no Mongo (local ou staging) e listar collections
- Pra cada collection grande, ver 1-2 documentos pra entender o shape
- Cruzar com os Mongoose schemas em `models/`
- Anotar collections sem schema (provável dívida técnica)

## 5. Rotas e fluxos críticos

- Listar todas as rotas (`grep -r "router.\(get\|post\|put\|delete\)"`)
- Identificar 5-10 endpoints mais importantes (auth, recursos principais)
- Pra cada um, traçar: rota → controller → service → model
- Documentar num diagrama simples (Mermaid ou só lista)

## 6. Testes e qualidade

- Rodar `npm test` — quantos passam? quanto coverage?
- Rodar linter (`eslint`) — quantos warnings/errors?
- Olhar últimos commits (`git log --oneline -20`) pra entender ritmo de mudança
- Identificar áreas "tocadas recentemente" vs "estáveis há anos"

## 7. Riscos e dívidas

- Dependências desatualizadas: `npm outdated`
- Vulnerabilidades: `npm audit`
- TODOs/FIXMEs: `grep -rn "TODO\|FIXME\|HACK"`
- Código morto: arquivos não referenciados

## 8. Documentar achados

Criar um `ONBOARDING.md` ou `AUDIT.md` com:
- Stack real (versões)
- Como subir local
- Estrutura de diretórios
- Fluxos críticos
- Riscos prioritários
- Próximas ações sugeridas

## 9. Primeiras mudanças seguras

- Não mexer em lógica de negócio nas 2 primeiras semanas
- Começar por melhorias triviais: atualizar README, adicionar `.nvmrc`, fixar versões
- Aprender com PRs pequenos e revisão de pares
- Evitar refatorações grandes até dominar o domínio

## 10. Comunicação

- Conversar com quem usa o sistema (suporte, ops, PO)
- Perguntar quais são as 3 features mais críticas e os 3 bugs mais frequentes
- Isso direciona onde investir energia primeiro

## Tempo total estimado

- Inventário + ambiente: 1 dia
- Mapeamento + fluxos: 2-3 dias
- Documentação consolidada: +1 dia
- Total: ~1 semana pra ter visão sólida

A regra é: **não tente entender tudo de uma vez**. Foque nos 20% do código que carregam 80% do valor (rotas críticas, modelos principais, fluxos de auth). O resto vem por demanda quando você precisar tocar.
