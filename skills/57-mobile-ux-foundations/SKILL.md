---
name: mobile-ux-foundations
description: |
  Fundamentos ergonomicos, cromaticos e psicologicos de UX mobile — onde posicionar navegacao pela
  biometria do polegar, como implementar dark mode sem destruir legibilidade, como tratar tempo de
  espera pela percepcao e nao pelo relogio, e como desenhar login/onboarding sem fricção. Use ao
  decidir posicao de navegacao, criar tema escuro, tratar estados de carregamento longos, desenhar
  fluxo de autenticacao/passkey, ou pedir permissao de GPS/camera/notificacao.
  Trigger em: "thumb zone", "zona do polegar", "navegacao inferior", "bottom nav", "onde por o menu",
  "dark mode", "modo escuro", "tema escuro", "preto puro", "OLED", "skeleton", "spinner", "loading",
  "tempo de carregamento", "app parece lento", "passkey", "passwordless", "login sem senha",
  "webauthn", "biometria", "onboarding", "tutorial inicial", "pedir permissao", "permission priming",
  "haptic", "vibracao", "feedback tatil", "dynamic type", "escala de fonte", "zoom 200%",
  "texto ampliado", "fonte do sistema", "momento aha", "ativacao do usuario", "primeiro uso",
  "product tour", "tour guiado", "checklist de onboarding", "barra de progresso de onboarding",
  "usuario abandona no primeiro uso", "tela de boas-vindas", "walkthrough".
argument-hint: "[--focus=ergonomics|dark-mode|perceived-perf|auth|onboarding]"
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Mobile UX Foundations — Ergonomia, Cor, Percepcao e Entrada

