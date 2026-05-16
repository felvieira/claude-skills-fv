# Receiving Code Review

**Princípio:** rigor técnico, não concordância performativa. Quando recebe feedback de review, verifica antes de implementar — especialmente se o feedback parece técnicamente questionável.

**Quando aplicar:**
- ao receber feedback do skill 11 (reviewer)
- ao receber feedback de PR (GitHub/Linear/Jira)
- ao receber feedback do user em review iterativo
- ao receber sugestão de outro agente (Task dispatch)

## A regra

**Não implemente sem verificar.** Concordância automática com revisor é tão problemática quanto rejeição automática.

| Padrão sycofântico (errado) | Padrão correto |
|---|---|
| "Você está absolutamente certo, vou corrigir já" | "Vou verificar o ponto X. Se procede, corrijo. Se não, explico por quê." |
| Implementar sugestão sem testar a premissa | Reproduzir o problema sugerido antes de aplicar fix |
| Aceitar feedback contraditório com testes existentes | Mostrar o teste que cobre o caso e perguntar |

## Workflow

### 1. Categorizar cada feedback

Separar em 3 grupos:

- **Correto e claro** — bug real, fix óbvio. Implementar.
- **Correto mas requer trade-off** — válido mas tem custo (perf, complexidade, escopo). Discutir antes de implementar.
- **Questionável** — revisor pode ter assumido errado. Verificar antes.

### 2. Verificar antes de aceitar (categoria questionável)

Para feedback questionável, **não responda "ok vou ajustar"**. Em vez disso:

1. Reproduzir o cenário descrito pelo revisor
2. Rodar comando que prova / desprova
3. Responder com evidência:
   - Se procede: "verificado, vou ajustar. Output: ..."
   - Se não procede: "verifiquei e não reproduz porque [razão]. Teste anexo. Posso explicar mais?"

### 3. Push back é OK

Quando o feedback é tecnicamente errado, **rejeitar com razão técnica** é o comportamento correto. Exemplos válidos:

- "Sugestão removeria validação X que protege contra Y, demonstrado em test Z"
- "Approach proposto tem complexidade O(n²); o atual é O(n log n) por design"
- "Mudança quebraria contrato declarado em ADR-007"
- "Padrão sugerido é evitado em `policies/anti-rationalization.md`"

Push back sem evidência **não vale**. Sempre mostrar teste / spec / ADR / output.

### 4. Concordância forte requer ação forte

Se o feedback é claramente correto e crítico:
- Não basta "OK vou corrigir" — corrige **antes** de responder
- Mostrar diff aplicado + output da verificação
- Nunca prometer correção que vai ficar pendente

## Anti-padrões

### Sycofância

```
❌ "Excelente ponto! Você tem total razão. Vou refatorar isso imediatamente."
✅ "Verificando: o caso edge mencionado é coberto pelo teste em src/foo.test.ts:42.
    Output: PASS. Pode dar mais contexto do cenário que você imaginou?"
```

### Concordância sem implementar

```
❌ "Vou corrigir." (e nunca corrige)
✅ Corrigir + mostrar diff + mostrar output + então responder
```

### Rejeição sem fundamento

```
❌ "Discordo, acho que está certo do jeito que está."
✅ "Discordo porque [razão técnica]. Evidência: [teste / spec / output]. Posso elaborar?"
```

### Implementar sugestão errada

```
❌ Aplicar mudança que quebra outro caso só pra fechar review
✅ Aplicar + rodar suite completa + se quebra outro teste, voltar e discutir
```

## Quando rever todo o feedback

Em reviews longos (10+ comments), **não responder linha por linha**. Em vez disso:

1. Ler tudo primeiro
2. Categorizar (correto/trade-off/questionável)
3. Agrupar por tema (ex: 3 comments sobre naming, 5 sobre arquitetura)
4. Responder com plano agregado: "vou aceitar 8 dos 10. Os 2 questionáveis são: ..."

Evita aceitar/rejeitar individualmente sem ver o todo.

## Integração com kit

- skill 11 (reviewer) referencia esta policy quando dá feedback (revisor sabe que vai ser questionado)
- skill 35 (skill-author) na fase de eval cita esta policy
- `/review` slash command lembra desta policy no prompt
- `superpowers:receiving-code-review` (se instalado) cobre território similar — esta é a versão integrada ao kit

## Por que isso importa

Agentes têm tendência forte a concordar com revisores (mesmo padrão sycofântico do `policies/anti-ai-writing.md`). Concordância automática:

- Implementa mudanças erradas que quebram outros lugares
- Erode credibilidade técnica do agente
- Torna o code review ritual, não substantivo

Receiving code review com rigor torna review **conversa técnica**, não processo de aprovação.
