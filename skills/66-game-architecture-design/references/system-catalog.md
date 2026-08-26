# Catalogo de Sistemas de Jogo

Cada sistema tem preocupações próprias que vale desenhar antes de implementar.

| Sistema | Preocupação central ao desenhar |
|---|---|
| Combate / ação | Hitbox vs hurtbox, pipeline de dano, cancelamento de animação, hit-stop e feedback |
| Skill / habilidade | Separar dado (atributo, tag, efeito) de lógica (framework de skill + ações atômicas), buff como objeto ou tag+efeito |
| IA de jogo | Camadas de movimento, pathfinding, decisão (behavior tree/utility/state machine), nível tático |
| Narrativa | Fluxo de diálogo, condição de branch, cutscene, persistência de escolha do jogador |
| UI / HUD | Gestão de módulo, padrão MVC/MVVM, binding reativo, pilha de telas |
| PCG (geração procedural) | Ruído vs regra vs simulação, orçamento de controle do designer sobre o gerado |
| Multiplayer | Autoridade de servidor, sincronização determinística vs snapshot, reconciliação de cliente |

## Skill / Habilidade — Detalhe

Sistema de skill se decompõe em três camadas que valem separar mesmo em prototipo:

- **Camada de dado**: atributo (valor base + lista de modificadores, recalculado e cacheado), tag
  (rótulo semântico de estado — atordoado, invulnerável, em chamas), efeito (registro de uma
  modificação a ser aplicada, o mecanismo primário de mudança de atributo/tag).
- **Camada de lógica**: um framework de alto nível (classe de habilidade dedicada, behavior tree,
  timeline, node graph, ou script de domínio específico) orquestra o ciclo de vida; ações atômicas
  reutilizáveis (tocar animação, aplicar dano, spawnar projétil) são sequenciadas por ele.
- **Camada de evento**: eventos de mudança de dado (`OnAttributeChange`, `OnTagAdded`), hooks de
  timing (`OnDamageDealt`, `OnTargetKilled` — pontos fixos onde outras skills podem reagir), e
  triggers de lógica pra apresentação (cue para VFX/SFX não-crítico, notify para lógica crítica de
  gameplay como uma notificação de animação que dispara cálculo de dano).

Buff/debuff pode ser um objeto completo com ciclo de vida próprio (mais controle, mais código) ou
tag+efeito leve (menos controle individual, mais barato de escalar). Escolher pelo volume esperado de
buffs simultâneos e pela necessidade de lógica bespoke por buff.

## IA de Jogo — Detalhe

Separar em camadas: movimento (steering, avoidance), pathfinding (navmesh, grid, HPA*), decisão
(behavior tree para composição hierárquica clara, utility AI para pontuação contínua entre opções,
state machine para poucos estados bem definidos), e nível tático (coordenação entre múltiplos agentes
— flanking, cover, formação). Escolher o modelo de decisão pelo número de estados e pela necessidade
de nuance: poucos estados discretos favorecem state machine; muitas opções com trade-off contínuo
favorecem utility AI; comportamento composicional e reusável favorece behavior tree.

## PCG — Detalhe

Três abordagens não são mutuamente exclusivas: ruído (Perlin/Simplex para terreno orgânico, rápido,
difícil de controlar autoria), regra (gramática, WFC — Wave Function Collapse — para estrutura com
restrição, controle de designer maior), simulação (autômato celular, agentes para emergência orgânica
com resultado difícil de prever). Definir o orçamento de controle do designer antes de escolher: um
roguelike de dungeon quer regra com parâmetros ajustáveis; um terreno de mundo aberto aceita mais ruído
puro.
