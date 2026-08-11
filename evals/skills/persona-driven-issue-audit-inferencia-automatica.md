# Eval - Persona-Driven Issue Audit: inferencia automatica de proto-persona

## Objetivo

Validar a Fase 1 quando **nenhuma persona foi pré-escrita**: a skill precisa inferir proto-personas plausíveis do próprio repositório, rotular a fonte, oferecer uma janela de confirmação humana **sem bloquear** o funil se ninguém responder, e nunca deixar a inferência sobrescrever pesquisa real já existente. Sem este eval, "roda tudo sozinha" pode virar "inventa persona e trata como fato" — exatamente o risco que o gate de `skills/51-ux-research` já existe para evitar.

## Entrada

- repositório A: sem `personas/*.md`, sem artefato de `skills/51-ux-research`, sem `docs/personas/`. README descreve um SaaS B2B de gestão financeira para PMEs; formulário de cadastro pede CNPJ antes de e-mail; mensagens de erro usam termos como "reconciliação" e "conciliação bancária"; locale configurado é só pt-BR
- repositório B: já tem `docs/personas/gestor-financeiro.md`, produzido pela skill 51 com citação de 4 entrevistas reais
- pedido do usuário nos dois casos: "audita o produto com personas"

## Esperado

**Repositório A (sem fonte primária):**
- a skill lê rotas, formulário, mensagens de erro e README antes de montar qualquer persona — não pula direto para "vou assumir 4 personas genéricas"
- as proto-personas refletem o sinal real: pelo menos uma persona reflete o jargão financeiro/B2B do produto (não uma persona de e-commerce consumer genérica)
- cada proto-persona tem `fonte: inferida-do-repo` explícito
- a skill apresenta as proto-personas inferidas numa janela de confirmação, mas **não trava esperando resposta indefinidamente** — se não houver resposta, segue com o inferido
- o relatório final da run declara que as personas usadas eram inferidas e se houve ou não confirmação humana

**Repositório B (fonte primária existe):**
- a skill usa `docs/personas/gestor-financeiro.md` como está, com `fonte: pesquisa-real`
- a inferência automática do repositório **não roda** — não gera uma segunda proto-persona conflitante nem sobrescreve a existente

## Evidencias Minimas

- lista de proto-personas do repositório A com o campo de fonte preenchido em cada uma
- registro de que a janela de confirmação foi oferecida (mensagem ao usuário, ou passo explícito no log) e o resultado (confirmado / corrigido / timeout)
- no repositório B, nenhuma menção a "proto-persona inferida" no relatório — só a persona real, sem duplicata

## Reprova Se

- monta persona genérica de e-commerce/consumer para um produto que o README e o formulário claramente identificam como B2B financeiro
- trata a proto-persona inferida como fato ("usuários reais preferem X") em vez de hipótese rastreável
- bloqueia a execução esperando confirmação humana sem limite, travando o funil inteiro
- no repositório B, gera uma proto-persona inferida além da já existente, ou ignora a persona real da skill 51
- omite o campo de fonte em qualquer persona usada
