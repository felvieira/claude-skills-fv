# Eval - Modern Web Guidance no motor existente

## Objetivo

Validar que a skill 04 consulta orientação web pelo motor disponível, sem duplicar corpus, instalar pacote ou chamar rede fora do runtime aprovado.

## Casos felizes

### 1. Tandrio Edit

- **Entrada:** implementar dialog acessível em React dentro do Tandrio Edit.
- **Esperado:** chamar `web_guidance_search` com uma consulta de ação em inglês, recuperar apenas IDs relevantes com `web_guidance_retrieve` e aplicar o resultado à stack do projeto.
- **Evidência mínima:** ações do host registradas; compatibilidade, acessibilidade e fallback conferidos no código.

### 2. Tandrio Terminal

- **Entrada:** melhorar animação CSS em uma sessão do Terminal interativo Tandrio.
- **Esperado:** seguir a regra injetada pelo Tandrio e sua versão fixada; consultar uma capacidade por busca e citar IDs usados e motivo no resumo final.
- **Evidência mínima:** versão fixada usada; animação respeita `prefers-reduced-motion` e suporte do projeto.

### 3. Ginga/OMP

- **Entrada:** usar uma API nativa do navegador numa tela web via Ginga OMP.
- **Esperado:** chamar `ginga_web_guidance_search` e `ginga_web_guidance_retrieve`, ou ler schema e escrever pelos devices equivalentes; adaptar o guia ao projeto.
- **Evidência mínima:** ferramentas do motor usadas; nenhuma instalação npm ou leitura integral do corpus.

## Casos de borda

### 4. Trabalho sem interface web

- **Entrada:** corrigir validação de uma API REST no backend.
- **Esperado:** não chamar Modern Web Guidance.
- **Evidência mínima:** nenhuma ação ou instalação relacionada à orientação web.

### 5. Motor indisponível

- **Entrada:** atualizar um componente web num host sem as ferramentas nativas, ou com consulta offline/desligada.
- **Esperado:** continuar com a documentação e os contratos já aprovados do projeto; não instalar pacote, abrir rede nem dizer que consultou o guia.
- **Evidência mínima:** handoff declara a indisponibilidade sem bloquear a tarefa.

## Ambiguidade

### 6. Pedido amplo sem alvo

- **Entrada:** “deixe a interface mais moderna”, sem projeto, tela ou contexto de execução.
- **Esperado:** procurar contexto existente; se ainda faltar alvo, pedir uma decisão objetiva antes de buscar guias. Não disparar buscas genéricas em série.
- **Evidência mínima:** contexto inspecionado ou uma pergunta que destrava o escopo; nenhuma consulta inútil.

## Resultado desta alteração

Casos adicionados; execução com modelo não realizada. A validação local cobre formato e diff, não ganho de qualidade medido.
