---
name: game-engine-development
description: |
  Skill de implementacao real de codigo de engine de jogo — Unity C# e Unreal C++. Cobre padroes de
  MonoBehaviour, ScriptableObject, object pooling, state machine, ECS, componentes de Actor/UPROPERTY/
  UFUNCTION do Unreal, otimizacao de performance (profiling, batching, LOD, culling, garbage collection),
  e networking multiplayer (arquitetura cliente-servidor, predicao de cliente, lag compensation,
  serializacao). Cobertura conceitual (nao profunda) de Godot GDScript quando pedido, porque nao existe
  fonte com profundidade real desse motor curada nesta skill. Nao decide arquitetura de sistema nem
  balanceamento de numero — para isso ver skill 66.
  Trigger em: "Unity C#", "Unreal C++", "MonoBehaviour", "ScriptableObject", "UCLASS", "UPROPERTY",
  "UFUNCTION", "Actor component", "object pooling jogo", "ECS Unity", "entity component system",
  "otimizar FPS", "otimizar performance de jogo", "profiler Unity", "Unreal Insights",
  "multiplayer networking jogo", "client-side prediction", "lag compensation", "server reconciliation",
  "state machine jogo", "spatial partitioning", "GetComponent", "coroutine Unity", "Blueprint callable",
  "smart pointer Unreal", "TSharedPtr", "código de jogo", "implementar sistema de jogo em Unity",
  "implementar sistema de jogo em Unreal", "Godot GDScript".
---

# Game Engine Development — Unity C# e Unreal C++

