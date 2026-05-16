---
description: Gera checklist contextual ("unit tests for English") para uma spec — valida completeness, clarity, consistency, coverage e edge cases por feature
---

# /checklist — Unit Tests for English

**Objetivo:** gerar **checklist específica por feature** que valida a qualidade dos *requisitos*, não da implementação. Pense em "unit tests para a spec escrita em inglês/português".

Complementa `policies/prd-validation.md` (que tem 13 checks fixos). Aqui são checks **derivados da própria spec** — específicos para o domínio dela.

Inspirado em [github/spec-kit](https://github.com/github/spec-kit) — `/speckit.checklist`.

## Conceito-chave

**É:**
- ✅ "Os requisitos de hierarquia visual estão definidos para todos os tipos de card?" (completeness)
- ✅ "'Display proeminente' está quantificado com tamanho/posição específicos?" (clarity)
- ✅ "Estado de hover está consistente entre todos os elementos interativos?" (consistency)
- ✅ "Requisitos de acessibilidade estão definidos para navegação por teclado?" (coverage)
- ✅ "A spec define o que acontece quando a imagem do logo falha?" (edge cases)

**NÃO é:**
- ❌ "Verificar se o botão clica corretamente" (isso é teste de implementação)
- ❌ "Testar tratamento de erro funciona"
- ❌ "Confirmar API retorna 200"

Se a spec é "código escrito em inglês", esta checklist é a **suíte de testes unitários dela**.

## Quando usar

- depois de `/spec` ou `/to-prd`, antes de `/plan`
- depois de `/grill-me` para auditar se a discovery cobriu tudo
- antes de `/analyze` (que cruza artefatos) — `/checklist` é por-feature, `/analyze` é cross-artifact
- ao revisar PR que muda uma spec existente

## Quando NÃO usar

- spec ainda vaga → rode `/grill-me` antes
- bug fix isolado (sem spec formal)
- iteração mecânica (rename, format)

## Processo

### 1. Ler spec alvo

Detectar:
```bash
# preferência: argumento explícito
SPEC="${1:-}"

# fallback: spec mais recente em docs/specs/
[ -z "$SPEC" ] && SPEC=$(ls -t docs/specs/*.md 2>/dev/null | head -1)

# fallback 2: PRD do Taskmaster
[ -z "$SPEC" ] && [ -f ".taskmaster/docs/prd.md" ] && SPEC=".taskmaster/docs/prd.md"

[ -z "$SPEC" ] && { echo "ERRO: nenhuma spec encontrada"; exit 2; }
```

### 2. Extrair domínio

Identificar áreas-chave da spec para gerar checks contextuais (não genéricos):

- **Funcionalidade principal** — extraído de User Stories
- **UI/UX presentes?** — buscar termos "card", "modal", "form", "navigation", "list"
- **Backend/API?** — buscar "endpoint", "schema", "auth", "rate limit", "webhook"
- **Dados sensíveis?** — buscar "user", "PII", "payment", "credentials"
- **Integrações externas?** — buscar nomes de serviços, "API", "OAuth"
- **Performance crítica?** — buscar "fast", "real-time", "p95", "throughput"

### 3. Gerar 5 categorias de checks

Cada categoria tem **3-8 checks** específicos para o domínio extraído.

#### Completeness (todos os casos cobertos?)
Para CADA aspecto da feature, pergunta-se: está completamente especificado?
- "Todos os estados de [entidade] estão definidos? (criado, editado, deletado, arquivado)"
- "Requisitos de [aspecto] cobrem [todos os tipos identificados]?"

#### Clarity (sem ambiguidade?)
Identificar termos vagos NA spec específica:
- "'[termo da spec]' está quantificado com critério numérico?"
- "'[ação da spec]' especifica timing exato (síncrono / async / debounce)?"

#### Consistency (mesmo conceito, mesmo nome?)
- "Termo X aparece também como Y em outras seções — qual é canônico?"
- "Estado de hover/loading/error é descrito da mesma forma para todos os componentes?"

#### Coverage (não falta dimensão importante?)
- "Acessibilidade (WCAG nível X da constituição) cobre [áreas detectadas]?"
- "i18n cobre [locales da constituição]?"
- "Performance budgets aplicam a este componente?"
- "Telemetria/observabilidade está especificada?"

#### Edge Cases (failure modes mapeados?)
- "O que acontece quando [recurso externo da spec] está indisponível?"
- "Comportamento com input vazio / máximo / inválido para [campo]?"
- "Race conditions consideradas para [operação concorrente]?"
- "Rollback definido se [migração / deploy] falhar?"

### 4. Cruzar com constituição (se existe)

Ler `memory/constitution.md` e gerar checks adicionais por eixo:
- "Requisito X respeita princípio Y.Z da constituição?"
- "Coverage de testes para este módulo atinge o mínimo da constituição (N%)?"

### 5. Output estruturado

```markdown
# /checklist — <feature> — <data>

**Spec analisada:** `<path>`
**Constituição cruzada:** `memory/constitution.md` (versão X.Y.Z) | N/A

## Como usar
Marcar cada check ANTES de `/plan`. Cada `[ ]` não-marcado = ambiguidade que vai gerar retrabalho.

## Completeness (N checks)
- [ ] check 1
- [ ] check 2
...

## Clarity (N checks)
- [ ] ...

## Consistency (N checks)
- [ ] ...

## Coverage (N checks)
- [ ] ...

## Edge Cases (N checks)
- [ ] ...

## Constituição (N checks — se aplicável)
- [ ] ...

## Próximos passos
- Resolver checks não marcados editando a spec
- Re-rodar `/checklist` para validar
- Quando 100%: seguir para `/plan` ou `/to-issues`
```

### 6. Salvar

```bash
mkdir -p docs/checklists
SLUG=$(basename "$SPEC" .md)
OUT="docs/checklists/$(date +%Y-%m-%d)-${SLUG}.md"
# escrever
echo "Checklist salva em $OUT"
```

**Não commitar automaticamente.**

## Inputs

- `[spec_path]` (opcional) — path da spec alvo. Sem argumento, pega a mais recente.
- `--depth=quick|standard|thorough` (default `standard`) — controla quantos checks por categoria
- `--no-constitution` — pula checks da constituição

## Output esperado

- Arquivo `docs/checklists/YYYY-MM-DD-<slug>.md`
- Resumo no console: contagem por categoria, total de checks gerados
- Lembrete: "marcar checks antes de `/plan`"

## Anti-padrões a evitar na geração

- **Checks genéricos** ("requisitos estão claros?") — nada de boilerplate. Cada check menciona ALGO concreto da spec.
- **Checks de implementação** ("a função X retorna Y?") — viola o conceito. Refazer mirando o *requisito*.
- **Checks redundantes com `prd-validation.md`** (13 checks fixos) — `/checklist` é contextual, não duplica fixed checks.
- **Mais de 30 checks total** — sinal que está gerando ruído. Cortar pra essenciais.

## Policies relevantes

- [`policies/prd-validation.md`](../../policies/prd-validation.md) — 13 checks fixos (complementar)
- [`policies/constitution.md`](../../policies/constitution.md) — princípios que entram nos checks de Coverage
- [`policies/writing-clarity.md`](../../policies/writing-clarity.md) — guia de clareza pros checks de Clarity

## Handoff

- todos os checks marcados → `/plan` ou `/to-issues`
- vários não marcados → editar spec, re-rodar
- detectou problema cross-artifact → rodar `/analyze`

## Inspiração

[github/spec-kit](https://github.com/github/spec-kit) — `/speckit.checklist` com o conceito "unit tests for English" criado por Den Delimarsky.

**Uso:** `/checklist [spec_path] [--depth=...] [--no-constitution]`
