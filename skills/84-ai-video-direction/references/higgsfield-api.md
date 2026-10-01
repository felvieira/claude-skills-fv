# API da Higgsfield

Tudo aqui foi usado ou medido entre 29 e 30/09/2026. Preço e catálogo mudam: antes de orçar, chamar
`/estimate` (grátis) e abrir a página do modelo em `open.higgsfield.ai/models/<model-id>/api-reference`.
Nunca inferir o model ID do nome de exibição; nunca inventar campo que a página não lista.

## 1. Autenticação e segredo

- Base: `https://api.higgsfield.ai`
- Cabeçalho: `Authorization: Key <HF_CREDENTIALS>` (formato `KEY_ID:KEY_SECRET`), `Content-Type: application/json`.
- A credencial vem só da variável de ambiente `HF_CREDENTIALS`. O script lê do ambiente, nunca
  imprime, nunca grava em job JSON, log ou commit. Se ela aparecer em texto, avisar para regenerar.

## 2. Fluxo de uma chamada

| Passo | Requisição | Resposta |
|---|---|---|
| 1. upload de cada referência | `POST /files/generate-upload-url` com `{"content_type":"image/png"}` | `{upload_url, upload_headers?, public_url}` |
| 2. enviar bytes | `PUT <upload_url>` com os bytes, `Content-Type` e `upload_headers` | 200 |
| 3. estimar (grátis) | `POST /estimate/<model-id>` com o mesmo corpo do envio | ver §5 |
| 4. enviar | `POST /<model-id>` com o corpo | `{request_id, status_url}` |
| 5. acompanhar | `GET /requests/<request_id>/status` (ou `status_url`) | `status` e, ao concluir, `video.url` ou `images[].url` |
| 6. baixar | `GET <video.url>` | MP4; mover para o seu disco/storage (URL do provedor expira) |

Estados finais: `completed`, `failed`, `nsfw`, `canceled`. Qualquer outro é "em andamento".

**Cache de upload por SHA-256 do arquivo** (`refs/upload-cache.json`: hash → `public_url`): a mesma
folha não é reenviada a cada clipe.

### Esqueleto em Node (sem dependências)

```js
const API = 'https://api.higgsfield.ai';
const auth = { Authorization: 'Key ' + process.env.HF_CREDENTIALS, 'Content-Type': 'application/json' };
async function json(r, ctx) {
  const t = await r.text(); let c; try { c = JSON.parse(t); } catch { c = { raw: t.slice(0, 300) }; }
  if (!r.ok) throw new Error(`${ctx} HTTP ${r.status} ${JSON.stringify(c).slice(0, 300)}`);
  return c;
}
// envio
const ini = await json(await fetch(`${API}/${model}`, { method: 'POST', headers: auth,
  body: JSON.stringify(input), signal: AbortSignal.timeout(60_000) }), 'submit');
await appendLedger({ job, model, request_id: ini.request_id, status: 'submitted' }); // ANTES do polling
// polling com backoff 5 s → ×1,3 → teto 15 s, limite 25 min
let espera = 5000, st; const fim = Date.now() + 25 * 60_000;
for (;;) {
  if (Date.now() > fim) throw new Error('timeout; retomar pelo request_id ' + ini.request_id);
  await new Promise((r) => setTimeout(r, espera)); espera = Math.min(espera * 1.3, 15_000);
  st = await json(await fetch(ini.status_url ?? `${API}/requests/${ini.request_id}/status`,
    { headers: auth, signal: AbortSignal.timeout(30_000) }), 'status');
  if (['completed', 'failed', 'nsfw', 'canceled'].includes(st.status)) break;
}
```

Todo `fetch` com `AbortSignal.timeout` (inclusive o download, ~300 s): fetch sem timeout já deixou
um worker preso 12 min depois de o provedor ter cobrado.

### Retomada pelo id da requisição

O job pode terminar no provedor **depois** que o script desistiu (aconteceu com um clipe que passou
de 25 min). Por isso o `request_id` vai para o ledger antes do polling, e existe um comando de
retomada que consulta `/requests/<id>/status` a cada 30 s por até 40 min e baixa quando concluir.
**Nunca reenviar o mesmo job por timeout**: é pagar duas vezes.

### Falhas

| Estado | Causa típica | Cobra? | O que fazer |
|---|---|---|---|
| `nsfw` | filtro de segurança | não | reescrita calma (`moderacao-e-reparo.md`); não repetir o mesmo texto |
| `failed` | saldo insuficiente ("Your credit balance is too low to complete this request", em ~7 s), validação, erro interno | não (validação e saldo não cobram) | ler o motivo no status, gravar no ledger e **parar o lote** no primeiro erro de saldo |
| HTTP 4xx no envio | campo inválido, modelo inexistente (`model_not_found`) | não | corrigir o corpo pela página do modelo |
| timeout do script | job lento | pode ter cobrado | retomar pelo `request_id` |

