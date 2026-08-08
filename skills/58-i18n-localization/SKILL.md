---
name: i18n-localization
description: |
  Internacionalizacao e localizacao — preparar o produto para outro idioma, regiao ou direcao de
  escrita antes de existir tradutor no projeto. Use ao construir qualquer UI que possa receber outro
  idioma, ao formatar data/numero/moeda, ao lidar com plural, ao testar expansao de texto e RTL, ou
  quando texto traduzido quebra o layout.
  Trigger em: "i18n", "internacionalizacao", "localizacao", "l10n", "traducao", "multi-idioma",
  "outro idioma", "RTL", "arabe", "hebraico", "direita para esquerda", "pseudolocale",
  "texto quebrou traduzido", "formato de data", "formato de moeda", "plural", "locale",
  "timezone", "fuso horario", "expansao de texto".
argument-hint: "[--audit=path] [--target-locales=pt-BR,en,ar]"
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# i18n e Localizacao — Preparar Antes de Traduzir

Internacionalizacao (i18n) e trabalho de **arquitetura**, nao de tradutor. Se a string esta concatenada no meio do componente, a largura foi calculada para o portugues e a data foi montada com `dia + "/" + mes`, nenhuma traducao conserta — o codigo precisa mudar primeiro. Esta skill cobre o que fazer antes da primeira palavra ser traduzida.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md` e `policies/evals.md`.

Para tabelas de expansao por idioma, exemplos de formatter por plataforma e receitas de teste, consultar `docs/skill-guides/i18n-localization.md` apenas quando necessario.

Fronteira com skills vizinhas:
- **02-ui-ux-design** define layout e tokens — esta skill impoe as restricoes que o layout tem de aguentar (texto que cresce, direcao que inverte)
- **56-responsive-conversion** conserta layout quebrado por largura de tela; aqui a quebra vem do **conteudo** (texto traduzido mais longo), com a mesma raiz de container que se recusa a crescer
- **57-mobile-ux-foundations** cobre escala de fonte do sistema; esta skill cobre o crescimento causado pelo idioma
- **22-accessibility-specialist** e dona do WCAG — `lang`/`dir` corretos e leitura por screen reader no idioma certo sao o recorte compartilhado
- **13-marketing-copy** e **50-direct-response-copy** escrevem o texto; esta skill garante que o texto seja traduzivel sem reescrever o codigo

## Quando Usar

- construir UI que pode receber outro idioma, mesmo que hoje seja so pt-BR
- formatar data, hora, numero, moeda, unidade ou nome
- lidar com plural, genero ou ordenacao de texto
- preparar suporte a RTL (arabe, hebraico, persa, urdu)
- diagnosticar layout que quebrou depois de traduzir
- auditar codebase existente antes de contratar traducao

## Quando Nao Usar

- escrever ou revisar o texto em si (isso e 13-marketing-copy ou 50-direct-response-copy)
- traduzir conteudo — esta skill prepara o terreno, nao substitui tradutor humano ou servico de traducao
- corrigir layout que quebra por largura de tela, sem relacao com idioma (isso e 56-responsive-conversion)
- auditoria completa de acessibilidade (isso e 22-accessibility-specialist)

## Entradas Esperadas

- codebase ou componente alvo
- locales que o produto precisa suportar (ou "nenhum ainda, mas quero preparar")
- restricoes de dominio: moeda, formato legal de documento, fuso horario relevante

## Saidas Esperadas

- relatorio de auditoria: string hardcoded, concatenacao, formato fixo, largura rigida, uso de left/right
- codigo corrigido com strings externalizadas e formatters por locale
- checklist de i18n marcado
- evidencia de teste em pseudolocale e RTL

## Por Que Isso Nao Pode Ficar Para Depois

Retrofit de i18n custa muito mais que fazer certo desde o inicio, porque o problema nao esta nas strings — esta na **forma como o codigo foi escrito**:

| Decisao tomada sem pensar em i18n | O que quebra depois |
| --- | --- |
| `"Ola, " + nome + "!"` | Ordem das palavras muda entre idiomas; a frase fica sem sentido |
| `width: 120px` num botao | Alemao e ~30% mais longo que o portugues; o texto corta |
| `margin-left: 16px` | Em RTL o espaco fica do lado errado |
| `${dia}/${mes}/${ano}` | EUA le `08/03` como 3 de agosto, nao 8 de marco |
| `count + " itens"` | Idiomas com 3+ formas de plural (russo, arabe, polones) ficam errados |
| Texto dentro de PNG | Precisa refazer a imagem por idioma |
| Ordenacao com `sort()` cru | Acentos e alfabetos nao-latinos ordenam errado |

Nenhum destes e resolvido por tradutor. Todos exigem mudanca de codigo.

## Protocolo de Auditoria

### Fase 1 — Encontrar o que esta preso ao idioma

```bash
# String literal em JSX/template (o suspeito principal)
grep -rnE '>[A-Za-zÀ-ÿ]{4,}[^<]*<' src/ app/ --include=*.tsx --include=*.jsx

