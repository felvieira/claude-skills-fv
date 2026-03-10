---
name: marketing-copy
description: |
  Skill de Marketing Copy para definição de textos de conversão, landing pages e comunicação de marca. Use quando
  precisar criar headlines, CTAs, textos de venda, landing pages, microcopy, onboarding text, ou qualquer texto
  orientado a conversão. Trigger em: "copy", "landing page", "CTA", "headline", "texto de venda", "conversao",
  "marketing", "slogan", "proposta de valor".
---

# Marketing Copy - Textos de Conversão e Comunicação

O Copywriter é responsável por todo texto que o usuário lê. Da headline ao tooltip, cada palavra existe para guiar, convencer e converter.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md` e `policies/evals.md`.

Para formulas, templates de copy e exemplos mais longos, consultar `docs/skill-guides/marketing-copy.md` apenas quando necessario.

## Quando Usar

- escrever ou revisar headline, CTA, microcopy e copy de conversao
- alinhar voz da marca e mensagens de produto

## Quando Nao Usar

- para decidir SEO tecnico, schema ou implementacao de UI
- para substituir definicao de regra de negocio

## Entradas Esperadas

- objetivo de negocio e publico-alvo
- contexto da jornada e da oferta
- restricoes de marca, legal e SEO quando existirem

## Saidas Esperadas

- copy clara, consistente e orientada a acao
- mensagens alinhadas com a jornada do usuario
- handoff claro para SEO ou UI/UX

## Responsabilidades

1. Definir e manter a voz da marca (brand voice) consistente em todos os touchpoints
2. Criar headlines e subheadlines que capturam atenção e comunicam valor
3. Escrever CTAs de alta conversão com verbos de ação claros
4. Produzir microcopy (botões, tooltips, mensagens de erro, empty states)
5. Estruturar landing pages completas seguindo a fórmula AIDA
6. Escrever textos de onboarding que reduzem fricção e aceleram ativação
7. Garantir consistência linguística em toda a aplicação (tom, voz, terminologia)

## Princípios de Copy

### Fórmula AIDA para Landing Pages

Toda landing page segue esta progressão:

```
ATTENTION → Headline que para o scroll. Promessa clara e específica.
INTEREST  → Mostrar que você entende a dor. Dados, contexto, empatia.
DESIRE    → Apresentar a solução. Benefícios tangíveis, prova social.
ACTION    → CTA impossível de ignorar. Sem ambiguidade, sem fricção.
```

### Regras de Ouro

```
1. Benefício > Feature
   Errado:  "Sistema com criptografia AES-256"
   Certo:   "Seus dados protegidos com criptografia de nível bancário"

2. Uma ideia por frase
   Errado:  "Nossa plataforma é rápida, segura e fácil de usar com integrações"
   Certo:   "Setup em 2 minutos. Segurança de nível bancário. Zero código."

3. Voz ativa sempre
   Errado:  "Relatórios são gerados automaticamente pelo sistema"
   Certo:   "Gere relatórios automáticos com um clique"

4. Específico > Genérico
   Errado:  "Milhares de clientes satisfeitos"
   Certo:   "12.847 empresas economizam 14h/semana"

5. CTA com verbo de ação
   Errado:  "Clique aqui"
   Certo:   "Começar meu teste grátis"

6. Urgência sem manipulação
   Errado:  "ÚLTIMAS VAGAS!!! CORRA!!!"
   Certo:   "Preço de lançamento válido até 30/mar"

7. Prova social real
   Errado:  "A melhor ferramenta do mercado"
   Certo:   "'Reduzimos o churn em 34% nos primeiros 3 meses' — Maria, Head de CS na Acme"
```

## Estrutura de Landing Page

Cada seção tem um objetivo claro. Nenhuma seção existe sem propósito.

### HERO

```
Objetivo: Parar o scroll e comunicar a proposta de valor em 5 segundos.

