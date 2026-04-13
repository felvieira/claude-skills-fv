# Contribuindo para o Claude Skills Dev Kit

## Licença

MIT — use estas skills em seus projetos, times e ferramentas. Veja o arquivo `LICENSE` na raiz do repositório.

## Barra de Qualidade

Toda contribuição deve ser:

- **Específica** — passos acionáveis, não conselhos vagos
- **Verificável** — critérios de saída claros com evidências
- **Testada em campo** — baseada em workflows reais, não teoria
- **Mínima** — apenas o necessário para guiar o agente

Se uma skill não atende esses quatro critérios, ela não está pronta para merge.

## Estrutura do Repositório

| Diretório   | Conteúdo                                                       |
| ----------- | -------------------------------------------------------------- |
| `skills/`   | Skills completas — cada uma em seu próprio diretório           |
| `policies/` | Regras compartilhadas em Markdown (anti-racionalização, etc.)  |
| `hooks/`    | Scripts Node.js e configuração de hooks do agente              |
| `docs/`     | Documentação, guias de setup e referências de arquitetura      |

## Como Contribuir

1. **Fork** o repositório
2. Crie uma **branch** descritiva: `feat/nova-skill-xyz` ou `fix/corrige-hook-abc`
3. Implemente sua mudança seguindo os formatos abaixo
4. Abra um **Pull Request** com descrição clara do que foi adicionado ou alterado
5. Aguarde review — PRs são avaliados contra a barra de qualidade acima

## Formato de Skills

Cada skill vive em `skills/<nn>-<nome>/SKILL.md` com frontmatter YAML:

```yaml
---
name: nome-da-skill
description: Uma linha descrevendo o objetivo
triggers:
  - "quando o usuário pede X"
  - "quando o agente detecta Y"
---
```

O corpo do arquivo deve conter as seguintes seções:

- **Governança** — quem é responsável, escopo de atuação
- **Quando Usar** — gatilhos e condições de ativação
- **Responsabilidades** — checklist do que a skill deve fazer
- **Anti-Rationalization** — armadilhas comuns que o agente deve evitar
- **Handoff** — quando e como transferir para outro agente ou humano

Para o formato detalhado, consulte `docs/skill-anatomy.md`.

## Formato de Policies

Policies são arquivos Markdown em `policies/`. Cada policy define uma regra compartilhada que pode ser referenciada por múltiplas skills. Mantenha policies curtas, declarativas e sem ambiguidade.

## Formato de Hooks

Hooks são scripts **Node.js ESM** localizados em `hooks/scripts/`. Cada hook deve ser registrado em `hooks/hooks.json` com seu trigger e configuração. Perfis de configuração ficam em `hooks/config.json`.

Exemplo de registro em `hooks/hooks.json`:

```json
{
  "hooks": [
    {
      "name": "meu-hook",
      "script": "hooks/scripts/meu-hook.mjs",
      "trigger": "on-commit"
    }
  ]
}
```

## Referências

- Formato detalhado de skills: `docs/skill-anatomy.md`
- Policies existentes: `policies/`
- Perfis de hooks: `hooks/config.json`