# Concatenacao de frase
grep -rnE '"[^"]*" *\+ *[a-zA-Z_$]|\+ *" [a-z]' src/ app/

# Data/numero montados a mao
grep -rnE 'getMonth\(\)|getDate\(\)|toFixed\(2\).*R\$|"R\$ *" *\+' src/ app/

# Direcao fisica em vez de logica
grep -rnE 'margin-left|margin-right|padding-left|padding-right|text-align: *(left|right)|\b(ml|mr|pl|pr)-[0-9]' src/ app/

# Largura fixa (vai cortar texto mais longo)
grep -rnE 'width: *[0-9]{2,}px|w-\[[0-9]+px\]' src/ app/
```

Cada hit e candidato, nao bug confirmado — validar na Fase 2.

### Fase 2 — Testar com pseudolocale, antes de existir traducao

Pseudolocale transforma `Salvar` em algo como `[Ŝåṽåŕ ---]`: mantem legivel, mas expande o texto e troca os caracteres. Revela de uma vez:

- **String hardcoded** — o que nao muda nao esta externalizado
- **Falta de espaco** — o texto expandido corta ou empurra o layout
- **Concatenacao** — a frase montada aparece parcialmente pseudolocalizada
- **Problema de encoding** — caractere acentuado vira `?` ou caixinha

Android tem pseudolocales nativos (`en-XA` para expansao, `ar-XB` para RTL). Na web e em outras stacks, gerar o pseudolocale a partir do arquivo de strings resolve — a tecnica importa mais que a ferramenta.

Regra de dimensionamento: **assumir +30% de expansao** sobre o portugues como piso de teste. Texto curto (rotulo de botao) expande proporcionalmente mais que texto longo.

### Fase 3 — Testar RTL

Nao basta espelhar tudo. Espelha o **layout**; nao espelha conteudo que tem direcao propria:

| Espelha | Nao espelha |
| --- | --- |
| Direcao da leitura e do fluxo | Numeros |
| Posicao de sidebar, icone e label | Grafico com eixo temporal convencional |
| Seta de "voltar"/"avancar" | Logo da marca |
| Barra de progresso | Icone de relogio, de midia (play/pause) |
| Alinhamento de texto | Codigo, URL, e-mail |

O teste minimo e alternar `dir="rtl"` no root e percorrer o fluxo principal. O que usa propriedade logica (`margin-inline-start`) acompanha sozinho; o que usa `margin-left` fica errado — e esse e justamente o inventario da Fase 1.

### Fase 4 — Corrigir pela causa

Ver o catalogo abaixo. Trocar `margin-left` por `margin-inline-start` um a um sem entender o padrao gera regressao na proxima tela.

## Catalogo — Problema, Causa, Correcao

### 1. String presa ao codigo

Toda string visivel ao usuario sai do componente e vai para arquivo de recurso, com **chave semantica** (`checkout.confirmButton`), nao a frase em si como chave (a frase muda; a chave nao deveria).

Interpolacao com variavel nomeada, nunca concatenacao:

```
Errado:  "Ola, " + nome + "! Voce tem " + n + " mensagens."
Certo:   t("home.greeting", { nome, count: n })
         // pt: "Ola, {nome}! Voce tem {count} mensagens."
         // ja: "{nome}さん、{count}件のメッセージがあります。"  ← ordem diferente
