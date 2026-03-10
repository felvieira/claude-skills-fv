# Install Policy

## Objetivo

Definir quem instala dependencias, quando instalar e como evitar inflar o projeto com runtime desnecessario.

## Regra principal

O agente pode instalar dependencias quando a feature realmente exigir, mas deve preferir a stack nativa do projeto antes de introduzir runtime novo.

## Ordem de decisao

1. reutilizar SDK ou runtime ja existente no repo
2. preferir TypeScript/Node se o projeto ja for Node-first
3. usar Python apenas quando o projeto ja tiver Python ou quando a necessidade tecnica justificar claramente
4. declarar toda dependencia nova, env var e comando de validacao

## Quem instala

- em repos de aplicacao, o agente instala como parte explicita da implementacao
- em kits/documentacao, o kit apenas documenta o requisito e o fluxo de setup

## Quando evitar instalar

- quando a feature puder ser feita com fetch/SDK ja presente
- quando a dependencia so adiciona conveniencia pequena
- quando o provider puder ser acessado por adapter simples sem novo framework

## Validacao minima apos instalar

- dependencia registrada no arquivo correto do projeto
- env vars documentadas
- exemplo minimo funcionando
- erro e fallback tratados
