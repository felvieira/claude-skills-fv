# Idempotência e Postgres Avançado — Referência Detalhada

Detalhamento das duas seções resumidas no `SKILL.md` principal. Ler aqui quando for implementar de fato — o SKILL.md dá o gate de decisão, este arquivo dá o código e as ressalvas.

## Idempotência — implementação completa

Aceitar um header `Idempotency-Key` é o contrato. Honrá-lo de verdade é a implementação — e é aí que o dinheiro se perde: uma chave que o servidor aceita mas trata de qualquer jeito é pior que não ter chave nenhuma, porque o cliente passa a acreditar que retentar é seguro quando não é.

### 1. Derivar a chave da intenção, não da tentativa

A chave precisa ser estável entre retries da mesma intenção e diferente entre intenções distintas.

```typescript
crypto.randomUUID()          // ERRADO — nova chave a cada tentativa, cada retry vira uma cobrança nova
`${userId}:${amount}`        // ERRADO — duas cobranças legítimas de R$50 colapsam numa só
`${orderId}:${Date.now()}`   // ERRADO — timestamp é randomUUID() de disfarce

req.headers['idempotency-key']   // CERTO — cliente gera uma vez, reusa em cada retry
`charge:v1:${orderId}`           // CERTO — derivada de um identificador imutável
```

A chave vem do cliente ou do evento que disparou a operação — nunca da camada que está fazendo o retry (um wrapper de retry que gera a própria chave a cada tentativa anula o propósito inteiro do padrão).

### 2. Claim atômico — nunca check-then-act

Um SELECT seguido de INSERT é uma corrida: duas tentativas concorrentes podem ambas ler "chave não existe" e ambas executarem o efeito.

```typescript
// ERRADO — TOCTOU: duas retries concorrentes leem "não existe", ambas cobram
if (!(await db.exists(key))) {
  await chargeCard(amount);
  await db.insert(key);
}

// CERTO — a unique constraint no banco decide o vencedor, não a aplicação
try {
  await db.insert({ key, state: 'in_progress', requestHash });
} catch (e) {
  if (isUniqueViolation(e)) return replayOrReject(key);
  throw;
}
const result = await chargeCard(amount);
await db.update({ key, state: 'succeeded', response: result });
```

A unique constraint é o mecanismo, não um detalhe de implementação. Um armazenamento que não consegue garantir unicidade numa única operação (ex: cache sem transação) não sustenta esse padrão — precisa ser o banco relacional.

### 3. Guard contra payload divergente

A mesma chave chegando com um corpo de requisição diferente é bug do cliente, e deve falhar de forma explícita — nunca servir silenciosamente a resposta da primeira requisição para uma segunda com dados diferentes.

```typescript
if (existing.requestHash !== hash(req.body)) {
  return res.status(422).json({ error: 'idempotency key reused with a different payload' });
}
```

### 4. Três estratégias para duplicata em voo

A primeira requisição ainda está rodando quando a segunda chega — é o caso comum sob tempestade de retries (a mesma degradação de rede que causa o retry também atrasa a resposta original).

| Estratégia | Resposta | Quando usar |
|---|---|---|
| Reject | `409 Conflict` | Cliente pode retentar depois; mais simples e mais seguro como default |
| Wait | Bloqueia até o resultado, com timeout | Chamador precisa do resultado de forma síncrona |
| Return pending | `202` + URL de status | Efeito de longa duração |

Nunca deixar a segunda chamada passar direto só porque a primeira "parece travada" — uma tentativa parada com destino desconhecido é exatamente o momento em que duplicar custa mais caro.

Toda chamada externa tem três desfechos possíveis, não dois: sucesso, falha e **desconhecido**. Um timeout não diz nada sobre se o efeito aplicou de fato. Por isso o registro da intenção (passo 2) precisa acontecer **antes** de chamar o serviço externo — se o processo cair entre a chamada e a resposta, sobra evidência de que algo precisa ser resolvido depois, em vez de silenciosamente perder o rastro e permitir uma cobrança duplicada na próxima tentativa.

