# Atribuicao e receita de assinaturas

Defina primeiro a fonte contabil da receita e a populacao, janela, moeda, data de referencia e maturacao. Reconcilie pagamentos, refunds e renovacoes por ID estavel; compare com eventos de analytics e atribuicoes de cada plataforma. A diferenca pode decorrer de janelas, consentimento, visibilidade de dispositivos, modelagem ou duplicidade. Nao exija igualdade exata entre contagens com definicoes distintas.

Relate receita real deduplicada separada do credito atribuido. Plataformas podem reivindicar a mesma venda; somar conversoes atribuidas entre canais nao produz vendas unicas. First-touch e last-touch sao perspectivas, nao provas de causalidade; registre definicao e limitacoes. Nao prometa medicao individual onde o sistema de privacidade ou a plataforma nao permite.

Para testar incrementalidade, quando volume e desenho permitirem, predefina grupos comparaveis, randomizacao, duracao, metrica primaria, guardrails e custo; interprete efeito e incerteza. Com pouco volume ou impossibilidade de controle, apresente a comparacao como direcional e nao causal. Nunca altere orcamento fora da autorizacao do usuario.

Em assinaturas separe trial, pagamento inicial, renovacao, cancelamento e reembolso; valide a semantica de cada evento com loja e backend e documente atrasos. Revise valores e deduplicacao antes de usar ROAS alvo. Para implementacao e regras de integracao, consulte as fontes oficiais atuais.

Inspiracao: [marketingskills — attribution](https://github.com/coreyhaines31/marketingskills/tree/main/skills/attribution), Corey Haines, MIT.
