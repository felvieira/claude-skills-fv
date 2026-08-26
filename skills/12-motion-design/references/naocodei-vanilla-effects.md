# Efeitos Vanilla — Referência de Código (naocodei.com)

> **Aviso de proveniência.** Código copiado de https://naocodei.com/free-code/ — **licença não declarada na fonte**, autoria não identificada. Risco de proveniência assumido explicitamente pelo usuário do kit em 2026-08-23. Revisar/adaptar antes de usar em produto comercial; preferir reescrever com base no efeito visual em vez de redistribuir literal quando a origem do projeto exigir clareza de licença.

Cinco efeitos em JavaScript puro (sem dependências), extraídos verbatim do site — cada um usa dois helpers compartilhados na fonte original: `lerp(a,b,t)` (interpolação linear), `limitar(v,min,max)` (clamp), e `laco(card, passo)` (loop de `requestAnimationFrame` que liga/desliga sozinho via `IntersectionObserver`, parando fora da viewport). Para usar mais de um efeito na mesma página, declarar esses helpers uma única vez.

## Cartões que empilham (stack cards)

Quando usar: hero de produto com etapas/features sequenciais, storytelling de scroll, landing page que quer o efeito "site de agência" sem custo de biblioteca. Cada cartão gruda no topo (`position: sticky`) e o próximo sobe por cima; os de baixo encolhem e escurecem, criando sensação de pilha.

```css
.js-pilha{width:100%}
.js-pilha .folha{
  position:sticky;top:14px;height:132px;margin-bottom:16px;border-radius:16px;
  border:1px solid var(--border);padding:18px 20px;
  display:flex;flex-direction:column;justify-content:space-between;
  box-shadow:0 -10px 30px rgba(0,0,0,.5);will-change:transform;
}
.js-pilha .folha b{font-family:var(--display);font-size:20px;font-weight:600;color:#fff}
.js-pilha .folha span{font-family:var(--ui);font-size:12px;color:rgba(255,255,255,.55)}
```

```javascript
FX.j01 = function(card){
  var caixa = card.querySelector('.mini');
  var folhas = [].slice.call(card.querySelectorAll('.folha'));
  var TOPO = 14;                     /* o mesmo "top" do sticky no CSS */

  /* Pegadinha do sticky: enquanto o cartão está grudado, tanto a
     posição na tela quanto o offsetTop passam a refletir o lugar
     deslocado, e não o original. Então a posição natural precisa
     ser medida uma vez, com o sticky desligado. */
  var naturais = folhas.map(function(f){
    var antes = f.style.position;
    f.style.position = 'static';
    var y = f.offsetTop;
    f.style.position = antes;
    return y;
  });

  return aoRolar(caixa, function(){
    folhas.forEach(function(f, i){
      var vao = f.offsetHeight + 16;              /* altura mais a margem */
      /* quanto a rolagem já passou do ponto onde ele começou a grudar */
      var preso = limitar((caixa.scrollTop + TOPO - naturais[i]) / vao, 0, 1);
      f.style.transform = 'scale(' + (1 - preso * .10) + ')';
      f.style.filter = 'brightness(' + (1 - preso * .5) + ')';
      f.style.zIndex = i;
    });
  });
};
```

Nota: usa `aoRolar` (listener de scroll no container) em vez do loop `laco` — a fonte original não define `aoRolar` explicitamente no trecho isolado deste efeito; ao portar, ligar num `scroll` listener do container com `{ passive: true }` ou trocar por `ScrollTrigger` (ver seção GSAP do `SKILL.md`) se precisar de scrub mais suave.

## Rolagem com inércia

Quando usar: carrossel/trilho de itens (cases, depoimentos, produtos) que deve "escorregar" como site de agência em vez de saltar direto para a posição do wheel. Não usar em listas longas de conteúdo textual — inércia demais atrapalha leitura.

```css
.js-inercia{width:100%;height:200px;overflow:hidden;border:1px solid var(--border);border-radius:12px;background:rgba(0,0,0,.3);position:relative}
.js-inercia .trilho{will-change:transform;padding:16px}
.js-inercia .item{padding:14px 16px;margin-bottom:10px;border-radius:10px;background:var(--card2);border:1px solid var(--border);font-size:13.5px;color:#fff}
```

