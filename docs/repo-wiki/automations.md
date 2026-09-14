# Automações

Leitura estática de oito arquivos de código: núcleo MCP, proteção de ferramentas e snippets de referência. Regras operacionais do kit são separadas de exemplos de aplicação; não há afirmação de produto ou RPA implantado.

1 comportamentos descritos a partir de código lido. Cobertura parcial; não equivale a execução em produção.

## AUTO-01 — A consulta da próxima etapa usa índice de base zero

Domínio: Pipeline. Natureza: operational. Evidência: observed.

**Quando:** getNextStep recebe tipo e posição atual.

**O que acontece:** Retorna a etapa na posição informada; tipo inexistente ou posição a partir do fim retorna null.

**Exceções e limites:** Não incrementa a posição, não executa a etapa e não verifica sua conclusão. Índices negativos ou fracionários não são rejeitados explicitamente e podem retornar undefined.

**Verificação:** Leitura estática do código citado. O fluxo não foi executado em uma aplicação consumidora neste levantamento.

[evidence: mcp-server/src/lib/pipeline-engine.ts:166-177]

```text
export function getNextStep(
  pipelineType: TaskType,
  currentStep: number,
): { id: string; name: string; purpose: string } | null {
  const config = PIPELINES[pipelineType];
  if (!config) return null;

  const nextIndex = currentStep;
  if (nextIndex >= config.steps.length) return null;

  return config.steps[nextIndex];
}
```
