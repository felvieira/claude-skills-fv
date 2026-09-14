#!/usr/bin/env node

/** Deterministic checks for generated Markdown documentation trees. */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function parseArgs(argv) {
  const args = { docs: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--json") args.json = true;
    else if (value === "--docs") args.docs = argv[++index];
    else if (value === "--help" || value === "-h") {
      console.log("Usage: node scripts/verify-docset.mjs --docs <directory> [--json]");
      process.exit(0);
    } else throw new Error(`Unknown argument: ${value}`);
  }
  if (!args.docs) throw new Error("Missing required argument: --docs <directory>");
  return args;
}

async function walkMarkdown(root) {
  const result = [];
  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.name.startsWith(".") || entry.isSymbolicLink() || (entry.isDirectory() && /^site\d*$/i.test(entry.name))) continue;
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) result.push(absolute);
    }
  }
  await visit(root);
  return result.sort();
}

function lineNumberAt(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

function inspectMarkdown(text, file) {
  const issues = [];
  const mermaidBlocks = [];
  const headings = new Map();
  const lines = text.split("\n");
  const fenceRanges = [];
  let fence = null;
  let fenceStartOffset = null;
  let mermaidStart = null;
  let mermaidBuffer = [];
  let lineStartOffset = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})\s*([^\s]*)?.*$/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!fence) {
        fence = marker;
        fenceStartOffset = lineStartOffset;
        if ((fenceMatch[2] || "").toLowerCase() === "mermaid") {
          mermaidStart = index + 1;
          mermaidBuffer = [];
        }
      } else if (marker === fence) {
        fenceRanges.push({ start: fenceStartOffset, end: lineStartOffset + line.length });
        if (mermaidStart !== null) {
          mermaidBlocks.push({ start: mermaidStart, content: mermaidBuffer.join("\n") });
          mermaidStart = null;
          mermaidBuffer = [];
        }
        fence = null;
        fenceStartOffset = null;
      }
    } else if (mermaidStart !== null) mermaidBuffer.push(line);

    const headingMatch = line.match(/^\s*#{1,6}\s+(.+?)\s*#*\s*$/);
    if (headingMatch) {
      const heading = headingMatch[1].toLowerCase();
      if (headings.has(heading)) issues.push({ kind: "duplicate-heading", file, line: index + 1, detail: headingMatch[1] });
      headings.set(heading, index + 1);
    }
    lineStartOffset += line.length + 1;
  }

  if (fence) {
    fenceRanges.push({ start: fenceStartOffset, end: text.length });
    issues.push({ kind: "unclosed-fence", file, line: lines.length, detail: fence });
  }

  let proseText = text;
  for (const range of fenceRanges) {
    const masked = proseText.slice(range.start, range.end).replace(/[^\n]/g, " ");
    proseText = proseText.slice(0, range.start) + masked + proseText.slice(range.end);
  }
  proseText = proseText.replace(/`[^`\n]+`/g, (value) => value.replace(/[^\n]/g, " "));

  for (const match of proseText.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].trim().split("#", 1)[0].split("?", 1)[0];
    if (!target || /^(?:https?:|mailto:|tel:|#)/i.test(target)) continue;
    if (target.startsWith("<") && target.endsWith(">")) continue;
    let decoded;
    try { decoded = decodeURIComponent(target); } catch { decoded = target; }
    issues.push({ kind: "link", file, line: lineNumberAt(text, match.index), detail: { target, candidate: path.resolve(path.dirname(file), decoded) } });
  }

  for (const match of proseText.matchAll(/(?:\[\s*(?:TODO|TBD|FIXME|PLACEHOLDER)\s*\]|<\s*(?:TODO|TBD|FIXME|PLACEHOLDER)\s*>|\b(?:TODO|TBD|FIXME)\s*:|\blorem ipsum\b)/gi)) {
    issues.push({ kind: "placeholder", file, line: lineNumberAt(text, match.index), detail: match[0] });
  }
  return { issues, mermaidBlocks };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const docs = path.resolve(args.docs);
  const stat = await fs.stat(docs);
  if (!stat.isDirectory()) throw new Error(`Docs path is not a directory: ${docs}`);

  const files = await walkMarkdown(docs);
  const allIssues = [];
  let mermaidCount = 0;
  let bytes = 0;

  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    bytes += Buffer.byteLength(content, "utf8");
    const inspection = inspectMarkdown(content, file);
    mermaidCount += inspection.mermaidBlocks.length;
    for (const issue of inspection.issues) {
      if (issue.kind !== "link") allIssues.push(issue);
      else {
        try { await fs.stat(issue.detail.candidate); }
        catch { allIssues.push({ ...issue, kind: "broken-link" }); }
      }
    }
  }

  const errors = allIssues.filter((issue) => ["broken-link", "unclosed-fence", "placeholder"].includes(issue.kind));
  const warnings = allIssues.filter((issue) => issue.kind === "duplicate-heading");
  const report = { docs, files: files.length, bytes, mermaid_blocks: mermaidCount, errors, warnings, status: errors.length === 0 ? "pass" : "fail" };

  try {
    const reportPath = path.join(docs, "report.json");
    const persisted = JSON.parse(await fs.readFile(reportPath, "utf8"));
    persisted.verification = { ...(persisted.verification || {}), markdown: report.status, markdown_details: { files: report.files, bytes: report.bytes, mermaid_blocks: report.mermaid_blocks, errors: errors.length, warnings: warnings.length } };
    await fs.writeFile(reportPath, `${JSON.stringify(persisted, null, 2)}\n`, "utf8");
  } catch {
    // A generic docset does not need a Repo-Wiki report sidecar.
  }

  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Docset: ${docs}`);
    console.log(`Markdown files: ${files.length}`);
    console.log(`Mermaid blocks: ${mermaidCount}`);
    console.log(`Errors: ${errors.length}; warnings: ${warnings.length}`);
    for (const issue of [...errors, ...warnings]) console.log(`- ${issue.kind} ${issue.file}:${issue.line || 1} ${typeof issue.detail === "string" ? issue.detail : issue.detail?.target || ""}`);
  }
  process.exitCode = errors.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
