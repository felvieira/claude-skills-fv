#!/usr/bin/env node
/**
 * generate-image.mjs — Geração de imagem via FAL.AI (zero-dep Node).
 *
 * Lê models/image-models.json como fonte única de verdade.
 * Funciona em qualquer máquina com Node 18+ e FAL_AI_API_KEY (não depende
 * de generate.py em path privado).
 *
 * CLI:
 *   node scripts/generate-image.mjs --prompt "..." --out cover.jpg
 *   node scripts/generate-image.mjs --prompt "..." --model gemini-25-flash --ref photo.jpg --out edit.png
 *   node scripts/generate-image.mjs --list
 *
 * Lib:
 *   import { generateImage, listModels } from "scripts/generate-image.mjs"
 *
 * Default rule (sem --model explícito):
 *   - Sem --ref       → grok-imagine (text-to-image, $0.020)
 *   - Com --ref       → gemini-25-flash (edit, $0.039)
 *
 * Auth:
 *   FAL_AI_API_KEY (fallback: FAL_KEY, FAL_API_KEY)
 *
 * Policy: skills/17-image-generator/SKILL.md
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";

// ──────────────────────────────────────────────────────────────
// Models config (single source of truth)
// ──────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODELS_PATH = join(__dirname, "..", "models", "image-models.json");

function loadModels() {
  if (!existsSync(MODELS_PATH)) {
    throw new Error(`Models config missing: ${MODELS_PATH}`);
  }
  return JSON.parse(readFileSync(MODELS_PATH, "utf8"));
}

// ──────────────────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────────────────

function getApiKey() {
  const key =
    process.env.FAL_AI_API_KEY ??
    process.env.FAL_KEY ??
    process.env.FAL_API_KEY;
  if (!key) {
    throw new Error(
      "FAL_AI_API_KEY não definida. Setup: https://fal.ai/dashboard/keys"
    );
  }
  return key;
}

// ──────────────────────────────────────────────────────────────
// Default model resolution (the rule)
// ──────────────────────────────────────────────────────────────

function resolveModel(opts, config) {
  if (opts.model) {
    if (!config.models[opts.model]) {
      throw new Error(
        `Unknown model: ${opts.model}. Available: ${Object.keys(config.models).join(", ")}`
      );
    }
    return opts.model;
  }
  const hasRef = (opts.referenceImages?.length ?? 0) > 0;
  const presetName = hasRef ? config.default_rule.if_has_reference_images : config.default_rule.else;
  const preset = config.presets[presetName];
  if (!preset) throw new Error(`Preset não encontrado: ${presetName}`);
  return preset.model;
}

// ──────────────────────────────────────────────────────────────
// FAL.AI REST client (submit-then-poll, sem SDK)
// ──────────────────────────────────────────────────────────────

async function falCall(endpoint, body, queueBaseUrl) {
  const apiKey = getApiKey();

  const submitRes = await fetch(`${queueBaseUrl}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
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

  // Poll status
  const start = Date.now();
  const timeoutMs = 90_000;
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 1500));
    const statusRes = await fetch(status_url, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    if (!statusRes.ok) continue;
    const status = await statusRes.json();
    if (status.status === "COMPLETED") {
      const resultRes = await fetch(response_url, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      if (!resultRes.ok) {
        const text = await resultRes.text();
        throw new Error(`FAL result fetch failed (${resultRes.status}): ${text}`);
      }
      return await resultRes.json();
    }
    if (status.status === "FAILED" || status.status === "ERROR") {
      throw new Error(`FAL job failed: ${JSON.stringify(status)}`);
    }
  }
  throw new Error(`FAL timeout after ${timeoutMs}ms`);
}

// ──────────────────────────────────────────────────────────────
// API pública (importável)
// ──────────────────────────────────────────────────────────────

export function listModels() {
  const config = loadModels();
  return Object.entries(config.models).map(([id, m]) => ({
    id,
    name: m.name,
    vendor: m.vendor,
    tier: m.tier,
    t2i_price: m.pricing.t2i_usd_per_image,
    edit_price: m.pricing.edit_usd_per_image,
    use_cases: m.use_cases,
  }));
}

/**
 * @param {Object} opts
 * @param {string} opts.prompt — texto da imagem desejada
 * @param {string[]} [opts.referenceImages] — URLs/data URLs pra edit
 * @param {string} [opts.model] — força model específico (override do default rule)
 * @param {string} [opts.aspectRatio] — ex: "16:9", "1:1"
 * @param {number} [opts.numImages=1]
 * @param {string} [opts.outputFormat] — jpeg | png | webp
 * @param {string} [opts.outPath] — se setado, baixa primeira imagem pra esse path
 */
