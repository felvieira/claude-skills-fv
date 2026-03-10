# UI Component MCPs

Guia para uso de MCPs de bibliotecas de componentes durante tarefas de UI e frontend.

---

## Objetivo

Permitir que o agente consulte bibliotecas visuais bem mantidas e, quando fizer sentido, configure o MCP correspondente para acelerar implementacao sem destoar do app.

---

## MCPs candidatos

| MCP | Uso principal |
|-----|--------------|
| `Magic UI MCP` | Componentes animados prontos para React/Tailwind |
| `React Bits MCP` | Snippets e componentes React reutilizaveis |
| `Playwright MCP` | Navegacao, inspecao visual, screenshots e validacao em browser real |

---

## Quando instalar / configurar

| Criterio | Instalar? |
|----------|----------|
| Projeto sem integracao equivalente | Sim |
| Stack compativel com a biblioteca | Sim |
| Ganho de velocidade compensa a dependencia | Sim |
| Mudanca local, reversivel, sem efeito externo | Sim |
| Projeto ja usa outro design system consolidado | Nao |
| Biblioteca conflita com visual existente | Nao |
| Task pequena demais para justificar nova integracao | Nao |

---

## Fluxo recomendado

1. Verificar stack, design system e componentes existentes no projeto
2. Verificar se o MCP ja esta configurado
3. Se nao estiver e a task justificar, instalar/configurar localmente
4. Consultar componentes como referencia ou base
5. Adaptar ao contexto visual do app — nunca copiar cegamente

---

## Playwright MCP

Usar quando a tarefa exigir:

- Subir a aplicacao localmente
- Navegar por fluxos reais do app
- Validar layout em browser
- Tirar screenshots
- Inspecionar estados visuais, erros, navegacao e comportamento responsivo

**Regras:**
- Preferir quando verificacao visual ou navegacao real forem relevantes
- Nao substituir testes formais do QA — complementar a validacao
- Se ja houver MCP de browser configurado no projeto, reutilizar antes de instalar outro

---

## Regra de consistencia visual

Para projetos existentes, qualquer componente vindo de MCP deve respeitar:

- Paleta e contraste do produto
- Tipografia e espacamento do produto
- Padrao de motion e interacao do produto
- Nivel de sobriedade ou expressividade ja presente no app

---

## Handoff

Registrar no handoff:

- Qual MCP foi usado
- Se houve instalacao/configuracao local
- Quais componentes serviram de base
