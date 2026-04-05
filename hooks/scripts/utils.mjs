#!/usr/bin/env node

import { existsSync, readFileSync } from "fs";
import { join } from "path";

export function resolveHookConfigPath() {
  const candidates = [".bot/hooks/config.json", "hooks/config.json"];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

export function readHookConfig(section, defaults = {}) {
  const configPath = resolveHookConfigPath();
  if (!configPath) {
    return { ...defaults };
  }

  try {
    const raw = JSON.parse(readFileSync(configPath, "utf-8"));
    return {
      ...defaults,
      ...(section ? raw[section] || {} : raw),
    };
  } catch {
    return { ...defaults };
  }
}

export function resolveBotPath(...parts) {
  return join(".bot", ...parts);
}
