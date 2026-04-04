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

  const [
    rootReadme,
    setupReadme,
    installSh,
    mcpReadme,
    mcpIndex,
    mcpPackageRaw,
    claudeSettingsRaw,
  ] = await Promise.all([
    read("README.md"),
    read("setup/README.md"),
    read("setup/install.sh"),
    read("mcp-server/README.md"),
    read("mcp-server/src/index.ts"),
    read("mcp-server/package.json"),
    read("setup/configs/claude-settings.json"),
  ]);

  const toolCount = (mcpIndex.match(/server\.registerTool\(/g) || []).length;
  const mcpPackage = JSON.parse(mcpPackageRaw);
  const claudeSettings = JSON.parse(claudeSettingsRaw);

  expect(rootReadme.includes(`com ${toolCount} tools`), `README.md should mention ${toolCount} tools`);
  expect(rootReadme.includes(`expoe ${toolCount} tools`) || rootReadme.includes(`expoe ${toolCount} tools apoiadas`), `README.md should describe the MCP as exposing ${toolCount} tools`);
  expect(rootReadme.includes("Na tabela abaixo, considere o `dev-team-kit` como 29 tools apoiadas pelas 32 skills."), "README.md should clarify the dev-team-kit MCP table entry");
  expect(rootReadme.includes("bash .bot/setup/install.sh"), "README.md should document running .bot/setup/install.sh");
  expect(rootReadme.includes("inclui `setup/`"), "README.md should state that setup/ is copied into .bot/");

  expect(setupReadme.includes("bash .bot/setup/install.sh"), "setup/README.md should document running .bot/setup/install.sh");
  expect(setupReadme.includes("dev-team-kit"), "setup/README.md should mention the dev-team-kit MCP");

  expect(mcpReadme.includes(`## Tools (${toolCount})`), `mcp-server/README.md should list ${toolCount} tools`);
  expect(mcpPackage.description.includes(`${toolCount} tools`), "mcp-server/package.json description should mention the tool count");
  expect(mcpPackage.description.includes(`${skillCount} skills`), "mcp-server/package.json description should mention the skill count");
  expect(mcpIndex.includes("resolveConsumerProjectRoot(project_path)"), "smart suggestions should resolve the consumer project root");

  const knowledgeMatch = mcpReadme.match(/### Knowledge \((\d+)\)/);
  const executionMatch = mcpReadme.match(/### Execution \((\d+)\)/);
  const persistenceMatch = mcpReadme.match(/### Persistence \((\d+)\)/);
  expect(Boolean(knowledgeMatch && executionMatch && persistenceMatch), "mcp-server/README.md should declare section counts");
  if (knowledgeMatch && executionMatch && persistenceMatch) {
    const documentedCount =
      Number(knowledgeMatch[1]) + Number(executionMatch[1]) + Number(persistenceMatch[1]);
    expect(documentedCount === toolCount, `mcp-server/README.md section counts should sum to ${toolCount}`);
  }

  expect(/for dir in .*setup.*mcp-server/.test(installSh), "setup/install.sh should copy setup/ into .bot/");
  expect(installSh.includes("register_claude_hooks()"), "setup/install.sh should define register_claude_hooks()");
  expect(installSh.includes("register_claude_hooks"), "setup/install.sh should call register_claude_hooks");
  expect(installSh.includes(".env.local"), "setup/install.sh should protect .env.local");

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

  if (failures.length > 0) {
    console.error("Consistency check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log(`Consistency check passed (${skillCount} skills, ${toolCount} tools).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
