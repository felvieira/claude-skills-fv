# SHAPES — BUILD

1. **Componha de círculos, retângulos e arcos.** Peças simples reproduzem em qualquer tamanho e se encaixam na grade.
2. **Nenhum caminho livre com mais de 12 pontos.** Passou disso, quebre em peças (um caminho por parte) ou simplifique.
   O linter conta pontos de ancoragem por `<path>`.
3. **Reutilize peças.** Uma mão, uma folha: se o balão de fala aparece em três ícones, é o mesmo balão. Isso mantém a
   família coesa e acelera.
4. **Nomeie cada grupo no SVG.** `<g data-name="raios-retos">`. Nomes dão manutenção (quem edita sabe o que é) e
   permitem animar por parte. Use `data-name`, não `id` (id solto é erro no linter).

Arcos: o ponto final do arco precisa estar a menos de 2·raio do inicial; senão o navegador escala o raio e a forma
pode estourar a margem. Prefira semicírculos exatos (corda = 2·raio) para formas previsíveis.
