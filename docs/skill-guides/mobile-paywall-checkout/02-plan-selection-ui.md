# UI de Seleção de Plano — Componentes e Wireframes por Estado

## Estado inicial (variante neutra — sem plano pré-selecionado)

```
┌───────────────────────────────────┐
│ ←           Escolher plano        │
│                                   │
│ Encontre o plano certo para si    │
│                                   │
│ ┌──────────────┬────────────────┐ │
│ │   Mensal     │ Anual · -23%   │ │
│ └──────────────┴────────────────┘ │
│                                   │
│ ┌───────────────────────────────┐ │
│ │ ESSENCIAL                     │ │
│ │ Para começar                  │ │
│ │ 7,99 €/mês                 ○  │ │
│ └───────────────────────────────┘ │
│                                   │
│ ┌───────────────────────────────┐ │
│ │ RECOMENDADO                   │ │
│ │ PRO                           │ │
│ │ Para utilização frequente     │ │
│ │ 12,99 €/mês                ○  │ │
│ │ ✓ Mais capacidade            │ │
│ │ ✓ Funcionalidades premium    │ │
│ │ ✓ Prioridade                 │ │
│ └───────────────────────────────┘ │
│                                   │
│ ┌───────────────────────────────┐ │
│ │ MAX                           │ │
│ │ Para utilização intensiva     │ │
│ │ 24,99 €/mês                ○  │ │
│ └───────────────────────────────┘ │
├───────────────────────────────────┤
│ [        Escolha um plano       ] │
│              disabled             │
└───────────────────────────────────┘
```

Card pode comunicar "Recomendado" sem já estar selecionado — distingue recomendação editorial de escolha feita em nome do usuário.

## Estado selecionado

```
┌───────────────────────────────────┐
│ [   Mensal   ][ Anual · -23% ]    │
│                                   │
│ ┌───────────────────────────────┐ │
│ │ Essencial          7,99 €/mês ○│ │
│ └───────────────────────────────┘ │
│                                   │
│ ╔═══════════════════════════════╗ │
│ ║ RECOMENDADO                   ║ │
│ ║ PRO              12,99 €/mês ●║ │
│ ║ ✓ Mais capacidade            ║ │
│ ║ ✓ Funcionalidades premium    ║ │
│ ║ ✓ Prioridade                 ║ │
│ ╚═══════════════════════════════╝ │
│                                   │
│ ┌───────────────────────────────┐ │
│ │ Max               24,99 €/mês ○│ │
│ └───────────────────────────────┘ │
│                                   │
│ Resumo                            │
│ Pro                       12,99 € │
│ 🏷 Tem um cupão?                 │
│ Total                     12,99 € │
├───────────────────────────────────┤
│ [ Continuar com Pro · 12,99 € ]  │
└───────────────────────────────────┘
```

O radio é reforço semântico útil porque a seleção é exclusiva (mapeia direto ao padrão de radio button do Material: escolher uma opção dentro de um conjunto).

## Estado anual selecionado

```
┌───────────────────────────────────┐
│ [   Mensal   ][  ANUAL · -23%  ] │
│                                   │
│ ╔═══════════════════════════════╗ │
│ ║ PRO                        ●  ║ │
│ ║ 119,99 €/ano                  ║ │
│ ║ ≈ 10,00 €/mês                 ║ │
│ ║ Poupa 35,89 € por ano         ║ │
│ ╚═══════════════════════════════╝ │
│                                   │
│ Renovação anual até cancelamento. │
│ Total                    119,99 € │
│ [ Assinar Pro · 119,99 €/ano ]   │
└───────────────────────────────────┘
```

## Componente PlanCard

```
┌─────────────────────────────────┐
│ [badge opcional]                │
│ NOME DO PLANO               ●  │
│ descrição curta                 │
│ PREÇO                           │
│ billing detail                  │
│ ✓ benefício                     │
│ ✓ benefício                     │
│ ✓ benefício                     │
└─────────────────────────────────┘
```

| Propriedade | Baseline sugerida |
| --- | --- |
| Padding horizontal do ecrã | 16 dp |
| Padding interno do card | 16–20 dp |
| Espaço entre cards | 12 dp |
| Touch target do radio | ≥48×48 dp |
| Card selecionável | área completa (não só o radio) |
| Lista inicial de benefícios | 3–5 diferenças relevantes, não a feature list inteira repetida em cada card |
| CTA dentro do card | não, salvo razão específica — a ação de comprar fica separada, na barra sticky |

Valores exceto o mínimo de 48dp são tokens propostos, não norma de plataforma — ajustar por design system real do produto.

## Estados do card

```
Default            Selected            Disabled
┌────────────┐     ╔════════════╗     ┌────────────┐
│ Pro     ○  │     ║ Pro     ●  ║     │ Pro           │
└────────────┘     ╚════════════╝     │ Indisponível  │
                                       └────────────┘
```

Seleção nunca depende só de cor — sempre borda/superfície + radio selecionado + `semantics selected=true` juntos (acessibilidade, ver `05-accessibility-components.md`).

