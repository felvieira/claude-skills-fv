# EXPORT — SHIP

1. **SVG limpo: `viewBox="0 0 24 24"`.** Sem `width`/`height` fixos na origem, `fill="none"` na raiz.
2. **Sem `transform`, sem `id` solto.** Aplique transformações nas coordenadas. Ids só existem no sprite (o `<symbol>`
   precisa deles), nunca nos arquivos de origem.
3. **Sprite + componentes React.** `sprite.svg` com um `<symbol id="icon-nome">` por ícone (traço em `currentColor`,
   para herdar a cor do texto) e `Icons.tsx` com um componente por ícone (`size` e props de SVG repassadas).
4. **Folha de contato para revisão.** `contact-sheet.html` (e `.png` com `--png`) mostra cada ícone a 16/24/48 px e
   sobre a grade. Anexe-a ao PR/entrega.

```bash
node scripts/svg-icon-export.mjs icons --out dist --palette palette.json --png
```

O exportador recusa o conjunto se o linter achar erro (`--force` ignora, não recomendado). Uso do sprite:
`<svg width="24" height="24"><use href="sprite.svg#icon-sun"/></svg>`.
