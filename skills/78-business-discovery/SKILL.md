---
name: business-discovery
description: |
  Skill de entrevista guiada com dono de negócio não-técnico para mapear as ferramentas que ele já
  usa (planilha, Shopify, WhatsApp, e-mail) e gerar um mapa visual de dados (HTML self-contained com
  Sankey interativo), uma lista de oportunidades priorizadas, e um plano de 30 dias do que automatizar
  primeiro. Cobre 9 arquétipos de negócio (e-commerce, SaaS, serviços profissionais, clínica, consultoria
  financeira, criador de conteúdo, restaurante multi-unidade, corretora imobiliária, prestador de serviço
  local). Nunca usa jargão técnico com o operador — traduz tudo inline. Audita `.claude/` existente antes
  de perguntar, pra não re-perguntar o que já foi construído.
  Trigger em: "mapear minhas ferramentas", "o que eu deveria automatizar primeiro",
  "meu negócio usa planilha e whatsapp", "entrevista com o dono", "mapa de dados do meu negócio",
  "por onde eu começo a automatizar", "auditoria de ferramentas", "dono de negócio sem programador",
  "arquétipo de negócio", "pantry prep plate", "plano de 30 dias pra automatizar".
allowed-tools: Read, Grep, Glob, Write, Bash(python *), Bash(python3 *)
metadata:
  argument-hint: "[arquétipo | --audit | --resume]"
---

# Business Discovery — Mapa de Ferramentas Antes de Qualquer Código

Entrevista um dono de negócio não-técnico sobre as ferramentas que ele já usa no dia a dia (planilha, WhatsApp, Shopify, e-mail) e transforma isso num mapa de dados claro mais uma lista, em português simples, do que vale a pena automatizar primeiro. A saída é um HTML autocontido e um markdown de oportunidades, na pasta de trabalho do operador.

**A tese central: 80% de montar automação pra um negócio é organizar os dados e as ferramentas de trás do balcão. 20% é a camada de IA em cima.** Esta skill é o 80%.

