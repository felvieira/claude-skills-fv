# ENGINE — rota A (seek) ou rota B (framework)

**O princípio:** o filme é uma função `seek(t)`. Dado um instante, pinta o quadro exato, sem olhar o anterior.
Um navegador headless chama `seek` 900 vezes para 15 s a 60 fps, tira screenshot de cada um e o ffmpeg junta.
Nada depende de timer: render idêntico a cada execução; mudar é uma linha + re-render.

## Rota A — zero dependências (padrão)

`index.html` com um canvas (ou DOM) e `window.seek = (t) => {...}`; `window.DURATION`; opcional `window.ready`.
Renderização: `scripts/render-seek.mjs` (Playwright + ffmpeg). Sem framework, sem build.

```js
import { track, presets, layout } from "/_lib/motion.mjs";
const L = layout(W, H);                       // unidades relativas, nao pixels
const x = track(0, [{ at: 1.5, to: 40 }], presets.default);
window.seek = (t) => { /* limpa e desenha tudo como f(t) */ };
```

Regras do motor: nenhuma leitura de relógio, nenhum `Math.random()` sem semente, nenhuma animação CSS por tempo real
(se usar DOM, controle `animation-delay` negativo ou escreva estilos em `seek`), fontes e imagens carregadas antes
de `window.ready`.

## Rota B — framework

Escolha B quando há equipe/reuso, timeline longa com muitas cenas ou componentes React: **HyperFrames** (HTML) ou
**Remotion** (React). Peça explicitamente: sem isso o modelo prefere a rota A. Se o ambiente tiver a skill do framework
(`hyperframes`, `remotion-best-practices`), use-a para a estrutura e use `motion.mjs` (molas, batidas) como biblioteca.

## Determinismo — checagem

```bash
node scripts/render-seek.mjs film/index.html --stills 2.5 --stills-dir a && node scripts/render-seek.mjs film/index.html --stills 2.5 --stills-dir b
# os dois PNG devem ter o mesmo hash
```

## Custo

Quadro a quadro com screenshot PNG: o exemplo (640×360, 144 quadros) renderiza em torno de 8 s nesta máquina; 1080p a 60 fps
por minutos pede paciência — renderize em baixa resolução para iterar e em alta só no final.