## 3. Seedance 2.5 `reference-to-video` (o caminho do filme)

Model ID: `bytedance/seedance-2.5/reference-to-video`.

| Campo | Valores |
|---|---|
| `prompt` | texto do clipe (template v4) |
| `image_urls` | folhas dos personagens + placa (+ folha de animal/objeto), na ordem do `ACTIVE REFERENCES`. O filme usou 3 ou 4; a doc não publica teto (o mesmo modelo no fal aceita 10) |
| `video_urls` | vídeo de referência (movimento/câmera); a duração do vídeo de entrada **também é cobrada** |
| `audio_urls` | áudio de referência |
| `duration` | inteiro, 4 a 30 s |
| `resolution` | `480p`, `720p`, `1080p` |
| `aspect_ratio` | `16:9`, `4:3`, `1:1`, `3:4`, `9:16`, `21:9` (21:9 a 720p sai em **1470×630**) |
| `generate_audio` | `true` para fala nativa com lip sync e som diegético |
| `output_format` | `mp4` ou `mov` |

**Não tem** campo de quadro inicial (`image_url`): é referência, não animação de imagem. Mandar só
folhas + placa; quadro inicial piorou o rosto em todos os testes.

```json
{ "prompt": "…", "image_urls": ["<folha A>", "<folha B>", "<placa>"], "duration": 7,
  "resolution": "720p", "aspect_ratio": "21:9", "generate_audio": true, "output_format": "mp4" }
```

## 4. Endpoints image-to-video e outros modos

Image-to-video trata a imagem como **primeiro quadro** (cena preservada); reference-to-video trata
como **referência** (a cena pode mudar). Corpos verificados em 30/09/2026:

| Model ID | Campos |
|---|---|
| `bytedance/seedance-2.0/image-to-video` | `prompt`, `image_url`, `end_image_url`, `duration` 4–15, `resolution` até 4k, `generate_audio` |
| `kling-video/v3.0/std/image-to-video` | `prompt`, `image_url`, `last_image_url`, `duration` 3–15, `sound` on/off, `multi_shots`, `multi_prompt`, `elements`, `cfg_scale`; 720p fixo, segue a proporção da imagem |
| `minimax/h3/image-to-video` | `prompt` (obrigatório), `image_url`, `end_image_url`, `duration` 5–15, `resolution: 2K`, `aspect_ratio` auto, adaptive, 21:9 … 9:16 |
| `alibaba/wan-3.0/image-to-video` e `alibaba/wan-3.0-prime/image-to-video` | `prompt` (obrigatório), `image_url`, `end_image_url`, `duration` 2–30, `resolution` 480p/720p/1080p, `aspect_ratio` (inclui adaptive), `generate_audio`, `enable_thinking`, `seed` |
| `wan/v2.7/image-to-video` | `prompt`, `image_url`, `audio_url`, `duration` 2–15, `resolution` 720p/1080p, `negative_prompt`, `prompt_extend` |
| `alibaba/happy-horse/v1.1/image-to-video` | `prompt`, `image_url`, `duration` 2–15, `resolution` 720p/1080p |
| `lightricks/ltx-2.5/image-to-video/pro` | `prompt`, `image_url`, `duration` **só 6, 8 ou 10**, `resolution` 720p/1080p, `aspect_ratio` 16:9/9:16, `fps` 24/25/50, `generate_audio`, `camera_movement` (dolly_in/out/left/right, jib_up/down, static, focus_shift) |
| `xai/grok-imagine-video/v1.5/reference-to-video` | `prompt`, `image_url`, `image_urls`, `audio_url`, `duration` 1–15, `resolution` 480p/720p/1080p, `aspect_ratio` auto, 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3. O slug `…/image-to-video` **não existe** (404 `model_not_found`) |
| `pixverse/v6/image-to-video` | `prompt`, `image_url`, `end_image_url`, `duration` 1–15, `resolution` 360p/540p/720p/1080p, `generate_audio`, `negative_prompt`, `seed` |
| `higgsfield/genjutsu/motion-transfer/v1.0` | `prompt` opcional, `video_url` (≥ 4 s, máx 30 s), `image_urls` 1–8, `resolution` 480p/720p/1080p |
| `higgsfield/cinema-studio/4.0` | a doc **só lista `prompt`**; testado com o corpo do Seedance (`image_urls`, `duration`, `resolution`, `aspect_ratio`, `generate_audio`); passou de 15 min na fila sem resultado na medição |

