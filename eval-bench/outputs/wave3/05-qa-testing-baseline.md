---
scenario: 05-qa-testing
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 890
time_seconds: 18
quality_score: 3.0
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: n/a
notes: "covers the main categories but with shallow grouping, no test IDs, no boundary math, no regression note"
---

# Baseline — Testes para `calcularJurosCompostos`

Para uma função `calcularJurosCompostos(valor, taxa, meses, capitalizacao)` em TypeScript usando Jest,
aqui está o plano de testes que você deve escrever:

## 1. Happy path

```ts
describe('calcularJurosCompostos — happy path', () => {
  it('retorna valor correto com capitalização mensal', () => {
    // valor=1000, taxa=0.01 (1% ao mês), meses=12, capitalizacao='mensal'
    // Esperado: 1000 * (1 + 0.01)^12 ≈ 1126.83
    expect(calcularJurosCompostos(1000, 0.01, 12, 'mensal')).toBeCloseTo(1126.83, 2);
  });

  it('retorna valor correto com capitalização diária', () => {
    expect(calcularJurosCompostos(1000, 0.0003, 365, 'diaria')).toBeCloseTo(1113.83, 2);
  });
});
```

## 2. Valores limite

```ts
describe('calcularJurosCompostos — valores limite', () => {
  it('retorna o mesmo valor quando meses = 0', () => {
    expect(calcularJurosCompostos(1000, 0.01, 0, 'mensal')).toBe(1000);
  });

  it('retorna o mesmo valor quando taxa = 0', () => {
    expect(calcularJurosCompostos(1000, 0, 12, 'mensal')).toBe(1000);
  });

  it('funciona com valor muito alto (overflow check)', () => {
    const result = calcularJurosCompostos(1e15, 0.01, 12, 'mensal');
    expect(result).toBeGreaterThan(1e15);
    expect(Number.isFinite(result)).toBe(true);
  });
});
```

## 3. Casos de erro

```ts
describe('calcularJurosCompostos — casos de erro', () => {
  it('lança erro quando valor é negativo', () => {
    expect(() => calcularJurosCompostos(-100, 0.01, 12, 'mensal')).toThrow();
  });

  it('lança erro quando taxa é negativa', () => {
    expect(() => calcularJurosCompostos(1000, -0.01, 12, 'mensal')).toThrow();
  });

  it('lança erro quando meses é negativo', () => {
    expect(() => calcularJurosCompostos(1000, 0.01, -1, 'mensal')).toThrow();
  });

  it('lança erro quando valor é NaN', () => {
    expect(() => calcularJurosCompostos(NaN, 0.01, 12, 'mensal')).toThrow();
  });

  it('lança erro quando taxa é NaN', () => {
    expect(() => calcularJurosCompostos(1000, NaN, 12, 'mensal')).toThrow();
  });

  it('lança erro quando capitalizacao é inválida', () => {
    expect(() => calcularJurosCompostos(1000, 0.01, 12, 'invalida' as any)).toThrow();
  });
});
```

## 4. Regressão

```ts
describe('calcularJurosCompostos — regressão', () => {
  it('resultado bate com cálculo manual: 1000 * 1.01^12', () => {
    const esperado = 1000 * Math.pow(1.01, 12);
    expect(calcularJurosCompostos(1000, 0.01, 12, 'mensal')).toBeCloseTo(esperado, 5);
  });
});
```

## Dicas

- Use `toBeCloseTo(valor, casas)` para comparações com ponto flutuante.
- Se a função não lança erro mas retorna `null`/`undefined`, ajuste os matchers.
- Configure `jest.config.ts` com `preset: 'ts-jest'` se ainda não estiver.
