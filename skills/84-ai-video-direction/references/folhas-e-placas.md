# Folhas de personagem e placas de cenário

No modo `reference-to-video`, o vídeo recebe **só** as folhas dos personagens e a placa do lugar,
sem quadro inicial. Foi o caminho que deu a melhor identidade: em todos os testes, mandar quadro
inicial ou final piorou o rosto. Logo, a qualidade do filme é limitada pela qualidade das folhas e
das placas. Elas custam centavos; refazer uma folha é sempre mais barato que refazer um clipe.

## 1. Folha em dois estágios

| Estágio | Entrada | Saída | Para quê |
|---|---|---|---|
| Folha-mestra de identidade | fotos reais da pessoa (com autorização) | uma folha com o rosto fiel | única autoridade do rosto |
| Variante por época ou figurino | Figure 1 = folha-mestra; Figure 2 (opcional) = foto real só para a roupa | uma folha por personagem por época | o que o vídeo recebe |

Instrução-chave da variante: `Figure 1 is the master identity sheet of this man. Use it as the sole
authority for his exact face geometry, bone structure, eyes, brows, nose, lips, jawline, ears, skin
tone and beard. Ignore Figure 1's layout, text labels, small insets, clothing, modern hair styling
and modern glasses.` Quando há Figure 2: `Figure 2 is a real photo (the man on the LEFT is him); take
ONLY his clothing from it.` Usar a folha-mestra **inteira**, não recortada.

## 2. Layout que funcionou

- Fundo cinza médio liso, uniforme, sem gradiente nem vinheta.
- **Metade esquerda:** um retrato frontal grande, cabeça e ombros, rosto ocupando quase toda a
  altura, olhando para a lente, com a expressão da época (meio sorriso caloroso, calma séria).
- **Metade direita:** corpo inteiro de frente e de costas, mesma escala, mesma linha de chão. No
  lugar do rosto, **um oval liso sem feições** (sem olhos, nariz, boca, barba ou óculos), mantendo
  forma da cabeça, cabelo e chapéu. Isso impede um segundo rosto concorrente.
- **Altura em metros** declarada e proporção humana real.
- **Mãos:** "both hands whole with five fingers"; "exactly two hands per figure".
- **Luz chapada:** difusa envolvente, sem direção legível, sem sombra no rosto nem no fundo, pele
  fosca, baixo contraste, mesma exposição nos painéis.
- **Zero texto:** nenhuma letra, palavra, legenda, rótulo, estampa com letras.
- Pele com textura natural; não remodelar, afinar, simetrizar ou embelezar o rosto.
- 16:9, 2K.

Prompt completo em `templates/folha-de-personagem.txt`.

## 3. Defeitos conhecidos da folha

| Defeito | Causa | Correção |
|---|---|---|
| texto na imagem ("FRONT", "BACK", letras em patch) | pedir rótulos ou citar "LEFT half / RIGHT half" | escrever "in the left half of the canvas"; repetir "zero letters"; patches "plain, no letters" |
| texto da folha vazou para o vídeo | folha aprovada com letras | refazer a folha antes de gerar |
| chapéu "balde" | copa e aba sem proporção | especificar altura de copa e aba, ou tirar o chapéu |
| rosto vazando no corpo de frente ou costas | oval não exigido | repetir "smooth blank neutral oval with no features at all" |
| 3 mãos | sem contagem | contar mãos antes de aprovar; "exactly two hands" |
| retrato herdou a roupa da foto-base | não proibido | "ignore Figure 1's clothing" |
| identidade derivou | foto-base recortada ou várias fotos conflitantes | folha-mestra inteira como Figure 1 |
| close a partir de quadro aberto perde o rosto | rosto pequeno na referência | o retrato grande da folha resolve |

## 4. Equipamento, adereço e criatura

- Equipamento do gênero desenhado **na folha** (jetpack nas costas com alças e botão de ignição;
  máscara de mão com cabo; corda enrolada no peito). Sem isso, o modelo inventa (bota-foguete no
  lugar de jetpack).
