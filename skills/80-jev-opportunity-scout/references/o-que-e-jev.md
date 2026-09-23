# O que é o Jev (System One da TypeSafe)

Jev é o modelo carro-chefe da família "System One" da TypeSafe. A diferença central em relação a um LLM comum: **não gera texto, retorna uma decisão tipada com probabilidade calibrada.**

| | LLM comum (GPT, Claude, etc.) | Jev / System One |
|---|---|---|
| Saída | Texto livre, precisa de parse | Campo tipado (`choice`, `noul`, `score`) + distribuição de probabilidade |
| Uso típico | Gerar conteúdo, raciocinar, explicar | Rotear, classificar, detectar, pontuar |
| Velocidade | Mais lento (gera token a token) | Rápido, pensado pra decisão em lote/tempo real |
| Custo | Preço de LLM completo | `$0.042` por milhão de tokens de input, output gratuito |
| Calibração | Não garantida | Treinado especificamente pra que a probabilidade reflita confiança real |

Analogia do próprio material da TypeSafe: é "System 1" no sentido de Kahneman (`Thinking, Fast and Slow`) — julgamento rápido e intuitivo, não deliberação lenta passo a passo. O código continua no controle do fluxo; o Jev só responde perguntas específicas e bem delimitadas sobre um estado (texto, JSON, ou array).

**Limitação real:** só aceita texto como entrada (string, JSON, array de texto) — sem imagem, áudio ou vídeo. Se a decisão depende de conteúdo visual, Jev não é a ferramenta.

**Onde entra no fluxo de uma aplicação:**
1. Montar um `state` com o contexto relevante (mensagem do cliente, dados da transação, política aplicável).
2. Fazer perguntas independentes na mesma chamada — elas rodam em paralelo, sem ver a resposta uma da outra.
3. Combinar as respostas com checagem determinística em código, então decidir a ação.

Fonte: documentação oficial em [docs.typesafe.ai/concepts/system-one](https://docs.typesafe.ai/concepts/system-one).
