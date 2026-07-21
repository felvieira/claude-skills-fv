#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function read(relPath) {
  return fs.readFile(path.join(root, relPath), "utf8");
}

async function main() {
  const skillEntries = await fs.readdir(path.join(root, "skills"), { withFileTypes: true });
  const skillCount = skillEntries.filter((entry) => entry.isDirectory()).length;

  // Agents live in agents/ (plugin autodiscovery) since v1.5.2
  const agentDir = path.join(root, "agents");
  let agentCount = 0;
  try {
    const agentEntries = await fs.readdir(agentDir, { withFileTypes: true });
    agentCount = agentEntries.filter((e) => e.isFile() && e.name.endsWith(".md")).length;
  } catch {
    // agents/ not found — agentCount stays 0
  }

  const [
    rootReadme,
    setupReadme,
    installSh,
    mcpReadme,
    mcpIndex,
    mcpPackageRaw,
    claudeSettingsRaw,
    preExecutionGate,
    contextGuard,
    keywordDetector,
  ] = await Promise.all([
    read("README.md"),
    read("setup/README.md"),
    read("setup/install.sh"),
    read("mcp-server/README.md"),
    read("mcp-server/src/index.ts"),
    read("mcp-server/package.json"),
    read("setup/configs/claude-settings.json"),
    read("hooks/scripts/pre-execution-gate.mjs"),
    read("hooks/scripts/context-guard-stop.mjs"),
    read("hooks/scripts/keyword-detector.mjs"),
  ]);

  const toolCount = (mcpIndex.match(/server\.registerTool\(/g) || []).length;
  const mcpPackage = JSON.parse(mcpPackageRaw);
  const claudeSettings = JSON.parse(claudeSettingsRaw);

  expect(rootReadme.includes(`${toolCount} tools exposed`), `README.md should mention ${toolCount} tools`);
  expect(rootReadme.includes(`The MCP exposes ${toolCount} tools`), `README.md should describe the MCP as exposing ${toolCount} tools`);
  expect(rootReadme.includes(`treat \`dev-team-kit\` as ${toolCount} tools backed by the ${skillCount} skills`), "README.md should clarify the dev-team-kit MCP table entry");
  expect(rootReadme.includes("bash .bot/setup/install.sh"), "README.md should document running .bot/setup/install.sh");
  expect(rootReadme.includes("The installer ships `setup/`"), "README.md should state that setup/ is copied into .bot/");
  expect(rootReadme.includes("--profile lean") && rootReadme.includes("--no-input"), "README.md should document non-interactive setup profiles");

  expect(setupReadme.includes("bash .bot/setup/install.sh"), "setup/README.md should document running .bot/setup/install.sh");
  expect(setupReadme.includes("dev-team-kit"), "setup/README.md should mention the dev-team-kit MCP");
  expect(setupReadme.includes("--profile lean") && setupReadme.includes("--yes"), "setup/README.md should document installer profile flags");

  expect(mcpReadme.includes(`## Tools (${toolCount})`), `mcp-server/README.md should list ${toolCount} tools`);
  expect(mcpPackage.description.includes(`${toolCount} tools`), "mcp-server/package.json description should mention the tool count");
  expect(mcpPackage.description.includes(`${skillCount} skills`), "mcp-server/package.json description should mention the skill count");
  expect(mcpIndex.includes("resolveConsumerProjectRoot(project_path)"), "smart suggestions should resolve the consumer project root");
  expect(preExecutionGate.includes("readHookConfig("), "pre-execution-gate should load config through the shared hook helper");
  expect(contextGuard.includes("readHookConfig("), "context-guard should load config through the shared hook helper");
  expect(keywordDetector.includes("summary:"), "keyword-detector should store a summarized learned-skill payload");
  expect(!keywordDetector.includes("learnedSkill.content"), "keyword-detector should not inject full learned-skill content");
  expect(mcpIndex.includes("bytes_read"), "track_cost telemetry should include bytes_read");
  expect(mcpIndex.includes("large_read_count"), "track_cost telemetry should include large_read_count");

  const knowledgeMatch = mcpReadme.match(/### Knowledge \((\d+)\)/);
  const executionMatch = mcpReadme.match(/### Execution \((\d+)\)/);
  const persistenceMatch = mcpReadme.match(/### Persistence \((\d+)\)/);
  const sessionMatch = mcpReadme.match(/### Session Intelligence \((\d+)\)/);
  expect(Boolean(knowledgeMatch && executionMatch && persistenceMatch), "mcp-server/README.md should declare section counts");
  if (knowledgeMatch && executionMatch && persistenceMatch) {
    const documentedCount =
      Number(knowledgeMatch[1]) + Number(executionMatch[1]) + Number(persistenceMatch[1]) + Number(sessionMatch?.[1] ?? 0);
    expect(documentedCount === toolCount, `mcp-server/README.md section counts should sum to ${toolCount}`);
  }

  expect(/for dir in .*setup.*mcp-server/.test(installSh), "setup/install.sh should copy setup/ into .bot/");
  expect(installSh.includes("register_claude_hooks()"), "setup/install.sh should define register_claude_hooks()");
  expect(installSh.includes("register_claude_hooks"), "setup/install.sh should call register_claude_hooks");
  expect(installSh.includes(".env.local"), "setup/install.sh should protect .env.local");
  expect(installSh.includes("--profile") && installSh.includes("--no-input") && installSh.includes("--yes"), "setup/install.sh should support non-interactive profile flags");

  const createdClaudeConfigIndex = installSh.indexOf('ok "Created .claude/settings.json"');
  const hookCallIndex = installSh.lastIndexOf("register_claude_hooks");
  expect(createdClaudeConfigIndex !== -1, "setup/install.sh should create .claude/settings.json when missing");
  expect(hookCallIndex > createdClaudeConfigIndex, "setup/install.sh should register hooks after creating/merging .claude/settings.json");

  const devTeamKit = claudeSettings.mcpServers?.["dev-team-kit"];
  expect(Boolean(devTeamKit), "setup/configs/claude-settings.json should include dev-team-kit");
  if (devTeamKit) {
    expect(devTeamKit.command === "node", "dev-team-kit MCP should run with node");
    expect(Array.isArray(devTeamKit.args) && devTeamKit.args[0] === ".bot/mcp-server/dist/index.js", "dev-team-kit MCP should point to .bot/mcp-server/dist/index.js");
    expect(devTeamKit.disabled === false, "dev-team-kit MCP should be enabled by default");
  }

  // Plugin uses Claude Code 2.x autodiscovery — verify expected dirs exist
  try {
    const pluginRaw = await read(".claude-plugin/plugin.json");
    JSON.parse(pluginRaw); // valid JSON
  } catch {
    expect(false, "Could not read or parse .claude-plugin/plugin.json");
  }

  // marketplace.json exists for `claude plugin marketplace add felvieira/claude-skills-fv`
  try {
    const mpRaw = await read(".claude-plugin/marketplace.json");
    const mp = JSON.parse(mpRaw);
    expect(Array.isArray(mp.plugins) && mp.plugins.length >= 1, "marketplace.json should declare plugins[]");
  } catch {
    expect(false, "Could not read or parse .claude-plugin/marketplace.json");
  }

  // hooks/hooks.json must be in Claude Code 2.x format (wrapped in { hooks: {...} })
  try {
    const hooksRaw = await read("hooks/hooks.json");
    const hooksJson = JSON.parse(hooksRaw);
    expect(Boolean(hooksJson.hooks), "hooks/hooks.json must wrap events under a 'hooks' key (Claude Code 2.x format)");
  } catch {
    // optional
  }

  // Check: spec-driven commands exist as files in commands/ (where plugin autodiscovers them)
  for (const cmd of ["constitution", "analyze", "checklist", "humanize", "consolidate-memory", "run-program", "doctor"]) {
    try {
      await fs.access(path.join(root, "commands", `${cmd}.md`));
    } catch {
      expect(false, `commands/${cmd}.md must exist (autodiscovered by plugin)`);
    }
  }

  // Check: programs/*.yml are valid (since v1.6.0)
  try {
    const programsDir = path.join(root, "programs");
    const ymlFiles = (await fs.readdir(programsDir)).filter(f => f.endsWith(".yml"));
    expect(ymlFiles.length >= 1, "programs/ must contain at least one .yml program");
    // Each .yml should have a corresponding .md descriptive file
    for (const yml of ymlFiles) {
      const mdPath = yml.replace(/\.yml$/, ".md");
      try {
        await fs.access(path.join(programsDir, mdPath));
      } catch {
        expect(false, `programs/${yml} should have a matching descriptive ${mdPath}`);
      }
    }
  } catch (e) {
    if (e.message && !e.message.includes("expect")) {
      // programs/ may not exist in some setups — skip silently
    }
  }

  // Constitution must be referenced by orchestrator + reviewer (primary anchors)
  try {
    const orchestrator = await read("skills/09-orchestrator/SKILL.md");
    const reviewer = await read("skills/11-reviewer/SKILL.md");
    expect(orchestrator.includes("constitution"), "skills/09-orchestrator should reference constitution");
    expect(reviewer.includes("constitution"), "skills/11-reviewer should reference constitution");
  } catch {
    expect(false, "Could not read orchestrator/reviewer skill files");
  }

  // Check: schemas/skill-io/ files are valid JSON
  const schemaDir = path.join(root, "schemas", "skill-io");
  try {
    const schemaFiles = (await fs.readdir(schemaDir)).filter(f => f.endsWith(".json") && !f.startsWith("_"));
    for (const f of schemaFiles) {
      try {
        JSON.parse(await fs.readFile(path.join(schemaDir, f), "utf8"));
      } catch (e) {
        expect(false, `schemas/skill-io/${f}: invalid JSON — ${e.message}`);
      }
    }
  } catch {
    // schemas/skill-io/ doesn't exist yet — skip
  }

  // Skill quality gate (v2.12.0+)
  // Roda scripts/skill-quality-score.mjs com gate >= 20/30 (rubrica programatica:
  // frontmatter, estrutura, tamanho, anti-AI tells, atribuicao). Substitui a
  // rubrica manual antes descrita na skill 35-skill-author.
  try {
    const { execSync } = await import("node:child_process");
    execSync("node scripts/skill-quality-score.mjs --json --min 20", {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    // se chegou aqui, todas as skills >= 20/30 — passa
  } catch {
    failures.push("scripts/skill-quality-score.mjs --min 20 failed: alguma skill abaixo de 20/30");
  }

  // Trigger eval gate (v2.12.1+) — soft warning, nao bloqueia consistency.
  // Roda scripts/eval-triggers.mjs em modo strict (exit 1 se algum FAIL).
  // Apenas printa warning — nao adiciona em failures — para evitar bloquear PRs
  // por triggers ainda em iteracao. Use `node scripts/eval-triggers.mjs --strict`
  // diretamente no pipeline de release se quiser bloquear.
  try {
    const { execSync } = await import("node:child_process");
    execSync("node scripts/eval-triggers.mjs --json --strict", {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    console.warn(
      "WARN: scripts/eval-triggers.mjs --strict failed — algum trigger fixture " +
        "abaixo do threshold. Rode `node scripts/eval-triggers.mjs` pra ver detalhe.",
    );
  }

  // Plugin catalog: a missing skill reference would make automatic composition
  // suggest an unavailable capability, so validate it in the main consistency gate.
  try {
    const { execSync } = await import("node:child_process");
    execSync("node scripts/validate-plugin-catalog.mjs", {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    execSync("node scripts/eval-plugin-routing.mjs --strict", {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    execSync("node scripts/tests/route-feedback.mjs", {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    failures.push("plugin catalog validation, routing eval, or routing feedback test failed");
  }

  if (failures.length > 0) {
    console.error("Consistency check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Consistency check passed (${skillCount} skills, ${toolCount} tools, ${agentCount} agents).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
