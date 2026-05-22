---
scenario: 23-migration-refactor-specialist
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 1050
time_seconds: 18
quality_score: 3.0
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: n/a
delta_vs_baseline: 0
notes: "Generic incremental plan, correct steps but no strangler fig pattern, no Prisma-specific guidance, no rollback strategy"
---

# Baseline — Migração incremental Express+MongoDB+callbacks → Fastify+PostgreSQL+Prisma

## Resposta sem skill

### Visão geral da estratégia

A migração que você quer fazer envolve 3 eixos simultâneos:
1. Framework HTTP: Express → Fastify
2. Banco de dados: MongoDB → PostgreSQL
3. Padrão de código: callbacks → async/await (com Prisma)

Fazer tudo de uma vez é risco alto. Aqui vai um plano incremental:

---

### Fase 1 — Preparação e async/await (sem mudar infra)

**Objetivo:** modernizar o código sem mudar banco ou framework.

1. Ative o `util.promisify` ou use wrappers para converter callbacks em Promises.
2. Escreva um script simples que testa as principais rotas (pode ser Postman, curl scripts ou testes automatizados).
3. Converta módulo por módulo: comece pelas funções de banco que são mais usadas.
4. A cada módulo convertido, rode a suite de testes.

**Resultado:** codebase em async/await ainda em Express+MongoDB.

---

### Fase 2 — Introduzir PostgreSQL em paralelo (dual-write)

**Objetivo:** ter PostgreSQL rodando em paralelo com MongoDB, sem derrubar nada.

1. Suba uma instância PostgreSQL (pode ser Docker local primeiro, depois migrar para cloud).
2. Defina o schema Prisma (`prisma/schema.prisma`) mapeando seus documentos MongoDB para tabelas relacionais.
3. Rode `prisma migrate dev` para criar as tabelas.
4. Implemente uma camada de **dual-write**: cada operação de escrita grava em ambos os bancos.
5. Crie um job de migração de dados históricos (pode ser incremental com batch processing).
6. Monitore divergências com um job de reconciliação.

**Cuidado:**
- Relacionamentos N:M que eram arrays embutidos no MongoDB precisam virar tabelas de junção.
- Tipos de dados: ObjectId → UUID ou BIGINT.
- Datas: MongoDB Date → PostgreSQL timestamptz.

---

### Fase 3 — Migrar leituras para PostgreSQL

**Objetivo:** validar que PostgreSQL tem dados corretos antes de desligar MongoDB.

1. Para cada rota, crie uma "versão PostgreSQL" do repositório.
2. Use feature flags (pode ser uma variável de ambiente por módulo) para direcionar leituras.
3. Compare resultados entre os dois bancos em ambiente de staging.
4. Gradualmente ative a feature flag por módulo em produção.

---

### Fase 4 — Introduzir Fastify

**Objetivo:** migrar o framework HTTP sem mexer no banco.

1. Suba um servidor Fastify em uma **porta diferente** (ex: 4000) ao lado do Express (porta 3000).
2. Migre rota por rota: registre a rota no Fastify e redirecione o tráfego via proxy reverso (nginx/HAProxy).
3. Use o plugin `fastify-express` se precisar de middleware Express temporariamente.
4. Migre plugins: autenticação, logging, validação (use `fastify-plugin` e JSON Schema para validação).

---

### Fase 5 — Desligar MongoDB e Express

**Objetivo:** remoção segura da stack antiga.

1. Com todas as leituras apontando para PostgreSQL e todo tráfego em Fastify:
2. Desabilite o dual-write (grave só no PostgreSQL).
3. Mantenha MongoDB em modo read-only por 1 semana como fallback.
4. Desligue o Express.
5. Remova o MongoDB.

---

### Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Dados inconsistentes no dual-write | Job de reconciliação diário + alertas |
| Schema incompatível | Modelagem Prisma antes de começar qualquer migração |
| Performance do Fastify diferente | Testes de carga antes de redirecionar tráfego |
| Rollback de banco | Manter MongoDB read-only por período de segurança |

---

### Ordem recomendada de módulos

Comece pelos módulos com:
- Menos dependências cruzadas
- Mais cobertura de testes
- Menor volume de tráfego em produção

Deixe para o final os módulos críticos (autenticação, pagamento, etc.).

---

### Ferramentas úteis

- `prisma migrate deploy` para produção
- `prisma db seed` para dados de referência
- `pino` para logging (nativo no Fastify)
- Feature flags: env vars ou biblioteca como `unleash` / `flagsmith`