Regras: não combinar `camera_movement` com movimento de câmera escrito no prompt (o LTX ampliou o
rosto demais); MiniMax H3 e Grok falaram PT-BR mesmo sem parâmetro de áudio. Para pessoas
recorrentes em várias cenas, prefira reference-to-video com folhas; para talking head com quadro-base
exato, image-to-video (ver `talking-head-e-apresentador.md`).

## 5. `/estimate` e preço

`POST /estimate/<model-id>` é grátis e aceita o mesmo corpo do envio. **Não valida o schema**: aceita campos desconhecidos sem reclamar, então estimativa ok não prova corpo válido. Dois formatos de resposta:

| Modelo | Resposta |
|---|---|
| preço fixo (ex.: Soul 2) | `{"type":"estimate","credits":…,"usd":…}` |
| medido por token (Seedance 2.5, Cinema Studio, Seedance 2.0) | `{"type":"description","pricing_description":"…"}` (tabela + fórmula, sem `usd`) |

Código que exige `usd` quebra no Seedance; calcular pela fórmula:

```
tokens = ceil(altura × largura × (segundos gerados + segundos de vídeo de entrada) × 24 / 1024)
custo  = tokens / 1000 × tarifa
tarifa = US$ 0,0214 (Seedance 2.5 e Cinema Studio 4.0, 480p/720p); 0,0234 (Seedance 2.5 a 1080p);
         0,014 (Seedance 2.0)
```

Tabela de lista do Seedance 2.5 (16:9, sem vídeo de entrada), por segundo: **US$ 0,2056 a 480p,
0,4622 a 720p, 1,1372 a 1080p**. A vitrine mostra o preço "a partir de", que é o da menor
resolução: orçar com o da resolução real. Um clipe de teste de 5 s a 720p custou cerca de US$ 2,31.

## 6. Catálogo e preço por modelo

Preço real da rodada de 30/09/2026 (5 s, 9:16, 720p salvo indicação). O catálogo completo, com
todos os modos, aparece num mapa do site `open.higgsfield.ai` (há mais do que a página /explore);
para ler só a tabela de parâmetros de uma página, um scrape com extração dirigida é barato
(respeitar o limite de ~10 requisições por minuto; 429 vem com retry-after).

### Vídeo

| Modelo | Model ID | Preço | Quando escolher |
|---|---|---|---|
| Seedance 2.5 reference-to-video | `bytedance/seedance-2.5/reference-to-video` | token: 5 s em 9:16 ≈ 1,03 (480p), 2,31 (720p) | **padrão** para personagens recorrentes (folhas + placa) e talking head mais fiel |
| Seedance 2.5 text-to-video, video-edit, video-extend | `bytedance/seedance-2.5/text-to-video` (os outros: conferir) | token | plano sem pessoa conhecida; editar ou estender clipe |
| Seedance 2.0 | `bytedance/seedance-2.0/text-to-video`, `…/image-to-video`, `…/reference-to-video` | token a 0,014/mil: 720p 5 s = 1,51 | 4–15 s, até 4K; perfil separado do 2.5 |
| Cinema Studio 4.0 | `higgsfield/cinema-studio/4.0` | token, como o Seedance 2.5 | camada de configurações sobre o Seedance 2.5; a doc não lista os campos, mas aceitou `image_urls`, `duration`, `resolution`, `aspect_ratio` e `generate_audio` como no Seedance (medido: 5 s 9:16 720p = US$ 2,31, 963 s de fila, identidade e fala em PT-BR OK) |
| Genjutsu motion-transfer | `higgsfield/genjutsu/motion-transfer/v1.0` | por s de vídeo **de entrada**, arredondado para cima: 0,318 (480p), 0,681 (720p), 1,632 (1080p) | trocar a pessoa mantendo a atuação de um vídeo-fonte |
| Genjutsu object-swap | conferir | conferir | trocar um objeto num vídeo |
| Kling 3.0 std | `kling-video/v3.0/std/image-to-video`, `…/text-to-video` | 0,63 por 5 s (i2v com som) | rápido (81 s), boa identidade, boca exagerada |
| Kling 3.0 pro / turbo / 4k | conferir | conferir | pro e 4k para acabamento; turbo para iteração |
| MiniMax H3 | `minimax/h3/image-to-video`, `…/text-to-video` | 0,65 por 5 s (2K) | 1440×2560 no vertical, boa identidade |
| MiniMax Hailuo 2.3 | conferir | conferir | alternativa de movimento |
| Wan 3.0 | `alibaba/wan-3.0/image-to-video` | 0,05/s (480p), 0,10/s (720p), 0,20/s (1080p) | **melhor custo-benefício** em talking head |
| Wan 3.0 Prime | `alibaba/wan-3.0-prime/image-to-video`, `…/text-to-video` | cerca de 0,70 por 5 s a 720p | 2–30 s, áudio nativo |
| Wan 2.7 | `wan/v2.7/image-to-video` | cerca de 0,50 por 5 s | aceita `audio_url` (áudio de referência) |
| Wan 2.6 | conferir | conferir | B-roll barato |
| Happy Horse 1.1 / 1.0 | `alibaba/happy-horse/v1.1/image-to-video` (1.0: conferir) | cerca de 0,70 por 5 s | não comparado ainda |
| LTX 2.5 Fast | `lightricks/ltx-2.5/text-to-video/fast` | 0,09/s (de lista) | rascunho |
| LTX 2.5 Pro | `lightricks/ltx-2.5/image-to-video/pro` | 0,72 por 6 s | o pior em rosto na rodada; duração só 6/8/10 |
| Grok Imagine Video 1.5 | `xai/grok-imagine-video/v1.5/reference-to-video` | 0,71 por 5 s | rápido (66 s), mas reinterpreta o cenário |
| PixVerse V6 | `pixverse/v6/image-to-video` | 0,26 por 5 s | o mais barato; sorriso exagerado |
| Veo 3.1 Lite | conferir | conferir | comparar com Seedance em 1 clipe antes de usar |