**Fronteira com skill 51 (UX Research):** a 51 faz discovery de *usuário e problema de produto* — entrevista para entender pra quem construir e por quê, antes de especificar uma feature. Esta skill faz discovery de *ferramentas e dados de um negócio existente* — entrevista para mapear o que já existe e decidir o que automatizar primeiro, antes de qualquer feature ou spec entrar em cena. A 78 roda **antes** da 01 (po-feature-spec) quando o cliente é um dono de negócio sem repositório de código ainda, não um time de produto com backlog.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/anti-ai-writing.md`.

**Regras rígidas (não-negociáveis):**

- **Português simples, sem jargão.** Traduzir todo termo técnico embutido na frase. Se o operador não consegue visualizar a resposta no negócio real dele, a pergunta está errada.
- **Nunca perguntar em formato de schema.** Dono de negócio não pensa em `formato`, `frequência`, `volume`, `status de exportação`. Perguntar pelo resultado ("quantos pedidos você tem por semana?") e derivar o schema em silêncio a partir de `references/tool_defaults.md`.
- **Sem "Ótima pergunta!" / "Fico feliz em ajudar" / vocabulário de consultoria vazio** na fala voltada ao operador.
- **Auditar antes de perguntar.** Se `.claude/` já existe, ler primeiro e pular perguntas sobre o que já foi construído.
- **Só rascunho.** Nunca escrever direto no `.claude/` do usuário — a saída é um mapa e uma lista de oportunidades; a execução fica para a skill/pipeline de construção que o usuário escolher depois (esta skill entrega, não implementa).
- **Confirmar-editar, não inventar sozinho.** Puxar templates de partida de `references/recipe_templates.md` e `references/setup_priority_template.md`. Ler cada um ao operador e perguntar se cabe no mundo dele. Nunca entregar página em branco.

## Quando Usar

- dono de negócio não-técnico quer saber por onde começar a automatizar
- negócio já usa várias ferramentas soltas (planilha, WhatsApp, Shopify, e-mail) sem visão unificada
- antes de qualquer trabalho de especificação de feature (skill 01), quando o cliente ainda não tem repositório de código
- quando o pedido é "audita minhas ferramentas" ou "o que eu deveria construir primeiro", vindo de quem não é desenvolvedor

## Quando Nao Usar

- discovery de usuário/problema de produto dentro de um time que já tem repositório e backlog — isso é `skills/51-ux-research/SKILL.md`
- o cliente já sabe exatamente qual feature quer e só precisa de spec — vai direto pra `skills/01-po-feature-spec/SKILL.md`
- auditoria técnica de um repositório de código existente (stack, convenções, testes) — isso é `skills/18-repo-auditor/SKILL.md`
- o pedido é implementar a automação em si, não mapear o que automatizar — depois do mapa pronto, a implementação segue o pipeline normal do kit (09-orchestrator decide os próximos passos)

## Entradas Esperadas

- acesso conversacional a um dono de negócio (ou a pessoa respondendo em nome dele)
- pasta de trabalho onde o mapa e a lista de oportunidades serão salvos
- se já existir `.claude/` na pasta, ele é lido e usado pra pular perguntas redundantes

## Saidas Esperadas

Tudo em `business_discovery_output/`:

- `mapa_dados.html` — visualização autocontida em 4 abas (o que você tem hoje, fluxo de dados via Sankey interativo, o que vamos construir, plano de 30 dias)
- `mapa_dados.json` — dado canônico por trás do HTML, reutilizável por outra ferramenta
- `OPORTUNIDADES.md` — lista priorizada do que automatizar primeiro, agrupada por tipo de trabalho, com glossário de termos no rodapé
- `prompt_handoff.txt` — prompt pronto para colar numa sessão de implementação (orchestrator, skill 09, ou outro agente que o usuário escolher)

## Protocolo

### Estágio 0 — Auditoria silenciosa (antes de qualquer pergunta)

```bash
python3 scripts/audit_pasta_existente.py
```

Retorna JSON do que já existe: `.claude/CLAUDE.md`, skills, agents, rules, `data/`, saídas de rodadas anteriores desta skill. Ramifica:

- **greenfield** — nada disso existe. Rodar a entrevista completa.
- **auditoria-existente** — pelo menos um item existe. Reconhecer o que foi achado e pular perguntas sobre aquilo.

### Estágio 1 — Saudação e escolha de ritmo

> Oi. Cerca de 80% de montar um sistema de automação pro seu negócio é só organizar seus dados primeiro. A parte de IA em cima é o 20% mais fácil. Essa conversa mapeia suas ferramentas e te diz o que construir, em ordem.
>
> Dois caminhos. **Completo** (~30 minutos, eu explico cada escolha em português simples pra você entender o que estamos mapeando). **Rápido** (~10 minutos, eu assumo que você já conhece bem suas ferramentas e vou direto ao ponto). Qual prefere?

Padrão: completo, se não houver resposta.

Se `auditoria-existente`:

> Percebi que você já começou a construir algo. Encontrei [listar em português simples]. Não vou perguntar de novo sobre isso, só vou completar o que falta.

### Estágio 2 — Arquétipo de negócio

Perguntar:

> Descreve seu negócio em 1-2 frases. Só o que você faz e como ganha dinheiro.

Cruzar com um arquétipo de `references/arquetipos.md`:

1. `ecommerce` — vende produto físico/digital via loja online
2. `saas` — assinatura de software recorrente
3. `servicos_profissionais` — hora faturável (advocacia, contabilidade, consultoria)
4. `clinica_saude` — prática regulada com atendimento a paciente
5. `consultoria_financeira` — assessoria de investimento boutique, fundo, family office
6. `criador_conteudo` — newsletter, YouTube, podcast, curso
7. `restaurante_multiunidade` — operação de food service com mais de uma unidade
8. `corretora_imoveis` — corretor autônomo ou pequena equipe
9. `prestador_servico_local` — serviço de campo (elétrica, encanamento, jardinagem, limpeza)

Se não ficar claro, marcar como `outro` e fazer 2-3 perguntas abertas sobre como ganha dinheiro e como é o dia a dia.

Confirmar em português simples, nunca no slug técnico. Perguntar: *"Pelo que entendi, seu negócio é [versão em português simples]. Faz sentido, ou é diferente disso?"*

### Estágio 3 — Ferramentas do dia a dia (nunca perguntar em formato de schema)

Abrir `references/biblioteca_perguntas.md` e puxar a cadeia de perguntas do arquétipo identificado. Cada pergunta é desenhada em torno do que o operador **usa**, não do formato dos dados dele.

Para cada ferramenta que o operador citar:

1. **Consultar `references/tool_defaults.md`.** Esse arquivo tem os padrões por ferramenta de `formato`, `frequência`, `volume`, `métodos de conexão`, `skill_cli`. Usar esses valores em silêncio. Se a ferramenta não estiver listada, usar `formato=API`, `frequência=sob demanda`, `volume=baixo`, e sinalizar como oportunidade de escrever uma skill nova.
2. **Cruzar com `references/inventario_cli.md`** pra ver se já existe um CLI ou skill que cobre aquilo. Se sim, marcar como "já conectado".
3. **Marcar `paga_sem_usar = true`** se o operador voluntariamente disser que paga por uma ferramenta cujos dados quase nunca olha.

Nunca perguntar sobre `formato`, `frequência`, `volume`, `status de exportação`, ou qualquer coisa que pareça coluna de banco de dados. Se precisar de volume, perguntar "quantos pedidos/clientes/tickets por semana" e mapear internamente.

Depois da cadeia, uma pergunta de fechamento:

> Qual é a coisa mais chata e mais repetida que você faz toda semana e adoraria tirar do seu prato?

Guardar a resposta — ela ancora a escolha de receitas no Estágio 6.5.

### Estágio 4 — Auditoria de automação existente

> Você já usa Claude Code ou alguma IA no negócio? Sim, não, ou parcialmente?

Se sim/parcial: confirmar a detecção do Estágio 0, perguntar quais automações já existem.

> Que outra automação já roda hoje? Algum fluxo no Zapier, tarefa agendada, script que um desenvolvedor fez? Até um Zap conta.

(Não usar "cron job" ou "script manual" — são jargão de dev. "Tarefa agendada" é o termo certo aqui.)

### Estágio 5 — Checagem de realidade de engenharia de dados

Para cada ferramenta com volume alto (conforme `tool_defaults.md`), disparar a dica correspondente de `references/dicas_engenharia_dados.md`, em português simples. Exemplos:

- **Pedidos de e-commerce em alto volume:** "Seis meses de pedidos da Shopify são dezenas de milhares de linhas. Vamos planejar um resumo semanal, assim o agente lê 26 linhas em vez de 60 mil."
- **Acervo não estruturado (conteúdo antigo, pastas de processo):** "Seu conteúdo antigo vale ouro mas está em PDF/Word. Vamos montar uma conversão automática pra virar texto que o agente consegue ler."
- **Dado regulado (prontuário, processo jurídico):** "Esse dado não pode sair do seu ambiente. Vamos usar regras que restringem por pasta, então o agente literalmente não consegue ler fora do limite certo."

Nunca dar aula. Cada dica é uma frase mais uma recomendação.

**Glossário obrigatório na primeira menção de cada termo:**
- `conversão automática` → "um scriptzinho que roda quando o Claude começa, transforma arquivo bagunçado em texto legível"
- `resumo semanal` (silver platter) → "um arquivo de resumo que o Claude escreve pra você toda semana"
- `agente especialista` (subagent) → "um funcionário especializado pra quem o Claude direciona perguntas"
- `regra por pasta` (path-scoped rule) → "uma trava que só vale dentro de uma pasta específica"
- `MCP` → "uma ponte pronta pra um serviço"
- `log de auditoria` → "uma lista de tudo que o Claude fez"

Depois do primeiro uso com glossário, pode usar o termo direto.

### Estágio 6 — Montar Pantry / Prep / Plate

Montar o esqueleto JSON do mapa de dados em memória. O schema que o renderizador espera é mais amplo do que foi coletado até aqui — **completar o resto nos Estágios 6.5, 6.6, 6.7.**

```json
{
  "negocio": {
    "nome": "...",
    "arquetipo": "...",
    "resumo_stack": "Resumo de uma linha, em português simples, do que ele usa hoje",
    "titulo": "Nome-do-operador, aqui está como suas ferramentas conversam hoje e o que corrigir primeiro.",
    "introducao": "Três seções abaixo. Despensa é seu dado bruto. Bancada de preparo são os resumos semanais que o Claude monta pra você. Prato é o que chega até você. Clique em qualquer card pra ver em português simples."
  },
  "despensa": [],
  "bancada_preparo": [],
  "prato": [],
  "oportunidades": [],
  "receitas": [],
  "prioridade_setup": [],
  "camada_interacao": []
}
```

Compor `negocio.titulo` e `negocio.introducao` automaticamente a partir do nome e arquétipo — não pedir ao operador pra escrever o próprio título.

**Auto-derivações que o Estágio 6 deve fazer em silêncio (nunca perguntar ao operador):**

Para cada item de `despensa`:
- `volume_amigavel`: string em português simples construída a partir dos números de escala que o operador voluntariou. Exemplos: "18 mil assinantes", "~80 vendas/mês", "~100 pedidos/semana". Se não voluntariou número, cair pro valor padrão de `volume`: alto → "Volume alto", médio → "Fluxo constante", baixo → "Bem esporádico".
- `metodos_conexao`: copiar de `tool_defaults.md`. Se a ferramenta não estiver lá, marcar como oportunidade de escrever skill nova.
- `paga_sem_usar`: só marcar true se o operador voluntariou explicitamente "pago mas não uso".

Para cada item de `bancada_preparo` (resumo semanal):
- `nome_exibicao`: versão legível do nome do arquivo. `financeiro_semanal_<semana>.md` → "Resumo financeiro semanal".
- `conteudo_exemplo`: rascunhar 3-5 linhas de markdown que mostrem o que esse resumo realmente conteria PARA ESTE operador. Usar as ferramentas dele pelo nome. Nunca deixar em branco.

Para cada item de `prato` (entrega final):
- `agente_amigavel`: versão humana do agente. "Bot financeiro" → "seu assistente financeiro".
- `saida_exemplo`: rascunhar um trecho curto de markdown do resumo real, com números do operador.

### Estágio 6.5 — Receitas (os resumos que o Claude vai escrever pra ele)

Abrir `references/recipe_templates.md` e puxar as 4-7 receitas de partida do arquétipo identificado. Para CADA receita de partida, rodar este ciclo curto com o operador:

> Aqui está uma que eu recomendo: **[título da receita]**. ([tempo economizado por semana]). Hoje, na mão: [como ele faz isso manualmente]. Com isso funcionando, na segunda-feira que vem: [o que muda]. Faz sentido pro seu mundo?
>
> - Sim: confirmar e adicionar ao mapa
> - Não: pular
> - Ajustar: perguntar "o que você mudaria?" e editar o texto

Depois da lista de partida, perguntar:

> Tem mais alguma coisa que você faz toda semana e queria que rodasse sozinha? Uma frase já basta.

### Estágio 6.6 — Prioridade de setup (o plano de 30 dias)

Abrir `references/setup_priority_template.md`. Percorrer o esqueleto universal de 5 passos com o operador:

1. **Conversão automática** ("fazer o Claude ler seus arquivos bagunçados")
2. **Resumos semanais** (montar os resumos a partir das ferramentas dele)
3. **Orquestrador + especialistas** (um chefe de gabinete mais 3-4 bots de domínio)
4. **Log de auditoria + aprovação** (a camada de confiança)
5. **Comandos rápidos** (atalhos de um clique pras rotinas semanais dele)

Para `clinica_saude` e `servicos_profissionais`, inserir um passo de ambiente regulado (hospedagem que mantém o dado dentro do ambiente do cliente) na posição 1 e renumerar. Para `clinica_saude`, incluir também um passo de restrição por tipo de dado sensível na posição 6.

### Estágio 6.7 — Camada de interação (onde ele lê os resumos)

> Última pergunta do sistema. Onde você realmente quer LER esses resumos? WhatsApp, e-mail, seu tablet de manhã, outro lugar? Pode escolher mais de um.

Para cada canal citado, sugerir proativamente 1-2 canais que ele não citou, com a razão explicada em uma frase — nunca só "adicione X" sem dizer por quê.

### Estágio 7 — Renderizar o HTML

```bash
python3 scripts/renderizar_mapa.py \
  --input business_discovery_output/mapa_dados.json \
  --output business_discovery_output/mapa_dados.html
