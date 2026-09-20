# Templates de Receita por Arquétipo

Receitas de partida para o Estágio 6.5 da entrevista. Cada uma segue o schema fixo abaixo — confirmar, editar ou pular com o operador, nunca impor sem checar se cabe no mundo dele.

## Schema (obrigatório para toda receita)

```json
{
  "id": "snake_case_slug",
  "headline": "Resultado em uma frase, que o operador conseguiria printar",
  "tempo_economizado_por_semana": "~3 hrs/sem OU R$ 2-4 mil/mês recuperados",
  "manual_hoje": "2-3 frases descrevendo como ele faz isso na mão hoje, com artefato real (a planilha, o e-mail, a calculadora)",
  "diferenca_segunda": "1-2 frases do que muda na segunda de manhã se isso estiver rodando",
  "ingredientes": ["fonte_bruta_1", "fonte_bruta_2"],
  "walkthrough": [
    {"ator": "Tarefa agendada, domingo 23h", "acao": "o que acontece, em português simples"},
    {"ator": "Nome do operador, segunda 6h", "acao": "..."}
  ]
}
```

## ecommerce

- **Resumo de margem por SKU semanal** (~3 hrs/sem) — hoje o dono cruza manualmente planilha de custo com relatório de venda pra saber o que dá lucro
- **Consolidado de reembolso** (~2 hrs/sem) — hoje reembolso chega em e-mail e WhatsApp sem visão única
- **Resumo de gasto de anúncio cross-plataforma** (~2 hrs/sem) — hoje Meta, TikTok e Google ficam em três exportações separadas

## saas

- **Triagem de ticket + causa raiz** (~5 hrs/sem) — hoje gerente de engenharia lê ticket, vai no código, volta pro cliente manualmente
- **Destilado de voz do cliente semanal** (~3 hrs/sem) — hoje feedback se perde entre Intercom, call e formulário

## servicos_profissionais

- **Resumo de status de processo/caso** (~4 hrs/sem) — hoje sócio pergunta status caso a caso por e-mail
- **Rascunho de faturamento mensal** (~3 hrs/sem) — hoje horas são somadas manualmente de planilha ou sistema

## clinica_saude

- **Resumo de agenda + confirmação automática** (~5 hrs/sem) — hoje recepção liga/manda mensagem uma a uma
- **Triagem de resultado de exame anormal** (~2 hrs/sem, com regra de acesso restrita) — hoje médico revisa todo resultado manualmente na mesma prioridade

## consultoria_financeira

- **Rascunho de relatório de performance mensal** (~6 hrs/mês) — hoje montado manualmente em planilha e apresentação

## criador_conteudo

- **Resumo de monetização semanal** (~2 hrs/sem) — hoje número de venda/assinatura é conferido plataforma por plataforma
- **Resumo de audiência semanal** (~2 hrs/sem) — hoje métricas de cada plataforma nunca são vistas juntas

## restaurante_multiunidade

- **P&L consolidado por unidade** (~4 hrs/sem) — hoje cada unidade exporta separado e alguém junta manualmente

## corretora_imoveis

- **Follow-up automático de lead frio** (~3 hrs/sem) — hoje lead esfria porque ninguém tem tempo de retornar todo mundo
- **Cálculo de comissão semanal** (~2 hrs/sem) — hoje calculado manualmente por corretor

## prestador_servico_local

- **Agenda consolidada a partir do WhatsApp** (~3 hrs/sem) — hoje agenda inteira vive espalhada em conversas de WhatsApp
- **Gerador de orçamento padrão** (~1 hr por orçamento) — hoje cada orçamento é escrito do zero
