"""Audita uma pasta de trabalho em busca de um setup Claude Code existente.

Somente leitura. Nunca modifica nada. Retorna JSON descrevendo o que já
existe, para que a entrevista da skill 78 (business-discovery) pule
perguntas sobre o que já foi construído.

Uso:
    python3 audit_pasta_existente.py [caminho]   # padrao: pasta atual

Saida: JSON formatado no stdout.
"""

import json
import sys
from pathlib import Path


def listar_md(diretorio: Path) -> list[str]:
    if not diretorio.is_dir():
        return []
    return sorted(p.stem for p in diretorio.glob("*.md") if p.is_file())


def listar_subpastas(diretorio: Path) -> list[str]:
    if not diretorio.is_dir():
        return []
    return sorted(p.name for p in diretorio.iterdir() if p.is_dir())


def settings_tem_hooks(caminho: Path) -> bool:
    if not caminho.is_file():
        return False
    try:
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        return bool(dados.get("hooks", {}))
    except Exception:
        return False


def auditar(raiz: Path) -> dict:
    pasta_claude = raiz / ".claude"
    pasta_dados = raiz / "data"
    saida_anterior = raiz / "business_discovery_output"

    claude_md_path = (
        pasta_claude / "CLAUDE.md"
        if (pasta_claude / "CLAUDE.md").is_file()
        else raiz / "CLAUDE.md"
        if (raiz / "CLAUDE.md").is_file()
        else None
    )

    deteccoes = {
        "claude_md": {
            "existe": claude_md_path is not None,
            "caminho": str(claude_md_path.relative_to(raiz)) if claude_md_path else None,
        },
        "settings_json": {
            "existe": (pasta_claude / "settings.json").is_file(),
            "tem_hooks": settings_tem_hooks(pasta_claude / "settings.json"),
        },
        "skills": {
            "quantidade": len(listar_subpastas(pasta_claude / "skills")),
            "nomes": listar_subpastas(pasta_claude / "skills"),
        },
        "agents": {
            "quantidade": len(listar_md(pasta_claude / "agents")),
            "nomes": listar_md(pasta_claude / "agents"),
        },
        "rules": {
            "quantidade": len(listar_md(pasta_claude / "rules")),
            "nomes": listar_md(pasta_claude / "rules"),
        },
        "namespaces_dados": listar_subpastas(pasta_dados),
        "rodada_anterior": {
            "existe": (saida_anterior / "mapa_dados.json").is_file(),
            "caminho": (
                str((saida_anterior / "mapa_dados.json").relative_to(raiz))
                if (saida_anterior / "mapa_dados.json").is_file()
                else None
            ),
        },
    }

    tem_algo = (
        deteccoes["claude_md"]["existe"]
        or deteccoes["settings_json"]["existe"]
        or deteccoes["skills"]["quantidade"] > 0
        or deteccoes["agents"]["quantidade"] > 0
        or deteccoes["rules"]["quantidade"] > 0
        or len(deteccoes["namespaces_dados"]) > 0
        or deteccoes["rodada_anterior"]["existe"]
    )
    modo = "auditoria-existente" if tem_algo else "greenfield"

    pular_perguntas = []
    if deteccoes["skills"]["quantidade"] > 0 or deteccoes["agents"]["quantidade"] > 0:
        pular_perguntas.append("Você já usa Claude Code ou alguma IA no negócio?")
    for nome in deteccoes["skills"]["nomes"]:
        nome_lower = nome.lower()
        if "financ" in nome_lower or "cfo" in nome_lower:
            pular_perguntas.append("Você já tem um bot financeiro?")
        if "marketing" in nome_lower or "cmo" in nome_lower:
            pular_perguntas.append("Você já tem um bot de marketing?")
        if "orchestrator" in nome_lower or "orquestrador" in nome_lower:
            pular_perguntas.append("Você já tem um orquestrador (chefe de gabinete)?")
    if deteccoes["rodada_anterior"]["existe"]:
        pular_perguntas.append("Rodada anterior encontrada — retomar em vez de recomeçar.")

    return {"modo": modo, "deteccoes": deteccoes, "pular_perguntas": pular_perguntas}


def main():
    raiz = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()
    print(json.dumps(auditar(raiz), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
