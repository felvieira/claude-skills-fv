# UI Component MCPs

Guia rapido para uso de MCPs de bibliotecas de componentes durante tarefas de UI e frontend.

## Objetivo

Permitir que o agente consulte bibliotecas visuais bem mantidas e, quando fizer sentido, configure o MCP correspondente para acelerar implementacao sem destoar do app.

## Candidatos iniciais

- `Magic UI MCP`
- `React Bits MCP`
- `Playwright MCP` para navegacao, inspecao visual, screenshots e validacao em browser real

## Regra de uso

- usar apenas quando a task realmente precisar de componentes prontos, animacoes ou referencias visuais
- antes de instalar ou consultar, verificar se o projeto ja tem design system, biblioteca de componentes ou padrao visual estabelecido
- nunca copiar componente bonito mas desalinhado com o produto

## Quando instalar/configurar

- o projeto ainda nao tem integracao equivalente
- a stack e compativel com a biblioteca
- o ganho de velocidade compensa a dependencia adicional
- a mudanca e local, reversivel e sem efeito externo relevante

## Quando nao instalar

- o projeto ja usa outro design system consolidado
- a biblioteca proposta conflita com o visual existente
- a task e pequena demais para justificar nova integracao

## Fluxo recomendado

1. verificar stack, design system e componentes existentes
2. verificar se o MCP ja esta configurado
3. se nao estiver e a task justificar, instalar/configurar localmente
4. consultar componentes como referencia ou base
5. adaptar ao contexto visual do app, nao copiar cegamente

## Playwright MCP

Usar quando a tarefa exigir:

- subir a aplicacao localmente
- navegar por fluxos reais do app
- validar layout em browser
- tirar screenshots
- inspecionar estados visuais, erros, navegacao e comportamento responsivo

Regras:

- preferir quando verificacao visual ou navegacao real forem relevantes
- nao substituir testes formais do QA, mas complementar a validacao
- se ja houver MCP de browser configurado no projeto, reutilizar antes de instalar outro

## Regra visual

Para projetos existentes, qualquer componente vindo de MCP deve respeitar:

- paleta e contraste do produto
- tipografia e espacamento do produto
- padrao de motion e interacao do produto
- nivel de sobriedade ou expressividade ja presente no app

## Handoff

- registrar qual MCP foi usado
- registrar se houve instalacao/configuracao local
- registrar quais componentes serviram de base
