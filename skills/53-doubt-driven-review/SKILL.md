---
name: doubt-driven-review
description: |
  Skill de revisão adversarial em tempo real — submete toda decisão não-trivial a um revisor de contexto
  fresco, viesado a REFUTAR, antes dela ficar de pé. Diferente do Reviewer final (skill 11, veredito pos-hoc
  em PR pronta), esta skill entra EM VOO, enquanto corrigir rota ainda é barato. Use antes de decisão
  arquitetural sob incerteza, antes de commitar código não-trivial, antes de afirmar um fato não-óbvio
  ("isso é seguro", "isso escala"), ou trabalhando em código que você não entende totalmente. Trigger em:
  "tem certeza disso", "duvida isso", "revisa antes de eu commitar", "isso ta certo mesmo", "questiona essa
  decisao", "adversarial review", "doubt driven", "segunda opiniao antes de seguir", "acho que ta certo mas".
---

# Doubt-Driven Review - Revisão Adversarial em Tempo Real

Uma resposta confiante não é uma resposta correta. Sessões longas acumulam contexto que silenciosamente transforma suposições em "fatos" sem ninguém perceber. Doubt-driven review é a disciplina de materializar um revisor de contexto fresco — viesado a **refutar, não aprovar** — antes de qualquer output não-trivial ficar de pé.

Isso **não é** a skill 11 (Reviewer). Skill 11 é veredito sobre artefato pronto (PR, deploy). Esta skill é postura em voo: decisão não-trivial é contra-examinada enquanto corrigir rota ainda é barato.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/skills-vs-agents.md`, `policies/token-efficiency.md`.

## Quando Usar

Uma decisão é **não-trivial** quando pelo menos um destes é verdade:

- Introduz ou modifica lógica de branching
- Cruza fronteira de módulo ou service
- Afirma uma propriedade que o type system/compiler não consegue verificar (thread safety, idempotência, ordenação, invariante)
- Sua corretude depende de contexto que um leitor futuro não consegue ver
- Seu blast radius é irreversível (deploy em produção, migration de dados, mudança de API pública)

Acionar quando:
- prestes a tomar decisão arquitetural sob incerteza
- prestes a commitar código não-trivial
- prestes a afirmar um fato não-óbvio ("isso é seguro", "isso escala", "isso bate com a spec")
- trabalhando em código que você não entende completamente

## Quando Nao Usar

- operação mecânica (rename, formatação, mover arquivo)
- seguindo instrução clara e inequívoca do usuário
- lendo ou resumindo código existente
- mudança de uma linha com corretude óbvia
- operação pura de tooling (rodar teste, listar arquivo)
- usuário pediu explicitamente velocidade em vez de verificação

Se você duvidar de cada tecla digitada, você não entrega nada. A skill se aplica só a decisões não-triviais conforme definido acima.

## Restrição de Uso

Esta skill é desenhada pro **orquestrador da sessão principal**, onde o Passo 3 (DUVIDA) pode despachar um revisor de contexto fresco via `Agent` tool.

**NÃO invocar esta skill de dentro de um subagent** — um subagent que segue o Passo 3 tentaria despachar outro subagent, o que a maioria dos runtimes bloqueia ou é anti-padrão (ver `policies/skills-vs-agents.md`). Se você se encontrar aplicando esta skill de dentro de um subagent: reporte de volta ao orquestrador que a sessão principal precisa rodar o ciclo de dúvida, em vez de tentar nested-spawn.

## O Processo

Copiar este checklist ao aplicar a skill:

```
Ciclo de dúvida:
- [ ] Passo 1: CLAIM — escreveu a afirmação + por que importa
- [ ] Passo 2: EXTRACT — isolou artefato + contrato, sem o raciocínio
- [ ] Passo 3: DUVIDA — despachou revisor de contexto fresco com prompt adversarial
- [ ] Passo 4: RECONCILIA — classificou cada finding contra o texto do artefato
- [ ] Passo 5: PARA — atingiu condição de parada (findings triviais, 3 ciclos, ou override do usuário)
```

### Passo 1: CLAIM — Nomear o que está de pé

Nomear a decisão em duas ou três linhas:

```
CLAIM: "A nova camada de cache é thread-safe sob a carga
        read-heavy descrita na spec."
