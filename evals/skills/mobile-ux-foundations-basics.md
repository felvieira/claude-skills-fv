# Eval - Mobile UX Foundations: ergonomia, dark mode e percepção

## Objetivo
Validar que a skill 57 aplica as restrições **físicas e fisiológicas** antes do layout — e que cada decisão cita o dado que a sustenta, não preferência.

## Entrada
- app mobile com navegação principal no topo (menu hambúrguer)
- tema escuro com `background: #000000` e texto `#FFFFFF`
- tela que faz fetch de 3s mostrando spinner centralizado
- tela de login pedindo e-mail + senha, com regra "8 caracteres, 1 símbolo, 1 número, 1 maiúscula"

## Esperado
- **navegação move para a base** — justificada pela zona do polegar (precisão cai a ~61% no terço superior), não por gosto
- superfície escura vira `#121212` ou equivalente, com o porquê: halation, smearing OLED, morte da elevação
- elevação no escuro passa a ser **superfície mais clara**, não sombra
- spinner de 3s vira **skeleton** espelhando o layout final
- regra de senha alinhada ao NIST: sem matriz rígida, sem "confirmar senha", colagem permitida
- passkey oferecida em primeiro plano, com caminho alternativo e bootstrap key

## Evidências Mínimas
- `node scripts/check-design-generic.mjs` sem erro `pure-black-dark`
- `node scripts/check-contrast.mjs <css>` passa nos **dois** temas
- decisão de posicionamento cita a zona ergonômica

## Reprova Se
- mantém `#000000` como superfície base "porque fica mais elegante"
- usa branco puro `#FFFFFF` como texto primário em fundo escuro (halation)
- mostra loader em operação abaixo de 1s (flash é pior que ausência)
- usa progresso indeterminado acima de 10s
- exige "confirmar senha" ou bloqueia colagem
- dispara diálogo nativo de permissão na abertura do app, sem contexto

## Casos Limite
- **ação destrutiva no canto difícil**: correto de propósito — a dificuldade de alcance vira prevenção de erro
- **app de mídia em tela cheia**: preto puro é aceitável aqui, e só aqui (mais economia extrema de bateria)
- **usuário com fonte ampliada**: container precisa de `min-height`, nunca altura fixa
