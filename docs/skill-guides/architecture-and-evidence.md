# Arquitetura guiada por contratos e evidências

Guia compartilhado das skills 03, 05, 11, 34, 37, 38 e 53. Consulte as seções pertinentes ao problema; uma tarefa pequena não precisa de um novo processo ou documento. Os exemplos são próprios e sintéticos.

## Do requisito à decisão de arquitetura

Antes de acrescentar uma camada, descreva o comportamento que precisa sobreviver à mudança. Registre a decisão no formato já usado pelo projeto: issue, teste, ADR existente ou handoff curto.

Se um requisito novo contrariar uma premissa estrutural, descreva o desenho que o atenderia desde o início e entregue a transição em etapas verificáveis. Reavalie a premissa antes de espalhar compensações pelos chamadores; respeite os contratos e o escopo autorizado.

| Pergunta | Decisão observável | Como verificar |
|---|---|---|
| Que regra não pode ser violada? | Invariante em termos do domínio, com estados e transições válidos | Testes pela interface pública, incluindo a transição proibida |
| Onde entra dado não confiável? | Parsing e validação no adaptador de entrada | Payload inválido, versão incompatível e dados extremos |
| Quem pode mudar o estado? | Dono do dado e mecanismo de atomicidade explícitos | Dois escritores, versões concorrentes e falha entre etapas |
| O que acontece se repetir? | Identidade estável da intenção e política para conflito de payload | Repetição, timeout após commit e retomada após queda |
| Que efeito depende de IO? | Adaptador para banco, fila, relógio ou provedor externo | Integração do adaptador e falha do recurso real ou controlado |
| Que complexidade pode sair? | Remoção ou consolidação que preserve contratos | Testes de caracterização e comparação dos consumidores |

Tipos discriminados e enums podem impedir combinações inválidas dentro do programa. Eles não validam JSON em runtime nem substituem autorização. Valide em cada nova fronteira de confiança: requisição, mensagem, arquivo ou resultado de integração. Depois de construir uma representação interna válida, evite repetir parsing sem necessidade; revalide invariantes quando o estado puder ter mudado.

Corrija o contrato ou o parser quando o tipo não expressar a realidade. Casts, `any`, supressões ou coerções que escondam uma violação precisam ser investigados; não silencie o compilador para aceitar um estado que o domínio proíbe.

Mantenha regras de domínio independentes de IO quando isso tornar a decisão mais clara e testável. Não fragmente uma regra em funções sem responsabilidade própria apenas para baixar uma métrica. Uma fronteira útil encapsula uma decisão, uma mudança independente ou um recurso externo; uma camada que apenas repassa chamadas exige justificativa.

## Estado, repetição e efeitos

Antes de serializar acesso, elimine compartilhamento mutável que não represente um fato comum do domínio. Dados de trabalho independentes podem pertencer a cada execução. Preserve uma fonte autoritativa para o estado que precisa ser compartilhado; copiar esse estado não resolve sua consistência.

1. Nomeie o agregado ou recurso, o dono da escrita e o limite da transação.
2. Diferencie **intenção** de **tentativa**. Um retry deve carregar a mesma identidade da intenção.
3. Defina o comportamento da mesma chave com payload diferente: conflito explícito, sem reutilizar uma resposta incompatível.
4. Escolha como arbitrar concorrência: restrição única, compare-and-swap por versão, transação ou escritor único efetivamente imposto. Um `if` seguido de `insert` não é uma operação atômica.
5. Quando estado local e efeito externo não compartilham transação, modele o intervalo de falha. Outbox transacional e consumidor idempotente podem resolver esse intervalo; a existência de uma fila, sozinha, não oferece execução exatamente uma vez.
6. Escolha retenção, recuperação e reconciliação de acordo com a janela real de reentrega. Memória de processo não mantém deduplicação após restart.

Teste pelo menos os cenários relevantes ao contrato: duas tentativas simultâneas, evento repetido, mesma chave com conteúdo divergente, queda antes do commit, queda depois do commit antes da resposta e reenvio do efeito. Exercite o mecanismo de coordenação usado em produção quando a propriedade depender dele. Um teste unitário com `Map` não comprova atomicidade do PostgreSQL.

