#!/usr/bin/env python3
import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path
from datetime import datetime

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    from rembg import remove as rembg_remove
    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False

MODELS = {
    "gpt-image-1-mini": {
        "t2i": "fal-ai/gpt-image-1-mini",
        "i2i": "fal-ai/gpt-image-1-mini/edit",
        "image_field": "image_urls",
        "use_image_size": True,
        "default_params": {"quality": "low", "background": "auto"},
    },
    "grok-imagine": {
        "t2i": "xai/grok-imagine-image",
        "i2i": "xai/grok-imagine-image/edit",
        "image_field": "image_url",
        "use_aspect_ratio": True,
    },
    "gemini-25-flash-image": {
        "t2i": "fal-ai/gemini-25-flash-image",
        "i2i": "fal-ai/gemini-25-flash-image/edit",
        "image_field": "image_urls",
        "use_aspect_ratio": True,
        "default_params": {"safety_tolerance": "4"},
    },
    "gemini-3-pro": {
        "t2i": "fal-ai/gemini-3-pro-image-preview",
        "i2i": "fal-ai/gemini-3-pro-image-preview/edit",
        "image_field": "image_urls",
        "use_aspect_ratio": True,
        "default_params": {"safety_tolerance": "4", "resolution": "1K"},
    },
    "gpt-image-1.5": {
        "t2i": "fal-ai/gpt-image-1.5",
        "i2i": "fal-ai/gpt-image-1.5/edit",
        "image_field": "image_urls",
        "use_image_size": True,
        "default_params": {"quality": "medium", "background": "auto"},
    },
}

ASPECT_TO_IMAGE_SIZE = {
    "1:1": "1024x1024",
    "4:3": "1536x1024",
    "3:2": "1536x1024",
    "16:9": "1536x1024",
    "21:9": "1536x1024",
    "3:4": "1024x1536",
    "2:3": "1024x1536",
    "9:16": "1024x1536",
}

TAURI_SIZES = [32, 128, 256, 512]


def detect_output_dir(base_path: Path) -> Path:
    if (base_path / "src-tauri" / "icons").exists():
        return base_path / "src-tauri" / "icons"
    if (base_path / "public").exists():
        return base_path / "public" / "images" / "generated"
    if (base_path / "assets").exists():
        return base_path / "assets" / "images"
    return base_path / "generated-images"


def load_fal_key() -> str:
    key = os.environ.get("FAL_KEY") or os.environ.get("FAL_API_KEY")
    if not key:
        for env_file in [".env.local", ".env"]:
            p = Path(env_file)
            if p.exists():
                for line in p.read_text().splitlines():
                    if "=" in line and line.split("=", 1)[0].strip() in ("FAL_KEY", "FAL_API_KEY"):
                        key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
            if key:
                break
    if not key:
        raise RuntimeError("FAL_KEY not found. Add FAL_KEY=... to .env.local")
    return key


