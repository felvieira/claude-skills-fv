import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const kitRoot = path.resolve(__dirname, "../..");

const RISK_ORDER = { low: 0, medium: 1, high: 2 };
const TRUST_LEVELS = new Set(["core", "official", "verified-upstream", "community"]);

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export async function loadPluginCatalog(root = kitRoot) {
  const catalogDir = path.join(root, "plugins", "catalog");
  const entries = await fs.readdir(catalogDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(files.map(async (file) => {
    const filePath = path.join(catalogDir, file);
    return { file, filePath, data: JSON.parse(await fs.readFile(filePath, "utf8")) };
  }));
}

export async function validatePluginCatalog(root = kitRoot) {
  const errors = [];
  const warnings = [];
  let entries = [];

  try {
    entries = await loadPluginCatalog(root);
  } catch (error) {
    return { errors: [`Could not load plugins/catalog: ${error.message}`], warnings, entries };
  }

  const seenIds = new Set();
  for (const { file, data } of entries) {
    const prefix = `plugins/catalog/${file}`;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      errors.push(`${prefix}: manifest must be an object`);
      continue;
    }
    if (data.schema_version !== "1.0") errors.push(`${prefix}: schema_version must be \"1.0\"`);
    if (!/^[a-z][a-z0-9-]*$/.test(data.id || "")) errors.push(`${prefix}: id must be kebab-case`);
    if (data.id && seenIds.has(data.id)) errors.push(`${prefix}: duplicate plugin id \"${data.id}\"`);
    seenIds.add(data.id);
    if (!data.name || !data.description) errors.push(`${prefix}: name and description are required`);
    if (!(data.risk in RISK_ORDER)) errors.push(`${prefix}: risk must be low, medium, or high`);
    if (!TRUST_LEVELS.has(data.trust)) errors.push(`${prefix}: trust must be core, official, verified-upstream, or community`);
    if (!["bundled", "external"].includes(data.availability || "bundled")) {
      errors.push(`${prefix}: availability must be bundled or external`);
    }
    if (data.availability === "external") {
      if (!data.install?.provider || !data.install?.reference) {
        errors.push(`${prefix}: external plugins require install.provider and install.reference`);
      } else {
        try {
          const reference = new URL(data.install.reference);
          if (reference.protocol !== "https:") errors.push(`${prefix}: external install.reference must use https`);
        } catch {
          errors.push(`${prefix}: external install.reference must be a valid URL`);
        }
      }
    }
    if (data.policies !== undefined && !isStringArray(data.policies)) {
      errors.push(`${prefix}: policies must be an array of non-empty strings`);
    }
    for (const policy of data.policies || []) {
      if (!policy.startsWith("policies/") || !policy.endsWith(".md")) {
        errors.push(`${prefix}: policy must be a relative policies/*.md path (${policy})`);
        continue;
      }
      try {
        await fs.access(path.join(root, policy));
      } catch {
        errors.push(`${prefix}: missing policy ${policy}`);
      }
    }
    if (!Array.isArray(data.capabilities) || data.capabilities.length === 0) {
      errors.push(`${prefix}: capabilities must contain at least one route`);
      continue;
    }

    for (const capability of data.capabilities) {
      const label = `${prefix}:${capability.id || "unknown"}`;
      if (!capability.id || !isStringArray(capability.when_any) || capability.when_any.length === 0) {
        errors.push(`${label}: id and non-empty when_any are required`);
      }
      if (capability.when_all !== undefined && !isStringArray(capability.when_all)) {
        errors.push(`${label}: when_all must be an array of non-empty strings`);
      }
      if (capability.when_none !== undefined && !isStringArray(capability.when_none)) {
        errors.push(`${label}: when_none must be an array of non-empty strings`);
      }
      if (capability.commands !== undefined && !isStringArray(capability.commands)) {
        errors.push(`${label}: commands must be an array of non-empty strings`);
      }
      if (capability.skills !== undefined && !isStringArray(capability.skills)) {
        errors.push(`${label}: skills must be an array of non-empty strings`);
      }
      if (data.availability !== "external" && (!isStringArray(capability.skills) || capability.skills.length === 0)) {
        errors.push(`${label}: skills must contain at least one skill id`);
      }
      for (const skillId of capability.skills || []) {
        const skillPath = path.join(root, "skills", skillId, "SKILL.md");
        try {
          await fs.access(skillPath);
        } catch {
          errors.push(`${label}: missing skill ${skillId}`);
        }
      }
    }
  }

  if (entries.length === 0) errors.push("plugins/catalog must contain at least one manifest");
  return { errors, warnings, entries };
}

