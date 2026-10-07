# Motor de briefing — da ideia crua ao pacote que o gerador recebe

Entre o pedido do usuário e o prompt de vídeo existe um passo que decide se o filme vai ter história ou só clima: transformar a ideia
num pacote já dissecado. O modelo de vídeo **não recebe a ideia crua**. Recebe o que é fato, quem sofre, o que dá para filmar, como a história
vira, o que entra como gráfico e como a marca fecha.

Use este motor quando a entrada é uma ideia, um produto, um app ou um site ("faz um vídeo para divulgar X"). Quando o usuário já traz
roteiro e direção de cena, comece em `historia-e-direcao.md`.

**Regra de ouro: fato só entra se veio do briefing do cliente ou de uma fonte lida.** O que não foi dito vira `gap` na lista de lacunas, nunca vira
funcionalidade, número, depoimento ou promessa.

Base: material do usuário sobre motor de briefing, reescrito aqui. Validação mecânica: `skills/84-ai-video-direction/scripts/briefing-qa.mjs`.

## Pipeline

Cada estágio grava um JSON e lê **só** o JSON do estágio anterior. O estágio 7 não pode "lembrar" da ideia original se ela não passou pelo digest.

| # | Estágio | Pergunta que ele responde | Saída |
|---|---|---|---|
| 0 | Entrada | O que o cliente afirmou, sem enfeite? | `idea_card` |
| 1 | Digest da fonte | O que a fonte confirma e o que contradiz? | `source_digest` |
| 2 | Quadro de mercado | Qual promessa já está gasta nesta categoria? | `market_frame` |
| 3 | Persona | Em que segundo a dor fica visível? | `persona` |
| 4 | Elenco e mundo | Quem a câmera filma sem precisar explicar? | `cast_world` |
| 5 | Mensagem | Qual é o evento único (não o slogan)? | `message` |
| 6 | Roteador de formato | Qual espinha de categoria cabe nisso? | `format` |
| 7 | Espinha de história | A tática do personagem vira contra ele? | `story_spine` |
| 8 | Beats e assets | Dá para filmar sem voz off? O que é gráfico? | `beats`, `assets` |
| 9 | Pacote do gerador | O gerador recebe tarefa de plano, não clima? | `generator_pack` |
| 10 | Portão de QA | Algum fato foi inventado? A marca fecha? | `qa` |

Temperatura baixa nos estágios 0, 1, 2, 5 e 10; mais alta só no 7, e ainda assim presa ao JSON anterior.

## Roteador de categoria

O roteador escolhe **uma**. O cliente pode forçar; se forçar contra o material, registre `override_risk` com o motivo.

| Categoria | Quando | Espinha | Fechamento |
|---|---|---|---|
| publicitario | produto, app, SaaS, site, oferta | gancho → dor visível → mecanismo → prova → marca | cartela + assinatura obrigatórias |
| social | UGC, vlog, reação, talking head | gancho nos 2 primeiros segundos → confissão → demo na mão → corte seco | nome do app no último quadro, sem institucional |
| educacional | tutorial, explainer, aula | o passo N só existe porque o N−1 aconteceu | recap de uma linha + onde clicar |
| documental | depoimento, perfil, making-of | só o fato que o cliente contou | nome e função, sem slogan inventado |
| narrativo | história inventada a serviço da marca | scene engine completo; produto entra como objeto da tática | marca só no payoff |
| musical | clipe, lyric | corte na batida, uma ideia por frase | logo no último tempo forte |
| evento | convite, recap, homenagem | data e lugar só do briefing | cartela com data e lugar literais |

Padrão quando o pedido é "divulgar app/site/SaaS/produto": **publicitário**.

## Espinha por categoria (restrição, não texto criativo)

**Publicitário** (20 s): 0–2 s gancho com a dor visível e sem logo; 2–7 s a crença do personagem esbarra num objeto (fatura, planilha, notificação);
7–14 s o produto na mão ou um insert de interface; 14–17 s o quadro mostra o que ele não via; 17–20 s cartela, marca, chamada.
O último plano não tem pessoa, ou ela sai de foco. Tagline só existe se a fonte tiver.

**Narrativo**: produto ausente até a tática; a reversão acontece antes do logo; cartela final separada, 2 s, sem invadir o último quadro emocional.
**Educacional**: cada passo mostra estado anterior → ação → estado novo. Proibido pular a consequência.
**Documental**: b-roll não pode implicar número, cliente ou lugar que o cliente não citou.
**Evento**: data, hora e lugar literais ou não aparecem.

