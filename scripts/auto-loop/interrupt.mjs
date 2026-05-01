/**
 * interrupt.mjs — SIGINT 2-stage + SIGTERM force-stop handlers.
 *
 * First Ctrl+C: graceful stop request.
 * Second Ctrl+C: force exit (130).
 * SIGTERM: immediate force exit (143).
 */

let gracefulFlag = false;
let forceFlag = false;
let installed = false;
let prevSigint = null;
let prevSigterm = null;

export function installInterruptHandlers() {
  if (installed) return;
  installed = true;
  prevSigint = process.listeners('SIGINT').slice();
  prevSigterm = process.listeners('SIGTERM').slice();
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');

  process.on('SIGINT', () => {
    if (gracefulFlag) {
      forceFlag = true;
      console.error('\n[interrupt] Force stop. Exiting now.');
      process.exit(130);
    } else {
      gracefulFlag = true;
      console.error('\n[interrupt] Graceful stop requested. Press Ctrl+C again to force.');
    }
  });

  process.on('SIGTERM', () => {
    forceFlag = true;
    console.error('\n[interrupt] SIGTERM. Exiting.');
    process.exit(143);
  });
}

export function uninstallInterruptHandlers() {
  if (!installed) return;
  process.removeAllListeners('SIGINT');
  process.removeAllListeners('SIGTERM');
  prevSigint?.forEach(h => process.on('SIGINT', h));
  prevSigterm?.forEach(h => process.on('SIGTERM', h));
  installed = false;
  gracefulFlag = false;
  forceFlag = false;
}

export function isGracefulStop() { return gracefulFlag; }
export function isForceStop() { return forceFlag; }

// Test-only helpers (must not be used by runtime code):
export function _resetForTests() { gracefulFlag = false; forceFlag = false; installed = false; }
export function _triggerSigint() {
  // Simulate SIGINT logic without actually raising the signal
  if (gracefulFlag) forceFlag = true;
  else gracefulFlag = true;
}
