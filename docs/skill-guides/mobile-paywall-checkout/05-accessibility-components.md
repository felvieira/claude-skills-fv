# Acessibilidade, Componentes e Qualidade de Interação

## Touch targets

Todas as áreas interativas críticas atingem no mínimo **48×48dp**, mesmo quando o glyph visual é menor:

```
○ radio            48dp target
× remover cupão     48dp target
? detalhes          48dp target
segment mensal      ≥48dp
CTA                 ≥48dp
```

Coerente com a orientação de acessibilidade Android/Material — button groups do Material exigem o mesmo alvo mínimo de 48×48dp.

## Semantics/TalkBack

```
Plan card (não selecionado):
"Pro, 12 euros e 99 cêntimos por mês, recomendado, não selecionado, botão de opção"

Plan card (selecionado):
"Pro, 12 euros e 99 cêntimos por mês, recomendado, selecionado"
```

Nunca `"Card 2"` genérico. Compose usa `semantics` pra transmitir contexto a serviços de acessibilidade, autofill e testes.

## Ordem de leitura

```
Título
  ↓
Periodicidade
  ↓
Plano 1 → Plano 2 → Plano 3
  ↓
Cupão
  ↓
Resumo
  ↓
Termos
  ↓
CTA
```

A ordem semântica corresponde à lógica visual — a barra sticky de CTA nunca é lida inesperadamente entre o título e os cards. Compose disponibiliza mecanismos de traversal order para controlar esses casos.

## Contraste (WCAG 2.2)

Texto normal: mínimo 4,5:1. Texto grande: mínimo 3:1. Elementos não-textuais relevantes (ex: borda de seleção do plan card) têm requisito de contraste próprio — não confiar só em cor pra indicar seleção (ver seção de estados do card em `02-plan-selection-ui.md`).

## Autofill

Android Autofill Framework existe desde API 26 — serviços de autofill preenchem formulários automaticamente, reduzindo introdução manual. A documentação Compose reforça a redução de tempo e erro em formulários com autofill funcional.

```
Nome            → text / autofill
Email           → email keyboard / autofill
Telefone        → phone keyboard / autofill
Código postal   → input adequado ao país
Cartão          → PSP component / wallet
```

Evitar campos "criativos" que quebrem autofill ou acessibilidade.

## Teclado por tipo de campo

```
email                 → KeyboardType.Email
telefone               → KeyboardType.Phone
campo estritamente numérico → KeyboardType.Number
cupão alfanumérico      → KeyboardType.Text
```

Não assumir teclado numérico pra código postal/cupão em mercados onde podem existir letras.

## Validação — nunca prematura

```
❌ NÃO:
Número do cartão
[4___________]
⚠ Cartão inválido      ← um instante depois do primeiro caractere
```

A Nielsen Norman Group alerta especificamente contra validação prematura/hostil e recomenda mensagem precisa, visível e próxima do problema.

```
✓ Estratégia:
input incompleto  → sem erro
blur/submissão    → validar
erro conhecido    → mensagem específica
correção          → remover erro assim que resolvido
```

Para cupão, a validação remota acontece só depois do usuário tocar explicitamente em "Aplicar" (ou lógica equivalente cuidadosamente desenhada) — nunca a cada tecla digitada.

## Google Pay — redução de campos

Quando aplicável, Google Pay aparece **antes** da introdução manual de cartão:

```
Forma de pagamento
┌───────────────────────────────┐
│         Google Pay            │
└───────────────────────────────┘
              ou
Cartão
Número
[_____________________________]
Validade           CVC
[________]        [________]
```

E não uma lista de 15 campos de cartão/morada antes de sequer mostrar a opção Google Pay. A orientação oficial recomenda: Google Pay no topo, acima dos campos manuais; minimizar cliques; total apresentado antes de invocar o payment sheet; guest checkout sempre que adequado (evitar forçar criação de conta antes da compra).

Isso é coerente com a pesquisa de checkout da Baymard: checkout longo/complicado é causa mensurável de abandono, e reduzir campos importa mais do que perseguir um número mínimo arbitrário de telas.