Cobre as decisoes de UX mobile que antecedem o layout: onde a mao alcanca, como o olho le no escuro, como o cerebro mede espera, e como o usuario entra no app. Cada regra aqui vem de dado biometrico, fisiologico ou comportamental — nao de preferencia estetica.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md` e `policies/evals.md`.

Para tabelas completas de contraste, curvas de easing por caso e fluxos de recuperacao de passkey, consultar `docs/skill-guides/mobile-ux-foundations.md` apenas quando necessario.

Fronteira com skills vizinhas:
- **02-ui-ux-design** escolhe a ancora estetica e gera tokens — esta skill impoe as restricoes fisiologicas que os tokens tem de respeitar (contraste minimo, superficie base do dark mode)
- **56-responsive-conversion** conserta layout quebrado e converte web para mobile — esta skill decide *onde* o elemento deve morar antes da conversao, e cobre validacao de formulario e estados de espera
- **52-ui-polish** cuida do acabamento micro depois que estrutura e comportamento estao certos
- **06-security-review** e dona da seguranca do fluxo de auth (armazenamento de token, rotacao, ataque) — esta skill cobre so a camada de UX desse fluxo
- **22-accessibility-specialist** e dona do WCAG completo — esta skill aplica o recorte de contraste e alvo tatil que colide com mobile

## Quando Usar

- decidir posicao de navegacao primaria, FAB ou acao critica em tela mobile
- criar ou revisar tema escuro
- tratar estado de carregamento, especialmente acima de 1 segundo
- desenhar fluxo de login, cadastro ou recuperacao de conta
- desenhar onboarding, tutorial inicial ou pedido de permissao de sistema
- diagnosticar "o app parece lento" quando a metrica de servidor esta boa

## Quando Nao Usar

- corrigir layout que quebra ou nao ocupa a largura (isso e 56-responsive-conversion)
- escolher paleta, tipografia ou direcao visual do zero (isso e 02-ui-ux-design)
- auditar seguranca do backend de autenticacao — armazenamento de credencial, rotacao de token, superficie de ataque (isso e 06-security-review)
- definir sistema de motion tokens em escala (isso e 12-motion-design)

## Entradas Esperadas

- tela ou fluxo alvo, com plataforma (iOS, Android, PWA)
- ancora estetica e tokens ja definidos (skill 02), se existirem
- metricas reais de latencia, quando o assunto for percepcao de performance
- restricoes de auth ja decididas pelo backend (skill 03), quando o assunto for login

## Saidas Esperadas

- decisao de posicionamento justificada por zona ergonomica
- tokens de superficie e contraste do tema escuro, com racio verificado
- estrategia de estado de espera por faixa de duracao
- fluxo de auth/onboarding especificado, incluindo caminho de recuperacao
- checklist marcado

## 1. Ergonomia — Zona do Polegar

A mao e a primeira restricao de layout mobile, antes de qualquer decisao visual. Assumir que o usuario segura com duas maos e toca com o indicador e falso: cerca de **75% navegam com o polegar** e **~49% operam com uma mao so**.

O alcance do polegar divide a tela em tres faixas, com precisao medida:

| Zona | Onde | Precisao | Uso correto |
| --- | --- | --- | --- |
| **Natural** | Terco inferior | Quase total | Navegacao primaria, acao principal, CTA de conversao |
| **Confortavel** | Faixa central | ~84% | Conteudo, acoes secundarias |
| **Alongamento** | Terco superior e canto oposto | ~61% | Titulo, acao rara, acao destrutiva (o atrito aqui e desejavel) |

Consequencias diretas:

- **Navegacao primaria vai embaixo.** O menu hamburguer no canto superior esquerdo e heranca de desktop e ocupa a pior posicao ergonomica possivel da tela.
- **Acao destrutiva pode ficar no topo de proposito.** A dificuldade de alcance vira prevencao de erro — o unico caso em que a zona ruim e a escolha certa.
- **Item de bottom nav ocupa ~60-70px de largura** para separar alvos e evitar toque acidental entre abas vizinhas.
- **Canto superior oposto a mao dominante** e o ponto mais caro da tela: nunca colocar acao frequente ali.

### Gestos

Gesto reduz poluicao visual mas nao tem affordance — o usuario nao descobre sozinho. Regra: **todo gesto precisa de caminho equivalente visivel**, nunca ser a unica via para uma acao.

Limiares para nao disparar por engano durante scroll:

- Distancia minima: **80-120px** conforme densidade
- Velocidade minima: **200-250px/s**
- Tolerancia de angulo: **ate 25°** do eixo — acima disso, e scroll impreciso, nao swipe

Movimento vertical do polegar e mais natural que horizontal repetido. Swipe horizontal serve triagem rapida (arquivar, excluir); nao serve navegacao principal.

### Feedback tatil (haptics)

Mapear intensidade ao significado, nunca vibrar por vibrar:

| Evento | Padrao |
| --- | --- |
| Sucesso / confirmacao leve | Toque unico curto |
| Alerta / acao que exige atencao | Toque duplo perceptivel |
| Erro / rejeicao | Padrao grave e mais longo |
| Scroll, hover, navegacao comum | Nenhum — haptic constante vira ruido e consome bateria |

Respeitar a preferencia de sistema quando o usuario desativa vibracao.

## 2. Dark Mode — Fisiologia, nao inversao

O erro mais comum e inverter polos: `#FFFFFF` vira `#000000` e o texto vira branco puro. Isso quebra em tres frentes simultaneas:

1. **Halation (irradiacao).** Texto em luminancia maxima sobre ausencia total de luz faz as letras "sangrarem". Para quem tem astigmatismo — parcela grande da populacao — o texto borra e a leitura fica insustentavel em poucos minutos.
2. **Smearing em OLED.** Preto puro desliga o diodo. Ao rolar, o pixel precisa de tempo para reacender, deixando rastro fantasma no texto em movimento.
3. **Morte da elevacao.** Sem luz residual no fundo, sombra nao existe — e o modelo de profundidade em Z (modal sobre pagina, card sobre superficie) deixa de funcionar.

Por isso a superficie base do tema escuro e **cinza profundo, `#121212`**, nao preto puro. Ele preserva descanso visual, permite sombra, evita smearing e ainda entrega o ganho de bateria em OLED.

Preto puro fica restrito a: modo de economia extrema de bateria e consumo de midia em tela cheia (video, leitura imersiva).

### Elevacao no escuro

No claro, elevacao se expressa por sombra. No escuro, sombra some — elevacao se expressa por **superficie mais clara**: quanto mais alto o elemento na pilha Z, mais claro o fundo dele.

```css
--surface-0: #121212;  /* base */
--surface-1: #1e1e1e;  /* card */
--surface-2: #232323;  /* menu, dialog */
--surface-3: #282828;  /* modal, bottom sheet */
```

