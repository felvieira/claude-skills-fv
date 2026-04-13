#!/usr/bin/env node

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { isHookDisabled, readHookConfig, resolveBotPath } from "./utils.mjs";

const HOOK_ID = "simplify-ignore";

// Comment delimiters supported — start/end pairs per language
const START_PATTERNS = [
  /\/\/\s*simplify-ignore-start/,
  /#\s*simplify-ignore-start/,
  /\/\*\s*simplify-ignore-start\s*\*\//,
  /<!--\s*simplify-ignore-start\s*-->/,
];
const END_PATTERNS = [
  /\/\/\s*simplify-ignore-end/,
  /#\s*simplify-ignore-end/,
  /\/\*\s*simplify-ignore-end\s*\*\//,
  /<!--\s*simplify-ignore-end\s*-->/,
];

// ─── Config ─────────────────────────────────────────────────────────────────

function getConfig() {
  return readHookConfig("simplify_ignore", {
    state_file: ".simplify-ignore-state.json",
    config_file: "simplify-ignore.json",
  });
}

function statePath(cfg) {
  return resolveBotPath(cfg.state_file);
}

function lockPath() {
  return resolveBotPath(".simplify-ignore.lock");
}

// ─── State ──────────────────────────────────────────────────────────────────

function loadState(cfg) {
  try {
    return JSON.parse(readFileSync(statePath(cfg), "utf-8"));
  } catch {
    return {};
  }
}

function acquireLock() {
  const lp = lockPath();
  if (existsSync(lp)) {
    try {
      const pid = parseInt(readFileSync(lp, "utf-8").trim(), 10);
      try {
        process.kill(pid, 0); // throws if process dead
        return false; // alive — skip
      } catch {
        // stale lock — fall through to overwrite
      }
    } catch {}
  }
  mkdirSync(resolveBotPath(), { recursive: true });
  writeFileSync(lp, String(process.pid));
  return true;
}

function releaseLock() {
  const lp = lockPath();
  try {
    if (existsSync(lp)) {
      const pid = parseInt(readFileSync(lp, "utf-8").trim(), 10);
      if (pid === process.pid) unlinkSync(lp);
    }
  } catch {}
}

function saveState(state, cfg) {
  if (!acquireLock()) return;
  try {
    mkdirSync(resolveBotPath(), { recursive: true });
    writeFileSync(statePath(cfg), JSON.stringify(state, null, 2));
  } finally {
    releaseLock();
  }
}

// ─── Ignore config (.bot/simplify-ignore.json) ──────────────────────────────

function loadIgnoreConfig(cfg) {
  const candidates = [resolveBotPath(cfg.config_file), cfg.config_file];
  for (const c of candidates) {
    if (existsSync(c)) {
      try {
        return JSON.parse(readFileSync(c, "utf-8"));
      } catch {}
    }
  }
  return { files: {} };
}

// ─── Block detection ────────────────────────────────────────────────────────

function isStart(line) {
  return START_PATTERNS.some((p) => p.test(line));
}

function isEnd(line) {
  return END_PATTERNS.some((p) => p.test(line));
}

/**
 * Find protected blocks from inline comments.
 * Returns [{ startLine, endLine, content }] (1-indexed, inclusive)
 */
function findCommentBlocks(fileContent) {
  const lines = fileContent.split("\n");
  const blocks = [];
  let blockStart = -1;
  const blockLines = [];

  for (let i = 0; i < lines.length; i++) {
    if (isStart(lines[i])) {
      blockStart = i + 1;
      blockLines.length = 0;
      blockLines.push(lines[i]);
    } else if (isEnd(lines[i]) && blockStart !== -1) {
      blockLines.push(lines[i]);
      blocks.push({ startLine: blockStart, endLine: i + 1, content: blockLines.join("\n") });
      blockStart = -1;
    } else if (blockStart !== -1) {
      blockLines.push(lines[i]);
    }
  }

  return blocks;
}

/**
 * Get protected ranges from .bot/simplify-ignore.json for a given file path.
 * Returns null (not protected), "full", or [{ startLine, endLine }]
 */
function getConfigRanges(filePath, ignoreConfig) {
  const entry = ignoreConfig.files?.[filePath];
  if (!entry) return null;
  if (entry === "full") return "full";
  if (Array.isArray(entry)) {
    return entry.map(([s, e]) => ({ startLine: s, endLine: e }));
  }
  return null;
}

// ─── Hash / placeholder ──────────────────────────────────────────────────────

function shortHash(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
}

function placeholder(hash) {
  return `/* PROTECTED_BLOCK_${hash} — do not modify */`;
}

// ─── Substitution ────────────────────────────────────────────────────────────

/**
 * Given file content and blocks, replace blocks with PROTECTED_BLOCK_xxx placeholders.
 * Returns { modified: string, substitutions: [{ hash, content }] }
 */
