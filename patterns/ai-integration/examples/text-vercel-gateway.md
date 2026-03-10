# Example - Text with Vercel AI Gateway

## Server adapter

```ts
import { generateText } from 'ai';

export async function generateProductCopy(prompt: string) {
  const result = await generateText({
    model: 'openai/gpt-5.4',
    prompt,
  });

  return {
    text: result.text,
  };
}
```

## Client hook shape

```ts
export function useTextGeneration() {
  async function run(input: { prompt: string }) {
    const response = await fetch('/api/ai/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    return response.json();
  }

  return { run };
}
```
