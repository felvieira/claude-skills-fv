import fs from "fs/promises";
import path from "path";
import { KIT_ROOT } from "../constants.js";

type Risk = "low" | "medium" | "high";

interface CapabilityManifest {
  id: string;
  when_any: string[];
  when_all?: string[];
  when_none?: string[];
  skills?: string[];
  commands?: string[];
}

interface PluginManifest {
  schema_version: "1.0";
  id: string;
  name: string;
  description: string;
  availability?: "bundled" | "external";
  risk: Risk;
  requires_human_review?: boolean;
  install?: { provider: string; reference: string; action?: string };
  policies?: string[];
  capabilities: CapabilityManifest[];
}

export interface PluginRecommendation {
  id: string;
  name: string;
  description: string;
  risk: Risk;
  score: number;
  skills: string[];
  policies: string[];
  commands: string[];
  matched_capabilities: string[];
  install?: { provider: string; reference: string; action?: string };
  requires_human_review: boolean;
}

export interface PluginRoute {
  schema_version: "1.0";
  plugins: PluginRecommendation[];
  external_plugins: PluginRecommendation[];
  skills: string[];
  policies: string[];
  commands: string[];
  risk: Risk;
  requires_human_review: boolean;
}

export interface PluginCatalogEntry {
  id: string;
  name: string;
  description: string;
  availability: "bundled" | "external";
  risk: Risk;
  requires_human_review: boolean;
  install?: { provider: string; reference: string; action?: string };
  capabilities: Array<{ id: string; skills: string[] }>;
}

const RISK_ORDER: Record<Risk, number> = { low: 0, medium: 1, high: 2 };

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function phraseScore(text: string, phrases: string[]): number {
  return unique(phrases.map(normalize).filter(Boolean))
    .filter((phrase) => text.includes(phrase))
    .reduce((total, phrase) => total + phrase.split(" ").length, 0);
}

async function loadCatalog(): Promise<PluginManifest[]> {
  const catalogDir = path.join(KIT_ROOT, "plugins", "catalog");
  const entries = await fs.readdir(catalogDir, { withFileTypes: true });
  return Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(async (entry) => JSON.parse(await fs.readFile(path.join(catalogDir, entry.name), "utf8")) as PluginManifest));
}

export async function listPluginCatalog(): Promise<PluginCatalogEntry[]> {
  const manifests = await loadCatalog();
  return manifests.map((manifest) => ({
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
    availability: manifest.availability || "bundled",
    risk: manifest.risk,
    requires_human_review: Boolean(manifest.requires_human_review) || manifest.risk === "high",
    install: manifest.availability === "external" ? manifest.install : undefined,
    capabilities: manifest.capabilities.map((capability) => ({
      id: capability.id,
      skills: capability.skills || [],
    })),
  }));
}

export async function routePluginComposition(
  description: string,
  options: { maxPlugins?: number; maxSkills?: number; maxExternalPlugins?: number } = {},
): Promise<PluginRoute> {
  const text = normalize(description);
  const manifests = await loadCatalog();
  const bundled: PluginRecommendation[] = [];
  const external: PluginRecommendation[] = [];

  for (const manifest of manifests) {
    const matches = manifest.capabilities
      .map((capability) => {
        if (capability.when_none?.some((phrase) => text.includes(normalize(phrase)))) return null;
        const score = phraseScore(text, capability.when_any || []);
        const allRequired = (capability.when_all || []).every((phrase) => text.includes(normalize(phrase)));
        return score > 0 && allRequired ? { capability, score } : null;
      })
      .filter((match): match is { capability: CapabilityManifest; score: number } => match !== null);
    if (matches.length === 0) continue;

    const recommendation: PluginRecommendation = {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      risk: manifest.risk,
      score: matches.reduce((total, match) => total + match.score, 0),
      skills: unique(matches.flatMap((match) => match.capability.skills || [])),
      policies: unique(manifest.policies || []),
      commands: unique(matches.flatMap((match) => match.capability.commands || [])),
      matched_capabilities: matches.map((match) => match.capability.id),
      install: manifest.availability === "external" ? manifest.install : undefined,
      requires_human_review: Boolean(manifest.requires_human_review),
    };
    (manifest.availability === "external" ? external : bundled).push(recommendation);
  }

  const sortByScore = (a: PluginRecommendation, b: PluginRecommendation) => b.score - a.score || a.id.localeCompare(b.id);
  bundled.sort(sortByScore);
  external.sort(sortByScore);
  const plugins = bundled.slice(0, options.maxPlugins ?? 3);
  const external_plugins = external.slice(0, options.maxExternalPlugins ?? 1);
  const all = [...plugins, ...external_plugins];
  const risk = all.reduce<Risk>((current, plugin) => RISK_ORDER[plugin.risk] > RISK_ORDER[current] ? plugin.risk : current, "low");

  return {
    schema_version: "1.0",
    plugins,
    external_plugins,
    skills: unique(plugins.flatMap((plugin) => plugin.skills)).slice(0, options.maxSkills ?? 6),
    policies: unique(all.flatMap((plugin) => plugin.policies)),
    commands: unique(plugins.flatMap((plugin) => plugin.commands)),
    risk,
    requires_human_review: risk === "high" || external_plugins.some((plugin) => plugin.requires_human_review),
  };
}
