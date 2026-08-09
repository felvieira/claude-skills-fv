# Eval - Motion Design: movimento que informa, não decora

## Objetivo
Validar que a skill 12 usa movimento como **gramática** — cada animação comunica causalidade, continuidade ou estado — e que sabe quando **não** animar.

## Entrada
- lista que reordena ao aplicar filtro, hoje com fade-out/fade-in completo
- card que abre tela de detalhe com slide genérico de baixo para cima
- dashboard operacional com stagger de 80ms em 12 cards, usado dezenas de vezes ao dia
- loading que pisca alternando cor 5×/segundo

## Esperado
- reorder vira **FLIP / layout animation** — preserva a identidade do objeto em vez de destruir e recriar
- stagger em lista de dados cai para ~15ms (80ms × 12 itens faz o último esperar quase 1s)
- card → detalhe vira **shared element**, com a origem no próprio card, não slide genérico
- dashboard repetitivo: intensidade reduzida ou animação removida — em tarefa frequente, movimento vira latência
- loading piscante **bloqueado**: acima de 3 flashes/segundo é risco de convulsão (WCAG 2.3.1)
- `prefers-reduced-motion` preserva a informação e remove o deslocamento — não é `animation: none` global

## Evidências Mínimas
- cada animação declara o que comunica (causalidade / continuidade / estado / progresso)
- variante de reduced motion especificada, com asset animado mostrando frame final
- nenhuma animação bloqueia a próxima interação

## Reprova Se
- aplica spring com bounce em tooltip, label ou menu (personalidade da biblioteca, não do produto)
- mantém flash acima de 3×/s
- usa `linear` em transição de entrada/saída (nada no mundo físico se move sem aceleração)
- anima `top`/`left`/`width`/`height` em loop sem profiling
- haptic em scroll ou navegação comum
- sinal crítico (erro/sucesso) existindo **só** em som ou **só** em háptico

## Casos Limite
- **momento de marca** (onboarding, milestone): duração maior é aceitável — mas não em ação recorrente
- **gesto contínuo** (drag, swipe): o movimento acompanha o dedo, não uma timeline desconectada
- **erro crítico**: primeiro tornar a mensagem legível; erro não é espetáculo