## Esquema do briefing

`templates/briefing.json` é o esqueleto vazio. Campos sem informação ficam `null` ou `[]`; não preencher com chute. Peças essenciais:

- `idea_card`: `claims` (cada uma com `quote` literal), `gaps`.
- `source_digest`: `verified_claims`, `unverified_claims`, `conflicts`, `offer`, `proof`, `visual.ui_available`.
- `message`: `event`, `promise` (até 8 palavras), `proof_shown`, `objection_killed`, `cta`, `will_not_say`.
- `format`: `category`, `devices` (no máximo 2), `end_lock` (`card`, `wordmark`, `cta_line`, `tagline`).
- `story_spine`: `event`, `goal`, `obstacle`, `tactic`, `reversal`, `value_shift`.
- `beats[]`: `verb` filmável, `value` no formato `antes → depois`, `camera_job`, `needs_vo`.
- `assets[]`: `kind` (live, ui-capture, motion-graphic, supers, end-card, vo), `must_show`, `must_not_invent`.

## Prompts dos estágios

Texto para colar como instrução de cada estágio (ou executar em sequência, um por vez). Variáveis: `{{raw}}`, `{{url_text}}`, `{{assets_notes}}`,
`{{prior_json}}`, `{{category_override}}`, `{{duration}}`, `{{platform}}`. Cada um termina com "responda só o JSON do estágio".

**0 Entrada.** Normalize o pedido, sem criar campanha e sem melhorar a ideia. Extraia: nome do produto; a ideia nas palavras do cliente; claims
literais (funcionalidade, público, preço, prova), cada uma com uma citação curta; URLs; lacunas (logo, print, preço, prova, público); proibições dadas.
Proibido inventar funcionalidade, número, depoimento, concorrente ou tom de marca.

**1 Digest da fonte.** Você audita a fonte. `verified_claims` = só o que a fonte afirma, com o trecho. `unverified_claims` = o que o cliente disse e a fonte não
confirma. `conflicts` = cliente contra fonte, sem escolher vencedor. `offer` = plano, preço, trial, ou `null`. `proof` = número, cliente, print, review; sem prova,
vazio. `visual.ui_available` só é verdadeiro se houver print ou descrição de tela. `voice` = cinco palavras de tom encontradas no texto, não inferidas.
Sem fonte, `verified_claims` fica vazio e tudo do cliente vai para `unverified_claims`.

**2 Quadro de mercado.** Evite comercial genérico. `category_job`: o trabalho que a pessoa contrata essa categoria para fazer, em uma frase.
`saturated_promises`: quatro frases que todo anúncio da categoria já diz (não usar). `wedge`: a única diferença que **dá para filmar** com o material que existe;
se não está no digest, escreva "sem cunha verificada: filmar a dor, não a superioridade". `do_not_say`: afirmações que exigiriam prova que não temos.

**3 Persona.** Papel e situação, não idade inventada (idade só se a fonte deu). `trigger_moment`: o segundo em que a dor aparece. `visible_pain`: o que a câmera vê,
não o que a pessoa sente. `blocking_belief`: a frase que impede a compra. `language`: seis frases coloquiais que essa pessoa diria. `after_state`: o que muda de
visível. Público não dito: infira o mínimo e marque `assumption: true`.

**4 Elenco e mundo.** Comprador e personagem não precisam ser a mesma pessoa. Defina `on_screen`, figurino em peças concretas, fala (ritmo, vocabulário, o que não diria),
um lugar só com objetos que provam a dor, `why_this_place` e `product_role` (`phone-in-hand`, `ui-insert`, `graphic`, `absent`). Sem print de interface, o produto não pode
depender de tela legível com números: a tela mostra forma, não dado falso.

**5 Mensagem.** Reduza a campanha a um evento filmável. Ruim: "ele entende as finanças". Bom: "ele acha o vazamento na categoria que jurava ter sob controle".
`promise` com até 8 palavras e só claim verificada ou não numérica; `proof_shown` é o que o quadro mostra (sem prova, "demonstração do mecanismo", nunca depoimento
falso); `objection_killed` derrubada por uma ação; `cta` verbo + objeto; `will_not_say` herda `do_not_say` e números não verificados.

