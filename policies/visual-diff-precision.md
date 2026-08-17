# Visual Diff Precision Policy

## Princípio

**Comparar duas imagens numa passada só encontra diferença grande; diferença fina exige decompor em passes.**

Quando duas telas (antes/depois, design/implementação, produção/staging) são enviadas juntas e a instrução é genérica ("qual a diferença?"), o modelo relata o que salta aos olhos — mudança de layout, cor dominante, texto trocado — e não pega deslocamento de poucos pixels, espaçamento levemente diferente, ou variação sutil de cor. Isso não é falha de atenção corrigível só com "olhe com mais cuidado" — é limite estrutural: a imagem é vista uma vez, numa resolução efetiva fixa do encoder, e detalhe pequeno demais nessa resolução não está disponível pro modelo re-examinar, não importa quantas vezes o prompt peça precisão.

A Anthropic documenta isso oficialmente: *"Claude's spatial reasoning abilities are limited. It may struggle with tasks requiring precise localization."* A mitigação oficial não é reescrever o prompt — é dar ao modelo uma **ferramenta de crop/zoom** que recorta uma região da imagem original em alta resolução e devolve ampliada, porque nenhuma quantidade de prompting recupera detalhe que a passada inicial não capturou.

## Quando esta policy se aplica

- comparar dois screenshots pra achar diferença de posicionamento, espaçamento, alinhamento ou cor
- validar que uma implementação bate com um design/mockup
- auditoria visual (skill 02, modo Auditoria — `references/audit-framework.md`) quando o achado depende de medir, não só descrever
- revisão de regressão visual antes/depois de uma mudança de UI
- qualquer tarefa onde a pergunta é "isso mudou?" e não "o que isso é?"

**Não se aplica** a descrição geral de imagem, leitura de texto em screenshot, ou comparação onde a diferença já é grande o bastante pra saltar aos olhos numa primeira leitura — o protocolo abaixo tem custo (mais passes, mais tokens); reservar pra quando a diferença é sutil o suficiente pra ter escapado da primeira olhada.

## Protocolo — 4 passes, nesta ordem

### Pass 1 — grade e dimensões separadas, não uma pergunta genérica

Nunca pedir "compare as duas imagens" solto. Decompor em quadrantes/regiões nomeadas (topo, navegação, corpo principal, rodapé — ou a grade que fizer sentido pro layout) e, para cada região, perguntar por **uma dimensão de cada vez**: posição, espaçamento, cor, tipografia, alinhamento. Misturar as 4 dimensões numa pergunta só é o que produz a resposta rasa "parece igual, só muda a cor do botão".

### Pass 2 — hipóteses com coordenada, não afirmação direta

O modelo lista candidatos a diferença com **coordenada em pixel absoluto** (não posição relativa tipo "canto superior"), sinalizando explicitamente que são hipóteses a confirmar, não fatos — Claude sinaliza que suas próprias coordenadas são aproximadas, então tratar como estimativa é o comportamento correto do protocolo, não falha dele.

### Pass 3 — zoom/crop em cada região hipotetizada

Para cada hipótese do Pass 2, recortar (via ferramenta de crop, ou pedindo ao usuário um crop manual da região) e reexaminar em ampliação — é o passo que a doc oficial da Anthropic recomenda como mitigação real, não decorativa: a imagem original em resolução total já não carrega o detalhe; o crop ampliado carrega. Sem este pass, os Passes 1-2 continuam limitados pela mesma resolução original.

### Pass 4 — confirmar ou descartar cada hipótese isoladamente

Cada candidato do Pass 2, depois do zoom do Pass 3, é confirmado ("sim, o padding mudou de 12px para 16px, visível no crop") ou descartado ("não, era a mesma posição, o hipótese-1 foi engano de percepção na imagem inteira") — nunca reportado como fato sem essa segunda checagem. Isso é o mesmo princípio de `policies/claim-verification.md` aplicado ao domínio visual: sem verificação, o modelo relata o padrão plausível ("parece que mudou"), não o que de fato mudou.

## Quando ferramenta de crop não está disponível

Se não há tool de crop/zoom no ambiente (usuário mandou 2 PNGs direto no chat, sem MCP de imagem), pedir explicitamente ao usuário um crop da região suspeita antes de confirmar qualquer diferença fina — declarar a limitação em vez de forçar uma resposta com confiança que a resolução da imagem não sustenta. `"Nesta região o padding parece diferente, mas preciso de um crop ampliado pra confirmar — pode recortar e mandar de novo?"` é mais honesto que afirmar "o padding mudou de 12px para 16px" sem ter verificado.

Se disponível, `mcp__Claude_Browser__computer` com `action: zoom` cobre esse caso quando as imagens vêm de uma página real (não de screenshot solto) — usar antes de pedir crop manual ao usuário.

## Anti-Padrões

- **Comparação numa passada só, sem decompor por região/dimensão** — é o padrão de falha relatado: "parece igual, só percebo diferença enorme"
- **Afirmar diferença fina sem ter dado zoom** — o modelo relata a hipótese como se fosse fato confirmado; viola `claim-verification.md`
- **Pedir "seja mais preciso" no prompt em vez de decompor em passes** — reescrever a instrução não recupera detalhe que já não está na resolução vista; só o crop resolve
- **Misturar posição + cor + espaçamento numa pergunta só** — cada dimensão pedida junto dilui a atenção nas outras
- **Tratar coordenada retornada pelo modelo como exata** — sempre aproximada; o Pass 3/4 existe pra confirmar, não pra confiar de olhos fechados

## Fontes

- Anthropic, [Vision - Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/vision) — limitação de raciocínio espacial documentada oficialmente; coordenadas de localização são aproximadas
- Anthropic Cookbook, [Giving Claude a crop tool for better image analysis](https://platform.claude.com/cookbook/multimodal-crop-tool) — a mitigação oficial validada: crop/zoom, não reescrita de prompt
- Anthropic Cookbook, [Best practices for using vision with Claude](https://platform.claude.com/cookbook/multimodal-best-practices-for-vision)
- DiffSpot (Tencent, 2026) — benchmark que muta uma propriedade CSS por vez para medir se VLMs detectam diferença fina em UI web; confirma que a detecção "permanece longe de resolvida" mesmo em modelos frontier — [arXiv:2605.29615](https://arxiv.org/abs/2605.29615)
- Padrão de mercado em ferramentas de visual regression (Percy, Applitools, Chromatic): diff perceptual/pixel de baixo nível localiza *onde* olhar, LLM entra só na etapa de explicar/classificar a diferença já localizada — nunca substituindo o diff determinístico