```javascript
FX.j10 = function(card){
  var caixa = card.querySelector('.js-inercia');
  var trilho = caixa.querySelector('.trilho');
  var alvo = 0, atual = 0;
  var max = function(){ return Math.max(0, trilho.scrollHeight - caixa.clientHeight); };
  caixa.addEventListener('wheel', function(ev){
    ev.preventDefault();
    alvo = limitar(alvo + ev.deltaY, 0, max());
  },{passive:false});
  var parar = laco(card, function(){
    atual = lerp(atual, alvo, .08);              /* quanto menor, mais escorrega */
    trilho.style.transform = 'translateY(' + (-atual) + 'px)';
  });
  return parar;
};
```

Performance: `wheel` com `preventDefault` bloqueia o scroll nativo da página inteira se o listener não estiver escopado ao container — confirmar que o `addEventListener('wheel', ...)` está no elemento `.js-inercia`, não em `window`/`document`. Sem esse escopo, o usuário perde a rolagem do resto da página.

## Partículas que fogem (canvas)

Quando usar: seção hero decorativa, fundo de "sobre nós"/cultura, qualquer bloco onde o cursor deve sentir peso/interatividade sem competir com conteúdo textual. Cada ponto tem posição de origem e é empurrado quando o mouse se aproxima, voltando devagar via `lerp`.

```css
.js-fugir{width:100%;height:180px;border-radius:14px;border:1px solid var(--border);background:rgba(0,0,0,.3);display:block}
```

```javascript
FX.j13 = function(card){
  var cv = card.querySelector('.js-fugir');
  var ctx = cv.getContext('2d');
  var pts = [], mouse = {x:-999,y:-999};
  function medir(){
    cv.width = cv.clientWidth; cv.height = cv.clientHeight;
    pts = [];
    for(var y=18; y<cv.height; y+=22)
      for(var x=18; x<cv.width; x+=22)
        pts.push({ox:x, oy:y, x:x, y:y});
  }
  medir();
  window.addEventListener('resize', medir);
  cv.addEventListener('mousemove', function(ev){
    var r = cv.getBoundingClientRect();
    mouse.x = ev.clientX - r.left; mouse.y = ev.clientY - r.top;
  });
  cv.addEventListener('mouseleave', function(){ mouse.x = mouse.y = -999; });
  var parar = laco(card, function(){
    ctx.clearRect(0,0,cv.width,cv.height);
    pts.forEach(function(p){
      var dx = p.x - mouse.x, dy = p.y - mouse.y;
      var d = Math.hypot(dx,dy);
      if(d < 70){                                  /* raio de fuga */
        var f = (70 - d) / 70;
        p.x += (dx/d) * f * 6;
        p.y += (dy/d) * f * 6;
      }
      p.x = lerp(p.x, p.ox, .08);                  /* volta pra casa */
      p.y = lerp(p.y, p.oy, .08);
      var brilho = limitar(1 - Math.hypot(p.x-p.ox, p.y-p.oy)/30, .18, 1);
      ctx.fillStyle = 'rgba(255,255,255,' + brilho + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.7, 0, 6.284); ctx.fill();
    });
  });
  return function(){ parar(); window.removeEventListener('resize', medir); };
};
```

Performance: já usa o `laco` compartilhado, que desliga o `requestAnimationFrame` via `IntersectionObserver` quando o canvas sai da viewport — padrão obrigatório para qualquer efeito de canvas/WebGL nesta lista, senão a animação continua consumindo CPU/GPU com a seção fora de tela.

## Embaralhar letras (scramble/text shuffle)

Quando usar: headline de destaque, número/label que precisa chamar atenção na entrada, efeito "painel de aeroporto". Usar com moderação — texto ilegível por ~1s tem custo de leitura; não aplicar em texto longo ou informação crítica.

```css
.js-scramble{font-family:var(--mono);font-size:26px;font-weight:600;color:#fff;letter-spacing:.04em}
```

```javascript
FX.j15 = function(card){
  var el = card.querySelector('.js-scramble');
  var final = el.dataset.texto || el.textContent;
  var sopa = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@*';
  var quadro = 0, id;
  function girar(){
    var saida = '', travadas = Math.floor(quadro / 3);
    for(var i=0; i<final.length; i++){
      saida += i < travadas ? final[i]
             : (final[i] === ' ' ? ' ' : sopa[(Math.random()*sopa.length)|0]);
    }
    el.textContent = saida;
    quadro++;
    if(travadas <= final.length) id = requestAnimationFrame(girar);
  }
  girar();
  return function(){ cancelAnimationFrame(id); };
};
```

