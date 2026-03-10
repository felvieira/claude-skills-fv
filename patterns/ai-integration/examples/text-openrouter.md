# Example - Text with OpenRouter

## Server adapter

```ts
import { OpenRouter } from '@openrouter/sdk';

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function generateStructuredAnswer(messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }>) {
  const completion = await client.chat.send({
    model: 'openai/gpt-5.2',
    messages,
    stream: false,
  });

  return completion.choices[0]?.message?.content ?? '';
}
```
