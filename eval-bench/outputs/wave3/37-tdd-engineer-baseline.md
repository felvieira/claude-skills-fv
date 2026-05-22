---
scenario: 37-tdd-engineer
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 320
tokens_out_approx: 1180
time_seconds: 38
quality_score: 3.3
quality_breakdown:
  specificity: 3
  completeness: 4
  correctness: 4
  actionability: 4
  discipline: 3
pass_fail: baseline
delta_vs_baseline: n/a
notes: "Red-green-refactor sequência presente mas fraca — iteração 2 produz falso-verde reconhecido e não corrigido imediatamente; CNPJ de exemplo não verificado matematicamente; refactor acontece mas só renomeia; sem discussão de anti-padrão horizontal slicing"
---

# Baseline — Skill 37 TDD Engineer

## Cenário
Implementar do zero, com TDD verdadeiro (red-green-refactor, não horizontal slicing), uma função de validação de CNPJ brasileiro: aceita string formatada ou não, valida dígitos verificadores, rejeita CNPJs conhecidos como inválidos (todos iguais). Mostra o ciclo iteração por iteração.

---

## Resposta (sem skill)

Stack assumida: Python + pytest (mais didática para o ciclo).

---

### Iteração 1 — RED: primeiro teste, função inexistente

```python
# test_cnpj.py
def test_rejeita_string_vazia():
    assert validate_cnpj("") == False
```

Roda: `pytest` → `ImportError: cannot import name 'validate_cnpj'`

---

### Iteração 1 — GREEN: mínimo para passar

```python
# cnpj.py
def validate_cnpj(cnpj: str) -> bool:
    return False
```

Roda: `pytest` → `PASSED`

---

### Iteração 1 — REFACTOR: nada a refatorar ainda.

---

### Iteração 2 — RED: rejeitar CNPJs com todos dígitos iguais

```python
def test_rejeita_todos_digitos_iguais():
    assert validate_cnpj("11.111.111/1111-11") == False
    assert validate_cnpj("00.000.000/0000-00") == False
    assert validate_cnpj("11111111111111") == False
```

Roda: `pytest` → PASSED (porque retornamos sempre False). Mas isso é um falso verde — a função ainda não aceita CNPJs válidos. Vamos adicionar um teste que force a lógica real.

---

### Iteração 3 — RED: aceitar um CNPJ válido real

```python
def test_aceita_cnpj_valido():
    # CNPJ válido gerado matematicamente: 11.222.333/0001-81
    assert validate_cnpj("11.222.333/0001-81") == True
```

Roda: → `FAILED` (retorna False)

---

### Iteração 3 — GREEN: implementar limpeza + dígitos verificadores

```python
def validate_cnpj(cnpj: str) -> bool:
    # Remove formatação
    digits = ''.join(c for c in cnpj if c.isdigit())
    
    # Deve ter 14 dígitos
    if len(digits) != 14:
        return False
    
    # Rejeitar todos iguais
    if len(set(digits)) == 1:
        return False
    
    # Calcular 1º dígito verificador
    def calc_digit(partial: str, weights: list) -> int:
        total = sum(int(d) * w for d, w in zip(partial, weights))
        remainder = total % 11
        return 0 if remainder < 2 else 11 - remainder
    
    weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    
    d1 = calc_digit(digits[:12], weights1)
    d2 = calc_digit(digits[:13], weights2)
    
    return digits[12] == str(d1) and digits[13] == str(d2)
```

Roda: → `PASSED`

---

### Iteração 4 — RED: testar formatação com pontuação

```python
def test_aceita_cnpj_formatado():
    assert validate_cnpj("11.222.333/0001-81") == True

def test_aceita_cnpj_sem_formatacao():
    assert validate_cnpj("11222333000181") == True
```

Roda: → PASSED (limpeza já está implementada)

---

### Iteração 5 — RED: edge cases de rejeição

```python
def test_rejeita_tamanho_errado():
    assert validate_cnpj("1234") == False

def test_rejeita_letras():
    assert validate_cnpj("AB.CDE.FGH/IJKL-MN") == False

def test_rejeita_cnpj_com_digito_verificador_errado():
    assert validate_cnpj("11.222.333/0001-82") == False
```

Roda: → PASSED

---

### Iteração 6 — REFACTOR: extrair constantes, melhorar legibilidade

```python
# cnpj.py
_WEIGHTS_D1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
_WEIGHTS_D2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]


def _strip(cnpj: str) -> str:
    return ''.join(c for c in cnpj if c.isdigit())


def _calc_digit(partial: str, weights: list) -> int:
    total = sum(int(d) * w for d, w in zip(partial, weights))
    remainder = total % 11
    return 0 if remainder < 2 else 11 - remainder


def validate_cnpj(cnpj: str) -> bool:
    digits = _strip(cnpj)

    if len(digits) != 14:
        return False

    if len(set(digits)) == 1:
        return False

    d1 = _calc_digit(digits[:12], _WEIGHTS_D1)
    d2 = _calc_digit(digits[:13], _WEIGHTS_D2)

    return digits[12] == str(d1) and digits[13] == str(d2)
```

Roda todos os testes: → PASSED

---

### Suite final de testes (consolidado)

```python
# test_cnpj.py
import pytest
from cnpj import validate_cnpj

class TestCNPJInvalidos:
    def test_string_vazia(self):
        assert validate_cnpj("") == False

    def test_todos_zeros(self):
        assert validate_cnpj("00.000.000/0000-00") == False

    def test_todos_uns(self):
        assert validate_cnpj("11.111.111/1111-11") == False

    def test_tamanho_errado(self):
        assert validate_cnpj("1234") == False

    def test_digito_verificador_errado(self):
        assert validate_cnpj("11.222.333/0001-82") == False

class TestCNPJValidos:
    def test_cnpj_formatado(self):
        assert validate_cnpj("11.222.333/0001-81") == True

    def test_cnpj_sem_formatacao(self):
        assert validate_cnpj("11222333000181") == True
```