### Cor de marca e semantica no escuro

Cor saturada vibra e "queima" contra fundo escuro. Regra: **dessaturar e clarear** a versao escura de toda cor de marca e de estado.

| Estado | No claro | No escuro |
| --- | --- | --- |
| Erro | Vermelho saturado | Vermelho dessaturado, mais claro |
| Sucesso | Verde saturado | Verde suave |
| Alerta | Ambar forte | Ambar pastel |

Nunca reaproveitar o mesmo hex nos dois temas — o significado sobrevive, o valor nao.

### Contraste minimo (WCAG AA)

| Conteudo | Racio minimo |
| --- | --- |
| Texto corpo | **4.5:1** |
| Texto grande (>=18pt, ou >=14pt bold) e icone | **3:1** |
| Logo, texto decorativo | Isento |

Verificar racio nos **dois** temas — passar no claro nao garante passar no escuro.

### Tipografia que respeita o sistema (Dynamic Type)

Tamanho de fonte nunca e fixo em px. O usuario que aumentou o texto nas configuracoes do sistema — parcela grande e crescente — precisa ver o app inteiro acompanhar:

- Usar unidade que escala: `sp` (Android), Dynamic Type (iOS), `rem` na web. `px` fixo ignora a preferencia e e falha de acessibilidade, nao escolha estetica
- **Container tambem escala.** Altura fixa em botao ou card corta o texto ampliado; usar `min-height` com padding, deixando a altura crescer
- **Testar a 200% de zoom** e no maior passo de fonte do sistema. O layout tem de refluir sem scroll horizontal e sem texto truncado
- Acima de ~200%, layout de duas colunas deve colapsar em uma — o mesmo comportamento do breakpoint estreito

Reflow quebrado sob fonte ampliada e o mesmo bug de `min-width: auto` da skill 56, so que disparado pela preferencia do usuario em vez do tamanho da tela.

## 3. Performance Percebida

O gargalo raramente e o servidor: e a ansiedade de quem espera. Os limiares de percepcao sao fixos:

| Tempo | Percepcao | O que a UI deve fazer |
| --- | --- | --- |
| **ate 100ms** | Instantaneo — a acao "e" o toque | Feedback imediato no proprio controle (estado do botao) |
| **ate 1s** | Fluxo de pensamento intacto | Nada, ou feedback embutido; nao interromper |
| **1s a 10s** | Atencao comeca a vazar | **Skeleton screen** com a forma do conteudo final |
| **acima de 10s** | Abandono | Barra de progresso **determinada** (%) + opcao de cancelar/continuar em segundo plano |

### Skeleton em vez de spinner

Spinner concentra a atencao na propria espera — o usuario percebe a operacao como quase o dobro do tempo real. Skeleton mostra a **forma** do que vem, e o cerebro le como "quase pronto" em vez de "travado".

Regras:

- Skeleton espelha o layout final (mesmas dimensoes) — se nao espelha, causa layout shift na troca
- Animacao suave (pulse); nunca abaixo de ~300ms de exibicao, senao pisca e incomoda mais que ajuda
- Abaixo de 1s: nao mostrar nada. Flash de loader em operacao rapida e pior que ausencia
- Acima de 10s: skeleton ja nao basta — precisa de progresso real com percentual

Spinner continua valido em ponto pequeno e localizado (botao processando), nao como tela inteira de espera.

### Easing com fisica coerente

| Situacao | Curva | Por que |
| --- | --- | --- |
| Elemento entrando | `ease-out` | Chega rapido e freia — parece que "pousa" |
| Elemento saindo | `ease-in` | Comeca lento e acelera para fora |
| Loading ciclico | `linear` | Unico caso — rotacao continua sem atrito |

`linear` em transicao de UI parece mecanico e errado, porque nada no mundo fisico se move sem aceleracao.

### Rede instavel e o estado offline

Em mobile, perda de conexao e **estado normal**, nao excecao:

- Banner persistente e discreto quando offline — nao modal bloqueante
- Desabilitar (nao esconder) o que depende de rede, com motivo visivel
- Enfileirar acao do usuario e ressincronizar sozinho ao voltar
- Nunca perder dado digitado por queda de conexao

