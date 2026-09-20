"""Renderiza o mapa_dados.json da skill 78 (business-discovery) em HTML.

Gera um HTML autocontido (CSS e dado embutidos, sem dependencia externa)
com 4 abas: o que voce tem hoje, fluxo de dados (Sankey em SVG), o que
vamos construir, e o plano de 30 dias.

Uso:
    python3 renderizar_mapa.py --input mapa_dados.json --output mapa_dados.html

Nao depende de nenhuma biblioteca externa (so stdlib) -- todo o HTML e
montado por concatenacao de string com escape manual, sem template engine.
"""

import argparse
import html
import json
import sys
from pathlib import Path

CORAL = "#E07A4F"
CARVAO = "#1a1a1a"
BRANCO_QUENTE = "#faf8f5"


def esc(valor) -> str:
    return html.escape(str(valor if valor is not None else ""))


def badge_status(status: str) -> str:
    mapa = {"tenho": "check", "falta": "warn", "oportunidade": "flag"}
    icone = {"check": "OK", "warn": "?", "flag": "!"}
    classe = mapa.get(status, "warn")
    return f'<span class="badge badge-{classe}">{icone[classe]}</span>'


def render_card_despensa(item: dict) -> str:
    nome = esc(item.get("nome", "?"))
    formato = esc(item.get("formato", ""))
    frequencia = esc(item.get("frequencia", ""))
    volume = esc(item.get("volume_amigavel", ""))
    paga_sem_usar = item.get("paga_sem_usar", False)
    status = "oportunidade" if paga_sem_usar else "tenho"
    aviso = '<div class="aviso">Você paga por isso e quase não usa</div>' if paga_sem_usar else ""
    return f"""
    <div class="card">
      {badge_status(status)}
      <h4>{nome}</h4>
      <div class="tags"><span class="tag">{formato}</span><span class="tag">{frequencia}</span></div>
      <div class="volume">{volume}</div>
      {aviso}
    </div>"""


def render_card_generico(item: dict, titulo_campo: str, subtitulo_campo: str) -> str:
    titulo = esc(item.get(titulo_campo, "?"))
    subtitulo = esc(item.get(subtitulo_campo, ""))
    return f"""
    <div class="card">
      {badge_status("tenho")}
      <h4>{titulo}</h4>
      <div class="subtitulo">{subtitulo}</div>
    </div>"""


def render_receita(receita: dict) -> str:
    headline = esc(receita.get("headline", "?"))
    tempo = esc(receita.get("tempo_economizado_por_semana", ""))
    manual_hoje = esc(receita.get("manual_hoje", ""))
    diferenca = esc(receita.get("diferenca_segunda", ""))
    return f"""
    <div class="card card-receita">
      <div class="selo-tempo">{tempo}</div>
      <h4>{headline}</h4>
      <p><strong>Hoje, na mão:</strong> {manual_hoje}</p>
      <p><strong>Segunda que vem:</strong> {diferenca}</p>
    </div>"""


def render_passo_plano(passo: dict, indice: int) -> str:
    titulo = esc(passo.get("titulo_amigavel", f"Passo {indice}"))
    o_que_fazer = esc(passo.get("o_que_fazer", ""))
    por_que = esc(passo.get("por_que", ""))
    funcionando_quando = esc(passo.get("funcionando_quando", ""))
    return f"""
    <div class="passo">
      <div class="passo-numero">{indice}</div>
      <div class="passo-corpo">
        <h4>{titulo}</h4>
        <p>{o_que_fazer}</p>
        <p class="por-que"><em>{por_que}</em></p>
        <p class="check">Como saber que funcionou: {funcionando_quando}</p>
      </div>
    </div>"""


