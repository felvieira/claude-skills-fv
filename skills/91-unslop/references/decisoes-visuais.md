# Critérios para tomar decisões visuais

## Antes de escolher valores

1. Levante tokens, estilos, componentes e convenções que já estão em uso. Não presuma que um arquivo de design esteja atualizado.
2. Defina a ação e a informação prioritárias da tela. Uma página promocional e um painel operacional podem precisar de densidades diferentes.
3. Diferencie inconsistência de exceção intencional. Compare controles com a mesma função e estados equivalentes.
4. Corrija o sistema compartilhado quando a mesma causa aparece em várias telas; evite abstrair uma única exceção.

## Critérios por elemento

- **Organização:** preserve leitura e capacidade de localizar, comparar e operar. Faça agrupamentos coerentes com o domínio.
- **Tipografia:** verifique hierarquia, quebra, alinhamento e comportamento com tradução e zoom. Preserve famílias da marca quando fizerem sentido.
- **Cor:** associe estados a rótulos ou outros sinais; não dependa somente de matiz. Meça contraste no contexto e estado efetivamente exibidos.
- **Componentes:** use os existentes quando atenderem à tarefa. Respeite variantes, alvos interativos, foco, estados desabilitados e feedback.
- **Dados:** escolha representação pela pergunta do usuário, não pelo formato mais decorativo. Preserve série, unidade, período e precisão.
- **Imagem:** use conteúdo ou assets autorizados e úteis à compreensão. Não fabrique visualização de produto ou resultado real. Defina dimensões, alternativa textual e carregamento apropriados.
- **Movimento:** acrescente apenas quando melhorar feedback ou continuidade; respeite `prefers-reduced-motion` e verifique custo real quando possível.

Valores e exceções vêm da stack e do design do projeto. Se for necessário estabelecer uma escala nova, registre a decisão e valide estados em vez de importar números de uma referência como regra universal.
