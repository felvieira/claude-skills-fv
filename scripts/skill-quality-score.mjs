#!/usr/bin/env node

// Skill Quality Score
//
// Scorer programatico das skills do kit. Substitui a rubrica manual descrita
// na skill 35-skill-author (5 criterios x 6 pontos = 30 max).
//
// Uso:
//   node scripts/skill-quality-score.mjs                              # tabela
//   node scripts/skill-quality-score.mjs --json                       # JSON
//   node scripts/skill-quality-score.mjs --skill 43-canary-deployment # uma
//   node scripts/skill-quality-score.mjs --min 25                     # gate
//
// Zero-dep. Node 18+. ESM puro.

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

// -------- CLI args --------

function parseArgs(argv) {
  const args = { json: false, skill: null, min: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") args.json = true;
    else if (a === "--skill") args.skill = argv[++i] || null;
    else if (a.startsWith("--skill=")) args.skill = a.split("=")[1] || null;
    else if (a === "--min") {
      const v = Number(argv[++i]);
      args.min = Number.isFinite(v) ? v : null;
    } else if (a.startsWith("--min=")) {
      const v = Number(a.split("=")[1]);
      args.min = Number.isFinite(v) ? v : null;
    }
  }
  return args;
}

// -------- Skill discovery --------

async function listSkillFiles() {
  const skillsDir = path.join(root, "skills");
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const p = path.join(skillsDir, e.name, "SKILL.md");
    try {
      const stat = await fs.stat(p);
      if (stat.isFile()) out.push({ id: e.name, file: p, size: stat.size });
    } catch {
      // sem SKILL.md — ignora
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id, "en"));
}

// -------- Frontmatter parsing --------

function parseFrontmatter(raw) {
  // Aceita frontmatter YAML simples delimitado por --- nas linhas 1 e N.
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return { ok: false, data: {}, body: raw };
  const block = m[1];
  const data = {};
  // suporta `key: |` (multiline) e `key: value`
  const lines = block.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const flat = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!flat) {
      i++;
      continue;
    }
    const key = flat[1];
    const valRaw = flat[2];
    if (valRaw === "|" || valRaw === ">") {
      // bloco indentado
      const buf = [];
      i++;
      while (i < lines.length && /^\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s+/, ""));
        i++;
      }
      data[key] = buf.join("\n").trim();
    } else {
      data[key] = valRaw.trim();
      i++;
    }
  }
  const body = raw.slice(m[0].length);
  return { ok: true, data, body };
}

// -------- Scoring helpers --------

function extractTriggers(description) {
  if (!description) return [];
  // 1) Procurar literal "Trigger em:" e captar a frase ate fim de paragrafo
  const idx = description.search(/Trigger em\s*:/i);
  if (idx >= 0) {
    const tail = description.slice(idx).replace(/^Trigger em\s*:/i, "");
    // Pega ate fim do paragrafo (blank line) ou ate "."
    const para = tail.split(/\n\s*\n/)[0];
    // Tokens entre aspas
    const quoted = [...para.matchAll(/"([^"]+)"|'([^']+)'/g)].map(
      (mm) => mm[1] || mm[2]
    );
    if (quoted.length > 0) return quoted;
    // fallback: split por virgula
    return para
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // 2) sem "Trigger em:" — split por virgula sobre description inteira
  return description
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 100);
}

function countMatches(text, regex) {
  const m = text.match(regex);
  return m ? m.length : 0;
}

function countLongLists(body) {
  // lista = sequencia de linhas consecutivas comecando com "- " ou "* "
  const lines = body.split(/\r?\n/);
  let count = 0;
  let cur = 0;
  for (const ln of lines) {
    if (/^\s*[-*]\s+/.test(ln)) {
      cur++;
    } else {
      if (cur >= 5) count++;
      cur = 0;
    }
  }
  if (cur >= 5) count++;
  return count;
}

async function loadNoticeText() {
  try {
    return await fs.readFile(path.join(root, "NOTICE"), "utf8");
  } catch {
    try {
      return await fs.readFile(path.join(root, "NOTICE.md"), "utf8");
    } catch {
      return "";
    }
  }
}

// -------- Scoring rubric --------

function scoreFrontmatter(fm) {
  let s = 0;
  const detail = {};
  const hasName = Boolean(fm.data?.name && String(fm.data.name).trim().length > 0);
  const hasDesc = Boolean(
    fm.data?.description && String(fm.data.description).trim().length > 0
  );
  if (hasName) s += 2;
  if (hasDesc) s += 2;
  const triggers = extractTriggers(fm.data?.description || "");
  if (triggers.length >= 5) s += 2;
  detail.has_name = hasName;
  detail.has_description = hasDesc;
  detail.trigger_count = triggers.length;
  return { score: s, max: 6, detail };
}