Nota: `el.textContent` é reescrito a cada frame — em texto com marcação inline (`<b>`, `<span>` dentro do alvo) isso destrói os nós filhos. Usar apenas em elementos de texto puro, ou adaptar para innerHTML controlado. Respeitar `prefers-reduced-motion`: pular direto para `final` sem o loop de embaralhamento quando `useReducedMotion()` retornar `true`.

## Fundo com shader (WebGL fluido)

Quando usar: hero de produto com ambição visual alta (SaaS de IA, ferramenta criativa, portfólio), fundo full-bleed que precisa parecer "vivo" sem custo de vídeo. É o efeito mais caro da lista — reservar para no máximo uma seção por página.

```css
.js-shader{width:100%;height:200px;border-radius:14px;border:1px solid var(--border);display:block;background:#0d0d10}
.js-shader-aviso{font-family:var(--ui);font-size:12px;color:var(--fg-dim)}
```

```javascript
FX.j31 = function(card){
  var cv = card.querySelector('.js-shader');
  var gl = cv.getContext('webgl') || cv.getContext('experimental-webgl');
  if(!gl){                                   /* placa antiga: sai de fininho */
    cv.style.background = 'linear-gradient(140deg,#2b2b33,#0d0d10)';
    return;
  }
  var vertice = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var pixel = [
    'precision highp float;',
    'uniform vec2 tela; uniform float t; uniform vec2 mouse;',
    /* ondas somadas em escalas diferentes: a receita de nuvem */
    'float onda(vec2 p){ return sin(p.x*1.7+t*.45)*cos(p.y*1.3-t*.35); }',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / tela;',
    '  vec2 q = uv * 3.0;',
    '  float f = onda(q) + .5*onda(q*2.1+t*.25) + .25*onda(q*4.3-t*.18);',
    '  f += .45 * exp(-distance(uv, mouse) * 4.5);',
    '  vec3 escuro = vec3(.05,.05,.07);',
    '  vec3 claro  = vec3(.88,.89,.94);',
    '  gl_FragColor = vec4(mix(escuro, claro, smoothstep(-.7,1.3,f)), 1.);',
    '}'
  ].join('\n');

  function compilar(tipo, fonte){
    var s = gl.createShader(tipo);
    gl.shaderSource(s, fonte); gl.compileShader(s);
    return s;
  }
  var prog = gl.createProgram();
  gl.attachShader(prog, compilar(gl.VERTEX_SHADER, vertice));
  gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, pixel));
  gl.linkProgram(prog); gl.useProgram(prog);

  /* dois triângulos cobrindo a tela inteira */
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  var p = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);

  var uTela = gl.getUniformLocation(prog, 'tela');
  var uT = gl.getUniformLocation(prog, 't');
  var uMouse = gl.getUniformLocation(prog, 'mouse');
  var mouse = [.5,.5], t0 = performance.now();

  cv.addEventListener('mousemove', function(ev){
    var r = cv.getBoundingClientRect();
    mouse = [(ev.clientX-r.left)/r.width, 1-(ev.clientY-r.top)/r.height];
  });
  function medir(){ cv.width = cv.clientWidth; cv.height = cv.clientHeight; gl.viewport(0,0,cv.width,cv.height); }
  medir();
  window.addEventListener('resize', medir);

  var parar = laco(card, function(){
    gl.uniform2f(uTela, cv.width, cv.height);
    gl.uniform1f(uT, (performance.now()-t0)/1000);
    gl.uniform2f(uMouse, mouse[0], mouse[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
  return function(){ parar(); window.removeEventListener('resize', medir); };
};
```

Performance: shader WebGL é o efeito mais custoso da lista em GPU — o código já faz fallback gracioso (`if(!gl)`) para gradiente CSS estático em placas sem WebGL, e usa o mesmo `laco` para pausar fora da viewport. Testar especialmente em mobile de entrada; considerar reduzir resolução do canvas (`cv.width`/`cv.height` menores que o `clientWidth`/`clientHeight` real, escalado via CSS) se o frame rate cair.