## 4. Autenticacao e Entrada

Login e o funil mais caro do app. Senha esquecida e causa direta de perda de usuario ativo, e regra de senha rigida piora seguranca em vez de melhorar.

### Passkeys como caminho primario

Passkey (WebAuthn/FIDO) troca segredo compartilhado por par de chaves: a privada nunca sai do dispositivo, o servidor guarda so a publica. Elimina phishing de credencial — nao ha o que digitar nem o que vazar.

Requisitos de UX do fluxo:

- **Passkey como primeira opcao visivel**, nao escondida atras de "outras formas de entrar"
- **Bootstrap key** — incentivar no onboarding o registro de um segundo fator/dispositivo, senao perder o aparelho vira bloqueio permanente
- **Warm handover** — nao remover a senha antiga no instante em que a passkey e criada; manter em segundo plano por ~30 dias enquanto a sincronizacao entre plataformas se prova
- **Sempre um caminho alternativo** — magic link por email ou OTP, para quem nao tem suporte a passkey ou perdeu o dispositivo

### Regras de senha, quando houver senha

Alinhado ao NIST SP 800-63B, contra a pratica antiga de matriz rigida:

| Fazer | Nao fazer |
| --- | --- |
| Minimo de 8 caracteres, aceitar frases longas | Exigir simbolo + numero + maiuscula obrigatorios |
| Bloquear senha em lista de vazamento conhecido | Forcar troca periodica sem indicio de comprometimento |
| Mostrar/ocultar senha com medidor de forca | Campo "confirmar senha" (aumenta erro, nao aumenta seguranca) |
| Permitir colar (gerenciador de senha) | Bloquear colagem "por seguranca" |

Regra draconiana empurra o usuario para senha previsivel ou anotada — piora o resultado real.

### Formulario que converte

- **Cada campo desnecessario derruba conversao.** Pedir telefone sem motivo claro e uma das maiores fontes de abandono
- **Label flutuante, nunca placeholder sozinho** — placeholder some ao digitar, quebra leitor de tela e deixa o usuario sem saber o que preencheu
- **Validacao inline**, no blur do campo, nao so no submit. Validar tudo de uma vez no final gera lista de erros dispersa e abandono
- **Erro nunca so por cor** — icone e texto junto, para daltonismo
- **Erro preserva o que foi digitado** — nunca limpar o formulario
- **`autocomplete` semantico + OTP lido do SMS** (`one-time-code`) para eliminar digitacao

Detalhes de teclado, `inputmode` e zoom do iOS ficam na skill 56.

## 5. Onboarding e Permissoes

### Contextual vence upfront

| Abordagem | Quando serve | Custo |
| --- | --- | --- |
| **Upfront** (carrossel antes de usar) | So quando o app e inutil sem configuracao previa | Alto abandono — barreira antes de qualquer valor |
| **Just-in-time / progressivo** | Padrao recomendado | Ensina no momento do uso, com retencao motora real |

Aprender fazendo fixa; ler tutorial antes de poder tocar, nao.

### O objetivo e o momento "aha", nao a tela de boas-vindas

Onboarding bem-sucedido nao e o usuario ver todas as telas — e ele **chegar na primeira vez que o produto entrega valor**. Duolingo comeca uma licao; Slack manda voce escrever uma mensagem. Ambos ensinam usando, nao explicando.

Regra de projeto: identifique a acao que representa esse momento (a "north-star action") e trate **cada tela antes dela como custo**. Carrossel de 5 slides de marketing e fricção posta antes de qualquer valor — e boa parte do abandono de primeiro uso acontece exatamente ai.

A skill 21 mede se esse momento foi atingido (`activation_reached`, `time_to_activate`); esta skill decide o caminho ate ele.

### Qual padrao usar

"Faca progressivo" nao diz **com que componente**. Cada padrao resolve um problema diferente:

