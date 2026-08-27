---
name: game-architecture-design
description: |
  Skill de arquitetura, design review e balanceamento numerico de jogos — a camada de decisao antes
  de qualquer linha de codigo de engine. Cobre selecao de paradigma (entidade rica vs data-driven vs
  prototipo), design de sistemas de jogo especificos (combate, skill, IA, narrativa, UI, PCG), revisao
  critica de GDD/mecanica/nivel com achado baseado em evidencia, e modelagem numerica executavel de
  economia, progressao e drop rate. Nao gera codigo de Unity/Unreal/Godot — para isso ver skill 67.
  Trigger em: "arquitetura de jogo", "design de sistema de combate", "sistema de skill de jogo",
  "GDD", "game design document", "revisar mecanica de jogo", "balancear economia do jogo",
  "curva de progressao", "drop rate", "pity system", "loot table", "metagame", "PvP balance",
  "paradigma de arquitetura de jogo", "ECS vs OOP para jogo", "sistema de IA de jogo",
  "procedural content generation", "PCG", "revisao de design de jogo", "avaliar proposta de balance",
  "diagnosticar desbalanceamento", "economia de jogo mobile", "sistema de buff e debuff".
---

# Game Architecture Design — Arquitetura, Review e Balanceamento de Jogo

Esta skill decide **o que construir e por que**, antes de decidir **como construir em qual engine**.
Cobre três frentes que compartilham o mesmo público (game designer, arquiteto técnico, produtor):
arquitetura de sistemas, revisão crítica de design, e modelagem numérica de balance.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/source-driven.md`,
`policies/token-efficiency.md` e `policies/evals.md`.

Conteudo denso vive em `references/` — carregar sob demanda pelo assunto da task, nao a arvore inteira
de cara:

| Assunto | Arquivo |
|---|---|
| Selecao de paradigma de arquitetura (detalhe + sinais + mistura) | `references/architecture-paradigms.md` |
| Catalogo de sistemas de jogo (combate, skill, IA, narrativa, UI, PCG) | `references/system-catalog.md` |
| Dominios de design review + delegacao a subagentes + template de relatorio | `references/design-review-domains.md` |
| Playbooks de balance (combate/progressao, economia, PvP, recompensa aleatoria) | `references/balance-playbooks.md` |
| Estrutura fisica de projeto, pipeline de asset, arquitetura multiplayer de servidor | `references/project-structure.md` |

Esta skill e **conhecimento de dominio + protocolo de review**, nao um framework de workflow completo.
Combine com `skills/09-orchestrator/SKILL.md` para decidir a ordem de execucao numa task maior, ou use
isolada quando o pedido for so "desenhar esse sistema" / "revisar esse design" / "balancear esses numeros".

Para implementacao real em engine (Unity C#, Unreal C++), ver `skills/67-game-engine-development/SKILL.md`
— esta skill entrega a decisao arquitetural e os numeros; a 67 entrega o codigo que os implementa.

## Quando Usar

- desenhar a arquitetura de um sistema de jogo novo (combate, skill/habilidade, IA, narrativa, UI,
  geracao procedural, save/load, mod support) antes de escrever codigo de engine
- decidir entre paradigmas de arquitetura (orientado a dominio/entidade rica vs data-driven vs
  prototipo descartavel) para um projeto ou modulo especifico
- revisar criticamente um GDD, mecanica, nivel, economia, ou prototipo existente — achar o que esta
  fraco, arriscado, contraditorio, ou insuficientemente validado
- comparar duas direcoes de design e decidir qual seguir com evidencia, nao preferencia
- desenhar primeiro-passe de numeros de balance (dano, custo, taxa de drop, curva de XP) que precisam
  ser defensaveis, nao chutados
- diagnosticar um sistema de jogo ja em producao que esta desbalanceado (classe dominante, economia
  inflacionada, progressao murcha) e propor ajuste com simulacao
- avaliar se uma mudanca de balance proposta pelo time resolve o problema sem quebrar outra coisa

## Quando Nao Usar

- escrever codigo real de Unity (C#), Unreal (C++), ou qualquer engine — usar
  `skills/67-game-engine-development/SKILL.md`
- gerar sprite, textura, modelo 3D, ou qualquer asset visual — usar `skills/17-image-generator/SKILL.md`
  ou o pipeline de imagem/video do ambiente
- decisao de UI/UX que nao e especifica de jogo (paleta, tipografia, wireframe generico) —
  `skills/02-ui-ux-design/SKILL.md`
- planejamento de produto/roadmap fora do dominio de jogo — `skills/01-po-feature-spec/SKILL.md`
- pedido de "só me diz se é divertido" sem nenhum material pra examinar — pedir o GDD, prototipo,
  ou pelo menos a descricao da mecanica antes de comecar a review

## Entradas Esperadas

- para arquitetura: genero do jogo, plataforma-alvo, escopo do sistema a desenhar, restricoes de
  equipe (programador vs designer editando conteudo)
- para review: o material a revisar (GDD, prototipo jogavel, dados de playtest, telemetria) — sem
  material nenhum, so cabe review exploratoria de direcao, nao review completa
- para balance: as regras/formulas atuais (se existirem), publico-alvo, horizonte de tempo
  (sessao/dia/temporada), e o que "bom" significa pra esse sistema especifico

## Saidas Esperadas

- arquitetura: tabela de decisao de paradigma por modulo, diagrama de camadas (dado/logica/evento),
  justificativa de troca quando aplicavel
- review: relatorio com decisao em jogo, baseline de evidencia (confirmado/assumido/desconhecido),
  achados priorizados por severidade, menor intervencao recomendada, experimento de validacao
- balance: valores concretos, tabela de fluxo (fonte/sink), script de verificacao (temporario ou
  simulador persistente conforme o caso), veredito com plano de validacao

## Arquitetura de Sistemas — Resumo

Três paradigmas cobrem a maioria das decisões: **orientado a dominio/entidade rica** (regras complexas
encapsuladas — combate, calculo de dano/buff, IA com decisao complexa), **data-driven** (camada de
dados dirige comportamento — conteudo expansivel, fluxo, gestao simples), e **prototipo descartavel**
(validacao rapida sem compromisso arquitetural). A maioria dos projetos mistura os dois primeiros por
modulo. Ver `references/architecture-paradigms.md` para os sinais completos de selecao e os padroes
de mistura.

Sete sistemas cobrem a maior parte do escopo de gameplay: combate/acao, skill/habilidade, IA, narrativa,
UI/HUD, PCG, e multiplayer — cada um com preocupacao propria de design. Ver `references/system-catalog.md`
para o detalhe por sistema e `references/project-structure.md` para arquitetura de servidor multiplayer.

## Revisao de Design — Resumo

Quatro modos, escolher o mais estreito que resolve o pedido: **completa** (material formal existe,
cobertura total), **focada** (cabe na conversa, sem documento formal), **exploratoria** (nenhuma
direcao escolhida ainda — esbocar 2-3 e um teste que as distingue), **comparativa** (escolher entre
opcoes definidas com os mesmos criterios). Toda review nomeia o objeto, declara a decisao em jogo,
constroi baseline de evidencia, e fecha com achados + menor intervencao + experimento de validacao.

Um achado util carrega seis campos — observacao, mecanismo, status de evidencia, impacto, recomendacao,
validacao — sem eles e opiniao, nao review. Severidade em tres niveis (`critico`, `maior`, `menor`)
apenas quando ajuda a priorizar. Ver `references/design-review-domains.md` para o roteiro completo dos
onze dominios de review, o protocolo de delegacao a subagentes, e o template de relatorio.

Nao converta recomendacao de design direto em estrutura de codigo — isso e trabalho da skill 67 ou do
orchestrator decidindo a proxima etapa. Nao fabrique reacao de jogador ou telemetria inexistente —
marcar como hipotese e propor o teste que a confirmaria.

## Balanceamento Numerico — Resumo

Balance não é "sensação de estar certo" — é número com procedência. Classificar a relação entre opções
antes de comparar: **transitiva** (mais benefício custa mais), **intransitiva** (valor depende do que
o oponente escolheu), **situacional** (depende de contexto/timing), ou **mista**. Forçar um conjunto
intransitivo numa curva de poder absoluta é o erro mais comum de balance de PvP. Igualdade numérica não
é o objetivo — assimetria deliberada é aceitável quando sustenta identidade ou decisão variada.

Não aceitar um modelo só de inspeção visual — executar. Usar **script de verificacao temporario** pra
checagem independente de uma proposta (rodar, capturar evidencia, apagar depois), ou **simulador
persistente** pra sistema que sera ajustado repetidamente (entregar e manter a ferramenta). Cálculo
inline só basta quando poucas contas independentes determinam o resultado por completo.

Sistemas de aleatoriedade sempre em três camadas: probabilidade matemática, utilidade pro jogador
(limiar, perda, duplicata), e probabilidade percebida (o que a apresentação faz o jogador acreditar).
Ver `references/balance-playbooks.md` para o procedimento completo de cada dominio (combate/progressao,
economia, PvP/metagame, recompensa aleatoria).

## Regras Duras

| Nunca | Em vez disso |
|---|---|
| Propor numero de balance sem calculo ou simulacao por tras | Rodar script de verificacao ou simulador, reportar o que foi checado |
| Forcar sistema intransitivo (contador) numa curva de poder absoluta | Classificar a relacao antes de comparar |
| Fabricar reacao de jogador ou dado de telemetria inexistente | Marcar como hipotese e propor o teste que confirmaria |
| Converter achado de design review direto em tarefa de codigo | Encaminhar para skill 67 ou orchestrator com o achado como insumo |
| Aplicar arquitetura de dominio rico a conteudo que muda toda semana | Data-driven quando quem edita e o designer, nao o programador |
| Revisar so o que da pra ver sem examinar prototipo/telemetria disponivel | Inspecionar regra/config/comportamento real antes de analisar sistema existente |
| Entregar review sem severidade nem menor intervencao recomendada | Seguir a estrutura de achado de 6 campos |
| Misturar tipos de balance (dificuldade, progressao, fairness) numa recomendacao so | Declarar o trade-off explicitamente quando os alvos conflitam |

## Handoff

### Recebe de

- Skill 01 (PO) — objetivo de negocio e publico do jogo, quando o pedido vem de definicao de produto
- Skill 09 (Orchestrator) — quando a task maior decide que arquitetura/review/balance vem antes de
  implementacao de engine

### Entrega para

- Skill 67 (Game Engine Development) — decisao arquitetural e numeros de balance viram insumo pra
  implementacao real em Unity/Unreal
- Skill 68 (Character Animation 3D) — quando o sistema de combate/locomocao desenhado aqui precisa da
  animacao de personagem 3D correspondente (rig, retargeting, IA de motion)
- Skill 69 (Character Pipeline 2D) — quando a biblioteca de acoes (locomotion/combat/reactions)
  desenhada aqui precisa virar `MotionPlan.json` e sprite/rig 2D
- Skill 02 (UI/UX) — quando a review de design aponta problema de interface/HUD que precisa de
  decisao visual, nao so estrutural
- Skill 09 (Orchestrator) — achados de review viram proxima etapa do pipeline quando a task exige
  mais de uma skill em sequencia

## Evidencia de Conclusao

- para arquitetura: tabela de decisao de paradigma por sistema, com justificativa de cada escolha
- para review: relatorio com baseline de evidencia, achados priorizados, e experimento de validacao
  proximo
- para balance: valores/tabelas concretos, script ou simulador (com caminho e invocacao se persistente),
  veredito e plano do que confirmaria ou refutaria

## Fontes

Estrutura e escopo desta skill foram inspirados por `Yuki001/game-dev-skills`
(https://github.com/Yuki001/game-dev-skills) — repositorio pessoal sem licenca declarada
(`licenseInfo: null`, sem arquivo LICENSE no repositorio). Por isso, **nenhum texto ou codigo foi copiado
ou parafraseado de perto**: o repositorio serviu apenas como evidencia de que existe um gap real no kit
(nenhuma skill cobria arquitetura, review, ou balanceamento de jogo) e como referencia de quais topicos
uma cobertura desse dominio precisaria endereçar (paradigma de arquitetura, catalogo de sistemas de jogo,
modos de review, playbooks de balance por dominio). Todo o conteudo desta skill — texto, tabelas,
exemplos, regras — foi escrito do zero especificamente para este kit, em portugues, seguindo o formato
padrao de skill deste repositorio (frontmatter, secoes de governanca, `references/` sob demanda).

Nenhum arquivo (referencia, script, template) do repositorio Yuki001/game-dev-skills foi baixado,
copiado, ou adaptado.
