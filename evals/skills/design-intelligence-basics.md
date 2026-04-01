# Eval - Design Intelligence Basics

## Objetivo
Validar que o Design Intelligence pesquisa concorrentes, analisa tendencias e gera dossie estrategico com moodboard.

## Entrada
- briefing: "quero redesenhar a landing de um app de gestao financeira pessoal"
- ferramentas disponiveis: Playwright (default), Brave Search

## Esperado
- lista de 3-5 concorrentes diretos com prints ou descricao visual
- identificacao de 2-3 tendencias visuais do nicho
- paleta de cores com pelo menos 4 tons e justificativa
- moodboard ou referencias visuais organizadas
- dossie em markdown com secoes: Concorrentes, Tendencias, Paleta, Tipografia, Proximos Passos

## Evidencias Minimas
- arquivo de dossie salvo em `docs/design-intelligence/[projeto].md`
- pelo menos 3 concorrentes analisados
- paleta definida com hex codes

## Casos Limite
- nicho sem concorrentes claros: ampliar para inspiracoes de nichos adjacentes
- sem acesso a Brave Search: usar WebSearch nativo do ambiente
- melhoria de UI existente: pular PO, iniciar direto com analise do produto atual
