---
name: unslop
description: |
  Aperfeiçoa interfaces existentes que parecem genéricas ou artificiais, com decisões visuais fundamentadas no produto e preservação funcional.
  Trigger em: "unslop", "tirar cara de IA", "parece feito por IA", "visual genérico de IA", "deixar a interface menos genérica", "AI-looking UI", "remove AI slop".
metadata:
  argument-hint: "[repositorio, URL, tela ou escopo]"
  version: "1.0.0"
  author: Dev Team Kit
---

# Unslop — identidade e qualidade para interfaces existentes

Transforme o pedido de "tirar a cara de IA" em melhorias concretas de produto. Identifique o que dificulta compreensão, uso ou identidade e implemente as correções autorizadas no código existente. Uma aparência popular, uma cor, uma fonte ou um efeito não é defeito por si só.

## Governança

Siga `GLOBAL.md`, `policies/execution.md`, `policies/tool-safety.md`, `policies/evals.md`, `policies/claim-verification.md` e as instruções do projeto. Preserve trabalho alheio e use a stack existente. A autorização para implementar já inclui ajustes reversíveis necessários; não interrompa para pedir aprovação estética quando o usuário pediu execução direta.

## Uso e limites

- **Usar:** interface existente com pedido de retirar aparência artificial, diferenciar uma landing ou melhorar a qualidade percebida.
- **Análise apenas:** entregue diagnóstico quando o pedido for somente analisar; não edite sem indicação de implementação.
- **Redesign amplo:** `89-ui-facelift` coordena rotas e fluxos; esta skill aprofunda identidade visual quando pertinente.
- **Problema localizado:** `52-ui-polish`, `56-responsive-conversion` ou `22-accessibility-specialist`, conforme o caso.
- **Sem repositório:** uma URL permite observação e, se solicitado, protótipo local. Não afirme que alterou o produto remoto.

## Entradas e entregas

Investigue as telas e o código acessíveis, objetivos do produto, público, marca, restrições e comportamento atual. Entregue melhorias implementadas ou relatório conforme o pedido, com justificativas, evidências verificáveis e pendências. Não solicite ao usuário informações que possam ser descobertas no projeto.

## Método

1. **Estabeleça uma linha de base.** Identifique rotas, arquivos, componentes compartilhados, tokens, assets, padrões de navegação e versões relevantes. Observe a interface quando viável, anote viewport, tema e estado. Separe observação real de hipótese.
2. **Proteja contratos.** Relacione ações, links, formulários, validações, estados assíncronos, permissões, analytics e conteúdo essencial nas telas alteradas. Não modifique suas regras, dados ou integrações sem pedido explícito. Use dados sintéticos identificados em testes e não invente prova social.
3. **Classifique problemas com evidência.** Para cada achado, registre onde aparece, quem é afetado e o efeito: compreensão, tarefa, consistência, acessibilidade, performance ou identidade. Priorize o que impede tarefas, depois inconsistências recorrentes e acabamento. Se não houver problema relevante, diga isso e evite mudanças cosméticas arbitrárias.
4. **Defina o resultado desejado.** Extraia a direção da marca e da tarefa real: o que deve ser reconhecível, o que precisa de destaque, que densidade e linguagem combinam com o público. Defina 2–4 critérios observáveis de sucesso, como clareza do próximo passo ou legibilidade em viewport estreito. Não padronize todos os produtos na mesma estética.
5. **Implemente na camada correta.** Ajuste tokens e componentes compartilhados quando a causa for sistêmica; mantenha exceções justificadas. Reavalie composição, hierarquia, texto, alinhamento, cores, tipografia, imagens, estados e movimento conforme os achados. Compare alternativas com o objetivo da tela, respeitando a marca existente e sem instalar dependências desnecessárias.
6. **Verifique mudanças e exceções.** Abra as telas modificadas se houver navegador; compare antes/depois no mesmo estado e dimensões. Exercite ações afetadas, erros, carregamento, conteúdo longo, navegação por teclado, foco, contraste e movimento reduzido quando aplicável. Rode testes existentes pertinentes e diga o que ficou sem validação. Não trate build, captura ou HTTP 200 como prova de todos os fluxos.
7. **Reporte com precisão.** Mostre principais mudanças e razões, contratos preservados, verificações executadas, resultados e limitações. Informe alterações visíveis necessárias não implementadas e problemas prévios encontrados.

## Diretrizes de qualidade

- **Identidade:** diferencie o produto pelo conteúdo real, prioridades e sistema visual; preservação de marca tem preferência sobre substituições automáticas.
- **Legibilidade e inclusão:** respeite hierarquia, semântica, estados, contraste, acessibilidade por teclado e preferências do sistema. Meça quando houver ferramenta adequada.
- **Experiência:** não reduza densidade útil de dashboards, remova campos, simplifique tabelas ou elimine ações somente para obter uma imagem mais limpa.
- **Texto e dados:** melhore clareza mantendo sentido, números, direitos e regras; dados de demonstração não substituem dados reais em produção.
- **Recursos e movimento:** avalie função e custo de cada asset, efeito ou animação; respeite movimento reduzido e desempenho em dispositivos modestos.
- **Mídia opcional:** use assets existentes primeiro. Se imagem for necessária, siga a skill `17-image-generator` e as regras vigentes de custo. Um vídeo antes/depois só é feito quando solicitado, com evidência real e ferramenta apropriada, como `86-code-motion-film`.
- **Fidelidade:** não use como referência universal regras fixas de cor, fonte, quantidade de CTAs ou forma de gráfico; cada escolha deve fazer sentido para a tela.

## Materiais sob demanda

- `references/diagnostico.md`: matriz de achados, impactos e evidências.
- `references/decisoes-visuais.md`: critérios para componentes, dados, acessibilidade e recursos.
- `references/verificacao.md`: roteiro de testes, evidência e limites de observação.
- `examples/README.md`: exemplo sintético com código e capturas reais para treinar comparação. As imagens registram um caso, não uma estética obrigatória.
- `skills/91-unslop/scripts/capture-local.mjs`: compara dois HTMLs locais em viewport idêntico sem sobrescrever capturas; veja pré-requisitos e limites em `examples/README.md`.

## Handoff

Encaminhe problemas estruturais à `89-ui-facelift`, componentes à `52-ui-polish`, acessibilidade à `22-accessibility-specialist` e falhas de fluxo à `05-qa-testing`, quando pertinente. Documente evidência e lacunas para quem continuar.