def call_fal_api(endpoint: str, payload: dict, api_key: str) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"https://fal.run/{endpoint}",
        data=data,
        headers={"Authorization": f"Key {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def download_image(url: str, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, dest)


def build_payload(
    prompt: str,
    model_key: str,
    model_cfg: dict,
    image_url: str | None,
    aspect: str,
    quality: str | None,
    output_format: str,
) -> dict:
    payload: dict = {"prompt": prompt, "num_images": 1, "output_format": output_format}

    if model_cfg.get("use_image_size"):
        payload["image_size"] = ASPECT_TO_IMAGE_SIZE.get(aspect, "1024x1024")
    elif model_cfg.get("use_aspect_ratio"):
        payload["aspect_ratio"] = aspect

    if model_cfg.get("default_params"):
        payload.update(model_cfg["default_params"])

    if quality and "quality" in payload:
        payload["quality"] = quality

    if image_url:
        field = model_cfg["image_field"]
        payload[field] = [image_url] if field == "image_urls" else image_url

    return payload


def apply_post_process(image_path: Path, post_process: str, output_path: Path) -> Path:
    if post_process == "none":
        if image_path != output_path:
            image_path.rename(output_path)
        return output_path

    if post_process == "rembg":
        if not HAS_REMBG:
            raise RuntimeError("rembg not installed. Run: pip install rembg")
        result = rembg_remove(image_path.read_bytes())
        out = output_path.with_suffix(".png")
        out.write_bytes(result)
        return out

    if post_process.startswith("resize:"):
        if not HAS_PIL:
            raise RuntimeError("Pillow not installed. Run: pip install pillow")
        w, h = map(int, post_process.split(":")[1].split("x"))
        img = Image.open(image_path).resize((w, h), Image.LANCZOS)
        img.save(output_path)
        return output_path

    if post_process == "ico":
        if not HAS_PIL:
            raise RuntimeError("Pillow not installed. Run: pip install pillow")
        img = Image.open(image_path).convert("RGBA")
        ico_path = output_path.with_suffix(".ico")
        img.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
        img.resize((180, 180), Image.LANCZOS).save(output_path.parent / "apple-touch-icon.png")
        print(f"   + apple-touch-icon.png")
        return ico_path

    if post_process == "tauri-icons":
        if not HAS_PIL:
            raise RuntimeError("Pillow not installed. Run: pip install pillow")
        img = Image.open(image_path).convert("RGBA")
        for size in TAURI_SIZES:
            out = output_path.parent / f"{size}x{size}.png"
            img.resize((size, size), Image.LANCZOS).save(out)
            print(f"   + {out.name}")
        ico_path = output_path.parent / "icon.ico"
        img.resize((256, 256), Image.LANCZOS).save(
            ico_path, format="ICO", sizes=[(32, 32), (64, 64), (128, 128), (256, 256)]
        )
        print(f"   + icon.ico")
        return output_path.parent

    return image_path


def generate(args):
    api_key = load_fal_key()

    model_cfg = MODELS.get(args.model)
    if not model_cfg:
        raise ValueError(f"Unknown model: {args.model}. Available: {', '.join(MODELS.keys())}")

    use_edit = bool(args.image)
    endpoint = model_cfg["i2i"] if use_edit else model_cfg["t2i"]

    payload = build_payload(
        args.prompt, args.model, model_cfg, args.image, args.aspect, args.quality, args.format
    )

    print(f"\nGenerating image...")
    print(f"  Model   : {args.model} ({'edit' if use_edit else 'text-to-image'})")
    print(f"  Endpoint: {endpoint}")
    print(f"  Prompt  : {args.prompt[:80]}{'...' if len(args.prompt) > 80 else ''}")

    result = call_fal_api(endpoint, payload, api_key)
    images = result.get("images", [])
    if not images:
        raise RuntimeError(f"No images returned: {result}")

    image_url = images[0].get("url") or images[0]

    if args.output:
        output_path = Path(args.output)
    else:
        out_dir = detect_output_dir(Path.cwd())
        ts = datetime.now().strftime("%Y%m%d-%H%M%S")
        ext = "jpg" if args.format == "jpeg" else args.format
        output_path = out_dir / f"{args.type}-{ts}.{ext}"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    raw_path = output_path.with_stem(output_path.stem + "-raw")
    print(f"  Downloading...")
    download_image(image_url, raw_path)

    final = apply_post_process(raw_path, args.post_process, output_path)

    if raw_path.exists() and raw_path != final:
        raw_path.unlink()

    print(f"  Saved: {final}")
    return final


def main():
    parser = argparse.ArgumentParser(description="Generate images via fal.ai")
    parser.add_argument("prompt", help="Image generation prompt")
    parser.add_argument(
        "--mode", choices=["t2i", "i2i"], default="t2i",
        help="t2i = text-to-image, i2i = image-to-image (edit)"
    )
    parser.add_argument(
        "--type",
        choices=["layout", "hero", "icon", "favicon", "mascot", "background", "illustration"],
        default="layout",
    )
    parser.add_argument("--model", default="gemini-25-flash-image", choices=list(MODELS.keys()))
    parser.add_argument("--aspect", default="16:9", help="Aspect ratio, e.g. 16:9, 1:1, 9:16")
    parser.add_argument("--image", help="Reference image path or URL (required for i2i)")
    parser.add_argument("--post-process", default="none", dest="post_process",
                        help="none | rembg | resize:WxH | ico | tauri-icons")
    parser.add_argument("--output", help="Output file path (auto-detected if omitted)")
    parser.add_argument("--quality", choices=["low", "medium", "high"])
    parser.add_argument("--format", default="png", choices=["png", "jpeg", "webp"])

    args = parser.parse_args()

    if args.mode == "i2i" and not args.image:
        parser.error("--image is required for i2i mode")

    generate(args)


if __name__ == "__main__":
    main()
