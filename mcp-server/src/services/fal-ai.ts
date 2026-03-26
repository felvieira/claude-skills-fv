import { API_URLS } from "../constants.js";

export interface ImageGenerationResult {
  imagePath: string;
  prompt: string;
  model: string;
  metadata: Record<string, unknown>;
}

export async function generateImage(params: {
  mode: "t2i" | "i2i" | "rembg" | "ico";
  prompt?: string;
  imagePath?: string;
  model?: string;
  width?: number;
  height?: number;
}): Promise<ImageGenerationResult> {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error("FAL_KEY not configured. Set it in env or .env.local");
  }

  const model = params.model || selectModel(params.mode);

  const payload: Record<string, unknown> = {};

  if (params.mode === "t2i") {
    payload.prompt = params.prompt || "";
    if (params.width) payload.image_size = { width: params.width, height: params.height || params.width };
  } else if (params.mode === "i2i") {
    payload.prompt = params.prompt || "";
    payload.image_url = params.imagePath;
  } else if (params.mode === "rembg") {
    payload.image_url = params.imagePath;
  }

  const response = await fetch(`${API_URLS.falAi}/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${key}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`fal.ai error: ${response.status} — ${errorText}`);
  }

  const data = await response.json() as any;
  const imageUrl = data.images?.[0]?.url || data.image?.url || "";

  return {
    imagePath: imageUrl,
    prompt: params.prompt || "",
    model,
    metadata: data,
  };
}

function selectModel(mode: string): string {
  switch (mode) {
    case "t2i":
      return "fal-ai/flux/schnell";
    case "i2i":
      return "fal-ai/flux/dev/image-to-image";
    case "rembg":
      return "fal-ai/birefnet";
    case "ico":
      return "fal-ai/flux/schnell";
    default:
      return "fal-ai/flux/schnell";
  }
}
