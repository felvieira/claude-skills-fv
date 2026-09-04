import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";

/**
 * True when the ai-memory backend (github.com/akitaonrails/ai-memory) is the
 * active memory system for this machine — set by scripts/ai-memory-setup.mjs
 * during install. When active, the kit's native vault hooks (memory-curator,
 * session-start's vault-log injection) defer to it instead of running in
 * parallel, so the two systems never write/curate the same history twice.
 */
export function isAiMemoryActive() {
  const markerPath = join(homedir(), ".dev-team-kit", "memory-backend.json");
  if (!existsSync(markerPath)) return false;
  try {
    const marker = JSON.parse(readFileSync(markerPath, "utf-8"));
    return marker.backend === "ai-memory";
  } catch {
    return false;
  }
}

export function resolveHookConfigPath() {
  const candidates = [".bot/hooks/config.json", "hooks/config.json"];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

// User-level override — applies across all projects. Sobrescreve repo-level config.
// Path: ~/.claude/dev-team-kit-config.json
export function resolveUserConfigPath() {
  const userPath = join(homedir(), ".claude", "dev-team-kit-config.json");
  return existsSync(userPath) ? userPath : null;
}

// Module-level cache — hooks are short-lived processes, no staleness risk
let _configCache = null;

function loadFullConfig() {
  if (_configCache !== null) return _configCache;

  // 1. Carregar config base do repo/instalação
  const repoConfigPath = resolveHookConfigPath();
  let repoConfig = {};
  if (repoConfigPath) {
    try {
      repoConfig = JSON.parse(readFileSync(repoConfigPath, "utf-8"));
    } catch (err) {
      process.stderr.write(`[utils] Failed to parse repo config at ${repoConfigPath}: ${err.message}\n`);
    }
  }

  // 2. Mergir user override por cima (cada seção é merged shallow)
  const userConfigPath = resolveUserConfigPath();
  if (userConfigPath) {
    try {
      const userConfig = JSON.parse(readFileSync(userConfigPath, "utf-8"));
      // Shallow merge — user override sobrescreve seções do repo
      _configCache = { ...repoConfig };
      for (const [section, sectionConfig] of Object.entries(userConfig)) {
        if (typeof sectionConfig === "object" && sectionConfig !== null && !Array.isArray(sectionConfig)) {
          _configCache[section] = { ...(repoConfig[section] || {}), ...sectionConfig };
        } else {
          _configCache[section] = sectionConfig;
        }
      }
      return _configCache;
    } catch (err) {
      process.stderr.write(`[utils] Failed to parse user config at ${userConfigPath}: ${err.message}\n`);
    }
  }

  return (_configCache = repoConfig);
}

// Internal helper — accepts already-loaded config to avoid redundant loads
function _getActiveProfile(cfg) {
  const envProfile = process.env.DEVKIT_HOOK_PROFILE;
  if (envProfile) return envProfile;
  return cfg.hook_profiles?.active || "standard";
}

/**
 * Returns the active profile name.
 * Precedence: DEVKIT_HOOK_PROFILE env var → config.hook_profiles.active → "standard"
 */
export function getActiveProfile() {
  return _getActiveProfile(loadFullConfig());
}

/**
 * Returns true if the given hookId is disabled.
 * Disabled sources (union): DEVKIT_DISABLED_HOOKS env var + active profile's disabled list.
 */
export function isHookDisabled(hookId) {
  const envDisabled = (process.env.DEVKIT_DISABLED_HOOKS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (envDisabled.includes(hookId)) return true;

  const cfg = loadFullConfig();
  const profile = _getActiveProfile(cfg);
  const profileConfig = cfg.hook_profiles?.profiles?.[profile];

  if (!profileConfig && cfg.hook_profiles?.profiles) {
    process.stderr.write(
      `[utils] Profile "${profile}" not found. Available: ${Object.keys(cfg.hook_profiles.profiles).join(", ")}. Treating all hooks as enabled.\n`
    );
  }

  return (profileConfig?.disabled || []).includes(hookId);
}

/**
 * Returns profile-specific overrides for a config section (or {} if none).
 */
export function getProfileOverrides(section) {
  const cfg = loadFullConfig();
  const profile = _getActiveProfile(cfg);
  return cfg.hook_profiles?.profiles?.[profile]?.overrides?.[section] || {};
}

/**
 * Reads config section merged with defaults and profile overrides.
 * Merge order: defaults → config section → profile overrides (overrides win).
 */
export function readHookConfig(section, defaults = {}) {
  const cfg = loadFullConfig();
  const sectionData = section ? cfg[section] || {} : cfg;
  const overrides = getProfileOverrides(section);
  return { ...defaults, ...sectionData, ...overrides };
}

/**
 * Resolves a path under .bot/ relative to cwd (expected to be project root).
 */
export function resolveBotPath(...parts) {
  return join(".bot", ...parts);
}
