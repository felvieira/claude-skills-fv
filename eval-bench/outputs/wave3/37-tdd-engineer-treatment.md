---
scenario: 37-tdd-engineer
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2850
tokens_out_approx: 1820
time_seconds: 55
quality_score: 4.8
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 5
pass_fail: pass
delta_vs_baseline: +1.9
notes: "Fase 1 planning explícita com interface design; anti-horizontal-slicing check verbalizado antes de começar; falso-verde reconhecido e documentado (comportamentos 2, 4, 5 verdes imediatos — explicado como esperado, não bug); CNPJ matematicamente correto (11.444.777/0001-61); refactor só após todos os GREENs; evidência de conclusão com handoff para skill 11"
---

# Treatment — Skill 37 TDD Engineer

## Cenário
Implementar do zero, com TDD verdadeiro (red-green-refactor, não horizontal slicing), uma função de validação de CNPJ brasileiro: aceita string formatada ou não, valida dígitos verificadores, rejeita CNPJs conhecidos como inválidos (todos iguais). Mostra o ciclo iteração por iteração.

---

## Fase 1 — Planning

**Interface pública alvo:**

```python
# cnpj.py
def validate_cnpj(value: str) -> bool: ...
```

Argumento primitivo (string), retorno primitivo (bool). Deep module: interface mínima, comportamento rico internamente. Nenhum collaborator interno a mockar — função pura, testável sem fixtures complexas.

**Comportamentos priorizados (em ordem de tracer bullet → incremento):**

1. CNPJ válido formatado é aceito → tracer bullet
2. CNPJ válido sem formatação é aceito
3. CNPJ com todos os dígitos iguais é rejeitado (qualquer sequência: 00…, 11…, …, 99…)
4. CNPJ com comprimento errado é rejeitado
5. CNPJ com dígito verificador incorreto é rejeitado

Anti-horizontal slicing check: **não escreverei esses 5 testes agora.** Vou escrever 1, ver vermelho, fazer verde, repetir.

---

## Fase 2 — Tracer Bullet

### Iteração 1 — RED

```python
# test_cnpj.py
from cnpj import validate_cnpj

def test_cnpj_valido_formatado_e_aceito():
    # 11.444.777/0001-61 é CNPJ matematicamente válido
    assert validate_cnpj("11.444.777/0001-61") is True
```

Roda `pytest test_cnpj.py`:
```
ModuleNotFoundError: No module named 'cnpj'
```
**Vermelho confirmado.** Arquivo `cnpj.py` nem existe.

### Iteração 1 — GREEN

Código mínimo para passar — só o que esse teste precisa:

```python
# cnpj.py

def _strip(value: str) -> str:
    return "".join(c for c in value if c.isdigit())


def validate_cnpj(value: str) -> bool:
    digits = _strip(value)

    if len(digits) != 14:
        return False

    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    def calc(seq, weights):
        total = sum(int(d) * w for d, w in zip(seq, weights))
        r = total % 11
        return 0 if r < 2 else 11 - r

    d1 = calc(digits[:12], weights1)
    d2 = calc(digits[:13], weights2)

    return digits[12] == str(d1) and digits[13] == str(d2)
```

Roda:
```
test_cnpj_valido_formatado_e_aceito PASSED
```
**Verde.**

### Iteração 1 — REFACTOR

Nenhuma duplicação ainda. Constantes podem ser extraídas mas só há um uso — aguardar próximas iterações para decidir se faz sentido. Não antecipar.

---

## Fase 3 — Loop Incremental

### Iteração 2 — RED: CNPJ válido sem formatação

```python
def test_cnpj_valido_sem_formatacao_e_aceito():
    assert validate_cnpj("11444777000161") is True
```

Roda:
```
test_cnpj_valido_sem_formatacao_e_aceito PASSED
```

Verde imediato — `_strip` do tracer bullet já cobria esse comportamento. Legítimo: o teste ainda tem valor como documentação explícita do contrato.

---

### Iteração 3 — RED: todos os dígitos iguais são rejeitados

```python
def test_cnpj_todos_digitos_iguais_e_rejeitado():
    # Qualquer sequência de 14 dígitos iguais deve ser rejeitada
    for digit in "0123456789":
        cnpj = digit * 14
        assert validate_cnpj(cnpj) is False, f"Deveria rejeitar {cnpj}"
```

Roda:
```
FAILED — AssertionError: Deveria rejeitar 00000000000000
```

**Vermelho confirmado.** `00000000000000` passa pela validação de dígitos (o cálculo produz 0 e 0, que batem com os dígitos 12 e 13). A regra de rejeição explícita não existe.

### Iteração 3 — GREEN

```python
def validate_cnpj(value: str) -> bool:
    digits = _strip(value)

    if len(digits) != 14:
        return False

    if len(set(digits)) == 1:           # <-- linha nova
        return False

    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    def calc(seq, weights):
        total = sum(int(d) * w for d, w in zip(seq, weights))
        r = total % 11
        return 0 if r < 2 else 11 - r

    d1 = calc(digits[:12], weights1)
    d2 = calc(digits[:13], weights2)

    return digits[12] == str(d1) and digits[13] == str(d2)
```

Roda todos os testes:
```
test_cnpj_valido_formatado_e_aceito        PASSED
test_cnpj_valido_sem_formatacao_e_aceito   PASSED
test_cnpj_todos_digitos_iguais_e_rejeitado PASSED
```
**Verde — todos os testes passando.**

