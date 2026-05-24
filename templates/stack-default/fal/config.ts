/**
 * fal/config.ts — FAL.AI image generation adapter
 *
 * Princípio (igual OpenRouter pra texto): o app nunca chama Replicate/Midjourney/DALL-E direto.
 * Chama esta lib, que roteia para o melhor modelo por preset (cheap/quality/edit)
 * e permite trocar provider/model sem mudar nenhum código de feature.
 *
 * Models hardcoded — atualizar quando preços ou disponibilidade mudarem.
 * Fonte de preços: https://fal.ai/models (Maio/2026)
 *
 * Setup:
 *   1. Adicione FAL_AI_API_KEY no .env (https://fal.ai/dashboard/keys)
 *   2. import { generateImage } from "@/lib/image"
 */

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export type ImagePreset = "cheap" | "quality" | "edit" | "premium";

export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "2:3" | "3:2";

export interface ImageGenOptions {
  prompt: string;
  preset?: ImagePreset;
  /** Override de model específico (ignora preset) */
  model?: string;
  /** Imagens de referência para edit/inpaint (URLs ou base64 data URLs) */
  referenceImages?: string[];
  aspectRatio?: AspectRatio;
  /** Quantas imagens gerar (1-4) */
  numImages?: number;
  /** Saída: 'jpeg' | 'png' | 'webp' */
  outputFormat?: "jpeg" | "png" | "webp";
  /** Negative prompt (apenas em models que suportam) */
  negativePrompt?: string;
}

