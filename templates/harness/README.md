# Harness Templates por Topologia

> Inspirado em Birgitta Böckeler (Thoughtworks) — "harness templates per topology". Variety-reduction concreta (Ashby's Law). Ver `docs/inspiration/harness-engineering.md`.

## Conceito

A maioria dos enterprises tem 3-5 topologias recorrentes que cobrem 80% dos serviços:

- **CRUD API** — business service expondo dados via REST/GraphQL
- **Event Processor** — consumer de fila/stream que processa eventos
- **Data Dashboard** — frontend de visualização de dados

Cada topologia tem dores e padrões previsíveis. Um harness template **empacota guides + sensors + fitness functions específicos** pra aquela topologia.

## Por que importa (Ashby's Law)

Programas/templates **reduzem variety do espaço de outputs do LLM**. Em vez de "implementar uma API", o modelo recebe "implementar uma CRUD API conforme o template, que já contém boundaries, sensors e fitness functions específicos." Reduz variety → harness fica mais cobertor possível.

## Templates disponíveis

| Topologia | Path | Quando usar |
|---|---|---|
| **CRUD API** | `templates/harness/crud-api/` | Business service expondo entidades via HTTP. REST ou GraphQL. |
| **Event Processor** | `templates/harness/event-processor/` | Consumer de fila/stream (Kafka, SQS, RabbitMQ). Processamento idempotente. |
| **Data Dashboard** | `templates/harness/data-dashboard/` | Frontend de visualização. Próximo de aplicações analíticas. |

## Como aplicar

1. Identificar a topologia (skill 18 repo-auditor já reporta sinais)
2. Copiar o template apropriado pro repo consumidor: `cp -r templates/harness/<topology>/* <consumer>/.harness/`
3. Customizar `<consumer>/.harness/config.yml` com paths e thresholds específicos
4. Plugar no pipeline (CI roda fitness functions, hooks consomem guides)

## Estrutura padrão de um template

```
templates/harness/<topology>/
├── README.md                # Quando usar, gaps cobertos, gaps não cobertos
├── guides/
│   ├── conventions.md       # Coding conventions específicas da topologia
│   ├── architecture.md      # Module boundaries esperados
│   └── domain-glossary.md   # Vocabulário do domínio
├── sensors/
│   ├── fitness-functions.yml # Fitness functions YAML (runnable via /run-fitness)
│   ├── lint-rules.json      # Regras de lint custom
│   └── architecture-tests/  # Structural tests (jest/vitest format)
└── config.yml               # Thresholds (perf budget, coverage min, etc)
```

## Roadmap

- v2.5.0 — Estrutura criada, 3 templates iniciais (skeleton)
- v2.5.1 — Templates completos com fitness functions runnable
- v2.5.2 — `/init-harness <topology>` command que aplica o template
- v2.6.0 — Templates pra mais topologias (worker, gateway, ML inference service)
- v2.6.0 — `harness-template-version` campo no consumer pra detectar drift do template

## Referências

- `policies/harness-categories.md` — categorias de regulação
- `docs/inspiration/harness-engineering.md` — Birgitta Böckeler
- `policies/programs-schema.md` — relação com programs/