// Trigger curto ("ui", "ux", "nda", "cac") casa por substring dentro de palavra
// nao relacionada ("eq-ui-pe", "fl-ux-o", "cale-nda-rio", "ca-c-he") — bug real,
// achado 3x em catalogos diferentes (ver .bot/learned-skills/catalog-substring-collision.md).
// Fronteira de palavra (\b) elimina a classe inteira sem exigir when_none manual
// por palavra colidente. So aplica a frase de ATE UMA palavra — frase multi-palavra
// ("auditar essa tela") ja e especifica o bastante pra nao precisar de fronteira,
// e teria custo de regex por combinacao sem ganho real.
const SINGLE_WORD_BOUNDARY_CACHE = new Map();

function matchesPhrase(text, phrase) {
  if (phrase.includes(" ")) return text.includes(phrase);
  let re = SINGLE_WORD_BOUNDARY_CACHE.get(phrase);
  if (!re) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`\\b${escaped}\\b`);
    SINGLE_WORD_BOUNDARY_CACHE.set(phrase, re);
  }
  return re.test(text);
}

function phraseScore(text, phrases) {
  return [...new Set(phrases.map(normalizeText).filter(Boolean))]
    .filter((phrase) => matchesPhrase(text, phrase))
    .reduce((total, phrase) => total + phrase.split(" ").length, 0);
}

function splitClauses(text) {
  return text.split(/[.;\n]| e (?=\w)/).map((clause) => clause.trim()).filter(Boolean);
}

function matchCapability(text, capability) {
  const whenAny = capability.when_any || [];
  const whenNone = capability.when_none || [];
  const whenAll = capability.when_all || [];
  const allRequired = whenAll.every((phrase) => matchesPhrase(text, normalizeText(phrase)));
  if (!allRequired) return 0;

  if (whenNone.length === 0) return phraseScore(text, whenAny);

  const clauses = splitClauses(text);
  let score = 0;
  for (const clause of clauses) {
    if (whenNone.some((phrase) => matchesPhrase(clause, normalizeText(phrase)))) continue;
    score += phraseScore(clause, whenAny);
  }
  return score;
}

function unique(values) {
  return [...new Set(values)];
}

export async function routeTask(prompt, options = {}) {
  const maxPlugins = options.maxPlugins ?? 3;
  const maxSkills = options.maxSkills ?? 6;
  const maxExternalPlugins = options.maxExternalPlugins ?? 1;
  const text = normalizeText(prompt);
  // Routing runs in UserPromptSubmit. It must stay cheap; full reference
  // validation belongs to doctor/CI, while malformed catalog JSON still throws.
  const entries = await loadPluginCatalog(options.root || kitRoot);
  const bundledCandidates = [];
  const externalCandidates = [];

  for (const { data } of entries) {
    const matches = [];
    for (const capability of data.capabilities) {
      const score = matchCapability(text, capability);
      if (score > 0) matches.push({ capability, score });
    }
    if (matches.length === 0) continue;

    const score = matches.reduce((total, match) => total + match.score, 0);
    const candidate = {
      id: data.id,
      name: data.name,
      description: data.description,
      risk: data.risk,
      trust: data.trust,
      score,
      skills: unique(matches.flatMap((match) => match.capability.skills || [])),
      policies: unique(data.policies || []),
      commands: unique(matches.flatMap((match) => match.capability.commands || [])),
      matchedCapabilities: matches.map((match) => match.capability.id),
      install: data.availability === "external" ? data.install : undefined,
      requires_human_review: Boolean(data.requires_human_review) || data.risk === "high",
    };
    (data.availability === "external" ? externalCandidates : bundledCandidates).push(candidate);
  }

  bundledCandidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  externalCandidates.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const plugins = bundledCandidates.slice(0, maxPlugins);
  const external_plugins = externalCandidates.slice(0, maxExternalPlugins);
  const skills = unique(plugins.flatMap((plugin) => plugin.skills)).slice(0, maxSkills);
  const allRecommendations = [...plugins, ...external_plugins];
  const policies = unique(allRecommendations.flatMap((plugin) => plugin.policies));
  const commands = unique(plugins.flatMap((plugin) => plugin.commands));
  const risk = allRecommendations.reduce((current, plugin) =>
    RISK_ORDER[plugin.risk] > RISK_ORDER[current] ? plugin.risk : current, "low");

  return {
    schema_version: "1.0",
    prompt: String(prompt || ""),
    plugins,
    external_plugins,
    skills,
    policies,
    commands,
    risk,
    requires_human_review: risk === "high" || external_plugins.some((plugin) => plugin.requires_human_review),
    skill_count: skills.length,
    recommendation_count: allRecommendations.length,
  };
}
