---
scenario: 05-qa-testing
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2100
tokens_out_approx: 1380
time_seconds: 35
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.5
notes: "named test groups per skill categories, boundary math shown explicitly, mutation testing surfaced as next step, anti-rationalization applied, regression test pinned to known output"
---

# Treatment — Testes para `calcularJurosCompostos`

## Plano de cobertura (antes de escrever código)

Função: `calcularJurosCompostos(valor: number, taxa: number, meses: number, capitalizacao: string): number`

Fórmula esperada: `valor * (1 + taxa)^meses` (para capitalização padrão).
Variações de `capitalizacao` (ex: `'mensal'`, `'diaria'`, `'anual'`) podem alterar a taxa efetiva — assumimos que a função normaliza internamente.

Categorias obrigatórias pelo cenário:

| # | Categoria | Qtd mínima de testes |
|---|---|---|
| 1 | Happy path | 2 (capitalização mensal e outra) |
| 2 | Valores limite | 4 (zero, um período, valor muito alto, taxa muito pequena) |
| 3 | Erro — negativos | 3 (valor < 0, taxa < 0, meses < 0) |
| 4 | Erro — NaN / undefined | 3 (NaN em cada posição numérica) |
| 5 | Regressão | 1 (resultado fixo pinado de build anterior) |

Total mínimo: **13 testes**.

---

## Setup Jest + TypeScript

```jsonc
// jest.config.ts
import type { Config } from 'jest';
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: true,
  coverageThreshold: { global: { lines: 80 } },
};
export default config;
```

---

## Arquivo de testes

```ts
// calcularJurosCompostos.test.ts
import { calcularJurosCompostos } from './calcularJurosCompostos';

// ── 1. HAPPY PATH ──────────────────────────────────────────────────────────
describe('happy path', () => {
  it('capitalização mensal: 1000 a 1%/mês por 12 meses → ≈1126.83', () => {
    // 1000 * 1.01^12 = 1126.8250301319694
    expect(calcularJurosCompostos(1000, 0.01, 12, 'mensal')).toBeCloseTo(1126.83, 2);
  });

  it('capitalização anual: 5000 a 10%/ano por 3 anos → ≈6655.00', () => {
    // 5000 * 1.10^3 = 6655.00
    expect(calcularJurosCompostos(5000, 0.10, 3, 'anual')).toBeCloseTo(6655.00, 2);
  });
});

// ── 2. VALORES LIMITE ──────────────────────────────────────────────────────
describe('valores limite', () => {
  it('meses = 0 → retorna o valor original (sem crescimento)', () => {
    expect(calcularJurosCompostos(1000, 0.05, 0, 'mensal')).toBeCloseTo(1000, 5);
  });

  it('taxa = 0 → retorna o valor original independente dos meses', () => {
    expect(calcularJurosCompostos(2500, 0, 24, 'mensal')).toBeCloseTo(2500, 5);
  });

  it('meses = 1 → retorna valor * (1 + taxa)', () => {
    expect(calcularJurosCompostos(1000, 0.02, 1, 'mensal')).toBeCloseTo(1020, 5);
  });

  it('valor muito alto (1e12) → resultado é finito e maior que o input', () => {
    const result = calcularJurosCompostos(1e12, 0.01, 12, 'mensal');
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(1e12);
  });
});

// ── 3. CASOS DE ERRO — NEGATIVOS ───────────────────────────────────────────
// Ajuste toThrow() para o tipo real de erro da sua implementação.
// Se a função retorna NaN em vez de lançar, troque por: expect(result).toBeNaN()
describe('erro — valores negativos', () => {
  it('valor negativo lança erro (ou retorna inválido)', () => {
    expect(() => calcularJurosCompostos(-100, 0.01, 12, 'mensal')).toThrow();
  });

  it('taxa negativa lança erro', () => {
    expect(() => calcularJurosCompostos(1000, -0.05, 12, 'mensal')).toThrow();
  });

  it('meses negativo lança erro', () => {
    expect(() => calcularJurosCompostos(1000, 0.01, -6, 'mensal')).toThrow();
  });
});

// ── 4. CASOS DE ERRO — NaN ─────────────────────────────────────────────────
describe('erro — NaN', () => {
  it('valor = NaN lança erro ou retorna NaN', () => {
    expect(() => calcularJurosCompostos(NaN, 0.01, 12, 'mensal')).toThrow();
  });

  it('taxa = NaN lança erro ou retorna NaN', () => {
    expect(() => calcularJurosCompostos(1000, NaN, 12, 'mensal')).toThrow();
  });

  it('meses = NaN lança erro ou retorna NaN', () => {
    expect(() => calcularJurosCompostos(1000, 0.01, NaN, 'mensal')).toThrow();
  });

  it('capitalizacao desconhecida lança erro', () => {
    expect(() =>
      calcularJurosCompostos(1000, 0.01, 12, 'quinzenal' as never)
    ).toThrow();
  });
});

// ── 5. REGRESSÃO ───────────────────────────────────────────────────────────
// Pino de regressão: valor calculado manualmente e fixado.
// Se este teste quebrar após um refactor, a lógica de capitalização mudou.
describe('regressão', () => {
  it('resultado pinado: 1000 * 1.005^24 = 1127.16 (capitalização mensal 0.5%/mês)', () => {
    const pinado = +(1000 * Math.pow(1.005, 24)).toFixed(2); // 1127.16
    expect(calcularJurosCompostos(1000, 0.005, 24, 'mensal')).toBeCloseTo(pinado, 2);
  });
});
```

---

## Gaps e riscos residuais

| Gap | Impacto | Ação recomendada |
|---|---|---|
| Comportamento de `capitalizacao: 'diaria'` não coberto | Médio — normalização de taxa diferente | Adicionar 1 happy path após spec confirmada |
| Precisão de ponto flutuante com valores muito pequenos | Baixo | `toBeCloseTo(valor, 8)` em edge cases futuros |
| Tipo de erro lançado não especificado (usa `toThrow()` genérico) | Médio | Checar se a impl lança `RangeError`/`TypeError` e pinnar o tipo |
| Mutation testing não configurado | Médio — tests fracos não detectados | Ver abaixo |

---

## Próximo passo: Mutation Testing (recomendado)

Lógica de juros compostos é exatamente o tipo de código onde testes podem passar com asserções fracas (`toBeGreaterThan(0)`) e ainda não pegar um bug real (ex: `+` em vez de `*`).

Configurar [Stryker Mutator](https://stryker-mutator.io/) após os testes passarem:

```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
npx stryker init   # gera stryker.config.json interativamente
npx stryker run
```

Meta: mutation score ≥ 85% para lógica financeira.
Se sobreviventes aparecerem na fórmula `valor * (1 + taxa)^meses`, fortalecer as asserções (ex: comparar com valor exato, não só `toBeCloseTo` frouxo).

---

## Checklist antes de fechar QA

- [ ] 13 testes passando (0 flaky em 3 runs consecutivos)
- [ ] Coverage ≥ 80% em linhas de `calcularJurosCompostos.ts`
- [ ] Critérios do cenário cobertos: happy path ✓, limite ✓, erro ✓, regressão ✓
- [ ] Gap de `capitalizacao: 'diaria'` documentado ou coberto
- [ ] Mutation score ≥ 70% (se Stryker configurado)
