#!/usr/bin/env node
/**
 * video-download.mjs — Wrapper fino sobre yt-dlp (zero-dep Node).
 *
 * Tenta puxar legenda nativa primeiro (sem baixar o vídeo inteiro se só
 * precisar do texto); baixa o vídeo em qualidade limitada (720p) só quando
 * não há legenda disponível.
 *
 * CLI:
 *   node scripts/video-download.mjs --url "https://..." --out-dir ./tmp
 *   node scripts/video-download.mjs --url "https://..." --subs-only --out-dir ./tmp
 *
 * Requer: yt-dlp instalado no PATH (não é dependência Node).
 *
 * Policy: skills/54-video-analysis/SKILL.md
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

function hasYtDlp() {
  const result = spawnSync("yt-dlp", ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

function requireYtDlp() {
  if (!hasYtDlp()) {
    throw new Error(
      "yt-dlp not found in PATH. Install: https://github.com/yt-dlp/yt-dlp#installation"
    );
  }
}

/**
 * Tries to pull native captions without downloading the video.
 * Returns the path to a subtitle file if found, null otherwise.
 */
export function tryNativeSubtitles(url, outDir, langs = "en,pt") {
  requireYtDlp();
  mkdirSync(outDir, { recursive: true });
  const before = new Set(readdirSync(outDir));
  const result = spawnSync(
    "yt-dlp",
    ["--write-auto-sub", "--skip-download", "--sub-lang", langs, "-o", "%(id)s.%(ext)s"],
    { cwd: outDir, stdio: "pipe", encoding: "utf8" }
  );
  if (result.status !== 0) return null;
  const after = readdirSync(outDir).filter((f) => !before.has(f));
  const subFile = after.find((f) => /\.(vtt|srt)$/.test(f));
  return subFile ? join(outDir, subFile) : null;
}

/**
 * Downloads the video at limited quality (720p cap) — frame extraction cost
 * doesn't justify max quality.
 */
export function downloadVideo(url, outDir) {
  requireYtDlp();
  mkdirSync(outDir, { recursive: true });
  const before = new Set(readdirSync(outDir));
  const result = spawnSync(
    "yt-dlp",
    ["-f", "best[height<=720]", "-o", "%(id)s.%(ext)s", url],
    { cwd: outDir, stdio: "pipe", encoding: "utf8" }
  );
  if (result.status !== 0) {
    throw new Error(`yt-dlp failed: ${result.stderr || result.stdout}`);
  }
  const after = readdirSync(outDir).filter((f) => !before.has(f));
  const videoFile = after.find((f) => !/\.(vtt|srt|json)$/.test(f));
  if (!videoFile) throw new Error("yt-dlp reported success but no video file was found");
  return join(outDir, videoFile);
}

function parseArgs(argv) {
  const opts = { outDir: "./tmp", subsOnly: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--url") opts.url = argv[++i];
    else if (argv[i] === "--out-dir") opts.outDir = argv[++i];
    else if (argv[i] === "--subs-only") opts.subsOnly = true;
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.url) {
    console.error("Usage: node scripts/video-download.mjs --url <url> [--out-dir <dir>] [--subs-only]");
    process.exit(2);
  }
  const subs = tryNativeSubtitles(opts.url, opts.outDir);
  if (subs) {
    console.log(JSON.stringify({ type: "subtitles", path: subs }, null, 2));
    return;
  }
  if (opts.subsOnly) {
    console.log(JSON.stringify({ type: "none", message: "No native subtitles found" }, null, 2));
    return;
  }
  const video = downloadVideo(opts.url, opts.outDir);
  console.log(JSON.stringify({ type: "video", path: video }, null, 2));
}

if (process.argv[1] && existsSync(process.argv[1]) && process.argv[1].endsWith("video-download.mjs")) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
