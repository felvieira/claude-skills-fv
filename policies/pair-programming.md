# Pair Programming Policy

> **Fonte:** *eXtreme Programming — práticas para o dia a dia* (Wildt, Moura, Lacerda, Helm — Casa do Código), cap. 17 "Programação em par" e cap. 15 "Posse coletiva". Destilado como policy de processo; o núcleo técnico de TDD fica na skill 37.

## Princípio

No XP, todo código de produção nasce em par: duas pessoas, **um piloto e um copiloto**, focadas numa única tarefa ao mesmo tempo. Não é mentoria nem revisão hierárquica — é trabalho colaborativo entre iguais, onde o defeito é sempre "do design que *nós* fizemos", nunca "do seu". O ganho não é dois pelo preço de um; é `1+1>2`: mais foco, revisão de código contínua (erros pegos enquanto se digita, não depois por um testador), design mais enxuto e conhecimento espalhado pelo time. Num contexto agente-humano, o humano é o copiloto que aprova; num contexto multi-agente, o "par" vira o ciclo dispatch → review adversarial.

## Por quê

- **Revisão contínua > revisão tardia.** O livro: "muitos erros são pegos quando estão sendo codificados, em vez de descobertos por um testador". Revisar depois "pode perder a prioridade e gerar retrabalho".
- **Combate ilhas de conhecimento.** Pareamento + posse coletiva fazem "várias pessoas entenderem cada pedaço do sistema". A pergunta-reflexão do cap. 15: *quantas pessoas precisam faltar para o sistema não poder mais ser desenvolvido?* Quanto menor o número, pior — pareamento empurra esse número para o tamanho do time.
- **Pressão do par é saudável.** Cada um se compromete com o outro; isso aumenta concentração e responsabilidade — desde que haja revezamento frequente para virar respeito mútuo, não fiscalização.

## Como aplicar

- **Pareie no código de produção; não no resto.** Pesquisa, leitura e spike não exigem par. O alvo é o código que vai pro branch padrão.
- **Revezar é obrigatório.** Troque piloto↔copiloto por ciclo de tempo (10 min a 1h; Pomodoro de 25 min funciona) **ou** por ciclo de TDD — uma boa variação: um escreve o teste (RED), o outro implementa (GREEN) e refatora. Force a troca com alarme se preciso.
- **Regra dos 10 segundos.** Quando o piloto está num raciocínio não-linear, o copiloto espera ~10s antes de intervir — não quebra o fluxo.
- **Pensar alto.** O piloto verbaliza o que está fazendo; sem isso o copiloto vira espectador passivo.
- **"Vamos tentar sua ideia primeiro."** Comece pela solução do outro integrante — cria clima de respeito e ambas as ideias são experimentadas.
- **Se não parear, revise em par antes do branch padrão.** Quando a tarefa não foi feita em dupla, revise o diff a dois **antes** do merge, não depois. Vale para código e para tudo que apoia o desenvolvimento (testes, specs, docs).
- **Ergonomia importa (inclusive remoto).** Mesas em "L" ou de canto geram dores num dia de pareamento; idealmente estação com teclado/mouse/monitor para o copiloto. Remoto: screen-share + áudio/vídeo, não comentário assíncrono.
- **Limite o WIP abaixo do nº de pessoas.** Menos tarefas em progresso que programadores → sempre sobra alguém sem tarefa própria, então ele *precisa* parear. Num quadro Kanban, é o limite de WIP.
- **Pareie além do código.** Programador × cliente (tirar dúvida), cliente × testador (escrever teste de aceitação), programador × testador (discutir teste). Tudo que tem valor ganha com par.

## Mapeamento para o kit (agente)

- O **humano é o copiloto que aprova**: a skill 37 (TDD) já força "passa pro humano revisar o fixture aprovado" — isso *é* o revezamento por ciclo de TDD aplicado ao fluxo agente.
- Em multi-agente, a skill 40 (Parallel Dispatcher) + review adversarial da skill 11 cumprem o papel de "revisão contínua por par". Pareamento não vira "dois agentes no mesmo arquivo" — vira dispatch + review.
- Posse coletiva = nenhum agente/pessoa "dono" de um módulo. Combina com `policies/vertical-slices.md`: contratos compartilhados ficam em módulo dedicado, qualquer worker pode refatorar qualquer parte.

## Relação com outras policies

- `policies/vertical-slices.md` — posse coletiva e revezamento operam dentro do slice; o copiloto pensa em casos de teste enquanto o piloto codifica.
- `skills/37-tdd-engineer` — revezamento por ciclo TDD (RED por um, GREEN por outro) é a forma canônica de parear no kit.
- `skills/11-reviewer` + `skills/40-parallel-dispatcher` — substituto multi-agente da revisão contínua do par.