## Componente BillingPeriodSelector

```
┌────────────────┬──────────────────────┐
│ Mensal         │ Anual · Poupa 23%   │
└────────────────┴──────────────────────┘
```

- height ≥48dp touch target, largura preenchendo o espaço disponível
- exatamente uma seleção sempre
- label principal curto (`Mensal`, `Anual`); desconto pode ser secundário
- trocar período preserva o tier selecionado
- leitor de tela precisa saber qual segmento está selecionado

Mapeamento ao componente Material: segmented button, para alternância exclusiva entre opções de um conjunto compacto.

## Hierarquia do plano-alvo sem manipulação

Sinais cumulativos permitidos:

| Sinal | Uso recomendado |
| --- | --- |
| Badge | "Recomendado", só se for recomendação real |
| Borda/superfície | estado visual dominante |
| Conteúdo | benefícios diferenciadores mais visíveis |
| Seleção inicial | hipótese/teste de produto — nunca pra esconder a escolha |

```
        RECOMENDADO
╔═══════════════════════════════╗
║ PRO                           ║
║ 12,99 €/mês                   ║
║ ✓ 5× mais capacidade         ║
║ ✓ Funcionalidades premium    ║
║ ✓ Processamento prioritário  ║
║                            ● ║
╚═══════════════════════════════╝
```

Antipadrão: reduzir os demais planos a texto cinza minúsculo/ilegível para forçar a escolha do alvo — o usuário precisa perceber que existe uma escolha real, senão a "escolha" é ficção.

## Semântica dos badges — não são sinônimos

| Badge | Deve significar |
| --- | --- |
| Recomendado | recomendação editorial/do produto |
| Recomendado para si | recomendação baseada em sinal individual justificável |
| Mais popular | plano efetivamente escolhido por mais usuários numa população definida |
| Melhor relação preço/valor | análise comparativa justificável |
| Poupa 23% | diferença calculável relativamente a uma referência explícita |

Nunca usar `"MAIS POPULAR"` só porque é o plano de maior margem, sem dado real de escolha por trás. Personalizar com razão real é mais forte que badge genérico:

```
Recomendado para si
Utiliza normalmente ~180 créditos/mês.
O Pro inclui 300.
```

## Pré-selecionar ou não

Não é verdade universal — decisão a testar (ver `06-experimentation-metrics.md`).

Baseline conservadora: plano-alvo destacado, mas nenhum plano pré-selecionado. Variante CRO: plano-alvo destacado **e** pré-selecionado. A pré-seleção reduz um gesto mas introduz escolha implícita — medir não só conversão, mas troca de plano posterior, cancelamento, refund e chamados de suporte.

## Ordem dos planos no mobile

Sem lista horizontal com "plano do meio" (que funciona em desktop) — em mobile é lista vertical, o poder espacial do meio se perde. Duas estratégias defensáveis, ambas a validar por A/B:

- **Comparação**: Essencial → Pro → Max (facilita entender progressão de valor)
- **Aquisição**: Pro → Essencial → Max (dá visibilidade imediata ao plano-alvo)

## Mostrar diferenças, não repetir tudo

```
Essencial          Pro                  Max
✓ 50 utilizações   ✓ 300 utilizações    ✓ 1000 utilizações
✓ Standard         ✓ Premium            ✓ Premium
                   ✓ Prioridade         ✓ Prioridade máxima
```

Em vez de cards gigantes repetindo 18 funcionalidades idênticas. Tornar as diferenças explícitas, não enterradas.

## StickyCheckoutBar

```
┌──────────────────────────────────┐
│ Pro                     12,99 €  │
│ [ Continuar com Pro · 12,99 € ] │
└──────────────────────────────────┘
         + bottom safe inset
```

- respeita `safeDrawing`/system bar
- adapta-se ao IME quando um campo está com foco
- nunca tapa a última linha de conteúdo
- pode crescer para 2 linhas se necessário
- desativa novo submit durante processamento

Android fornece `WindowInsets` (incluindo `safeDrawing` e `ime`) para esse tipo de proteção em layout edge-to-edge.

## CTA — copy específica, não genérica

| Situação | Copy |
| --- | --- |
| Tier selecionado | `Continuar com o Pro` |
| Compra imediata | `Pagar 12,99 €` |
| Subscrição mensal | `Assinar o Pro · 12,99 €/mês` |
| Subscrição anual | `Assinar o Pro · 119,99 €/ano` |
| Trial | `Iniciar teste gratuito` + termos de cobrança posterior próximos |
| Retry | `Tentar pagamento novamente` |

A copy responde "o que acontece quando eu tocar?" — evitar `Continuar`/`Próximo`/`OK`/`Confirmar` genéricos quando dá pra ser específico.

## Microcopy de subscrição

```
Mensal:  12,99 €/mês
         Renovação mensal até cancelamento.

Anual:   119,99 €/ano
         Equivale a 10,00 €/mês.
         Renovação anual até cancelamento.

Trial:   7 dias grátis.
         Depois, 12,99 €/mês até cancelamento.
```
