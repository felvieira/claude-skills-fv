# Derivacao de formatos e overlays de texto

Destilado do pack `scenario-labs/skills` (MIT), adaptado ao nosso stack. Regras para derivar um
master aprovado em todos os placements (favicon, OG, PWA, tiles) e para texto letter-perfect.

## Escada de derivacao (formatos)

Adaptacao de formato e derivacao, nao regeneracao — re-promptar por placement gera primos,
nao formatos. Subir pelo primeiro degrau que serve:

1. resize mesmo ratio
2. `cover` center-crop (bordas dispensaveis)
3. expand/uncrop (inventa canvas, composicao intacta)
4. reframe generativo (recompoe a cena)
5. recompor nativo por ratio (16:9 -> 9:16 e outras distantes)

Regras:

- Toda derivacao de UM master aprovado, nunca de derivada (derivada de derivada acumula artefato).
- Ordem: aprovar master no maior tamanho limpo e sem texto -> reframe/expand -> grade/grain ->
  verificar dims entregues -> lettering por formato por ultimo.
- Guardar placa sem texto; type re-overlay por formato (type escalado amolece).
- Reframe por enum e aproximado (4:5 pode sair 29:36) -> MEDIR o output, depois resize exato.
- Safe zones sao contratuais por placement — confirmar, nao confiar em defaults.
- Center-crop para vertical degola sujeito; subir a escada.
- No video, reframes renderizam no tier proprio — upscalear DEPOIS de reframe, nunca antes.
- Sizing abaixo do floor pode ser substituido em silencio pelo provider — verificar
  `width`/`height` de todo output.
- Receita de tamanho exato: gerar/receber no tamanho >= alvo mais proximo, depois `cover`
  center-crop; `stretch` distorce, `contain` sobra.

## Overlay de texto deterministico (letter-perfect)

- Tipo gerado drifta/garbles -> copia exata (preco, legal, CTA, headline) renderizada como PNG
  transparente e composta; nunca promptada na placa.
- Template com variaveis para strings que mudam (localizacao = edita valor, nao template);
  variavel faltando = falha, nao renderiza.
- Fontes e imagens inline como data URI; URL remota = drift de render.
- Fonte carrega sentido: sans condensada pesada = hook/preco/CTA; geometrica leve =
  neutro/premium/legal; serifada = editorial/heranca; arredondada = amigavel. Uma familia por
  card; hierarquia por peso+tamanho.
- Julgar legibilidade no tamanho de destino; texto claro sobre transparente some no preview —
  conferir sobre fundo de contraste.
- Overflow: "shrink" ou "clip" (wrap transborda); canvas = resolucao de destino (compoe 1:1,
  nunca re-escalado).
- Pedir placa base com zona quieta (faixa vazia ou terco escuro) para o card pousar em pixel limpo.
- Guardar payload do template junto do asset renderizado (reprodutibilidade).

## Thumbnails / capas legiveis em feed

- Entrega = imagem final nas dims pedidas + copia exata fornecida + identidade preservada.
- Uma frase de promessa visual, um sujeito focal, regiao de copia quieta dimensionada para as
  palavras reais (nao metade do quadro por default).
- Invariantes de identidade registrados da referencia ANTES de gerar.
- Copia exata: placa limpa + overlay deterministico; letra integrada so se pedido, e provada
  caractere a caractere.
- Sem copia fornecida -> nenhum headline inventado.
- Revisar no tamanho de entrega E em preview ~120px de largura (teste de estresse); checagem de
  identidade antes de por tipo — texto nao conserta identidade quebrada.
- Revisao: mapear a nota para composicao/identidade/copia/export; reusar camadas aceitas;
  headline nova = overlay novo, nao geracao nova.
- Bater dims exatas via ratio suportado + resize; nunca esticar nem cortar traco definidor do
  personagem.

## Storyboards / paginas em quadrinhos

- A unidade e o PAINEL, nunca a pagina ("a page with six panels" = pagina irremediavel).
- Ordem: tabela de beats -> cast travado -> um run por painel -> checagem de identidade ->
  letra em pos -> montagem.
- Prompt por painel = linhas de estilo+personagem+cenario byte-identicas + clausula do painel +
  "clean art, no lettering, no speech bubbles".
- Todo painel ancorado no mesmo hero aprovado; encadear painel->painel compoe drift.
- Mudanca permanente: novo hero aprovado, baseline reescrito, re-ancorar os paineis seguintes.
