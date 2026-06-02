#!/usr/bin/env node
/**
 * Captura screenshots dos dois apps rodando (vanilla:3000, kit:3002)
 * e salva em out/screenshots/vanilla.png e out/screenshots/kit.png
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out', 'screenshots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

for (const [arm, port, color] of [
  ['vanilla',  3000, '#6e7681'],
  ['kit',      3002, '#58a6ff'],
  ['kit-auto', 3003, '#3fb950'],
]) {
  let todos = [];
  try {
    const res = await fetch(`http://localhost:${port}/todos`);
    todos = await res.json();
  } catch (e) {
    console.error(`✗ ${arm} server not responding on :${port} — ${e.message}`);
    continue;
  }

  const html = `<!doctype html><html>
<head><meta charset="utf-8">
<style>
  body{margin:0;background:#0d1117;font:14px/1.5 -apple-system,sans-serif;color:#e6edf3;padding:20px}
  h2{color:${color};margin:0 0 6px;font-size:18px}
  .badge{background:${color};color:#0d1117;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-left:8px;vertical-align:middle}
  .url{color:#58a6ff;font-size:12px;margin-bottom:14px;font-family:monospace}
  .info{display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap}
  .info div{background:#1c2128;border:1px solid #30363d;border-radius:6px;padding:6px 12px;font-size:12px}
  .info div span{display:block;color:#8b949e;font-size:10px;margin-bottom:2px}
  .card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px 16px;margin-bottom:8px}
  .title{font-weight:600;font-size:14px}
  .done .title{opacity:.5;text-decoration:line-through}
  .meta{color:#8b949e;font-size:11px;margin-top:3px;font-family:monospace}
  .tag{display:inline-block;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;margin-left:6px;vertical-align:middle}
  .tag.t{background:#1a3a23;color:#3fb950} .tag.f{background:#3a1a1a;color:#f85149}
</style></head>
<body>
<h2>${arm === 'kit-auto' ? '🚀 Kit + /auto (subagent)' : arm === 'kit' ? '🧰 Kit passivo' : '⬜ Claude puro (vanilla)'}
  <span class="badge">${arm.toUpperCase()}</span></h2>
<div class="url">GET http://localhost:${port}/todos → ${todos.length} itens</div>
<div class="info">
  <div><span>endpoint</span>http://localhost:${port}</div>
  <div><span>braço</span>${arm}</div>
  <div><span>total</span>${todos.length} todos</div>
  <div><span>feitos</span>${todos.filter(t=>t.done).length} done / ${todos.filter(t=>!t.done).length} pending</div>
</div>
${todos.slice(0, 5).map(t => `
<div class="card ${t.done ? 'done' : ''}">
  <div class="title">${t.title}
    <span class="tag ${t.done ? 't' : 'f'}">${t.done ? 'done ✓' : 'pending'}</span>
  </div>
  <div class="meta">id: ${t.id} · ${t.createdAt?.slice(0,19).replace('T',' ') || ''}</div>
</div>`).join('')}
</body></html>`;

  const page = await browser.newPage();
  await page.setViewportSize({ width: 520, height: 380 });
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const out = join(OUT, `${arm}.png`);
  await page.screenshot({ path: out, fullPage: true });
  await page.close();
  console.log(`✅ screenshot → ${out}`);
}

await browser.close();
console.log('done');
