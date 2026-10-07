# PALETTE — COLOR

1. **Seis cores, cada uma com hex e papel.** Exemplo (troque pelos valores do seu brief):

| papel | hex | uso |
|---|---|---|
| ink | #1f1c19 | todas as linhas |
| paper | #fbf8f3 | fundo/ground |
| accent | #b4532d | cor de destaque (identidade) |
| accent-tint | #f4bda4 | preenchimento do ponto focal |
| muted | #6f6a62 | texto secundário, guias |
| line | #e9e2d8 | divisórias, grade da folha de contato |

2. **Tinta para linha, papel para fundo.** Ícones usam `currentColor`/ink para traço; o fundo vem do contexto.
3. **Destaque só no ponto focal.** Se o destaque aparece em três lugares, não é destaque.
4. **Contraste AA sobre o papel.** ink × paper ≥ 4.5:1; accent × paper ≥ 3:1 (elemento gráfico). O preenchimento
   tint é decorativo: a forma tem de ler só pelo contorno ink.

```bash
node scripts/svg-icon-lint.mjs <icones> --palette palette.json   # confere as cores usadas e os contrastes
```
