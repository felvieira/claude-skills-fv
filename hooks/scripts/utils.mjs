import { existsSync, readFileSync } from "fs";
import { join } from "path";

export function resolveHookConfigPath() {
  const candidates = [".bot/hooks/config.json", "hooks/config.json"];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

// Module-level cache — hooks are short-lived processes, no staleness risk
let _configCache = null;

function loadFullConfig() {
  if (_configCache !== null) return _configCache;
  const configPath = resolveHookConfigPath();
  if (!configPath) return (_configCache = {});
  try {
    _configCache = JSON.parse(readFileSync(configPath, "utf-8"));
  } catch (err) {
    process.stderr.write(`[utils] Failed to parse config at ${configPath}: ${err.message}\n`);
    _configCache = {};
  }
  return _configCache;
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