def render_sankey_svg(dados: dict) -> str:
    """Sankey simplificado de 4 colunas: despensa -> bancada -> prato -> interacao."""
    colunas = [
        ("Despensa", dados.get("despensa", []), "nome"),
        ("Bancada de preparo", dados.get("bancada_preparo", []), "nome_exibicao"),
        ("Prato", dados.get("prato", []), "titulo"),
        ("Onde você lê", dados.get("camada_interacao", []), "canal"),
    ]

    largura = 900
    altura = 60 + max((len(c[1]) for c in colunas), default=1) * 70
    largura_coluna = largura / len(colunas)

    svg_parts = [
        f'<svg viewBox="0 0 {largura} {altura}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fluxo de dados">'
    ]

    posicoes = []
    for idx_col, (titulo_col, itens, campo_nome) in enumerate(colunas):
        x = idx_col * largura_coluna + 20
        svg_parts.append(
            f'<text x="{x}" y="24" font-size="13" font-weight="600" fill="{CARVAO}">{esc(titulo_col)}</text>'
        )
        pos_coluna = []
        for idx_item, item in enumerate(itens):
            y = 50 + idx_item * 60
            nome = esc(item.get(campo_nome, "?"))
            largura_caixa = largura_coluna - 40
            svg_parts.append(
                f'<rect x="{x}" y="{y}" width="{largura_caixa}" height="40" rx="6" '
                f'fill="{BRANCO_QUENTE}" stroke="{CORAL}" stroke-width="1.5"/>'
            )
            svg_parts.append(
                f'<text x="{x + 10}" y="{y + 25}" font-size="12" fill="{CARVAO}">{nome}</text>'
            )
            pos_coluna.append((x + largura_caixa, y + 20))
        posicoes.append(pos_coluna)

    for idx_col in range(len(posicoes) - 1):
        origem = posicoes[idx_col]
        destino = posicoes[idx_col + 1]
        if not origem or not destino:
            continue
        for i, (ox, oy) in enumerate(origem):
            dx, dy = destino[i % len(destino)]
            meio_x = (ox + dx) / 2
            svg_parts.append(
                f'<path d="M {ox} {oy} C {meio_x} {oy}, {meio_x} {dy}, {dx} {dy}" '
                f'fill="none" stroke="{CORAL}" stroke-opacity="0.35" stroke-width="8"/>'
            )

    svg_parts.append("</svg>")
    return "".join(svg_parts)


CSS = f"""
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{
  font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
  background: {BRANCO_QUENTE};
  color: {CARVAO};
  line-height: 1.5;
  padding: 24px;
}}
.container {{ max-width: 1000px; margin: 0 auto; }}
h1 {{ font-size: 26px; margin-bottom: 8px; }}
.lead {{ color: #555; margin-bottom: 24px; max-width: 70ch; }}
.tabs {{ display: flex; gap: 4px; border-bottom: 2px solid #ddd; margin-bottom: 24px; flex-wrap: wrap; }}
.tab-btn {{
  background: none; border: none; padding: 10px 16px; cursor: pointer;
  font-size: 14px; color: #777; border-bottom: 3px solid transparent;
}}
.tab-btn.active {{ color: {CORAL}; border-bottom-color: {CORAL}; font-weight: 600; }}
.tab-content {{ display: none; }}
.tab-content.active {{ display: block; }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-bottom: 24px; }}
.secao-titulo {{ font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin: 24px 0 8px; }}
.card {{
  background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 14px;
  position: relative;
}}
.card h4 {{ font-size: 15px; margin: 8px 0 6px; }}
.tags {{ display: flex; gap: 6px; margin-bottom: 6px; }}
.tag {{ background: #f0ede8; font-size: 11px; padding: 2px 8px; border-radius: 10px; color: #666; }}
.volume {{ font-size: 12px; color: #888; }}
.subtitulo {{ font-size: 13px; color: #666; }}
.aviso {{ font-size: 11px; color: {CORAL}; margin-top: 6px; }}
.badge {{
  position: absolute; top: 10px; right: 10px; font-size: 10px; font-weight: 700;
  width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
}}
.badge-check {{ background: #e8f5e9; color: #2e7d32; }}
.badge-warn {{ background: #fff3e0; color: #e65100; }}
.badge-flag {{ background: #ffe8dc; color: {CORAL}; }}
.card-receita {{ border-left: 3px solid {CORAL}; }}
.selo-tempo {{
  display: inline-block; background: {CORAL}; color: #fff; font-size: 11px;
  padding: 2px 10px; border-radius: 10px; margin-bottom: 8px;
}}
.card-receita p {{ font-size: 13px; margin-top: 6px; color: #444; }}
.passo {{ display: flex; gap: 16px; margin-bottom: 20px; }}
.passo-numero {{
  flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; background: {CORAL};
  color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700;
}}
.passo-corpo h4 {{ font-size: 15px; margin-bottom: 4px; }}
.passo-corpo p {{ font-size: 13px; color: #444; margin-bottom: 4px; }}
.por-que {{ color: #888 !important; }}
.check {{ color: #2e7d32 !important; font-weight: 600; }}
.sankey-wrap {{ overflow-x: auto; background: #fff; border-radius: 8px; padding: 16px; }}
"""

