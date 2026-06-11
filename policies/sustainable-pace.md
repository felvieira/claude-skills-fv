# Sustainable Pace Policy

> **Fonte:** *eXtreme Programming — práticas para o dia a dia* (Casa do Código), cap. 21 "Ritmo sustentável". Âncora — Robert C. Martin: *"Desenvolvimento de software é uma maratona, não uma sprint."*

## Princípio

Software se entrega no ritmo constante de uma maratona, não no pique ofegante de uma sprint. Ritmo sustentável é a regra do XP que balanceia o desenvolvimento com as demandas do negócio: o time, o cliente e os envolvidos mantêm um ritmo que dá para sustentar **indefinidamente** (8º princípio do Manifesto Ágil). Programadores não são mão de obra — são "cérebro de obra" (trabalhadores do conhecimento); o cérebro consome até 20% da energia do corpo, e cada funcionalidade exige raciocínio novo. O que importa é **produtividade no longo prazo**, não pico de uma semana.

## Por quê

- **Hora extra é dívida com juros.** Por uma semana o time produz mais com horas extras; em seguida o rendimento decai semana a semana até ficar inviável. Um time cansado trabalha menos, não importa quanto fique a mais.
- **O ciclo Lean da sobrecarga.** O livro: sobrecarga (*Muri*) vem do desbalanceamento de carga (*Mura*) e gera desperdício (*Muda*). Sobrecarga → cansaço → desatenção → defeitos → retrabalho — um ciclo que derruba a produtividade e faz o time abandonar as outras práticas de XP.
- **Hora extra é sintoma, não solução.** É um sintoma de problemas sérios no projeto. A saída fácil do gestor (fazer todo mundo trabalhar mais) encobre o problema-raiz, vai contra a melhoria contínua e gera novos problemas.
- **Sucesso atrai sobrecarga.** Quando um time está num ótimo ritmo com entregas de qualidade, a gestão tende a "empurrar mais tarefas" — comprometendo o resto e voltando a produzir entregas atrasadas de baixa qualidade. É papel do time proteger-se do trabalho extra.

## Como aplicar

- **Planeje para o ritmo do time, não para a data desejada.** Use a velocidade real (em story points, estabilizada após algumas iterações) para um planejamento realista, sem desbalanceamento. Negocie e replaneje o escopo, não as horas.
- **Planeje e estime *todas* as tarefas necessárias** — não só codificação: integração, teste (inclusive automatizado), deploy. Se sobra trabalho para a iteração, negocie e replaneie; não compense com hora extra.
- **Qualidade é o que mantém o fluxo.** Defeito gera retrabalho na próxima iteração — o que quebra o ritmo. Simplicidade (YAGNI, MVP, projeto simples) traz soluções mais efetivas e reduz a carga, especialmente quando a demanda excede a capacidade. Ver tríade `vertical-slices` + `boil-the-lake` + Senior Dev Override.
- **Proteja-se da sobrecarga ativamente.** Ritmo bom é alvo de mais demanda; o time deve recusar o "só mais essa" que estoura o balanço.

## Mapeamento para o kit (agente)

- O análogo agente de "ritmo sustentável" é o **orçamento de contexto e custo**: não esgotar a janela em pico (modelo degrada acima de ~60%), compactar proativamente, fazer handoff. Ver `policies/token-efficiency.md` e skill 49 (context-budget).
- "Hora extra encobre o problema-raiz" ⇄ `GLOBAL.md`: corrigir a **causa-raiz**, a menor mudança que resolve, em vez de empilhar workaround sob pressão.
- "Qualidade mantém o fluxo" ⇄ não pular testes/IC para "agilizar" — o atalho gera o retrabalho que quebra o ritmo das próximas iterações.

## Relação com outras policies

- `policies/token-efficiency.md` — ritmo sustentável de *contexto*: compactar/handoff antes de degradar.
- `policies/continuous-integration.md` + `policies/vertical-slices.md` — qualidade contínua (build verde, slices pequenos) é o que evita o retrabalho que destrói o ritmo.