| Padrao | Serve para | Nao serve para |
| --- | --- | --- |
| **Barra de progresso** | Fluxo **linear e finito** (cadastro em 3 passos) — reduz a ansiedade de "quanto falta" | Tarefa opcional ou sem ordem definida; barra que nunca completa vira divida visivel |
| **Checklist** | Tarefas **independentes**, feitas fora de ordem e ao longo do tempo ("conecte o banco", "convide alguem") | Fluxo obrigatorio sequencial — vira lista de dever de casa |
| **Mensagem de boas-vindas** | Dar contexto em 1 tela e sair do caminho | Substituir a descoberta do produto; nao ensina nada sozinha |
| **Product tour** | Interface densa cuja estrutura nao e obvia | App simples — tour aqui e ruido. **Sempre pulavel, em qualquer passo** |
| **Persona-based** (pergunta antes de entrar) | Quando a resposta **muda de verdade** a experiencia (template, conteudo, limites) | Coletar dado de marketing disfarcado de personalizacao — o usuario percebe |

Combinacoes funcionam: persona-based curto definindo o setup, depois checklist para o resto. O erro e empilhar tudo.

**Nao existe onboarding "pronto".** Ele evolui com o produto e deve ser medido: onde o usuario para, quanto tempo leva ate a acao de ativacao, quantos pulam. Sem isso, onboarding vira decoracao com opiniao.

### Permission priming

Nunca disparar o dialogo nativo de permissao na abertura do app. Negacao e quase sempre definitiva — e recuperar exige mandar o usuario para as configuracoes do sistema.

Sequencia correta:

1. Usuario aciona algo que **precisa** da permissao
2. Tela propria explica **o beneficio concreto** ("para achar lojas perto de voce")
3. So entao dispara o dialogo do sistema
4. Se negar, seguir funcionando com o caminho alternativo — nunca travar o app

### Ajuda e FAQ

Ajuda mora dentro do fluxo — painel expansivel, bottom sheet, tooltip contextual. Jogar o usuario num site externo no meio de uma tarefa quebra o contexto e raramente traz ele de volta.

## Anti-Padroes

- Navegacao primaria no topo da tela em app mobile
- Gesto como unico caminho para uma acao, sem equivalente visivel
- `#000000` como superficie base do tema escuro
- Mesmo hex de cor de marca nos dois temas
- Sombra como recurso de elevacao no escuro (usar superficie mais clara)
- Spinner de tela cheia em espera de 1-10s (usar skeleton)
- Loader que pisca em operacao abaixo de 1s
- Progresso indeterminado em espera acima de 10s
- `linear` em transicao de entrada/saida de UI
- Modal bloqueante para avisar que caiu a conexao
- Passkey escondida atras de "outras opcoes de login"
- Remover a senha no mesmo instante em que a passkey e criada, sem periodo de transicao
- Campo "confirmar senha"; bloquear colagem no campo de senha
- Placeholder no lugar de label
- Validar formulario inteiro so no submit
- Dialogo nativo de permissao na abertura do app, sem contexto
- Carrossel de slides de marketing antes do usuario poder tocar em qualquer coisa
- Product tour sem botao de pular visivel em todos os passos
- Barra de progresso em fluxo que nao tem fim definido — vira divida visivel
- Checklist para etapa obrigatoria e sequencial (vira dever de casa, nao guia)
- Perguntar dado de personalizacao que nao muda nada na experiencia
- Onboarding sem instrumentacao — sem saber onde o usuario para, e opiniao com tela
- Haptic em scroll ou navegacao comum

## Checklist

Ergonomia:
- [ ] Navegacao primaria e CTA principal na zona natural (terco inferior)
- [ ] Acao destrutiva fora do alcance facil, de proposito
- [ ] Item de bottom nav com largura suficiente para separar alvos
- [ ] Todo gesto tem caminho visivel equivalente
- [ ] Haptic mapeado por significado, respeitando preferencia do sistema

Dark mode:
- [ ] Superficie base `#121212` ou equivalente, nunca preto puro
- [ ] Elevacao por superficie mais clara, nao por sombra
- [ ] Cores de marca e de estado dessaturadas na versao escura
- [ ] Contraste 4.5:1 (corpo) e 3:1 (texto grande/icone) verificado **nos dois temas**
- [ ] Fonte em unidade que escala (`sp`/`rem`/Dynamic Type), nunca `px` fixo
- [ ] Container com `min-height` em vez de altura fixa, para nao cortar texto ampliado
- [ ] Testado a 200% de zoom e no maior passo de fonte do sistema, sem scroll horizontal

