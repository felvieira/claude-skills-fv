# Custos e orçamento

Política: **anunciar o custo antes de cada rodada paga e esperar o ok.** Rodada = um lote de folhas,
um lote de placas, os clipes de uma sequência, a trilha, os SFX. Mostrar por item e o total.

## 1. Preços de referência (medidos em 29–30/09/2026; conferir com `/estimate`)

| Item | Preço | Exemplo |
|---|---|---|
| Seedance 2.5 reference-to-video, 480p | US$ 0,2056/s | clipe de 7 s ≈ 1,44 |
| Seedance 2.5, 720p (usado no filme) | US$ 0,4622/s | 5 s ≈ 2,31 · 7 s ≈ 3,24 · 8 s ≈ 3,70 · 15 s ≈ 6,93 · 22 s ≈ 10,17 |
| Seedance 2.5, 1080p | US$ 1,1372/s | 7 s ≈ 7,96 |
| folha de personagem | US$ 0,08–0,12 | Grok Imagine 2.0 ou Nano Banana 2 |
| placa de cenário | US$ 0,08–0,10 | Grok Imagine 2.0 |
| SFX | cerca de US$ 0,002/s | 3 s ≈ 0,006 |
| trilha e STT | centavos por chamada | conferir no fal |
| `/estimate` | grátis | |

Ordens de grandeza do filme: uma sequência de 4 clipes e 27 s a 720p ≈ US$ 12,48; 16 clipes e 109 s
≈ US$ 50,38 só de vídeo na primeira passada. Houve cerca de 25 regerações ao longo da produção.

## 2. Estimar antes

1. `--dry` em cada job: faz upload com cache, chama `/estimate` e imprime o US$ estimado.
2. Modelos medidos por token devolvem descrição, não `usd`: calcular
   `ceil(altura × largura × (segundos + segundos de vídeo de entrada) × 24 / 1024)` tokens a
   US$ 0,0214 por mil (Seedance 2.5 e Cinema Studio, 480p/720p), 0,0234 (Seedance 2.5 1080p),
   0,014 (Seedance 2.0). Para fallback simples, segundos × tabela da resolução.
3. Somar por rodada e mostrar:

```text
Rodada: sequência 2 (4 clipes, 720p, 21:9)
  C1 8 s  US$ 3,70
  C2 7 s  US$ 3,24
  C3 7 s  US$ 3,24
  C4 5 s  US$ 2,31
  Total   US$ 12,48   (27 s × 0,4622; saldo atual: conferir)   Confirma?
```

4. Folga para reparo: planejar pelo menos uma refação por clipe nas sequências de ação. Protótipo
   a 480p é uma opção quando o objetivo é testar física e ordem, não rosto (heurística, não medido
   no filme).

## 3. Saldo e trava de orçamento

Medido: a API respondeu "Your credit balance is too low to complete this request" (`failed` em ~7 s,
sem cobrança) quando o saldo real era cerca de metade do que o usuário achava.

- Conferir o saldo no painel de billing **antes** de cada lote; não há endpoint público de saldo
  conhecido.
- Deixar 10–15% de folga sobre o estimado.
- Executor com trava: soma a seleção e recusa se passar de `--max=USD`; `--dry` mostra os corpos.
- Ordenar a fila por prioridade; o item mais caro ou menos certo vai por último; parar no primeiro
  erro de saldo.

Preços reais de uma rodada de talking head (5 s, 9:16, 720p): Seedance 2.5 2,31; LTX 2.5 Pro 0,72
(6 s); Grok Imagine Video 1.5 0,71; MiniMax H3 0,65 (2K); Kling 3.0 std 0,63; Wan 3.0 0,50;
PixVerse V6 0,26; dois quadros-base no fal 0,24; STT de todos os clipes 0,02. Seedance 2.5 a 480p
custa cerca de 1,03. Genjutsu cobra o vídeo de **entrada** arredondado para cima por segundo: aparar
a fonte para 5,000 s (`ffmpeg -t 5.0`) antes de enviar evita pagar 6 s.

## 4. Ledger previsto × real

`out/ledger.jsonl`, uma linha por chamada (`ts`, `job`, `modelo`, `request_id`, `status`,
`usdEstimado`, `duracao`, motivo da falha). Ao fim de cada rodada, conferir com o extrato do provedor
e anotar o real. Três números de custo que não batem são sinal de cobrança duplicada ou erro de
estimativa; resolver antes da próxima rodada.

## 5. O que não é cobrado (e o que pode ser)

| Situação | Higgsfield | fal |
|---|---|---|
| moderação (`nsfw`) | não cobrou | erros de moderação e validação apareceram cobrados num produto; conferir no extrato |
| falha de validação de campo | não | idem |
| saldo insuficiente | não (falha antes de gerar) | — |
| timeout do **seu** script | pode ter cobrado: o job continua no provedor | idem |

Consequências:

- Moderação: não insistir no mesmo texto; reescrever calmo (`moderacao-e-reparo.md`).
- Timeout: retomar pelo `request_id`, nunca reenviar.
- Um clipe só entra uma vez no ledger, mesmo que o QA rejeite e haja nova tentativa (a nova é outra
  linha, com outro `request_id`).

## 6. Economia que funcionou

| Prática | Efeito |
|---|---|
| etapas de texto aprovadas antes de qualquer geração | erro de história não custa vídeo |
| folhas e placas com QA antes de virar referência | refazer imagem custa centavos; refazer clipe, dólares |
| clipes de 5–8 s | refaz só o quebrado |
| reaproveitar trecho por timecode | regera só o beat ruim |
| cache de upload por hash | sem reenviar a mesma folha |
| todos os clipes da sequência em paralelo | menos tempo, mesmo custo |
| `/estimate` antes | sem surpresa de resolução ("a partir de" é o preço da menor) |
