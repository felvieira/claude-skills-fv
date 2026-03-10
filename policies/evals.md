# Evals Policy

## Objetivo
Evitar regressao de comportamento em prompts, skills, agentes e fluxos com tools.

## Quando Avaliar
- ao criar ou alterar uma skill
- ao mudar policy global
- ao trocar modelo, provider ou estrategia de tool use
- ao adicionar MCP, automacao ou nova superficie operacional

## Matriz de Evidencia Minima

### Mudanca de prompt/skill
- 3 casos felizes representativos
- 2 edge cases
- 1 caso de ambiguidade ou falta de contexto

### Mudanca com tools
- tool correta e tool desnecessaria nao chamada
- payload minimo enviado
- falha de tool tratada com fallback ou erro claro

### Mudanca com risco de seguranca
- caso de prompt injection
- caso com dado sensivel
- caso com acao que deve exigir aprovacao

### Mudanca em output estruturado
- schema valido
- comportamento em recusa, truncamento ou ausencia de dados

## Formato de Avaliacao
- entrada
- comportamento esperado
- resultado observado
- delta ou regressao
- acao corretiva

## Criterio de Aprovacao
- sem regressao critica de seguranca
- sem regressao de formato essencial
- sem aumento injustificado de tool calls ou contexto
- falhas conhecidas documentadas quando nao bloqueantes

## Observabilidade Minima
- registrar caminho principal executado
- registrar tools relevantes e falhas
- registrar custo aproximado ou sinal de contexto excessivo quando visivel
- registrar decisoes de fallback importantes