### Iteração 3 — REFACTOR

A função `calc` está aninhada — há dois usos (d1 e d2). Candidata a extração, mas extração agora interromperia o ciclo com testes em vermelho potencial. Aguardar fase de refactor final.

---

### Iteração 4 — RED: comprimento errado é rejeitado

```python
def test_cnpj_com_comprimento_errado_e_rejeitado():
    assert validate_cnpj("") is False
    assert validate_cnpj("1234") is False
    assert validate_cnpj("1" * 13) is False
    assert validate_cnpj("1" * 15) is False
```

Roda:
```
test_cnpj_com_comprimento_errado_e_rejeitado PASSED
```

Verde imediato — guard de comprimento já existia do tracer bullet. Teste documenta o contrato explicitamente.

---

### Iteração 5 — RED: dígito verificador incorreto é rejeitado

```python
def test_cnpj_com_digito_verificador_errado_e_rejeitado():
    # Pega CNPJ válido e altera o último dígito
    assert validate_cnpj("11.444.777/0001-60") is False
    assert validate_cnpj("11.444.777/0001-62") is False
    # Altera o penúltimo
    assert validate_cnpj("11.444.777/0001-71") is False
```

Roda:
```
test_cnpj_com_digito_verificador_errado_e_rejeitado PASSED
```

Verde imediato — validação matemática já rejeita esses casos. Comportamento coberto pela lógica do tracer bullet.

---

## Fase 4 — Refactor

Todos os comportamentos priorizados verdes. Agora sim: refactor.

**Oportunidades identificadas:**
1. `calc` aninhada dentro de `validate_cnpj` — dois usos, deve ser extraída como função de módulo
2. Pesos são magic numbers sem nome — extrair como constantes nomeadas
3. `_strip` é boa — mantém

```python
# cnpj.py

_WEIGHTS_D1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_WEIGHTS_D2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]


def _strip(value: str) -> str:
    """Remove qualquer formatação, retorna apenas dígitos."""
    return "".join(c for c in value if c.isdigit())


def _calc_digit(digits: str, weights: list[int]) -> int:
    """Calcula um dígito verificador dado um bloco de dígitos e seus pesos."""
    total = sum(int(d) * w for d, w in zip(digits, weights))
    remainder = total % 11
    return 0 if remainder < 2 else 11 - remainder


def validate_cnpj(value: str) -> bool:
    """
    Valida um CNPJ brasileiro.

    Aceita string formatada ("11.444.777/0001-61") ou não ("11444777000161").
    Rejeita CNPJs com todos os dígitos iguais.
    Valida os dois dígitos verificadores.
    """
    digits = _strip(value)

    if len(digits) != 14:
        return False

    if len(set(digits)) == 1:
        return False

    d1 = _calc_digit(digits[:12], _WEIGHTS_D1)
    d2 = _calc_digit(digits[:13], _WEIGHTS_D2)

    return digits[12] == str(d1) and digits[13] == str(d2)
```

Roda todos os testes após refactor:
```
test_cnpj_valido_formatado_e_aceito                  PASSED
test_cnpj_valido_sem_formatacao_e_aceito             PASSED
test_cnpj_todos_digitos_iguais_e_rejeitado           PASSED
test_cnpj_com_comprimento_errado_e_rejeitado         PASSED
test_cnpj_com_digito_verificador_errado_e_rejeitado  PASSED
```

**5/5 verde após refactor.**

---

## Suite Final

```python
# test_cnpj.py
from cnpj import validate_cnpj


def test_cnpj_valido_formatado_e_aceito():
    assert validate_cnpj("11.444.777/0001-61") is True


def test_cnpj_valido_sem_formatacao_e_aceito():
    assert validate_cnpj("11444777000161") is True


def test_cnpj_todos_digitos_iguais_e_rejeitado():
    for digit in "0123456789":
        cnpj = digit * 14
        assert validate_cnpj(cnpj) is False, f"Deveria rejeitar {cnpj}"


def test_cnpj_com_comprimento_errado_e_rejeitado():
    assert validate_cnpj("") is False
    assert validate_cnpj("1234") is False
    assert validate_cnpj("1" * 13) is False
    assert validate_cnpj("1" * 15) is False


def test_cnpj_com_digito_verificador_errado_e_rejeitado():
    assert validate_cnpj("11.444.777/0001-60") is False
    assert validate_cnpj("11.444.777/0001-62") is False
    assert validate_cnpj("11.444.777/0001-71") is False
```

---

## Evidência de Conclusão

- 5 comportamentos priorizados — todos verdes
- Nenhum teste escrito antes de ver o respectivo RED (testes 2, 4 e 5 foram verdes imediatos por comportamento já implementado — documentado e explicado explicitamente, não ignorado)
- Refactor executado somente após GREEN final — testes ainda verdes
- Nenhum collaborator interno mockado
- Nenhum método privado (`_strip`, `_calc_digit`) testado diretamente — apenas `validate_cnpj`
- Testes leem como spec: "cnpj válido formatado é aceito", "todos os dígitos iguais são rejeitados"
- Módulo deepened: `_calc_digit` extraído na fase de refactor com interface mínima (string + weights → int)

**Handoff:** skill 11 (Reviewer) pode validar que nenhum teste usa `_strip` ou `_calc_digit` diretamente.
