# Pipeline completo — os 5 passos

Detalhe integral do que o SKILL.md resume. Ler antes de rodar cada passo pela primeira vez.

## Passo 0: A entrevista

**Sempre entrevistar antes de gerar qualquer coisa.** Nao um brief inferido do nome da marca, nao um plano
apresentado pra aprovacao. Perguntas reais, feitas, respondidas, escritas. Uma pagina construida a partir
de suposicao volta parecendo a ultima pagina construida a partir de suposicao.

Oito perguntas, numa passada so:

1. **Vibe em tres a cinco palavras**, mais ate tres referencias de qualquer midia (filme, capa de album,
   loja, revista, jogo). Nao "sites que voce gosta" — nomear sites e como a pagina acaba parecendo um site
   que ja existe.
2. **A jornada de scroll, secao por secao, nas palavras do cliente.** O que o visitante ve primeiro, o que
   vem depois, o que e a ultima coisa. A sequencia deles, nao um menu que voce ofereceu.
3. **A curva de energia.** Onde deve ser calmo, onde deve ser intenso. Uma pagina barulhenta o tempo todo
   e tao plana quanto uma silenciosa o tempo todo.
4. **Como a pessoa deve se sentir enquanto rola, etapa por etapa, e qual e O momento que ela deve lembrar?**
   Energia e volume. Isso e emocao, e as duas nao coincidem: numa pagina barulhenta, o ato quieto pode ser
   o mais intenso. A resposta etapa-por-etapa vira a curva de emocao; o momento unico vira o pico. Ambos
   sao obrigatorios no BRIEF.md.
5. **Uma coisa que este site deve fazer que nenhum site que o cliente ja viu faz.** E a semente do
   signature move. Insistir por uma resposta real — "ser memoravel" nao conta.
6. **Quao longe do premium-minimal o cliente quer ir.** Oferecer o range completo (uniqueness.md §5):
   brutalista, maximalista, playful, retro, denso, editorial, premium-minimal. A resposta do cliente
   governa a familia estetica, nao o seu gosto.
7. **Um mundo continuo (uma unica jornada de camera), ou cenas distintas?** A pagina inteira deve parecer
   um lugar continuo que o scroll atravessa (worldflight), ou secoes/capitulos/cortes separados? Este e o
   maior fork estrutural que existe, e e decisao do cliente, nao um device que voce escolhe depois.
8. **Que assets o cliente ja tem?** Video, fotos, fotos de produto, brand kit, clipes proprios. Assets
   reais ancoram o mundo visual e cortam custo de geracao; a resposta decide o que sera tratado/codificado
   versus gerado. "Nada" e resposta valida e significa mundo totalmente gerado.

Escrever as respostas em `<build>/BRIEF.md` antes de qualquer planejamento de ato, nas palavras do cliente,
sem parafrasear pra prosa de marketing. Tudo o que vem depois le desse arquivo.

`BRIEF.md` precisa conter, no minimo:

- As oito respostas da entrevista, literais.
- **A curva de emocao.** Uma linha por ato: a emocao, depois o que na tela causa ela. Escrita antes dos
  atos existirem.
- **O pico.** O momento unico, escrito como a frase que um visitante diria a um amigo, mais em qual ato
  ele vive.
- **A frase "e o site onde ___" completa**, preenchida com uma experiencia, nao com nome de device.
- Qualquer silencio autoral (pausa intencional), pra o passo de verificacao distinguir de scroll morto.

Ver feel.md pra o metodo completo de curva de emocao e pico.

**Se o cliente estiver genuinamente inacessivel** e a execucao for autonoma, escrever o `BRIEF.md` sozinho:
responder as oito perguntas na voz da marca, marcar o arquivo `Self-authored, nao entrevistado` no topo, e
dizer isso no relatorio final. Um brief auto-escrito e um fallback, nunca o plano.

## Passo 1: O brief, jornada primeiro

O assunto e do cliente pra afirmar. Perguntar de forma aberta, em prosa simples, nunca como lista de
multipla escolha inventada de industrias — um menu inventado tendencia a resposta e passa a impressao de
que voce decidiu o negocio dele por ele.

O Passo 0 ja cobriu vibe, sequencia, energia e range. Nao perguntar de novo. Perguntar so o que nao da pra
inferir com seguranca:

1. **O que e isto, e pra quem?** Uma ou duas frases nas palavras do cliente.
2. **O que o visitante precisa acreditar ao final?** A frase unica que a pagina existe pra instalar. Nao
   uma lista de features. Se derem tres, fazer escolher uma.
3. **O que o visitante faz depois?** Uma acao. Um rotulo pra ela, usado em toda a pagina.
4. **O que ja existe?** Logo, paleta, fotografia, fotos de produto, video, um documento de marca. Asset
   real supera asset gerado sempre.
5. **Direcao de arte**: oferecer os mundos em worlds.md como escolha real, deixando claro que o cliente
   pode seguir caminho proprio.

