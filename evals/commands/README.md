# Command Evals

Golden cases for slash commands (not subagents — those live in `evals/protocol-shells/`).

## Layout

Each command has a directory containing `golden.json` with `cases[]`:

```
evals/commands/
├── constitution/golden.json
├── analyze/golden.json
└── checklist/golden.json
```

## Schema

```json
{
  "command": "/name",
  "cases": [
    {
      "id": "short-id",
      "description": "human-readable case description",
      "input": { /* inputs the command receives */ },
      "expected_output_shape": { /* structural expectations */ },
      "expected_console": { /* optional console output expectations */ },
      "expected_artifacts": [ /* files created */ ],
      "expected_exit_code": 0
    }
  ]
}
```

## Adding cases

1. Cover at minimum: happy path, edge case, anti-pattern (3 cases minimum)
2. Reference command file in `.claude/commands/<name>.md`
3. Use `expected_output_shape` for structural assertions (avoid exact-string matching)
4. Mark blocking exit codes explicitly (2 = blocking, 1 = warnings, 0 = clean)

## Running

Manual verification today (no automated runner for command evals yet — TODO).
For automated runner, see `evals/protocol-shells/` pattern.
