/**
 * agents/index.mjs — adapter factory.
 */

export async function getAgent(name) {
  switch (name) {
    case 'claude': return (await import('./claude.mjs')).default;
    case 'codex': return (await import('./codex.mjs')).default;
    default: throw new Error(`Unknown agent: ${name}`);
  }
}
