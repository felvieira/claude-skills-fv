---
title: Avaliação do padrão agentskills.io
date: 2026-05-27
type: inspiration-evaluation
status: pending-decision
target-version: 2.20.0
---

# Avaliação — padrão `agentskills.io`

## Contexto

[mukul975/Anthropic-Cybersecurity-Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills) (Apache-2.0) — 10.6k stars, 754 cybersecurity skills — declara compatibilidade com o padrão `agentskills.io`. O índice raiz é um `index.json` agregado que outras tools (Claude Code, GitHub Copilot, Codex CLI, Cursor, Gemini CLI, etc) podem ler pra descobrir as skills sem ler 754 SKILL.md individuais.

## O padrão (resumo do que observamos)

`index.json` na raiz do repo, formato:

```json
{
  "version": "1.1.0",
  "generated_at": "ISO-8601",
  "repository": "https://github.com/.../",
  "domain": "cybersecurity",
  "total_skills": 754,
  "skills": [
    {
      "name": "<slug>",
      "description": "<linha de description>",
      "domain": "<domínio>",
      "path": "skills/<slug>"
    }
  ]
}
```

- **Plano**: skills listadas como array (não árvore)
- **Metadado mínimo**: nome, description, domínio, path
- **Auxiliares**: `mappings/` apontando pra frameworks externos (MITRE, NIST, OWASP) — opcional
- **Ferramentas**: `tools/` pra scripts de validação/geração

## Análise vs nosso layout

| Aspecto | Nosso layout | `agentskills.io` | Custo de adoção |
|---------|--------------|------------------|-----------------|
| Estrutura | `skills/NN-name/SKILL.md` (numeradas) | `skills/<slug>/` (não numeradas) | Baixo — slugs já existem |
| Frontmatter | `name`, `description`, `argument-hint`, `allowed-tools` | Inferido de SKILL.md | Zero — nossos campos cobrem |
| Index | (nenhum agregado) | `index.json` na raiz | **Baixo — gerar via script** |
| Mappings | (informal — frontmatter `inspired-by`) | `mappings/<framework>/` | Médio — se quisermos adotar MITRE/OWASP |
| Cross-platform | Específico Claude Code + OpenCode | Claude/Copilot/Codex/Cursor/Gemini | Alto valor se outras tools adotarem |

## Compatibilidade

Compatível por construção:
- Nossas skills já têm slugs (`NN-name` → slug `name`)
- Description já existe no frontmatter
- "Domain" pode ser inferido por área (engineering / qa / sec / etc) ou pela faixa numérica

Incompatibilidades menores:
- Numeração `NN-` é nossa, não do padrão. Decisão: manter (governance value) e expor slug sem prefixo no `index.json`
- Nossa pasta `skills/` mistura skills com agents/commands — `index.json` deveria expor só skills

## Benefício de adotar

1. **Descoberta cross-platform**: se Cursor/Copilot/Gemini adotarem o standard, nosso kit fica descoberto sem porta separada
2. **Validation**: existem (provavelmente) ferramentas que validam conformidade — útil em CI
3. **Marketing**: badge "agentskills.io compatible" no README

## Custo de adoção

Mínimo. Um script (~80 linhas, zero-dep) que:
1. Lê `skills/NN-*/SKILL.md`
2. Parseia frontmatter
3. Gera `index.json` na raiz seguindo schema
4. Roda em `git pre-commit` ou release script

Não exige mudar nada nas SKILL.md existentes.

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Padrão evoluir / morrer | Gerar como **output secundário** — não substituir nosso formato canônico |
| Schema mudar | Encapsular geração em 1 script — refactor único |
| Falsa expectativa de portabilidade total | Skills do kit dependem de policies/, GLOBAL.md, hooks — padrão não captura isso. Documentar limites |

## Decisão pendente

**Não adotar ainda na v2.19.0** (esta sessão de absorção).

**Diferir para v2.20.0+:**
- avaliar maturidade do padrão (quem mais adota além do mukul975?)
- se adotar, implementar como **output secundário** (script gera `index.json`, formato canônico segue `skills/NN-*/SKILL.md`)
- não trocar estrutura interna

**Sinais pra acelerar:**
- 2+ outras tools (não Claude) declararem suporte
- Anthropic incluir no padrão oficial em `docs.claude.com`
- pedido explícito de usuário do kit

## Próximos passos (se/quando adotar)

1. Criar `scripts/generate-agentskills-index.mjs`
2. Adicionar `index.json` ao `.gitignore` E ao processo de release (gera no `npm pack` equivalente)
3. Adicionar badge no `README.md`
4. Adicionar entrada no `WIKI.md` (Mode 1 / Mode 2 / Mode 3 ganha "Mode 4: via agentskills.io discovery")

## Referências

- mukul975 repo (referência operacional): https://github.com/mukul975/Anthropic-Cybersecurity-Skills
- (especulado) domínio principal: https://agentskills.io
- Nossa skill 35 (skill-author): valida nosso formato — extender pra também validar conformidade `agentskills.io` se adotarmos