- Adereço removível: ou a folha mostra o personagem sem ele, ou ele "never comes off".
- Animal ou objeto recorrente ganha folha própria (raça, tamanho, pelagem, marcas; "neck bare, no
  collar" se for o caso).
- Sem fita, pulseira ou relógio nos pulsos, salvo se fizer parte da história; escrever "both wrists bare".

## 5. Guia de época

Regra: **o rosto vem da folha-mestra; o resto obedece à época.** Antes de qualquer folha, placa ou
prompt, montar a ficha da época: óculos, cabelo, barba, roupa, calçado, acessórios, mobília, luz,
transporte, objetos e a lista do que **não existia**. Anacronismo é defeito, refaz.

Exemplos condensados:

| Época | Certo | Não usar |
|---|---|---|
| Coreia Joseon (séc. XVIII–XIX) | ele: coque alto (sangtu) com faixa de crina, chapéu gat de copa baixa, durumagi; óculos só de letrado, armação fina com presilha de fio; ela: trança única com fita, jeogori curto e chima; hanok, portas de papel, lanternas de seda | acetato grosso, botão, zíper, vidro, luz elétrica; hanbok não é Japão |
| Paris anos 1920 | óculos redondos grandes de armação fina; risca lateral com brilhantina; terno de três peças, sobretudo, fedora; ela: bob ondulado ou cabelo preso sob **cloche** (não boina), casaco com gola de pele, vestido de cintura baixa; postes antigos, carros dos anos 20 | aviador, jeans, tênis, néon, semáforo, cartaz legível |
| Roma antiga (séc. I–II) | **sem óculos** (não existiam); túnica com clavus, manto preso com fíbula, sandálias; ela: cabelo repartido com tranças em coque baixo, stola e palla; basalto, colunas, lamparinas | qualquer óculos, calça, vidraça grande, chaminé |
| Anos 1980 | óculos grandes de casco ou aviador; cabelo volumoso; jaqueta jeans stone wash, tênis de cano alto, walkman; ela: permanente, scrunchie, jaqueta de nylon pastel; fliperama CRT, carros quadrados | armação minimalista atual, celular, LED, tela plana |
| Ópera espacial retrô | estética analógica coerente: botões, tubos, couro gasto, cores saturadas; figurantes humanoides de design original ao fundo | óculos "inteligentes", cópia de personagem de franquia, logos |

Aplicar: (1) na folha, nomear cada peça da época; (2) na placa, materiais, mobília e fonte de luz da
época e o que não pode aparecer; (3) no clipe, uma frase de anacronismo; (4) depois de gerar, olhar o
resultado com a ficha ao lado.

## 6. Placa de cenário

Imagem do lugar **vazio**, em inglês, estruturada:

```text
Master location plate, completely empty of people, 16:9.
<lugar, época, hora e situação em uma frase>
GEOMETRY:
1. <LANDMARK 1> - posição, material, tamanho
2. <LANDMARK 2> - …
3. <HORIZONTE / FUNDO> - …
ATMOSPHERE: <ar, névoa, cinza, vento>
LIGHT: <hora, fontes motivadas, reflexos>
PHYSICS: <materiais legíveis>. Human scale: <altura de porta, coluna, cesto em metros>.
OPTICS: 35mm, eye height 1.6 m, looking <direção do eixo>, gentle edge falloff, fine grain.
STYLE: photorealistic, no text, no signage, no letters, no numbers, no logos, no watermark.
The image contains no people, no animals and no figures of any kind.
```

Template completo em `templates/placa-de-cenario.txt`.

### Regras da placa

| Regra | Por quê |
|---|---|
| **a placa contém todo landmark, apoio e mecanismo que o prompt cita** | erro real: o prompt descreveu um portão que a placa não tinha, e o modelo improvisou |
| uma placa por lugar + trecho + eixo | a placa dita o ângulo; mudar de trecho na mesma placa parece andar em círculo |
| placas do mesmo lugar visivelmente diferentes | outra rua com o mesmo casario lê como o mesmo lugar |
| para resgate, placa vista do lado do perigo (do vazio, de baixo) | com o apoio seguro longe ou fora do quadro |
| mecanismo da ação desenhado (guincho, aro de carga, gancho, corrente, lustre numa corrente só) | o que não está na placa o modelo não faz funcionar |
| escala humana em metros | evita cesto do tamanho de um carro ou porta minúscula |
| altura do olho e direção do eixo | dá ao modelo um ponto de vista coerente com os planos |
| sem pessoas, animais e texto | pessoas da placa viram figurantes duplicados; texto vira letra no vídeo |

No prompt do vídeo, a placa entra como `Image 3 is the LOCATION of this clip: geometry, materials and
light only, not the camera.` e cada clipe diz `Image 3 here is <a vista>` listando os landmarks.

## 7. QA de folha e placa (antes de virar referência)

| Asset | Reprova se |
|---|---|
| folha | mãos ≠ 2 por figura ou dedos errados; painel de costas ausente; rosto no oval; qualquer letra; rosto diferente da folha-mestra; anacronismo; chapéu desproporcional; equipamento faltando |
| placa | qualquer pessoa, animal ou figura; qualquer texto ou logo; falta um landmark ou mecanismo que o prompt vai citar; época errada; igual demais a outra placa que deveria ser outro trecho |

Folha e placa têm QA **próprio**. Nunca aplicar a elas o QA de cena ("personagem ausente" numa placa
vazia é o comportamento correto, não um defeito).

## 8. Qual motor

| Uso | Motor que funcionou | Custo aproximado |
|---|---|---|
| placa de cenário | Grok Imagine 2.0 na Higgsfield (`xai/grok-imagine-image-2.0`, `quality: medium`, `resolution: 2k`, `aspect_ratio: 16:9`) | US$ 0,08–0,10 |
| folha a partir de foto real (identidade) | Nano Banana 2 edit no fal, folha-mestra + foto de roupa, 2K | cerca de US$ 0,12 |
| folha com várias referências na Higgsfield | Grok Imagine 2.0 com `image_urls` (folha-mestra inteira + roupa) | US$ 0,09–0,10 |
| quadro de composição com os dois em cena | Nano Banana 2 no fal, só se precisar mostrar ao usuário; **não** enviar ao vídeo | cerca de US$ 0,12 |

Seedream, Nano Banana e GPT Image **não existem na API da Higgsfield** (`model_not_found`); Seedream
só na plataforma web, com plano pago. Para assets críticos, gerar em dois motores e deixar o usuário
escolher. Se o usuário exigir um provedor, obedecer e não escrever script para outro antes de perguntar.
