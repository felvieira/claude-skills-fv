# Remotion — adapter de fluxo e sincronização

Use esta referência quando a peça for implementada em um projeto Remotion existente ou quando o usuário escolher Remotion. Ela complementa o harness `seek(t)` desta skill; não muda a rota padrão nem pede migração de um filme HTML que já atende ao trabalho.

## Sincronização determinística

- Anime a partir do frame atual do Remotion e obtenha o `fps` da composição. Converta segundos para frames com esse valor, inclusive em props de sequência e duração; não fixe conversões em 30 fps.
- Use a API de interpolação do Remotion para calcular cada estado a partir do frame. CSS `transition`, `animation`, classes utilitárias animadas, relógios de parede e timers não são o relógio de render e podem divergir no export.
- Defina início, duração e extrapolação de cada trecho explicitamente. Para cenas consecutivas, prefira sequência/timeline declarada; preserve uma instância própria para cada trecho que precisa ser editado separadamente.
- Resolva mídia por referências estáveis do projeto (`staticFile()` para arquivos locais na pasta pública ou URL deliberada). Confirme que fonte, imagem, áudio e vídeo estão prontos antes da inspeção visual.

## Fluxo de edição

1. Confira a versão de Remotion instalada e consulte a documentação oficial correspondente antes de usar ou atualizar APIs.
2. Se já existe projeto, preserve seu scaffold, dependências e alterações locais. Em projeto novo, inspecione a pasta antes de escolher onde criar o scaffold.
3. Assim que o projeto iniciar, abra o Remotion Studio e confira a composição e seu preview antes de alterar a cena. Mantenha-o acessível enquanto trabalha quando o ambiente permitir.
4. Faça render apenas quando o usuário pedir export/render explicitamente. Para inspeção pontual, renderize frames específicos e avalie-os; o preview ou o render concluído não substitui a crítica quadro a quadro exigida por esta skill.
5. Antes da entrega, confira frames-chave no início, nas mudanças de cena, nas entradas/saídas e no final. Mantenha um resumo da evidência visual e dos problemas corrigidos.

## Fronteira com a rota nativa

Remotion é apropriado quando React, composição editável ou integração com projeto existente justificarem o framework. Para uma peça autocontida sem essa necessidade, mantenha a rota A: `seek(t)` + Playwright + ffmpeg. Não introduza Remotion apenas para aplicar um efeito ou uma regra isolada. O contrato desta skill continua sendo: estado derivado do tempo/frame solicitado, inspeção visual dos quadros e resultado reprodutível conforme as capacidades do projeto.

## Fonte

Resumo próprio de práticas descritas pela skill oficial [`remotion-best-practices`](https://github.com/remotion-dev/skills/blob/main/skills/remotion-best-practices/SKILL.md) e sua referência [`remotion-markup`](https://github.com/remotion-dev/remotion/blob/main/packages/skills/skills/remotion-markup/SKILL.md) (consultadas em 2026-10-19). O repositório de skills não inclui licença declarada; nenhum código ou trecho textual foi copiado. Verifique a licença atual do Remotion e a da versão instalada antes de adotá-lo num projeto.
