# Example - Image with fal.ai

## Server adapter

```ts
export async function generateHeroImage(input: { prompt: string }) {
  const response = await fetch('https://fal.run/fal-ai/nano-banana-2', {
    method: 'POST',
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: input.prompt,
      num_images: 1,
      output_format: 'png',
      aspect_ratio: '16:9',
    }),
  });

  const data = await response.json();
  return data.images?.[0]?.url;
}
```

## Regra

Antes de montar o prompt, ler contexto visual do produto quando existir `repo-audit/assets.md`.
