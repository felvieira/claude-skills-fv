# Fixtures aprovadas para comportamento complexo

Material de apoio da skill 37. O uso de approved fixtures neste kit foi inspirado em Birgitta Böckeler (Thoughtworks) e no trabalho de Llewellyn Falco sobre Approval Tests. Ver também `docs/inspiration/harness-engineering.md`.

Uma fixture aprovada registra um resultado esperado que foi validado semanticamente. O teste compara a execução atual com esse resultado. O valor está no oráculo confiável; gerar o resultado com o código atual e aprová-lo automaticamente apenas reproduz o comportamento existente, inclusive defeitos.

## Quando ajuda

Use em saídas determinísticas e revisáveis: relatórios, renderização de documentos, transformações de dados e notificações. Preserve checks de contrato para propriedades importantes que uma comparação extensa possa esconder. Para efeitos externos, tempo ou aleatoriedade, controle a fronteira apropriada e valide o resultado observável.

Uma operação trivial não precisa desse aparato. Divida resultados grandes em casos revisáveis e mostre um diff útil. Imagem ou hash perceptual, sozinho, não prova conteúdo, interação ou acessibilidade.

## Fluxo

1. Defina entrada, contrato e a origem do resultado esperado. Uma fixture já validada ou um exemplo de contrato pode fornecer o oráculo.
2. Execute o comportamento e capture o resultado **candidato**, separado da fixture aprovada; por exemplo, `monthly-report.received.txt` e `monthly-report.approved.txt`.
3. Se não existir expectativa validada, revise o candidato contra requisitos e exemplos independentes. Obtenha a validação necessária antes de tratá-lo como aprovado; não use o nome do arquivo ou a presença de um commit como prova de revisão sem contexto.
4. Compare a execução com a fixture aprovada. Uma falha inicial por fixture ausente é setup, não demonstração de que o teste detecta o comportamento incorreto.
5. Ao mudar comportamento, examine o diff e a autorização da mudança antes de atualizar a expectativa. Em refatoração que preserve o contrato, o oráculo deve continuar válido.

O conjunto de asserções deve cobrir uma unidade lógica de comportamento; isso pode exigir mais de uma asserção. Não crie regra de um único `assert` quando ela esconder propriedades relevantes.

## Ferramentas de referência

Reutilize as ferramentas do projeto e verifique a compatibilidade antes de instalar outra biblioteca:

- JS/TS: [approvals-js](https://github.com/approvals/approvals.node).
- Python: [ApprovalTests.Python](https://github.com/approvals/ApprovalTests.Python).
- Java: [ApprovalTests.Java](https://github.com/approvals/ApprovalTests.Java).
- [Approval Tests](https://approvaltests.com/): conceitos e exemplos.
