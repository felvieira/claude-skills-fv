# Evidência visual e movimento

## Comparar antes e depois

Para cada rota pertinente, registre viewport, tema, conteúdo e estado iguais nas duas versões. Capture a primeira dobra e as seções necessárias; interaja com menu, formulário ou estado antes de capturá-lo. Observe as imagens e relate o que elas mostram. Uma captura não demonstra funcionamento, acessibilidade completa ou uso em um aparelho real.

Em páginas com carregamento tardio ou entrada ao rolar, percorra a página, aguarde os elementos assentarem e examine as seções. Capturas de viewport ao longo da página podem complementar a imagem inteira quando esta omite conteúdo; cabeçalhos fixos e animações ainda podem produzir diferenças. Se a página tiver conteúdo infinito ou não carregar, anote o limite e o que ficou fora.

Para aplicações locais sem login, com Playwright e Chromium já disponíveis no projeto, use opcionalmente este comando a partir da raiz do kit:

```sh
node skills/92-design-director/scripts/capture-ui.mjs --url http://127.0.0.1:3000/ --out ./qa/captura-inicial --width 1440 --height 900
```

Em instalação `.bot/`, use `.bot/skills/92-design-director/scripts/capture-ui.mjs`. Em plugin global, use o caminho absoluto do arquivo na instalação do host; execute no diretório do projeto que fornece Playwright.

Repita depois em outra pasta, usando o mesmo viewport e estado. O comando não inicia servidores, não reutiliza sessões ou cookies e aceita apenas URLs HTTP(S) locais. Ele permite somente GET e HEAD da origem informada, bloqueia redirecionamentos e WebSockets e registra os bloqueios. GET não garante ausência de efeitos colaterais em uma aplicação: use ambiente de teste com dados sintéticos. Os bloqueios podem impedir fontes, imagens, APIs ou dados e alterar o resultado. Requer uma versão do Playwright com `routeWebSocket`. Uma página ativa continua executando código: use apenas aplicação confiável. Não use capturas com credenciais ou dados pessoais; a ferramenta não é um ambiente de isolamento para código malicioso.

O resultado contém a página inteira quando couber no limite, fatias numeradas, e um manifesto com viewport, posições, bloqueios e truncamento. Confira a captura: listas virtualizadas, elementos fixos, animações e canvas podem não ser representados fielmente. Não confunda viewport de celular com teste em dispositivo real. Para fluxos autenticados ou aplicativos que dependam de recursos externos, use o navegador permitido pelo ambiente com os controles apropriados.

## Perfil de movimento

Quando houver custo de animação, registre a rota e observe topo, meio, fim e largura móvel pertinente. Identifique loops de `requestAnimationFrame`, CSS, canvas, timers e recursos que continuam ativos fora da área visível; diferencie medições de hipóteses. Pause ou simplifique o que não precisa rodar, permita retomada ao reaparecer e limpe listeners e observers. Verifique que o conteúdo, teclado, toque e `prefers-reduced-motion` continuam funcionando. Compare medições sob condições equivalentes; não declare ganho de desempenho sem dados.

Na captura local, acrescente `--motion` para registrar por fatia os estados de animações expostos por `document.getAnimations()`, a posição geométrica dos alvos e uma amostra ao voltar ao topo. Compare a mesma animação nos trechos visível, fora da tela e na volta. O relatório limita a lista a 30 alvos por posição e informa quantos foram omitidos. Ele cobre animações CSS e Web Animations expostas ao DOM, não mede CPU/GPU e não encontra loops JavaScript, canvas ou WebGL; o estado `running` é o estado declarado pela API, não prova de trabalho por quadro. Inspecione esses outros mecanismos separadamente.