```

A ordem das palavras muda entre idiomas. Concatenacao fixa a ordem do portugues no codigo.

### 2. Plural

Portugues e ingles tem 2 formas (1 / outros). Russo tem 3, arabe tem 6, japones tem 1. `if (n === 1)` funciona em pt e quebra no resto.

Usar a API de plural da plataforma (`Intl.PluralRules` na web, `plurals` no Android, stringsdict no iOS) e deixar cada locale declarar suas proprias formas. Zero merece caso proprio quando o texto muda ("Nenhuma mensagem" em vez de "0 mensagens").

### 3. Data, hora, numero e moeda

Nunca montar a mao. O formatter da plataforma ja sabe a convencao de cada locale:

```
08/03/2026  → pt-BR: 8 de marco    en-US: 3 de agosto     ← mesma string, sentido oposto
1.234,56    → pt-BR                en-US: 1,234.56
R$ 1.000    → simbolo, posicao e separador variam por locale
```

Regras que evitam a maioria dos bugs:
- **Armazenar em formato canonico** (ISO 8601 para data/hora, valor numerico + codigo de moeda), **formatar so na exibicao**
- **Guardar timestamp com fuso** — data sem fuso vira dia errado na virada da meia-noite
- **Nunca traduzir o dado**, so a apresentacao

### 4. Expansao de texto

Assumir que o texto vai crescer, e projetar para isso:

- Container com `min-width`/`min-height`, nunca dimensao fixa
- Botao cresce com o rotulo; linha de texto pode quebrar em duas
- Truncamento com reticencias e ultimo recurso, e nunca em informacao essencial ou acao
- Testar o rotulo mais longo real, nao o mais curto

Mesma raiz do bug de `min-width: auto` da skill 56 — container que se recusa a crescer — aqui disparado pelo idioma.

### 5. Direcao logica em vez de fisica

| Fisico (quebra em RTL) | Logico (acompanha) |
| --- | --- |
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` |
| `padding-left` / `padding-right` | `padding-inline-start` / `padding-inline-end` |
| `text-align: left` | `text-align: start` |
| `left` / `right` | `inset-inline-start` / `inset-inline-end` |
| `border-left` | `border-inline-start` |

Tailwind: usar `ms-*`/`me-*`/`ps-*`/`pe-*` em vez de `ml-*`/`mr-*`/`pl-*`/`pr-*`.

### 6. Texto dentro de imagem

Texto em PNG/JPG nao e traduzivel sem refazer o arquivo, nao e lido por screen reader e nao escala com a fonte. Texto sobre imagem vai em HTML por cima; texto em SVG e traduzivel se estiver em `<text>`, nao vetorizado.

### 7. Ordenacao e busca

`array.sort()` cru ordena por code point: "Zebra" vem antes de "Ácido", e alfabetos nao-latinos saem embaralhados. Usar comparador sensivel a locale (`Intl.Collator`). Busca precisa decidir explicitamente se ignora acento e caixa — e o comportamento deve ser o mesmo para "cafe" e "café".

### 8. Formulario que assume um pais

Nome, endereco, telefone e documento variam por pais:

- Nao exigir "sobrenome" — parte do mundo tem nome unico
- Endereco: campos e ordem mudam; CEP nem sempre e numerico
- Telefone: aceitar codigo de pais, nao presumir 11 digitos
- Documento (CPF, SSN, NIF) e especifico de pais, nunca campo generico obrigatorio
- Aceitar caractere nao-ASCII em nome — validacao `[a-zA-Z]` rejeita "José" e "أحمد"

### 9. `lang` e `dir` corretos

O atributo `lang` no root diz ao screen reader qual pronuncia usar e ao browser como quebrar linha. Trecho em outro idioma no meio da pagina leva `lang` proprio. `dir` acompanha o idioma. Sem isso, leitor de tela le portugues com fonetica inglesa — e isso e falha de acessibilidade, nao so de i18n.

## Anti-Padroes

