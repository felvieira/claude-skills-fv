# Estrutura Fisica do Projeto

Separado da arquitetura lógica de sistemas — decisões próprias que não devem ser herdadas por acidente
do último projeto.

## Convencao de Pasta e Formato de Dado

Decidir explicitamente: tabela editável por designer (planilha/CSV/JSON versionado) vs asset binário
de engine (ScriptableObject, Data Asset). Tabela favorece iteração rápida e diff legível em controle de
versão; asset binário favorece integração nativa com o editor da engine e referência direta a outros
assets (prefab, material). Muitos projetos usam os dois: tabela para números e texto, asset binário
para o que referencia conteúdo visual.

## Pipeline de Asset

Convenção de naming, estrutura de pasta por tipo (character/environment/vfx/audio), e processo de
importação (compressão de textura, LOD de malha) merecem documento próprio, versionado, e revisado
quando a equipe cresce — pipeline informal se degrada rápido acima de 3-4 pessoas tocando asset.

## Distribuicao

Empacotamento (build por plataforma), hot update (trocar conteúdo sem passar por revisão de loja,
comum em mobile), CDN (servir asset grande fora do binário inicial), e estratégia de deploy (staged
rollout, canary) são decisões de arquitetura de distribuição — não afetam a lógica de gameplay, mas
afetam profundamente como o conteúdo é versionado e testado antes de chegar ao jogador.

## Multiplayer — Arquitetura de Servidor

Quando o sistema exige rede, decidir o modelo de servidor antes de desenhar qualquer sistema de
gameplay em cima dele:

| Modelo | Serve quando |
|---|---|
| Servidor de sala (room-based) | Sessão pequena a média, dono da sala explícito, fluxo de entrada/liquidação/reconexão |
| Servidor de encontro (turn-based/combat) | Fluxo de turno ou combate com checkpoint, ação idempotente, liquidação determinística |
| Mundo persistente (AOI) | Mundo aberto contínuo, ownership de região, transferência entre região, registro de localização |

Componentes de servidor compartilhados entre os três modelos: autenticação, gateway, connector
(gerência de conexão), banco de dados, cache, descoberta de serviço, fila de mensagem, e
observabilidade — desenhar essa infraestrutura comum uma vez, não reimplementar por modelo.

Para sincronização determinística (lockstep, rollback netcode), o pipeline de frame, replay, e
tratamento de dessincronia precisa de desenho explícito separado do modelo de servidor escolhido —
esse padrão serve principalmente jogos competitivos de baixa latência onde replicar estado completo a
cada frame é caro demais.