```

O HTML tem 4 abas: **o que você tem hoje** (cards de Despensa/Bancada/Prato), **fluxo de dados** (Sankey de 4 colunas), **o que vamos construir** (cards de receita com selo de tempo economizado), **seu plano de 30 dias**.

### Estágio 8 — OPORTUNIDADES.md

Renderizar agrupado por tipo de trabalho (engenharia de dados primeiro, depois skills a escrever, agentes a montar, automações a conectar, ferramentas prontas pra instalar). **Sempre incluir o glossário no rodapé.**

### Estágio 9 — Prompt de handoff

Renderizar `prompt_handoff.txt` pré-preenchido com o mapa completo, pronto pra colar numa sessão de implementação com o orchestrator (skill 09) ou o agente que o usuário escolher.

### Estágio 9.5 — O ramo "eu não tenho desenvolvedor"

Depois de renderizar o handoff, perguntar explicitamente:

> Uma última coisa. Olhando o plano de 30 dias, o passo 1 precisa de alguém confortável com linha de comando pra instalar algumas ferramentas. Você se sente confortável com isso, ou prefere passar isso pra alguém que seja?

Três respostas válidas, três encaminhamentos diferentes:

1. **"Eu mesmo faço."** Seguir pro Estágio 10 normalmente.
2. **"Tenho um desenvolvedor/TI."** Na confirmação do Estágio 10: *"Encaminha o `prompt_handoff.txt` pro seu desenvolvedor. Ele cola numa sessão nova e o orchestrator guia a construção. Tempo total: 1-2 dias pra um desenvolvedor competente."*
3. **"Não tenho ninguém."** Adicionar um quinto arquivo: `contratar_freelancer.md`, com um anúncio pronto pra postar em plataforma de freelancer, faixa de orçamento estimada, e a lista de habilidades que a pessoa precisa ter.

Esse ramo é obrigatório para `restaurante_multiunidade`, `prestador_servico_local`, e qualquer operador que se identifique como não-técnico.

### Estágio 10 — Tela de confirmação

> Montei quatro coisas na pasta `business_discovery_output/`:
>
> 1. **`mapa_dados.html`** — o mapa visual. 4 abas. Abre no navegador.
> 2. **`mapa_dados.json`** — o dado bruto. Passa pra um desenvolvedor ou cola em outra ferramenta.
> 3. **`OPORTUNIDADES.md`** — a lista priorizada do que construir, em ordem.
> 4. **`prompt_handoff.txt`** — o prompt pronto pra colar na próxima sessão de implementação.
>
> Quer que eu explique alguma parte em português simples? Quer entregar isso pra começar a construir agora?

## Modos

### `/business-discovery` (sem argumento)

Entrevista completa padrão. Detecta setup existente e ramifica.

### `/business-discovery --audit`

Pula a escolha de ritmo. Auditoria somente-leitura da pasta atual. Reporta "o que existe, o que falta" sem fazer perguntas.

### `/business-discovery --resume`

Procura `business_discovery_output/mapa_dados.json` na pasta atual e continua de onde a última entrevista parou.

### `/business-discovery <arquétipo>`

Pula o reconhecimento de arquétipo. Vai direto pra cadeia de perguntas.

Válidos: `ecommerce` / `saas` / `servicos_profissionais` / `clinica_saude` / `consultoria_financeira` / `criador_conteudo` / `restaurante_multiunidade` / `corretora_imoveis` / `prestador_servico_local`

## Anatomia da Saída

```
business_discovery_output/
├── mapa_dados.json          # dado canônico completo
├── mapa_dados.html          # visualização autocontida de 4 abas
├── OPORTUNIDADES.md         # lista priorizada com glossário no rodapé
└── prompt_handoff.txt       # prompt pronto pra próxima sessão
```

## Regras de Voz

- Português simples. Traduzir jargão embutido na frase.
- Liderar com a ação/resposta/resultado, depois a razão, depois a recomendação.
- Bullets, não parágrafos longos.
- Sem "Ótima pergunta!" / "Fico feliz em ajudar" / "Deixa eu pensar...".
- Usar as palavras reais do negócio do operador de volta pra ele ("seu plano Whale", "sua call de terça").
- Tranquilizar sobre volume de dados — a maioria dos operadores fica preocupada com isso. O padrão de resumo semanal resolve.
- "Eu não tenho isso" é sempre uma resposta válida e de primeira classe pra qualquer pergunta "onde vive X". Nunca forçar o operador a escolher uma ferramenta quando a resposta honesta é "ainda não tenho sistema pra isso".

## Anti-Padroes

- perguntar em formato de schema (`formato`, `cadência`, `volume`) em vez de resultado ("quantos pedidos por semana")
- usar jargão técnico sem tradução na primeira menção
- pular a auditoria do Estágio 0 e re-perguntar o que já foi construído
- escrever direto no `.claude/` do usuário em vez de entregar rascunho
- entregar página em branco pro operador preencher em vez de puxar template de partida e confirmar/editar
- ignorar "eu não tenho isso" como resposta válida, insistindo que ele escolha uma ferramenta

## Evidencia de Conclusao

- `business_discovery_output/mapa_dados.html` gerado e abre sem erro
- `OPORTUNIDADES.md` com glossário no rodapé
- `prompt_handoff.txt` pronto pra colar numa sessão de implementação
- se o operador se identificou como não-técnico, o ramo do Estágio 9.5 foi seguido até o fim

## Handoff

### Recebe de

- Nenhuma skill upstream formal — geralmente é o ponto de entrada quando o cliente é dono de negócio sem repositório de código ainda

### Entrega para

- **Orchestrator (09)** — recebe `prompt_handoff.txt` para decidir o pipeline de implementação
- **PO Feature Spec (01)** — quando uma receita específica do mapa vira feature formal a especificar
- **Repo Auditor (18)** — se o cliente já tiver algum código, complementa com auditoria técnica depois do mapa de negócio pronto

Seguir `policies/handoffs.md`.

## Integracao com Pipeline

- **Orchestrator (09):** ponto de entrada alternativo ao fluxo padrão — quando o cliente ainda não tem repositório, esta skill roda antes de qualquer outra
- **PO Feature Spec (01):** consumidor natural — cada receita confirmada no mapa pode virar uma spec formal

## Fontes

Estrutura e conceito (entrevista com dono de negócio não-técnico, mapa Pantry/Prep/Plate, arquétipos de negócio, receitas com tempo economizado, plano de 30 dias) inspirados no `/silver-platter` do "Perfect Agentic OS Kit" de Mark Kashef, distribuído via Gumroad em modelo pague-o-quanto-quiser (a partir de CAD$0) sem licença SPDX declarada — por isso todo o texto, exemplos, perguntas por arquétipo e scripts desta skill foram escritos do zero, em português, na estrutura própria deste kit, sem copiar prosa ou código do material original.
