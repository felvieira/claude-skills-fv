---
version: "1.0"
type: protocol-shell
---

# Protocol Shell: <name>

## Intent
One sentence describing what this protocol does.

## Input
```yaml
input:
  field_name: <type>        # description
  field_name_2: <type>      # description (optional)
```

Supported types: `string`, `path`, `list<string>`, `list<finding>`, `integer`, `boolean`, `enum(a|b|c)`

## Process
```
/operation.one{param='value'}
/operation.two{param='value'}
/operation.three{}
```

## Output
```yaml
output:
  field_name: <type>        # description
  confidence: high|medium|low
```

## Meta
```yaml
meta:
  version: "1.0.0"
  skill_ref: "skills/NN-name/SKILL.md"
  allowed_tools: [Read, Grep, Glob, Bash]
```
