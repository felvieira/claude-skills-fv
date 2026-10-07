#!/usr/bin/env node
/**
 * prompt-motion — biblioteca LOCAL e privada dos prompts/skills da galeria https://prompt-motion.com/ para estudo e reproducao.
 *
 * Por que local e fora do repo: o rodape da galeria diz "Videos and prompts belong to their creators". Os textos ficam em
 * ~/.dev-team-kit/prompt-motion/ (ou DEVKIT_PM_DIR) — NUNCA dentro do kit/repositorio, para nao serem redistribuidos num repo
 * publico. O que vai para o repo e o PADRAO destilado (references/PADRAO.md) e um indice com link e atribuicao.
 *
 *   node prompt-motion.mjs sync [--limit N] [--concurrency 3] [--delay 400]   # baixa os textos (nao baixa videos)
 *   node prompt-motion.mjs stats                                              # numeros agregados da biblioteca
 *   node prompt-motion.mjs analyze                                            # camadas T0-T3, tecnica, estilo, estrutura (reproduzivel)
 *   node prompt-motion.mjs tier [--tier T2] [--limit 15]                      # lista por camada
 *   node prompt-motion.mjs search <termo>... [--kind prompt|skill] [--limit 10]
 *   node prompt-motion.mjs show <slug>                                        # um prompt completo (uso pessoal)
 *   node prompt-motion.mjs index [--out indice.md]                            # indice com links e atribuicao (sem os textos)
 *
 * Educado com o site: poucas conexoes, pausa entre paginas, so HTML (bloqueia imagem/video/fonte), um unico `sync` por vez.
 * Requer o doctor da skill 86 (Playwright + Chromium): node doctor.mjs --install
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findPlaywright } from "./deps.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SITE = "https://prompt-motion.com";
export const libDir = () => resolve(process.env.DEVKIT_PM_DIR || join(homedir(), ".dev-team-kit", "prompt-motion"));
const libFile = () => join(libDir(), "library.json");

export function loadLibrary() {
  if (!existsSync(libFile())) return { synced_at: null, source: SITE, entries: [] };
  return JSON.parse(readFileSync(libFile(), "utf8").replace(/^﻿/, ""));
}

function saveLibrary(lib) {
  mkdirSync(libDir(), { recursive: true });
  const tmp = `${libFile()}.tmp`;
  writeFileSync(tmp, JSON.stringify(lib, null, 2));
  renameSync(tmp, libFile());
  writeFileSync(join(libDir(), "README.txt"), `Biblioteca local gerada por prompt-motion.mjs a partir de ${SITE}.\nOs prompts e videos pertencem aos criadores (ver o link da publicacao de cada entrada). Uso pessoal; nao redistribuir.\nNao esta dentro de nenhum repositorio de proposito.\n`);
}

// -------------------------------------------------------------------------- parse
const clean = (s) => String(s || "").replace(/\r/g, "").trim();

/** Extrai os campos de uma pagina de entrada a partir do innerText do <main> + dados do DOM. */
export function parseEntry(slug, dom) {
  const text = clean(dom.text);
  const kind = /\nSkill\n/.test(text) && !/\nPrompt\n/.test(text.split("\n\nModel")[0] || "") ? "skill" : "prompt";
  const after = text.split(/\n(?:Prompt|Skill)\n(?:Copy\n)?/)[1] ?? "";
  const body = clean(after.split(/\n\n(?:This (?:prompt|skill)|Model\n|Effort\n|Posted\n)/)[0]);
  const field = (name) => (text.match(new RegExp(`\\n${name}\\n([^\\n]+)`)) || [])[1]?.trim() || null;
  const x = (dom.links || []).find((l) => /x\.com\/[^/]+\/status\//.test(l[1]))?.[1] || null;
  const handle = x ? x.match(/x\.com\/([^/]+)\//)?.[1] : null;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  // nome do criador = linha logo antes da linha "@handle" (com as imagens bloqueadas aparece antes a inicial do avatar, 1 letra)
  const at = lines.findIndex((l) => /^@\w+/.test(l));
  const nameLine = at > 0 ? lines[at - 1] : null;
  return {
    slug,
    url: `${SITE}/${slug}`,
    title: clean(dom.title) || slug,
    creator: nameLine && nameLine.length > 1 && !/^all videos$/i.test(nameLine) ? nameLine : handle,
    handle,
    kind,
    post_url: x,
    model: field("Model"),
    effort: field("Effort"),
    posted: field("Posted"),
    prompt: body,
    prompt_chars: body.length,
    video: dom.video || null, // so o endereco, para consulta; o video NAO e baixado
  };
}

// --------------------------------------------------------------------------- sync
async function sync(opts) {
  const found = findPlaywright();
  if (!found) throw new Error(`Playwright nao encontrado. Rode: node ${join(here, "doctor.mjs")} --install`);
  const { chromium } = found.module;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, userAgent: "dev-team-kit prompt-motion study (personal use; polite crawler)" });
  const block = (route) => (["image", "media", "font"].includes(route.request().resourceType()) ? route.abort() : route.continue());
  try {
    const home = await ctx.newPage();
    await home.route("**/*", block);
    await home.goto(SITE, { waitUntil: "networkidle" });
    let slugs = await home.evaluate(() => [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => /^\/[a-z0-9_-]+-[0-9a-f]{6}$/i.test(h)).map((h) => h.slice(1)))]);
    await home.close();
    if (opts.limit) slugs = slugs.slice(0, opts.limit);
    console.log(`${slugs.length} entradas na galeria; baixando o texto (concorrencia ${opts.concurrency}, pausa ${opts.delay} ms).`);

    const prev = new Map(loadLibrary().entries.map((e) => [e.slug, e]));
    const out = new Map();
    const failed = [];
    let next = 0, done = 0;
    const worker = async () => {
      const page = await ctx.newPage();
      await page.route("**/*", block);
      while (next < slugs.length) {
        const slug = slugs[next++];
        try {
          await page.goto(`${SITE}/${slug}`, { waitUntil: "domcontentloaded", timeout: 45000 });
          await page.waitForSelector("main", { timeout: 20000 });
          await page.waitForTimeout(250);
          const dom = await page.evaluate(() => {
            const main = document.querySelector("main") || document.body;
            return {
              text: main.innerText,
              title: document.querySelector("h1")?.innerText || document.title,
              links: [...main.querySelectorAll("a")].map((a) => [a.textContent.trim(), a.href]),
              video: document.querySelector("video")?.getAttribute("src") || document.querySelector("video source")?.getAttribute("src") || null,
            };
          });
          const e = parseEntry(slug, dom);
          if (!e.prompt) throw new Error("prompt vazio (estrutura da pagina mudou?)");
          out.set(slug, e);
        } catch (err) {
          failed.push({ slug, error: String(err.message).split("\n")[0] });
          if (prev.has(slug)) out.set(slug, prev.get(slug)); // mantem o que ja tinha
        }
        if (++done % 20 === 0) console.log(`  ${done}/${slugs.length}`);
        await new Promise((r) => setTimeout(r, opts.delay));
      }
      await page.close();
    };
    await Promise.all(Array.from({ length: opts.concurrency }, worker));

    const entries = slugs.map((s) => out.get(s)).filter(Boolean);
    saveLibrary({ synced_at: new Date().toISOString(), source: SITE, count: entries.length, entries });
    console.log(`\n${entries.length} entradas salvas em ${libFile()}${failed.length ? `; ${failed.length} falharam` : ""}.`);
    for (const f of failed.slice(0, 10)) console.log(`  ! ${f.slug}: ${f.error}`);
    return failed.length ? 1 : 0;
  } finally {
    await browser.close();
  }
}