### Imagem

| Modelo | Model ID | Custo | Quando escolher |
|---|---|---|---|
| Grok Imagine 2.0 | `xai/grok-imagine-image-2.0` | US$ 0,08–0,10 | **placas**; folhas com várias referências (`image_urls`), `quality: medium`, `resolution: 2k` |
| Soul 2 / Soul Standard | `higgsfield-ai/soul/v2/standard` | cerca de US$ 0,004–0,006 | retratos; personagem por Soul ID (uma pessoa por chamada) |
| Marketing Studio Image | `marketing-studio/image` | cerca de US$ 0,44 | peças de marketing, edição, até 4K |
| Ideogram 4.0 | `ideogram/v4.0` | cerca de US$ 0,03 | texto legível dentro da imagem (nunca em folha) |
| Recraft 4.1 | conferir | conferir | ilustração e vetor |
| Qwen Image 3 | conferir | conferir | alternativa geral |
| Z-Image Turbo | conferir | conferir | rascunho rápido |

**Não estão na API** (`model_not_found` medido): Seedream, Nano Banana, GPT Image. Seedream só na
plataforma web, com plano pago. Quadro-base e folha a partir de foto real: Nano Banana 2 edit no fal
(`fal-ai/nano-banana-2/edit`, ~US$ 0,12).

## 7. O que não está garantido (tratar como desconhecido)

| Item | Tratamento |
|---|---|
| número máximo de planos ou cortes por geração | desconhecido; não inferir de exemplos |
| precisão dos tempos dos SHOTs | alvo narrativo; conferir no vídeo, sem promessa quadro a quadro |
| identidade estável | objetivo e critério de QA, sem garantia percentual |
| FOV, focal, obturador e fps escritos no prompt | descritores de aparência; não há parâmetro formal |
| `seed` e `negative_prompt` | ausentes da documentação consultada; não inventar |
| referência de áudio = voz clonada persistente | não comprovado |
| limites do Seedance 2.0 aplicados ao 2.5 (ou o contrário) | perfis separados; não herdar |

Prioridade de fonte: schema oficial do endpoint para parâmetros; relatório e página dos
desenvolvedores para capacidades; guias da plataforma para prompting; teste próprio registra o
comportamento de uma versão, sem virar capacidade garantida.

## 8. Job JSON e execução em lote

```json
{ "name": "S2v2_ponte_C3", "model": "bytedance/seedance-2.5/reference-to-video",
  "refField": "image_urls", "refs": ["base/folha_A.png", "base/folha_B.png", "base/placa.png"],
  "outDir": "out/videos/v4",
  "input": { "prompt": "…", "duration": 7, "resolution": "720p", "aspect_ratio": "21:9",
             "generate_audio": true, "output_format": "mp4" } }
```

- `node hf-video.mjs job.json --dry` faz upload (com cache), chama `/estimate` e imprime modelo,
  número de refs, duração, resolução e US$ estimado. Sem `--dry`, envia, acompanha e baixa.
- Lote: um processo por clipe da sequência, em paralelo, stdout/stderr por clipe em `out/logs/`,
  esperar todos e imprimir a última linha de cada. Conferir saldo antes; limitar a concorrência.
- Ledger: uma linha por chamada com `ts`, `job`, `modelo`, `request_id`, `status`, `usdEstimado`,
  `duracao` e, na falha, o motivo.
