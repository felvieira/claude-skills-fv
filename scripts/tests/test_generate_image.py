import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import importlib.util
spec = importlib.util.spec_from_file_location(
    "generate_image",
    Path(__file__).parent.parent / "generate-image.py"
)
generate_image = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generate_image)

detect_output_dir = generate_image.detect_output_dir
build_payload = generate_image.build_payload
MODELS = generate_image.MODELS
ASPECT_TO_IMAGE_SIZE = generate_image.ASPECT_TO_IMAGE_SIZE


class TestDetectOutputDir:
    def test_tauri_project(self, tmp_path):
        (tmp_path / "src-tauri" / "icons").mkdir(parents=True)
        assert detect_output_dir(tmp_path) == tmp_path / "src-tauri" / "icons"

    def test_nextjs_project(self, tmp_path):
        (tmp_path / "public").mkdir()
        assert detect_output_dir(tmp_path) == tmp_path / "public" / "images" / "generated"

    def test_assets_project(self, tmp_path):
        (tmp_path / "assets").mkdir()
        assert detect_output_dir(tmp_path) == tmp_path / "assets" / "images"

    def test_unknown_project(self, tmp_path):
        assert detect_output_dir(tmp_path) == tmp_path / "generated-images"

    def test_tauri_takes_priority_over_public(self, tmp_path):
        (tmp_path / "src-tauri" / "icons").mkdir(parents=True)
        (tmp_path / "public").mkdir()
        assert detect_output_dir(tmp_path) == tmp_path / "src-tauri" / "icons"


class TestBuildPayload:
    def test_t2i_gemini_flash_aspect_ratio(self):
        cfg = MODELS["gemini-25-flash-image"]
        payload = build_payload("test prompt", "gemini-25-flash-image", cfg, None, "16:9", None, "png")
        assert payload["prompt"] == "test prompt"
        assert payload["aspect_ratio"] == "16:9"
        assert payload["num_images"] == 1
        assert payload["output_format"] == "png"
        assert "image_urls" not in payload
        assert "image_url" not in payload

    def test_t2i_gpt_mini_uses_image_size(self):
        cfg = MODELS["gpt-image-1-mini"]
        payload = build_payload("test", "gpt-image-1-mini", cfg, None, "16:9", None, "png")
        assert payload["image_size"] == "1536x1024"
        assert "aspect_ratio" not in payload

    def test_i2i_gemini_flash_image_urls(self):
        cfg = MODELS["gemini-25-flash-image"]
        payload = build_payload("edit this", "gemini-25-flash-image", cfg, "https://example.com/img.png", "1:1", None, "png")
        assert payload["image_urls"] == ["https://example.com/img.png"]

    def test_i2i_grok_single_image_url(self):
        cfg = MODELS["grok-imagine"]
        payload = build_payload("edit", "grok-imagine", cfg, "https://example.com/img.png", "1:1", None, "png")
        assert payload["image_url"] == "https://example.com/img.png"
        assert "image_urls" not in payload

    def test_quality_override(self):
        cfg = MODELS["gpt-image-1-mini"]
        payload = build_payload("test", "gpt-image-1-mini", cfg, None, "1:1", "high", "png")
        assert payload["quality"] == "high"

    def test_default_params_applied(self):
        cfg = MODELS["gemini-3-pro"]
        payload = build_payload("test", "gemini-3-pro", cfg, None, "1:1", None, "png")
        assert payload["safety_tolerance"] == "4"
        assert payload["resolution"] == "1K"


class TestAspectToImageSize:
    def test_square(self):
        assert ASPECT_TO_IMAGE_SIZE["1:1"] == "1024x1024"

    def test_landscape(self):
        assert ASPECT_TO_IMAGE_SIZE["16:9"] == "1536x1024"

    def test_portrait(self):
        assert ASPECT_TO_IMAGE_SIZE["9:16"] == "1024x1536"


class TestModels:
    def test_all_models_have_t2i(self):
        for key, cfg in MODELS.items():
            assert "t2i" in cfg, f"{key} missing t2i endpoint"

    def test_all_models_have_i2i(self):
        for key, cfg in MODELS.items():
            assert "i2i" in cfg, f"{key} missing i2i endpoint"

    def test_all_models_have_image_field(self):
        for key, cfg in MODELS.items():
            assert "image_field" in cfg, f"{key} missing image_field"
