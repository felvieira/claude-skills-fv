# Selecao de Paradigma de Arquitetura

Três paradigmas cobrem a maioria das decisões de arquitetura de jogo. Nenhum é universal — a maioria
dos projetos mistura os três por módulo.

| Paradigma | Ideia central | Favorece quando |
|---|---|---|
| Orientado a dominio/entidade rica | Entidade com estado e comportamento juntos, regras complexas encapsuladas | Combate central, física de interação, cálculo de dano/buff, IA com decisão complexa — poucas entidades mas com regras ricas entre elas |
| Data-driven (estrutura primeiro) | Camada de dados dirige o comportamento, código genérico interpreta config | Conteúdo expansível (quests, level design), fluxo (tutorial, execução de skill), gestão simples (inventário, loja, mail) |
| Prototipo descartável | Implementar o caso de uso mais rápido possível, sem arquitetura formal | Validação de mecânica core, game jam, prova de conceito antes de comprometer arquitetura |

## Sinais de Selecao

Quando entidade rica e data-driven parecem ambos cabíveis, usar estes sinais:

| Sinal | Favorece entidade rica | Favorece data-driven |
|---|---|---|
| Interacao entre entidades | Regras cruzadas complexas (atacante × defensor × buff × ambiente) | Majoritariamente CRUD + exibicao, poucas regras entre entidades |
| Origem do comportamento | Varia por tipo de entidade, dificil de expressar como dado puro | Dirigido por tabela de config, conteudo autorado por designer |
| Frequencia de mudanca | Regra muda junto com iteracao de balance | Conteudo/fluxo muda com frequencia bem maior que a logica |
| Perfil de performance | Overhead aceitavel pra grafo de objeto rico | Precisa de processamento em lote, layout amigavel a cache |
| Rede | Objeto com estado aceitavel | Snapshot de estado achatado preferido (sync, rollback) |
| Fluxo de equipe | Programador dono da logica | Designer precisa iterar sem tocar codigo |

## Misturando Paradigmas

A maioria dos sistemas reais mistura os dois primeiros paradigmas — nao e sinal de indecisao, e o
padrao esperado:

1. **Consistencia macro**: todos os modulos seguem o mesmo framework de gestao de modulo.
2. **Dominio pras entidades e regras centrais**: usar entidade rica pra sistemas com alta complexidade
   de regra, conceitos de dominio ricos, e muitas entidades distintas (ex: atores de combate, formulas
   de dano, decisao de IA).
3. **Dados pro conteudo, fluxo e estado**: usar data-driven pra conteudo expansivel (quests, level
   design), orquestracao de fluxo (tutorial, execucao de skill, narrativa), e gestao simples de dado
   (inventario, loja).
4. **Padroes hibridos**:
   - **Entidade como dado**: entidade de dominio naturalmente carrega dado (campo) e comportamento
     (metodo) juntos. Desenhar a entidade pra ser amigavel a serializacao (usar IDs, manter estado como
     campo simples) pra que sirva os dois papeis sem uma camada de dado separada.
   - **Fluxo + dominio**: usar fluxo data-driven pra orquestrar a sequencia/pipeline, logica de dominio
     pra tratar a regra em cada passo. Ex: sistema de skill — o fluxo dirige lançar→canalizar→aplicar,
     o dominio trata calculo de dano e interacao de buff.
   - **Camadas separadas de dado/dominio**: so quando a representacao em tempo de edicao e em tempo de
     execucao realmente divergem. Usar um passo de bake/compile pra fazer a ponte. Ex: editor de node
     graph visual, asset compilado.
5. **Intercambiabilidade de paradigma**: muitos sistemas podem ser validamente implementados com
   qualquer um dos dois. Ex: hierarquia de heranca de ator (dominio) ↔ componentes ECS + sistemas
   (data-driven); objeto de buff com regra encapsulada (dominio) ↔ entrada de tag + efeito resolvida
   por um pipeline generico (data-driven). Usar a tabela de sinais acima pro trade-off.
6. **Integracao**: a camada de aplicacao faz a ponte entre paradigmas diferentes.
