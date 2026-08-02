#!/usr/bin/env node
/**
 * Checks (and, where possible, installs) the system dependencies skill
 * 54-video-analysis needs: ffmpeg, yt-dlp, and faster-whisper (for local,
 * offline transcription). None of these are Node packages, so they can't
 * be pulled in via npm — this script shells out to whatever package
 * manager is already on the machine (winget/choco/scoop on Windows,
 * brew on macOS, apt/dnf on Linux) and falls back to a clear manual
 * command when it can't install automatically.
 *
 * This intentionally lives outside setup/install.sh: it's a single skill's
 * optional system-binary dependency, not a kit-wide MCP/hook install step.
 *
 * Usage: node scripts/setup-video-analysis.mjs [--check-only]
 * Exit code: 0 if ffmpeg + yt-dlp are present after running (faster-whisper
 * missing is a warning, not a failure — hosted transcription still works
 * without it). Non-zero if a required binary is still missing at the end.
 */

import { execFileSync, spawnSync } from "node:child_process";
import os from "node:os";

const checkOnly = process.argv.includes("--check-only");
const platform = os.platform();

function commandExists(cmd) {
  try {
    const probe = platform === "win32" ? "where" : "command";
    const args = platform === "win32" ? [cmd] : ["-v", cmd];
    const result = spawnSync(probe, args, { stdio: "ignore", shell: platform !== "win32" });
    return result.status === 0;
  } catch {
    return false;
  }
}

function pythonPackageInstalled(pkg) {
  for (const pyCmd of ["python3", "python"]) {
    try {
      const result = spawnSync(pyCmd, ["-m", "pip", "show", pkg], { stdio: "ignore" });
      if (result.status === 0) return true;
    } catch {
      // try next candidate
    }
  }
  return false;
}

function pickPipCommand() {
  return commandExists("pip3") ? "pip3" : "pip";
}

function tryRun(cmd, args, label) {
  console.log(`  installing ${label}...`);
  try {
    execFileSync(cmd, args, { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

function installFfmpeg() {
  if (platform === "win32") {
    if (commandExists("winget")) return tryRun("winget", ["install", "-e", "--id", "Gyan.FFmpeg"], "ffmpeg (winget)");
    if (commandExists("choco")) return tryRun("choco", ["install", "ffmpeg", "-y"], "ffmpeg (chocolatey)");
    if (commandExists("scoop")) return tryRun("scoop", ["install", "ffmpeg"], "ffmpeg (scoop)");
    return false;
  }
  if (platform === "darwin" && commandExists("brew")) return tryRun("brew", ["install", "ffmpeg"], "ffmpeg (brew)");
  if (commandExists("apt-get")) return tryRun("sudo", ["apt-get", "install", "-y", "ffmpeg"], "ffmpeg (apt)");
  if (commandExists("dnf")) return tryRun("sudo", ["dnf", "install", "-y", "ffmpeg"], "ffmpeg (dnf)");
  return false;
}

function installYtDlp() {
  // pip works identically on every platform and doesn't need admin rights,
  // so it's the default path even when a system package manager is present.
  return tryRun(pickPipCommand(), ["install", "--user", "-U", "yt-dlp"], "yt-dlp (pip)");
}

function installFasterWhisper() {
  return tryRun(pickPipCommand(), ["install", "--user", "-U", "faster-whisper"], "faster-whisper (pip)");
}

function manualHint(name, urls) {
  console.log(`  MISSING: ${name}`);
  urls.forEach((u) => console.log(`    ${u}`));
}

async function main() {
  console.log("video-analysis dependency check\n");
  let hasFfmpeg = commandExists("ffmpeg");
  let hasYtDlp = commandExists("yt-dlp");
  let hasFasterWhisper = pythonPackageInstalled("faster-whisper");

  console.log(`ffmpeg:          ${hasFfmpeg ? "OK" : "missing"}`);
  console.log(`yt-dlp:          ${hasYtDlp ? "OK" : "missing"}`);
  console.log(`faster-whisper:  ${hasFasterWhisper ? "OK" : "missing (optional — enables local transcription)"}\n`);

  if (checkOnly) {
    process.exit(hasFfmpeg && hasYtDlp ? 0 : 1);
  }

  if (!hasFfmpeg) {
    hasFfmpeg = installFfmpeg();
    if (!hasFfmpeg) {
      manualHint("ffmpeg", [
        "Windows: winget install Gyan.FFmpeg  (or: choco install ffmpeg)",
        "macOS:   brew install ffmpeg",
        "Linux:   sudo apt-get install ffmpeg  (or your distro's package manager)",
        "https://ffmpeg.org/download.html",
      ]);
    }
  }

  if (!hasYtDlp) {
    hasYtDlp = installYtDlp();
    if (!hasYtDlp) manualHint("yt-dlp", ["pip install --user yt-dlp", "https://github.com/yt-dlp/yt-dlp#installation"]);
  }

  if (!hasFasterWhisper) {
    hasFasterWhisper = installFasterWhisper();
    if (!hasFasterWhisper) {
      manualHint("faster-whisper (optional)", [
        "pip install --user faster-whisper",
        "Without it, video-analysis falls back to hosted Groq/OpenAI Whisper (needs an API key).",
      ]);
    }
  }

  console.log("\nRe-checking after install attempts...");
  hasFfmpeg = commandExists("ffmpeg");
  hasYtDlp = commandExists("yt-dlp");
  hasFasterWhisper = pythonPackageInstalled("faster-whisper");
  console.log(`ffmpeg:          ${hasFfmpeg ? "OK" : "STILL MISSING"}`);
  console.log(`yt-dlp:          ${hasYtDlp ? "OK" : "STILL MISSING"}`);
  console.log(`faster-whisper:  ${hasFasterWhisper ? "OK" : "still missing (optional)"}`);

  if (!hasFfmpeg || !hasYtDlp) {
    console.error("\nRequired dependency missing — install manually with the command(s) above, then re-run this script.");
    process.exit(1);
  }
  console.log("\nvideo-analysis is ready to use.");
}

main();
