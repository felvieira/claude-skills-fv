# Deliberate Simplification Policy

**Status:** active
**Applies to:** all skills and subagents that write code

---

## O Problema

Toda simplificação deliberada — "não vale a pena resolver isso agora", "cobertura mínima suficiente pra este caso", "hardcoded porque só existe 1 caso hoje" — nasce com um teto implícito na cabeça de quem escreveu. Sem registro, esse teto vive só na memória de quem decidiu, e a decisão vira permanente por padrão: ninguém mais sabe que era temporária, e "depois" nunca chega porque nada aponta de volta pra ela.

---

## A Convenção

Toda simplificação deliberada leva um comentário de uma linha no formato:

```
// simplify: <teto que dispara revisão>, <caminho de upgrade>
```

Exemplos:

```typescript
// simplify: até 3 tenants, depois precisa de índice composto
const tenant = tenants.find(t => t.id === tenantId);
```

```python
# simplify: assume timezone UTC, revisar se cliente pedir suporte multi-fuso
timestamp = datetime.utcnow()
```

```typescript
// simplify: hardcoded pra 1 provider, extrair strategy se adicionar o 2o
const price = PROVIDER_PRICE_TABLE.stripe;
```

**Regras do formato:**
- o teto precisa ser **verificável**, não vago — "até 3 tenants" é verificável (basta contar), "quando ficar grande" não é
- o caminho de upgrade é a direção, não a implementação completa — uma frase, não um design doc
- comentário sem os dois componentes (teto + caminho) não conta como registrado — é só um TODO genérico, que já é coberto (e banido) por `policies/anti-ai-writing.md` e pelo checklist da skill 11

## O que NÃO precisa desta convenção

Não marcar como `simplify:` uma decisão que não tem teto — se a simplificação é permanente por design (não por falta de tempo), ela não é dívida, é arquitetura. O teste: "existe uma condição futura que tornaria isso errado?" Se não existe, não é `simplify:`, é decisão final — não comentar como se fosse provisória.

## Harvester (ledger de simplificações)

Antes de um release, ou quando `/consolidate-memory` ou a skill 18 (repo-auditor) rodar, varrer o repo por comentários `simplify:` e gerar um ledger:

```bash
grep -rn "simplify:" --include="*.ts" --include="*.tsx" --include="*.py" --include="*.go" . 2>/dev/null
```

Para cada ocorrência, checar se o teto declarado já foi cruzado (ex.: "até 3 tenants" — checar se já são 4+). Um teto cruzado sem revisão vira item de dívida técnica ativa, não hipotética — reportar na seção de dívida da skill 18 (`## Parece problema, mas está correto` é o lugar errado pra isso: um teto cruzado *é* problema real, não decisão correta).

Simplificação sem o formato `<teto>, <caminho>` completo — só `// simplify` solto, ou um `// TODO` disfarçado de `simplify` — marcar como `no-trigger`: não tem como o harvester saber quando revisar, então vira achado próprio ("simplificação sem gatilho de revisão declarado") em vez de entrar no ledger como item rastreável.

## Onde isso se conecta

- **Skill 11 (reviewer):** um PR que introduz `simplify:` sem os dois componentes do formato é motivo de correção antes de aprovar, não de rejeição total — é o tipo de achado que se resolve pedindo pra completar o comentário
- **Skill 18 (repo-auditor):** consumidor do ledger — tetos cruzados entram na auditoria de dívida técnica como achado verificável (arquivo + linha + teto declarado + estado atual)
- **Skill 23 (migration-refactor-specialist):** ponto de entrada natural quando o harvester aponta um teto cruzado que exige refatoração real

---

## Fonte

Convenção inspirada no mecanismo `ponytail-debt` de [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) — reimplementada com redação própria e integrada ao vocabulário deste kit (`simplify:` em vez do prefixo original, harvester conectado às skills 11/18/23 em vez de standalone). A persona "dev preguiçoso" do restante daquele projeto (escada de 7 degraus antes de escrever qualquer código) não foi adotada — ela conflita com a diretriz deste kit de propor correção estrutural sempre que a arquitetura pedir, em vez de minimizar mudança por padrão.
