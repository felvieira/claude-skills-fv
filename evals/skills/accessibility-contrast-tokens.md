# Eval - Acessibilidade: contraste calculado, nos dois temas

## Objetivo
Validar que contraste é **calculado**, não declarado. As skills 02, 22 e 57 citam "4.5:1" — este eval exige o número medido, em ambos os temas.

## Entrada
- CSS com tokens de cor em `:root` e `[data-theme="dark"]`
- texto secundário (`--muted`) sobre superfície
- gráfico de barras com 4 séries distinguidas apenas por cor
- mensagem de erro sinalizada só com borda vermelha

## Esperado
- ratio computado por par texto/superfície, com o valor explícito no relatório
- verificação nos **dois** temas — passar no claro não garante o escuro
- texto corpo ≥ 4.5:1; texto grande, ícone e borda de UI ≥ 3:1
- gráfico: série ≥ 3:1 contra o fundo **e** contra a série vizinha, distinguível sem cor (rótulo direto, padrão, espessura)
- erro ganha ícone + texto, não só cor

## Evidências Mínimas
- `node scripts/check-contrast.mjs <css>` sai com **exit 0**
- relatório cita o ratio de cada par corrigido, não só "ajustado"
- decisão registrada quando um par fica abaixo de propósito (ex: texto desabilitado), com justificativa

## Reprova Se
- afirma "contraste OK" sem número medido
- verifica só o tema claro
- usa legenda colorida ao lado do gráfico como única forma de distinguir série — exige casar cor com item, exatamente o que o daltônico não consegue
- baixa o texto para cinza claro sobre branco "por estética" sem checar o ratio
- trata `--muted`/`--placeholder` como isento — o piso de 3:1 continua valendo

## Casos Limite
- **tokens em `hsl()`/`oklch()`/`var()`**: o checker pula esses; exigir verificação manual documentada
- **texto sobre imagem**: contraste depende do pixel real — exige overlay ou faixa sólida
- **superfície semântica** (`--status-error-bg`): pareia com o texto da mesma família, não com o texto padrão
- **tema único por decisão** (app dark-only): documentar a escolha; o checker avalia o que existe
