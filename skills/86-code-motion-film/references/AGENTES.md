# AGENTES — o mesmo fluxo em qualquer agente de código

Os scripts, a pasta do filme e as verificações são idênticos em todo lugar. O que muda de agente para agente são poucas ações. Onde um passo diz **Planejar**, **Perguntar**,
**Olhar**, **Delegar**, **Segundo plano** ou **Enviar**, use a ferramenta do seu agente para isso.

| Ação | Claude Code | Outro agente |
|---|---|---|
| **Planejar**: apresentar o brief e esperar o ok | modo de plano (`EnterPlanMode` e `ExitPlanMode` com o brief) | escreva o brief como plano no chat, peça aprovação e **pare** |
| **Perguntar**: uma decisão que só o usuário toma | `AskUserQuestion` | uma pergunta simples no chat, depois pare |
| **Olhar**: ver um PNG | `Read` do arquivo | a ferramenta de ver imagem do agente; se não houver, não finja que viu: peça ao usuário ou use só as medidas |
| **Delegar**: dar um papel a um ajudante de contexto limpo | a ferramenta `Agent`, várias numa mensagem para rodarem juntas | os subagentes do seu agente; se não houver, uma execução sem interface do próprio agente com o mesmo prompt; sem nada disso, faça o papel você mesmo, em texto |
| **Segundo plano**: rodar um comando longo e continuar | `Bash` com execução em segundo plano | `nohup <comando> > saida.log 2>&1 &` (ou o equivalente do seu sistema) |
| **Enviar**: entregar um arquivo pronto | a ferramenta de envio de arquivo, quando existir; senão o caminho | o caminho do arquivo |

O que não foi verificado nesta skill: nomes exatos de ferramentas de outros agentes. Confirme no seu ambiente em vez de supor.

## Delegar bem

Um ajudante **não vê esta conversa, nem a skill, nem a sua memória**. O prompt dele é o arquivo do papel inteiro (por exemplo o de `REVISORES.md`, seção "Prompt do revisor") seguido de
um bloco `## Despacho` com tudo o que o papel pede, em caminhos absolutos e valores simples. O ajudante escreve o resultado no arquivo que o despacho nomeia, e esse arquivo é como você
sabe que ele terminou: se ele acabar sem o arquivo, rode de novo uma vez com o mesmo prompt e depois faça você mesmo.

- Ajudantes que olham trechos de tempo diferentes são independentes: comece todos juntos. Um limite de simultaneidade do agente muda quantos começam juntos, não quanto é revisado.
- Se o agente exige permissão do usuário para delegar, pergunte uma vez, na mesma mensagem que apresenta o brief.

## Esperar

Espere por um arquivo, não por uma mensagem. Um render em segundo plano terminou quando o script imprime a última linha no log **e** o `.mp4` existe; confira isso uma vez, quando não
houver mais nada a fazer, em vez de consultar a cada poucos segundos.

## Comandos com caminho absoluto

Cada chamada de shell começa do zero: escreva o caminho completo do script em todo comando (`skills/86-code-motion-film/scripts/...`), em vez de exportar uma variável uma vez só.

Protocolo (tabela de ações e regras de delegação) inspirado em kaventro/motion-designer (MIT); texto próprio.