Depois escrever a **jornada** antes de qualquer outra coisa: quatro a sete beats, cada um uma mudanca no
que o visitante sabe ou sente.

```
1  Reconhecimento   ve a propria manha
2  Tensao           o custo disso, nomeado sem rodeio
3  Virada           a coisa que muda
4  Substancia       por que aquilo se sustenta
5  Range            o que ele pode escolher
6  Compromisso      a acao unica
```

Beats sao a espinha. Secoes servem beats; secao que nao serve nenhum beat e cortada, por mais bonito que o
plano seja. Mostrar a jornada ao cliente e acertar antes de gerar um unico asset — assets sao a parte cara
e a jornada determina cada um deles.

## Passo 2: Gramatica, gate, depois score

Tres coisas em ordem, e as duas primeiras vem antes de qualquer planejamento de ato. Detalhe completo em
uniqueness.md.

**Escolher uma gramatica.** Oito no total, mutuamente exclusivas — cada uma proibe coisas que as outras
exigem. Ver a tabela no SKILL.md pra visao geral; o detalhe de cada uma (o que ela permite, proibe, e como
sao nav/hero/close) esta em uniqueness.md §2.

Recorrer a filmic one-shot de novo significa dizer no relatorio por que as outras sete nao serviram — ela
e a gramatica que os quatro primeiros builds de referencia do autor original usaram todos, entao carrega um
onus de prova maior que as outras.

**Inventar o signature move.** Uma interacao bespoke que so existe nesta pagina, codada na pagina — nao um
parametro de device do kit mudado, nao algo que o motor ja faz com um nome de classe diferente. A pergunta
5 da entrevista e a semente. O motor (`engine/scrollcraft.js`) permanece intocado sempre; o signature move
mora em JS proprio da pagina lendo `--sc-p` ou `data-sc-*` proprios. Teste: descrever o move pra alguem que
ja viu outros builds — se a pessoa nao consegue distinguir de algo que o kit ja faz, nao e um signature move.

**Rodar o gate de fingerprint.** Se o projeto ja tiver builds anteriores desta skill num mesmo workspace de
cliente/agencia, manter um registro (`FINGERPRINTS.md` proprio do workspace) e exigir que o novo build
difira de **cada** linha existente em pelo menos 4 de 6 dimensoes: gramatica, tratamento de nav, hero
device, formato da sequencia de atos, padrao de close, signature move. Ver uniqueness.md §4 pro metodo
completo — inclusive quando nao ha registro anterior (primeiro build de um cliente novo nao tem o que
evitar).

**Escrever a curva de emocao antes da tabela de score.** Uma linha por ato: a emocao, depois o que causa
ela. Curva primeiro, atos depois — um device escolhido antes da emocao e um device procurando motivo. Dois
atos adjacentes com a mesma emocao significa que um e enchimento, e e mais barato cortar aqui do que depois
dos assets prontos. Nomear o pico na mesma passada e dar a ele o maior espaco de scroll da pagina. Metodo
completo em feel.md.

Depois atribuir um device por beat, deliberadamente, como tabela:

| Beat | Device | Por que este |
|---|---|---|
| Reconhecimento | `scrub` | A camera se movendo sob a mao do leitor e a abertura mais forte possivel |
| Tensao | `pin` + kinetic | Texto se monta linha a linha enquanto o frame segura |
| Virada | `reveal` | Um wipe e uma mudanca de estado, que e o que este beat e |
| Substancia | `scrub` (macro) | Textura numa escala que o olho nao alcanca de outro jeito |
| Range | `pan` | Deslocamento lateral le como "opcoes", vertical le como "argumento" |
| Compromisso | `pin` + pointer | A pagina para de se mover e comeca a responder |

Essa tabela e um score **filmic**. E o formato certo pra uma gramatica e errado pras outras sete — ler a
lista de "leans on" e "bans" da gramatica escolhida (uniqueness.md) antes de preencher cada linha.

Checagens antes de construir:

- Os bans da gramatica seguram. Gramatica que proibe `pin` proibe aqui tambem, por melhor que funcionasse.
- Quatro ou mais familias distintas de device. Menos que isso e uma pagina com uma ideia so.
- Nenhuma familia de device duas vezes seguidas.
- No maximo dois atos `scrub`. Video e a coisa mais pesada da pagina; o terceiro para de ser surpresa.
- Nenhum par de atos adjacentes carrega a mesma emocao.
- Um ato e o pico e tem o maior espaco por margem visivel. O ato antes dele e mais quieto que ele.
- Cada ato ganha seu espaco de scroll. Comprimento total da pagina entre 8 e 14 viewport-heights.

## Passo 3: Gerar os assets