**6 Roteador.** Escolha a categoria (tabela acima), `why` em duas frases, a duração (15 s uma dor + um mecanismo; 20–25 s se precisa mostrar interface; 30 s só em
educacional ou narrativo), no máximo 2 dispositivos e o `end_lock`. Com override do cliente, obedeça e preencha `override_risk` se o material não sustenta.

**7 Espinha.** Você dirige, não descreve clima: emoção não se pede, pede-se tarefa. Monte o scene engine (evento, objetivo visível, obstáculo físico, tática do corpo,
reversão que nasce da própria tática, mudança de veredito do espectador). No publicitário o produto é a tática e a marca não fala no meio da reversão. Proibido adjetivo
emocional no lugar de verbo: "sente alívio" é inválido; "solta o ombro e larga a fatura" é válido. Entregue também a tarefa de atuação do protagonista (motivo,
objetivo, obstáculo, tática por beat, segurança).

**8 Beats e assets.** 15 s → 4 a 5 beats; 20–25 s → 6 a 8; 30 s → 8 a 12; um beat é um plano, salvo plano contínuo declarado. Cada beat: verbo filmável, quem, corpo, mundo,
valor `antes → depois`, trabalho de câmera (`hook`, `performance`, `object-detail`, `device`, `geography`, `transformation`, `dialogue-coverage`, `impact`), se precisa de voz.
Tudo que não é corpo no lugar vira asset com `must_show` e `must_not_invent`. Gráfico só para categoria errada riscada, valor autorizado pela fonte, seta antes/depois e
cartela. O último beat do publicitário é a cartela, não é atuação.

**9 Pacote do gerador.** Sem poesia. Segundos e quantidade de planos; primeiro quadro (quem está onde, **quem está ausente**); planos com trabalho, escala, causa → efeito e ponto
de corte; inserts de interface (o que a tela lê, o que é borrado); supers com texto exato; cartela final de 1,5 a 2 s; voz só se necessário, com falas exatas; travas
(identidade, logo só na cartela, sem texto fantasma, sem dado financeiro falso). Prompt de imagem/vídeo em inglês cinematográfico limpo; notas operacionais em português.

**10 Portão de QA.** Você reprova, não reescreve bonito. Verifique: todo número, preço, percentual e depoimento tem fonte no digest; o evento cabe em uma frase filmável;
a espinha tem as cinco peças; cada beat muda valor ou informa; dá para entender sem voz off; o produto é tática e não discurso; o publicitário fecha com cartela, marca e
chamada; a interface não mostra dado inventado; a categoria bate com os dispositivos; o primeiro e o último quadro têm trabalho. Saída: `{ pass, fails: [{stage, reason, fix}] }`;
`pass` só é verdadeiro com `fails` vazio. Cada falha aponta o estágio que deve rodar de novo.

## Validação mecânica

```bash
node skills/84-ai-video-direction/scripts/briefing-qa.mjs briefing.json          # relatório; exit 1 se houver erro
node skills/84-ai-video-direction/scripts/briefing-qa.mjs briefing.json --json   # saída para outra ferramenta
```

O script confere o que dá para provar sem julgamento: citação nas claims, número do `promise`/`supers`/`vo` rastreável ao digest, `promise` com até 8 palavras, espinha com as
cinco peças, beats com verbo filmável e valor `antes → depois`, quantidade de beats pela duração, no máximo 2 dispositivos, publicitário com cartela, marca e chamada, cartela
como último beat e nunca no primeiro, e interface sem fonte marcada com `must_not_invent`. O julgamento (o evento é bom? a dor é visível?) continua sendo da revisão.

## Exemplo mínimo (fictício)

Pedido: "app Contaclara, usa IA para categorizar gastos e sugerir economias". O pipeline pode afirmar: nome, categoriza gastos com IA, sugere economias. Não pode afirmar percentual,
"melhor app" nem depoimento.

- Evento válido: "ele defende o gasto do mercado até a IA separar o que era mercado do que era delivery."
- Elenco: cozinha à noite, fatura no celular, moletom, fala curta, sem olhar para a câmera; o app entra como fala e tela com categorias (forma), valores só com print do cliente.
- Cunha sem fonte: filmar a preguiça de categorizar, não a superioridade da IA.
- Fechamento: marca "Contaclara", chamada "Categoriza com IA", sem tagline inventada.
- Beat de reversão filmável: ele ia marcar tudo como mercado; o dedo para; duas linhas se separam na tela; ele não termina a frase.

"Uma pessoa feliz com as finanças organizadas" não é comercial; é clima.
