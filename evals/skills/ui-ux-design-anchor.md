# Eval - UI/UX Design: direção visual e tokens coerentes

## Objetivo
Validar que a skill 02 define uma direção coerente com o produto, suas tarefas e sua identidade, com decisões aplicáveis à interface.

## Entrada
- briefing: "crie a interface de um app de controle de gastos pessoais"
- nenhuma direção visual fornecida pelo usuário (o caso que expõe o default)

## Esperado
- direção e hierarquia explicadas em função da tarefa e do público
- paleta e tipografia adequadas ao contexto e à marca, com contraste verificável
- densidade e movimento ajustados à superfície, sem exigir números ou arquivos extras
- estados de componente especificados por comportamento, não só listados por nome
- problemas relevantes da vertical considerados sem substituir evidência por estereótipos

## Evidências Mínimas
- achados do scanner de padrões, se usado, são avaliados no contexto da interface
- direção e decisões necessárias são comunicadas na implementação ou handoff
- tokens de cor com contraste verificável (ver eval `accessibility-contrast-tokens`)

## Reprova Se
- usa uma descrição vaga como único critério, sem ligá-la a decisões de layout e fluxo
- declara a interface validada sem inspecionar os estados e superfícies pertinentes
- reprova uma cor, fonte ou gradiente isoladamente sem considerar a marca e o uso

## Casos Limite
- **usuário já tem marca definida**: preservar o que funciona e respeitar sua identidade
- **projeto adota design system pronto**: usar seus contratos e avaliar onde há espaço para expressão
- **refresh de UI existente**: preservar fluxos e consultar a skill 56 para responsividade quando necessário
