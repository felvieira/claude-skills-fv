/**
 * stop-when.mjs — natural-language stop condition evaluation.
 *
 * injectStopWhen(prompt, condition): appends a stop-condition instruction.
 * checkStopWhen(output): parses "STOP_WHEN_MET: true|false" marker.
 */

const STOP_INSTRUCTION = `
## Stop Condition
Evaluate whether the following condition is met by your work so far: %CONDITION%
At the end of your output, on its own line, write exactly:
STOP_WHEN_MET: true
or
STOP_WHEN_MET: false
`.trim();

export function injectStopWhen(prompt, condition) {
  if (!condition) return prompt;
  return prompt + '\n\n' + STOP_INSTRUCTION.replace('%CONDITION%', condition);
}

export function checkStopWhen(output) {
  if (!output) return null;
  const m = output.match(/^STOP_WHEN_MET:\s*(true|false)\s*$/im);
  if (!m) return null;
  return m[1].toLowerCase() === 'true';
}
