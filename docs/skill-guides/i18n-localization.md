# i18n e Localização — Guia de Referência

Guia da skill `58-i18n-localization`. Consultar para tabela de expansão, snippet por plataforma e receita de teste.

## Expansão de texto por idioma

Referência de crescimento sobre o inglês (o português é ~15–20% mais longo que o inglês, então sobre o pt a expansão relativa é menor):

| Idioma | Expansão típica |
| --- | --- |
| Alemão | +30% a +35% |
| Francês, espanhol, português | +15% a +25% |
| Russo, polonês | +20% a +30% |
| Japonês, chinês, coreano | −30% a −50% (encolhe, mas exige altura de linha maior) |
| Árabe, hebraico | Similar, porém RTL |

Texto curto expande proporcionalmente mais que texto longo. Um rótulo de uma palavra pode dobrar:

```
en: "Save"        (4)
pt: "Salvar"      (6)
de: "Speichern"   (10)   ← +150% sobre o inglês
```

Por isso a regra prática de projetar o botão para caber **+30% sobre o português**, e nunca fixar largura.

CJK encolhe em número de caracteres, mas cada glifo é mais denso: precisa de `line-height` maior, não menor, e fonte que tenha os glifos.

## Pseudolocale

Transforma `Salvar` em `[Ŝåṽåŕ ---]`. Continua legível (dá para revisar), mas expõe quatro coisas de uma vez:

| Sintoma no pseudolocale | Diagnóstico |
| --- | --- |
| Texto aparece normal, sem acentos estranhos | String hardcoded — não passou pelo sistema de tradução |
| Texto corta, quebra o container ou vaza | Falta de espaço para expansão |
| Metade da frase pseudolocalizada, metade não | Concatenação |
| Caractere vira `?` ou caixinha | Problema de encoding ou fonte sem o glifo |

Android tem nativo (`en-XA` expansão, `ar-XB` RTL). Em outras stacks, gerar a partir do arquivo de strings:

```js
// Gera pseudolocale a partir do bundle real — roda no build de QA, nunca em produção
const MAP = { a:"å", e:"é", i:"ï", o:"ø", u:"ü", c:"ç", n:"ñ", s:"ŝ" };

function pseudo(str) {
  // preserva {placeholders} — pseudolocalizá-los quebraria a interpolação
  const parts = str.split(/(\{[^}]+\})/g);
  const body = parts
    .map(p => p.startsWith("{") ? p
      : [...p].map(c => MAP[c.toLowerCase()] ?? c).join(""))
    .join("");
  return `[${body} ${"-".repeat(Math.ceil(body.length * 0.3))}]`;  // +30%
}
```

Os colchetes marcam início e fim: se um deles não aparece na tela, o texto foi truncado.

## Formatters por plataforma

**Web (`Intl`)**

```js
new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(data);
new Intl.NumberFormat(locale, { style: "currency", currency: "BRL" }).format(valor);
new Intl.RelativeTimeFormat(locale).format(-3, "day");        // "há 3 dias"
new Intl.Collator(locale, { sensitivity: "base" }).compare(a, b);  // ordenação
new Intl.ListFormat(locale).format(["a", "b", "c"]);          // "a, b e c"
```

`currency` é o código ISO (BRL, USD, EUR) — o símbolo, a posição e o separador saem do locale, não do código.

**Plural (`Intl.PluralRules`)**

```js
const pr = new Intl.PluralRules(locale);
pr.select(1);   // pt: "one"
pr.select(2);   // pt: "other"
// ru: select(2) → "few", select(5) → "many"  ← 2 formas não bastam
```

Bundle declara as formas que o idioma tem:

```json
{
  "inbox.count": {
    "zero":  "Nenhuma mensagem",
    "one":   "{count} mensagem",
    "other": "{count} mensagens"
  }
}
```

`zero` merece caso próprio quando o texto muda de forma ("Nenhuma" em vez de "0").

**Android** — `plurals` em `strings.xml`, `NumberFormat`/`DateFormat`, pseudolocales nativos em Opções do desenvolvedor.

**Apple** — String Catalogs (`.xcstrings`) com variação de plural, `formatted()` do Foundation, esquema de execução com idioma/pseudolocale forçado.

## Direção lógica — tabela de conversão

