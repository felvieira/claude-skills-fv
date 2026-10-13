#!/usr/bin/env node
/**
 * scripts/factory-cli.mjs
 *
 * Gerenciador e utilitário de ciclo de vida da Software Factory (/factory).
 * Zero-dependency (Node stdlib pura: fs, path, child_process, http, url).
 *
 * Subcomandos:
 *   init [--target <dir>]          Scaffolda factory/ e .claude/agents/ a partir de templates
 *   status [--json]                Lista status de todos os jobs da factory
 *   next                           Faz claim do próximo item do factory/backlog.md
 *   port <job-id>                  Calcula as portas determinísticas para o job
 *   approve <job-id>               Executa o merge seguro para main e limpa o worktree
 *   rework <job-id> <nota>         Adiciona nota de retrabalho e move job de volta para build
 *   serve [--port <porta>]         Sobe servidor web local para o dashboard visual
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import http from "node:http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

export function parseArgs(argv = process.argv.slice(2)) {
  const command = argv[0] || "status";
  const options = {
    command,
    args: [],
    json: false,
    port: 8000,
    target: process.cwd(),
  };

  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--port") {
      options.port = Number(argv[++i]) || 8000;
    } else if (arg.startsWith("--port=")) {
      options.port = Number(arg.split("=")[1]) || 8000;
    } else if (arg === "--target") {
      options.target = resolve(argv[++i]);
    } else if (arg.startsWith("--target=")) {
      options.target = resolve(arg.split("=")[1]);
    } else {
      options.args.push(arg);
    }
  }

  return options;
}

export function calculatePorts(jobId) {
  const match = String(jobId).match(/(\d+)/);
  const n = match ? parseInt(match[1], 10) : 1;
  return {
    jobNum: n,
    builder: 5100 + 10 * n,
    ux: 5101 + 10 * n,
    ui: 5102 + 10 * n,
  };
}

export function listJobs(repoRoot = ROOT) {
  const jobsDir = join(repoRoot, "factory", "jobs");
  if (!existsSync(jobsDir)) return [];

  const entries = readdirSync(jobsDir, { withFileTypes: true });
  const jobs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const jsonPath = join(jobsDir, entry.name, "job.json");
    if (existsSync(jsonPath)) {
      try {
        const raw = readFileSync(jsonPath, "utf8");
        const parsed = JSON.parse(raw);
        jobs.push(parsed);
      } catch {
        // Ignora JSON corrompido
      }
    }
  }

  return jobs.sort((a, b) => String(a.id || "").localeCompare(String(b.id || "")));
}

export function claimNextBacklogItem(repoRoot = ROOT) {
  const backlogPath = join(repoRoot, "factory", "backlog.md");
  if (!existsSync(backlogPath)) {
    return { ok: false, error: "factory/backlog.md não encontrado" };
  }

  const content = readFileSync(backlogPath, "utf8");
  const lines = content.split(/\r?\n/);
  let claimedItem = null;
  let lineIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\s*-\s*\[\s*\]\s+(.*)$/);
    if (match) {
      claimedItem = match[1].trim();
      lineIndex = i;
      break;
    }
  }

  if (!claimedItem || lineIndex === -1) {
    return { ok: false, message: "Nenhum item pendente no backlog" };
  }

  const jobs = listJobs(repoRoot);
  let nextNum = 1;
  for (const j of jobs) {
    const m = String(j.id || "").match(/^(\d+)/);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val >= nextNum) nextNum = val + 1;
    }
  }

  for (const l of lines) {
    const m = l.match(/→\s*(\d+)/);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val >= nextNum) nextNum = val + 1;
    }
  }

  const numStr = String(nextNum).padStart(3, "0");
  const slug = claimedItem
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 32) || "feature";
  const jobId = `${numStr}-${slug}`;

  lines[lineIndex] = `- [x] ${claimedItem} → ${jobId}`;
  writeFileSync(backlogPath, lines.join("\n"), "utf8");

  return {
    ok: true,
    item: claimedItem,
    jobId,
    ports: calculatePorts(jobId),
  };
}

export function initFactory(targetDir = process.cwd()) {
  const templateDir = join(ROOT, "templates", "factory");
  if (!existsSync(templateDir)) {
    throw new Error(`Templates não encontrados em ${templateDir}`);
  }

  const factoryDir = join(targetDir, "factory");
  const jobsDir = join(factoryDir, "jobs");
  const claudeAgentsDir = join(targetDir, ".claude", "agents");

  mkdirSync(jobsDir, { recursive: true });
  mkdirSync(claudeAgentsDir, { recursive: true });

  const backlogDest = join(factoryDir, "backlog.md");
  if (!existsSync(backlogDest)) {
    writeFileSync(backlogDest, readFileSync(join(templateDir, "backlog.md")), "utf8");
  }

  const dashboardDest = join(factoryDir, "dashboard.html");
  writeFileSync(dashboardDest, readFileSync(join(templateDir, "dashboard.html")), "utf8");

  const agentsTemplateDir = join(templateDir, "agents");
  if (existsSync(agentsTemplateDir)) {
    const agentFiles = readdirSync(agentsTemplateDir);
    for (const f of agentFiles) {
      if (f.endsWith(".md")) {
        const src = join(agentsTemplateDir, f);
        const dest = join(claudeAgentsDir, f);
        writeFileSync(dest, readFileSync(src));
      }
    }
  }

  return {
    ok: true,
    factoryDir,
    agentsInstalled: 7,
  };
}

export function approveJob(jobId, repoRoot = ROOT) {
  const jobFolder = join(repoRoot, "factory", "jobs", jobId);
  const jsonPath = join(jobFolder, "job.json");

  if (!existsSync(jsonPath)) {
    return { ok: false, error: `Job ${jobId} não encontrado em ${jobFolder}` };
  }

  const job = JSON.parse(readFileSync(jsonPath, "utf8"));
  const branch = job.branch || `factory/${jobId}`;
  const worktree = job.worktree;

  try {
    // 1. Verifica integridade do checkout
    const status = execSync("git status --porcelain -- . ':!factory/backlog.md'", {
      cwd: repoRoot,
      encoding: "utf8",
    }).trim();

    if (status.length > 0) {
      return { ok: false, error: "Checkout principal possui arquivos modificados. Limpe antes de mergear." };
    }

    // 2. Executa merge no branch atual (main)
    execSync(`git merge --no-ff "${branch}" -m "Merge ${branch}"`, {
      cwd: repoRoot,
      stdio: "pipe",
    });

    // 3. Remove worktree e branch se existirem
    if (worktree && existsSync(worktree)) {
      try {
        execSync(`git worktree remove "${worktree}"`, { cwd: repoRoot, stdio: "pipe" });
      } catch (err) {
        // Ignora falha de limpeza se já foi removido
      }
    }

    try {
      execSync(`git branch -d "${branch}"`, { cwd: repoRoot, stdio: "pipe" });
    } catch {
      // Ignora se branch já deletada
    }

    // 4. Atualiza job.json
    job.stage = "merged";
    writeFileSync(jsonPath, JSON.stringify(job, null, 2), "utf8");

    return { ok: true, jobId, stage: "merged" };
  } catch (err) {
    return { ok: false, error: `Falha no merge: ${err.message}` };
  }
}

export function reworkJob(jobId, note, repoRoot = ROOT) {
  const jobFolder = join(repoRoot, "factory", "jobs", jobId);
  const jsonPath = join(jobFolder, "job.json");

  if (!existsSync(jsonPath)) {
    return { ok: false, error: `Job ${jobId} não encontrado em ${jobFolder}` };
  }

  const job = JSON.parse(readFileSync(jsonPath, "utf8"));

  // Encontra o próximo rework-<k>.md
  const files = readdirSync(jobFolder);
  let nextK = 1;
  for (const f of files) {
    const m = f.match(/^rework-(\d+)\.md$/);
    if (m) {
      const val = parseInt(m[1], 10);
      if (val >= nextK) nextK = val + 1;
    }
  }

  const reworkFile = join(jobFolder, `rework-${nextK}.md`);
  writeFileSync(reworkFile, `# Nota de Retrabalho ${nextK}\n\n${note}\n`, "utf8");

  job.stage = "build";
  writeFileSync(jsonPath, JSON.stringify(job, null, 2), "utf8");

  return { ok: true, jobId, reworkFile: `rework-${nextK}.md`, stage: "build" };
}

export function startServer(port = 8000, repoRoot = ROOT) {
  const dashboardPath = join(repoRoot, "factory", "dashboard.html");
  const fallbackDashboard = join(ROOT, "templates", "factory", "dashboard.html");

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    if (url.pathname === "/api/jobs") {
      const jobs = listJobs(repoRoot);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(jobs));
      return;
    }

    if (url.pathname === "/" || url.pathname === "/dashboard.html") {
      const fileToServe = existsSync(dashboardPath) ? dashboardPath : fallbackDashboard;
      if (existsSync(fileToServe)) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(readFileSync(fileToServe));
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Dashboard não encontrado.");
      }
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(port, () => {
    console.log(`🏭 Factory Dashboard rodando em http://localhost:${port}`);
    console.log(`Pressione Ctrl+C para encerrar.`);
  });

  return server;
}

// Execução CLI
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const opts = parseArgs();

  switch (opts.command) {
    case "init": {
      const res = initFactory(opts.target);
      console.log(`✓ Factory inicializada em ${res.factoryDir} (${res.agentsInstalled} agentes configurados em .claude/agents/)`);
      break;
    }
    case "status": {
      const jobs = listJobs(opts.target);
      if (opts.json) {
        console.log(JSON.stringify(jobs, null, 2));
      } else {
        if (jobs.length === 0) {
          console.log("Nenhum job registrado em factory/jobs/.");
        } else {
          console.log(`Dev Team Factory — ${jobs.length} jobs`);
          console.log("=".repeat(64));
          for (const j of jobs) {
            const rev = j.reviews
              ? `[sec:${j.reviews.security || "-"} code:${j.reviews.code || "-"} ui:${j.reviews.ui || "-"} ux:${j.reviews.ux || "-"}]`
              : "";
            console.log(`${j.id.padEnd(24)} ${j.stage.padEnd(12)} r${j.round || 0} ${rev} ${j.feature || ""}`);
          }
        }
      }
      break;
    }
    case "next": {
      const res = claimNextBacklogItem(opts.target);
      if (res.ok) {
        console.log(`✓ Job iniciado: ${res.jobId}`);
        console.log(`  Item: "${res.item}"`);
        console.log(`  Portas: Builder ${res.ports.builder}, UX ${res.ports.ux}, UI ${res.ports.ui}`);
      } else {
        console.log(res.error || res.message);
      }
      break;
    }
    case "port": {
      const id = opts.args[0] || "001";
      const ports = calculatePorts(id);
      console.log(`Job ${id}: Builder ${ports.builder}, UX ${ports.ux}, UI ${ports.ui}`);
      break;
    }
    case "approve": {
      const id = opts.args[0];
      if (!id) {
        console.error("Informe o ID do job: node scripts/factory-cli.mjs approve <job-id>");
        process.exit(1);
      }
      const res = approveJob(id, opts.target);
      if (res.ok) {
        console.log(`✓ Job ${id} aprovado e mergeado para a branch atual com sucesso.`);
      } else {
        console.error(`Erro: ${res.error}`);
        process.exit(1);
      }
      break;
    }
    case "rework": {
      const id = opts.args[0];
      const note = opts.args.slice(1).join(" ");
      if (!id || !note) {
        console.error("Uso: node scripts/factory-cli.mjs rework <job-id> <nota>");
        process.exit(1);
      }
      const res = reworkJob(id, note, opts.target);
      if (res.ok) {
        console.log(`✓ Job ${id} enviado para retrabalho. Nota salva em ${res.reworkFile}.`);
      } else {
        console.error(`Erro: ${res.error}`);
        process.exit(1);
      }
      break;
    }
    case "serve": {
      startServer(opts.port, opts.target);
      break;
    }
    default: {
      console.log(`Comando desconhecido: ${opts.command}`);
      console.log("Comandos válidos: init, status, next, port, approve, rework, serve");
      process.exit(1);
    }
  }
}
