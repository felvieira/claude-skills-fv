import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const extensions = new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','.go','.rs','.java','.cs','.php','.rb','.sql','.vue','.svelte','.sh','.ps1','.c','.cpp','.h']);
const excluded = new Set(['node_modules','vendor','dist','build','coverage','out','graphify-out','worktrees','docs','logs','cache']);
export const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export const posix = value => value.replaceAll('\\','/');
export function allowedSource(relative) {
  const parts = posix(relative).split('/');
  return !path.isAbsolute(relative) && !/^[a-z]:/i.test(relative) && parts.every(p => p && !p.startsWith('.') && !excluded.has(p.toLowerCase()))
    && extensions.has(path.extname(relative).toLowerCase()) && !/(?:secret|credential|private[-_]?key)/i.test(path.basename(relative));
}
export function ignoredSources(repo, paths) {
  if (!paths.length) return new Set();
  const result = spawnSync('git', ['-C',repo,'check-ignore','--no-index','-z','--stdin'], {input: paths.join('\0')+'\0',encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});
  if (result.status === 128 && /not a git repository/i.test(result.stderr)) return new Set();
  if (result.status !== 0 && result.status !== 1) throw new Error('Não foi possível verificar gitignore');
  return new Set(result.stdout.split('\0').filter(Boolean));
}
export async function readSource(repo, relative) {
  if (!allowedSource(relative) || ignoredSources(repo,[relative]).has(relative)) throw new Error('Fonte excluída: '+relative);
  let current = repo;
  for (const part of posix(relative).split('/')) {
    current = path.join(current,part);
    if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Link de fonte não permitido: '+relative);
  }
  const info = await fs.stat(current);
  if (!info.isFile() || info.size > 512*1024) throw new Error('Fonte fora do limite: '+relative);
  const text = await fs.readFile(current,'utf8');
  if (text.includes('\0') || /-----BEGIN .*PRIVATE KEY-----|\b(?:sk_live_|ghp_)[A-Za-z0-9]{16,}/.test(text)) throw new Error('Fonte sensível/binária: '+relative);
  return {path:posix(relative),text,sha256:hash(text)};
}
export async function collectSources(repo) {
  const candidates = [];
  async function visit(dir) {
    const entries = await fs.readdir(dir,{withFileTypes:true});
    const visible = entries.filter(e => !e.name.startsWith('.') && !excluded.has(e.name.toLowerCase()) && !e.isSymbolicLink());
    const paths = visible.map(e => posix(path.relative(repo,path.join(dir,e.name))));
    const ignored = ignoredSources(repo,paths);
    for (const entry of visible) {
      const absolute = path.join(dir,entry.name), relative = posix(path.relative(repo,absolute));
      if (ignored.has(relative)) continue;
      if (entry.isDirectory()) await visit(absolute);
      else if (entry.isFile() && allowedSource(relative)) candidates.push(relative);
    }
  }
  await visit(repo);
  const sources = [], skipped = [];
  for (const relative of candidates.sort()) {
    try { sources.push(await readSource(repo,relative)); }
    catch(error) { skipped.push({path:relative,reason:error.message}); }
  }
  return {sources,skipped};
}
