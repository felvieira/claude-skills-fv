# Video Analysis — Guia Técnico

Detalhes de comando para `skills/54-video-analysis/SKILL.md`. Abrir apenas quando for executar de fato — a skill principal fica enxuta de propósito.

## Download + legenda nativa

```bash
# tenta puxar legenda nativa da plataforma primeiro (sem baixar o vídeo inteiro se só precisar do texto)
yt-dlp --write-auto-sub --skip-download --sub-lang en,pt -o "%(id)s.%(ext)s" "<url>"

# se não há legenda, baixa o vídeo em qualidade razoável (não a máxima — reduz custo de frame extraction)
yt-dlp -f "best[height<=720]" -o "%(id)s.%(ext)s" "<url>"
```

Sempre confirmar com o usuário que ele tem direito de baixar o conteúdo antes de rodar isso — ver nota de ToS na skill principal.

## Extração de frames — 3 estratégias

**Keyframe** (`efficient`) — só cortes de cena, mais barato:
```bash
ffmpeg -skip_frame nokey -i input.mp4 -vsync vfr -frame_pts true out/frame_%04d.jpg
```
Cap em 50 frames. Se resultar em menos de 4 frames (vídeo muito estático), cair pro modo `uniform`.

**Scene-aware** (`balanced`, default) — detecção de mudança de cena + fallback uniforme:
```bash
ffmpeg -i input.mp4 -vf "select='gt(scene,0.3)',showinfo" -vsync vfr out/frame_%04d.jpg
```
Cap em 100 frames. Ajustar o limiar `0.3` pra mais sensível (`0.1`) ou menos (`0.5`) conforme o tipo de conteúdo.

**Uniform** (`token-burner`) — amostragem regular, sem cap, mais caro:
```bash
ffmpeg -i input.mp4 -vf "fps=1/10" out/frame_%04d.jpg
```
`fps=1/10` = 1 frame a cada 10s. Ajustar o intervalo conforme duração do vídeo e orçamento de contexto.

**Todas as estratégias:** redimensionar frames pra altura máxima de 1998px (compatibilidade de leitura de imagem):
```bash
ffmpeg -i frame_0001.jpg -vf "scale=-1:1998:force_original_aspect_ratio=decrease" frame_0001_resized.jpg
```

Orçamento de token aproximado: 80 frames a 512px de largura ≈ 50-80k tokens de imagem; subir pra 1024px multiplica por ~4.

## Pré-processamento de áudio (antes de qualquer transcrição)

```bash
ffmpeg -i input.mp4 -vn -ac 1 -ar 16000 -b:a 64k audio.mp3
```
Mono, 16kHz, 64kbps — reduz tamanho/tempo de processamento sem perder qualidade de transcrição relevante.

## Transcrição local (`faster-whisper`, default)

```python
from faster_whisper import WhisperModel

model = WhisperModel("base", device="cpu", compute_type="int8")  # "small"/"medium" para mais precisão, mais lento
segments, info = model.transcribe("audio.mp3", beam_size=5)

for segment in segments:
    print(f"[{segment.start:.2f}s -> {segment.end:.2f}s] {segment.text}")
```

Tamanhos de modelo disponíveis (trade-off velocidade/precisão): `tiny`, `base`, `small`, `medium`, `large-v3`. Default recomendado: `base` para transcrição geral, `small` quando precisão importa mais que velocidade.

Import-guard obrigatório no script (mesma convenção de `scripts/generate-image.py`):
```python
try:
    from faster_whisper import WhisperModel
    HAS_FASTER_WHISPER = True
except ImportError:
    HAS_FASTER_WHISPER = False

if not HAS_FASTER_WHISPER:
    raise RuntimeError("faster-whisper not installed. Run: pip install faster-whisper")
```

## Transcrição hosted (override opcional)

Endpoints (multipart/form-data manual, sem SDK):
- Groq: `https://api.groq.com/openai/v1/audio/transcriptions`, model `whisper-large-v3`
- OpenAI: `https://api.openai.com/v1/audio/transcriptions`, model `whisper-1`

Campos: `model`, `response_format: verbose_json`, `temperature: 0`, arquivo de áudio como anexo binário. Header `Authorization: Bearer <key>`.

**Chunking (arquivos > 24MB):** dividir proporcionalmente por tempo, extrair cada chunk via `ffmpeg -ss <start> -to <end> -c copy` (stream copy, sem re-encode), transcrever cada chunk independentemente, e deslocar os timestamps de cada segmento pelo offset do chunk pra reconstruir a linha do tempo original.

## Formato de saída (segments)

```json
[
  {"start": 0.0, "end": 2.5, "text": "texto transcrito do segmento"},
  {"start": 2.5, "end": 5.1, "text": "próximo segmento"}
]
```
