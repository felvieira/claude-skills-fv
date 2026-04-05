#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { readHookConfig, resolveBotPath } from "./utils.mjs";

function sanitize(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/(?:[A-Za-z]:)?(?:\/|\\)[\w./\\-]+\.\w+/g, "")
    .replace(/\s+at\s+\w[\w.<>]+\s*\([^)]*\)/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\{[\s\S]{0,500}?\}/g, "");
}

const INFORMATIONAL_PATTERNS = [
  /o que [eé]/i,
  /como funciona/i,
  /explica/i,
  /explain/i,
  /what is/i,
  /how does/i,
  /what does/i,
  /tell me about/i,
  /what\s+(?:is|are|does)/i,
  /como usar/i,
  /para que serve/i,
];

function isInformational(text, keyword, windowSize = 80) {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return false;
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(text.length, idx + keyword.length + windowSize);
  const window = text.slice(start, end);
  return INFORMATIONAL_PATTERNS.some((pattern) => pattern.test(window));
}

function loadSkillTriggers() {
  const skills = [];
  const skillsDir = existsSync(resolveBotPath("skills")) ? resolveBotPath("skills") : "skills";
  if (!existsSync(skillsDir)) return skills;

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;

    try {
      const content = readFileSync(skillFile, "utf-8");
      const triggerMatch = content.match(/Trigger em:\s*"([^"]+)"/);
      if (!triggerMatch) continue;

      const triggers = triggerMatch[1].split(",").map((trigger) => trigger.trim().toLowerCase());
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim() : entry.name;
      skills.push({ id: entry.name, name, triggers });
    } catch {}
  }

  return skills;
}

function summarizeLearnedSkill(content) {
  const body = content
    .replace(/^name:.*$/gm, "")
    .replace(/^description:.*$/gm, "")
    .replace(/^triggers:.*$/gm, "")
    .trim();

  const bullets = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- ") || line.startsWith("* "))
    .slice(0, 3);

  if (bullets.length > 0) {
    return bullets.join("\n");
  }

  return body
    .split(/\n\s*\n/)
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n");
}

function loadLearnedSkills() {
  const learned = [];
  const learnedDir = existsSync(resolveBotPath("learned-skills")) ? resolveBotPath("learned-skills") : null;
  if (!learnedDir) return learned;

  try {
    for (const file of readdirSync(learnedDir)) {
      if (!file.endsWith(".md")) continue;

      try {
        const content = readFileSync(join(learnedDir, file), "utf-8");
        const triggersMatch = content.match(/^triggers:\s*\[([^\]]+)\]/m);
        const nameMatch = content.match(/^name:\s*(.+)$/m);
        const descMatch = content.match(/^description:\s*(.+)$/m);
        if (!triggersMatch || !nameMatch) continue;

        const triggers = triggersMatch[1]
          .split(",")
          .map((trigger) => trigger.replace(/['"]/g, "").trim().toLowerCase());

        learned.push({
          name: nameMatch[1].trim(),
          description: descMatch ? descMatch[1].trim() : "",
          triggers,
          summary: summarizeLearnedSkill(content),
        });
      } catch {}
    }
  } catch {}

  return learned;
}

function getSessionInjected() {
  try {
    return JSON.parse(readFileSync(resolveBotPath(".hook-session.json"), "utf-8")).injected || [];
  } catch {
    return [];
  }
}

function saveSessionInjected(list) {
  try {
    mkdirSync(resolveBotPath(), { recursive: true });
    writeFileSync(resolveBotPath(".hook-session.json"), JSON.stringify({ injected: list }));
  } catch {}
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => {
  inputBuffer += chunk;
});

process.stdin.on("end", () => {
  let input = {};
  try {
    input = JSON.parse(inputBuffer);
  } catch {}

  const cfg = readHookConfig("keyword_detector", {
    max_learned_skills_per_session: 3,
    informational_context_window: 80,
  });

  const prompt = input.prompt || "";
  const clean = sanitize(prompt);
  const injectedThisSession = getSessionInjected();
  const additionalContextParts = [];

  const learnedSkills = loadLearnedSkills();
  let learnedCount = injectedThisSession.filter((name) => name.startsWith("learned:")).length;
  const maxLearned = cfg.max_learned_skills_per_session || 3;
  const infoWindow = cfg.informational_context_window || 80;

  for (const learnedSkill of learnedSkills) {
    if (learnedCount >= maxLearned) break;

    const key = `learned:${learnedSkill.name}`;
    if (injectedThisSession.includes(key)) continue;

    const matched = learnedSkill.triggers.some((trigger) => {
      if (!clean.toLowerCase().includes(trigger)) return false;
      return !isInformational(clean, trigger, infoWindow);
    });

    if (!matched) continue;

    additionalContextParts.push(
      `[LearnedSkill: ${learnedSkill.name}] ${learnedSkill.description}\n${learnedSkill.summary}`,
    );
    injectedThisSession.push(key);
    learnedCount++;
  }

  const skills = loadSkillTriggers();
  for (const skill of skills) {
    const matched = skill.triggers.some((trigger) => {
      if (!clean.toLowerCase().includes(trigger)) return false;
      return !isInformational(clean, trigger, infoWindow);
    });

    if (!matched) continue;

    additionalContextParts.push(
      `[SkillDetected: ${skill.id}] Trigger matched for "${skill.name}". Use this skill for the current task.`,
    );
    break;
  }

  if (injectedThisSession.length > 0) {
    saveSessionInjected(injectedThisSession);
  }

  if (additionalContextParts.length > 0) {
    process.stdout.write(
      JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          additionalContext: additionalContextParts.join("\n\n---\n\n"),
        },
      }),
    );
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
