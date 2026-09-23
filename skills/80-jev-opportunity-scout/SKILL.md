---
name: jev-opportunity-scout
description: |
  Analisa o projeto atual em busca de decisões semânticas implementadas de forma frágil — cadeia de
  if/else com string matching, regex de classificação, palavra-chave hardcoded, ou chamada de LLM
  genérica fazendo prompt-and-parse pra extrair categoria/score/booleano — e aponta onde substituir por
  um judgment tipado do Jev (TypeSafe System One) resolveria com mais precisão e menos código de cola.
  Nunca instala nem chama a API sozinha: entrega uma lista de candidatos com localização exata, o tipo
  de primitivo que encaixa (Choice/Noul/Score), e por que o padrão atual é frágil ali. A decisão de
  integrar fica com o usuário.
  Trigger em: "onde eu poderia usar o jev", "faz sentido usar typesafe aqui", "classificação está
  frágil", "if/else de categoria", "onde usar judgment tipado", "oportunidade de ia semântica",
  "roteamento por regex está ruim", "analisa esse código pra ver onde IA ajudaria",
  "jev opportunity", "system one typesafe".
allowed-tools: Read, Grep, Glob
metadata:
  argument-hint: "[caminho-a-escanear]"
---

# Jev Opportunity Scout — Onde um Judgment Tipado Resolveria Melhor

Varre o projeto atual, encontra pontos onde uma decisão semântica (classificar, detectar, pontuar, rotear, verificar) está implementada com heurística frágil, e entrega candidatos concretos migrados pro formato real do Jev (modelo System One da TypeSafe) — com localização exata, primitivo certo (Choice/Noul/Score), chamada de exemplo pronta pra copiar, e custo real calculado. **Ser assertiva é o ponto desta skill**: não é um relatório morno de "talvez isso ajude" — é apontar o arquivo, a linha, o motivo concreto de fragilidade, e a chamada exata que resolveria, pra quem for decidir ter o material completo na mão, não um resumo vago.

