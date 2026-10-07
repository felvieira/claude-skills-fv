# GRID — LAYOUT

1. **Tela 24 × 24, margem de segurança de 2.** Todo ponto entre 2 e 22. O traço tem 2 de largura, então um ponto em 2
   encosta a borda do traço em 1: ainda dentro da tela.
2. **Keylines.** Círculo de diâmetro 20 (raio 10, centro 12,12) e quadrado de lado 18 (3 a 21). Formas que se parecem
   devem ocupar a mesma keyline, senão uma parece maior que a outra.
3. **Tamanho óptico vence tamanho matemático.** Um círculo e um quadrado do mesmo tamanho não parecem iguais; o círculo
   precisa de um pouco mais. Triângulos e formas pontudas, idem. Ajuste a olho a 24 e a 16 px.
4. **Todo ponto em pixel inteiro.** Com traço de 2 e coordenadas inteiras, as bordas caem na grade de pixels e ficam
   nítidas. Meio pixel borra a 1x. O linter recusa coordenada fracionária.

Contorno: `<rect>` precisa de `rx >= 2`; círculo acima de r=10 e retângulo acima de 20 saem da área útil.
