# STYLE — RULES

As quatro regras que tornam um conjunto uma mão só. Escreva os valores no `STYLE.md` do conjunto.

1. **Traço 2 px, pontas e juntas redondas.** `stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`.
2. **Cantos de 2 px, nunca vivos, nunca 0.** Retângulos com `rx >= 2`; em caminhos use arco `a2 2 0 0 1` nas quinas.
3. **No máximo um preenchimento de destaque por ícone.** O destaque marca o ponto focal (o núcleo do sol, a lente).
   Ícone sem destaque é válido.
4. **Mesmo peso visual em todo o conjunto.** Um ícone com o dobro de linhas parece de outro conjunto. O linter
   estima peso de tinta (comprimento do traço × largura) e avisa outlier; o olho decide.

Regra de ouro: toda decisão vira número. "Arredondado" não é regra; "rx 2 e linejoin round" é.
