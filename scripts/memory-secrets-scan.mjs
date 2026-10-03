#!/usr/bin/env node
/**
 * memory-secrets-scan — quais transcritos de agente carregam credenciais.
 *
 * Transcritos (~/.claude/projects/**.jsonl, ~/.codex/sessions) guardam tudo o
 * que passou pela sessao, inclusive chave colada no chat ou impressa por um
 * `cat .env`. Qualquer busca/indexacao em cima deles herda o segredo. Este
 * script LISTA onde estao — tipo e quantidade, nunca o valor — e, so com
 * --scrub, reescreve os arquivos trocando cada segredo por [redacted:<tipo>].
 *
 * Le em streaming linha a linha (transcritos passam de 500 MB) e um erro em um
 * arquivo nao aborta a varredura.
 *
 * Uso:
 *   node scripts/memory-secrets-scan.mjs                   # diretorios padrao
 *   node scripts/memory-secrets-scan.mjs --root <dir>      # repetivel
 *   node scripts/memory-secrets-scan.mjs --since-days=30   # so arquivos recentes
 *   node scripts/memory-secrets-scan.mjs --json
 *   node scripts/memory-secrets-scan.mjs --scrub           # grava <arquivo>.pre-scrub ao lado
 *
 * Reconhecimento por formato nao e deteccao de segredo: formato desconhecido passa.
 * Rotacione a credencial — apagar o rastro nao desfaz o vazamento.
 */
import { copyFileSync, createReadStream, createWriteStream, existsSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { once } from "node:events";
import { redactSecrets } from "../hooks/scripts/memory-lib.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.split("=")[1] : fallback;
};
const roots = [];
for (let i = 0; i < args.length; i++) if (args[i] === "--root" && args[i + 1]) roots.push(args[++i]);
const AS_JSON = flag("--json");
const SCRUB = flag("--scrub");
const MIN_AGE_MIN = Number(opt("--min-age-min", 20));
const SINCE_DAYS = opt("--since-days", null) === null ? null : Number(opt("--since-days"));

const defaultRoots = [join(homedir(), ".claude", "projects"), join(homedir(), ".codex", "sessions")];
const scanRoots = (roots.length ? roots : defaultRoots).filter((r) => existsSync(r));

// Pre-filtro barato: linha sem nenhuma destas pistas nao pode ter achado, entao
// nem paga o JSON.parse. Deve ser sempre mais frouxo que as regras de memory-lib.
const CHEAP_HINT = /AIza|sk-|AKIA|ASIA|eyJ|gh[pousr]_|github_pat_|xox[abprs]-|[rs]k_live_|Bearer|PRIVATE KEY|:\/\/|api[_-]?key|secret|token|passw/i;

function* walk(dir) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && e.name.endsWith(".jsonl")) yield full;
  }
}

function mapStrings(value, fn) {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, fn)]));
  }
  return value;
}

const mergeHits = (into, hits) => { for (const [k, n] of Object.entries(hits)) into[k] = (into[k] || 0) + n; };

async function processFile(file, scrub) {
  const hits = {};
  let changed = false;
  const tmpFile = scrub ? `${file}.scrub-tmp` : null;
  const out = scrub ? createWriteStream(tmpFile, { encoding: "utf8" }) : null;
  const write = async (text) => { if (out && !out.write(text)) await once(out, "drain"); };

  try {
    const rl = createInterface({ input: createReadStream(file, { encoding: "utf8" }), crlfDelay: Infinity });
    for await (const line of rl) {
      let next = line;
      if (line.trim() && CHEAP_HINT.test(line)) {
        let parsed;
        try { parsed = JSON.parse(line); } catch { parsed = undefined; }
        if (parsed === undefined) {
          mergeHits(hits, redactSecrets(line).hits); // linha invalida: conta, mas nao reescreve
        } else {
          let lineChanged = false;
          const redacted = mapStrings(parsed, (s) => {
            const r = redactSecrets(s);
            if (r.text !== s) { mergeHits(hits, r.hits); lineChanged = true; }
            return r.text;
          });
          if (lineChanged) { changed = true; next = JSON.stringify(redacted); }
        }
      }
      await write(`${next}\n`);
    }
    if (out) { out.end(); await once(out, "close"); }
    if (scrub && changed) {
      copyFileSync(file, `${file}.pre-scrub`);
      renameSync(tmpFile, file);
    } else if (tmpFile) {
      rmSync(tmpFile, { force: true });
    }
    return { hits, changed };
  } catch (error) {
    if (out) { out.destroy(); rmSync(tmpFile, { force: true }); }
    return { hits, changed: false, error: error.code || error.message };
  }
}

const report = [];
const skipped = [];
const failed = [];
let scanned = 0;
const now = Date.now();

for (const root of scanRoots) {
  for (const file of walk(root)) {
    let st;
    try { st = statSync(file); } catch { continue; }
    const ageMin = (now - st.mtimeMs) / 60000;
    if (SINCE_DAYS !== null && ageMin > SINCE_DAYS * 1440) continue;
    if (SCRUB && ageMin < MIN_AGE_MIN) { skipped.push(file); continue; } // sessao provavelmente ativa
    scanned++;
    const { hits, changed, error } = await processFile(file, SCRUB);
    if (error) failed.push({ file, error });
    const total = Object.values(hits).reduce((a, b) => a + b, 0);
    if (total > 0) report.push({ file, total, kinds: hits, scrubbed: SCRUB && changed });
  }
}
report.sort((a, b) => b.total - a.total);

const summary = {
  roots: scanRoots,
  files_scanned: scanned,
  sessions_with_secrets: report.length,
  total_findings: report.reduce((a, r) => a + r.total, 0),
  scrubbed: SCRUB,
  skipped_recent: skipped.length,
  failed,
  files: report,
};

if (AS_JSON) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  if (!scanRoots.length) console.log("Nenhum diretorio de transcritos encontrado.");
  console.log(`Arquivos varridos: ${scanned}. Sessoes com credenciais: ${summary.sessions_with_secrets} (${summary.total_findings} ocorrencias)`);
  for (const r of report.slice(0, 40)) {
    const kinds = Object.entries(r.kinds).map(([k, n]) => `${k}x${n}`).join(", ");
    console.log(`  ${r.scrubbed ? "[limpo] " : ""}${r.file}\n    ${kinds}`);
  }
  if (report.length > 40) console.log(`  ... +${report.length - 40} arquivo(s); use --json para a lista completa`);
  if (skipped.length) console.log(`Pulados por serem recentes (<${MIN_AGE_MIN} min, possivelmente ativos): ${skipped.length}`);
  if (failed.length) console.log(`Falharam (lidos parcialmente, nada reescrito): ${failed.length} — ${failed.slice(0, 3).map((f) => f.error).join(", ")}`);
  if (report.length) {
    console.log("\nRotacione as credenciais listadas: limpar o transcrito nao desfaz o vazamento.");
    if (!SCRUB) console.log("Para trocar cada valor por [redacted:<tipo>] (mantem <arquivo>.pre-scrub ao lado): --scrub");
    if (SCRUB) console.log("Os arquivos .pre-scrub ainda contem os valores originais: apague-os depois de rotacionar.");
  }
}
