# Prompt Engineer Guide

> Guia auxiliar da skill `26-prompt-engineer`.  
> Abrir apenas quando o design de prompt for complexo ou quando precisar dos templates de texto, imagem e video.

---

## O que esta skill faz

O Prompt Engineer transforma boas praticas de prompting em templates reutilizaveis com foco em clareza, controle, custo e reprodutibilidade. O resultado e um prompt com objetivo definido, contexto minimo suficiente, formato de saida especificado e fallback considerado.

---

## Quando acionar

| Situacao | Acionar? |
|----------|----------|
| Prompt e parte central da feature (qualidade importa) | Sim |
| Padronizar templates de prompt do projeto | Sim |
| Reduzir custo de tokens sem perder qualidade | Sim |
| Melhorar reproducibilidade de geracoes | Sim |
| Improvisacao rapida sem caso de uso definido | Nao |
| Substituir arquitetura de integracao (responsabilidade do AI Architect) | Nao |

---

## Anatomia de um bom prompt

```
[System]          Define o papel, tom, restricoes e formato de saida
[Context]         Informacoes necessarias para a tarefa (minimas e suficientes)
[Task]            O que fazer — especifico e verificavel
[Format]          Como entregar o resultado (JSON, markdown, lista, texto)
[Examples]        (Opcional) Few-shot para guiar o modelo
[Constraints]     O que NAO fazer
```

---

## Templates por modalidade

### Texto — Template base

```
[System]
Voce e um assistente especializado em [dominio].
Responda sempre em [idioma].
Formato de saida: [JSON | markdown | texto puro].
Seja [conciso | detalhado] — maximo [N] palavras/tokens.
Nao inclua [explicacoes desnecessarias | codigo | opinioes pessoais].

[Context]
[Informacoes minimas necessarias para a tarefa]

[Task]
[Instrucao clara, especifica e verificavel]

[Examples] (opcional)
Entrada: [exemplo]
Saida esperada: [exemplo]

[Constraints]
- Nao inventar informacoes nao fornecidas
- Nao incluir texto alem do formato solicitado
```

### Texto — Variantes comuns

**Classificacao/triagem:**
```
Classifique o texto abaixo em uma das categorias: [A, B, C].
Responda apenas com a categoria, sem explicacao.

Texto: {{input}}
```

**Extracao estruturada:**
```
Extraia as informacoes do texto abaixo e retorne JSON valido.
Schema: {"campo1": "string", "campo2": "number"}
Retorne apenas o JSON, sem markdown, sem comentarios.

Texto: {{input}}
```

**Geracao com tom:**
```
Voce e um copywriter para [produto/marca].
Tom: [amigavel, direto, motivacional].
Escreva [N] variacoes de [tipo de copy] para: {{input}}
Formato: lista numerada, cada item em uma linha.
```

---

### Imagem — Template base

```
[Subject]        O que deve aparecer — pessoa, objeto, cena, produto
[Style]          Estilo visual — fotografico, ilustracao, flat, 3D, pixel art
[Composition]    Enquadramento — close-up, full shot, overhead, rule of thirds
[Lighting]       Luz — natural, studio, golden hour, dramatic, neon
[Color Palette]  Paleta — warm tones, muted pastels, high contrast, brand colors
[Mood]           Emocao — calm, energetic, professional, playful
[Negative]       O que evitar — no text, no people, no watermark, no blur
```

**Exemplo — Hero image de produto:**
```
Product photo of a minimalist water bottle on a white marble surface,
studio lighting with soft shadows, clean background, high resolution,
photorealistic, brand colors: white and forest green,
professional commercial photography style.
--no text, no watermark, no reflections on bottle
```

**Exemplo — Avatar/personagem:**
```
Portrait of a friendly customer support avatar, professional but approachable,
illustrated style, flat design, warm skin tones, subtle smile,
wearing casual business attire, solid color background #F5F5F5,
consistent with modern SaaS product design.
--no realistic photography, no complex background, no text
```

---

### Video — Template base

```
[Scene]          O que acontece — acao, transicao, movimento
[Subject]        Quem ou o que esta na cena
[Camera]         Movimento de camera — static, pan, zoom, dolly, handheld
[Style]          Estetica — cinematografico, animacao, stop motion
[Duration]       Duracao esperada — 3s, 5s, 10s
[Audio hint]     Som ambiente, musica, naracao (quando o provider suporta)
[Negative]       O que evitar
```

**Exemplo — clip de produto (text-to-video):**
```
A sleek smartphone slowly rotating on a reflective surface,
soft studio lighting with a gradient background from white to light gray,
smooth 360-degree camera orbit, product showcase style,
5 seconds, no text on screen, no hands, no shadows clipping.
```

**Exemplo — image-to-video:**
```
Starting from the provided product image,
animate a gentle zoom-in followed by a soft pan right,
particles of light floating subtly in the background,
3 seconds, smooth motion, no abrupt cuts.
```

---

## Tecnicas de controle de qualidade

### Few-shot (exemplos no prompt)

Incluir 2-3 pares de entrada/saida melhora drasticamente a aderencia ao formato esperado.

```
Entrada: "produto chegou quebrado"
Saida: {"sentimento": "negativo", "categoria": "logistica", "urgencia": "alta"}

Entrada: "adorei a embalagem, muito bonita"
Saida: {"sentimento": "positivo", "categoria": "embalagem", "urgencia": "baixa"}

Entrada: {{novo_input}}
Saida:
```

### Chain-of-thought para raciocinio complexo

Para tarefas que exigem raciocinio, pedir que o modelo "pense passo a passo" antes de responder melhora a precisao.

```
Analise o problema abaixo passo a passo antes de dar a resposta final.
Formato: raciocinio em <thinking>...</thinking>, resposta em <answer>...</answer>
```

### Controle de tamanho e custo

| Tecnica | Reducao estimada de tokens |
|---------|---------------------------|
| "Seja conciso" + limite de palavras | 20-40% |
| Remover exemplos redundantes | 10-30% |
| Usar JSON em vez de descricao em prosa | 15-25% |
| Separar system prompt do user prompt | Sem reducao, mas melhora cache |

---

## Fallback e robustez

- Sempre definir o que retornar quando o modelo falha ou retorna formato inesperado
- Validar output do modelo com schema (Zod, JSON Schema) antes de usar no app
- Para classificacao, incluir categoria `"desconhecido"` como fallback valido
- Para geracao de imagem, ter placeholder para quando o provider falha

---

## Integracao com outras skills

| Skill | Relacao com Prompt Engineer |
|-------|-----------------------------|
| `AI Integration Architect` | Architect usa os templates do Prompt Engineer nos adapters |
| `Image Generator` | Usa templates de imagem para gerar assets do kit |
| `Video Integration Specialist` | Usa templates cinematograficos para video generativo |
| `Data Analytics` | Pode medir a qualidade e aceitacao dos prompts em producao |

---

## Evidencia de conclusao

- [ ] Objetivo do prompt definido (o que deve fazer, para quem)
- [ ] Modalidade definida (texto, imagem, video)
- [ ] Contexto minimo suficiente (sem PII, sem redundancia)
- [ ] Formato de saida especificado
- [ ] Fallback considerado
- [ ] Restricoes de custo de tokens avaliadas
- [ ] Handoff entregue para AI Integration Architect ou skill consumidora