Exemplos completos de decisões: `skills/38-architecture-deepener/examples/architecture-decisions.md`. Detalhes de chaves e SQL: `skills/03-backend-api/references/idempotencia-e-postgres-avancado.md`.

## Corrigir a hipótese antes de repetir a solução

Quando duas correções falham sob a mesma hipótese, interrompa a repetição e registre:

- hipótese compartilhada, em uma frase;
- cenário que a contradiz e o resultado observado;
- quais atores possuem ou alteram o recurso;
- uma alternativa que mude essa hipótese;
- o teste ou medição que distingue as alternativas.

Exemplo: dois ajustes de mutex em memória falham porque duas instâncias confirmam o mesmo pedido. A hipótese era que havia um único processo escritor. O próximo experimento deve verificar coordenação persistente entre instâncias; outro mutex local não testa a causa identificada. Preserve as evidências das tentativas e consulte a skill 53. Nenhum número fixo de tentativas autoriza uma alteração de regra de negócio.

## Testar sem fabricar um oráculo

Para código com comportamento relevante, escolha um caso pequeno: escreva o teste, observe a falha esperada, implemente e verifique o resultado. Uma falha por import, ambiente, timeout ou fixture ausente não demonstra que o teste detecta a regra que falta.

Em legado, caracterize o contrato antes de mudar a estrutura. Se um teste quebrar durante refatoração, diferencie regressão, alteração autorizada de contrato, teste acoplado a detalhe interno e falha de ambiente. Não atualize a expectativa apenas para obter verde. Também não reverta uma correção válida apenas porque um teste inspeciona um método privado.

Quando um teste honesto for impraticável, declare o motivo e use a melhor verificação disponível: experimento reproduzível, teste de integração, inspeção no ambiente real ou revisão de contrato. Uma checagem sintética não substitui validação de provedor, dispositivo ou produção. Tarefa mecânica ou visual sem lógica nova não exige teste artificial para preencher um checklist.

Construa automação quando a repetição ou o risco justificar. Faça primeiro uma unidade verificável, depois automatize essa unidade. Evite criar uma ferramenta para uma transformação única que já está bem coberta por uma capacidade do projeto.

## Usar métricas para investigar

### Complexidade e cobertura

Considere complexidade ciclomática, cobertura e histórico de falhas por função. CRAP combina complexidade `c` e fração de cobertura `v`: `c² × (1 − v)³ + c`. O valor indica onde investigar; não comprova bom design, segurança ou qualidade dos testes.

- Meça a mesma função e revisão. Cobertura global do projeto não é cobertura daquela função.
- Declare o tipo de cobertura: linhas, branches ou instruções. Comparações exigem métodos compatíveis.
- Sem cobertura disponível, mantenha CRAP como não calculado. Ferramenta ausente, execução falha, revisão antiga e valor zero são estados diferentes.
- Dividir uma função para reduzir o número só é melhoria quando o contrato, a coesão e a compreensão melhoram. Uma extração pass-through pode apenas espalhar a complexidade.
- O limite que bloqueia uma entrega vem do projeto ou da constituição, com justificativa. Este guia não impõe um número universal.

### Duplicação estrutural

Similaridade aponta candidatos. Antes de extrair, compare significado, invariantes, motivos para mudar e dependências. Duas regras parecidas que evoluem separadamente podem precisar permanecer separadas. Uma duplicação confirmada deve ter locais e decisão registrados; uma duplicação mantida precisa de justificativa. Não elimine validação, autorização ou acessibilidade para satisfazer um detector.

### Mutação

Escolha primeiro funções alteradas ou regras críticas com testes relevantes. Defina escopo, orçamento de tempo, processos concorrentes e comando de baseline. Coverage ajuda a escolher o escopo, mas não há um percentual global que decida sozinho quando vale testar mutações.