| Físico | Lógico | Tailwind |
| --- | --- | --- |
| `margin-left` | `margin-inline-start` | `ms-*` |
| `margin-right` | `margin-inline-end` | `me-*` |
| `padding-left` | `padding-inline-start` | `ps-*` |
| `padding-right` | `padding-inline-end` | `pe-*` |
| `left: 0` | `inset-inline-start: 0` | `start-0` |
| `right: 0` | `inset-inline-end: 0` | `end-0` |
| `text-align: left` | `text-align: start` | `text-start` |
| `border-left` | `border-inline-start` | `border-s` |
| `border-radius: 8px 0 0 8px` | `border-start-start-radius` etc. | — |

`width`/`height` não têm equivalente lógico relevante aqui — o que muda é `inline-size`/`block-size` em escrita vertical (japonês tradicional), caso raro.

Espelhar ícone direcional em CSS, sem duplicar asset:

```css
[dir="rtl"] .icon-arrow { transform: scaleX(-1); }
```

Aplicar só em seta e chevron. Nunca em logo, ícone de mídia (play/pause), relógio ou número.

## O que espelha em RTL

| Espelha | Não espelha |
| --- | --- |
| Fluxo e alinhamento de texto | Números (sempre LTR) |
| Sidebar, drawer, posição de ícone | Logo da marca |
| Seta voltar/avançar, chevron | Ícone de play/pause/rewind |
| Barra de progresso, slider | Relógio analógico |
| Breadcrumb, paginação | Código, URL, e-mail |
| Ordem de colunas de tabela | Gráfico com eixo temporal convencional |

Texto misto (frase em árabe com número ou palavra latina) é resolvido pelo algoritmo bidi do navegador — desde que `dir` esteja correto. Forçar direção em CSS costuma piorar.

## Data, hora e fuso

```
Armazenar:  2026-08-08T14:30:00Z        (ISO 8601, UTC)
Exibir:     formatter do locale + fuso do usuário
```

O bug clássico: guardar `2026-08-08` sem hora nem fuso. Para quem está em UTC−3, um evento às 23h de dia 8 em UTC vira dia 8 às 20h local — mas um evento às 2h de dia 9 em UTC é dia 8 às 23h local. Sem fuso, o dia exibido fica errado na virada.

Data de aniversário e feriado são exceção legítima: são data-civil, sem hora — guardar como data pura, sem converter fuso.

## Formulário por país

| Campo | Não presumir |
| --- | --- |
| Nome | Que existe sobrenome; que cabe em `[a-zA-Z]`; ordem nome/sobrenome |
| Endereço | Quantidade e ordem de campos; que CEP é numérico; que existe "estado" |
| Telefone | 11 dígitos; código de país fixo; formato de máscara |
| Documento | Que todo país tem CPF-equivalente obrigatório |
| Data | Ordem dia/mês/ano no input |

Validação de nome que aceita o mundo real:

```js
// Errado: rejeita José, أحمد, 李
if (!/^[a-zA-Z ]+$/.test(nome)) erro();

// Certo: só exige que não seja vazio nem só espaço/pontuação
if (!nome.trim() || !/\p{L}/u.test(nome)) erro();
```

## Teste automatizado

```js
const LOCALES = ["pt-BR", "en-US", "de-DE", "ar-SA"];

for (const locale of LOCALES) {
  test(`sem texto cortado em ${locale}`, async ({ page }) => {
    await page.goto(`/?locale=${locale}`);
    const cortados = await page.evaluate(() =>
      [...document.querySelectorAll("button, a, label, h1, h2, h3")]
        .filter(el => el.scrollWidth > el.clientWidth + 1)   // conteúdo maior que o container
        .map(el => el.textContent?.slice(0, 40))
    );
    expect(cortados).toEqual([]);
  });
}

test("sem string faltando no bundle", async () => {
  const base = require("./locales/pt-BR.json");
  for (const loc of ["en-US", "de-DE"]) {
    const alvo = require(`./locales/${loc}.json`);
    const faltando = Object.keys(base).filter(k => !(k in alvo));
    expect(faltando).toEqual([]);
  }
});
```

O teste de `scrollWidth > clientWidth` pega truncamento real — inclusive o causado por `text-overflow: ellipsis`, que esconde o problema visualmente.

## Referência rápida

```
Expansão de teste       +30% sobre o português
Pseudolocale            [Ŝåṽåŕ ---]  — colchete sumiu = truncou
Plural                  Intl.PluralRules / plurals / String Catalog
Data                    ISO 8601 + fuso; formatar só na exibição
Moeda                   valor numérico + código ISO (BRL, USD)
Espaçamento             margin-inline-start (ms-*), nunca margin-left
Alinhamento             text-align: start, nunca left
Ordenação               Intl.Collator, nunca sort() cru
Nome                    \p{L}, nunca [a-zA-Z]
Root                    lang + dir corretos
```
