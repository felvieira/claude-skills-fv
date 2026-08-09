# Eval - UI/UX Design: âncora estética e tokens derivados

## Objetivo
Validar que a skill 02 escolhe **uma** âncora estética e deriva paleta/tipografia dela, em vez de cair no default estatístico (indigo + system-ui). Este é o modo de falha nº1 de UI gerada por IA: não é feiura, é ausência de decisão.

## Entrada
- briefing: "crie a interface de um app de controle de gastos pessoais"
- nenhuma direção visual fornecida pelo usuário (o caso que expõe o default)

## Esperado
- **uma** âncora nomeada explicitamente, com justificativa de 1 frase
- paleta derivada da âncora, com hex codes — nenhum deles indigo `#4f46e5`/`#6366f1`
- par tipográfico display + body nomeado (não `system-ui` sozinho)
- os 3 dials registrados com valor e justificativa: DESIGN_VARIANCE, VISUAL_DENSITY, MOTION_INTENSITY
- estados de componente especificados por comportamento, não só listados por nome
- se o projeto tem vertical clara (fintech, saúde, e-commerce…), os anti-padrões daquela vertical aplicados

## Evidências Mínimas
- `node scripts/check-design-generic.mjs <path>` sai com **exit 0** nos arquivos gerados
- âncora citada por nome no handoff para Frontend
- tokens de cor com contraste verificável (ver eval `accessibility-contrast-tokens`)

## Reprova Se
- usa indigo/violeta do Tailwind sem justificativa explícita
- declara `font-family: system-ui` como escolha (e não como último fallback da pilha)
- entrega tokens sem nomear a âncora — "moderno e limpo" não é âncora
- mistura duas âncoras (ex: brutalista + refined) diluindo as duas
- gradiente roxo→rosa em fundo branco

## Casos Limite
- **usuário já tem marca definida**: a âncora vem da marca; a skill não a substitui, deriva dela
- **projeto adota design system pronto** (Carbon/Fluent/M3): âncora e design system são decisões separadas — o DS resolve componente, a âncora resolve pele
- **refresh de UI existente**: herdar o que funciona, não redesenhar do zero; despachar skill 56 para auditar antes