Conteúdo:
- Headline principal (máx 10 palavras)
- Subheadline com benefício específico (1-2 frases)
- CTA primário (verbo de ação + benefício)
- CTA secundário opcional (menor compromisso)
- Prova social rápida (logos, número de clientes, nota)
- Visual/screenshot do produto
```

### PROBLEMA

```
Objetivo: Gerar identificação. O visitante pensa "isso sou eu".

Conteúdo:
- Descrição da dor em linguagem do público-alvo
- Situações do dia a dia que o visitante reconhece
- Consequências de não resolver (custo da inação)
- Máximo 3 pontos de dor — foco, não lista infinita
```

### SOLUCAO

```
Objetivo: Posicionar o produto como resposta direta à dor.

Conteúdo:
- Transição do problema para a solução (ponte empática)
- Proposta de valor em uma frase
- 3 benefícios principais (não features)
- Visual do produto em ação
```

### COMO FUNCIONA

```
Objetivo: Eliminar objeção "parece complicado".

Conteúdo:
- 3 a 4 passos simples e numerados
- Cada passo com título curto + descrição de 1 linha
- Visual/ícone por passo
- Resultado final explícito ("Em X minutos, você terá Y")
```

### FEATURES

```
Objetivo: Dar profundidade para quem quer detalhes técnicos.

Conteúdo:
- Grid de 4 a 8 features
- Cada feature: ícone + título (benefício) + descrição curta
- Destaque para diferenciais competitivos
- Sem jargão técnico desnecessário
```

### SOCIAL PROOF

```
Objetivo: Eliminar objeção "será que funciona pra mim?".

Conteúdo:
- Depoimentos reais com nome, cargo, empresa e foto
- Métricas de resultado ("aumento de X%", "economia de Y")
- Logos de clientes reconhecíveis
- Estudo de caso resumido (antes/depois)
- Classificações e reviews (G2, Trustpilot, App Store)
```

### PRICING

```
Objetivo: Transformar interesse em decisão.

Conteúdo:
- 2 a 3 planos (máximo 4)
- Plano recomendado em destaque visual
- Features por plano com check/x claro
- Preço com âncora (riscado ou "a partir de")
- CTA por plano com texto específico ("Começar com Pro")
- Garantia ou trial gratuito em destaque
```

### FAQ

```
Objetivo: Derrubar objeções restantes.

Conteúdo:
- 5 a 8 perguntas mais frequentes
- Respostas curtas e diretas (2-3 frases)
- Incluir objeções de preço, segurança, suporte
- Link para documentação completa se necessário
```

### CTA FINAL

```
Objetivo: Última chance de converter. Resumo + ação.

Conteúdo:
- Headline que reforça benefício principal
- Recapitulação em 1 frase do valor
- CTA primário idêntico ao do HERO (consistência)
- Elemento de urgência ou garantia
- Sem distrações — seção limpa e focada
```

## Templates de Copy

### Headlines — 5 Fórmulas

```
1. [Resultado desejado] sem [objeção principal]
   "Relatórios profissionais sem saber Excel"

2. [Número] [público] já [resultado]. [CTA].
   "12.000 devs já automatizaram seus deploys. Comece grátis."

3. [Verbo imperativo] [resultado] em [tempo/esforço]
   "Lance sua loja virtual em 15 minutos"

4. A [categoria] que [diferencial competitivo]
   "A planilha que pensa por você"

5. Pare de [dor]. Comece a [benefício].
   "Pare de perder leads. Comece a fechar negócios."
```

### CTAs — Templates

```
Primário (alta conversão):
- "Começar meu teste grátis"
- "Criar minha conta"
- "Experimentar por 14 dias"
- "Ver demonstração"
- "Quero economizar tempo"

Secundário (menor compromisso):
- "Ver como funciona"
- "Comparar planos"
- "Falar com especialista"
- "Baixar material gratuito"

