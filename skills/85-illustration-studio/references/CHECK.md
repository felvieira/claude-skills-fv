# CHECK — REVIEW

1. **Renderize cada ícone a 16, 24 e 48 px.** A folha de contato (`svg-icon-export.mjs`) já faz, sobre a grade e as
   keylines. Veja em tamanho real, não ampliado.
2. **Teste de apertar os olhos.** Desfoque ou aperte os olhos: ainda se lê o que é? Se vira mancha, o ícone depende de
   detalhe que não sobrevive ao tamanho pequeno.
3. **Compare os pesos lado a lado.** O conjunto inteiro na mesma linha. O que se destaca ou some está fora do peso. O
   linter dá a estimativa; o olho confirma.
4. **Dê nota de 1 a 10 e corrija tudo abaixo de 8.** Nota por ícone, com o motivo de cada ponto perdido (traço fino a
   16 px, ponto focal pouco claro, desalinhado do keyline). Registre as notas; corrija; renderize de novo.

Antes de olhar: `node scripts/svg-icon-lint.mjs <icones> --palette palette.json --strict` com 0 erros.
Quem escreveu o ícone não é o melhor juiz dele; se houver outro par de olhos (ou uma segunda passada com o contexto
limpo), use.
