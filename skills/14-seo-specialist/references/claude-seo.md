# claude-seo no Claude Code — integração sob demanda

Fonte: [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo/tree/v2.4.2), versão revisada **v2.4.2**, licença [MIT](https://github.com/AgriciDaniel/claude-seo/blob/v2.4.2/LICENSE), Copyright 2026 agricidaniel. Esta referência não distribui o código do plugin. Verifique release, permissões e scripts antes de instalar versão futura.

## Escolher o caminho

| Pedido | Com plugin ativo no Claude Code | Sem plugin / outro cliente |
|---|---|---|
| Auditoria de site com URL e escopo autorizado | `/seo audit https://exemplo.com` | Skill 14: revisar apenas páginas/arquivos acessíveis; não alegar crawl completo |
| Uma página, SEO técnico ou dados estruturados | `/seo page <url>`, `/seo technical <url>`, `/seo schema <url>` | Analisar conteúdo e HTML observado; validar com ferramentas disponíveis |
| Negócio local, produto ou idiomas | `/seo local <url>`, `/seo ecommerce <url>`, `/seo hreflang <url>` | Checklists da skill 14 + evidência fornecida; não inventar GBP/feed/cobertura internacional |
| Google, drift ou agentes | `/seo google ...`, `/seo drift ...`, `/seo agentic ...` | Sem credenciais, baseline ou ferramenta de medição, marcar capacidade ausente |

A skill 14 continua sendo a entrada geral agnóstica. O plugin oficial fornece comandos próprios, 26 skills e 19 agentes **somente quando instalado e ativo na sessão**; não adicionar `/seo` ao kit nem copiar habilidades upstream. Uma recomendação de comando não significa que foi executado.

## Habilitar conscientemente (Claude Code)

1. Em projeto cujo domínio você pode auditar, confira se já existe: `claude plugin list` no terminal ou `/plugin` no Claude Code; só considere ativo se `/seo doctor` estiver disponível **na sessão atual**.
2. Para instalar o plugin oficial, após revisar [instalação upstream](https://github.com/AgriciDaniel/claude-seo/blob/v2.4.2/docs/INSTALLATION.md) e [hooks](https://github.com/AgriciDaniel/claude-seo/blob/v2.4.2/hooks/hooks.json), dentro do Claude Code:

   ```text
   /plugin marketplace add AgriciDaniel/claude-seo
   /plugin install claude-seo@agricidaniel-claude-seo
   /seo doctor
   ```

3. Se o doctor apontar runtime ausente, e **só com opt-in para instalação de dependências**, rodar `/seo setup` (Python 3.10+, preferência 3.11+, venv isolado; Playwright Chromium opcional para renderização SPA). Depois `/seo doctor` novamente e `/seo audit <url>` para domínio autorizado. Setup e extensão MCP/API keys nunca fazem parte da instalação normal do kit.
4. Verificar dados e escopo: crawling pode visitar muitas URLs, acesso GSC/GA4 exige autorização e credenciais próprias; resultados de Google/Mapas/links pagos dependem de API/extensão habilitada. Não prometer PDF ou dado real sem ferramenta/credencial operacional.

**Custo de ativação:** o plugin registra `PostToolUse` para **todo** `Edit|Write`, inclusive mudanças não SEO; seu hook Node aciona uma verificação Python. Isso pode adicionar latência ou erro se o runtime faltar. Instalar somente nos projetos/sessões que realmente precisarão de auditoria profunda; não ativar globalmente no instalador do kit. O marketplace segue o upstream, portanto revisar alterações antes de atualizar. `seo-cockpit` e MCPs opcionais são separados, não pressupostos.

Se a instalação falhar ou `/seo` não aparecer após reconectar a sessão, não simular subagentes nem rerodar setup à força: usar a skill 14 com os insumos disponíveis e declarar as lacunas. Para desinstalar, usar `/plugin uninstall claude-seo@agricidaniel-claude-seo` e, se a fonte não servir mais a outros plugins, `/plugin marketplace remove AgriciDaniel/claude-seo` conforme [guia upstream](https://github.com/AgriciDaniel/claude-seo/blob/v2.4.2/docs/INSTALLATION.md).
