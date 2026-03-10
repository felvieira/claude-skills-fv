---
name: repo-auditor
description: |
  Skill de auditoria inicial e continua do repositorio. Use quando precisar mapear stack real, convencoes,
  assets, testes, docs, riscos e pontos de integracao antes de executar outras skills. O resultado deve ser
  persistido em markdown reutilizavel para reduzir releitura e economizar tokens.
---

# Repo Auditor

O Repo Auditor cria uma fotografia operacional do repositorio para que o restante do sistema trabalhe com contexto persistido e enxuto.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/persistence.md`, `policies/token-efficiency.md`, `policies/handoffs.md`, `policies/tool-safety.md` e `policies/evals.md`.

Para auditorias mais completas e revisoes incrementais, consultar `docs/skill-guides/repo-auditor.md` apenas quando necessario.

## Quando Usar

- no primeiro contato com um repositorio
- quando a stack real divergir da stack de referencia do kit
- quando houver duvida sobre convencoes, assets, testes, docs ou risco tecnico
- antes de features grandes, migracoes ou automacoes novas

## Quando Nao Usar

- para reanalisar tudo a cada task sem mudanca relevante
- para substituir investigacao pontual muito localizada

## Entradas Esperadas

- repositorio atual
- estrutura de arquivos e docs existentes
- sinais de stack, tooling, testes, deploy e identidade visual

## Saidas Esperadas

- auditoria curta e reutilizavel em markdown
- resumo executivo para o Orchestrator
- gaps, riscos e recomendacoes priorizadas

## Responsabilidades

1. Detectar stack, framework, ferramentas e convencoes reais do repositorio
2. Identificar documentacao, testes, assets, pipeline e sinais de observabilidade
3. Registrar identidade visual e contexto de imagens quando houver
4. Persistir um resumo operacional reutilizavel para reduzir releitura futura
5. Atualizar a auditoria apenas quando houver mudanca relevante no repositorio
6. Encaminhar para `Asset Librarian` quando o inventario visual precisar de organizacao dedicada

## Arquivo de Persistencia

Persistir em `docs/repo-audit/current.md`.

Se o kit estiver instalado em `.bot/`, persistir em `.bot/docs/repo-audit/current.md`.

Se houver reauditoria relevante, arquivar snapshots curtos em `docs/repo-audit/history/`.

## Quando Reauditar

- auditoria ausente
- auditoria com sinais claros de desatualizacao
- mudanca relevante de stack, assets, testes, deploy ou observabilidade
- reestruturacao grande do repositorio

## Conteudo Minimo da Auditoria

- stack principal e ferramentas detectadas
- estrutura de codigo e docs relevantes
- padroes de auth, testes, deploy e observabilidade
- assets e identidade visual existentes
- riscos, gaps e areas que exigem cuidado extra
- ultima data de revisao

## Estrutura Recomendada do Markdown

Usar `templates/audit.md` como base e manter secoes curtas, atualizaveis e reutilizaveis.

## Regras de Economia de Token

- ler primeiro a auditoria existente antes de explorar o repo novamente
- atualizar apenas as secoes afetadas quando a base nao mudou muito
- evitar revarrer arquivos grandes se a auditoria ainda estiver valida

## Evidencia de Conclusao

- `docs/repo-audit/current.md` criado ou atualizado
- stack e convencoes reais mapeadas
- riscos e gaps principais registrados

## Handoff

Entregar:

- caminho do arquivo de auditoria
- o que foi confirmado
- o que ainda esta incerto
- proxima skill que pode usar a auditoria

Seguir `policies/handoffs.md` e, quando util, `templates/audit.md`.