| Resultado | Tratamento |
|---|---|
| Baseline falhou ou não rodou | Corrigir o ambiente/teste antes de avaliar mutantes; score indisponível |
| Mutante válido detectado por asserção | Conta como detecção no escopo executado |
| Sobrevivente | Investigar se a diferença é observável pelo contrato |
| Equivalente | Excluir apenas com justificativa e evidência de triagem |
| Código sem cobertura | Registrar como não exercitado; não apresentar como detecção |
| Timeout, compilação inválida ou erro de infraestrutura | Registrar separadamente; não contar como detecção por asserção |

Um sobrevivente relevante pede teste melhor ou esclarecimento do contrato. Não altere a regra correta para matar um mutante equivalente. Use ferramentas já disponíveis e compatíveis com a stack; qualquer execução que instale dependências ou regenere relatórios deve ser uma escolha explícita do trabalho autorizado. Limite workers e use ambiente de teste com efeitos externos controlados. Reteste um resultado cacheado se testes, dependências ou configuração mudaram, mesmo que o texto da função seja igual.

## Relatório próprio do kit

`scripts/code-quality-report.mjs` consolida medições normalizadas e calcula CRAP e a taxa de detecção dos mutantes válidos executados. A entrada é um JSON; a saída vai para stdout em Markdown ou JSON. O programa não executa scanners, testes ou comandos presentes na entrada, não instala ferramentas e não altera o código analisado.

```sh
node scripts/code-quality-report.mjs --input skills/34-static-analysis/examples/code-quality-input.json
node scripts/code-quality-report.mjs --input ./artifacts/quality-input.json --json
```

Em consumidor instalado em `.bot/`, prefixe o caminho do script com `.bot/`. Em plugin, use o caminho absoluto da instalação. A execução requer Node com suporte a módulos ES, sem dependências adicionais.

### Contrato da entrada

- `schema_version: 1`, `scope`, `revision` e `synthetic` são obrigatórios. Marque exemplos e dados de teste com `synthetic: true`.
- `revision` identifica o estado analisado. Em árvore suja, um SHA de commit sozinho não identifica as mudanças locais; use identificação dos arquivos/artefatos correspondente ao estado medido.
- `functions[]`: `file`, `line`, `name`, `complexity` e/ou `coverage`. Cada medição pode estar em `measured`, `missing`, `failed`, `stale` ou `unsupported`. Estados não medidos têm `reason`.
- Complexidade medida exige `value` inteiro positivo, `revision` e `evidence`. Cobertura medida exige `covered`, `total`, `kind` (`branch`, `line`, `instruction`), `revision` e `evidence`. Numerador e denominador pertencem à função, não ao arquivo inteiro. Sem amostras, o resultado é `no-samples`.
- `duplications[]`: locais `left`/`right` com `file` e `line`, `similarity` entre 0 e 1, `revision`, `evidence` e `status` (`candidate`, `confirmed`, `justified`). Os dois últimos exigem `reason`.
- `mutation`: estado da medição, `revision`, `evidence`, `baseline` (`passed`, `failed`, `not-run`) e `counts` com todos os campos: `killed`, `survived`, `uncovered`, `timeout`, `invalid`, `equivalent`, `error`. `killed` significa detecção de mutante válido por asserção. Equivalentes exigem `triageEvidence`.

### Limites do relatório

As referências e revisões são **declaradas pelo produtor da entrada**: o programa não abre nem autentica esses artefatos. `evidenceValidation: declared-only` explicita esse limite. Leia os artefatos reais antes de usar a informação em review. Revisões declaradas divergentes deixam o cálculo indisponível; revisões iguais, sozinhas, não comprovam frescor.

A taxa de mutação é `killed / (killed + survived)` e informa seu denominador. Ausência de amostras ou de baseline válido produz `null`. `complete` indica apenas se o escopo declarado terminou sem itens não cobertos, inválidos, timeout ou erro; não significa aprovação nem cobertura do produto inteiro. Confira as contagens mesmo quando a taxa for alta.

O exemplo JSON fornecido é sintético e cita nomes ilustrativos de artefatos. Ele demonstra formato e cálculos, sem alegar medição de um projeto real. Use `templates/architecture-evidence.md` quando uma decisão precisar de registro breve. A avaliação contextual vive em `evals/skills/architecture-and-evidence.md`.
