/**
 * Portabilidade: scripts do kit rodam mesmo quando chamados por um caminho com link simbolico.
 *
 * No macOS o diretorio temporario e /var/... -> /private/var/...; em qualquer sistema, uma pasta de projeto pode ser um link.
 * O Node resolve o link em import.meta.url mas NAO em process.argv[1]; comparar os dois sem realpath faz o script sair em silencio
 * (codigo 0, sem rodar main). Roda com: node --test scripts/tests/main-guard.test.mjs
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("nenhum script compara process.argv[1] com import.meta.url sem resolver links (padrao que sai em silencio)", () => {
  const files = execFileSync("git", ["ls-files", "*.mjs"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
  const unsafe = [];
  for (const f of files) {
    const text = readFileSync(join(root, f), "utf8");
    // a forma segura usa realpath (isMainModule / sameFile); a insegura compara resolve(argv[1]) com o caminho do modulo
    if (/resolve\(process\.argv\[1\]\)\s*===/.test(text)) unsafe.push(f);
  }
  assert.deepEqual(unsafe, [], `use realpath na comparacao (veja isMainModule em scripts/sync-agent-conduct.mjs): ${unsafe.join(", ")}`);
});

test("scripts chamados por um link simbolico para a pasta executam (nao saem em silencio)", () => {
  const dirs = [
    ["scripts", ["sync-agent-conduct.mjs", "svg-icon-lint.mjs", "svg-icon-export.mjs", "eval-plugin-routing.mjs"]],
    [join("skills", "86-code-motion-film", "scripts"), ["beats.mjs", "check-film.mjs", "brief-lint.mjs", "audio-synth.mjs", "prompt-motion.mjs", "render-seek.mjs"]],
    [join("skills", "84-ai-video-direction", "scripts"), ["briefing-qa.mjs"]],
  ];
  const tmp = mkdtempSync(join(tmpdir(), "main-guard-"));
  try {
    let n = 0;
    for (const [dir, scripts] of dirs) {
      const link = join(tmp, `link${n++}`);
      try { symlinkSync(join(root, dir), link, "junction"); } catch { return; } // sem permissao para criar link: nada a provar aqui
      for (const s of scripts) {
        const r = spawnSync(process.execPath, [join(link, s)], { encoding: "utf8", cwd: tmp, timeout: 60000 });
        assert.ok((r.stdout + r.stderr).trim().length > 0, `${dir}/${s} via link nao imprimiu nada (main nao rodou)`);
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
