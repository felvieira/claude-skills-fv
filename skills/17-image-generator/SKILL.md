---
name: image-generator
description: |
  Skill para geracao e adaptacao de assets visuais. Use quando o projeto precisar de hero image,
  background, ilustracao, icone, favicon, mascote ou derivacao de imagem existente sem destoar do app.
  Trigger em: "gerar imagem", "criar imagem", "hero image", "background image", "favicon", "icone",
  "mascote", "illustration", "remover fundo", "transparent icon", "tauri icons".
---

# Image Generator

O Image Generator cria ou adapta assets visuais mantendo consistencia com o contexto real do produto.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md`, `policies/tool-safety.md` e `policies/evals.md`.

## Quando Usar

- criar hero image, background, ilustracao, icone, favicon ou mascote
- derivar asset existente sem quebrar identidade visual do app
- preparar assets para web, SEO social cards ou Tauri/mobile

## Quando Nao Usar

- para inventar estilo novo sem analisar o produto existente
- para substituir UI/UX, SEO ou Frontend na definicao de uso do asset
- para gerar imagem final sem antes verificar contexto visual quando o repo ja tiver assets

## Entradas Esperadas

- tipo de asset necessario
- onde o asset sera usado
- contexto visual do projeto
- paths de assets existentes, se houver
- restricoes de formato, tamanho, transparencia e output

## Saidas Esperadas

- prompt final reproduzivel
- asset coerente com o projeto
- output path e variacoes geradas
- handoff claro para Orchestrator, UI/UX, Frontend ou SEO

## Responsabilidades

1. Decidir entre gerar do zero (`t2i`) ou derivar asset existente (`i2i`)
2. Analisar identidade visual antes de propor prompt ou modelo
3. Garantir consistencia com cores, composicao, linguagem visual e assets do projeto
4. Escolher formato e pos-processamento adequados ao uso final
5. Registrar prompt, modelo, output e motivo das escolhas

## Regra Mais Importante

Se o repositorio ja tiver imagens, ilustracoes, icones, logos, backgrounds, mascotes ou design tokens, a skill DEVE analisar esse contexto primeiro.

Nunca gerar asset como se o projeto fosse uma folha em branco quando ja existir linguagem visual estabelecida.

## Analise de Contexto Visual

Antes de gerar qualquer imagem, verificar nesta ordem:

1. `UI/UX` e design tokens do projeto
2. assets existentes em `public/`, `assets/`, `src-tauri/icons/` ou caminhos equivalentes
3. componentes e paginas onde a imagem vai entrar
4. metadata/SEO quando a imagem for social card, thumbnail ou hero publica
5. restricoes de plataforma, como favicon, app icon ou transparencia

## Checklist Antes de Gerar

- qual e a funcao do asset no produto
- o projeto ja tem paleta, contraste, mood e linguagem visual definidos
- existem imagens ou icones parecidos para derivacao ou referencia
- a imagem precisa parecer parte do mesmo app, e nao um elemento isolado de outro estilo
- o output final precisa de transparencia, resize, ico ou pacote para Tauri

## Modos de Trabalho

- `t2i`: usar apenas quando nao houver asset base adequado
- `i2i`: preferir quando o projeto ja tiver mascote, icone, ilustracao ou base visual reutilizavel

## Tipos de Asset

| Tipo | Quando usar |
|------|-------------|
| `layout` | imagem compondo secao ou tela inteira |
| `hero` | imagem principal acima da dobra |
| `icon` | icone de funcionalidade ou servico |
| `favicon` | favicon multi-tamanho e apple-touch-icon |
| `mascote` | personagem da marca em nova situacao |
| `background` | textura ou fundo de secao |
| `illustration` | ilustracao explicativa de conceito |
| `social-card` | imagem para Open Graph, Twitter ou compartilhamento |

## Regras de Prompt

- refletir a paleta, contraste e mood reais do produto
- mencionar explicitamente estilo visual existente quando ele ja estiver definido
- para `i2i`, descrever apenas a mudanca desejada e preservar o resto
- evitar adjetivos vagos como "bonito" ou "moderno" sem contexto do projeto
- nao introduzir cores, personagens ou composicoes que destoem dos assets ja usados no app

## Selecao de Modelo

Escolher modelo conforme necessidade do ambiente:

- variacoes rapidas e testes: modelo mais barato e rapido
- hero, background e ilustracao padrao: modelo equilibrado
- tipografia ou prompt mais dificil: modelo mais forte quando necessario
- acabamento final: modelo com melhor fidelidade visual disponivel

## Execucao

Se o projeto usar script local, seguir o fluxo dele. Se nao usar, adaptar ao mecanismo disponivel no ambiente sem acoplar a skill a um vendor unico.

## Output Path

Preferencia de destino:

1. `src-tauri/icons/` para assets nativos de Tauri
2. `public/images/generated/` para web app com `public/`
3. `assets/images/` se a base do projeto usar `assets/`
4. pasta local equivalente do repositorio quando a estrutura for diferente

## Integracao com Outras Skills

- `UI/UX`: confirma encaixe visual e composicao
- `Asset Librarian`: fornece inventario de assets, logos, fontes e tokens visuais existentes
- `Frontend`: confirma uso real do asset e dimensoes
- `SEO`: confirma necessidades de Open Graph, alt text e imagem publica
- `Mobile Tauri`: confirma formatos e tamanhos para icones nativos
- `Orchestrator`: decide momento certo da geracao no pipeline

## Evidencia de Conclusao

- contexto visual existente analisado antes da geracao
- prompt final coerente com o app
- asset salvo no local correto com formato adequado
- modelo, variacoes e output registrados para reproducao

## Handoff

Entregar sempre:

- paths dos arquivos gerados
- prompt usado
- contexto visual considerado
- formato, dimensao e pos-processamento

Seguir `policies/handoffs.md` e, quando util, `templates/handoff.md`.

## Codigo Limpo

Codigo deve priorizar clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.