export async function generateImage(opts) {
  if (!opts.prompt) throw new Error("prompt é obrigatório");

  const config = loadModels();
  const modelId = resolveModel(opts, config);
  const model = config.models[modelId];
  const hasRef = (opts.referenceImages?.length ?? 0) > 0;

  if (hasRef && !model.supports.edit) {
    throw new Error(`Model ${modelId} não suporta edit. Use grok-imagine ou gemini-25-flash.`);
  }

  const endpoint = hasRef ? model.endpoints.edit : model.endpoints.t2i;

  const body = {
    prompt: opts.prompt,
    num_images: opts.numImages ?? model.default_params?.num_images ?? 1,
    output_format: opts.outputFormat ?? model.default_params?.output_format ?? "jpeg",
  };

  // Aspect ratio vs image_size — depende do model
  if (model.supports.aspect_ratios && opts.aspectRatio) {
    body.aspect_ratio = opts.aspectRatio;
  } else if (model.default_params?.aspect_ratio) {
    body.aspect_ratio = model.default_params.aspect_ratio;
  }
  if (model.supports.image_sizes && opts.imageSize) {
    body.image_size = opts.imageSize;
  } else if (model.default_params?.image_size && !body.aspect_ratio) {
    body.image_size = model.default_params.image_size;
  }
  if (model.default_params?.quality) body.quality = model.default_params.quality;

  if (hasRef) {
    body.image_urls = opts.referenceImages;
  }

  const start = Date.now();
  const result = await falCall(endpoint, body, config.queue_base_url);
  const durationMs = Date.now() - start;

  const images = (result.images ?? []).map(img => ({
    url: img.url,
    width: img.width,
    height: img.height,
    contentType: img.content_type ?? `image/${body.output_format}`,
  }));

  const out = {
    images,
    model: modelId,
    estimatedCostUsd: (hasRef ? model.pricing.edit_usd_per_image : model.pricing.t2i_usd_per_image) * images.length,
    durationMs,
  };

  // Download primeira imagem se outPath setado
  if (opts.outPath && images[0]?.url) {
    const res = await fetch(images[0].url);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(opts.outPath, buf);
    out.savedTo = opts.outPath;
  }

  return out;
}

// ──────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { numImages: 1 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--prompt":      args.prompt = argv[++i]; break;
      case "--model":       args.model = argv[++i]; break;
      case "--ref":
      case "--reference":   (args.referenceImages ??= []).push(argv[++i]); break;
      case "--aspect":      args.aspectRatio = argv[++i]; break;
      case "--size":        args.imageSize = argv[++i]; break;
      case "--n":
      case "--num-images":  args.numImages = parseInt(argv[++i], 10); break;
      case "--format":      args.outputFormat = argv[++i]; break;
      case "--out":         args.outPath = argv[++i]; break;
      case "--list":        args.list = true; break;
      case "--help":
      case "-h":            args.help = true; break;
    }
  }
  return args;
}

function printHelp() {
  const config = loadModels();
  console.log(`generate-image.mjs — FAL.AI image generation (zero-dep)

Usage:
  node scripts/generate-image.mjs --prompt "..." [options]

Required:
  --prompt <text>           Texto da imagem

Options:
  --model <id>              Força model específico (default: regra abaixo)
  --ref <url-or-path>       Imagem de referência (pode repetir). Ativa edit mode.
  --aspect <ratio>          Ex: "16:9", "1:1", "9:16"
  --size <size>             Ex: "1024x1024" (alguns models)
  --n <int>                 Quantas imagens (default: 1)
  --format <fmt>            jpeg | png | webp
  --out <path>              Baixa primeira imagem pro path local
  --list                    Lista models disponíveis
  --help                    Mostra este help

Default rule (sem --model):
  - Sem --ref  → ${config.default_text_to_image} (t2i)
  - Com --ref  → ${config.default_edit_image} (edit)

Auth: env var FAL_AI_API_KEY

Examples:
  node scripts/generate-image.mjs --prompt "minimalist cover, blue gradient" --out cover.jpg
  node scripts/generate-image.mjs --prompt "remove background" --ref photo.jpg --out clean.png
  node scripts/generate-image.mjs --prompt "OG card" --model gpt-image-1.5 --aspect 16:9 --out og.png
  node scripts/generate-image.mjs --list
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { printHelp(); return; }
  if (args.list) {
    const models = listModels();
    console.log("Available models:");
    for (const m of models) {
      console.log(`  ${m.id.padEnd(20)} ${m.tier.padEnd(15)} $${m.t2i_price.toFixed(3)}/img — ${m.use_cases[0] ?? ""}`);
    }
    return;
  }
  if (!args.prompt) {
    console.error("Error: --prompt obrigatório. Use --help.");
    process.exit(1);
  }

  try {
    const result = await generateImage(args);
    console.log(`✓ ${result.images.length} image(s) generated via ${result.model}`);
    console.log(`  Cost: $${result.estimatedCostUsd.toFixed(4)}`);
    console.log(`  Time: ${result.durationMs}ms`);
    for (const img of result.images) {
      console.log(`  → ${img.url}`);
    }
    if (result.savedTo) console.log(`  Saved to: ${result.savedTo}`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(2);
  }
}

// Run CLI se invocado diretamente
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    basename(process.argv[1] ?? "") === "generate-image.mjs") {
  main();
}
