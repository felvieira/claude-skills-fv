import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  calculatePorts,
  parseArgs,
  initFactory,
  claimNextBacklogItem,
  listJobs,
  reworkJob,
} from "../factory-cli.mjs";

test("calculatePorts: calcula portas determinísticas a partir do ID do job", () => {
  const p1 = calculatePorts("001-rate-limiting");
  assert.equal(p1.jobNum, 1);
  assert.equal(p1.builder, 5110);
  assert.equal(p1.ux, 5111);
  assert.equal(p1.ui, 5112);

  const p3 = calculatePorts("003-auth-flow");
  assert.equal(p3.jobNum, 3);
  assert.equal(p3.builder, 5130);
  assert.equal(p3.ux, 5131);
  assert.equal(p3.ui, 5132);

  const pFallback = calculatePorts("sem-numero");
  assert.equal(pFallback.jobNum, 1);
  assert.equal(pFallback.builder, 5110);
});

test("parseArgs: extrai comandos e flags da CLI", () => {
  const o1 = parseArgs(["status", "--json"]);
  assert.equal(o1.command, "status");
  assert.equal(o1.json, true);

  const o2 = parseArgs(["serve", "--port", "9090"]);
  assert.equal(o2.command, "serve");
  assert.equal(o2.port, 9090);

  const o3 = parseArgs(["rework", "002-feature", "ajustar", "estilo"]);
  assert.equal(o3.command, "rework");
  assert.deepEqual(o3.args, ["002-feature", "ajustar", "estilo"]);
});

test("initFactory: scaffolda estrutura de factory e agentes em diretório alvo", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "factory-test-"));
  try {
    const res = initFactory(tempDir);
    assert.equal(res.ok, true);
    assert.equal(res.agentsInstalled, 7);

    assert.ok(existsSync(join(tempDir, "factory", "backlog.md")));
    assert.ok(existsSync(join(tempDir, "factory", "dashboard.html")));
    assert.ok(existsSync(join(tempDir, "factory", "jobs")));

    const agentsDir = join(tempDir, ".claude", "agents");
    assert.ok(existsSync(join(agentsDir, "spec-writer.md")));
    assert.ok(existsSync(join(agentsDir, "builder.md")));
    assert.ok(existsSync(join(agentsDir, "reviewer-security.md")));
    assert.ok(existsSync(join(agentsDir, "reviewer-code.md")));
    assert.ok(existsSync(join(agentsDir, "reviewer-ui.md")));
    assert.ok(existsSync(join(agentsDir, "reviewer-ux.md")));
    assert.ok(existsSync(join(agentsDir, "approver.md")));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("claimNextBacklogItem: faz claim do primeiro item pendente", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "factory-backlog-"));
  try {
    mkdirSync(join(tempDir, "factory"), { recursive: true });
    const backlog = join(tempDir, "factory", "backlog.md");
    writeFileSync(
      backlog,
      "# Backlog\n\n- [ ] Criar endpoint de health\n- [ ] Segundo item\n",
      "utf8"
    );

    const res = claimNextBacklogItem(tempDir);
    assert.equal(res.ok, true);
    assert.equal(res.item, "Criar endpoint de health");
    assert.match(res.jobId, /^001-criar-endpoint-de-health/);

    const updated = readFileSync(backlog, "utf8");
    assert.ok(updated.includes(`- [x] Criar endpoint de health → ${res.jobId}`));
    assert.ok(updated.includes("- [ ] Segundo item"));

    // Segundo claim
    const res2 = claimNextBacklogItem(tempDir);
    assert.equal(res2.ok, true);
    assert.equal(res2.item, "Segundo item");
    assert.match(res2.jobId, /^002-segundo-item/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("listJobs e reworkJob: lê status e adiciona notas de retrabalho", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "factory-jobs-"));
  try {
    const jobFolder = join(tempDir, "factory", "jobs", "001-demo");
    mkdirSync(jobFolder, { recursive: true });
    const jobJsonPath = join(jobFolder, "job.json");

    writeFileSync(
      jobJsonPath,
      JSON.stringify({
        id: "001-demo",
        feature: "Demo",
        stage: "review",
        round: 1,
        reviews: { security: "CHANGES", code: "PASS", ui: "PASS", ux: "PASS" },
      }),
      "utf8"
    );

    const jobs = listJobs(tempDir);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].id, "001-demo");
    assert.equal(jobs[0].stage, "review");

    const reworkRes = reworkJob("001-demo", "Corrigir injeção de SQL", tempDir);
    assert.equal(reworkRes.ok, true);
    assert.equal(reworkRes.stage, "build");
    assert.equal(reworkRes.reworkFile, "rework-1.md");

    const reworkContent = readFileSync(join(jobFolder, "rework-1.md"), "utf8");
    assert.ok(reworkContent.includes("Corrigir injeção de SQL"));

    const updatedJob = JSON.parse(readFileSync(jobJsonPath, "utf8"));
    assert.equal(updatedJob.stage, "build");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