JS = """
function abrirAba(id) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelector(`[data-tab="${id}"]`).classList.add('active');
}
"""


def montar_html(dados: dict) -> str:
    negocio = dados.get("negocio", {})
    nome = esc(negocio.get("nome", "Seu negócio"))
    titulo = esc(negocio.get("titulo", f"{nome}, aqui está seu mapa de dados."))
    lead = esc(negocio.get("introducao", ""))

    cards_despensa = "".join(render_card_despensa(i) for i in dados.get("despensa", []))
    cards_bancada = "".join(
        render_card_generico(i, "nome_exibicao", "subtitulo_amigavel") for i in dados.get("bancada_preparo", [])
    )
    cards_prato = "".join(
        render_card_generico(i, "titulo", "agente_amigavel") for i in dados.get("prato", [])
    )
    cards_receitas = "".join(render_receita(r) for r in dados.get("receitas", []))
    passos_plano = "".join(
        render_passo_plano(p, idx + 1) for idx, p in enumerate(dados.get("prioridade_setup", []))
    )
    sankey = render_sankey_svg(dados)

    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mapa de Dados, {nome}</title>
<style>{CSS}</style>
</head>
<body>
<div class="container">
  <h1>{titulo}</h1>
  <p class="lead">{lead}</p>

  <div class="tabs">
    <button class="tab-btn active" data-tab="tab1" onclick="abrirAba('tab1')">O que você tem hoje</button>
    <button class="tab-btn" data-tab="tab2" onclick="abrirAba('tab2')">Fluxo de dados</button>
    <button class="tab-btn" data-tab="tab3" onclick="abrirAba('tab3')">O que vamos construir</button>
    <button class="tab-btn" data-tab="tab4" onclick="abrirAba('tab4')">Seu plano de 30 dias</button>
  </div>

  <div id="tab1" class="tab-content active">
    <div class="secao-titulo">Despensa — seu dado bruto</div>
    <div class="grid">{cards_despensa}</div>
    <div class="secao-titulo">Bancada de preparo — os resumos que o Claude monta pra você</div>
    <div class="grid">{cards_bancada}</div>
    <div class="secao-titulo">Prato — o que chega até você</div>
    <div class="grid">{cards_prato}</div>
  </div>

  <div id="tab2" class="tab-content">
    <p class="lead">Seu dado se move da esquerda pra direita: fontes brutas alimentam resumos semanais, que viram os relatórios que você lê, que chegam nos canais que você usa.</p>
    <div class="sankey-wrap">{sankey}</div>
  </div>

  <div id="tab3" class="tab-content">
    <div class="grid">{cards_receitas}</div>
  </div>

  <div id="tab4" class="tab-content">
    {passos_plano}
  </div>
</div>
<script>{JS}</script>
</body>
</html>"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    caminho_entrada = Path(args.input)
    if not caminho_entrada.is_file():
        print(f"Erro: arquivo de entrada não encontrado: {caminho_entrada}", file=sys.stderr)
        sys.exit(1)

    dados = json.loads(caminho_entrada.read_text(encoding="utf-8"))
    html_final = montar_html(dados)

    caminho_saida = Path(args.output)
    caminho_saida.parent.mkdir(parents=True, exist_ok=True)
    caminho_saida.write_text(html_final, encoding="utf-8")
    print(f"Mapa renderizado em {caminho_saida}")


if __name__ == "__main__":
    main()
