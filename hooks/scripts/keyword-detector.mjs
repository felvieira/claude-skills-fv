#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ── Sanitization ─────────────────────────────────────────────────────────────

function sanitize(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/(?:[A-Za-z]:)?(?:\/|\\)[\w./\\-]+\.\w+/g, '')
    .replace(/\s+at\s+\w[\w.<>]+\s*\([^)]*\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\{[\s\S]{0,500}?\}/g, '');
}

// ── Informational intent check ────────────────────────────────────────────────

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
  return INFORMATIONAL_PATTERNS.some(p => p.test(window));
}

// ── Skill trigger loader ──────────────────────────────────────────────────────

function loadSkillTriggers() {
  const skills = [];
  const skillsDir = existsSync('.bot/skills') ? '.bot/skills' : 'skills';
  if (!existsSync(skillsDir)) return skills;

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = join(skillsDir, entry.name, 'SKILL.md');
    if (!existsSync(skillFile)) continue;
    try {
      const content = readFileSync(skillFile, 'utf-8');
      const triggerMatch = content.match(/Trigger em:\s*"([^"]+)"/);
      if (!triggerMatch) continue;
      const triggers = triggerMatch[1].split(',').map(t => t.trim().toLowerCase());
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const name = nameMatch ? nameMatch[1].trim() : entry.name;
      skills.push({ id: entry.name, name, triggers });
    } catch {}
  }
  return skills;
}

// ── Learned skill loader ──────────────────────────────────────────────────────

function loadLearnedSkills() {
  const learned = [];
  const learnedDir = existsSync('.bot/learned-skills') ? '.bot/learned-skills' : null;
  if (!learnedDir) return learned;

  try {
    for (const file of readdirSync(learnedDir)) {
      if (!file.endsWith('.md')) continue;
      try {
        const content = readFileSync(join(learnedDir, file), 'utf-8');
        const triggersMatch = content.match(/^triggers:\s*\[([^\]]+)\]/m);
        const nameMatch = content.match(/^name:\s*(.+)$/m);
        const descMatch = content.match(/^description:\s*(.+)$/m);
        if (!triggersMatch || !nameMatch) continue;
        const triggers = triggersMatch[1].split(',').map(t => t.replace(/['"]/g, '').trim().toLowerCase());
        learned.push({
          name: nameMatch[1].trim(),
          description: descMatch ? descMatch[1].trim() : '',
          triggers,
          content,
        });
      } catch {}
    }
  } catch {}
  return learned;
}

// ── Session dedup tracker ─────────────────────────────────────────────────────

function getSessionInjected() {
  try {
    return JSON.parse(readFileSync('.bot/.hook-session.json', 'utf-8')).injected || [];
  } catch {
    return [];
  }
}

function saveSessionInjected(list) {
  try {
    mkdirSync('.bot', { recursive: true });
    writeFileSync('.bot/.hook-session.json', JSON.stringify({ injected: list }));
  } catch {}
}

// ── Main ──────────────────────────────────────────────────────────────────────

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(_input); } catch {}
  const prompt = input.prompt || '';
  const clean = sanitize(prompt);

  const injectedThisSession = getSessionInjected();
  const additionalContextParts = [];

  // ── Learned skills (higher priority) ──
  const learnedSkills = loadLearnedSkills();
  let learnedCount = injectedThisSession.filter(n => n.startsWith('learned:')).length;
  const maxLearned = 3;

  for (const ls of learnedSkills) {
    if (learnedCount >= maxLearned) break;
    const key = `learned:${ls.name}`;
    if (injectedThisSession.includes(key)) continue;
    const matched = ls.triggers.some(t => {
      if (!clean.toLowerCase().includes(t)) return false;
      return !isInformational(clean, t);
    });
    if (matched) {
      additionalContextParts.push(`[LearnedSkill: ${ls.name}] ${ls.description}\n${ls.content}`);
      injectedThisSession.push(key);
      learnedCount++;
    }
  }

  // ── Official skill triggers ──
  const skills = loadSkillTriggers();
  for (const skill of skills) {
    const matched = skill.triggers.some(t => {
      if (!clean.toLowerCase().includes(t)) return false;
      return !isInformational(clean, t);
    });
    if (matched) {
      additionalContextParts.push(`[SkillDetected: ${skill.id}] Trigger matched for "${skill.name}". Use this skill for the current task.`);
      break;
    }
  }

  // Save session state
  if (injectedThisSession.length > 0) {
    saveSessionInjected(injectedThisSession);
  }

  if (additionalContextParts.length > 0) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        additionalContext: additionalContextParts.join('\n\n---\n\n')
      }
    }));
  } else {
    process.stdout.write(JSON.stringify({ continue: true }));
  }
});
