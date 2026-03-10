# End-to-End Example - Text Feature

## Caso

Adicionar geracao de descricao de produto no painel admin.

## Fluxo

1. endpoint server-side recebe dados do produto
2. adapter chama gateway de texto
3. schema valida saida
4. hook do client dispara a acao e mostra loading/error
5. evento de uso pode ser enviado para analytics

## Componentes

- provider: `Vercel AI Gateway` ou `OpenRouter`
- adapter: `generateText()`
- hook: `useTextGeneration`
- schema: titulo, bullets, descricao curta

## Regra

Nao mandar payload inteiro do produto se apenas titulo, categoria e atributos principais bastarem.
