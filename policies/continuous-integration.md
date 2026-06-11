# Continuous Integration Policy

> **Fonte:** *eXtreme Programming — práticas para o dia a dia* (Casa do Código), cap. 20 "Integração contínua" e cap. 16 "Padrão de codificação". Citação-âncora — Martin Fowler: *"Integração contínua não livra os bugs, mas os torna dramaticamente mais fáceis de encontrar e remover."*

## Princípio

O código de todo o time é integrado, versionado, construído e verificado **várias vezes ao dia**, num branch único — o trunk. Cada integração dispara um build com testes automatizados que detecta erros o mais cedo possível. IC é **mais atitude que ferramenta**: Jenkins ou Bamboo sem disciplina não fazem nada. Jez Humble, citado no livro: *"Quanto maior for a razão aparente para criar um branch, mais você não deveria criar um branch."*

## Por quê

- **Pequenas integrações evitam o "merge hell".** Integrar pedaços pequenos ao longo do dia evita o conflito gigante do merge tardio.
- **Feedback e moral.** O livro lista: aumenta feedback e comunicação na equipe, todos veem o que está acontecendo, todos têm acesso à versão mais atual, previne problemas de integração cedo.
- **Funciona em qualquer escala.** Google e Facebook mantêm o desenvolvimento inteiro no trunk — Google em 2010 já tinha 5 mil devs no mesmo repositório, 20+ alterações por minuto. Se eles conseguem com trunk, um time pequeno consegue. É questão de disciplina.

## Como aplicar

- **Trunk-based, não branch-per-feature de vida longa.** O time commita no branch padrão (head / trunk / main). Quanto mais você quer abrir um branch, menos deveria.
- **Nunca quebre o build.** Toda mudança mantém o código rodando. Build quebrado se arruma **imediatamente** — é prioridade do time, não tarefa para depois.
- **Rode os testes localmente antes do commit.** Todos os testes de unidade devem passar no seu ambiente local *antes* de integrar. Não empurre o vermelho para o servidor de IC descobrir.
- **Build automatizado e rápido.** Build lento mata o loop de feedback. Mantenha-o rápido e o acesso ao último build fácil para todo o time.
- **Servidor de IC dedicado, fonte de repositório única.** Os testes automatizados (incluindo os de aceitação) rodam com sucesso no build; teste num ambiente clone do de produção.
- **Automatize o deploy.** IC encadeia com entrega contínua — o build das pequenas entregas sai pela própria IC.
- **Verifique o padrão de codificação no build.** Como todos pareiam, trocam de par e refatoram o tempo todo, não pode haver estilos divergentes. O padrão é acordado pelo time (existir vale mais que a forma exata) e checado automaticamente (CheckStyle, linter) a cada commit. Linguagem/projeto/empresa podem fornecê-lo — não invente do zero.
- **Não desative a IC sob pressão.** Contraintuitivo e crítico: *"não desative a integração contínua quando estiver sob pressão, nessa hora ela terá ainda mais valor."* Cortar IC no aperto é exatamente o que gera o build quebrado que custa o prazo.
- **Penalidade leve e descontraída para quem quebra.** Pote de balas / "vai ter que pagar bala" — ritual de baixo atrito, não punição.

## Mapeamento para o kit (agente)

- IC é o gate que torna `policies/vertical-slices.md` real: cada slice mergeável só merge com CI verde. Sem IC, "slice completo" é alegação não verificada.
- Casa com a regra do `GLOBAL.md`: **verificar antes de afirmar** — o build verde *é* a evidência observável que substitui "funcionou" sem prova. O hook `claim-verifier` é o análogo agente do "não quebre o build".
- Slice pequeno + commit frequente no trunk > branch de feature de vida longa que o agente integra no fim (onde 80% dos bugs aparecem).

## Relação com outras policies

- `policies/vertical-slices.md` — cada slice merge no trunk com CI verde; merge na ordem definida lá.
- `policies/verification-before-completion.md` / `policies/claim-verification.md` — "não quebre o build" = nenhuma conclusão sem evidência de build/teste verde.
- `skills/07-deploy-docker` + `skills/43-canary-deployment` — IC encadeia para entrega/deploy contínuo.
