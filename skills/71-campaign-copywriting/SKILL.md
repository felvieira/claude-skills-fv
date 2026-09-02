---
name: campaign-copywriting
description: |
  Transforma uma estratégia de campanha com evidence ledger em rotas de copy rastreáveis, distintas
  e adequadas ao canal. Não refaz pesquisa e não inventa claims. Trigger em: "copy baseada na
  pesquisa", "copy baseada na pesquisa e mantenha as evidencias", "copy deck da campanha",
  "variações de anúncio com evidência", "variacoes de anuncio", "copy rastreável", "transforma a
  estratégia em anúncios", "transforma a estrategia", "rotas de copy da campanha", "copy com claim
  ledger".
argument-hint: "<ResearchStrategyArtifact> [--channel <canal>] [--duration <segundos>]"
allowed-tools: Read, Grep, Glob
---

# Campaign Copywriting

Produz um `CopyDeckArtifact` a partir de uma estratégia aprovada. Preserva público, oportunidade,
framework e guardrails; qualquer divergência precisa ser declarada.

## Governança Global

Segue `GLOBAL.md`, `policies/anti-ai-writing.md`, `policies/source-driven.md`, `policies/evals.md` e
`policies/handoffs.md`. Claims comerciais só podem usar evidências autorizadas pela etapa anterior.

## Quando Usar

- depois da skill 70 ou de um `ResearchStrategyArtifact` equivalente
- para gerar rotas de campanha realmente diferentes com o mesmo núcleo estratégico
- quando cada claim precisa manter vínculo com evidência
- para adaptar hook, corpo, CTA e densidade verbal ao canal e à duração

## Quando Não Usar

- pesquisa ainda não existe ou seus claims não estão autorizados: skill 70
- copy direct-response isolada sem pipeline de evidência: skill 50
- landing page estrutural, microcopy ou brand voice: skill 13
- direção visual, shot list ou prompts: skill 72

## Entradas Esperadas

- `ResearchStrategyArtifact` e oportunidade selecionada
- objetivo, canal, formato, duração, idioma, tom e oferta
- limites de fala, texto na tela, política da plataforma e brand voice
- provas disponíveis e claims proibidos

## Saídas Esperadas

Um `CopyDeckArtifact` JSON com `schemaVersion: copy-deck.v1`, contendo:

- `strategyRef`, `framework`, canal, formato e duração
- três ou mais `candidates[]` com `id`, ângulo, headline, hook, corpo/roteiro, CTA e `onScreenText`
- `claims[]`, cada um com `evidenceIds`
- scores de aderência, hook, clareza, segurança factual e viabilidade de produção
- `recommendedCandidateId`, `claimGaps[]` e `handoff` visual

## Responsabilidades

1. Não pesquisar novamente. Lacuna vira `claimGaps`, remoção ou reformulação.
2. Criar ao menos três mecanismos distintos: identidade/desejo, demonstração/benefício comprovado e
   a melhor oportunidade alternativa sustentada.
3. Respeitar orçamento de palavras e pausas naturais em vídeo falado.
4. Manter `onScreenText` curto. A renderização pertence ao compositor.
5. Recomendar por aderência estratégica, força do hook, clareza, sustentação, naturalidade e produção.
6. Rodar o gate anti-AI e o gate de integridade antes da entrega.

Escolhas emocionais podem não ter evidência desde que não se apresentem como fato. Nunca invente
preço, desempenho, comparação, garantia, certificação, depoimento, experiência pessoal, escassez ou
urgência. O hook não pode prometer mais do que o corpo entrega.

## Anti-padrões

- trocar palavras e chamar de rota diferente
- esconder `claimGaps` atrás de pontuação alta
- pesquisar de novo e criar uma segunda fonte de verdade
- colocar headline, preço ou CTA dentro de prompt de imagem
- empilhar gatilhos ou escrever como anúncio genérico de IA

## Evidência de Conclusão

- todos os claims possuem `evidenceIds` autorizados
- as rotas diferem por mecanismo, não apenas por sinônimo
- a candidata recomendada cabe no canal e duração
- o `handoff` declara promessa, emoção, elementos obrigatórios, proibições e CTA
- o JSON respeita `copy-deck.v1`

## Handoff

Entrega a candidata selecionada e o `handoff` para skill 72. Se nenhum candidato for seguro, retorna
`claimGaps` e volta à skill 70 em vez de inventar prova.

## Integração com Pipeline

`70 research -> 71 copy -> 72 visual direction`. A skill 50 pode ajudar com fórmulas de direct
response, mas não substitui a rastreabilidade deste estágio.

## Fontes

Conteúdo original, consolidado a partir dos contratos de campanha do usuário. Não incorpora texto de
terceiros.