POR QUE IMPORTA: uma race aqui corrompe dado de usuário e é
                  difícil de detectar em QA.
```

Se você não consegue escrever a claim de forma tão compacta, você tem um vibe, não uma decisão. Surface antes de escrutinar.

### Passo 2: EXTRACT — Menor unidade revisável

Um revisor de contexto fresco precisa do **artefato** e do **contrato**, não da jornada.

- Código: o diff ou a função — não o arquivo inteiro
- Decisão: a proposta em 3-5 frases mais as constraints que ela precisa satisfazer
- Afirmação: a claim mais a evidência que supostamente a sustenta (mantida distinta do bloco CLAIM do Passo 1, que é a hipótese do orquestrador sob escrutínio)

Retire seu raciocínio. Se você entrega conclusões, você recebe validação das suas conclusões de volta. A unidade precisa ser pequena o bastante pra um revisor segurar na cabeça numa leitura — se for um PR de 500 linhas, decomponha primeiro.

### Passo 3: DUVIDA — Despachar o revisor de contexto fresco

O prompt do revisor **precisa ser adversarial**. O enquadramento decide a resposta.

```
Revisão adversarial. Encontre o que está errado neste artefato.
Assuma que o autor está overconfident. Procure por:
- Suposições não-declaradas
- Edge cases não tratados
- Acoplamento oculto ou estado compartilhado
- Formas do contrato ser violado
- Convenções existentes que isso pode quebrar
- Failure modes sob input inesperado

NÃO valide. NÃO resuma. Encontre problemas, ou declare
explicitamente que não encontrou nenhum após exame minucioso.