Este kit ja tem pipeline proprio de geracao de imagem/video — usar `skills/17-image-generator/SKILL.md`
(ou o pipeline canonico de imagem/video do ambiente) em vez de montar chamada ad-hoc contra qualquer
provedor. O scroll-craft original usa kie.ai com scripts proprios (`kie.mjs`, `encode.sh`); nao portamos
esses scripts porque o kit ja resolve geracao de imagem/video por outro caminho — ver assets.md pra as
regras de composicao, preambulo de estilo e enquadramento que continuam valendo independente de qual
pipeline gerar o arquivo final.

Passos, independente da ferramenta de geracao:

1. Escolher um mundo visual em worlds.md e escrever o preambulo de estilo dele uma vez.
2. Todo prompt e: **preambulo, linha em branco, cena**. Preambulo literal, sempre — e o que faz seis
   imagens geradas separadamente parecerem uma sessao de fotos so.
3. Nomear onde fica o espaco vazio em cada prompt de cena — o texto senta em cima dessas imagens.
4. Ler cada imagem antes de usar. Gerar e barato; re-rodar e mais barato que publicar um frame ruim.
5. Ao codificar video pra scrub (nao playback normal), usar GOP denso — busca no meio do clipe caminha a
   partir do keyframe anterior, e um encode web normal toca perfeitamente mas "escrubaria" mal.

Cap de dois clipes `scrub` por pagina — e regra de qualidade tanto quanto de orcamento (ver devices.md §1).

## Passo 4: Construir a pagina

Escrever HTML real. `<h1>` real, `<p>` real, links reais, ordem de leitura real. O motor le atributos
`data-sc-*` do seu markup e o dirige; ele nunca gera DOM. Um runtime que constroi a pagina a partir de um
objeto de config e exatamente por que todo site construido nele parece igual.

Copiar `engine/scrollcraft.js` e `engine/scrollcraft.css` (do diretorio raiz desta skill) pro projeto do
cliente. Nunca editar o motor por projeto — ele e o mecanismo. Tematizar via tokens, escrever markup
proprio.

Padroes de device (`scrub`, `pin`, `pan`, `reveal`, `kinetic`, `parallax`, `count`, `flow`, pointer,
`drift`) estao em devices.md. Regras de espacamento, tipografia, cor, profundidade e o "refuse list" (o
que nunca usar sem o brief pedir explicitamente) estao em taste.md — ler antes de escrever markup, nao
depois.

Tematizar sobrescrevendo tokens — seis valores de cor e duas fontes:

```css
:root {
  --sc-canvas: #0A0806;  --sc-surface: #16110E;
  --sc-ink:    #F5EBDD;  --sc-ink-soft: #A2968A;
  --sc-accent: #FF5A3D;  --sc-accent-ink: #15110F;
  --sc-font-display: "Archivo", system-ui, sans-serif;
  --sc-font-text:    "Geist", system-ui, sans-serif;
}
```

A escolha de paleta e tipografia em si — nao so a sintaxe do token — e insumo da skill 02 quando a marca
ainda nao tem direcao estetica fechada.

## Passo 5: Verificar rolando a pagina

Nao opcional, e nao "deveria funcionar". Uma pagina de scroll nao tem estado unico: cada posicao e um frame
diferente, e as falhas vivem entre as duas que voce por acaso olhou. Procedimento completo em verify.md.

Resumo: servir a pagina via HTTP local (nunca `file://`, que bloqueia o fetch em Blob que o motor usa pra
scrub), navegar programaticamente por multiplas posicoes de scroll usando as ferramentas de browser
disponiveis no ambiente (screenshot em cada posicao), repetir em viewport mobile e com
`prefers-reduced-motion` ativo, e montar um contact sheet (grade de screenshots lado a lado).

Depois fazer a parte que nenhuma automacao cobre: **olhar o contact sheet**. Ele prova que um clipe avanca;
nao prova que a composicao e boa, que o movimento e suave, ou que a pagina significa algo. Tambem navegar
por Tab pra checar ordem de foco.

**Depois rodar o feel check** (feel.md §6): rolar a pagina do zero, escrever uma palavra por ato sobre o
que foi sentido, so entao abrir `BRIEF.md` e comparar com a curva pretendida. Onde divergem, a pagina esta
errada, nao o brief.

**E dizer o que uma rodada verde nao cobre: um telefone real.** Chrome headless nao reproduz decoder de
video de iPhone, politica de autoplay, Low Power Mode, nem scroll por toque. Mobile e alvo de primeira
classe do inicio ao fim, nao um passe no final. Quando houver defeito reportado em mobile, o repo original
usa `references/device-diag.html` — pagina de diagnostico standalone que testa o clipe suspeito de duas
formas (blob URL, exatamente como o motor carrega, e src direto de arquivo) lado a lado com um clipe
conhecido-bom, e reporta veredito MOVENDO/CONGELADO. Esse arquivo nao foi portado nesta curadoria (ver
PROVENANCE.md) — se um defeito mobile aparecer e depuracao headless nao bastar, ler o original antes de
recriar algo equivalente.

Corrigir o que foi achado e fotografar de novo. Reportar o que foi de fato verificado e o que nao foi.
