#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const usage = 'Uso: node capture-ui.mjs --url http://127.0.0.1:3000/ --out pasta-nova [--width 1440] [--height 900] [--settle 400] [--max-segments 24] [--motion]';
const allowedOptions = new Set(['--url', '--out', '--width', '--height', '--settle', '--max-segments']);

export function localUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('URL inválida.'); }
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password) {
    throw new Error('Use uma URL HTTP(S) local, sem credenciais.');
  }
  return url;
}

function integer(value, min, max, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${name} deve estar entre ${min} e ${max}.`);
  return parsed;
}

export function parseArgs(args) {
  if (args.length === 1 && args[0] === '--help') return { help: true };
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--motion') {
      if (Object.hasOwn(options, key)) throw new Error(`Argumento repetido: ${key}`);
      options[key] = true;
      continue;
    }
    const value = args[++i];
    if (!allowedOptions.has(key) || !value || value.startsWith('--') || Object.hasOwn(options, key)) throw new Error(`Argumento inválido ou repetido: ${key}`);
    options[key] = value;
  }
  if (!options['--url'] || !options['--out']) throw new Error('Informe --url e --out.');
  return {
    url: localUrl(options['--url']), output: resolve(options['--out']),
    width: integer(options['--width'] ?? 1440, 240, 3840, 'Largura'),
    height: integer(options['--height'] ?? 900, 240, 2160, 'Altura'),
    settle: integer(options['--settle'] ?? 400, 0, 5000, 'Espera'),
    maxSegments: integer(options['--max-segments'] ?? 24, 1, 40, 'Número de fatias'),
    motion: Boolean(options['--motion']),
  };
}

export function isSameOrigin(value, origin) {
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) &&
      url.hostname === origin.hostname && url.port === origin.port &&
      (url.protocol === origin.protocol || (origin.protocol === 'http:' && url.protocol === 'ws:') || (origin.protocol === 'https:' && url.protocol === 'wss:'));
  } catch { return false; }
}

async function loadPlaywright() {
  try { return await import('playwright'); } catch {
    try { return createRequire(join(process.cwd(), 'package.json'))('playwright'); }
    catch { throw new Error('Playwright não encontrado no projeto; use o navegador disponível no ambiente.'); }
  }
}

async function scrollTo(page, y, settle) {
  await page.evaluate((position) => window.scrollTo(0, position), y);
  if (settle) await page.waitForTimeout(settle);
  return page.evaluate(() => ({ y: Math.round(window.scrollY), height: document.documentElement.scrollHeight, viewport: window.innerHeight }));
}

async function motionSnapshot(page) {
  return page.evaluate(() => {
    const selector = (element) => {
      const parts = [];
      for (let node = element; node && parts.length < 6; node = node.parentElement) {
        const siblings = node.parentElement ? [...node.parentElement.children].filter((item) => item.tagName === node.tagName) : [node];
        parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(node) + 1})`);
      }
      return parts.join(' > ');
    };
    const samples = document.getAnimations().map((animation) => {
      const element = animation.effect?.target;
      if (!(element instanceof Element)) return { state: animation.playState, target: null, offscreen: null };
      const rect = element.getBoundingClientRect();
      const offscreen = rect.bottom <= 0 || rect.right <= 0 || rect.top >= innerHeight || rect.left >= innerWidth;
      return { state: animation.playState, target: selector(element), offscreen };
    });
    return {
      running: samples.filter((item) => item.state === 'running').length,
      offscreenRunning: samples.filter((item) => item.state === 'running' && item.offscreen === true).length,
      unidentified: samples.filter((item) => item.target === null).length,
      samples: samples.slice(0, 30),
      omitted: Math.max(0, samples.length - 30),
    };
  });
}

