import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Kit root is one level up from mcp-server/src/
export const KIT_ROOT = path.resolve(__dirname, "..", "..");

export const PATHS = {
  skills: path.join(KIT_ROOT, "skills"),
  policies: path.join(KIT_ROOT, "policies"),
  templates: path.join(KIT_ROOT, "templates"),
  patterns: path.join(KIT_ROOT, "patterns"),
  docs: path.join(KIT_ROOT, "docs"),
  src: path.join(KIT_ROOT, "src"),
  scripts: path.join(KIT_ROOT, "scripts"),
  evals: path.join(KIT_ROOT, "evals"),
  global: path.join(KIT_ROOT, "GLOBAL.md"),
} as const;

export const API_URLS = {
  braveSearch: "https://api.search.brave.com/res/v1/web/search",
  firecrawl: "https://api.firecrawl.dev/v1",
  falAi: "https://queue.fal.run",
} as const;

export const DEFAULTS = {
  searchCount: 5,
  maxImages: 10,
  screenshotViewport: { width: 1280, height: 800 },
} as const;
