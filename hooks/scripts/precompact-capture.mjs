#!/usr/bin/env node
/**
 * PreCompact: guarda o pacote de recuperacao antes de o host compactar.
 * Falha sempre em silencio — compactacao nunca pode ser atrasada ou quebrada
 * por este hook. Ver policies/compaction-recovery.md.
 */
import { isHookDisabled, readHookConfig } from "./utils.mjs";
import { buildPacket, hasContent, loadPacket, readTail, resolveTranscriptPath, savePacket } from "./compaction-lib.mjs";

let raw = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { raw += chunk; });
process.stdin.on("end", () => {
  const done = () => { process.stdout.write(JSON.stringify({ continue: true })); process.exit(0); };
  try {
    if (isHookDisabled("precompact-capture")) return done();
    if (readHookConfig("compaction_recovery", { enabled: true }).enabled === false) return done();

    const input = raw ? JSON.parse(raw) : {};
    const sessionId = input.session_id;
    const transcript = input.transcript_path;
    if (!sessionId || !transcript) return done();

    const tail = readTail(resolveTranscriptPath(transcript));
    if (!tail) return done();

    const cwd = input.cwd || process.cwd();
    const packet = buildPacket({
      transcriptText: tail.text,
      truncated: tail.truncated,
      sessionId,
      previous: loadPacket(cwd, sessionId),
    });
    // Formato desconhecido ou sessao sem nada util: melhor nenhum pacote do que
    // um pacote vazio que so gastaria contexto na entrega.
    if (hasContent(packet)) savePacket(cwd, packet);
  } catch {
    // best-effort
  }
  done();
});
