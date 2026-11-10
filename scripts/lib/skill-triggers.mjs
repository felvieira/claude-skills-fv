// Parse the trigger phrases declared in a skill's frontmatter description.
// Shared by the fixture evaluator and the runtime reminder to avoid drift.
export function extractTriggers(skillBody) {
  const fmMatch = skillBody.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);
  const fm = fmMatch ? fmMatch[1] : skillBody.slice(0, 2000);
  const idx = fm.search(/[Tt]rigger\s+em\s*:/);
  if (idx < 0) return [];
  const tail = fm.slice(idx);
  const stopAt = tail.search(/\r?\n[A-Za-z_][A-Za-z0-9_-]*\s*:/);
  const block = stopAt > 0 ? tail.slice(0, stopAt) : tail;
  const quoted = [...block.matchAll(/"([^"\n]*(?:\n[^"\n]*)*)"|'([^'\n]*(?:\n[^'\n]*)*)'/g)]
    .map((match) => (match[1] ?? match[2]).replace(/\s+/g, ' ').toLowerCase().trim())
    .filter(Boolean);
  if (quoted.length > 0) return [...new Set(quoted)];
  return [...new Set(block
    .replace(/^[Tt]rigger\s+em\s*:/, '')
    .split(/[,\n]/)
    .map((value) => value.replace(/["'`.]/g, '').trim().toLowerCase())
    .filter((value) => value.length >= 2 && value.length <= 80))];
}