O handoff pra integrar de fato é a skill 25 (AI Integration Architect) pra desenho de adapter, ou instalar `npx skills add typesafe-ai/skills --skill typesafe-ai` direto — mas o trabalho de achar e justificar os candidatos é inteiro desta skill, feito com profundidade, não terceirizado por preguiça.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/tool-safety.md`.

**Regra de escopo: análise e recomendação, não a integração final.** `allowed-tools` não inclui `Bash`/`Write`/`Edit` porque o trabalho é ler o codebase e produzir o relatório — não porque a skill deva ser tímida sobre o que encontra. Escrever o adapter, configurar credencial, ou editar o código de produção é trabalho da skill 25 ou de implementação direta, depois que os candidatos concretos desta skill já estiverem na mesa. A skill entrega munição completa, não uma sugestão frouxa.

**Regra de honestidade de custo.** Todo candidato reportado inclui o custo real por chamada, calculado a partir do preço documentado (`$0.042` por milhão de tokens de input, output gratuito — ver `references/pricing.md`), não uma estimativa vaga. Se o volume do candidato for alto (ex.: rodar em cada request de produção), calcular o custo mensal projetado e destacar isso — o ponto não é vender a integração, é dar dado suficiente pra decisão.

**Regra de não-substituição de lógica determinística.** Nunca reportar como candidato um `if/else` que já é 100% determinístico e correto (comparação numérica exata, enum fechado, regra de negócio sem ambiguidade). O alvo é especificamente decisão que hoje depende de entender linguagem natural ou julgar algo ambíguo, e está sendo feito por aproximação frágil (substring match, lista de palavras-chave, regex genérico demais).

## Quando Usar

- o usuário pergunta onde no projeto atual valeria usar IA pra decisão semântica
- existe uma função com cadeia longa de `if (texto.includes(...))` decidindo categoria, prioridade, ou roteamento
- existe uma chamada de LLM genérica (`gpt-4`, `claude`, etc.) cujo único propósito é devolver uma palavra de uma lista fechada, um score, ou um booleano — sinal de "prompt-and-parse" que poderia ser um judgment tipado direto
- o usuário quer avaliar a proposta de integrar `typesafe-ai/skills` antes de decidir usar

## Quando Nao Usar

- o usuário já decidiu que quer integrar TypeSafe e quer o código da integração — isso é skill 25 (AI Integration Architect) ou instalar `npx skills add typesafe-ai/skills --skill typesafe-ai` direto
- a decisão em questão já é determinística e correta (validação de schema, regra de negócio exata, cálculo numérico) — nada a sugerir
- o projeto já usa outro provider de classificação/scoring funcionando bem e sem dor relatada — não empurrar troca sem motivo
- pedido de geração de texto, imagem ou vídeo — Jev não gera conteúdo, só retorna decisão tipada e probabilidade (ver `references/o-que-e-jev.md`)

## Entradas Esperadas

- caminho do projeto ou diretório a escanear (padrão: diretório atual)
- opcionalmente, foco em uma área específica ("só olha o módulo de suporte", "só a camada de moderação")

## Saidas Esperadas

- lista de candidatos, cada um com: arquivo + linha, trecho do código atual, o que ele decide, por que é frágil, qual primitivo do Jev encaixa (Choice/Noul/Score), como ficaria a chamada (`instructions` + `criteria` de exemplo), e custo estimado por chamada e projetado por volume
- nenhuma mudança de arquivo — só o relatório

## Protocolo

### 1. Varredura por padrão de decisão frágil

Grep pelos sinais abaixo, cruzando com a tabela de formatos de decisão em `references/decision-shapes.md`:

| Sinal no código | O que geralmente indica |
|---|---|
| Cadeia de `if/else` ou `switch` comparando `string.includes(...)`/`.match(regex)` contra 3+ palavras-chave pra decidir uma categoria | Classificação implementada por substring — frágil a sinônimo, erro de digitação, frase que não contém a palavra-chave exata |
| Lista de palavras-chave hardcoded pra detectar sentimento, urgência, ou intenção ("urgente", "cancelar", "reembolso") | Detecção binária que deveria ser probabilística — a lista nunca cobre todas as formas de dizer a mesma coisa |
| Chamada de LLM genérico com prompt terminando em "responda apenas com: A, B ou C" ou "responda apenas true ou false" | Prompt-and-parse — pagando preço de LLM completo por uma decisão que o Jev resolve mais rápido e mais barato, com probabilidade calibrada em vez de um texto pra fazer parse |
| Função de scoring manual que soma pontos por regra (`if tem_x: score += 1`) pra decidir prioridade/severidade numa escala | Score heurístico não calibrado — cada peso foi um palpite, não uma calibração contra outcome real |
| Comentário ou nome de função como `# TODO: melhorar essa deteccao`, `classifyRoughly`, `guessCategory` | Sinal explícito de que o autor já sabe que a heurística atual é aproximada |

Usar `Grep` com os padrões acima nos arquivos do projeto (extensões de código, não `node_modules`/`vendor`/`dist`). Não escanear arquivo por arquivo sem alvo — focar em diretórios de lógica de negócio (`services/`, `handlers/`, `routes/`, `lib/`), não em teste ou config.

### 2. Para cada candidato encontrado, classificar o formato de decisão

Usar `references/decision-shapes.md` pra decidir entre os três primitivos:

- **Choice** — quando uma categoria conhecida entre um conjunto fechado deveria "ganhar" (roteamento pra time, classificação de intenção, seleção de handler)
- **Noul** — quando a pergunta é "essa condição está presente?" com resposta sim/não probabilística (é spam? é pedido de reembolso? é conteúdo tóxico?)
- **Score** — quando a resposta é um grau numa régua ordenada (severidade, frustração do cliente, qualidade, relevância)

Se o candidato precisar de mais de um primitivo (ex.: primeiro decidir SE é reembolso via Noul, depois QUAL time via Choice), reportar como um único candidato com as duas perguntas — a doc do Jev recomenda perguntas independentes na mesma chamada em vez de chamadas separadas em sequência (ver `references/decision-shapes.md`).

### 3. Montar o exemplo de chamada equivalente

Para cada candidato, escrever o par `instructions`/`criteria` (ou `instructions` sozinho pra Noul/Score) que substituiria a heurística atual — no formato real da API, não pseudocódigo:

```python
questions={
    "<nome_da_decisao>": Choice(  # ou Noul, ou Score
        instructions="<a pergunta que a heuristica atual tenta responder>",
        criteria={
            "<opcao_1>": "<descricao que distingue essa opcao das outras>",
            "<opcao_2>": "<descricao>",
        },
    ),
}
```

