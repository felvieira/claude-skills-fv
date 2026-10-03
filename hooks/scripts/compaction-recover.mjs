#!/usr/bin/env node
/**
 * Devolve UMA vez o pacote de recuperacao guardado por precompact-capture.mjs.
 * O dispatcher so chama este script quando o arquivo do pacote existe, entao o
 * caminho comum (sem compactacao) nao paga spawn extra.
 */
import { consumePacket, loadPacket, renderPacket } from "./compaction-lib.mjs";

let raw = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  try {
    const input = raw ? JSON.parse(raw) : {};
    const cwd = input.cwd || process.cwd();
    const packet = loadPacket(cwd, input.session_id);
    if (packet) {
      const text = renderPacket(packet);
      consumePacket(cwd, input.session_id);
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: input.hook_event_name || "UserPromptSubmit",
          additionalContext: text,
        },
      }));
      return;
    }
  } catch {
    // best-effort
  }
  process.stdout.write(JSON.stringify({ continue: true }));
});