function substituteBlocks(fileContent, blocks) {
  const lines = fileContent.split("\n");
  const substitutions = [];

  // Sort descending by startLine so we splice without shifting indices
  const sorted = [...blocks].sort((a, b) => b.startLine - a.startLine);

  for (const block of sorted) {
    const hash = shortHash(block.content);
    const ph = placeholder(hash);
    lines.splice(block.startLine - 1, block.endLine - block.startLine + 1, ph);
    substitutions.push({ hash, content: block.content });
  }

  return { modified: lines.join("\n"), substitutions };
}

/**
 * Given file content and config-based ranges, replace those ranges with placeholders.
 */
function substituteRanges(fileContent, ranges) {
  const lines = fileContent.split("\n");
  const substitutions = [];

  const sorted = [...ranges].sort((a, b) => b.startLine - a.startLine);

  for (const range of sorted) {
    const rangeLines = lines.slice(range.startLine - 1, range.endLine);
    const content = rangeLines.join("\n");
    const hash = shortHash(content);
    const ph = placeholder(hash);
    lines.splice(range.startLine - 1, range.endLine - range.startLine + 1, ph);
    substitutions.push({ hash, content });
  }

  return { modified: lines.join("\n"), substitutions };
}

// ─── Restoration ─────────────────────────────────────────────────────────────

/**
 * Restore PROTECTED_BLOCK_xxx placeholders in content using state.
 * Warns to stderr if a hash is missing from output (block may have been deleted).
 */
function restorePlaceholders(content, stateSubs) {
  let result = content;

  for (const sub of stateSubs) {
    const ph = placeholder(sub.hash);
    if (result.includes(ph)) {
      result = result.split(ph).join(sub.content);
    } else {
      process.stderr.write(
        `[simplify-ignore] WARNING: PROTECTED_BLOCK_${sub.hash} not found in output. ` +
          `Original content preserved — the block may have been intentionally removed.\n`
      );
    }
  }

  return result;
}

// ─── PostToolUse: intercept Read result ──────────────────────────────────────

function handlePostToolUse(input) {
  const toolName = input.tool_name || "";
  if (toolName !== "Read") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = input.tool_input?.file_path || "";
  const toolResult = input.tool_result;

  if (!filePath || typeof toolResult !== "string") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const cfg = getConfig();
  const ignoreConfig = loadIgnoreConfig(cfg);
  const state = loadState(cfg);

  // Collect blocks from inline comments
  const commentBlocks = findCommentBlocks(toolResult);

  // Collect ranges from config
  const configEntry = getConfigRanges(filePath, ignoreConfig);

  if (commentBlocks.length === 0 && !configEntry) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  let modified = toolResult;
  const allSubs = [];

  if (commentBlocks.length > 0) {
    const { modified: m, substitutions } = substituteBlocks(modified, commentBlocks);
    modified = m;
    allSubs.push(...substitutions);
  }

  if (configEntry === "full") {
    const hash = shortHash(modified);
    const ph = placeholder(hash);
    allSubs.push({ hash, content: modified });
    modified = ph;
  } else if (Array.isArray(configEntry)) {
    const { modified: m, substitutions } = substituteRanges(modified, configEntry);
    modified = m;
    allSubs.push(...substitutions);
  }

  if (allSubs.length > 0) {
    state[filePath] = allSubs;
    saveState(state, cfg);

    process.stdout.write(
      JSON.stringify({
        continue: true,
        tool_result: modified,
      })
    );
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

// ─── PreToolUse: intercept Edit/Write to restore protected blocks ─────────────

function handlePreToolUse(input) {
  const toolName = input.tool_name || "";
  const toolInput = input.tool_input || {};

  const isEdit = toolName === "Edit";
  const isWrite = toolName === "Write";

  if (!isEdit && !isWrite) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = toolInput.file_path || "";
  const cfg = getConfig();
  const state = loadState(cfg);
  const stateSubs = state[filePath];

  if (!stateSubs || stateSubs.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  if (isEdit && toolInput.new_string !== undefined) {
    const restored = restorePlaceholders(toolInput.new_string, stateSubs);
    if (restored !== toolInput.new_string) {
      process.stdout.write(
        JSON.stringify({
          continue: true,
          tool_input: { ...toolInput, new_string: restored },
        })
      );
      return;
    }
  }

  if (isWrite && toolInput.content !== undefined) {
    const restored = restorePlaceholders(toolInput.content, stateSubs);
    if (restored !== toolInput.content) {
      process.stdout.write(
        JSON.stringify({
          continue: true,
          tool_input: { ...toolInput, content: restored },
        })
      );
      return;
    }
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

// ─── Entry point ─────────────────────────────────────────────────────────────

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { inputBuffer += chunk; });

process.stdin.on("end", () => {
  if (isHookDisabled(HOOK_ID)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let input = {};
  try {
    input = JSON.parse(inputBuffer);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Detect whether we're in PreToolUse or PostToolUse based on input shape
  const isPostToolUse = "tool_result" in input;

  if (isPostToolUse) {
    handlePostToolUse(input);
  } else {
    handlePreToolUse(input);
  }
});