function scoreStructure(body) {
  let s = 0;
  const detail = {};
  const checks = [
    { key: "governanca_global", patt: /^##\s+Governan[cç]a Global\b/im },
    { key: "quando_usar", patt: /^##\s+Quando Usar\b/im },
    {
      key: "quando_nao_usar",
      patt: /^##\s+Quando\s+(Nao Usar|N[aã]o Usar|NAO USAR|N[ÃA]O USAR)\b/im,
    },
    { key: "entradas_esperadas", patt: /^##\s+Entradas Esperadas\b/im },
    { key: "saidas_esperadas", patt: /^##\s+Sa[ií]das Esperadas\b/im },
    {
      key: "integracao_handoff",
      patt: /^##\s+(Integra[cç][aã]o com Pipeline|Handoff)\b/im,
    },
  ];
  for (const c of checks) {
    const ok = c.patt.test(body);
    if (ok) s += 1;
    detail[c.key] = ok;
  }
  return { score: s, max: 6, detail };
}

// Skills "hub" acumulam catalogos/referencias por natureza (ex: 02 tem 15
// catalogos de decisao de design + motor de busca BM25; 61 e o motor de
// growth engine com muita tabela de decisao). O teto normal de 25KB penaliza
// esse formato mesmo quando o conteudo denso ja foi triado pra references/
// (skill 02 tem references/ com 5 arquivos — o SKILL.md nao e tudo que existe,
// e o hub que direciona pra eles). Fixo, nao heuristico: revisar a lista
// manualmente se uma skill hub nova surgir, nao inferir por tamanho sozinho.
const SIZE_EXEMPT_HUBS = new Set(["02-ui-ux-design"]);

function scoreSize(sizeBytes, skillId) {
  const kb = sizeBytes / 1024;
  if (SIZE_EXEMPT_HUBS.has(skillId)) {
    return { score: 6, max: 6, detail: { kb: Math.round(kb * 10) / 10, exempt: "hub" } };
  }
  let s = 0;
  if (kb <= 10) s = 6;
  else if (kb <= 15) s = 4;
  else if (kb <= 25) s = 2;
  else s = 0;
  return { score: s, max: 6, detail: { kb: Math.round(kb * 10) / 10 } };
}

function scoreAntiAi(text) {
  let s = 0;
  const detail = {};
  const buzz = countMatches(
    text,
    /\b(delve|tapestry|underscore the|crucial|pivotal)\b/gi
  );
  if (buzz === 0) s += 2;
  detail.buzzwords = buzz;
  // em-dash usado como virgula: " letra — letra " (espacos obrigatorios + minusculas)
  const emDashCommaCount = countMatches(text, /[a-z] — [a-z]/g);
  if (emDashCommaCount < 5) s += 1;
  detail.em_dash_as_comma = emDashCommaCount;
  const longLists = countLongLists(text);
  if (longLists <= 3) s += 1;
  detail.long_lists = longLists;
  const hedges = countMatches(
    text,
    /\b(important to note|it is worth noting)\b/gi
  );
  if (hedges === 0) s += 2;
  detail.hedges = hedges;
  return { score: s, max: 6, detail };
}

function scoreAttribution(body, noticeText) {
  let s = 0;
  const detail = {};
  const hasFontesSection = /^##\s+Fontes( Externas)?\b/im.test(body);
  if (hasFontesSection) s += 3;
  detail.has_fontes_section = hasFontesSection;
  const repoMatches = [
    ...body.matchAll(/github\.com\/([^\/\s)]+)\/([^\/\s)]+)/g),
  ].map((m) => `${m[1]}/${m[2]}`.replace(/[.,]$/, ""));
  const uniqueRepos = [...new Set(repoMatches)];
  detail.external_repos = uniqueRepos;
  if (uniqueRepos.length === 0) {
    s += 3;
    detail.notice_coverage = "n/a";
  } else {
    const noticeLower = (noticeText || "").toLowerCase();
    const missing = uniqueRepos.filter(
      (r) => !noticeLower.includes(r.toLowerCase())
    );
    if (missing.length === 0) s += 3;
    detail.notice_coverage = missing.length === 0 ? "ok" : `missing: ${missing.join(", ")}`;
  }
  return { score: s, max: 6, detail };
}

// -------- Score one skill --------

async function scoreSkill(skill, noticeText) {
  let raw;
  try {
    raw = await fs.readFile(skill.file, "utf8");
  } catch (err) {
    return {
      id: skill.id,
      error: `cannot read SKILL.md: ${err.message}`,
      total: null,
      max: 30,
    };
  }
  const fm = parseFrontmatter(raw);
  if (!fm.ok) {
    return {
      id: skill.id,
      error: "missing or invalid frontmatter",
      total: null,
      max: 30,
    };
  }
  const fmScore = scoreFrontmatter(fm);
  const structScore = scoreStructure(fm.body);
  const sizeScore = scoreSize(skill.size, skill.id);
  const aiScore = scoreAntiAi(raw);
  const attScore = scoreAttribution(fm.body, noticeText);
  const total =
    fmScore.score +
    structScore.score +
    sizeScore.score +
    aiScore.score +
    attScore.score;
  return {
    id: skill.id,
    error: null,
    total,
    max: 30,
    breakdown: {
      frontmatter: fmScore,
      structure: structScore,
      size: sizeScore,
      anti_ai: aiScore,
      attribution: attScore,
    },
  };
}

// -------- Output formats --------

function padRight(s, n) {
  s = String(s);
  return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}
function padLeft(s, n) {
  s = String(s);
  return s.length >= n ? s.slice(0, n) : " ".repeat(n - s.length) + s;
}

function renderTable(results) {
  const lines = [];
  lines.push("Dev Team Kit — skill quality scores");
  lines.push("==========================================================");
  lines.push(
    padRight("skill", 28) +
      padLeft("fm", 4) +
      padLeft("str", 5) +
      padLeft("size", 6) +
      padLeft("ai", 4) +
      padLeft("att", 5) +
      "  " +
      padLeft("TOTAL", 7)
  );
  lines.push("----------------------------------------------------------");
  const okResults = [];
  for (const r of results) {
    if (r.error) {
      lines.push(
        padRight(r.id, 28) +
          padLeft("--", 4) +
          padLeft("--", 5) +
          padLeft("--", 6) +
          padLeft("--", 4) +
          padLeft("--", 5) +
          "  " +
          padLeft(`--/30  (${r.error})`, 7)
      );
      continue;
    }
    okResults.push(r);
    const b = r.breakdown;
    lines.push(
      padRight(r.id, 28) +
        padLeft(b.frontmatter.score, 4) +
        padLeft(b.structure.score, 5) +
        padLeft(b.size.score, 6) +
        padLeft(b.anti_ai.score, 4) +
        padLeft(b.attribution.score, 5) +
        "  " +
        padLeft(`${r.total}/30`, 7)
    );
  }
  lines.push("----------------------------------------------------------");
  if (okResults.length > 0) {
    const totals = okResults.map((r) => r.total);
    const sum = totals.reduce((a, b) => a + b, 0);
    const mean = Math.round((sum / totals.length) * 10) / 10;
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    const minSkill = okResults.find((r) => r.total === min)?.id || "?";
    const maxSkill = okResults.find((r) => r.total === max)?.id || "?";
    lines.push(
      `MEAN: ${mean}/30  MIN: ${min}/30 (${minSkill})  MAX: ${max}/30 (${maxSkill})`
    );
  } else {
    lines.push("no scorable skills");
  }
  return lines.join("\n");
}

function renderJson(results, minThreshold) {
  const okResults = results.filter((r) => !r.error);
  const totals = okResults.map((r) => r.total);
  const sum = totals.reduce((a, b) => a + b, 0);
  const meta = {
    count: results.length,
    scorable: okResults.length,
    mean: okResults.length > 0 ? Math.round((sum / okResults.length) * 100) / 100 : null,
    min: okResults.length > 0 ? Math.min(...totals) : null,
    max: okResults.length > 0 ? Math.max(...totals) : null,
    threshold: minThreshold,
  };
  return JSON.stringify({ meta, results }, null, 2);
}

// -------- Entry point --------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const allSkills = await listSkillFiles();
  const targets = args.skill
    ? allSkills.filter((s) => s.id === args.skill)
    : allSkills;
  if (targets.length === 0) {
    console.error(
      args.skill
        ? `Skill '${args.skill}' nao encontrada em skills/`
        : "Nenhuma skill encontrada em skills/"
    );
    process.exit(1);
  }
  const noticeText = await loadNoticeText();
  const results = [];
  for (const skill of targets) {
    results.push(await scoreSkill(skill, noticeText));
  }

  if (args.json) {
    console.log(renderJson(results, args.min));
  } else {
    console.log(renderTable(results));
  }

  // Gate por --min: exit 1 se alguma skill abaixo do threshold OU erro de parse
  if (args.min !== null) {
    const failing = results.filter(
      (r) => r.error || (typeof r.total === "number" && r.total < args.min)
    );
    if (failing.length > 0) {
      console.error(
        `\nGate falhou: ${failing.length} skill(s) abaixo de ${args.min}/30:`
      );
      for (const f of failing) {
        const detail = f.error ? `(${f.error})` : `${f.total}/30`;
        console.error(`- ${f.id}: ${detail}`);
      }
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
