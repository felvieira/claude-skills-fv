import fs from "fs/promises";
import path from "path";
import { glob } from "glob";
import matter from "gray-matter";
import { PATHS } from "../constants.js";
import type { SkillMeta } from "../types.js";

export async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function listSkills(): Promise<SkillMeta[]> {
  const dirs = await glob("*/SKILL.md", { cwd: PATHS.skills });
  const skills: SkillMeta[] = [];

  for (const dir of dirs.sort()) {
    const fullPath = path.join(PATHS.skills, dir);
    const content = await readFile(fullPath);
    if (!content) continue;

    const { data } = matter(content);
    const id = path.dirname(dir);
    const triggers = extractTriggers(data.description || "");

    skills.push({
      id,
      name: data.name || id,
      description: (data.description || "").trim(),
      argumentHint: data["argument-hint"],
      allowedTools: data["allowed-tools"],
      triggers,
    });
  }

  return skills;
}

export async function getSkillContent(skillId: string): Promise<{
  content: string | null;
  guide: string | null;
  template: string | null;
}> {
  const skillPath = path.join(PATHS.skills, skillId, "SKILL.md");
  const content = await readFile(skillPath);

  // Try to find matching skill guide
  const guideName = skillId.replace(/^\d+-/, "");
  const guidePath = path.join(PATHS.docs, "skill-guides", `${guideName}.md`);
  const guide = await readFile(guidePath);

  // Try to find matching template
  const templatePath = path.join(PATHS.templates, `${guideName}.md`);
  const template = await readFile(templatePath);

  return { content, guide, template };
}

export async function getGlobal(): Promise<string | null> {
  return readFile(PATHS.global);
}

export async function getPolicies(names?: string[]): Promise<Array<{ name: string; content: string }>> {
  const pattern = names ? `{${names.join(",")}}.md` : "*.md";
  const files = await glob(pattern, { cwd: PATHS.policies });
  const results: Array<{ name: string; content: string }> = [];

  for (const file of files.sort()) {
    const content = await readFile(path.join(PATHS.policies, file));
    if (content) {
      results.push({ name: file.replace(".md", ""), content });
    }
  }

  return results;
}

export async function getTemplate(name: string): Promise<string | null> {
  return readFile(path.join(PATHS.templates, `${name}.md`));
}

export async function getPatterns(pattern?: string): Promise<string | null> {
  if (pattern) {
    return readFile(path.join(PATHS.patterns, "ai-integration", `${pattern}.md`));
  }
  // Return README overview
  return readFile(path.join(PATHS.patterns, "ai-integration", "README.md"));
}

export async function getCodeSnippets(type: string): Promise<Array<{ path: string; content: string }>> {
  const typeMap: Record<string, string> = {
    hooks: "hooks",
    components: "components",
    stores: "stores",
    types: "types",
    middleware: "",
  };

  const subDir = typeMap[type];
  if (subDir === undefined) return [];

  if (type === "middleware") {
    const content = await readFile(path.join(PATHS.src, "middleware.ts"));
    return content ? [{ path: "src/middleware.ts", content }] : [];
  }

  const files = await glob("**/*.{ts,tsx}", { cwd: path.join(PATHS.src, subDir) });
  const results: Array<{ path: string; content: string }> = [];

  for (const file of files) {
    const content = await readFile(path.join(PATHS.src, subDir, file));
    if (content) {
      results.push({ path: `src/${subDir}/${file}`, content });
    }
  }

  return results;
}

export async function getRepoAudit(projectPath?: string): Promise<{
  audit: string | null;
  assets: string | null;
}> {
  const base = projectPath
    ? path.join(projectPath, "docs", "repo-audit")
    : path.join(PATHS.docs, "repo-audit");

  return {
    audit: await readFile(path.join(base, "current.md")),
    assets: await readFile(path.join(base, "assets.md")),
  };
}

export async function getEvalCases(skillId?: string, flow?: string): Promise<Array<{ name: string; content: string }>> {
  let searchPath: string;
  if (flow) {
    searchPath = path.join(PATHS.evals, "flows", `${flow}.md`);
    const content = await readFile(searchPath);
    return content ? [{ name: flow, content }] : [];
  }

  if (skillId) {
    const name = skillId.replace(/^\d+-/, "");
    const files = await glob(`**/*${name}*.md`, { cwd: PATHS.evals });
    const results: Array<{ name: string; content: string }> = [];
    for (const file of files) {
      const content = await readFile(path.join(PATHS.evals, file));
      if (content) results.push({ name: file.replace(".md", ""), content });
    }
    return results;
  }

  // All evals
  const files = await glob("**/*.md", { cwd: PATHS.evals });
  const results: Array<{ name: string; content: string }> = [];
  for (const file of files.sort()) {
    const content = await readFile(path.join(PATHS.evals, file));
    if (content) results.push({ name: file.replace(".md", ""), content });
  }
  return results;
}

function extractTriggers(description: string): string[] {
  const triggerMatch = description.match(/Trigger em:\s*(.+)/i);
  if (!triggerMatch) return [];
  return triggerMatch[1]
    .split(",")
    .map((t) => t.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}