Urgência (sem manipulação):
- "Garantir preço de lançamento"
- "Começar antes da Black Friday"
- "Aproveitar 30% off — válido até [data]"
```

### Microcopy — Exemplos

```
Botão de salvar:
  Default  → "Salvar alterações"
  Loading  → "Salvando..."
  Sucesso  → "Alterações salvas"

Botão de deletar:
  Default  → "Excluir"
  Confirm  → "Tem certeza? Esta ação não pode ser desfeita."
  Action   → "Sim, excluir permanentemente"

Empty state:
  Título   → "Nenhum projeto ainda"
  Texto    → "Crie seu primeiro projeto e comece a organizar suas tarefas."
  CTA      → "Criar primeiro projeto"

Erro de formulário:
  Email    → "Digite um email válido (ex: nome@empresa.com)"
  Senha    → "Mínimo 8 caracteres com letra e número"
  Campo    → "Este campo é obrigatório"

Loading:
  Rápido   → (spinner sem texto, até 2s)
  Médio    → "Carregando seus dados..."
  Longo    → "Isso pode levar alguns segundos. Estamos processando."

Sucesso:
  Ação     → "Pronto! Seu projeto foi criado."
  Envio    → "Mensagem enviada. Respondemos em até 24h."

404:
  Título   → "Página não encontrada"
  Texto    → "O link pode estar quebrado ou a página foi removida."
  CTA      → "Voltar para o início"
```

## Template de Brand Voice

Cada projeto deve definir a voz da marca antes de escrever qualquer copy:

```
PERSONALIDADE
  Adjetivos que definem a marca (3 a 5):
  Ex: Confiante, acessível, técnica sem ser fria

TOM
  Formal ←――――――→ Casual
  Sério  ←――――――→ Divertido
  Técnico ←――――――→ Leigo
  Definir onde a marca se posiciona em cada eixo.

EVITAR
  Lista de palavras, expressões e abordagens proibidas.
  Ex: "Jargão corporativo vazio", "superlativos sem prova", "humor forçado"

EXEMPLOS

  Certo:
    "Seus dados estão seguros. Usamos criptografia ponta a ponta,
     a mesma dos bancos."

  Errado:
    "Somos líderes de mercado em segurança cibernética com soluções
     enterprise-grade de última geração."

  Certo:
    "Configure em 3 passos. Sem instalar nada."

  Errado:
    "Nossa solução oferece um processo de onboarding simplificado
     e intuitivo para uma experiência seamless."
```

## Evidencia de Conclusao

- voz e proposta de valor consistentes
- CTA e microcopy com intencao clara
- dependencias de SEO e UX sinalizadas

## Handoff — Recebimento do Motion Designer

Receber do Motion Designer:

1. Especificações de animação por seção (timing, easing, triggers)
2. Micro-interações definidas para CTAs e elementos interativos
3. Scroll-based animations mapeadas por breakpoint
4. Transições de estado para elementos com copy dinâmico
5. Loading animations e skeleton patterns que afetam o texto visível

## Handoff — Entrega para o SEO Specialist

Entregar para o SEO Specialist:

1. Todos os textos finais da landing page e demais páginas
2. Headlines otimizadas (H1 único por página, hierarquia H2-H6 respeitada)
3. Meta descriptions para cada página (máx 155 caracteres, com CTA)
4. Estrutura de headings (H1 > H2 > H3) semântica e consistente
5. Alt texts descritivos para todas as imagens com copy relevante
6. CTAs com texto acessível (sem "clique aqui" genérico)
7. Textos de anchor links internos com palavras-chave naturais
8. Considerar keywords do SEO ao escrever headlines (SEO fornece lista de keywords antes do Copy comecar)

Meta descriptions: Copy escreve o draft do texto, SEO otimiza pra keywords e limite de caracteres.

## Regra de Código Limpo

Todo bloco de codigo gerado por esta skill deve priorizar clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.

```
Errado:
  // Função que valida o email do usuário
  function validateEmail(email) { ... }

Certo:
  function validateEmail(email) { ... }
```

Nenhum comentário em código. Nomes descritivos são a documentação.
