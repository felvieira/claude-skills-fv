---
description: Remove sinais de AI-generated writing de qualquer texto — docs, PRDs, copy, changelogs, release notes. Aplica os 29 padrões de policies/anti-ai-writing.md + adiciona voz e personalidade.
---

# /humanize — Remove AI Writing Patterns

**Objetivo:** reescrever texto para soar natural e humano, removendo os 29 padrões catalogados em `policies/anti-ai-writing.md`. Baseado em [blader/humanizer](https://github.com/blader/humanizer) + [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing).

**Quando usar:**
- antes de publicar PRD no tracker (`/to-prd`)
- ao finalizar docs de usuário (skill 10)
- ao revisar copy antes de publicar (skill 13)
- ao revisar artigo/blog (skill 14)
- ao revisar qualquer prosa que humanos vão ler

**Quando NÃO usar:**
- código-fonte (não é prosa)
- comentários técnicos curtos (overhead desproporcional)
- conteúdo em idioma diferente do input (skill processa no idioma do texto)

**Skill ativada:** Documenter (skill 10) em modo "anti-AI editor".

## Processo

### Passo 1 — Detectar input

```bash
# Argumento é path de arquivo?
test -f "$1" && cat "$1"   # lê arquivo
# Sem argumento: texto veio inline na conversa
```

Se nenhum input detectado: pedir ao usuário o texto ou path.

### Passo 2 — Voice calibration (opcional)

Se o usuário forneceu amostra de escrita própria (inline ou path):
1. Ler a amostra antes de qualquer reescrita
2. Notar: comprimento de frases, nível de vocabulário, início de parágrafos, pontuação, vícios de linguagem, como trata transições
3. Usar esses padrões na reescrita — não apenas remover AI-isms, mas substituir com os padrões da amostra

Se sem amostra: usar voz padrão (natural, variada, opinativa).

### Passo 3 — Draft rewrite

Aplicar todas as 5 categorias de `policies/anti-ai-writing.md`:
1. **Conteúdo** (padrões 1-6): significado inflado, notabilidade, -ing superficial, linguagem promocional, atribuições vagas, seções formulaicas
2. **Linguagem** (padrões 7-13): vocabulário AI, copula avoidance, paralelismos negativos, regra dos três, synonym cycling, falsos ranges, passiva sem sujeito
3. **Estilo** (padrões 14-19): em dash, negrito, listas com cabeçalho inline, title case, emojis, curly quotes
4. **Comunicação** (padrões 20-22): artefatos de chatbot, disclaimers de cutoff, sycofância
5. **Enchimento** (padrões 23-29): frases de enchimento, hedging, conclusões genéricas, hifenização excessiva, autoridade persuasiva, signposting, headers com aquecimento

**Preservar:**
- Significado principal intacto
- Tom adequado ao contexto (formal, casual, técnico)
- Informações específicas e dados concretos

**Injetar:**
- Opiniões quando couber
- Ritmo variado (frases curtas e longas misturadas)
- Incerteza honesta quando existe
- Especificidade sobre sentimentos e reações

### Passo 4 — Auditoria anti-IA

Após o draft, fazer auto-avaliação:

**Pergunta:** "O que ainda parece obviamente gerado por IA?"

Responder com bullets concretos (ex: "parágrafo 3 ainda usa 'it is important to note'", "conclusão soa genérica").

**Pergunta:** "Agora fazer isso não parecer gerado por IA."

Revisar com base na auditoria.

### Passo 5 — Output final

Entregar:

```
## Draft
[reescrita inicial]

## Auditoria — o que ainda parece IA
- [bullet 1]
- [bullet 2]

## Versão final
[reescrita após auditoria]

## Mudanças principais
- [lista de padrões removidos]
```

Se o texto era um arquivo: oferecer escrever a versão final de volta no arquivo (`Edit` no arquivo original ou `Write` em novo path).

## Inputs

- `[path]` — arquivo a humanizar
- `[texto inline]` — texto colado diretamente
- `--sample [path]` — arquivo de amostra para calibração de voz
- `--lang [pt|en]` — idioma explícito (default: detectar do texto)
- `--depth [quick|full]` — `quick` remove só os padrões mais comuns (7, 10, 13, 20, 28); `full` aplica todos os 29 (default: `full`)

## Policies relevantes

- [`policies/anti-ai-writing.md`](../../policies/anti-ai-writing.md) — catálogo completo dos 29 padrões
- [`policies/writing-clarity.md`](../../policies/writing-clarity.md) — princípios gerais de clareza (complementar)

## Handoff

- texto humanizado → publicar no tracker (`gh issue create`) ou finalizar doc
- se mudanças foram grandes → rodar `/review` para validar coerência técnica

**Uso:** `/humanize [path ou texto] [--sample path] [--depth quick|full]`
