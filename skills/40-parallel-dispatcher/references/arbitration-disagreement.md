# Arbitragem em caso de discordância — detalhe completo

> Referenciado por `skills/40-parallel-dispatcher/SKILL.md` seção "Arbitragem em caso de discordância". Ver ali a tabela "Quando aplicar" e o resumo do gate — este arquivo tem o detalhamento do papel de árbitro, o exemplo completo e o template de dispatch.

## Papel de árbitro

Um terceiro agente (ou o orquestrador, se estiver fora do papel de quem gerou os vereditos) recebe os 2+ vereditos divergentes e decide com base na evidência que cada lado apresentou, nunca por média, votação ou "ambos têm um ponto".

Regras do papel:

1. **Anonimizar antes de arbitrar.** O árbitro recebe "Posição A" e "Posição B" com a evidência de cada uma, não "o code-reviewer disse X, o security-auditor disse Y". Saber qual agente disse o quê primeiro introduz viés de ancoragem: o árbitro tende a favorecer o agente "mais confiável" em vez de julgar a evidência.
2. **Decisão é evidência contra evidência, não contagem.** Se 3 agentes dizem "não é bloqueante" e 1 diz "é CRITICAL" com uma prova concreta (repro, CVE, teste que falha), o árbitro pode e deve ficar com o 1. Número de votos não é critério.
3. **Veredito do árbitro é fundamentado, não um número.** Formato mínimo: `<decisão final> — razão: <evidência que decidiu> — o que a posição perdedora não sustentou: <lacuna>`.
4. **Árbitro não reabre o que não foi contestado.** Só arbitra os pontos onde houve divergência real. Convergências entre os N agentes são auto-aprovadas, igual ao fluxo de `/multi-plan`.
5. **Empate técnico não existe por default.** Se a evidência dos dois lados é genuinamente equivalente e nenhuma pesa mais, o árbitro escala pro humano em vez de resolver sozinho ou travar indefinidamente.

## Gate fail-closed (detalhe)

Enquanto não houver resolução (concordância original entre os N agentes, ou veredito do árbitro), a etapa seguinte do pipeline fica bloqueada. Nunca prossegue:

- silenciosamente com o achado mais otimista ("o security-auditor deve ter sido paranóico, seguimos com o do code-reviewer");
- fazendo média/consenso artificial ("um disse CRITICAL, outro disse LOW, vamos de MEDIUM");
- ignorando a divergência e reportando os dois lados sem decisão, deixando pro humano descobrir sozinho que há um conflito.

O gate é fail-closed: ausência de decisão significa bloqueado, não aprovado. Isso espelha o princípio já estabelecido em `policies/quality-gates.md` (hook que bloqueia vence advisory) e em `policies/trade-off-resolution.md` (conflito sem caso resolvido nunca é ignorado silenciosamente), aqui aplicado especificamente a discordância entre agentes, não entre regras do kit.

Quando o árbitro escala pro humano (empate técnico genuíno, ou evidência insuficiente dos dois lados), o gate continua bloqueado até resposta. Não há timeout que libera automaticamente.

## Exemplo concreto — achado de segurança bloqueante ou não

Comprehensive review (Caminho A) despachou `code-reviewer` e `security-auditor` em paralelo sobre o mesmo PR. Ambos avaliam o mesmo trecho: um endpoint que aceita `user_id` via query param sem revalidar contra o `user_id` da sessão autenticada.

- **security-auditor**: marca CRITICAL, IDOR (Insecure Direct Object Reference). Evidência: request forjado com `user_id` de outro usuário retorna 200 com dados daquele usuário.
- **code-reviewer**: marca LOW / não-bloqueante. Evidência: existe um middleware de auth antes da rota que "provavelmente" já filtra isso, e o padrão se repete em 4 outras rotas do mesmo jeito sem incidente reportado.

Isso é divergência real sobre segurança/risco, arbitragem obrigatória.

1. **Anonimização:** árbitro recebe "Posição A: CRITICAL, evidência = request forjado reproduzido com resultado concreto (200 + dados de outro usuário)" e "Posição B: LOW, evidência = assunção de que o middleware cobre isso + precedente de padrão repetido".
2. **Julgamento por evidência:** Posição A tem uma reprodução concreta e verificável. Posição B tem uma assunção não verificada ("provavelmente já filtra") e um apelo a precedente que não prova ausência de vulnerabilidade, só mostra que o mesmo bug pode existir em mais 4 lugares.
3. **Veredito:** `CRITICAL confirmado — razão: reprodução concreta do IDOR com dados retornados de outro usuário — a posição LOW não verificou o middleware, apenas assumiu que ele cobre o caso; a repetição do padrão em 4 rotas é agravante (mais superfície vulnerável), não atenuante`.
4. **Gate:** pipeline fica bloqueado até o fix (revalidar `user_id` contra a sessão) ser aplicado e o security-auditor confirmar a correção. A etapa seguinte (merge, deploy, próxima story) não prossegue com "code-reviewer achou que tava ok".

Isso é exatamente o tipo de decisão que `swarm-protocol.md` Phase 4 (Synthesize) e Phase 5 (Self-Fix) já esperam receber pronta: quando os 4 agentes de review convergem, a decision matrix é direta. Quando divergem sobre severidade do mesmo achado, o árbitro roda antes da synthesis final consumir o resultado. A synthesis não deveria precisar decidir sozinha qual dos dois vereditos vale.

## Template de dispatch

Segue o mesmo padrão dos outros caminhos da skill 40, não é um quarto caminho novo, é um dispatch adicional depois que os N agentes retornam com discordância:

```typescript
// Depois do fan-out (Caminho A) retornar achados divergentes sobre o MESMO ponto:
Agent({
  subagent_type: "general-purpose",   // ou um subagent dedicado, se o kit vier a ter um
  model: "opus",                      // arbitragem e raciocinio cross-evidencia, nao implementacao
  description: "Arbitragem — achado X divergente",
  prompt: `
    Voce e o arbitro. Recebeu dois vereditos anonimizados sobre o MESMO achado.
    Decida com base em evidencia apresentada, nao em contagem de votos.

    Posicao A: <severidade + evidencia, sem identificar o agente de origem>
    Posicao B: <severidade + evidencia, sem identificar o agente de origem>

    Responda no formato:
    <decisao final> — razao: <evidencia que decidiu> — o que a posicao perdedora nao sustentou: <lacuna>

    Se a evidencia dos dois lados for genuinamente equivalente, responda "EMPATE TECNICO — escalar para humano"
    em vez de forcar uma decisao.
  `
})
```

Resultado vira insumo obrigatório da consolidação (seção "Pós-dispatch: consolidação" do SKILL.md), nunca uma nota lateral que o humano pode não ler.
