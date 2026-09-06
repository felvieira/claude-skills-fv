/**
 * args.mjs — CLI argument parser + help text + exit codes.
 *
 * Centralizes flag definitions so help and parsing don't drift.
 */

export const EXIT_CODES = {
  OK: 0,
  USAGE: 1,
  PERMANENT_ERROR: 2,
  RETRY_EXHAUSTED: 3,
  SAME_ERROR_REPEATED: 4,
  STALL: 5,
  TOKEN_CAP: 6,
  POLISH_INCOMPLETE: 7,
  INTERRUPTED: 130,
  FATAL: 99,
};

const FLAGS_WITH_VALUE = new Set([
  '--max-iterations',
  '--max-tokens',
  '--stop-when',
  '--polish',
  '--agent',
  '--model',
  '--parallel',
]);

const BOOL_FLAGS = new Set([
  '--validate',
  '--no-commit',
  '--push',
  '--verbose',
  '--worktree',
  '--no-prevent-sleep',
]);

/**
 * Parse argv into a structured options object.
 *
 * Tasks: positional args. With `--parallel`, multiple tasks separated by `--`.
 * Example: `--parallel 3 -- task1 -- task2 -- task3`
 *
 * @param {string[]} argv
 * @returns {object} parsed options
 */
export function parseArgs(argv) {
  const opts = {
    tasks: [],
    parallel: 0,
    maxIterations: 0,
    maxTokens: 0,
    stopWhen: '',
    polish: 'standard',
    agent: 'claude',
    // Default stays hardcoded (not env-driven) unless the user opts in via
    // CLAUDE_LOOP_MODEL or --model — models get renamed/retired over time,
    // but forcing an env var on everyone by default would be a bigger
    // behavior change than asked for. --model always wins over the env var.
    model: process.env.CLAUDE_LOOP_MODEL || 'claude-sonnet-4-5',
    validate: false,
    noCommit: false,
    push: false,
    verbose: false,
    worktree: false,
    preventSleep: true,
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];

    // Support --flag=value form by splitting into [flag, value] and shifting.
    if (a.startsWith('--') && a.includes('=')) {
      const eq = a.indexOf('=');
      const flag = a.slice(0, eq);
      const value = a.slice(eq + 1);
      if (FLAGS_WITH_VALUE.has(flag)) {
        argv.splice(i, 1, flag, value);
        a = flag;
      }
    }

    if (a === '--') {
      // separator for parallel tasks
      const rest = argv.slice(i + 1);
      const tasks = splitOnSeparator(rest, '--');
      positional.push(...tasks.filter(Boolean));
      break;
    }

    if (FLAGS_WITH_VALUE.has(a)) {
      const val = argv[++i];
      if (val === undefined) throw new Error(`Flag ${a} requires a value`);
      switch (a) {
        case '--max-iterations': opts.maxIterations = parseInt(val, 10); break;
        case '--max-tokens': opts.maxTokens = parseInt(val, 10); break;
        case '--stop-when': opts.stopWhen = val; break;
        case '--polish':
          if (!['none', 'light', 'standard', 'full'].includes(val)) {
            throw new Error(`Invalid --polish value: ${val}. Use none|light|standard|full`);
          }
          opts.polish = val;
          break;
        case '--agent':
          if (!['claude', 'codex'].includes(val)) {
            throw new Error(`Invalid --agent value: ${val}. Use claude|codex`);
          }
          opts.agent = val;
          break;
        case '--model': opts.model = val; break;
        case '--parallel': opts.parallel = parseInt(val, 10); break;
      }
      continue;
    }

    if (BOOL_FLAGS.has(a)) {
      switch (a) {
        case '--validate': opts.validate = true; break;
        case '--no-commit': opts.noCommit = true; break;
        case '--push': opts.push = true; break;
        case '--verbose': opts.verbose = true; break;
        case '--worktree': opts.worktree = true; break;
        case '--no-prevent-sleep': opts.preventSleep = false; break;
      }
      continue;
    }

    if (a.startsWith('--')) {
      throw new Error(`Unknown flag: ${a}`);
    }

    positional.push(a);
  }

  opts.tasks = positional;

  if (opts.parallel > 0) {
    if (!opts.worktree) {
      throw new Error('--parallel requires --worktree (concurrent runs need isolated working trees)');
    }
    if (opts.parallel > 8) {
      throw new Error('--parallel hard limit is 8');
    }
    if (opts.tasks.length !== opts.parallel) {
      throw new Error(`--parallel ${opts.parallel} requires ${opts.parallel} tasks separated by --, got ${opts.tasks.length}`);
    }
  } else {
    if (opts.tasks.length === 0) {
      throw new Error('Task description is required');
    }
    if (opts.tasks.length > 1) {
      throw new Error('Multiple tasks require --parallel N');
    }
    opts.task = opts.tasks[0];
  }

  return opts;
}

function splitOnSeparator(arr, sep) {
  const out = [];
  let buf = [];
  for (const item of arr) {
    if (item === sep) {
      if (buf.length) out.push(buf.join(' '));
      buf = [];
    } else {
      buf.push(item);
    }
  }
  if (buf.length) out.push(buf.join(' '));
  return out;
}

export function printHelp() {
  console.log(`auto-loop v2 — autonomous coding loop

Usage:
  auto-loop "<task>"                              Run a single task
  auto-loop --worktree --parallel N -- t1 -- t2   Run N tasks in parallel worktrees

Flags:
  --agent claude|codex          Agent to use (default: claude)
  --model <name>                Model name (claude only, default: $CLAUDE_LOOP_MODEL or claude-sonnet-4-5)
  --max-iterations <n>          Cap iterations (default: auto by complexity)
  --max-tokens <n>              Abort when cumulative tokens exceed n
  --stop-when "<condition>"     End loop when agent reports condition met
  --polish none|light|standard|full
                                Quality pass after validation (default: standard)
                                  none     = no polish
                                  light    = simplify only
                                  standard = simplify + review (1 retry)
                                  full     = simplify + review + security + test (3 retries)
  --worktree                    Run in isolated git worktree
  --parallel <n>                Run n tasks concurrently (requires --worktree)
  --no-prevent-sleep            Don't prevent system sleep during run
  --validate                    Run full validation each iteration
  --no-commit                   Skip auto-commit on success
  --push                        Push after commit
  --verbose                     Show full agent output
  -h, --help                    Show this help

Exit codes:
  0    Success
  1    Usage error
  2    Permanent agent error (auth, low credits)
  3    Retry exhausted
  4    Same error repeated (circuit breaker)
  5    Stall detected (no progress)
  6    Token cap reached
  7    Polish incomplete (committed anyway)
  130  Interrupted by user
  99   Fatal error

Examples:
  auto-loop "add JWT auth to /api/users with refresh token"
  auto-loop "refactor payment module" --polish=full --max-tokens 5000000
  auto-loop --worktree --parallel 3 -- "feature A" -- "tests B" -- "refactor C"
  auto-loop "add health check" --agent codex --stop-when "endpoint returns 200"
`);
}
