---
scenario: sarif-parsing
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2100
tokens_out_approx: 1450
time_seconds: 18
quality_score: 4.75
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +2.75
notes: "Treatment with static-analysis:sarif-parsing skill (Trail of Bits). Identified npm audit SARIF conversion gap, fingerprint-based dedup, consensus detection, per-tool severity tables, sarif-tools CLI, streaming strategy for large files."
---

# SARIF Aggregation — Treatment (with sarif-parsing skill)

## Agregando 3 SARIF: Semgrep + CodeQL + npm audit

### 0. Pré-requisito: converter npm audit para SARIF

npm audit não gera SARIF nativo. Converter antes de agregar:

```bash
# npm audit nativo não gera SARIF — use @microsoft/sarif-multitool ou:
npm audit --json | npx better-npm-audit --sarif > npmaudit.sarif
# Alternativa: https://github.com/jamesgeorge007/npmaudit-sarif
```

### 1. Validar os 3 SARIF

```bash
for f in semgrep.sarif codeql.sarif npmaudit.sarif; do
  jq -e '.version, .runs' "$f" >/dev/null && echo "OK: $f" || echo "INVALID: $f"
done
```

### 2. Agregar em SARIF único (preservar runs separados)

```python
import json

def aggregate_sarif_files(sarif_paths):
    aggregated = {
        "version": "2.1.0",
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "runs": []
    }
    for path in sarif_paths:
        with open(path) as f:
            sarif = json.load(f)
            aggregated["runs"].extend(sarif.get("runs", []))
    return aggregated

sarif = aggregate_sarif_files(["semgrep.sarif", "codeql.sarif", "npmaudit.sarif"])
with open("aggregated.sarif", "w") as f:
    json.dump(sarif, f, indent=2)
```

Cada `run` mantém `tool.driver.name` original — **nunca usar o filename** para identificar a ferramenta (quando processando o agregado, todos viriam como `aggregated.sarif`).

### 3. Deduplicar cross-tool

Chave de dedup: `(file, line)` — regras de ferramentas diferentes raramente têm o mesmo `ruleId`, então dedup por `ruleId` falha. Agrupe por localização:

```python
def deduplicate_results(sarif):
    seen = set()
    for run in sarif["runs"]:
        unique = []
        for result in run.get("results", []):
            # Estratégia 1: usar fingerprints se disponível
            fp = None
            if result.get("partialFingerprints"):
                fp = tuple(sorted(result["partialFingerprints"].items()))
            elif result.get("fingerprints"):
                fp = tuple(sorted(result["fingerprints"].items()))
            else:
                # Fallback: (ruleId, file, line)
                loc = result.get("locations", [{}])[0]
                phys = loc.get("physicalLocation", {})
                fp = (
                    result.get("ruleId"),
                    phys.get("artifactLocation", {}).get("uri"),
                    phys.get("region", {}).get("startLine")
                )
            if fp not in seen:
                seen.add(fp)
                unique.append(result)
        run["results"] = unique
    return sarif
```

Para detectar **consensus findings** (mesmo arquivo/linha detectado por 2+ tools diferentes):

```bash
# Extrai todos os findings com tool name (do run.tool.driver.name, não do filename)
jq '[.runs[] as $run | $run.results[] | {
  file: .locations[0].physicalLocation.artifactLocation.uri,
  line: .locations[0].physicalLocation.region.startLine,
  rule: .ruleId,
  tool: ($run.tool.driver.name // "unknown")
}] | group_by([.file, .line]) | map(select(length > 1)) | map({
  file: .[0].file, line: .[0].line,
  tools: [.[].tool] | unique,
  rules: [.[].rule] | unique
})' aggregated.sarif
```

Findings com 2+ ferramentas no mesmo `(file, line)` = **alta prioridade** (sinal de consenso).

### 4. Normalizar severidades

| Ferramenta | Nível original | Normalizado |
|---|---|---|
| Semgrep | `error` | Critical |
| Semgrep | `warning` | High |
| Semgrep | `info` | Low |
| CodeQL | `error` | Critical/High (depende da query) |
| CodeQL | `warning` | Medium |
| CodeQL | `note` | Low |
| npm audit | `critical` | Critical |
| npm audit | `high` | High |
| npm audit | `moderate` | Medium |
| npm audit | `low` | Low |

```python
SEVERITY_MAP = {
    "semgrep": {"error": "Critical", "warning": "High", "info": "Low", "note": "Info"},
    "codeql":  {"error": "High", "warning": "Medium", "note": "Low"},
    "npm":     {"critical": "Critical", "high": "High", "moderate": "Medium", "low": "Low"},
}

def normalize_severity(level: str, tool_name: str) -> str:
    tool_key = next((k for k in SEVERITY_MAP if k in tool_name.lower()), None)
    if tool_key:
        return SEVERITY_MAP[tool_key].get(level, "Medium")
    return "Medium"
```

### 5. Gerar relatório executivo

```markdown
# SARIF Aggregated Report — 2026-05-22

**Tools:** Semgrep (N findings), CodeQL (N findings), npm audit (N findings)
**Total bruto:** X | **Após dedup:** Y | **Taxa dedup:** Y/X

## Por severidade (normalizada)
- Critical: N
- High: N
- Medium: N
- Low: N

## Consensus findings (2+ ferramentas, mesmo local)
K findings — prioridade máxima

## Por categoria cross-tool
- sql-injection: N (Semgrep + CodeQL)
- xss: N (Semgrep)
- secret-leak: N
- dependency-vuln (CVE): N (npm audit)

## Top files
1. src/legacy/handler.ts — 14 findings (3 critical)
2. src/db/queries.ts — 9 findings

## Output gerado
- `aggregated.sarif` — compatível com GitHub Security tab / SonarQube
- `dedup.json` — formato estruturado para triagem
- `sarif-report.md` — este relatório
```

### 6. Ferramentas recomendadas

| Caso de uso | Ferramenta |
|---|---|
| Queries rápidas CLI | `jq` |
| Python simples | `pip install pysarif` |
| Relatórios + diff | `pip install sarif-tools` → `sarif summary`, `sarif diff` |
| Validação schema | `sarifweb.azurewebsites.net` |
| Streaming (100MB+) | `pip install ijson` |

```bash
# Com sarif-tools, diff automático vs baseline
sarif diff baseline.sarif aggregated.sarif
# Relatório HTML
sarif html aggregated.sarif > report.html
```

### Guardrails críticos

1. Preservar SARIFs originais — agregar em arquivo novo, nunca sobrescrever
2. Dedup conservador — na dúvida, manter ambas entradas (falso dedup esconde bug)
3. Validar schema antes de processar — SARIF malformado falha silenciosamente em viewers

### Próximo passo

Após `aggregated.sarif` pronto: use `semgrep-triager` para triagem ou skill 06 para validação de segurança final.