export interface ImageGenResult {
  images: Array<{
    url: string;
    width?: number;
    height?: number;
    contentType: string;
  }>;
  /** Model que efetivamente gerou */
  model: string;
  /** Custo estimado em USD */
  estimatedCostUsd: number;
  /** Tempo de geração em ms */
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────
// Catalog de models (hardcoded — preços Maio/2026)
// ─────────────────────────────────────────────────────────────

interface ModelConfig {
  id: string;
  endpoint: string;       // path FAL.AI (sem domain)
  editEndpoint?: string;  // endpoint específico pra edit (com reference)
  pricePerImageUsd: number;
  supportsEdit: boolean;
  supportsNegative: boolean;
  defaultFormat: "jpeg" | "png" | "webp";
}

const MODELS: Record<string, ModelConfig> = {
  // CHEAP: criativos, social posts, iteração — text-to-image
  "grok-imagine": {
    id: "grok-imagine",
    endpoint: "xai/grok-imagine-image",
    editEndpoint: "xai/grok-imagine-image/edit",
    pricePerImageUsd: 0.020,
    supportsEdit: true,
    supportsNegative: false,
    defaultFormat: "jpeg",
  },

  // EDIT: melhor refine/inpaint com imagem de referência
  "gemini-25-flash": {
    id: "gemini-25-flash",
    endpoint: "fal-ai/gemini-25-flash-image",
    editEndpoint: "fal-ai/gemini-25-flash-image/edit",
    pricePerImageUsd: 0.039,
    supportsEdit: true,
    supportsNegative: false,
    defaultFormat: "jpeg",
  },

  // QUALITY: prompt difícil, tipografia, hi-fi
  "gemini-3-pro": {
    id: "gemini-3-pro",
    endpoint: "fal-ai/gemini-3-pro-image",
    pricePerImageUsd: 0.15,
    supportsEdit: false,
    supportsNegative: false,
    defaultFormat: "png",
  },

  // PREMIUM: tipografia fina, acabamento OG card final
  "gpt-image-1.5": {
    id: "gpt-image-1.5",
    endpoint: "fal-ai/gpt-image-1.5/text-to-image",
    pricePerImageUsd: 0.080,
    supportsEdit: false,
    supportsNegative: false,
    defaultFormat: "png",
  },
};

const PRESET_TO_MODEL: Record<ImagePreset, string> = {
  cheap:   "grok-imagine",
  edit:    "gemini-25-flash",
  quality: "gemini-3-pro",
  premium: "gpt-image-1.5",
};

// ─────────────────────────────────────────────────────────────
// FAL.AI client (REST API, sem SDK pra evitar dep extra)
// ─────────────────────────────────────────────────────────────

const FAL_QUEUE_URL = "https://queue.fal.run";

function getApiKey(): string {
  const key =
    process.env.FAL_AI_API_KEY ??
    process.env.FAL_KEY ??
    process.env.FAL_API_KEY;
  if (!key) {
    throw new Error(
      "FAL_AI_API_KEY não definida. Adicione ao .env (https://fal.ai/dashboard/keys)"
    );
  }
  return key;
}

async function falFetch(path: string, body: unknown): Promise<any> {
  const apiKey = getApiKey();
  // Submit job
  const submitRes = await fetch(`${FAL_QUEUE_URL}/${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!submitRes.ok) {
    const text = await submitRes.text();
    throw new Error(`FAL submit failed (${submitRes.status}): ${text}`);
  }

  const submitData = await submitRes.json();
  const { status_url, response_url } = submitData;

  // Poll until done (max 60s — image gen é tipicamente 3-15s)
  const start = Date.now();
  const timeoutMs = 60_000;
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 1000));
    const statusRes = await fetch(status_url, {
      headers: { "Authorization": `Key ${apiKey}` },
    });
    if (!statusRes.ok) continue;
    const status = await statusRes.json();
    if (status.status === "COMPLETED") {
      const resultRes = await fetch(response_url, {
        headers: { "Authorization": `Key ${apiKey}` },
      });
      return await resultRes.json();
    }
    if (status.status === "FAILED" || status.status === "ERROR") {
      throw new Error(`FAL job failed: ${JSON.stringify(status)}`);
    }
  }

  throw new Error(`FAL job timeout after ${timeoutMs}ms`);
}

// ─────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────

/**
 * Gera imagem via FAL.AI.
 *
 * @example
 *   const { images } = await generateImage({
 *     prompt: "minimalist cover art, blue gradient, abstract",
 *     preset: "cheap",  // text-to-image barato
 *     aspectRatio: "16:9",
 *   });
 *   await db.insert(posts).values({ coverUrl: images[0].url });
 *
 * @example Edit/refine de imagem existente:
 *   await generateImage({
 *     prompt: "remove background, keep subject",
 *     preset: "edit",
 *     referenceImages: ["https://example.com/photo.jpg"],
 *   });
 */
export async function generateImage(opts: ImageGenOptions): Promise<ImageGenResult> {
  const start = Date.now();

  // Auto-select preset: se tem referenceImages, força "edit"
  let preset = opts.preset;
  if (!preset) {
    preset = opts.referenceImages?.length ? "edit" : "cheap";
  }

  const modelId = opts.model ?? PRESET_TO_MODEL[preset];
  const model = MODELS[modelId];
  if (!model) {
    throw new Error(`Unknown model: ${modelId}. Available: ${Object.keys(MODELS).join(", ")}`);
  }

  const hasReferences = (opts.referenceImages?.length ?? 0) > 0;
  if (hasReferences && !model.supportsEdit) {
    throw new Error(`Model ${modelId} doesn't support edit. Use preset "edit" or model with editEndpoint.`);
  }

  const endpoint = hasReferences && model.editEndpoint
    ? model.editEndpoint
    : model.endpoint;

  const body: Record<string, unknown> = {
    prompt: opts.prompt,
    num_images: opts.numImages ?? 1,
    aspect_ratio: opts.aspectRatio ?? "1:1",
    output_format: opts.outputFormat ?? model.defaultFormat,
  };

  if (hasReferences) {
    body.image_urls = opts.referenceImages;
  }
  if (opts.negativePrompt && model.supportsNegative) {
    body.negative_prompt = opts.negativePrompt;
  }

  const result = await falFetch(endpoint, body);

  // FAL response shape varia ligeiramente por model — normalizar
  const images = (result.images ?? []).map((img: any) => ({
    url: img.url,
    width: img.width,
    height: img.height,
    contentType: img.content_type ?? `image/${model.defaultFormat}`,
  }));

  return {
    images,
    model: modelId,
    estimatedCostUsd: model.pricePerImageUsd * images.length,
    durationMs: Date.now() - start,
  };
}

/**
 * Lista models disponíveis (útil pra UI/admin)
 */
export function listImageModels() {
  return Object.entries(MODELS).map(([id, m]) => ({
    id,
    pricePerImageUsd: m.pricePerImageUsd,
    supportsEdit: m.supportsEdit,
  }));
}

/**
 * Estima custo antes de gerar (pra mostrar pro user ou rate-limit)
 */
export function estimateImageCost(opts: Pick<ImageGenOptions, "preset" | "model" | "numImages">): number {
  const preset = opts.preset ?? "cheap";
  const modelId = opts.model ?? PRESET_TO_MODEL[preset];
  const model = MODELS[modelId];
  if (!model) return 0;
  return model.pricePerImageUsd * (opts.numImages ?? 1);
}