// ------------------------------------------------------------------- consultas (locais)
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function need() {
  const lib = loadLibrary();
  if (!lib.entries.length) { console.error(`Biblioteca vazia. Rode: node ${join(here, "prompt-motion.mjs")} sync`); process.exit(1); }
  return lib;
}

export function searchEntries(entries, terms, { kind } = {}) {
  const ts = terms.map(norm).filter(Boolean);
  return entries
    .filter((e) => !kind || e.kind === kind)
    .map((e) => {
      const hay = norm(`${e.title} ${e.handle} ${e.prompt}`);
      const score = ts.reduce((n, t) => n + (hay.includes(t) ? 1 + (norm(e.title).includes(t) ? 2 : 0) : 0), 0);
      return { e, score };
    })
    .filter((x) => x.score >= Math.max(1, ts.length))
    .sort((a, b) => b.score - a.score || a.e.prompt_chars - b.e.prompt_chars)
    .map((x) => x.e);
}

// ------------------------------------------------------------ camadas e numeros do corpus (reproduzivel)
/**
 * Camada de um prompt da galeria, pela ESTRUTURA (nao pelo gosto):
 *  skill = entrada do tipo "Skill" (um pacote, nao um prompt);
 *  T3 = roteiro de quadro/segundo exato (faixas f0-71, 0.00-3.00 s) e/ou tags XML + muitos numeros;
 *  T2 = brief de diretor (tags <inputs>/<direction>/<structure>/<build>... ou secoes equivalentes) com mapa de tempo;
 *  T1 = brief medio: >= 200 caracteres com secoes/listas/placeholders/regras;
 *  T0 = pedido curto de genero/ideia (< 200 caracteres ou sem estrutura).
 */
