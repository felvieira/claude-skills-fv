#!/usr/bin/env python3
"""
video-transcribe-local.py — Transcricao local via faster-whisper (zero API key).

CLI:
  python scripts/video-transcribe-local.py --audio audio.mp3 --model base

Requer: faster-whisper instalado (pip install faster-whisper).
Policy: skills/54-video-analysis/SKILL.md
"""

import argparse
import json
import sys

try:
    from faster_whisper import WhisperModel
    HAS_FASTER_WHISPER = True
except ImportError:
    HAS_FASTER_WHISPER = False


def transcribe(audio_path, model_size="base"):
    if not HAS_FASTER_WHISPER:
        raise RuntimeError("faster-whisper not installed. Run: pip install faster-whisper")

    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segments, _info = model.transcribe(audio_path, beam_size=5)

    return [
        {"start": round(seg.start, 2), "end": round(seg.end, 2), "text": seg.text.strip()}
        for seg in segments
    ]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model", default="base", choices=["tiny", "base", "small", "medium", "large-v3"])
    args = parser.parse_args()

    try:
        segments = transcribe(args.audio, args.model)
    except Exception as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        sys.exit(1)

    print(json.dumps({"backend": "local", "model": args.model, "segments": segments}, ensure_ascii=False))


if __name__ == "__main__":
    main()
