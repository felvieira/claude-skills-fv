# Exemplos de contratos e arquitetura

Cenários sintéticos. Os trechos ilustram decisões; sua presença não prova um sistema implementado ou testado.

## Evento de pagamento reentregue

**Contrato:** confirmar uma intenção de pagamento uma vez no domínio, com resposta estável a reentregas. Dois eventos distintos podem se referir à mesma intenção. A deduplicação de entrega não substitui a identidade de negócio.

Uma estrutura com `paid: boolean`, `paidAt?: string` e `transactionId?: string` admite `paid: true` sem recibo. Uma representação mais explícita:

```ts
type Order =
  | { status: 'awaiting-payment'; id: string; totalCents: number }
  | { status: 'paid'; id: string; totalCents: number; receipt: { paymentId: string; paidAt: string } };
```

O parser do webhook verifica assinatura, schema e versão; autorização e integridade da operação continuam obrigatórias. A regra de domínio verifica pedido, valor e transição permitida. O adaptador transacional faz o claim de entrega e a atualização do pedido sob a restrição que protege a intenção. Uma outbox na mesma transação registra o efeito pendente. O consumidor do efeito usa uma identidade estável e reconcilia o resultado do provedor.

| Interrupção | Resultado esperado | Evidência necessária |
|---|---|---|
| Antes do commit | Estado e outbox não foram parcialmente confirmados | Rollback no banco de teste |
| Depois do commit, antes da resposta | Reentrega recupera o resultado persistido | Teste de reentrega após interrupção |
| Duas instâncias disputam o claim | Apenas uma transição vence | Integração com a restrição real e duas conexões |
| Mesma chave, payload divergente | Conflito explícito | Comparação de intenção/payload persistido |
| Envio externo conclui e o worker cai | Retry reconcilia/deduplica o efeito | Teste com adaptador controlado e contrato do provedor |

Sem suporte de idempotência/reconciliação do serviço externo, documente o risco residual. Uma transação local não torna um efeito remoto exatamente uma vez. Veja a referência de idempotência da skill 03 para SQL e estratégias de resposta.

## Duas validações visualmente parecidas

Um validador de cadastro limita o nome ao contrato de um parceiro. Um campo de busca normaliza o termo para outro mecanismo. Os dois removem espaços e verificam comprimento. Um detector pode atribuir alta similaridade, mas os motivos para mudar são diferentes.

**Decisão possível:** compartilhar somente a primitiva de normalização que tenha o mesmo contrato; manter as regras específicas separadas. Registre limites, erros e testes próprios. A similaridade localiza o candidato; o significado decide a extração.

## Duas correções que conservam a hipótese errada

1. Acrescentar um mutex local reduz duplicatas em uma instância, mas o cenário com duas instâncias continua falhando.
2. Aumentar o tempo do mutex não resolve a reprodução.
3. Hipótese compartilhada: todas as gravações passam pelo mesmo processo.
4. Evidência contrária: dois processos possuem filas e locks distintos, escrevendo a mesma intenção.
5. Próximo experimento: disputar a restrição persistente em duas conexões; verificar a transição e o efeito único no contrato.

A correção atua na posse e atomicidade do estado. Mudar mais um timeout não investiga a hipótese que falhou.

## Função complexa com boa cobertura aparente

Uma função tem muitas decisões e 95% de cobertura de linhas. Uma mutação de `>` para `>=` sobrevive porque nenhum caso testa o limite. Primeiro confirme que a mudança altera o contrato. Se altera, acrescente o caso de fronteira; se é equivalente sob as pré-condições, registre a justificativa.

Uma extração só merece entrar quando cria uma unidade coesa e reduz o conhecimento dos chamadores. Não espalhe decisões entre cinco wrappers para reduzir um score. Teste a interface pública antes e depois e confira o comportamento da integração, além do número.
