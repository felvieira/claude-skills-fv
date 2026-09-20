# Template de Prioridade de Setup (Plano de 30 dias)

Esqueleto universal de 5 passos para o Estágio 6.6 da entrevista. O Passo 0 (instalar Claude Code) é sempre implícito e não entra na numeração — o plano começa no Passo 1.

## Passo 1 — Conversão automática

**Título:** "Fazer o Claude ler seus arquivos bagunçados"
**O que fazer:** montar um script que roda quando a sessão começa e transforma arquivo bruto (PDF, planilha exportada, print) em texto organizado que o agente consegue ler direto.
**Por quê:** sem isso, todo pedido de resumo exige que alguém abra e leia o arquivo manualmente primeiro — o agente não enxerga PDF/imagem sem esse passo.
**Como saber que funcionou:** o operador consegue apontar pra um arquivo bruto recém-chegado e, sem fazer nada manual, ver a versão convertida aparecer na pasta certa.

## Passo 2 — Resumos semanais

**Título:** "Montar os resumos que o Claude escreve pra você"
**Requer:** Passo 1
**O que fazer:** configurar a rotina que lê os dados convertidos e monta o resumo semanal por domínio (financeiro, marketing, operação — depende do arquétipo).
**Por quê:** é o coração do sistema — sem o resumo, o agente teria que reler tudo do zero toda vez que alguém perguntar algo.
**Como saber que funcionou:** o operador abre o arquivo de resumo da semana e reconhece números reais do próprio negócio nele.

## Passo 3 — Orquestrador + especialistas

**Título:** "Montar o chefe de gabinete e os assistentes de domínio"
**Requer:** Passo 2
**O que fazer:** configurar um agente central que decide qual assistente de domínio (financeiro, marketing, operação) responde cada pergunta.
**Por quê:** sem isso, cada pergunta precisa apontar manualmente pro resumo certo — o orquestrador faz esse roteamento sozinho.
**Como saber que funcionou:** o operador faz uma pergunta genérica ("como foi essa semana?") e recebe resposta consolidada, não um único resumo isolado.

## Passo 4 — Log de auditoria + aprovação

**Título:** "A camada de confiança"
**Requer:** Passo 3
**O que fazer:** configurar um registro de toda ação que o agente toma, mais um ponto de aprovação antes de qualquer ação que sai do sistema (enviar e-mail, publicar algo).
**Por quê:** sem isso não dá pra confiar no sistema sem checar tudo manualmente — o log e a aprovação são o que permite delegar de verdade.
**Como saber que funcionou:** o operador consegue abrir o log e ver exatamente o que o agente fez na última semana, e nenhuma ação sensível saiu sem aprovação prévia.

## Passo 5 — Comandos rápidos

**Título:** "Atalhos de um clique pras suas rotinas semanais"
**Requer:** Passo 4
**O que fazer:** configurar comandos que disparam as rotinas mais usadas (gerar o resumo, rodar o follow-up) com um único comando em vez de descrever tudo de novo toda vez.
**Por quê:** reduz o atrito do dia a dia — sem isso, o operador tem que lembrar e digitar o pedido inteiro toda vez.
**Como saber que funcionou:** o operador consegue disparar a rotina semanal inteira com um comando curto, sem reexplicar o contexto.

---

## Inserções específicas por arquétipo

- **`clinica_saude` e `servicos_profissionais`:** inserir um passo de "ambiente restrito" (hospedagem que mantém o dado dentro do tenant do cliente) na posição 1, renumerando os demais.
- **`clinica_saude`:** adicionar também, na posição 6, um passo de "regra de dado sensível" — restrição por pasta que impede o agente de ler prontuário fora do contexto autorizado.