export function classify(e) {
  if (e.kind === "skill") return "skill";
  const p = e.prompt || "";
  const tags = new Set([...p.matchAll(/<\/?([a-z_]+)>/gi)].map((m) => m[1].toLowerCase()));
  const xml = ["inputs", "direction", "structure", "build", "gotchas", "start"].filter((t) => tags.has(t)).length;
  const timeRanges = (p.match(/\bf\d+\s*[–-]\s*\d+|\b\d{1,2}[.:]\d{2}\s*[–-]\s*\d{1,2}[.:]\d{2}|\bb\d+\s*[–-]\s*\d+/g) || []).length;
  if (timeRanges >= 4 && p.length >= 1500) return "T3";
  if (xml >= 3) return "T2";
  const sections = (p.match(/^\s*(?:[A-Z][A-Z ]{3,}|#{1,3} .+|\d+\.\s+\S.*:)\s*$/gm) || []).length;
  const lists = (p.match(/^\s*(?:[-*]|\d+[.)])\s+\S/gm) || []).length;
  const placeholders = (p.match(/\{\{[A-Z_]+\}\}/g) || []).length;
  if (p.length >= 200 && (sections >= 1 || lists >= 3 || placeholders >= 2 || /\bRULES?\b|\bCRAFT\b|banned|never use/i.test(p))) return "T1";
  if (p.length >= 1500) return "T2";
  return "T0";
}

/** Tabela fixa de caracteristicas medidas no corpus (palavras inteiras, para nao casar "graphics" com "graph"). */
export const FEATURES = {
  tecnica: [
    ["html", /\bhtml\b/i], ["svg", /\bsvg\b/i], ["canvas", /\bcanvas\b/i], ["css", /\bcss\b/i], ["three.js/webgl", /three\.?js|\bwebgl\b/i], ["shader/glsl", /\bshader|\bglsl\b/i],
    ["gsap", /\bgsap\b/i], ["remotion", /\bremotion\b/i], ["hyperframes", /\bhyperframes\b/i], ["manim", /\bmanim\b/i], ["p5", /\bp5(\.js)?\b/i], ["d3", /\bd3\b/i], ["lottie", /\blottie\b/i], ["blender", /\bblender\b/i],
    ["python", /\bpython\b/i], ["ffmpeg", /\bffmpeg\b/i], ["playwright/puppeteer", /\bplaywright\b|\bpuppeteer\b/i], ["javascript", /\bjavascript\b|\bjs\b/i], ["react", /\breact\b/i],
    ["sem libs/um arquivo", /no librar|zero[- ]dep|no dependenc|single[- ](html )?file|one (html )?file|self[- ]contained|vanilla/i],
    ["audio/musica/batida", /\baudio\b|\bsounds?\b|\bmusic\b|soundtrack|\bsfx\b|\bbeats?\b|\bbpm\b/i], ["voz/tts", /elevenlabs|\bvoice|narrat|\btts\b|voiceover/i],
    ["modelo de video/imagem", /seedance|\bveo\b|\bsora\b|\bkling\b|higgsfield|runway|midjourney|\bflux\b/i],
  ],
  duracao: [
    ["15 s", /\b15[- ]?(s\b|sec|second)/i], ["10 s", /\b10[- ]?(s\b|sec|second)/i], ["30 s", /\b30[- ]?(s\b|sec|second)/i], ["60 s/1 min", /\b60[- ]?(s\b|sec|second)|\b1[- ]?min/i], ["5 s", /\b5[- ]?(s\b|sec|second)/i],
    ["9:16/vertical", /9:16|\bvertical|\bportrait|tiktok|\breels\b|\bshorts\b/i], ["16:9/horizontal", /16:9|landscape|\b1920/i], ["1:1/quadrado", /\b1:1\b|\bsquare\b/i], ["60 fps", /\b60 ?fps\b/i], ["loop", /\bloops?\b|looping/i], ["4k/1080", /\b4k\b|\b1080/i],
  ],
  estilo: [
    ["showreel/reel", /showreel|\breel\b/i], ["tipografia cinetica", /kinetic|typograph/i], ["minimal", /\bminimal/i], ["brutalista", /brutalis/i], ["swiss/bauhaus", /\bswiss\b|bauhaus/i], ["neon/cyberpunk", /\bneon\b|cyberpunk/i], ["glitch", /\bglitch/i],
    ["retro/pixel/CRT", /\bretro\b|\bpixel|8-bit|\bcrt\b|scanline|pc-98|\bvhs\b/i], ["risografia", /risograph/i], ["osciloscopio", /oscillo/i], ["papel/aquarela/desenho a mao", /watercolor|\bpaper\b|hand-drawn|\bsketch|\bengrav/i],
    ["isometrico/low poly", /isometric|low[- ]poly/i], ["vidro/blur/gradiente", /\bglass|\bblur|\bgradient/i], ["escuro/noir", /\bdark\b|\bnoir\b/i], ["3d", /\b3d\b/i], ["particulas", /particle/i],
    ["grafico/dados", /\bcharts?\b|dashboard|data viz|bar graph|line graph|\bgraphs?\b(?!ic)/i], ["produto/app/lancamento", /\bui\b|\bapp\b|product|\bsaas\b|launch/i], ["personagem/mascote", /character|mascot/i], ["clipe musical", /music video|lyrics|\bsong\b/i], ["historia/filme", /\bstory\b|\bfilm\b|narrative|cinematic|trailer/i],
  ],
  estrutura: [
    ["titulos markdown", /^#{1,4} /m], ["lista numerada", /^\s*\d+[.)] /m], ["lista com marcador", /^\s*[-*] /m], ["bloco de codigo", /```/], ["tags xml", /<\/?[a-z_]+>/i], ["{{placeholders}}", /\{\{[A-Z_]+\}\}/],
    ["'go all out'/maximo", /go all out|all out\b|max effort|ultrathink|think hard/i], ["pede referencia", /\breference/i], ["pede olhar os proprios quadros", /screenshot|review (the )?(frames|output)|look at (your|the) (own )?(frames|output)|critique|self[- ]review|check (your|the) (output|frames)|one frame per beat/i],
    ["seek/deterministico", /\bseek\(|determinis|frame[- ]by[- ]frame/i], ["molas fechadas", /closed[- ]form|spring/i], ["lista de proibidos (Banned/Never)", /\bbanned\b|\bnever\b|\bdo not\b|\bdon'?t\b|\bavoid\b/i], ["persona 'you are'", /\byou are (a|an|the)\b|\bact as\b/i],
    ["pede inputs ao usuario ('Ask me for')", /ask me for|ask me (for|before)/i], ["mapa de batidas/BPM", /\bbpm\b|\bbeat/i], ["ultimo quadro = primeiro", /last frame.{0,40}first|first frame.{0,40}last|loops? (cleanly|seamless)/i],
  ],
};

export function analyze(lib) {
  const es = lib.entries, n = es.length;
  const pct = (c) => `${Math.round((c / n) * 100)}%`;
  const group = (rows) => rows.map(([name, re]) => { const c = es.filter((e) => re.test(e.prompt)).length; return { name, n: c, pct: pct(c) }; }).filter((r) => r.n).sort((a, b) => b.n - a.n);
  const norm2 = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const groups = new Map();
  for (const e of es) { const k = norm2(e.prompt); groups.set(k, (groups.get(k) || 0) + 1); }
  const dupGroups = [...groups.values()].filter((c) => c > 1);
  const tiers = es.reduce((m, e) => { const t = classify(e); m[t] = (m[t] || 0) + 1; return m; }, {});
  const lens = es.map((e) => e.prompt_chars).sort((a, b) => a - b);
  const median = (xs) => (xs.length ? xs[Math.floor(xs.length / 2)] : 0);
  const byEffort = {};
  for (const e of es) (byEffort[e.effort || "nao informado"] ||= []).push(e.prompt_chars);
  const topDup = [...groups.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    entradas: n, sincronizado_em: lib.synced_at, distintos: groups.size, entradas_em_duplicata: dupGroups.reduce((a, b) => a + b, 0), maior_duplicata: topDup ? { copias: topDup[1], caracteres: topDup[0].length } : null,
    tiers: Object.fromEntries(Object.entries(tiers).map(([k, v]) => [k, { n: v, pct: pct(v) }])),
    tamanho: { min: lens[0], mediana: median(lens), p90: lens[Math.floor(0.9 * n)], max: lens[n - 1], menor_que_200: es.filter((e) => e.prompt_chars < 200).length },
    esforco: Object.fromEntries(Object.entries(byEffort).map(([k, v]) => [k, { n: v.length, mediana_caracteres: median([...v].sort((a, b) => a - b)) }])),
    tecnica: group(FEATURES.tecnica), duracao: group(FEATURES.duracao), estilo: group(FEATURES.estilo), estrutura: group(FEATURES.estrutura),
  };
}

function stats(lib) {
  const es = lib.entries, n = es.length;
  const by = (f) => Object.entries(es.reduce((m, e) => ((m[f(e) ?? "?"] = (m[f(e) ?? "?"] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]);
  const lens = es.map((e) => e.prompt_chars).sort((a, b) => a - b);
  const q = (p) => lens[Math.min(n - 1, Math.floor(p * n))];
  return { n, synced_at: lib.synced_at, kinds: by((e) => e.kind), models: by((e) => e.model), efforts: by((e) => e.effort), chars: { min: lens[0], p25: q(0.25), median: q(0.5), p75: q(0.75), p90: q(0.9), max: lens[n - 1] } };
}

export function indexMarkdown(lib) {
  const order = { T3: 0, T2: 1, skill: 2, T1: 3, T0: 4 };
  const rows = [...lib.entries]
    .map((e) => ({ e, t: classify(e) }))
    .sort((a, b) => order[a.t] - order[b.t] || b.e.prompt_chars - a.e.prompt_chars)
    .map(({ e, t }) => `| ${t} | ${e.prompt_chars} | ${String(e.title).replace(/\|/g, "/")} | ${e.handle ? `[@${e.handle}](https://x.com/${e.handle})` : "?"} | [entrada](${e.url}) · [post](${e.post_url ?? e.url}) |`);
  return `# Índice — galeria prompt-motion.com (${lib.entries.length} entradas)\n\n> Gerado por \`prompt-motion.mjs index\` em ${lib.synced_at?.slice(0, 10)}. **Sem os textos**: apenas camada, tamanho, título, criador e links. Vídeos e prompts pertencem aos criadores; para ler um prompt, abra a entrada (ou use a sua biblioteca local: \`prompt-motion.mjs show <slug>\`). Camadas: ver \`PADRAO.md\`.\n\n| camada | caracteres | título | criador | links |\n|---|---|---|---|---|\n${rows.join("\n")}\n`;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const flag = (n, d) => { const i = rest.indexOf(n); return i !== -1 ? rest[i + 1] : d; };
  const pos = rest.filter((a, i) => !a.startsWith("--") && !["--limit", "--kind", "--out", "--concurrency", "--delay"].includes(rest[i - 1]));
  if (cmd === "sync") process.exit(await sync({ limit: Number(flag("--limit", 0)), concurrency: Math.min(4, Math.max(1, Number(flag("--concurrency", 3)))), delay: Math.max(150, Number(flag("--delay", 400))) }));
  if (cmd === "stats") return console.log(JSON.stringify(stats(need()), null, 2));
  if (cmd === "analyze") return console.log(JSON.stringify(analyze(need()), null, 2));
  if (cmd === "tier") {
    const lib = need();
    const want = flag("--tier");
    const hits = lib.entries.filter((e) => !want || classify(e) === want).sort((a, b) => b.prompt_chars - a.prompt_chars).slice(0, Number(flag("--limit", 15)));
    for (const e of hits) console.log(`${classify(e).padEnd(5)} ${String(e.prompt_chars).padStart(6)} ch  ${e.slug.padEnd(30)} @${e.handle ?? "?"}  ${e.title}`);
    return;
  }
  if (cmd === "search") {
    const hits = searchEntries(need().entries, pos, { kind: flag("--kind") }).slice(0, Number(flag("--limit", 10)));
    for (const e of hits) console.log(`${e.slug.padEnd(30)} ${String(e.prompt_chars).padStart(6)} ch  @${e.handle ?? "?"}  ${e.title}`);
    return console.log(`${hits.length} resultado(s). Use: show <slug>`);
  }
  if (cmd === "show") {
    const e = need().entries.find((x) => x.slug === pos[0]);
    if (!e) { console.error("slug nao encontrado"); process.exit(1); }
    return console.log(`# ${e.title}\ncriador: ${e.creator ?? ""} (@${e.handle ?? "?"})  post: ${e.post_url}\nmodelo: ${e.model}  esforco: ${e.effort}  data: ${e.posted}\n(uso pessoal; pertence ao criador)\n\n${e.prompt}`);
  }
  if (cmd === "index") {
    const md = indexMarkdown(need());
    if (flag("--out")) { writeFileSync(resolve(flag("--out")), md); return console.log(`indice em ${resolve(flag("--out"))}`); }
    return console.log(md);
  }
  console.error("Uso: prompt-motion.mjs sync | stats | search <termo> | show <slug> | index [--out arquivo]");
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main().catch((e) => { console.error(e.message); process.exit(1); });
