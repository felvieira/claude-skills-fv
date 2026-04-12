#!/usr/bin/env node

import { existsSync, readFileSync } from "fs";
import { join } from "path";

export function resolveHookConfigPath() {
  const candidates = [".bot/hooks/config.json", "hooks/config.json"];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function loadFullConfig() {
  const configPath = resolveHookConfigPath();
  if (!configPath) return {};
  try {
    return JSON.parse(readFileSync(configPath, "utf-8"));
  } catch {
    return {};
  }
}

export function getActiveProfile() {
  const envProfile = process.env.DEVKIT_HOOK_PROFILE;
  if (envProfile) return envProfile;
  const cfg = loadFullConfig();
  return cfg.hook_profiles?.active || "standard";
}

export function isHookDisabled(hookId) {
  // Env var list (comma-separated) UNION profile disabled list — both apply
  const envDisabled = (process.env.DEVKIT_DISABLED_HOOKS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (envDisabled.includes(hookId)) return true;

  const cfg = loadFullConfig();
  const profile = getActiveProfile();
  const profileDisabled = cfg.hook_profiles?.profiles?.[profile]?.disabled || [];
  return profileDisabled.includes(hookId);
}

export function getProfileOverrides(section) {
  const cfg = loadFullConfig();
  const profile = getActiveProfile();
  return cfg.hook_profiles?.profiles?.[profile]?.overrides?.[section] || {};
}

export function readHookConfig(section, defaults = {}) {
  const cfg = loadFullConfig();
  const sectionData = section ? cfg[section] || {} : cfg;
  const overrides = getProfileOverrides(section);
  return { ...defaults, ...sectionData, ...overrides };
}

export function resolveBotPath(...parts) {
  return join(".bot", ...parts);
}