Nunca inventar campo que não existe na API real — `type`, `instructions`, `criteria` são os campos documentados (ver `references/pricing.md` e `references/decision-shapes.md` para o request/response completo).

### 4. Calcular custo honesto

Estimar tokens de input pelo tamanho típico do texto que passaria por `state` no candidato (ex.: tamanho médio de um ticket de suporte). Multiplicar por `$0.042 / 1.000.000` tokens. Se o usuário mencionou volume (ex.: "isso roda em todo request", "temos 10 mil tickets/mês"), projetar o custo mensal e reportar ao lado do candidato — não deixar o número escondido só em "barato".

### 5. Relatório final

```markdown
# Oportunidades Jev — <projeto>

## Candidato 1: <nome da decisão>
**Onde:** `caminho/arquivo.ts:42`
**Hoje:** <trecho resumido do código atual>
**Por que é frágil:** <razão concreta>
**Primitivo sugerido:** Choice | Noul | Score
**Chamada equivalente:**
\`\`\`python
<exemplo real>
\`\`\`
**Custo estimado:** ~$X por 1000 chamadas (input ~N tokens) | projeção mensal se volume informado

## Candidato 2: ...

## Nenhum candidato encontrado em: <áreas escaneadas sem sinal>

## Próximo passo
Se algum candidato valer a pena: `npx skills add typesafe-ai/skills --skill typesafe-ai` instala a skill oficial de integração, ou a skill 25 (AI Integration Architect) desenha o adapter/fallback/observabilidade em volta da chamada.
```

## Prova de Conceito Real (não é só teoria)

`browser-use/jev-ultrafast` é evidência real de onde essa troca vale: um agente de navegador que usava LLM completo pra decidir cada clique, migrado pra usar o Jev nessa decisão específica, saiu de ~9.4s pra ~7.1s numa tarefa medida (25% mais rápido), com custo por decisão na faixa de centésimos de centavo. Se esse projeto estiver instalado no ambiente (`D:\Repos\GERAL\jev-ultrafast`, ver `references/jev-ultrafast-local.md`), citar como referência concreta ao apresentar candidatos de roteamento/classificação — não é hipotético, já roda.

## Anti-Padroes

- reportar candidato onde a lógica atual já é 100% determinística e correta — não é decisão semântica, é regra de negócio
- inventar campo de API que não existe na documentação real
- esconder o custo ou apresentar só "é barato" sem o número
- sugerir troca de um provider de IA que já funciona sem dor relatada, só porque existe uma alternativa
- instalar, configurar, ou chamar a API TypeSafe — essa skill só reporta

## Evidencia de Conclusao

- relatório entregue com candidatos reais (arquivo + linha) ou confirmação explícita de que nenhum foi encontrado
- cada candidato tem primitivo sugerido, exemplo de chamada no formato real da API, e custo calculado
- nenhum arquivo do projeto foi alterado

## Handoff

### Recebe de

- Usuário perguntando diretamente onde IA semântica ajudaria no projeto
- Skill 18 (repo-auditor), quando a auditoria geral do repo sinalizar lógica de classificação frágil como risco

### Entrega para

- **Skill 25 (AI Integration Architect)** — desenha o adapter, fallback e observabilidade em volta da chamada, se o usuário decidir integrar
- **`npx skills add typesafe-ai/skills --skill typesafe-ai`** — instala a skill oficial da TypeSafe com a documentação viva e SDKs, pra quem for escrever a integração de fato

Seguir `policies/handoffs.md`.

## Integracao com Pipeline

- **Orchestrator (09):** roteia para cá quando o pedido é "onde poderia usar IA nesse código" antes de qualquer decisão de integrar um provider específico
- **Repo Auditor (18):** complementar — a 18 mapeia stack e risco geral; esta skill foca especificamente em decisão semântica frágil

## Fontes

Mecanismo (heurísticas de detecção de decisão frágil, formato de relatório) escrito para este kit — não existe upstream equivalente. Conhecimento de domínio sobre os primitivos Jev (Choice/Noul/Score), formato de request/response, e preço vêm da documentação oficial em [docs.typesafe.ai](https://docs.typesafe.ai) e do repositório [typesafe-ai/skills](https://github.com/typesafe-ai/skills) (MIT) — resumidos em `references/` desta skill, não copiados verbatim. A skill oficial deles é o caminho de instalação real quando o usuário decide integrar; esta skill é a camada de decisão que antecede aquela instalação.
