# Agent Spec

Use este template para spec-draftar um novo agente ou subagent antes de escrever o prompt.
Pode ser preenchido manualmente ou gerado via `/grill-me`.

## Job (uma frase)
<!-- O que este agente faz, em uma sentença. Ex: "Classifica tickets de suporte e sugere próxima ação." -->


## Inputs
<!-- Liste os campos que o agente recebe. Tipo + descrição curta. -->
| Campo | Tipo | Descrição |
|---|---|---|
|  |  |  |

## Outputs
<!-- Liste as seções ou campos que o agente produz. -->
| Campo | Tipo | Descrição |
|---|---|---|
|  |  |  |

## Constraints (infraestrutura de confiabilidade)
<!-- Regras que previnem alucinação e garantem consistência. Pelo menos 3. -->
- Não inventar informações ausentes no input
- 
- 

## Fallback rules
<!-- O que fazer quando input incompleto ou ambíguo. -->
- Se <campo> não estiver presente: <ação padrão>

## Layering (construção incremental)

### Camada A — Core behavior (mínimo funcional)
<!-- Apenas o essencial: job, input, output. Sem exemplos ou lógica avançada. -->


### Camada B — Estrutura
<!-- Adicionar seções organizadas, contexto de domínio, regras de formato. -->


### Camada C — Lógica avançada
<!-- Incorporar recomendações, detecção de informação faltante, multi-shot examples. -->


## Multi-shot example
<!-- 1 par input→output que demonstra o formato esperado. -->
Input:
Output:

## Schema de output
<!-- Estrutura machine-readable da saída. "Não adicionar seções. Não modificar títulos de seção." -->
```yaml
output:
  campo_1: <tipo>
  campo_2: <tipo>
```

## Ref de skill/subagent
<!-- Qual skill ou subagent este spec vai alimentar. -->
- Skill: 
- Template de prompt: `templates/prompt-spec.md`
- Protocol shell: `templates/protocol-shell.md` (se subagent com 2+ callers)
