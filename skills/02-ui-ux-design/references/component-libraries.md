# Bibliotecas de Componentes Prontos — detalhe

Abrir só quando for avaliar/configurar uma biblioteca específica. Ver `SKILL.md` para o resumo e critério de quando usar biblioteca pronta.

## Via MCP

`Magic UI MCP` e `React Bits MCP`.

## Via install direto (React 19 + StyleX) — Astryx

[`github.com/facebook/astryx`](https://github.com/facebook/astryx) (MIT, `npm install @astryxdesign/core`), design system open source do Meta com 150+ componentes acessíveis, 7 temas prontos (customizáveis via CSS custom properties, sem fork nem wrapper) e um CLI (`@astryxdesign/cli`) que expõe a mesma documentação para humano e para agente.

**Exigência de stack:** React 19+ e StyleX como peer dependency — não usa Tailwind nem CSS modules internamente, mas aceita override via `className` de qualquer um dos dois.

**Diferencial confirmado** (não é só claim de marketing — verificado no README, no CLI README e no `CLAUDE.md` do próprio repo): o CLI tem `--json` (envelope tipado `{type, data}` com `code` de erro estável e append-only, pensado para branch programático em vez de parsear string de erro), `--dense` (formato comprimido, citado explicitamente como "token-efficient, useful for AI agents"), `astryx search` (busca unificada rankeada entre componente/hook/doc/template) e um `AGENTS.md` auto-injetado que o próprio time testa com uma suíte de "vibe tests" — tarefas que medem se um LLM gera código Astryx correto a partir da doc, inclusive com curva de degradação ao longo de conversas de 10 turnos.

Isso soma a um ponto real de atrito com este kit: `design_search.py` resolve decisão de estilo/paleta/tipografia; Astryx resolve o componente pronto depois que a decisão está tomada — não se sobrepõe, mas não existe integração entre os dois ainda.

**Setup real:** `npm install @astryxdesign/core @astryxdesign/theme-<nome> @stylexjs/stylex` + `npm install -D @astryxdesign/cli` (não é CLI tipo `npx shadcn add` que copia código para o projeto por default — o padrão é import de pacote publicado; ejetar código-fonte de um componente específico para customização profunda existe como comando à parte, `astryx swizzle <Name>`).
