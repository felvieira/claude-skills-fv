---
name: ai-video-direction
description: |
  Direção de vídeo com IA de ponta a ponta: história, roteiro, direção de cena, folhas de
  personagem, placas de cenário, prompt por clipe (template v4), geração no Seedance 2.5
  reference-to-video pela API da Higgsfield, QA quadro a quadro, reparo e pós-produção (fala
  nativa com lip sync, trilha por sequência, SFX, legendas, loudness). Regras nascidas de erros
  pagos num filme real de 3 min. Integrar vídeo num app é a skill 27; só editar, a 75.
  Trigger em: "gerar vídeo com IA", "filme com IA", "dirigir vídeo com IA", "seedance",
  "higgsfield", "prompt de vídeo", "storytelling", "roteiro de vídeo", "folha de personagem",
  "placa de cenário", "reference-to-video", "direção de cena", "lip sync",
  "trilha por sequência", "continuidade entre clipes", "AI video direction", "AI film",
  "video prompt", "character sheet", "scene direction", "talking head".
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(node *), Bash(ffmpeg *), Bash(ffprobe *)
metadata:
  argument-hint: "<ideia, história ou roteiro> [duração] [proporção] [idioma das falas]"
  version: "1.0.0"
---

# AI Video Direction — história, prompt, câmera, referências, geração, QA e pós

Conduz uma produção de vídeo com IA do briefing ao MP4 final. O modelo não "entende cinema":
entende corpos apoiados em algo, um mundo com regras, uma câmera num lugar e um estado de entrada e
de saída. Dinheiro só sai depois que cada etapa barata foi aprovada.

## Governança Global

Segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/tool-safety.md`,
`policies/cost-optimization.md`, `policies/claim-verification.md`,
`policies/verification-before-completion.md` e `policies/anti-ai-writing.md` (roteiro e cartelas).

Três regras sem exceção:

1. **Dinheiro:** antes de cada rodada paga (imagem, vídeo, música, SFX), mostrar o custo estimado
   por item e o total, e esperar o ok do usuário. `--dry` primeiro, sempre.
2. **Segredo:** credenciais só por variável de ambiente (`HF_CREDENTIALS`, `FAL_KEY`). Nunca ler,
   imprimir ou colar `.env` no chat, em log, em commit ou em job JSON.
3. **Verificação:** nunca afirmar que um clipe "está bom" sem ter olhado a folha de quadros e
   conferido o áudio (STT ou RMS por janela). Plano pronto não é vídeo aprovado.

## Quando Usar

- transformar uma ideia, uma história real ou um roteiro num filme curto gerado por IA
- escrever ou consertar o prompt de um clipe de Seedance/Higgsfield
- montar folhas de personagem e placas de cenário que o modelo de vídeo vai receber como referência
- diagnosticar um clipe que saiu errado (física, continuidade, rosto, fala, moderação) e reparar
- fazer a pós: juntar clipes, trilha por sequência, SFX, cartelas, legendas e loudness

## Quando Não Usar

- integrar geração de vídeo numa feature de app (fila, webhook, UX de espera): skill 27
- só cortar, legendar ou normalizar um vídeo pronto, sem decisão de direção: skill 75
- analisar ou transcrever um vídeo existente: skill 54
- gerar imagem avulsa (thumbnail, OG, hero): skills 17 e 36

## Entradas Esperadas

O brief de `templates/brief.md` (10 itens), extraído do pedido sem exigir formulário. Idioma das
falas: o do projeto, padrão **PT-BR**. Pessoas reais só com fotos que o usuário pode usar.

## Saídas Esperadas

| Entrega | Formato |
|---|---|
| 1. História | premissa, pergunta dramática, personagens, arco, motivo com setup e payoff |
| 2. Roteiro | cenas com ações e falas literais no idioma do projeto |
| 3. Plano de direção | engine, acting tasks, beats, mapa, STATE IN/OUT, clipes de 5 a 8 s |
| 4. Pacote de geração | folhas, placas, um prompt v4 por clipe, jobs JSON, ledger previsto × real |
| 5. Acabamento | montado por sequência, trilha, SFX, cartelas, legendas, MP4 a −14 LUFS |

Pasta por sequência: `NN_nome/{entrega,base,prompts,arquivado}`. Versão nova nunca sobrescreve.

## Fluxo

1. **Brief e modo de autoria** (criar, adaptar história real, dirigir roteiro, compilar estrito,
   reparar). Perguntar só o que muda o resultado central; o resto vira suposição registrada.
2. **História:** 3 propostas com motores diferentes, escolher, bíblia e ficha de personagem.
3. **Roteiro:** cada fala faz algo; o tom da fala acompanha o nível de perigo.
4. **Direção:** scene engine, acting task por personagem, beats, mapa e leis de física, STATE IN/OUT.
   Dividir em clipes de 5 a 8 s, nunca um clipe de 20 s com 10 ações.
5. **Folhas e placas** (paralelo, centavos): QA de asset antes de virar referência.
6. **Prompts v4** por clipe, lint, `--dry` com estimativa, anunciar custo, gerar a sequência em paralelo.
7. **QA:** folha de 8 quadros e STT de cada clipe, rubrica 0 a 2, laudo com timecode.
8. **Reparo local:** uma variável por tentativa, regerar só o quebrado, reaproveitar trecho bom.
9. **Pós:** fala nativa, trilha por sequência com crossfade na transição, ducking por sidechain,
   SFX gerados, cartelas e legendas via libass, `loudnorm` a −14 LUFS.

## Onde está cada coisa

| Arquivo | Ler quando |
|---|---|
| `references/fluxo.md` | ordem, paralelismo, pastas, ledger, contrato de dados |
| `references/historia-e-direcao.md` | história, engine, romance, ação, resgate, falas |
| `references/arquitetura-do-prompt.md` | prompt v4 de um clipe, com 2 exemplos |
| `references/camera-e-otica.md` | câmera, eixo, FOV, dispositivos, luz, veto |
| `references/fisica-e-continuidade.md` | apoio, gravidade, mecanismo, STATE, cor exclusiva |
| `references/folhas-e-placas.md` | folha, época, placa, QA de asset |
| `references/higgsfield-api.md` | endpoints, polling, retomada, modelos, preços |
| `references/moderacao-e-reparo.md` | filtro de segurança, falha → ajuste, reaproveitamento |
| `references/talking-head-e-apresentador.md` | apresentador falando, quadro-base, ranking de 13 modelos |
| `references/qa.md` | folha de contato, STT, checklist, rubrica, status |
| `references/audio-e-pos.md` | fala nativa, trilha, ducking, SFX, legendas, loudness |
| `references/custos-e-orcamento.md` | estimar, ledger, o que não é cobrado |
| `references/armadilhas-do-produto.md` | 41 furos de um pipeline automático |
| `templates/` | brief, prompt v4, folha, placa, checklist de QA |

## Guia-base → onde está na skill

| Guia | Coberto em |
|---|---|
| Sistema de storytelling v1.0 (autoria, romance, ação, §3, QA, reparo, §22) | `historia-e-direcao`, `fluxo`, `qa`, `moderacao-e-reparo` |
| Guia de storytelling (engine, acting task, beat, frases-mãe) | `historia-e-direcao`, `templates/brief.md` |
| Prompt Builder v4.4.2 (câmera, FOV, dispositivos, 180°, veto, luz) | `camera-e-otica` |
| Padrão de cenas (blocos, locks, multidão, densidade, defaults) | `arquitetura-do-prompt`, `fisica-e-continuidade` |

## Regras de ouro

| Regra | Erro real que ela evita |
|---|---|
| reference-to-video só com folhas + placa | quadro inicial piorou o rosto em todos os testes |
| a placa contém todo landmark e mecanismo que o prompt cita | prompt descreveu um portão que a placa não tinha |
| o que sustenta cada corpo e a gravidade como lei | personagem "voando" na horizontal com a corda de lado |
| STATE OUT do clipe N é, palavra por palavra, o STATE IN do N+1 | animal que tinha fugido reapareceu na porta |
| mudou de lugar ou eixo, placa nova e diferente | fuga na mesma placa parecia correr para o perigo |
| perigo escala com causa visível e plano de aviso | plataforma "virou sozinha" e derrubou a vítima |
| vítima longe do apoio seguro; o herói vai até ela | resgate numa borda de onde ela subiria sozinha |
| acessório só sai se a folha mostrar o que há embaixo | chapéu caiu e o modelo deixou o personagem careca |
| idioma das falas declarado, fundo "never English words" | falas saíram em inglês até a regra existir |
| reação só depois do estímulo visível | flerte em que ela reagia sem ter olhado |
| o clímax continua em movimento até a transição | mãos dadas congeladas esperando o portal |
| texto legível só na edição, nunca no render | letras da folha vazaram para o vídeo |

## Anti-Padrões

| Racionalização | Realidade |
|---|---|
| "um clipe longo sai mais coeso" | 22 s com 11 ações falhou em ordem e física; 4 clipes de 5 a 8 s passaram |
| "mais adjetivo resolve" | o modelo obedece geografia, apoio e causa; "aura de perigo" não gera nada |
| "a placa é só ambiente" | a placa dita o ângulo e os objetos que existem; o que não está nela o modelo inventa |
| "tem stream de áudio, então tem fala" | stream existe mesmo mudo; quem prova fala é STT ou RMS por janela |
| "regera tudo" | listar com timecode o que presta e regerar só o beat quebrado |
| "moderação bloqueou, tenta igual" | mesmo texto, mesmo bloqueio; reescrever o contato e a queda de forma calma |

## Evidência de Conclusão

- custo anunciado e aprovado antes de cada rodada; ledger com previsto × real por item
- cada clipe entregue tem folha de quadros olhada, fala conferida e laudo com rubrica
- STATE OUT(n) = STATE IN(n+1) em toda emenda de continuidade
- MP4 final medido: duração, −14 LUFS, pico real, legendas sem colisão

## Handoff

- **26 Prompt Engineer:** template v4 como prompt de sistema
- **27 Video Integration:** levar o fluxo para um produto (fila, webhook)
- **75 FFmpeg Media:** operações de edição sem decisão criativa
- **54 Video Analysis:** transcrever ou extrair quadros em lote
- **30 Cost Tracker:** consolidar o ledger de uma produção grande

## Integração com Pipeline

O orquestrador (09) aciona esta skill para produzir ou dirigir vídeo, não para integrar API.
Fluxo típico: `84 (história → clipes → QA) → 75 (cortes finos) → 84 (pós)`. Quem constrói pipeline
automático lê `references/armadilhas-do-produto.md` e entrega para 25 e 27.

## Fontes

Filme manual de 3 min em 7 épocas (set/2026, cerca de 25 regerações diagnosticadas), os 4 guias-base
do usuário (tabela acima) e a auditoria do video-os-ai contra o filme (30/09/2026). Preços medidos
com `/estimate` em 29 e 30/09/2026; conferir antes de orçar.
