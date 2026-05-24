/**
 * POST /api/chat — exemplo de route com streaming LLM via OpenRouter.
 *
 * Troque a lógica do messages pelo seu domínio.
 * O adapter (src/lib/llm.ts) resolve o model pelo tier.
 */
import { streamLLM } from "@/lib/llm";
import { auth } from "@/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
  // Auth guard — remova se a rota for pública
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages, tier = "balanced" } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return new Response("messages[] required", { status: 400 });
  }

  return streamLLM({
    messages,
    tier,
    meta: { route: "/api/chat", userId: session.user.id },
  });
}
