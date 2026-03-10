# Quality Gates Policy

## Objetivo
Definir o que realmente bloqueia uma entrega.

## Gate Obrigatorio
- problema principal resolvido
- mudanca coerente com o contexto
- risco relevante explicitado
- validacao minima realizada ou impossibilidade explicada
- handoff claro quando houver proxima etapa

## Guideline, nao Gate Absoluto
- tamanho de funcao
- quantidade de comentarios
- formato exato de pastas
- stack preferida
- estilo idealizado de arquitetura

## Rejeitar quando
- existe contradicao funcional
- ha regressao relevante nao tratada
- ha falha de seguranca importante
- falta validacao minima essencial
- falta documentacao obrigatoria do contexto

## Revalidacao
- repetir QA quando houver mudanca funcional
- repetir Security quando houver mudanca em auth, dados, validacao ou superficie de ataque
- repetir Reviewer quando houver correcao apos rejeicao

## Evals do Sistema
- seguir `policies/evals.md` quando a mudanca afetar prompts, skills, tools, templates ou governanca global
