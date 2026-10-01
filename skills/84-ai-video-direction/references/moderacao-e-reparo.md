# Moderação e reparo

Reparar é alterar a menor parte suficiente e preservar o que funcionou. Antes de regerar qualquer
coisa: assistir o clipe inteiro, montar a folha de quadros e listar **com timecode** o que presta.

## 1. Filtro de segurança

| Fato observado | Consequência |
|---|---|
| bloqueio volta como `status: nsfw` | na Higgsfield não foi cobrado; validação e saldo também não |
| final com contato de mãos + "slow motion" + queda ou altura foi barrado | descrever o contato como gesto calmo e a luz como suave |
| dois close-ups de uma mulher com palavras de intimidade foram barrados | reescrever mais curto, sem vocabulário de intimidade |
| cenas de perigo (trilho, desabamento) podem ser barradas | perigo sem ferimento: "nobody is hurt: no blood, no bodies" |
| repetir o mesmo texto repete o bloqueio | moderação é permanente **para aquele texto** |

**Reescrita calma** (todos os 4 bloqueios do filme passaram assim):

| Antes | Depois |
|---|---|
| they grab each other's hands desperately in slow motion as she falls | their two open right hands meet gently, fingertips first, then palm to palm; both are calm and smiling |
| intense close-up of her face, lips parted, breathless | medium close-up; she smiles softly and looks at him |
| blinding explosion of light swallows them | a soft spiral of warm white-gold light, like sunlight through clouds, gently fills the frame |
| she screams and falls | she slips and catches the edge with both hands |

Não é para tirar o perigo da história: é para descrever o contato e o desfecho em termos físicos
e calmos. Se a mesma cena falhar duas vezes reescrita, dividir (o contato num plano próprio, mais
aberto) ou mudar o ângulo.

## 2. Tabela falha → primeiro ajuste → escalada

| Falha observada | Primeiro ajuste | Escalada |
|---|---|---|
| clipe vira passeio de imagens bonitas | escrever ação e consequência | rever o engine da cena |
| romance artificial | tarefa específica e reciprocidade (estímulo → resposta) | rever o motor da relação, menos sinais |
| ação confusa | rota, distâncias e resultado | separar em unidades menores (mais clipes) |
| identidade muda | conferir folha e conflito de referências | folha melhor, menos oclusão do rosto, plano mais fechado |
| mão ou objeto se funde | contato legível (quem, qual mão, onde) | outro ângulo ou insert dedicado |
| geografia espelha | landmarks e lado fixo da câmera | plano de reorientação; placa do eixo certo |
| corte não acontece | sequência explícita com tempos | gerar os planos em clipes separados |
| diálogo não cabe | encurtar | dividir o clipe ou alongar a duração |
| fala em outro idioma | AUDIO POLICY + "in Brazilian Portuguese" em cada fala | clipe só com a fala, rosto grande |
| texto ilegível ou inventado | tirar texto do render | inserir na edição |
| movimento congela | tarefa motivada, ação contínua até o fim | rever o final (clímax em movimento) |
| câmera não obedece | posição física (altura, lado, distância, mira) | movimento mais simples |
| som varia entre clipes | política de áudio uniforme | uniformizar na pós |
| personagem flutua | cláusula GRAVITY + o que sustenta o corpo + ordem causal | mecanismo maior e visível na placa |
| objeto reaparece | STATE IN explícito sobre onde ele está | frase "never comes back" na CONTINUITY |
| acessório some e cabeça fica careca | "never comes off" | folha nova mostrando o personagem sem ele |
| vítima se salva sozinha | distância ao apoio seguro + placa do lado do perigo | herói vai até ela, escrito no SHOT |
| perigo sem causa | aviso → sintoma → piora → colapso | plano de aviso separado |
| multidão com cor do protagonista | paleta da multidão listada | "she is the only woman in <cor>" |
| rosto pequeno, boca ilegível no talking head | quadro-base peito para cima, rosto grande | trocar de modelo (Seedance 2.5, Wan 3.0, H3 foram os melhores) |
| rosto amplia ou deforma | tirar o parâmetro de câmera do endpoint ou o push-in do prompt (nunca os dois) | image-to-video com plano fixo |
| boca exagerada, sorriso forçado, olhos fechando | "natural conversational rhythm", "small warm smile", menos ênfase | outro modelo |
| reference-to-video mudou o cenário | "start from this exact composition" | endpoint image-to-video com o quadro-base |
| fala não cabe no clipe | ~11 palavras por 5 s | alongar a duração ou dividir |

Uma variável por tentativa quando se está **diagnosticando** a causa. Se várias contradições já são
conhecidas, corrigir tudo junto e registrar que aquela comparação não isola variável. Se a mesma
estratégia falhou duas vezes, simplificar, dividir ou resolver na pós. Nunca repetir indefinidamente.

## 3. Reaproveitar por timecode

1. Assistir o clipe inteiro; folha de quadros; anotar `arquivo, início–fim, o que presta`.
2. Regerar só o beat quebrado, num clipe novo cujo STATE IN é o estado do último quadro bom.
3. Montar com o trecho bom + o clipe novo (corte por elipse ou match).
4. Registrar no roteiro qual trecho de qual arquivo entra.

```bash
# extrair 1,96 s a 4,71 s de um clipe antigo, recodificando para cortar no quadro exato
ffmpeg -ss 1.96 -to 4.71 -i S5_C3_v1.mp4 -c:v libx264 -crf 17 -preset slow -c:a aac -b:a 256k S5_C3_trecho.mp4
```

No filme, uma sequência foi montada com o clipe 1 da versão 1, o clipe 2 da versão 2, um trecho de
2,75 s da versão 1 (close sob a capa) e os clipes 3 e 4 da versão 2.

## 4. Clipes curtos em vez de um longo

Um clipe de 22 s com 12 ações falhou em ordem e física; 3–5 clipes de 5–8 s, com quadro inicial e
final definidos por texto, passaram, e cada um se refaz sozinho.

## 5. Feedback do usuário vira regra do projeto

O usuário reclama em linguagem natural ("fiquei careca sem chapéu", "a física de subir está
errada", "ela reagiu sem olhar"). Para cada reclamação:

1. Classificar a seção atingida: adereço, gravidade, geografia, fala, época, atuação, continuidade.
2. Corrigir só os clipes afetados; reaproveitar os bons.
3. Gravar a regra num livro de regras do projeto (como o CORE), com o erro real ao lado; ela entra em
   **todos** os clipes seguintes, não só no reparado.

Regras que se repetem em projetos diferentes viram regra geral (foi assim que nasceram as de
`fisica-e-continuidade.md`).

## 6. Prompt como arquivo-fonte

Para revisão longa: o arquivo-fonte da sequência é a fonte da verdade. Preservar as seções fortes,
remendar só a fraca, recompilar. Não reescrever o prompt inteiro a cada tentativa, porque isso
destrói o que funcionava e impede saber o que mudou.

## 7. Registro

Guardar, por tentativa: versão do prompt, assets enviados, modelo e parâmetros, custo real, vídeo,
falha observada com timecode e o ajuste feito. Seed só se o endpoint de fato aceitar ou devolver.
