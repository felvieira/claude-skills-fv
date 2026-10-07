# MODELOS — famílias de estilo para nomear como referência

Sem referência o modelo cai no padrão (texto centralizado, gradiente, tudo em fade). **Nomear um estilo vale mais do que descrevê-lo** (ver `BRIEF.md`).
Esta lista organiza as famílias de estilo que aparecem em galerias públicas de motion feito com Claude e no artigo-fonte desta skill, para você escolher uma e
pedi-la pelo nome, junto de uma técnica e de restrições.

> **Fonte e limite.** A galeria [prompt-motion.com](https://prompt-motion.com/) reúne centenas de vídeos de motion feitos com Claude, cada um com o prompt ou a skill do
> criador (filtro "Prompt" / "Skill"; curadoria de @p4nthera_). **Verificado por mim** em 2026-10-07: a existência e a estrutura da galeria (~250 entradas, a grande maioria
> "Prompt" e poucas "Skill", cada uma atribuída ao criador no X). **Não verificado entrada a entrada**: as famílias 3D (Three.js/Blender), HTML/SVG/CSS, risografia,
> osciloscópio, pixel art e Manim vêm de um resumo automático da página; o restante vem do artigo do Movez e do nosso exemplo. Trate a tabela como sugestão de vocabulário,
> não como inventário da galeria. **Os prompts e vídeos pertencem aos criadores**: use a galeria como inspiração e para estudar a estrutura, **não copie** prompt nem peça de
> ninguém; cite o criador se adaptar uma ideia. Esta tabela é nossa e não reproduz nenhum prompt.

## Famílias

| Família | Como pedir (nome + técnica + restrição) | Observações |
|---|---|---|
| **UI morph em loop** | "uma forma só que vira botão → loader → cartão, cursor dispara cada mudança, último quadro = primeiro" | Exemplo desta skill (`assets/example`). Spec de estados em `BRIEF.md`. |
| **Lançamento de produto / launch reel** | "vídeo de lançamento de 20 s para [URL], use screenshot/logo reais, música obrigatória" | Uma sessão por marca; vertical e horizontal pelo `layout()`. |
| **Showreel** | "showreel de 15 s, uma técnica nova por plano, melhor trabalho primeiro" | Testa o motor; é o gênero mais repetido, varie a referência. |
| **Tipografia cinética** | "tipografia cinética ritmada em 120 BPM, cortes na batida, texto nunca sobreposto" | `snapToBeat` + molas `type` (sem sobrepasso em texto). |
| **3D (Three.js / Blender)** | "cena 3D em Three.js, câmera dolly lenta, iluminação de 3 pontos, renderizada por `seek(t)`" | Mantenha determinismo: sem `Math.random()` sem semente, sem relógio. |
| **HTML / SVG / CSS** | "animação em SVG puro, formas geométricas, paleta de 5 cores" | Rota A (zero dependência). Skill 85 para os ícones/formas. |
| **Gráficos e explicações (estilo Manim)** | "explicação animada de [conceito] com equações e gráficos, passo a passo" | Escreva a lista de estados antes; quadro parado a cada passo na crítica. |
| **Risografia / impressão** | "textura de risografia: duas tintas, desalinhamento de registro, grão de papel" | Defina as cores e o desalinhamento em números, não adjetivos. |
| **Osciloscópio / vetor CRT** | "linhas de fósforo verde de osciloscópio, rastro com decaimento, ruído de varredura" | Decaimento como função de `t` (nada de acúmulo de quadros). |
| **Pixel art / retrô (ex.: PC-98)** | "pixel art 16 cores, dithering ordenado, resolução interna 320×200 escalada" | Renderize baixo e escale com `image-rendering: pixelated`. |
| **Aquarela / papel** | "aquarela com bordas que sangram, papel texturizado" | Curto e iterativo: muitas rodadas de crítica. |
| **Mascote / personagem** | "mascote [descrição] com bíblia de personagem, expressões e voz" | Voz e vídeo gerado: skill 84 e custo aprovado antes. |
| **Clipe musical (gerar e traçar)** | "base gerada por modelo de vídeo e redesenhada em código por cima" | Brief de diretor completo em `BRIEF.md`; skill 84 para a base. |

## Como usar uma entrada da galeria sem copiá-la

1. Abra a entrada, assista e leia o prompt/skill do criador **só para entender a estrutura** (o que ele especifica: técnica, duração, restrições, referência).
2. Escreva o **seu** brief com a mesma estrutura e o **seu** conteúdo (marca, texto, paleta).
3. Troque a referência por um quadro seu (`BRIEF.md`, "Referência") e peça a família pelo nome.
4. Rode o laço de crítica (`CRITIQUE.md`): é ele que separa um clipe bom de um parecido com todos os outros.