Percepcao:
- [ ] Feedback de toque em ate 100ms
- [ ] Skeleton (nao spinner) entre 1s e 10s, espelhando o layout final
- [ ] Nada de loader abaixo de 1s
- [ ] Progresso determinado acima de 10s, com saida (cancelar/segundo plano)
- [ ] `ease-out` entrando, `ease-in` saindo, `linear` so em loop
- [ ] Offline tratado como estado, com fila e ressincronizacao

Entrada:
- [ ] Passkey em primeiro plano, com caminho alternativo
- [ ] Bootstrap key incentivada; senha antiga mantida no periodo de transicao
- [ ] Regras de senha alinhadas ao NIST (sem matriz rigida, sem confirmar senha, colagem permitida)
- [ ] Label flutuante; validacao inline no blur; erro com icone + texto
- [ ] `autocomplete` semantico e OTP automatico

Onboarding:
- [ ] Onboarding contextual em vez de carrossel bloqueante
- [ ] Acao de ativacao ("momento aha") identificada por nome
- [ ] Cada tela antes dela justificada — o resto e fricção posta antes do valor
- [ ] Padrao escolhido pelo tipo de tarefa (barra = linear finito; checklist = independente)
- [ ] Product tour, se existir, pulavel em qualquer passo
- [ ] Pergunta de personalizacao muda a experiencia de verdade — nao e coleta disfarçada
- [ ] Permission priming antes de todo dialogo nativo
- [ ] App continua util quando a permissao e negada
- [ ] Ajuda acessivel dentro do fluxo
- [ ] Onboarding instrumentado: onde para, tempo ate ativacao, taxa de pulo (skill 21)

## Evidencia de Conclusao

- decisao de posicionamento com a zona ergonomica citada
- racio de contraste medido e registrado nos dois temas
- estrategia de espera declarada por faixa de duracao
- fluxo de auth com caminho de recuperacao explicito
- checklist marcado, com item nao aplicavel justificado

## Handoff

### Recebe de

- **02-ui-ux-design** — ancora estetica e tokens base
- **01-po-feature-spec** — fluxo e criterio de aceite

### Entrega para

- **56-responsive-conversion** — executa o layout respeitando as zonas e estados definidos aqui
- **04-frontend-integration** — implementa estados de carregamento, formulario e fluxo de auth
- **06-security-review** — valida a camada de seguranca do fluxo de auth desenhado aqui
- **22-accessibility-specialist** — auditoria WCAG completa alem do recorte de contraste/alvo
- **05-qa-testing** — testa fluxo de auth, estados offline e recuperacao de conta

## Regra de Codigo Limpo

Valor que parece arbitrario merece uma linha de comentario: `#121212`, o limiar de 100ms, os 30 dias de warm handover. Classe utilitaria autoexplicativa, nao.

## Fontes

- Zona do polegar e distribuicao de aderencia: pesquisa de campo de Steven Hoober sobre uso real de dispositivos moveis.
- Alvo tatil, grade de 8dp e escala tipografica: Material Design 3 (Google) e Human Interface Guidelines (Apple).
- Limiares de tempo de resposta (0.1s / 1s / 10s): heuristicas de tempo de resposta de Jakob Nielsen (Nielsen Norman Group).
- Validacao inline e desenho de formulario: trabalho de Luke Wroblewski sobre usabilidade de formularios.
- Racios de contraste: WCAG 2.1/2.2 nivel AA (W3C).
- Regras de senha e autenticacao: NIST SP 800-63B; passkeys conforme W3C WebAuthn e FIDO Alliance.

## Integracao com Pipeline

- **Orquestrador (skill 09):** aciona esta skill no inicio do desenho mobile, antes do layout ser implementado
- **UI/UX Design (skill 02):** dona da ancora estetica; esta skill impoe as restricoes fisiologicas que os tokens respeitam
- **Responsive Conversion (skill 56):** executa layout e conversao dentro das zonas definidas aqui
- **Security Review (skill 06):** dona da seguranca do auth; esta skill cobre so a UX do fluxo
- **Accessibility (skill 22):** dona do WCAG completo
- **Context Manager (skill 08):** rastreia progresso por fluxo/tela
