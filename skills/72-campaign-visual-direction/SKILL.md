---
name: campaign-visual-direction
description: |
  Converte estratégia e copy aprovadas em conceito visual, Bíblia de Continuidade e shot intents
  estruturados. Separa referências de identidade e linguagem e reserva texto/UI para overlays
  determinísticos. Trigger em: "direção visual da campanha", "bíblia de continuidade do anúncio",
  "shot intents", "shot list publicitário", "shot list publicitaria", "handoff visual da copy",
  "conceito visual com continuidade", "planejar cenas do anúncio", "planeja as cenas do anuncio".
argument-hint: "<ResearchStrategyArtifact> <CopyDeckArtifact> [--format <formato>]"
allowed-tools: Read, Grep, Glob
---

# Campaign Visual Direction

Produz um `CreativeDirectionArtifact`. Define o que cada cena precisa comunicar e preservar; não
escreve prompts finais de fornecedor nem gera mídia.

## Governança Global

Segue `GLOBAL.md`, `policies/source-driven.md`, `policies/evals.md`, `policies/handoffs.md` e
`policies/tool-safety.md`. UI real, texto legível, logo e preço permanecem determinísticos.

## Quando Usar

- depois de estratégia e candidata de copy aprovadas
- para definir conceito, continuidade, referências e intenção de cada shot
- antes de roteiro técnico, prompt compiler, keyframes ou geração de mídia
- quando produto, personagem, local ou interface precisam de fidelidade entre cenas

## Quando Não Usar

- a campanha ainda precisa de pesquisa: skill 70
- a mensagem ainda não foi definida: skill 71
- pedido é gerar imagem isolada: skill 17
- pedido é implementar animação/motion na interface: skill 12

## Entradas Esperadas

- `ResearchStrategyArtifact` e candidata selecionada do `CopyDeckArtifact`
- formato, duração, canal, assets, brand kit e referências
- capacidades do plano de geração e restrições de produção
- elementos que precisam de fidelidade e variações permitidas

## Saídas Esperadas

Um `CreativeDirectionArtifact` JSON com `schemaVersion: creative-direction.v1`, contendo:

- referências à estratégia, oportunidade, copy e candidata
- `concept`: nome, ideia, rota e promessa visual
- `referenceRoles[]`: `identity` ou `language`, com preservar/extrair/ignorar
- `visualBible`: estilo, personagem, figurino, local, produto, paleta, câmera, luz, grade, materiais,
  assinatura, elementos travados, variáveis e proibidos
- `shotIntents[]`: função narrativa, mensagem, copy refs, evidências, duração, sujeito, ação,
  ambiente, composição, câmera, luz, mudança temporal, continuidade, assets, overlays e riscos
- `missingInputs[]` e `qaNotes[]`

## Responsabilidades

1. Escolher rota principal de produto, humano, processo, transformação, ambiente, história ou híbrida.
2. Separar referência de identidade da referência de linguagem visual.
3. Dar a cada shot uma função narrativa e uma ação principal.
4. Reservar headline, preço, CTA, screenshots e UI para `overlayPlan` ou assets determinísticos.
5. Em image-to-video, tratar o keyframe aprovado como fonte de identidade, composição, cenário e luz;
   o vídeo descreve movimento e mudança temporal.
6. Registrar limitações quando faltarem vistas ou referências, sem inventar o original.

Presença humana, acabamento, energia, movimento e quantidade de cenas são decisões do caso, não
percentuais universais. Não inclua marca de câmera, resolução promocional ou vocabulário de fornecedor
por hábito. O compiler downstream escolhe a formulação apropriada ao modelo.

## Anti-padrões

- pedir ao gerador que desenhe texto, logo, preço, screenshot ou UI
- copiar identidade de uma referência usada apenas como linguagem visual
- misturar duas ações principais no mesmo shot
- definir prompts finais de fornecedor nesta etapa
- inventar rosto, embalagem, ângulo ou lado não observado como se fosse fiel ao original

## Evidência de Conclusão

- mensagens e claims visuais apontam para copy e evidências
- continuidade separa `locked`, `mayVary` e `forbidden`
- cada shot tem uma ação principal e cabe na duração total
- overlays determinísticos estão separados da mídia generativa
- o JSON respeita `creative-direction.v1`

## Handoff

Entrega o artefato para roteiro técnico, prompt compilers, plano de keyframes e compositor. Os
consumidores podem refinar formulação, mas não podem alterar silenciosamente estratégia, claim ou
elementos travados.

## Integração com Pipeline

`70 research -> 71 copy -> 72 visual direction -> roteiro/compilers -> keyframes -> geração ->
overlays -> QA`. Esta skill termina antes do prompt final de mídia.

## Fontes

Conteúdo original, consolidado a partir dos contratos de campanha do usuário. Não incorpora texto de
terceiros.
