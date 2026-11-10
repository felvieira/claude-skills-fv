# Auditoria de conversoes e campanhas de aplicativos

Use quando o objetivo for corrigir mensuracao ou otimizar aquisicao paga. Antes de alterar a conta, registre contas, periodo, fuso, filtros, configuracao e restricoes do usuario. Separe observacoes, inferencias e lacunas. Nunca aplique sugestoes de orcamento quando fora do escopo.

## Inventario antes de mudar

1. Mapeie sucesso de negocio, origem e destino: app/site, backend ou loja, analytics, conta Ads e campanha. Leia codigo, configuracoes e eventos existentes; procure tambem emissores server-side, integracoes nativas e importacoes, para nao criar duplicidade.
2. Para cada evento registre nome, origem, gatilho confirmado, plataforma, ambiente, id da transacao, valor/moeda, contagem, janela, status, papel primario/secundario e uso efetivo pela campanha. Uma selecao especifica de campanha pode diferir dos objetivos padrao da conta: confira ambas.
3. Em apps, confira pacote, propriedade Firebase, vinculacao ao Ads/Play, importacao, versao distribuida e compatibilidade com o fluxo real de cobranca. Atribuicao de clique web nao deve ser presumida para uma instalacao nativa. Avalie first_open e installs como fontes diferentes; nao some fontes sem provar deduplicacao.
4. Distinga instalacao, primeira abertura, cadastro, ativacao, inicio de pagamento, pagamento confirmado, renovacao e reembolso. Checkout iniciado nao e compra. A ausencia de conversoes atribuidas pode resultar de volume, janela, atraso ou falha: nao diagnostique defeito apenas pelo zero.

## Verificacao

- Defina criterio de sucesso e compare o sistema de origem com o evento no debugger e o destino. Acionar codigo ou tag nao prova chegada ao Ads. Documente horarios, ambiente, IDs nao sensiveis e possivel atraso; nunca exponha dados pessoais ou tokens.
- Teste retry, atualizacao de tela, cancelamento e falha; use IDs estaveis e mecanismo de deduplicacao suportado pelo destino. Nao force compra real, dados reais ou transacao externa como teste. Use sandbox e os recursos oficiais quando disponiveis.
- Confira valor, moeda, tratamento de trial, impostos, taxas, renovacoes, estornos e a fonte da verdade; evite contar o mesmo pagamento por fontes sobrepostas. Em assinatura, nao presuma que o evento de compra ou renovacao no SDK corresponde ao pagamento liquidado.
- Quando um teste seguro nao puder chegar ao destino, marque a etapa pendente e indique como confirmar; nao declare integracao validada.

## Decisao de campanha

Confira foco de lances, metas e eventos selecionados, valor real recebido, volume, qualidade, maturacao e regras atuais da plataforma. Target ROAS sem valores observaveis e sinal para investigar; zero no periodo nao prova falha global. Nao prometa desempenho nem mude estrategia com dados insuficientes. Proponha uma hipotese, metrica de negocio, guardrails, periodo, riscos e rollback. Ajustes em lances podem alterar gasto mesmo sem mudar orcamento; respeite o escopo autorizado.

Use skill 21 para taxonomia de produto e 59 para receita e atribuicao. Para medicoes e regras de plataforma, consulte documentacao oficial atual, sem assumir que uma tela de outra conta tem a mesma configuracao.

Inspiracao: [marketingskills — conversion-tracking](https://github.com/coreyhaines31/marketingskills/tree/main/skills/conversion-tracking) e [ads](https://github.com/coreyhaines31/marketingskills/tree/main/skills/ads), Corey Haines, MIT. Orientacao adaptada, nao copiar snippets sem auditar e validar.
