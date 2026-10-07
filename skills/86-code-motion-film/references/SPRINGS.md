# SPRINGS — movimento com massa, mas ainda função do tempo

Movimento barato vai de A a B por uma curva fixa. Movimento caro tem massa: acelera, sobrepassa um fio e assenta.
`scripts/motion.mjs` traz a mola em **forma fechada** (resposta ao degrau do oscilador amortecido), então `spring(cfg, t)`
é pura: o quadro 812 se renderiza sem simular 0..811.

## Preset por papel

| Preset | Quando | Sobrepasso |
|---|---|---|
| `snappy` | botões, toggles, bordas de ataque | leve (~3%) |
| `default` | cartões, containers, câmera | quase nenhum |
| `heavy` | tipografia grande, objetos 3D, logo | pequeno, lento |
| `playful` | mascotes, adesivos | visível |
| `type` | texto | nenhum (criticamente amortecida) |

Regra: sobrepasso pequeno em UI, nenhum em texto.

## Uma mola por mudança, nunca reiniciar

Quando um valor muda de alvo várias vezes (cursor, largura de um container), **não reinicie a mola**: some uma mola por
mudança, cada uma começando no seu instante (superposição). O movimento fica contínuo e continua sendo função de `t`.

```js
const width = track(120, [{ at: 0.5, to: 300 }, { at: 1.2, to: 180 }], presets.default);
width(0.9);   // sem tranco entre as duas mudancas
```

## Verificações úteis

`settleTime(cfg)` (quando assenta), `overshoot(cfg)` (quanto passa), `dampingRatio(cfg)` (<1 oscila, 1 crítico, >1 lento).
Troque curvas de easing por `spring`/`track` de uma vez no arquivo inteiro; é uma refatoração mecânica.