ARTEFATO: <cole o artefato>
CONTRATO: <cole o contrato>
```

**Passar ARTEFATO + CONTRATO apenas. NÃO passar o CLAIM.** Entregar ao revisor sua conclusão o vicia em direção à concordância. O revisor precisa determinar independentemente se o artefato satisfaz o contrato.

Despachar via `Agent` tool com `subagent_type: "dev-team-kit-fv:code-reviewer"` (ou `general-purpose` se o domínio não for código) — nunca invocar outra skill de dentro do subagent (ver `policies/skills-vs-agents.md`). **O prompt adversarial acima tem precedência sobre o formato de resposta default do subagent** — o `code-reviewer` é escrito pra produzir veredito balanceado com pontos fortes e fracos; doubt-driven precisa de output só-de-problemas. Colar o prompt adversarial literal na invocação pra sobrescrever o default.

#### Escalação cross-model (opcional)

Um revisor de modelo único compartilha os pontos cegos do autor original — um modelo mais frio, de arquitetura diferente, pega o que o mesmo modelo não pega. Isso é opcional e custa latência/tokens — perguntar ao usuário antes de escalar (ex: via `codex:codex-rescue` se disponível no ambiente), nunca escalar silenciosamente.

Em contexto não-interativo (`/loop`, `/swarm`, execução agendada): pular cross-model e anunciar o skip no output ("Cross-model pulado: contexto não-interativo").

### Passo 4: RECONCILIA — Dobrar findings de volta

O output do revisor é dado, não veredito. **Você ainda é o orquestrador.** Reler o texto do artefato contra cada finding antes de classificar — carimbar o revisor sem questionar é a mesma falha de ignorá-lo.

Para cada finding, classificar nesta **ordem de precedência** (primeira classe que casar vence):

1. **Contrato mal-lido** — revisor sinalizou algo especificamente porque o CONTRATO fornecido era confuso ou incompleto. Corrigir o contrato primeiro, reclassificar no próximo ciclo.
2. **Válido + acionável** — problema real que exige mudança no artefato. Mudar, reloop.
3. **Trade-off válido** — o problema é real mas o custo de corrigir excede o custo de aceitar. Documentar o trade-off explicitamente pro usuário ver.
4. **Ruído** — revisor sinalizou algo que está correto sob contexto que o revisor não tinha. Anotar, seguir, e perguntar: adicionar esse contexto ao contrato teria evitado o falso positivo?

Um revisor fresco pode estar errado por falta de contexto. Não deferir só porque é "fresco".

### Passo 5: PARA — Loop limitado, não recursão

Parar quando:
- a próxima iteração retorna só findings triviais ou já considerados, **ou**
- 3 ciclos completados (escalar pro usuário, não moer um quarto sozinho), **ou**
- usuário explicitamente diz "manda ver"

Se depois de 3 ciclos o revisor ainda sinaliza problemas substanciais, o artefato pode não estar pronto — surface isso ao usuário, 3 ciclos não-resolvidos é informação sobre o artefato, não motivo pra continuar sozinho.

Se 3 ciclos é "obviamente insuficiente" porque o artefato é grande: o artefato é grande demais — voltar ao Passo 2 e decompor. Não levantar o limite.

## Racionalizações Comuns

| Racionalização | Realidade |
|---|---|
| "Tô confiante, pula a dúvida" | Confiança correlaciona mal com corretude em problema novo. Momentos de certeza são exatamente onde ponto cego se esconde. |
| "Despachar revisor é caro" | Debugar um commit errado em produção é mais caro. O check é limitado; o bug não é. |
| "O revisor vai só cismar" | Só se sem escopo. Restrinja o prompt a "problemas que fariam isso falhar sob o contrato". |
| "Faço dúvida no final com skill 11" | Skill 11 é gate final. Doubt-driven pega direção errada cedo, quando corrigir rota é barato. Na hora do PR já é tarde. |
| "Se eu duvidar de cada passo nunca entrego" | A skill se aplica a decisão não-trivial, não cada tecla. Reler "Quando Não Usar". |
| "O revisor discordou então eu tava errado" | O revisor não tem seu contexto — discordância é informação, não veredito. Reler o artefato, classificar, decidir. |

## Red Flags

- Despachar revisor fresco pra um rename de uma linha ou mudança de formatação
- Tratar output do revisor como autoritativo sem reler o texto do artefato
- Loop >3 ciclos sem escalar pro usuário
- Prompt do revisor com "isso tá bom?" em vez de "encontre problemas"
- Pular dúvida sob pressão de tempo numa decisão de alto risco
- Re-despachar contexto fresco num artefato inalterado (você recebe os mesmos findings; você está estagnando)
- **Teatro de dúvida (sinal checável)**: em 2+ ciclos onde o revisor sinalizou findings substanciais, zero foram classificados como acionáveis. Você está validando, não duvidando. Parar e escalar.
- Duvidar só depois de commitar — isso é skill 11, não doubt-driven
- Passar o CLAIM pro revisor (vicia em direção à concordância)

## Interação com Outras Skills

- **Skill 11 (Reviewer)**: complementar. Skill 11 é veredito pós-hoc de PR; doubt-driven é em-voo por decisão. Usar as duas.
- **Skill 37 (TDD Engineer)**: o passo RED do TDD é dúvida concretizada — um teste que falha é uma tentativa de refutação. Quando TDD se aplica, esse teste falho *é* o passo de dúvida pra claims comportamentais.
- **Skill 40 (Parallel Dispatcher)**: fornece a mecânica de dispatch correta (`Agent` tool, `subagent_type`) usada no Passo 3 — nunca passar nome de skill como `subagent_type`.
- **`dev-team-kit-fv:debugger`**: quando o revisor sinaliza um failure mode real, cair na skill/agent de debugging pra localizar e corrigir.

## Evidencia de Conclusao

- toda decisão não-trivial foi nomeada explicitamente como CLAIM antes de ficar de pé
- pelo menos uma revisão de contexto fresco por artefato não-trivial
- revisor recebeu ARTEFATO + CONTRATO — NÃO o CLAIM, NÃO o raciocínio
- prompt do revisor foi adversarial ("encontre problemas"), não validador ("tá bom?")
- findings classificados contra o texto do artefato (não carimbados), usando a precedência: contrato mal-lido / acionável / trade-off / ruído
- condição de parada atingida (findings triviais, 3 ciclos, ou override do usuário)

## Fontes

- Processo e disciplina adaptados de [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), skill `doubt-driven-development` (MIT).
