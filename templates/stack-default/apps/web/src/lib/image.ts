/**
 * lib/image.ts — Re-export do adapter FAL.AI para uso no app.
 *
 * Import sempre daqui, não de fal/config.ts diretamente.
 * Isso permite mockar em testes sem mudar imports.
 */
export {
  generateImage,
  listImageModels,
  estimateImageCost,
  type ImagePreset,
  type ImageGenOptions,
  type ImageGenResult,
  type AspectRatio,
} from "../../../fal/config";
