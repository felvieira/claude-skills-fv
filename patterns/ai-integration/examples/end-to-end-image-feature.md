# End-to-End Example - Image Feature

## Caso

Adicionar geracao de hero image para landing page dentro do CMS.

## Fluxo

1. ler contexto visual do produto
2. montar prompt coerente com branding
3. adapter chama `fal.ai`
4. resposta volta com URL ou path do asset
5. frontend mostra preview e permite regenerar

## Componentes

- provider: `fal.ai`
- adapter: `generateImage()`
- hook: `useImageGeneration`
- contexto: `repo-audit/assets.md`

## Regra

Nao gerar hero como folha em branco se o produto ja tiver identidade visual estabelecida.