### 5. Retenção da chave — amarrada à cadeia de retry mais longa

Reter a chave por tempo curto porque "economiza espaço em disco" é o erro mais comum. A chave precisa sobreviver a todo caminho que pode reentregar a mesma intenção — incluindo uma fila morta (DLQ) reprocessada uma semana depois, ou a janela de disputa do provedor de pagamento. TTL de 24h atrás de uma DLQ de 7 dias é uma duplicata esperando para acontecer.

### Red flags de idempotência mal implementada

- Chave derivada de UUID, timestamp ou qualquer coisa regenerada a cada tentativa
- `SELECT` seguido de `INSERT` no lugar de `INSERT` protegido por unique constraint
- A mesma chave aceita com corpo diferente, retornando a resposta antiga silenciosamente
- Janela de retenção mais curta que o caminho de reentrega mais longo do sistema
- Assumir que a fila garante exactly-once — nenhuma fila garante isso através de um crash do consumidor, porque o ack do broker e o efeito colateral não estão na mesma transação. Desenhar para at-least-once com processamento idempotente é o padrão realista.

## Postgres Avançado — recursos específicos do motor

Os dois recursos abaixo **não existem (ou não têm equivalente direto) em outros bancos relacionais** — são decisões de arquitetura amarradas a rodar em Postgres especificamente. Se o projeto usa MySQL, SQL Server ou outro motor, este bloco não se aplica; validar o equivalente na documentação do banco em uso antes de tentar portar.

### Row-Level Security (RLS) — isolamento de tenant no nível do banco

Filtrar por `tenantId`/`userId` só na query da aplicação depende de todo desenvolvedor lembrar de incluir o filtro em toda query, para sempre — um único endpoint ou script de manutenção que esquece o filtro vaza dado entre tenants. RLS move essa garantia para o banco: mesmo uma query mal escrita não retorna linha de fora do escopo, porque o Postgres aplica o filtro antes de devolver qualquer linha.

```sql
-- habilitar RLS na tabela
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- policy: usuário só enxerga linhas onde user_id bate com o contexto da sessão
CREATE POLICY user_access ON orders
  FOR SELECT
  TO app_users
  USING (user_id = current_user_id());
```

`current_user_id()` normalmente é uma função que lê uma variável de sessão setada pela aplicação após autenticar (`SET app.current_user_id = '...'` por conexão, ou via `current_setting()`). RLS complementa o filtro de aplicação — não substitui autenticação, mas fecha a lacuna de "esqueci o WHERE" que nenhuma revisão de código pega 100% das vezes.

Quando considerar: multi-tenant com dado sensível na mesma tabela, ou qualquer cenário onde uma query sem filtro seria um incidente de segurança grave, não só um bug funcional.

### `EXCLUDE USING gist` — prevenção de overlap de intervalo

Uma constraint `UNIQUE` comum impede duas linhas idênticas, mas não impede dois intervalos que se sobrepõem — que é exatamente o problema de agendamento (não dá pra reservar a mesma sala às 14h-15h duas vezes, mas `UNIQUE(room_id, time_range)` deixa passar porque os valores não são iguais, só se cruzam).

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist; -- necessário se algum campo do EXCLUDE não é range/geometria nativa

ALTER TABLE bookings
  ADD CONSTRAINT no_overlapping_bookings
  EXCLUDE USING gist (room_id WITH =, booking_period WITH &&);
```

Isso rejeita no nível do banco qualquer INSERT/UPDATE que crie uma sobreposição de `booking_period` para o mesmo `room_id` — sem precisar de lock manual ou verificação prévia na aplicação (que teria a mesma race condition do check-then-act discutido na seção de idempotência). Aplica-se a qualquer recurso com janela de tempo exclusiva: sala, equipamento, slot de agenda, reserva de recurso físico.

Requer um tipo de dado com suporte a operadores de overlap (`daterange`, `tstzrange`, ou geometria) e índice **GiST** (ou **btree_gist** para combinar com colunas de igualdade simples, como `room_id` acima).
