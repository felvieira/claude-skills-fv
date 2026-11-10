import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { isSameOrigin, localUrl, parseArgs } from '../../skills/92-design-director/scripts/capture-ui.mjs';

const exec = promisify(execFile);
const cli = resolve('skills/92-design-director/scripts/capture-ui.mjs');

test('capture arguments restrict URLs, dimensions and duplicate options', () => {
  assert.equal(localUrl('http://127.0.0.1:3000/').hostname, '127.0.0.1');
  assert.equal(localUrl('http://[::1]:3000/').hostname, '[::1]');
  for (const url of ['https://example.com', 'http://127.0.0.1.evil.test', 'http://user:pass@localhost/', 'file:///tmp/x']) {
    assert.throws(() => localUrl(url));
  }
  const options = parseArgs(['--url', 'http://localhost:3000/', '--out', 'new', '--width', '800']);
  assert.equal(options.width, 800);
  assert.equal(parseArgs(['--url', 'http://localhost/', '--out', 'a', '--motion']).motion, true);
  assert.throws(() => parseArgs(['--url', 'http://localhost/', '--out', 'a', '--motion', '--motion']));
  assert.throws(() => parseArgs(['--url', 'http://localhost/', '--out', 'a', '--width', '20']));
  assert.throws(() => parseArgs(['--url', 'http://localhost/', '--out', 'a', '--out', 'b']));
  assert.throws(() => parseArgs(['--url', 'http://localhost/', '--out', 'a', '--unknown', '1']));
});

test('same-origin checks reject different ports, hosts and schemes', () => {
  const base = new URL('http://127.0.0.1:3000/');
  assert.equal(isSameOrigin('http://127.0.0.1:3000/page', base), true);
  assert.equal(isSameOrigin('http://127.0.0.1:3001/page', base), false);
  assert.equal(isSameOrigin('http://localhost:3000/page', base), false);
  assert.equal(isSameOrigin('https://127.0.0.1:3000/page', base), false);
});

test('local capture records real browser slices, blocks requests and never overwrites', { skip: !process.env.DESIGN_CAPTURE_TEST_BROWSER }, async (t) => {
  const base = resolve(tmpdir());
  const temp = await mkdtemp(join(base, 'design-capture-test-'));
  assert.equal(dirname(temp), base);
  assert.ok(basename(temp).startsWith('design-capture-test-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  let mutations = 0;
  let redirectHits = 0;
  const redirectTarget = createServer((_req, res) => { redirectHits++; res.writeHead(200); res.end('unexpected'); });
  await new Promise((done, reject) => redirectTarget.listen(0, '127.0.0.1', done).on('error', reject));
  t.after(() => new Promise((done) => redirectTarget.close(done)));
  const server = createServer((req, res) => {
    if (req.method === 'POST') mutations++;
    if (req.url === '/redirect') {
      res.writeHead(302, { Location: `http://127.0.0.1:${redirectTarget.address().port}/redirected` });
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><html lang="pt-BR"><title>Fixture</title><style>body{margin:0} section{height:800px} @keyframes move{to{opacity:.6}} .animated{animation:move 10s linear infinite;animation-play-state:paused} .always{animation:move 10s linear infinite}</style>
      <section><div class="animated">Inicio</div></section><section>Meio</section><section><div class="always">Fim</div></section>
      <script>const node=document.querySelector('.animated');new IntersectionObserver(entries=>{node.style.animationPlayState=entries[0].isIntersecting?'running':'paused'}).observe(node);fetch('/mutation',{method:'POST'}).catch(()=>{});fetch('/redirect').catch(()=>{});fetch('http://127.0.0.1:9/externo').catch(()=>{});new WebSocket('ws://127.0.0.1:' + location.port + '/socket');</script></html>`);
  });
  await new Promise((done, reject) => server.listen(0, '127.0.0.1', done).on('error', reject));
  t.after(() => new Promise((done) => server.close(done)));
  const url = `http://127.0.0.1:${server.address().port}/?token=nao-salvar`;
  const env = { ...process.env, PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: process.env.DESIGN_CAPTURE_TEST_BROWSER };
  const output = join(temp, 'complete');
  const args = [cli, '--url', url, '--out', output, '--width', '500', '--height', '400', '--settle', '100', '--max-segments', '12', '--motion'];
  await exec(process.execPath, args, { env, timeout: 60000 });
  const manifest = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8'));
  assert.equal(manifest.responseStatus, 200);
  assert.ok(manifest.segments.length > 1);
  assert.equal(manifest.truncated, false);
  assert.equal(manifest.fullPage, 'pagina-inteira.png');
  assert.equal(manifest.url.includes('token='), false);
  assert.equal(manifest.segments[0].motion.running, 2);
  assert.ok(manifest.segments[0].motion.offscreenRunning >= 1);
  assert.ok(manifest.segments.some((segment) => segment.motion.samples.some((sample) => sample.state === 'paused')));
  assert.equal(manifest.motionOnReturn.running, 2);
  assert.ok(manifest.blockedRequests >= 2);
  assert.ok(manifest.blockedRedirects >= 1);
  assert.ok(manifest.blockedWebSockets >= 1);
  assert.equal(mutations, 0);
  assert.equal(redirectHits, 0);
  assert.ok((await stat(join(output, manifest.fullPage))).size > 0);
  const first = await readFile(join(output, 'viewport-01.png'));
  await assert.rejects(exec(process.execPath, args, { env, timeout: 60000 }));
  assert.deepEqual(await readFile(join(output, 'viewport-01.png')), first);
  const limited = join(temp, 'limited');
  await exec(process.execPath, [cli, '--url', url, '--out', limited, '--width', '500', '--height', '400', '--settle', '25', '--max-segments', '1'], { env, timeout: 60000 });
  const short = JSON.parse(await readFile(join(limited, 'manifest.json'), 'utf8'));
  assert.equal(short.truncated, true);
  assert.equal(short.fullPage, null);
});
