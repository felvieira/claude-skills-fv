# Revisão de texto e comentários

## Texto da interface

Compare cada afirmação com a fonte disponível e com a ação do usuário. Prefira informação específica, sem transformar uma hipótese em promessa. Respeite terminologia, idioma, contexto de acessibilidade e voz da marca.

| Caso | Revisão adequada |
|---|---|
| Botão com rótulo vago | Dizer a ação efetiva quando o comportamento estiver confirmado. |
| Métrica sem contexto | Preservar o número e indicar que unidade ou período não foram confirmados; não inventá-los. |
| Selo de confiança sem fonte | Identificar a ausência de evidência e seguir o escopo autorizado antes de alterar conteúdo. |
| Erro genérico | Explicar o que ocorreu e a recuperação disponível, se conhecidas; não culpar o usuário. |
| Expressão promocional | Avaliar especificidade e tom no contexto, sem remover termos por uma lista mecânica. |

## Comentários no código

Um comentário é candidato a revisão quando repete literalmente uma operação evidente, está desatualizado ou atrapalha o entendimento. Preserve explicações de contrato, concorrência, segurança, limites, compatibilidade, trabalho pendente acionável e avisos legais. Um comentário útil não tem limite arbitrário de linhas.

Exemplo sintético: `// Soma 1 ao contador` ao lado de `count++` pode ser redundante; uma nota que explique por que uma repetição de webhook deve ser ignorada pode ser essencial. Antes de remover, leia o trecho e os consumidores. Em pedido restrito a comentários, preserve código executável e formatação sem relação com a mudança; compare o diff e execute verificação pertinente.

Não classifique autoria de código ou texto por aparência. Consulte `policies/anti-ai-writing.md` para revisão editorial mais ampla e `skills/13-marketing-copy/SKILL.md` para copy de produto.
