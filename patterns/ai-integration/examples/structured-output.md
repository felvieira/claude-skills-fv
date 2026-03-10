# Example - Structured Output

## Uso ideal

- classificacao
- extração
- sugestao operacional
- qualquer resposta que deva voltar tipada

## Shape sugerido

```ts
type Output = {
  title: string;
  confidence: number;
  tags: string[];
};
```

## Regra

Sempre preferir output estruturado para fluxos internos de app quando isso reduzir ambiguidade e retrabalho.
