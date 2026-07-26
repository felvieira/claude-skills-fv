#!/usr/bin/env node
/**
 * video-transcribe.mjs — Transcrição de áudio, local por padrão (zero-dep Node).
 *
 * Local (faster-whisper via Python) é o default: gratuito, offline, áudio
 * nunca sai da máquina. Hosted (Groq/OpenAI) é override opcional, só quando
 * o usuário pedir velocidade acima de custo/privacidade explicitamente.
 *
 * CLI:
 *   node scripts/video-transcribe.mjs --audio audio.mp3
 *   node scripts/video-transcribe.mjs --audio audio.mp3 --hosted
 *
 * Auth (só necessário com --hosted):
 *   GROQ_API_KEY (preferencial, fallback: OPENAI_API_KEY)
 *
 * Policy: skills/54-video-analysis/SKILL.md
 * Detalhes de chunking/payload: docs/skill-guides/video-analysis.md
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { statSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MAX_UPLOAD_BYTES = 24 * 1024 * 1024; // 24MB safety margin under the 25MB API cap

// Windows' Node child_process resolver only finds "python", not "python3"
// (that alias only exists inside POSIX shells like Git Bash). Try both.
function resolvePythonCommand() {
  for (const cmd of ["python3", "python"]) {
    const result = spawnSync(cmd, ["--version"], { stdio: "ignore" });
    if (result.status === 0) return cmd;
  }
  throw new Error("No Python interpreter found (tried python3, python). Install Python 3.");
}

function getHostedApiKey() {
  const groq = process.env.GROQ_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  if (groq) return { key: groq, backend: "groq", model: "whisper-large-v3", url: "https://api.groq.com/openai/v1/audio/transcriptions" };
  if (openai) return { key: openai, backend: "openai", model: "whisper-1", url: "https://api.openai.com/v1/audio/transcriptions" };
  return null;
}

/**
 * Transcribes locally via faster-whisper (Python subprocess).
 */
export function transcribeLocal(audioPath, modelSize = "base") {
  const script = join(__dirname, "video-transcribe-local.py");
  const pythonCmd = resolvePythonCommand();
  const result = spawnSync(pythonCmd, [script, "--audio", audioPath, "--model", modelSize], {
    stdio: "pipe",
    encoding: "utf8",
  });
  if (result.status !== 0) {
    let detail = result.stderr;
    try { detail = JSON.parse(result.stderr).error || detail; } catch {}
    throw new Error(`Local transcription failed: ${detail}`);
  }
  return JSON.parse(result.stdout);
}

async function transcribeChunk(audioPath, apiKeyInfo) {
  const buffer = await import("node:fs").then((fs) => fs.readFileSync(audioPath));
  const form = new FormData();
  form.append("model", apiKeyInfo.model);
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  form.append("file", new Blob([buffer]), "audio.mp3");

  const response = await fetch(apiKeyInfo.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKeyInfo.key}` },
    body: form,
  });
  if (!response.ok) {
    throw new Error(`${apiKeyInfo.backend} transcription API returned ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  return (data.segments || []).map((s) => ({ start: s.start, end: s.end, text: s.text.trim() }));
}

/**
 * Transcribes via hosted API (Groq preferred, OpenAI fallback). Requires an
 * API key in env — throws with setup instructions if none is configured.
 * Files over MAX_UPLOAD_BYTES are chunked by time (not implemented here for
 * the CLI path — see docs/skill-guides/video-analysis.md for the chunking
 * algorithm if a file exceeds the cap).
 */
export async function transcribeHosted(audioPath) {
  const apiKeyInfo = getHostedApiKey();
  if (!apiKeyInfo) {
    throw new Error(
      "No hosted transcription API key found. Set GROQ_API_KEY (https://console.groq.com/keys) " +
      "or OPENAI_API_KEY (https://platform.openai.com/api-keys), or omit --hosted to use local transcription."
    );
  }
  const size = statSync(audioPath).size;
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Audio file is ${(size / 1024 / 1024).toFixed(1)}MB, exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB hosted API limit. ` +
      "Split by time with ffmpeg first (see docs/skill-guides/video-analysis.md) or use local transcription instead."
    );
  }
  const segments = await transcribeChunk(audioPath, apiKeyInfo);
  return { backend: apiKeyInfo.backend, model: apiKeyInfo.model, segments };
}

function parseArgs(argv) {
  const opts = { hosted: false, model: "base" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--audio") opts.audio = argv[++i];
    else if (argv[i] === "--hosted") opts.hosted = true;
    else if (argv[i] === "--model") opts.model = argv[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.audio) {
    console.error("Usage: node scripts/video-transcribe.mjs --audio <path> [--hosted] [--model tiny|base|small|medium|large-v3]");
    process.exit(2);
  }
  const result = opts.hosted ? await transcribeHosted(opts.audio) : transcribeLocal(opts.audio, opts.model);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && existsSync(process.argv[1]) && process.argv[1].endsWith("video-transcribe.mjs")) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
