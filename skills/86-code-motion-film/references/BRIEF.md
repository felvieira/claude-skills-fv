# BRIEF — escreva a lista de estados, não o clima

## Uma frase testa o motor, não a ideia

"showreel de 15 s para um currículo, vá com tudo" define um gênero com regras conhecidas e dá um clipe. Centenas de pedidos iguais
produzem filmes que rimam entre si. Use a frase para testar o motor e logo passe para um brief que contenha uma ideia.

## Antes de escrever: ler o produto

O brief é escrito para **este** produto, com o nome dele grafado como ele grafa. Tire o nome da primeira fonte que responder: o que o usuário disse; o manifesto do app
(`CFBundleDisplayName`/`CFBundleName` no Info.plist, `app_name` em `res/values/strings.xml`, `productName` no `tauri.conf.json` ou `package.json`, `name` em `app.json`,
`pubspec.yaml` ou `Cargo.toml`); o título do README ou do site; o nome da pasta, arrumado. Se as fontes discordam ou só sobrou a pasta, pergunte uma vez, oferecendo o que achou.
**Nunca invente um nome.**

Leia também: o que faz, em uma frase, com as palavras do próprio produto (README, onboarding, loja, estados vazios); três a cinco fluxos reais que valem filmar, com os nomes do app
e achados no código, não adivinhados; o visual (cores do tema, fontes, logotipo, ícone, molas); a plataforma; as afirmações, **só o que o código ou o texto dele sustenta**; e o que
existe como material (capturas, gravações, um build). Para o tipo do filme, `TIPOS.md`; para o estilo, `ESTILOS.md`.

Faça o brief ser deste produto: nomeie recursos pelos nomes do app, telas pelos títulos, dados pelo que realmente guardam; nada emprestado de outro filme (nem slogans, nem ideias de
cena, nem a frase final do exemplo); toda cena mostra o produto fazendo algo real; se uma frase serviria a qualquer app, reescreva até servir só a este.

## Marca/produto

Acrescente a URL do produto, "use screenshot, logo e assets reais" e "precisa de música". O modelo busca os assets sozinho.
Uma sessão por marca: na segunda peça, motor, síntese de áudio e exportação já existem.

## Referência: nomeie um estilo, alimente um quadro

Sem referência o modelo cai no padrão (texto centralizado, gradiente, tudo em fade). Opções: **um quadro** (o que levar: paleta, tipo, grão; o que
não levar: assunto), **um vídeo** (extrair quadros com ffmpeg e descrever o ritmo plano a plano antes do código), **uma pasta** (escrever um
`style_guide.md` primeiro). Deixe o modelo escolher a técnica; especifique o visual e as restrições, não a biblioteca.

## Spec de estados (forma que nunca corta)

Um elemento muda tamanho, raio e cor de estado em estado (botão, loader, player, gráfico, paleta de comandos); um cursor dispara cada mudança;
o último quadro é igual ao primeiro. Escreva como lista, não como atmosfera:

```xml
<spec>
  <inputs>produto, cores, duração</inputs>
  <direction>uma forma, nunca corta, loop</direction>
  <states>
    <state at="0.0" name="botao"   w="38" h="12" r="6"/>
    <state at="1.5" name="loader"  w="12" h="12" r="6"/>
    <state at="3.0" name="cartao"  w="52" h="30" r="4"/>
    <state at="4.5" name="botao"/>   <!-- volta ao estado 0 -->
  </states>
  <rules>molas por papel; cortes na grade de 120 BPM; layout em unidades relativas</rules>
  <gotchas>rotulo nunca sobreposto ao spinner; ultimo quadro == primeiro</gotchas>
</spec>
```

## Brief de diretor (para trabalhos longos: contrata uma equipe)

1. **Filme numa linha**: logline e a piada; toda decisão se confere contra ela.
2. **Referências**: vídeo, música, biblioteca de imagens, repositório; o que manter, o que empurrar.
3. **Ferramentas e chaves**: skills a carregar, APIs (imagem, vídeo, voz), orçamento ("gaste com economia"), onde estão os docs.
4. **Bíblia de personagem**: proporções, paleta amostrada de uma folha, expressões, identidade que sobrevive a cada mudança de estilo.
5. **Beat sheet**: atos com tempo, um pagamento visual a cada 3–5 s, gancho nos 2 primeiros.
6. **Texto na tela**: quando a letra/legenda vira enorme, quando fica como legenda; a composição deixa espaço.
7. **Portões de trabalho**: planejar → montar → quadros parados → animatic → passada completa → polimento → áudio → render. Não pule portões.
8. **Laço de crítica**: ver `CRITIQUE.md`.
9. **Entregáveis**: MP4 final, checagem de loop, quadro de capa, folha de contato, fonte limpa com README.

Geração + traçado (opcional): um modelo de vídeo (skill 84) gera a base com personagem e física e o código redesenha por cima, de modo que só a
camada em código aparece. Dá movimento difícil de escrever à mão e um visual consistente e seu.