Implementação real de sistemas de jogo em engine. Cobre os dois motores com profundidade genuína —
Unity (C#) e Unreal Engine (C++) — porque são as duas únicas onde a fonte curada para esta skill tinha
código de produção real, não esqueleto. Godot não tem cobertura própria aqui; ver a seção
"Cobertura de Godot" abaixo antes de assumir profundidade que não existe.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/source-driven.md` e
`policies/token-efficiency.md`.

Codigo denso vive em `references/` — carregar so o arquivo do motor/topico relevante a task, nao os
cinco de cara:

| Assunto | Arquivo |
|---|---|
| Unity — MonoBehaviour, ScriptableObject, pooling, eventos, coroutine, singleton | `references/unity-patterns.md` |
| Unreal — Actor component, UPROPERTY/UFUNCTION, timer, pooling, smart pointer | `references/unreal-cpp.md` |
| ECS e padroes de design (state machine, command, observer, service locator, spatial grid) | `references/ecs-patterns.md` |
| Otimizacao de performance — profiling, memoria, batching, LOD, culling, updates | `references/performance-optimization.md` |
| Multiplayer networking — cliente-servidor, predicao, lag compensation, serializacao | `references/multiplayer-networking.md` |

Esta skill entrega **codigo**, nao decisao de design. Para escolher paradigma de arquitetura, revisar
um GDD, ou calcular numero de balance antes de implementar, ver
`skills/66-game-architecture-design/SKILL.md` — aquela skill decide o que construir e por que, esta
constroi.

## Quando Usar

- implementar um sistema de jogo em Unity (C#) — MonoBehaviour, ScriptableObject, componente,
  gerenciador de estado, pooling
- implementar um sistema de jogo em Unreal Engine (C++) — Actor, Component, UPROPERTY/UFUNCTION
  exposto a Blueprint, timer, data asset
- aplicar um padrao de design de jogo especifico — ECS, state machine, object pooling, command pattern,
  observer, service locator, spatial partitioning
- otimizar performance de um sistema existente — reduzir draw call, eliminar alocacao de garbage em
  Update, configurar LOD/occlusion culling, perfilar CPU/GPU/memoria
- implementar networking multiplayer — arquitetura servidor-autoritativo, predicao de cliente,
  reconciliacao, lag compensation pra hitscan, compressao de estado

## Quando Nao Usar

- decidir arquitetura de sistema, paradigma (entidade rica vs data-driven), ou revisar design —
  `skills/66-game-architecture-design/SKILL.md`
- calcular ou simular numero de balance (dano, economia, drop rate) antes de implementar —
  `skills/66-game-architecture-design/SKILL.md`
- gerar sprite, modelo 3D, textura, ou qualquer asset visual — `skills/17-image-generator/SKILL.md`
- pedido de profundidade de Godot GDScript equivalente ao nivel de Unity/Unreal aqui — nao existe fonte
  curada com essa profundidade nesta skill; avisar o usuario e oferecer o nivel conceitual disponivel
  (ver "Cobertura de Godot") ou pesquisar a documentacao oficial do Godot como complemento

## Entradas Esperadas

- motor-alvo (Unity ou Unreal) e versao, quando relevante (APIs mudam entre versoes major)
- linguagem confirmada (C# pra Unity, C++ pra Unreal — nao ha ambiguidade real aqui)
- o sistema ou padrao especifico a implementar, e se ja existe decisao de arquitetura da skill 66 ou se
  precisa ser assumida
- alvo de performance quando for tarefa de otimizacao (FPS alvo, plataforma, orcamento de memoria)

## Saidas Esperadas

- implementacao de sistema core (componente ECS, MonoBehaviour, ou Actor) com a estrutura de dado
  associada (ScriptableObject, struct, config)
- consideracoes de performance e otimizacoes aplicadas, com breve justificativa da decisao de
  arquitetura de codigo
- para otimizacao: antes/depois mensuravel (draw call, alocacao, frame time) quando houver como medir
- para networking: modelo de autoridade explicito (quem decide o que) e tratamento de latencia

## Fluxo de Trabalho

1. **Analisar requisito** — identificar genero, plataforma, alvo de performance, necessidade de
   multiplayor. Se a arquitetura ainda nao foi decidida, considerar rodar `skills/66-game-architecture-design/SKILL.md`
   primeiro.
2. **Desenhar a estrutura de codigo** — planejar sistema de componente, otimizar pra plataforma-alvo
   desde o inicio (nao como retrofit).
3. **Implementar** — construir mecanica core, integracao grafica/fisica/IA/networking usando os padroes
   de `references/`.
4. **Otimizar** — perfilar e otimizar pra 60+ FPS, minimizar uso de memoria/bateria. Checkpoint: rodar
   Unity Profiler ou Unreal Insights, confirmar frame time ≤16ms antes de prosseguir.
5. **Testar** — teste cross-platform, validacao de performance, stress test de multiplayer. Checkpoint:
   confirmar frame rate estavel sob carga, rodar teste de latencia/dessincronia antes de liberar.

## Regras Duras

| Nunca | Em vez disso |
|---|---|
| `GetComponent<T>()` ou `FindObjectOfType` dentro de Update/Tick | Cachear a referencia em Awake/BeginPlay |
| Instantiate/Destroy (Unity) ou SpawnActor/Destroy (Unreal) em loop apertado | Object pooling — ver `references/ecs-patterns.md` |
| Comparar string pra tag (`tag == "Enemy"`) | `CompareTag()` (Unity) ou enum/gameplay tag (Unreal) |
| Alocar memoria dentro de Update/FixedUpdate/Tick | Reusar buffer (StringBuilder, lista pre-alocada, cache de Vector3) |
| Hardcodar valor de jogo no codigo | ScriptableObject (Unity) ou Data Asset/DataTable (Unreal) |
| Cliente decide resultado de acao critica (dano, hit) sem validacao de servidor | Modelo servidor-autoritativo — ver `references/multiplayer-networking.md` |
| Pular profiling antes de declarar otimizado | Medir com Profiler/Insights antes e depois da mudanca |
| `PrimaryActorTick.bCanEverTick = true` (Unreal) sem precisar de Tick | Desabilitar Tick, usar Timer pra atualizacao periodica |
| Ponteiro raw pra UObject no Unreal (quebra garbage collection) | `UPROPERTY()` pra referencia gerenciada, `TWeakPtr` pra evitar ciclo |
| Assumir que Godot tem a mesma profundidade de cobertura que Unity/Unreal aqui | Avisar explicitamente — ver "Cobertura de Godot" |

## Cobertura de Godot

Esta skill **nao tem** references dedicado a Godot/GDScript porque nenhuma das fontes avaliadas na
curadoria (`Yuki001/game-dev-skills`, `Jeffallan/claude-skills`) continha profundidade real nesse motor
— o Jeffallan cobre exclusivamente Unity C# e Unreal C++ nas cinco references de `game-developer`, e o
Yuki001 nao tem skill de engine alguma (so arquitetura/design/asset, cobertos pela skill 66). Forcar uma
sexta reference de Godot com o mesmo nivel de detalhe teria exigido inventar profundidade que nenhuma
fonte real sustentava.

Quando o pedido for especificamente Godot: os padrões de arquitetura de `skills/66-game-architecture-design/SKILL.md`
(ECS vs entidade rica, state machine, object pooling conceitual) se transferem sem trocar de motor —
só a sintaxe muda. Para a sintaxe GDScript/C# do Godot em si, tratar como gap conhecido do kit e
recorrer à documentação oficial (`docs.godotengine.org`) ou pesquisa direta em vez de fingir
equivalência de profundidade com as referências de Unity/Unreal desta skill.

## Handoff

### Recebe de

- Skill 66 (Game Architecture Design) — decisao de paradigma, especificacao de sistema, e numeros de
  balance ja calculados, prontos pra virar codigo
- Skill 09 (Orchestrator) — quando a task maior decide que implementacao de engine e a proxima etapa

### Entrega para

- Skill 05 (QA Testing) — quando o sistema implementado precisa de suite de teste formal alem do
  checkpoint de performance embutido no fluxo desta skill
- Skill 20 (Observability/SRE) — para sistemas multiplayer com servidor proprio que precisam de
  logging/metrica/alerta em producao
- Skill 66 (Game Architecture Design) — quando a implementacao revela que a decisao de arquitetura
  original nao se sustenta e precisa ser revisitada

## Evidencia de Conclusao

- codigo do sistema implementado, com a estrutura de dado associada
- para otimizacao: medicao de profiler antes/depois, ou justificativa de por que nao havia como medir
- para multiplayer: modelo de autoridade declarado e tratamento de latencia/dessincronia descrito
- checkpoints do fluxo de trabalho (passo 4 e 5) confirmados, nao pulados

## Fontes

Codigo e estrutura desta skill sao portados e adaptados de `Jeffallan/claude-skills`
(https://github.com/Jeffallan/claude-skills), especificamente a skill `game-developer` e suas cinco
references (`unity-patterns.md`, `unreal-cpp.md`, `ecs-patterns.md`, `performance-optimization.md`,
`multiplayer-networking.md`). Licenca MIT, copyright 2025, permite reuso e adaptacao com atribuicao.

Curadoria em 2026-08-26. Tratamento do conteudo:

- **Codigo C#/C++**: portado quase verbatim dos exemplos originais (padroes genericos de engine, sem
  acoplamento a nada especifico do repositorio original) — os blocos de codigo em `references/` desta
  skill sao os mesmos exemplos, com comentario e prosa ao redor traduzidos/expandidos em portugues.
- **Estrutura e prosa**: traduzida e reestruturada no formato de skill deste kit (frontmatter em
  PT-BR, secoes de Governanca/Quando Usar/Quando Nao Usar/Handoff que o repositorio original nao tinha).
- **Nao portado**: nenhuma outra skill do repositorio Jeffallan/claude-skills alem de `game-developer`
  foi usada — o repositorio tem 66 skills cobrindo dominios fora de jogo (React, Django, Kubernetes,
  etc.) que nao sao escopo desta curadoria.
- **Gap reconhecido**: Godot/GDScript nao tem cobertura propria porque nenhuma fonte avaliada continha
  profundidade real nesse motor — ver secao "Cobertura de Godot" acima em vez de inferir paridade que
  nao existe.
