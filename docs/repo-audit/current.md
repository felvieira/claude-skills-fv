# Repo Audit

- Revisão estática: 2026-10-30. O kit reúne 90 skills, 16 papéis de subagent, 48 commands e 65 policies; a skill 16 permanece reservada.
- Estrutura: `GLOBAL.md`, `policies/`, `skills/`, `agents/`, `commands/`, `hooks/`, `scripts/`, `templates/`, `evals/` e guias sob demanda. O MCP fica em `mcp-server/`.
- Integração: Claude e Codex têm plugin; Grok possui perfil de memória adaptado; OMP pode descobrir skills pelo diretório nativo. O carregamento efetivo e os hooks dependem do host e da configuração. Consultar `docs/skill-guides/agent-compatibility.md`.
- Evidência: consistência, roteamento e fixtures de gatilhos são verificáveis por scripts locais. Testes simulados não comprovam inferência real ou disponibilidade de ferramentas em todos os hosts.
- Riscos: descrições extensas têm custo de contexto variável por host; mudanças de CLI e configuração devem ser verificadas na instalação real. Não transformar ausência de eventos de telemetria em prova de ausência de uso.
