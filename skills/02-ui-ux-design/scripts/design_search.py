#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Busca BM25 nos catálogos de decisão de UI/UX (data/*.csv) -- estilos, cores,
tipografia, ícones, gráficos, padrões de landing, motion/GSAP, guidelines de
UX/acessibilidade, performance de React, e 21 stacks de frontend/desktop.

Adaptado de nextlevelbuilder/ui-ux-pro-max-skill (MIT) -- o motor de busca
(design_search_core.py) é near-verbatim; este wrapper CLI é mais enxuto que o
`search.py` original, que também gera e persiste um design system completo
(--design-system/--persist/--variance/--motion/--density). Essa parte não foi
portada porque a skill 02 já toma essa decisão em prosa, guiada por contexto
do projeto -- portar o gerador duplicaria a mesma decisão de dois jeitos
diferentes no kit. Use este script só para CONSULTAR os catálogos.

Uso:
    python design_search.py "glassmorphism dashboard" --domain style
    python design_search.py "time series with many points" --domain chart
    python design_search.py "focus trap modal" --domain ux
    python design_search.py "useEffect cleanup" --stack react
    python design_search.py "dark mode palette saas" --domain color
    python design_search.py "font pairing editorial serif" --domain typography
    python design_search.py "hamburger menu icon" --domain icons
    python design_search.py "scroll reveal" --domain gsap --json

Domínios: style, color, chart, landing, product, ux, typography, icons, gsap,
          react, web, google-fonts
Stacks:   react, nextjs, vue, svelte, astro, swiftui, react-native, flutter,
          nuxtjs, nuxt-ui, html-tailwind, shadcn, jetpack-compose, threejs,
          angular, laravel, javafx, wpf, winui, avalonia, uno, uwp

Sem resultado não é "sem dado" -- é "a query não bateu no índice". A skill 02
deve tratar isso como sinal pra tentar palavras diferentes antes de cair no
julgamento genérico, e dizer explicitamente que não achou match na base
quando isso acontecer (ver texto de erro do format_output abaixo).
"""

import argparse
import json as json_module
import sys
import io

sys.path.insert(0, __file__.rsplit("/", 1)[0].rsplit("\\", 1)[0])
from design_search_core import CSV_CONFIG, AVAILABLE_STACKS, MAX_RESULTS, UNTRUNCATED_COLS, search, search_stack

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

TRUNCATE_AT = 300


def format_output(result, full=False):
    if "error" in result:
        return f"Error: {result['error']}"

    output = []
    if result.get("stack"):
        output.append("## Design Search — Stack Guidelines")
        output.append(f"**Stack:** {result['stack']} | **Query:** {result['query']}")
    else:
        output.append("## Design Search — Results")
        domain_note = result["domain"]
        if result.get("auto_detected"):
            domain_note += " (auto-detected"
            if result.get("runner_up_domain"):
                domain_note += f", runner-up: {result['runner_up_domain']}"
            domain_note += ")"
        output.append(f"**Domain:** {domain_note} | **Query:** {result['query']}")
    output.append(f"**Source:** {result['file']} | **Found:** {result['count']} results\n")

    if result["count"] == 0:
        redirect = result.get("redirect")
        if redirect:
            output.append(
                "This legacy style label is now modeled in the "
                f"`{redirect['domain']}` domain as `{redirect['id']}`. "
                "Search that domain instead."
            )
            return "\n".join(output)
        output.append(
            "No matches. This means the query did NOT hit the database -- it is "
            "not an empty-value match. Retry with broader/different keywords "
            "before falling back to general design judgment, and say explicitly "
            "that no database match was found if you do fall back."
        )
        suggestions = result.get("suggestions") or []
        if suggestions:
            output.append(f"**Closest known terms:** {', '.join(suggestions)}")
        return "\n".join(output)

    for i, row in enumerate(result["results"], 1):
        output.append(f"### Result {i}")
        for key, value in row.items():
            value_str = str(value)
            if not full and key not in UNTRUNCATED_COLS and len(value_str) > TRUNCATE_AT:
                value_str = value_str[:TRUNCATE_AT] + "..."
            output.append(f"- **{key}:** {value_str}")
        output.append("")

    return "\n".join(output)


def main():
    p = argparse.ArgumentParser(description="Busca BM25 nos catálogos de decisão de UI/UX do kit")
    p.add_argument("query", help="Termo de busca")
    p.add_argument("--domain", "-d", choices=list(CSV_CONFIG.keys()), help="Domínio a buscar (auto-detectado se omitido)")
    p.add_argument("--stack", "-s", choices=AVAILABLE_STACKS, help="Busca específica de stack, ignora --domain")
    p.add_argument("--max-results", "-n", type=int, choices=range(1, 21), default=MAX_RESULTS, metavar="1-20")
    p.add_argument("--json", action="store_true", help="Saída em JSON")
    p.add_argument("--full", action="store_true", help="Não truncar valores longos de campo")
    args = p.parse_args()

    if args.stack:
        result = search_stack(args.query, args.stack, args.max_results)
    else:
        result = search(args.query, args.domain, args.max_results)

    if args.json:
        print(json_module.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(format_output(result, full=args.full))


if __name__ == "__main__":
    main()
