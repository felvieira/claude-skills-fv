/**
 * POST /api/image — exemplo de route que gera imagem via FAL.AI.
 *
 * Body: { prompt: string, preset?: ImagePreset, aspectRatio?: AspectRatio }
 *
 * Para edit/inpaint, envie também referenceImages: string[].
 * O preset auto-detecta "edit" se referenceImages estiver presente.
 */
import { generateImage, estimateImageCost } from "@/lib/image";
import { auth } from "@/auth";
import { headers } from "next/headers";

const MAX_COST_PER_REQUEST_USD = 0.50;  // hard cap pra evitar abuso

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();

  if (!body.prompt || typeof body.prompt !== "string") {
    return Response.json({ error: "prompt required" }, { status: 400 });
  }

  // Cost guard
  const estimated = estimateImageCost({
    preset: body.preset,
    model: body.model,
    numImages: body.numImages ?? 1,
  });
  if (estimated > MAX_COST_PER_REQUEST_USD) {
    return Response.json({
      error: `cost cap exceeded (estimated $${estimated.toFixed(3)}, max $${MAX_COST_PER_REQUEST_USD})`,
    }, { status: 400 });
  }

  try {
    const result = await generateImage({
      prompt:           body.prompt,
      preset:           body.preset,
      model:            body.model,
      referenceImages:  body.referenceImages,
      aspectRatio:      body.aspectRatio,
      numImages:        body.numImages,
      outputFormat:     body.outputFormat,
      negativePrompt:   body.negativePrompt,
    });

    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
