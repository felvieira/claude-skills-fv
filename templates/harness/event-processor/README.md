# Harness Template — Event Processor

## Quando usar

Service que consume eventos de fila/stream e processa. Padrões típicos:
- Kafka / SQS / RabbitMQ / Kinesis / Pub/Sub
- Processamento idempotente (mesma mensagem múltiplas vezes = mesmo resultado)
- Retry com dead letter queue
- Throughput > latência (otimização inversa de CRUD API)

## Topology profile

```yaml
runtime: [node, go, java, rust, python]
queue: [kafka, sqs, rabbitmq, kinesis, pubsub, redis-streams]
serialization: [json, protobuf, avro, msgpack]
state: [stateless, stateful-keyed]
```

## Guides (feedforward)

### Convenções

- **Idempotência obrigatória:** toda message handler deve produzir mesmo efeito se chamado N vezes com mesma message_id
- **At-least-once semantics:** assumir que duplicatas chegam, code defends
- **Ack/Nack explícito:** nunca confiar em auto-commit
- **Backpressure:** processor controla flow, não consome além do que processa
- **Bulkhead:** isolar pools de workers por tipo de mensagem

### Module boundaries

```
src/
├── handlers/<event-type>/
│   ├── handler.ts          ← logic do handler
│   ├── handler.test.ts     ← unit test idempotency
│   ├── schema.ts           ← validação do payload
│   └── side-effects.ts     ← chamadas externas (DB, HTTP)
├── infrastructure/
│   ├── consumer.ts         ← integração com queue (kafka-js, sqs-consumer)
│   ├── dlq.ts             ← dead letter queue handling
│   └── metrics.ts          ← prometheus / statsd
└── config/
```

## Sensors (feedback)

### Fitness functions

```yaml
fitness_functions:
  - id: handler-idempotency-test
    description: Todo handler tem teste que prova idempotência
    type: structural
    runner: grep
    rule: 'describe.*idempotenc'
    fail_threshold: 0  # zero handlers sem teste de idempotência
    severity: high
    applies_to: 'src/handlers/**/*.test.ts'

  - id: ack-explicito
    description: Nenhum handler ignora ack/nack
    type: structural
    runner: grep
    rule: 'await handler.*\\n(?!.*ack)'
    severity: high

  - id: throughput-budget
    description: P95 throughput > 1000 msg/min por worker
    type: performance
    runner: load-test
    budget_msg_per_min: 1000
    severity: medium

  - id: dlq-tracked
    description: Toda mensagem que falha N vezes vai pra DLQ
    type: structural
    runner: dep-cruiser
    required:
      - from: 'consumer\\.ts'
        to: 'dlq\\.ts'
    severity: high

  - id: no-blocking-io-in-handler
    description: Handlers não usam fs sync, network sync, sleep
    type: structural
    runner: grep
    rule: '\\b(readFileSync|writeFileSync|execSync|sleep)\\b'
    fail_threshold: 0
    severity: high
    applies_to: 'src/handlers/**'
```

### Métricas runtime

- Lag por partition (Kafka) ou age da mensagem mais antiga (SQS)
- Taxa de retry / DLQ
- Throughput por worker
- Tempo de processamento por handler

## Gaps cobertos vs não cobertos

**Cobre:**
- Idempotência (estrutural + teste)
- Throughput budget
- DLQ wiring
- Sem blocking IO

**NÃO cobre:**
- Correctness do business logic — humano revisa
- Schema evolution (compat com versões antigas) — design separado
- Exact-once delivery — semântica de queue/transações distribuídas
- Replays históricos seguros

## Anti-padrões específicos

- ❌ Side effect antes de ack
- ❌ Handler que faz HTTP sem timeout
- ❌ Handler que faz SQL sem retry estratégico
- ❌ Logar payload inteiro (vaza PII, ocupa stdout)
- ❌ Catch-all que engole erros

## Próximos passos

- v2.5.1 — fitness functions runnable
- v2.5.2 — `/init-harness event-processor`
