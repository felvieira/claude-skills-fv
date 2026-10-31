#!/usr/bin/env node
// Captura dois documentos locais com o mesmo viewport, sem sobrescrever arquivos.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const usage = 'Uso: node capture-local.mjs <antes.html> <depois.html> <pasta-saida> [largura] [altura]';
const args = process.argv.slice(2);
if (args.length < 3 || args.length > 5 || args.includes('--help')) {
  console.log(usage);
  process.exit(args.includes('--help') ? 0 : 1);
}
const [beforeArg, afterArg, outputArg, widthArg = '1100', heightArg = '850'] = args;
const width = Number(widthArg), height = Number(heightArg);
if (!Number.isInteger(width) || !Number.isInteger(height) || width < 240 || height < 240 || width > 3840 || height > 3840) {
  console.error('Viewport inválido: use inteiros entre 240 e 3840.');
  process.exit(1);
}
const files = [beforeArg, afterArg].map((arg) => resolve(arg));
if (files.some((file) => !file.toLowerCase().endsWith('.html') || !existsSync(file) || !statSync(file).isFile())) {
  console.error('As duas entradas devem ser arquivos HTML locais existentes.');
  process.exit(1);
}
const output = resolve(outputArg);
if (!isAbsolute(output)) throw new Error('Destino inválido');
const outputs = ['antes.png', 'depois.png'].map((name) => join(output, name));
if (outputs.some(existsSync)) {
  console.error('Destino já contém antes.png ou depois.png; escolha uma pasta vazia.');
  process.exit(1);
}

let playwright;
try { playwright = await import('playwright'); }
catch {
  try { playwright = createRequire(join(process.cwd(), 'package.json'))('playwright'); }
  catch { console.error('Playwright não encontrado no projeto. Use o navegador disponível ou instale-o pelo fluxo do projeto.'); process.exit(1); }
}
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const browser = await playwright.chromium.launch(executablePath ? { executablePath } : {});
try {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  // Fixtures locais são conteúdo ativo: bloqueie requisições de rede, sem exportar dados.
  await page.route('**/*', (route) => {
    const protocol = new URL(route.request().url()).protocol;
    return protocol === 'file:' || protocol === 'data:' ? route.continue() : route.abort();
  });
  const images = [];
  for (const file of files) {
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    images.push(await page.screenshot({ fullPage: true }));
  }
  mkdirSync(output, { recursive: true });
  for (let i = 0; i < outputs.length; i++) writeFileSync(outputs[i], images[i], { flag: 'wx' });
  console.log(`Capturas salvas em ${output}: ${outputs.map((file) => basename(file)).join(', ')} (${width}x${height}).`);
} finally { await browser.close(); }
