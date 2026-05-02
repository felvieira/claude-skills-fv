# Writing Clarity Policy

## Objetivo

Manter prosa do kit (commits, error messages, docs, handoffs, slash command outputs, spec writeups) clara, breve e direta. Inspirado nas regras atemporais de **Strunk & White — Elements of Style**, adaptadas para output de agentes.

Aplica-se a TODA skill que produz texto humano legivel.

## Quando Aplicar

- mensagens de commit
- mensagens de erro que o usuario le
- handoffs entre skills
- output final de slash commands
- documentacao gerada (`docs/`, READMEs, ADRs)
- comentarios em codigo (quando justificados)
- specs e relatorios

## Quando Nao Aplicar

- chat conversacional informal com o usuario
- prompts internos de modelo (foco: precisao, nao estilo)
- nomes de variavel, funcao ou arquivo
- output estruturado (JSON, YAML) — outras regras

## Regras Fundamentais (Strunk Adaptado)

### 1. Omita palavras desnecessarias

> "Vigorous writing is concise." — Strunk

**Ruim:**
> Devido ao fato de que o teste falhou, o sistema decidiu nao prosseguir com o deploy.

**Bom:**
> Teste falhou. Deploy abortado.

Cada palavra deve ganhar seu lugar. Se a frase fica clara sem ela, corte.

### 2. Use voz ativa

**Ruim:** "O arquivo foi processado pelo sistema."
**Bom:** "Sistema processou o arquivo."

Voz ativa e mais curta, mais direta, mais facil de debugar.

### 3. Afirmativo sobre negativo

**Ruim:** "Nao deixe de validar o input."
**Bom:** "Valide o input."

**Ruim:** "Nao foi possivel encontrar o arquivo."
**Bom:** "Arquivo nao encontrado."

### 4. Linguagem definitiva

**Ruim:** "O codigo aparentemente meio que pode estar quebrado."
**Bom:** "Codigo quebrado." (ou: "Codigo provavelmente quebrado, evidence: file:42.")

Hedging ("aparentemente", "talvez", "meio que") sem evidencia mascara incerteza com palavreado.

### 5. Concreto sobre abstrato

**Ruim:** "Houve uma melhoria significativa de performance."
**Bom:** "Latencia caiu de 800ms para 120ms."

Se nao tem numero ou referencia concreta, talvez nao tenha o que dizer.

### 6. Paragrafos curtos

Maximo 4 linhas por paragrafo em prosa tecnica. Lista bullet quando ha 3+ items.

### 7. Sem palavras-tampao

Banidas (na maioria dos contextos):
- "basicamente", "essencialmente", "literalmente"
- "muito", "realmente", "bastante"
- "tipo", "meio que", "uma especie de"
- "como pode ser visto", "vale ressaltar que"
- "no final do dia", "ao fim e ao cabo"
- "obviamente", "claramente" (se for, nao precisa dizer)

### 8. Termos tecnicos em ingles ficam em ingles

Nao traduzir: `commit`, `branch`, `merge`, `rebase`, `pull request`, `PR`, `issue`, `endpoint`, `payload`, `request`, `response`, `cache`, `queue`, `deploy`, `rollback`, `feature flag`, `bug`, `fix`.

Traduzir: `arquivo`, `pasta`, `usuario`, `senha` (palavras de uso geral).

### 9. Numeros em algarismos quando >1

**Ruim:** "trinta e dois testes passaram"
**Bom:** "32 testes passaram"

Excecao: comeco de frase ("Trinta e dois testes...") — refrasear: "Passaram 32 testes."

### 10. Pontuacao simples

- ponto final em frases curtas
- virgula apenas quando necessaria pra desambiguidade
- evitar ponto-e-virgula (use ponto final ou bullet)
- nao usar reticencias decorativas
- emoji apenas em contextos onde ja sao convencao (changelog labels, slash command icons)

## Heuristicas para Agentes

### Antes de finalizar qualquer output em prosa

1. **Conte palavras.** Se passar de 200 sem heading, considere bullet list.
2. **Procure jargao vazio.** "Sinergia", "ecossistema", "robusto", "escalavel" — substitua por o que faz.
3. **Retire um adjetivo.** A frase ainda funciona?
4. **Retire um adverbio.** A frase ainda funciona? (Geralmente sim.)
5. **Leia em voz alta** (mentalmente). Tropecou? Refraseie.

### Padroes de saida do kit

**Handoff entre skills:** maximo 5 linhas.

```
Spec criada em docs/specs/auth.md.
12 user stories. 8 criterios de aceitacao testaveis.
2 dependencias bloqueantes: rate limiter, email service.
Proxima: UI/UX (skill 02).
```

**Mensagem de erro:** o que falhou + onde + como agir.

```
Teste falhou: src/auth.test.ts:42
Esperado: 200, recebido: 401
Provavel causa: token expirado em fixture
Acao: regenerar fixture com `npm run gen:fixtures`
```

**Commit message:**

```
type(scope): one-line summary in imperative mood

Optional body explaining WHY, not WHAT (diff already shows what).
Keep under 72 chars per line.
```

**Slash command output final:**

```
✓ {acao concluida}
{1 linha de resultado mensuravel}

Proximo: {sugestao concreta}
```

## Anti-Padroes Comuns em Output de Agente

### "LLM-style fluff"

Sintomas:
- "Otimo! Vou agora analisar..."
- "Acabei de criar o arquivo X com sucesso."
- "Espero que isso ajude!"
- "Essa abordagem oferece varias vantagens..."

Mitigacao: cortar tudo que e narrativo. Apresentar resultado, nao processo.

### "Documentacao decorativa"

Sintomas:
- README com 5 paragrafos antes de `npm install`
- secao "Sobre" inflada
- emoji em cada bullet

Mitigacao: README comeca com codigo executavel ou comando de instalacao. Texto em volta serve so para desambiguar.

### "Confianca falsa em incerteza"

Sintomas:
- "Isso definitivamente vai resolver"
- "Nao deve haver nenhum side effect"

Mitigacao: declarar confidence (high/medium/low). Sem evidencia, marcar como hipotese.

## Integracao com Outras Policies

- **`source-driven.md`** — toda afirmacao precisa de evidencia. Esta policy e sobre **como** apresentar.
- **`token-efficiency.md`** — economiza tokens. Clareza tambem economiza (palavra cortada = token cortado).
- **`handoffs.md`** — define o que entregar. Esta policy define o estilo da entrega.

## Evidencia de Conformidade

Output produzido por skill que segue esta policy deve resistir aos 5 testes:

1. **Conta palavras** — abaixo do esperado para o tipo (commit <72/linha; handoff <5 linhas; error msg <4 linhas)
2. **Voz ativa** — predominante (>80%)
3. **Sem palavras-tampao** das listadas
4. **Numero/referencia concreta** quando faz afirmacao quantitativa
5. **Confidence declarada** quando faz inferencia

## Referencia

Strunk, W. & White, E.B. — *The Elements of Style*. 4th ed.

Nao precisa ler o livro inteiro. As 10 regras acima cobrem 90% do que importa para output de agente.
