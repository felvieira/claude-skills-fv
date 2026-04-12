#!/usr/bin/env node
import {
  readFileSync, existsSync, readdirSync,
  writeFileSync, mkdirSync, renameSync
} from "fs";
import { join } from "path";
import { readHookConfig, resolveBotPath, isHookDisabled } from "./utils.mjs";

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
  /o que [eé]/i, /como funciona/i, /explica/i, /explain/i,
  /what is/i, /how does/i, /what does/i, /tell me about/i,
  /what\s+(?:is|are|does)/i, /como usar/i, /para que serve/i,
];

function isInformational(text, keyword, windowSize = 80) {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return false;
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(text.length, idx + keyword.length + windowSize);
  const window = text.slice(start, end);
  return INFORMATIONAL_PATTERNS.some((p) => p.test(window));
}

function loadSkillTriggers() {
  const skills = [];
  const skillsDir = existsSync(resolveBotPath("skills"))
    ? resolveBotPath("skills")
    : "skills";
  if (!existsSync(skillsDir)) return skills;

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    try {
      const content = readFileSync(skillFile, "utf-8");
      const triggerMatch = content.match(/Trigger em:\s*"([^"]+)"/);
      if (!triggerMatch) continue;
      const triggers = triggerMatch[1].split(",").map((t) => t.trim().toLowerCase());
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim() : entry.name;
      skills.push({ id: entry.name, name, triggers });
    } catch {}
  }
  return skills;
}

function summarizeLearnedSkill(content) {
  const body = content
    .replace(/^---[\s\S]*?---\n?/, "")
    .trim();
  const bullets = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- ") || l.startsWith("* "))
    .slice(0, 3);
  if (bullets.length > 0) return bullets.join("\n");
  return body
    .split(/\n\s*\n/)
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n");
}

