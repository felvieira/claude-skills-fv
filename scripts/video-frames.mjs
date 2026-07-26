#!/usr/bin/env node
/**
 * video-frames.mjs — Wrapper sobre ffmpeg para extração de frames (zero-dep Node).
 *
 * Três estratégias por custo de token: keyframe (mais barato), scene-aware
 * (default, equilíbrio), uniform (mais caro, sem cap).
 *
 * CLI:
 *   node scripts/video-frames.mjs --video input.mp4 --out-dir ./frames --mode scene-aware
 *
 * Requer: ffmpeg instalado no PATH (não é dependência Node).
 *
 * Policy: skills/54-video-analysis/SKILL.md
 * Detalhes de comando: docs/skill-guides/video-analysis.md
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const MODE_CAPS = { keyframe: 50, "scene-aware": 100, uniform: Infinity };

function hasFfmpeg() {
  const result = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  return result.status === 0;
}

function requireFfmpeg() {
  if (!hasFfmpeg()) {
    throw new Error("ffmpeg not found in PATH. Install: https://ffmpeg.org/download.html");
  }
}

function runFfmpeg(args) {
  const result = spawnSync("ffmpeg", args, { stdio: "pipe", encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed: ${result.stderr?.slice(-1000) || result.stdout}`);
  }
}

/**
 * Extracts frames using the given strategy. Returns the list of frame file paths.
 */
export function extractFrames(videoPath, outDir, mode = "scene-aware") {
  requireFfmpeg();
  if (!MODE_CAPS[mode]) throw new Error(`Unknown mode: ${mode}. Use keyframe, scene-aware, or uniform`);
  mkdirSync(outDir, { recursive: true });
  const pattern = join(outDir, "frame_%04d.jpg");

  if (mode === "keyframe") {
    runFfmpeg(["-skip_frame", "nokey", "-i", videoPath, "-vsync", "vfr", "-frame_pts", "true", pattern]);
  } else if (mode === "scene-aware") {
    runFfmpeg(["-i", videoPath, "-vf", "select='gt(scene,0.3)',showinfo", "-vsync", "vfr", pattern]);
  } else {
    runFfmpeg(["-i", videoPath, "-vf", "fps=1/10", pattern]);
  }

  let frames = readdirSync(outDir)
    .filter((f) => /^frame_\d+\.jpg$/.test(f))
    .sort()
    .map((f) => join(outDir, f));

  // keyframe mode falls back to uniform sampling if too few cuts were found
  if (mode === "keyframe" && frames.length < 4) {
    return extractFrames(videoPath, outDir, "uniform");
  }

  const cap = MODE_CAPS[mode];
  if (Number.isFinite(cap) && frames.length > cap) frames = frames.slice(0, cap);
  return frames;
}

function parseArgs(argv) {
  const opts = { outDir: "./frames", mode: "scene-aware" };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--video") opts.video = argv[++i];
    else if (argv[i] === "--out-dir") opts.outDir = argv[++i];
    else if (argv[i] === "--mode") opts.mode = argv[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.video) {
    console.error("Usage: node scripts/video-frames.mjs --video <path> [--out-dir <dir>] [--mode keyframe|scene-aware|uniform]");
    process.exit(2);
  }
  const frames = extractFrames(opts.video, opts.outDir, opts.mode);
  console.log(JSON.stringify({ mode: opts.mode, frame_count: frames.length, frames }, null, 2));
}

if (process.argv[1] && existsSync(process.argv[1]) && process.argv[1].endsWith("video-frames.mjs")) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