- Deixar i18n "para quando internacionalizar" — o custo de retrofit e muito maior que o de fazer certo
- Frase concatenada com variavel no meio
- Chave de traducao sendo a propria frase em portugues
- `if (n === 1)` como logica de plural
- Data/moeda montadas com template string
- Data sem fuso horario quando o horario importa
- `margin-left`/`text-align: left` em produto que pode receber RTL
- Largura fixa em botao ou rotulo
- Truncar acao ou informacao essencial em vez de deixar quebrar linha
- Texto embutido em bitmap
- `sort()` cru em lista visivel ao usuario
- Validar nome com `[a-zA-Z]`
- Presumir que todo mundo tem sobrenome, CEP numerico ou telefone de 11 digitos
- Traduzir com maquina sem revisao e mandar para producao
- Espelhar numero, logo ou icone de midia em RTL

## Checklist

Arquitetura:
- [ ] Nenhuma string visivel hardcoded no componente
- [ ] Chave semantica, nao a frase como chave
- [ ] Interpolacao com variavel nomeada, sem concatenacao
- [ ] Plural via API da plataforma, com caso proprio para zero quando o texto muda
- [ ] Data/hora/numero/moeda via formatter de locale
- [ ] Dado guardado em formato canonico; formatacao so na exibicao
- [ ] Timestamp com fuso quando o horario importa

Layout:
- [ ] Container com `min-*`, sem dimensao fixa em elemento com texto
- [ ] Testado com +30% de expansao (pseudolocale)
- [ ] Propriedade logica (`inline-start`/`inline-end`) em vez de left/right
- [ ] Testado com `dir="rtl"` no fluxo principal
- [ ] Numero, logo e icone de midia **nao** espelhados
- [ ] Nenhum texto traduzivel dentro de bitmap

Dados e conteudo:
- [ ] Ordenacao com comparador de locale
- [ ] Busca com comportamento definido para acento e caixa
- [ ] Formulario nao presume formato de nome, endereco, telefone ou documento de um pais so
- [ ] `lang` e `dir` corretos no root e em trecho de outro idioma

## Evidencia de Conclusao

- relatorio problema → causa → correcao por ocorrencia
- captura ou descricao do fluxo principal em pseudolocale, sem corte nem string nao traduzida
- captura ou descricao do fluxo principal em RTL, sem elemento espelhado errado
- checklist marcado, com item nao aplicavel justificado

## Handoff

### Recebe de

- **02-ui-ux-design** — layout e tokens que precisam aguentar texto que cresce
- **04-frontend-integration** — componentes implementados a auditar
- **13-marketing-copy** / **50-direct-response-copy** — texto a externalizar

### Entrega para

- **56-responsive-conversion** — quando a expansao de texto expoe bug de layout que vale corrigir na raiz
- **22-accessibility-specialist** — `lang`/`dir` e leitura por screen reader entram na auditoria WCAG
- **05-qa-testing** — pseudolocale e RTL viram teste de regressao, nao verificacao manual unica
- **03-backend-api** — formato canonico de data/moeda e o contrato da API, nao decisao de frontend

## Regra de Codigo Limpo

Comentario so onde a regra de locale nao e obvia — por que um formato especifico foi fixado, ou por que determinado campo nao e obrigatorio em certo pais. Chave de traducao bem nomeada dispensa comentario.

## Fontes

- Pseudolocales e teste de bidirecionalidade: documentacao oficial do Android sobre localizacao.
- Formatadores sensiveis a locale: `Intl` (ECMAScript), Foundation (Apple), bibliotecas equivalentes por plataforma.
- Regras de plural por idioma: CLDR (Unicode Common Locale Data Repository).
- Propriedades logicas de CSS: especificacao CSS Logical Properties (W3C).
- `lang`/`dir` e leitura assistiva: WCAG 2.2 (criterios de idioma da pagina e de partes).

## Integracao com Pipeline

- **Orquestrador (skill 09):** aciona esta skill no inicio de produto com escopo multi-idioma, e antes de contratar traducao em produto existente
- **UI/UX Design (skill 02):** dona do layout; esta skill impoe que o layout aguente texto maior e direcao invertida
- **Responsive Conversion (skill 56):** trata quebra por largura de tela; esta trata quebra por conteudo
- **Accessibility (skill 22):** dona do WCAG; `lang`/`dir` e o recorte compartilhado
- **QA (skill 05):** transforma pseudolocale e RTL em regressao automatizada
