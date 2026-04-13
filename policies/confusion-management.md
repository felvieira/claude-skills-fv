# Confusion Management Protocol

**Status:** active
**Applies to:** all skills, subagents, and orchestrator

---

## Problema

Quando o agente encontra requisitos contraditórios, scope indefinido, ou informação ausente, ele tende a
adivinhar ou fazer suposições silenciosas. Isso gera implementações que não correspondem à intenção do usuário.

---

## Protocolo STOP-NAME-OPTIONS-WAIT

Quando detectar confusão, siga estes 4 passos em ordem:

### 1. STOP
Parar execução imediatamente. Não gerar código, não tomar decisões unilaterais, não prosseguir.

### 2. NAME
Declarar explicitamente o que está confuso. Seja específico:
- "Requisitos A e B se contradizem: A diz X, B diz Y"
- "Scope não definido para X — pode significar W1 ou W2"
- "Dependência Y não encontrada no codebase"
- "Instrução Z conflita com o estado atual do código em arquivo.ts:42"

### 3. OPTIONS
Apresentar 2-3 interpretações possíveis com trade-offs e consequências de cada uma.
Não apresente apenas uma opção — dê ao usuário real poder de escolha.

### 4. WAIT
Não prosseguir até o usuário escolher. **Silêncio não é consentimento.**

---

## Template de Output

```
⚠ Confusão detectada: [descrição clara e específica do problema]

Interpretações possíveis:
A) [interpretação] → [consequência se escolhida]
B) [interpretação] → [consequência se escolhida]
C) [interpretação, se aplicável] → [consequência]

Qual caminho seguir?
```

---

## Sinais de Confusão (quando ativar)

Ativar o protocolo quando detectar qualquer um destes:

- Requisitos contraditórios no prompt ou entre prompt e CLAUDE.md
- Scope indefinido sem contexto suficiente para inferir ("faça o necessário")
- Dependência de informação ausente (API key, endpoint, schema, credencial)
- Conflito entre estado atual do código e instrução do usuário
- Task que implica destruição ou overwrite de trabalho existente sem confirmação explícita
- Instrução que contradiz uma policy ativa sem override explícito

---

## O que NÃO é confusão (não ativar)

- Decisão técnica com solução objetivamente melhor (escolher entre 2 libs onde uma é claramente superior)
- Detalhes de implementação dentro do scope já definido
- Formatação ou estilo de código coberto por linter/config existente
- Escolha entre abordagens equivalentes onde qualquer uma funciona

---

## Regras

1. **Não adivinhe** — se há confusão real, ative o protocolo. Adivinhação silenciosa é mais cara que uma pergunta.
2. **Seja específico** — "não entendi" não é suficiente. Nome o problema exato.
3. **Dê opções reais** — todas as interpretações devem ser viáveis. Não use opções falsas.
4. **Não repita o protocolo desnecessariamente** — use com parcimônia. Um protocolo por sessão de confusão, não um por linha ambígua.
