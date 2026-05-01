/**
 * prevent-sleep.mjs — cross-OS sleep prevention.
 *
 * macOS:   caffeinate -dimsu
 * Linux:   systemd-inhibit --what=sleep:idle sleep infinity
 * Windows: PowerShell SetThreadExecutionState (ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
 *
 * Fail-silent: if the underlying tool is unavailable, no-ops.
 */

import { spawn } from 'child_process';
import { platform } from 'os';

let proc = null;

export function startPreventSleep() {
  if (proc) return;
  const plat = platform();
  try {
    if (plat === 'darwin') {
      proc = spawn('caffeinate', ['-dimsu'], { stdio: 'ignore', detached: false });
    } else if (plat === 'linux') {
      proc = spawn(
        'systemd-inhibit',
        ['--what=sleep:idle', 'sleep', 'infinity'],
        { stdio: 'ignore', detached: false }
      );
    } else if (plat === 'win32') {
      // PowerShell helper that sets ES_CONTINUOUS | ES_SYSTEM_REQUIRED until killed
      const ps = `
$sig = '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);';
$ets = Add-Type -MemberDefinition $sig -Name 'X' -Namespace 'Win32' -PassThru;
[void]$ets::SetThreadExecutionState(0x80000000 -bor 0x00000001);
while ($true) { Start-Sleep 60 }
`.trim();
      proc = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', ps],
        { stdio: 'ignore', detached: false }
      );
    }
    if (proc) {
      proc.on('error', () => { proc = null; }); // tool not available, fail silent
      proc.unref?.();
    }
  } catch {
    proc = null; // fallback silent
  }
}

export function stopPreventSleep() {
  if (proc && !proc.killed) {
    try { proc.kill(); } catch {}
  }
  proc = null;
}

// Test-only helper.
export function _isActive() { return !!proc; }
