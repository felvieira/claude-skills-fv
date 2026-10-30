// Same deterministic matching for catalog planning and fixture evaluation.
export function normalizeTrigger(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function matchesTrigger(text, trigger) {
  const input = normalizeTrigger(text);
  const term = normalizeTrigger(trigger).trim();
  if (!term) return false;
  if (/\s/.test(term)) return input.includes(term);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'u').test(input);
}
