#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { redactSecrets } from './repo-wiki-sources.mjs';

const args = { repo: process.cwd(), output: 'docs/repo-wiki/runtime.json', package: null, allowExecution: false, timeout: 120000 };
for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (value === '--repo') args.repo = process.argv[++index];
  else if (value === '--output') args.output = process.argv[++index];
  else if (value === '--package') args.package = process.argv[++index];
  else if (value === '--timeout') args.timeout = Number(process.argv[++index]);
  else if (value === '--allow-execution') args.allowExecution = true;
  else if (value === '--help' || value === '-h') { console.log('Usage: node scripts/run-repo-wiki-runtime.mjs --repo <path> --output <path> [--package <package.json>] [--allow-execution]'); process.exit(0); }
  else throw new Error(`Argumento inválido: ${value}`);
}
if (!Number.isInteger(args.timeout) || args.timeout < 1000 || args.timeout > 600000) throw new Error('--timeout deve estar entre 1000 e 600000 ms');

function commandRun(command, cwd) {
  return new Promise((resolve) => {
    const started = Date.now();
    const executable = process.platform === 'win32' && command[0] === 'npm' ? 'npm.cmd' : command[0];
    const child = spawn(executable, command.slice(1), { cwd, shell: process.platform === 'win32', windowsHide: true, env: process.env });
    let stdout = ''; let stderr = ''; let finished = false;
    const finish = (result) => { if (finished) return; finished = true; resolve({ ...result, duration_ms: Date.now() - started, output: redactSecrets(`${stdout}${stderr}`.slice(-4000)) }); };
    const timer = setTimeout(() => { child.kill('SIGTERM'); finish({ status: 'fail', exit_code: null, notes: `timeout after ${args.timeout} ms` }); }, args.timeout);
    child.stdout.on('data', (chunk) => { stdout += chunk; }); child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => { clearTimeout(timer); finish({ status: 'fail', exit_code: null, notes: redactSecrets(error.message) }); });
    child.on('close', (code) => { clearTimeout(timer); finish({ status: code === 0 ? 'pass' : 'fail', exit_code: code, notes: code === 0 ? 'process exited normally' : 'process returned a non-zero exit code' }); });
  });
}
async function findPackage(repo) {
  if (args.package) return path.resolve(repo, args.package);
  const preferred = path.join(repo, 'mcp-server', 'package.json');
  try { await fs.stat(preferred); return preferred; } catch {}
  const candidates = [];
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || ['node_modules', 'docs', 'dist', 'build'].includes(entry.name)) continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile() && entry.name === 'package.json') candidates.push(target);
    }
  }
  await visit(repo);
  for (const candidate of candidates.sort()) {
    const manifest = JSON.parse(await fs.readFile(candidate, 'utf8'));
    if (manifest.scripts?.build || manifest.scripts?.test) return candidate;
  }
  return null;
}
async function main() {
  const repo = path.resolve(args.repo); const output = path.resolve(repo, args.output); const packagePath = await findPackage(repo);
  const commands = [];
  if (!packagePath) commands.push({ command: 'npm run build', purpose: 'Build do pacote identificado', status: 'not_run', exit_code: null, notes: 'Nenhum package.json com build/test foi localizado.' });
  else {
    const manifest = JSON.parse(await fs.readFile(packagePath, 'utf8')); const cwd = path.dirname(packagePath);
    for (const script of ['build', 'test']) if (manifest.scripts?.[script]) {
      const command = `npm run ${script}`;
      commands.push({ command, purpose: script === 'build' ? 'Compilar o pacote selecionado.' : 'Executar os testes declarados pelo pacote.', ...(args.allowExecution ? await commandRun(['npm', 'run', script], cwd) : { status: 'not_run', exit_code: null, notes: 'Execução omitida; passe --allow-execution explicitamente.' }), package: path.relative(repo, packagePath).replaceAll('\\', '/') });
    }
  }
  const status = commands.every((item) => item.status === 'pass') && commands.length > 0 ? 'pass' : commands.some((item) => item.status === 'fail') ? 'fail' : 'not_run';
  const result = { schema_version: 1, repo, package: packagePath ? path.relative(repo, packagePath).replaceAll('\\', '/') : null, status, commands, gaps: ['Execução local não prova integração com serviços externos, deploy ou produção.'] };
  await fs.mkdir(path.dirname(output), { recursive: true }); await fs.writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'written', output, runtime: result }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
