/**
 * capture-real.mjs — captura screenshots REAIS de cada braço
 *
 * Vanilla / Kit-passivo: só API REST, sem UI → captura JSON bruto + nota explicativa
 * Kit-auto: frontend real gerado pelo agente → screenshot do app em uso
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out', 'screenshots-real');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

// ── 1. Vanilla — só API JSON ──────────────────────────────────────────────────
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 600, height: 420 });

  // busca o JSON real
  let todos = [];
  try {
    const r = await fetch('http://localhost:3000/todos');
    todos = await r.json();
  } catch {}

  const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  body{margin:0;background:#0d1117;font:13px/1.6 monospace;color:#e6edf3;padding:20px}
  h2{color:#6e7681;font-size:16px;margin:0 0 6px}
  .tag{background:#21262d;padding:2px 8px;border-radius:4px;font-size:11px;color:#8b949e;margin-left:8px}
  .notice{background:#1c2128;border:1px solid #f0883e44;border-radius:8px;padding:10px 14px;color:#f0883e;font-size:12px;margin:10px 0}
  pre{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;overflow-x:auto;font-size:11px;color:#79c0ff}
</style></head><body>
<h2>⬜ Claude puro (vanilla)<span class="tag">API ONLY — sem frontend</span></h2>
<div class="notice">⚠ Este braço entregou só uma API REST (JSON). Não há interface visual — o agente não inferiu que um "app" precisaria de UI. Abaixo: resposta real de GET /todos.</div>
<pre>GET http://localhost:3000/todos

${JSON.stringify(todos.slice(0,4), null, 2)}</pre>
</body></html>`;

  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: join(OUT, 'vanilla.png'), fullPage: true });
  await page.close();
  console.log('✅ vanilla.png — API only notice');
}

// ── 2. Kit passivo — só API JSON ──────────────────────────────────────────────
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 600, height: 420 });

  let todos = [];
  try {
    const r = await fetch('http://localhost:3002/todos');
    todos = await r.json();
  } catch {}

  const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  body{margin:0;background:#0d1117;font:13px/1.6 monospace;color:#e6edf3;padding:20px}
  h2{color:#58a6ff;font-size:16px;margin:0 0 6px}
  .tag{background:#21262d;padding:2px 8px;border-radius:4px;font-size:11px;color:#8b949e;margin-left:8px}
  .notice{background:#1c2128;border:1px solid #58a6ff44;border-radius:8px;padding:10px 14px;color:#58a6ff;font-size:12px;margin:10px 0}
  .win{color:#3fb950;font-size:11px;margin:4px 0}
  pre{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;overflow-x:auto;font-size:11px;color:#79c0ff}
</style></head><body>
<h2>🧰 Kit passivo<span class="tag">API ONLY — sem frontend</span></h2>
<div class="notice">⚠ Kit passivo também entregou só API REST. As rules do kit ativaram WAL mode e desabilitaram X-Powered-By — mas sem /auto o agente não inferiu fullstack. Abaixo: GET /todos.</div>
<div class="win">✅ WAL mode ativo | ✅ X-Powered-By desabilitado | via rules/common/security.md</div>
<pre>GET http://localhost:3002/todos

${JSON.stringify(todos.slice(0,4), null, 2)}</pre>
</body></html>`;

  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: join(OUT, 'kit-passive.png'), fullPage: true });
  await page.close();
  console.log('✅ kit-passive.png — API only notice');
}

// ── 3. Kit-auto — frontend REAL gerado pelo agente ────────────────────────────
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 700, height: 560 });

  try {
    // navega no frontend real gerado pelo agente
    await page.goto('http://localhost:3005/', { waitUntil: 'networkidle', timeout: 8000 });

    // aguarda a lista carregar (se houver JS async)
    await page.waitForTimeout(1000);

    await page.screenshot({ path: join(OUT, 'kit-auto-frontend.png'), fullPage: false });
    console.log('✅ kit-auto-frontend.png — FRONTEND REAL do agente');
  } catch (e) {
    console.error('✗ kit-auto server offline:', e.message);
  }
  await page.close();
}

// ── 4. Comparativo — JSON bruto do kit-auto ───────────────────────────────────
{
  const page = await browser.newPage();
  await page.setViewportSize({ width: 700, height: 420 });

  let todos = [];
  try {
    const r = await fetch('http://localhost:3005/todos');
    todos = await r.json();
  } catch {}

  const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  body{margin:0;background:#0d1117;font:13px/1.6 monospace;color:#e6edf3;padding:20px}
  h2{color:#3fb950;font-size:16px;margin:0 0 6px}
  .tag{background:#1a3a23;padding:2px 8px;border-radius:4px;font-size:11px;color:#3fb950;margin-left:8px}
  .notice{background:#1a3a23;border:1px solid #3fb95044;border-radius:8px;padding:10px 14px;color:#3fb950;font-size:12px;margin:10px 0}
  pre{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;overflow-x:auto;font-size:11px;color:#79c0ff}
</style></head><body>
<h2>🚀 Kit + /auto<span class="tag">FULLSTACK — API + Frontend</span></h2>
<div class="notice">✅ Kit-auto inferiu fullstack autonomamente. Serve frontend HTML/CSS/JS em / e API REST em /todos. Frontend acima; API abaixo.</div>
<pre>GET http://localhost:3005/todos

${JSON.stringify(todos.slice(0,4), null, 2)}</pre>
</body></html>`;

  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.screenshot({ path: join(OUT, 'kit-auto-api.png'), fullPage: true });
  await page.close();
  console.log('✅ kit-auto-api.png — API do fullstack');
}

await browser.close();
console.log('\nTodos os screenshots em:', OUT);