export async function capture(options) {
  const playwright = await loadPlaywright();
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const browser = await playwright.chromium.launch(executablePath ? { executablePath } : {});
  try {
    const context = await browser.newContext({ viewport: { width: options.width, height: options.height }, deviceScaleFactor: 1, serviceWorkers: 'block', acceptDownloads: false });
    const blocked = { requests: 0, redirects: 0, websockets: 0 };
    await context.route('**/*', async (route) => {
      if (!isSameOrigin(route.request().url(), options.url) || !['GET', 'HEAD'].includes(route.request().method())) {
        blocked.requests++;
        await route.abort();
        return;
      }
      // route.continue() lets Chromium follow redirects without rerouting them.
      // Fetch exactly one hop and abort 3xx responses, including same-origin ones.
      const response = await route.fetch({ maxRedirects: 0 });
      if (response.status() >= 300 && response.status() < 400) {
        blocked.redirects++;
        await route.abort();
      } else await route.fulfill({ response });
    });
    const websocketFiltering = typeof context.routeWebSocket === 'function';
    if (!websocketFiltering) throw new Error('Este Playwright não permite filtrar WebSockets; atualize-o pelo fluxo do projeto.');
    await context.routeWebSocket('**/*', async (socket) => {
      blocked.websockets++;
      await socket.close({ code: 1008, reason: 'WebSocket bloqueado na captura' });
    });
    const page = await context.newPage();
    let pageErrors = 0;
    page.on('pageerror', () => { pageErrors++; });
    const response = await page.goto(options.url.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => Promise.race([document.fonts.ready, new Promise((done) => setTimeout(done, 3000))]));

    const step = Math.max(1, options.height - 80);
    for (let i = 0; i < options.maxSegments; i++) {
      const state = await scrollTo(page, i * step, options.settle);
      if (state.y + state.viewport >= state.height) break;
    }

    await mkdir(dirname(options.output), { recursive: true });
    await mkdir(options.output);
    const segments = [];
    let state, reachedEnd = false, previousY = -1;
    for (let i = 0; i < options.maxSegments; i++) {
      state = await scrollTo(page, i * step, options.settle);
      if (state.y === previousY) { reachedEnd = state.y + state.viewport >= state.height; break; }
      const file = `viewport-${String(i + 1).padStart(2, '0')}.png`;
      await writeFile(join(options.output, file), await page.screenshot(), { flag: 'wx' });
      segments.push({ file, scrollY: state.y, ...(options.motion ? { motion: await motionSnapshot(page) } : {}) });
      previousY = state.y;
      if (state.y + state.viewport >= state.height) { reachedEnd = true; break; }
    }

    let fullPage = null, motionOnReturn = null;
    if (options.motion) {
      await scrollTo(page, 0, options.settle);
      motionOnReturn = await motionSnapshot(page);
    }
    if (reachedEnd && state.height <= 16000) {
      await scrollTo(page, 0, options.settle);
      fullPage = 'pagina-inteira.png';
      await writeFile(join(options.output, fullPage), await page.screenshot({ fullPage: true }), { flag: 'wx' });
    }
    const sanitized = new URL(options.url.href);
    sanitized.search = ''; sanitized.hash = '';
    const manifest = {
      url: sanitized.href, viewport: { width: options.width, height: options.height },
      responseStatus: response?.status() ?? null, capturedAt: new Date().toISOString(),
      pageHeight: state?.height ?? null, segments, fullPage, truncated: !reachedEnd, motionOnReturn,
      blockedRequests: blocked.requests, blockedRedirects: blocked.redirects, blockedWebSockets: blocked.websockets,
      websocketFiltering, pageErrors,
    };
    await writeFile(join(options.output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
    return manifest;
  } finally { await browser.close(); }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(usage); return; }
  const result = await capture(options);
  console.log(`Capturadas ${result.segments.length} fatias${result.truncated ? ' (limite atingido)' : ''}; manifesto em ${join(options.output, 'manifest.json')}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`${error.message}\n${usage}`); process.exitCode = 1; });
}
