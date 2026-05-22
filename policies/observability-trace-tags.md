# Observability Trace Tags

## Objetivo

Padronizar metadata de telemetria emitida pelo kit pra que ferramentas downstream (LangSmith, Langfuse, dashboards próprios) leiam eventos sem precisar de adapter por integração.

Convenção absorvida de [bytedance/deer-flow](https://github.com/bytedance/deer-flow) 2.0 (MIT). Decoupling: não adotamos LangChain/LangGraph como dependência — só a convenção de campos.

## Campos reservados

Cada evento em `.auto/events.jsonl` pode carregar os seguintes campos opcionais:

| Campo | Tipo | Significado | Equivalente Langfuse |
|---|---|---|---|
| `session_id` | string | thread/conversation id (agrupa traces da mesma conversa) | `sessionId` |
| `user_id` | string | id efetivo do usuário (ou owner do processo) | `userId` |
| `trace_name` | string | assistant id / nome do agente | `name` |
| `tags` | string[] | tags livres no formato `chave:valor` | `tags` |

### Convenções de `tags`

- `env:<value>` — ambiente (`prod`, `dev`, `staging`, `local`)
- `model:<value>` — modelo LLM em uso (`claude-sonnet-4-6`, `gpt-5`, etc.)
- Pode estender com outras chaves; manter formato `chave:valor` pra parsing fácil

## Como o kit popula esses campos

O hook `hooks/scripts/session-event-logger.mjs` lê env vars na ordem abaixo e popula o campo no primeiro hit. Se nenhuma env var estiver setada, o campo é **omitido** (Langfuse-style), não preenchido com placeholder.

| Campo | Env vars consultadas (ordem) |
|---|---|
| `session_id` | `CLAUDE_SESSION_ID`, `DEER_FLOW_THREAD_ID`, `AGENT_THREAD_ID` |
| `user_id` | `CLAUDE_USER_ID`, `DEER_FLOW_USER_ID`, `USER`, `USERNAME` |
| `trace_name` | `CLAUDE_TRACE_NAME`, `DEER_FLOW_ASSISTANT_ID`, `AGENT_NAME` |
| `env` (vira tag `env:<x>`) | `DEVKIT_ENV`, `DEER_FLOW_ENV`, `ENVIRONMENT`, `NODE_ENV` |
| `model` (vira tag `model:<x>`) | `CLAUDE_MODEL`, `ANTHROPIC_MODEL`, `AGENT_MODEL` |

## Exemplo de evento com tags

```json
{
  "ts": "2026-05-23T14:32:18.421Z",
  "tool": "Edit",
  "args": { "file_path": "src/auth.ts" },
  "status": "ok",
  "bytes_out": 1842,
  "session_id": "thread_abc123",
  "user_id": "felvieira",
  "trace_name": "lead_agent",
  "tags": ["env:dev", "model:claude-sonnet-4-6"]
}
```

## Pra quem consome os eventos

- Ferramentas internas (`/savings`, `devkit_session_events`, `devkit_seen_files`) **ignoram** os campos novos quando não estão presentes — backward compatible.
- Ferramentas externas (LangSmith, Langfuse, OpenTelemetry exporters) podem agora ler o JSONL e mapear direto:
  - Langfuse `RunnableConfig.metadata`: `{ sessionId, userId, trace_name, tags }`
  - OTel span attributes: `session.id`, `user.id`, `agent.name`, custom tags

## Como ligar em produção

```bash
# .env do projeto consumidor
export DEVKIT_ENV=prod
export CLAUDE_MODEL=claude-sonnet-4-6
export CLAUDE_SESSION_ID=$(uuidgen)  # ou injetado pelo runtime
```

O resto se popula sozinho (USER já vem do shell, AGENT_NAME pode ser fixo no `.env`).

## O que **não** está aqui

- **Sampling / rate limiting** de eventos — fora do escopo (não cuspimos tantos eventos pra justificar).
- **Tracing distribuído** (span context propagation) — quando precisar, virar issue separada.
- **PII redaction** além da já feita por `SENSITIVE_KEYS` no event-logger — convenção é não colocar PII em tag.

## Referências cruzadas

- `hooks/scripts/session-event-logger.mjs` — writer dos eventos
- `mcp-server/src/lib/event-log.ts` — reader (interface `SessionEvent`)
- `policies/cost-optimization.md` — métrica `/savings` consome esses eventos
- `policies/savings-metrics.md` — auditoria do `/savings`
- DeerFlow upstream: README.md → seção "Langfuse Tracing" descreve a convenção original
