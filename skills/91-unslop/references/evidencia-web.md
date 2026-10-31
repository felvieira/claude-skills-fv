# Evidência de acessibilidade e desempenho

Use apenas o que se aplica às alterações; marque cada item como verificado, falhou, não aplicável ou não verificado, com ambiente e resultado. Não anuncie conformidade global com base em uma página ou scanner.

| Área | Verificação | Limite |
|---|---|---|
| Semântica | Controles nativos quando adequados, nome acessível, rótulos e estados coerentes. | Um atributo presente não demonstra usabilidade. |
| Teclado | Percorrer fluxo, observar ordem, foco visível e retorno de foco em diálogos alterados. | Não substitui teste com leitor de tela. |
| Contraste | Medir pares reais de texto/fundo, nos temas e estados relevantes. | Transparência, gradientes, imagens e sobreposições exigem cor efetivamente composta; token isolado não basta. |
| Responsividade | Exercitar tamanhos relevantes, zoom, texto longo e interação de toque. | Uma captura não prova que os controles funcionam. |
| Movimento | Exercitar preferência por movimento reduzido e verificar se informação permanece disponível. | Emulação não cobre todos os dispositivos. |
| Estabilidade | Reservar espaço para mídia, verificar mudanças de layout e carregamento de fontes quando aplicável. | Dimensões declaradas não comprovam CLS medido. |
| Imagem principal | Identificar a imagem de conteúdo mais importante e avaliar prioridade de carregamento. | A imagem de LCP deve ser identificada por medição; não assuma que toda imagem do hero é LCP. |
| Scripts e fontes | Investigar recursos de terceiros e trabalho que bloqueia renderização. | A presença de um script externo não prova bloqueio; medir antes de alegar ganho. |

Para um cálculo pontual de duas cores opacas em hexadecimal, use `skills/91-unslop/scripts/contrast.mjs`. Consulte `skills/22-accessibility-specialist/SKILL.md` e `skills/56-responsive-conversion/SKILL.md` para verificação mais abrangente. Métricas de campo e laboratório têm escopos distintos: relate origem, dispositivo, condições, valor e limitações.
