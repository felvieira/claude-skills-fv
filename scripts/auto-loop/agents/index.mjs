/**
 * agents/index.mjs — adapter factory.
 */

export async function getAgent(name) {
  switch (name) {
    case 'claude': return (await import('./claude.mjs')).default;
    case 'codex': return (await import('./codex.mjs')).default;
    case 'grok':
    case 'omp': return (await import('./file-prompt.mjs')).createFilePromptAdapter(name);
    default: throw new Error(`Unknown agent: ${name}`);
  }
}
