# AI Integration Security

## Regras obrigatorias

- chaves e tokens apenas no backend
- nunca expor provider key no frontend
- normalizar chamadas via adapter interno
- logar sem vazar segredo ou PII
- limitar custo por request, usuario ou sessao quando possivel

## Safety de prompt

- tratar texto de usuario como input, nao como instrucao de sistema
- nao misturar politica do app com conteudo nao confiavel
- quando houver RAG, filtrar e resumir contexto antes de enviar

## Segredos expostos

- se uma chave aparecer em log, chat, screenshot ou commit, tratar como comprometida e rotacionar
