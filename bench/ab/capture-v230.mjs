import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'out', 'screenshots');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 680, height: 520 });

// seed some todos via API
for (const [title, done] of [
  ['Implementar auth JWT', false],
  ['Escrever testes de integração', false],
  ['Security review OWASP', true],
  ['Deploy em produção', false],
]) {
  await fetch('http://localhost:3004/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, done }),
  }).catch(() => {});
}

await page.goto('http://localhost:3004/', { waitUntil: 'networkidle' });
await page.screenshot({ path: join(OUT, 'kit-v230-frontend.png'), fullPage: false });
console.log('screenshot kit-v230-frontend.png saved');

// also capture API response
await page.goto('http://localhost:3004/todos');
await page.screenshot({ path: join(OUT, 'kit-v230-api.png'), fullPage: true });
console.log('screenshot kit-v230-api.png saved');

await browser.close();