function updateFrontmatter(content, updates) {
  if (!content.startsWith("---\n")) return content;
  const endIdx = content.indexOf("\n---", 4);
  if (endIdx === -1) return content;
  let fm = content.slice(4, endIdx);
  const body = content.slice(endIdx + 4);
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}:.*$`, "m");
    if (regex.test(fm)) {
      fm = fm.replace(regex, `${key}: ${value}`);
    } else {
      fm += `\n${key}: ${value}`;
    }
  }
  return `---\n${fm}\n---${body}`;
}

function weeksAgo(dateStr) {
  if (!dateStr) return 0;
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return 0;
  return Math.max(0, (Date.now() - then.getTime()) / (1000 * 60 * 60 * 24 * 7));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function loadLearnedSkills(learnedDir, scoringCfg) {
  const learned = [];
  if (!existsSync(learnedDir)) return learned;

  const archiveDir = join(learnedDir, scoringCfg.archive_dir || ".archive");
  const initialScore = scoringCfg.initial_score ?? 0.7;
  const decayPerWeek = scoringCfg.decay_per_week ?? 0.1;
  const archiveThreshold = scoringCfg.archive_threshold ?? 0.3;

  let files;
  try { files = readdirSync(learnedDir); } catch { return learned; }

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const filePath = join(learnedDir, file);

    try {
      let content = readFileSync(filePath, "utf-8");
      const triggersMatch = content.match(/^triggers:\s*\[([^\]]+)\]/m);
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const descMatch = content.match(/^description:\s*(.+)$/m);
      if (!triggersMatch || !nameMatch) continue;

      // Parse score fields with migration for missing ones
      const scoreMatch = content.match(/^score:\s*([\d.]+)/m);
      const lastUsedMatch = content.match(/^last_used:\s*(.+)$/m);
      const usesMatch = content.match(/^uses:\s*(\d+)/m);

      const needsMigration = !scoreMatch;
      if (needsMigration) {
        content = updateFrontmatter(content, {
          score: initialScore,
          last_used: today(),
          created: today(),
          uses: 0,
        });
        try { writeFileSync(filePath, content); } catch {}
      }

      const score = scoreMatch ? parseFloat(scoreMatch[1]) : initialScore;
      const lastUsed = lastUsedMatch ? lastUsedMatch[1].trim() : today();
      const uses = usesMatch ? parseInt(usesMatch[1], 10) : 0;

      const effectiveScore = score - weeksAgo(lastUsed) * decayPerWeek;

      // Auto-archive if below threshold
      if (effectiveScore < archiveThreshold) {
        try {
          mkdirSync(archiveDir, { recursive: true });
          renameSync(filePath, join(archiveDir, file));
        } catch {}
        continue;
      }

      const triggers = triggersMatch[1]
        .split(",")
        .map((t) => t.replace(/['"]/g, "").trim().toLowerCase());

      learned.push({
        name: nameMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : "",
        triggers,
        summary: summarizeLearnedSkill(content),
        effectiveScore,
        score,
        lastUsed,
        uses,
        filePath,
      });
    } catch {}
  }

  // Sort by effective score descending — highest confidence first
  return learned.sort((a, b) => b.effectiveScore - a.effectiveScore);
}

function getSessionState() {
  try {
    return JSON.parse(readFileSync(resolveBotPath(".hook-session.json"), "utf-8"));
  } catch {
    return {};
  }
}

function saveSessionState(state) {
  try {
    mkdirSync(resolveBotPath(), { recursive: true });
    writeFileSync(resolveBotPath(".hook-session.json"), JSON.stringify(state));
  } catch {}
}

function updateSkillOnUse(filePath, skill, boostOnUse) {
  try {
    const content = readFileSync(filePath, "utf-8");
    const newScore = Math.min(1.0, skill.score + boostOnUse);
    const updated = updateFrontmatter(content, {
      score: newScore.toFixed(2),
      last_used: today(),
      uses: skill.uses + 1,
    });
    writeFileSync(filePath, updated);
  } catch {}
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { inputBuffer += chunk; });

process.stdin.on("end", () => {
  if (isHookDisabled("keyword-detector")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let input = {};
  try { input = JSON.parse(inputBuffer); } catch {}

  const cfg = readHookConfig("keyword_detector", {
    max_learned_skills_per_session: 3,
    informational_context_window: 80,
  });
  const scoringCfg = readHookConfig("learned_skills_scoring", {
    initial_score: 0.7,
    boost_on_use: 0.1,
    decay_per_week: 0.1,
    archive_threshold: 0.3,
    archive_dir: ".archive",
  });

  const prompt = input.prompt || "";
  const clean = sanitize(prompt);

  // Save last_prompt for context-guard-stop strategic compact
  const session = getSessionState();
  session.last_prompt = prompt.slice(0, 80).replace(/\s+/g, " ").trim();
  const injectedThisSession = session.injected || [];
  const additionalContextParts = [];

  const learnedDir = existsSync(resolveBotPath("learned-skills"))
    ? resolveBotPath("learned-skills")
    : null;
  const learnedSkills = learnedDir ? loadLearnedSkills(learnedDir, scoringCfg) : [];

  let learnedCount = injectedThisSession.filter((n) => n.startsWith("learned:")).length;
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
      `[LearnedSkill: ${learnedSkill.name}] ${learnedSkill.description}\n${learnedSkill.summary}`
    );
    injectedThisSession.push(key);
    learnedCount++;

    // Boost score on successful injection
    if (learnedSkill.filePath) {
      updateSkillOnUse(learnedSkill.filePath, learnedSkill, scoringCfg.boost_on_use ?? 0.1);
    }
  }

  const skills = loadSkillTriggers();
  for (const skill of skills) {
    const matched = skill.triggers.some((trigger) => {
      if (!clean.toLowerCase().includes(trigger)) return false;
      return !isInformational(clean, trigger, infoWindow);
    });
    if (!matched) continue;
    additionalContextParts.push(
      `[SkillDetected: ${skill.id}] Trigger matched for "${skill.name}". Use this skill for the current task.`
    );
    break;
  }

  session.injected = injectedThisSession;
  saveSessionState(session);

  if (additionalContextParts.length > 0) {
    process.stdout.write(
      JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          additionalContext: additionalContextParts.join("\n\n---\n\n"),
        },
      })
    );
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
