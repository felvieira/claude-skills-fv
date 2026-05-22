---
scenario: 33-detective-spec
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 720
time_seconds: 18
quality_score: 3.3
quality_breakdown:
  specificity: 3
  completeness: 4
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: n/a
notes: "cobre as etapas principais (Xdebug, characterization tests, análise estática) mas sem template estruturado, sem deliverables nomeados, sem distinção clara entre artefatos de spec vs. artefatos de teste; scope creep leve (lista ferramentas extras não pedidas)"
---

# 33 — Detective Spec: Baseline

## Input

"Herdei um módulo de pricing em PHP 7 com 5k linhas, sem testes, sem spec, lógica espalhada por procedures, magic constants. Não posso reescrever. Como extraio a spec executável sem mexer no código?"

## Resposta (sem skill)

Para extrair uma spec executável de um módulo legado PHP 7 sem modificar o código, o processo é de engenharia reversa estruturada:

**1. Levantamento estático**

- Liste todos os `function`, `class`, `define`, variáveis globais: `grep -rn "function \|define(\|class " pricing.php`
- Mapeie as magic constants com: `grep -rn "[0-9]\{2,\}\|'[A-Z_]\{3,\}'" pricing.php`
- Identifique pontos de entrada públicos (funções chamadas de fora do módulo)

**2. Cobertura de chamadas com logs**

Sem alterar o código, instrumentalize via php.ini ou wrapper externo:

- Habilite `auto_prepend_file` com um logger que captura `call_stack` via `debug_backtrace()`
- Use Xdebug em modo de trace: `xdebug.mode=trace` — gera logs de todas as funções chamadas, argumentos e retornos em produção/staging
- Colete N sessões reais para cobrir os caminhos de preço mais usados

**3. Fuzzing de entradas**

- Identifique os parâmetros de entrada das funções públicas
- Construa um harness externo (arquivo separado) que chama as funções com inputs variados
- Registre `input → output` em CSV/JSON — cada linha é um caso de teste

**4. Triangulação de comportamento**

- Cruze os logs do Xdebug com os outputs reais do sistema
- Para cada `output observado`, pergunte: "qual regra de negócio explica isso?"
- Documente como contratos: `dado input X, espero output Y` (linguagem natural + assertion)

**5. Formalização da spec executável**

Com os pares `input→output` coletados, escreva testes caracterizadores (characterization tests) em arquivo separado:

```php
// characterization_test.php — não altera pricing.php
require_once 'pricing.php';

// Caso documentado de produção
assert(calcularPreco(100, 'CLIENTE_VIP', 'BRA') === 87.50);
assert(calcularPreco(0, 'PADRAO', 'USA') === 0.00);
// Magic constant documentada: define('DESCONTO_VIP', 0.125) → 12.5%
```

Esses testes são a spec executável — se o código mudar e eles quebrarem, você sabe que o comportamento mudou.

**6. Documentação dos contratos extraídos**

Para cada função pública, documente:
- Assinatura real (parâmetros, tipos observados)
- Pré-condições implícitas (o que o código assume como verdadeiro)
- Pós-condições (o que garante na saída)
- Efeitos colaterais (grava em DB? manda email? altera globals?)
- Casos extremos encontrados

**7. Riscos e armadilhas**

- Magic constants sem contexto: documente o nome, valor E a decisão de negócio por trás
- Procedures com efeitos colaterais ocultos (UPDATE em banco dentro de função de cálculo)
- Condicionalidades por data/horário que só aparecem em logs reais
- Globals mutáveis que alteram comportamento por sessão

**Ferramentas recomendadas:**
- Xdebug 3.x (trace + profiler)
- PHPStan (análise estática, sem alterar código)
- Deptrac (mapeamento de dependências)
- GrumPHP ou PHP-CS-Fixer em modo análise (read-only)

O produto final é: um arquivo de characterization tests + um documento de contratos por função + glossário de magic constants com sua semântica de negócio.
