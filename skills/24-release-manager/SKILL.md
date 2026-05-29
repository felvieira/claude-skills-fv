---
name: release-manager
description: |
  Skill para coordenar release, versionamento, changelog, release notes, rollout, rollback e comunicacao interna.
  Use quando a mudanca estiver pronta para empacotamento e liberacao controlada.
  Trigger em: "release manager", "coordenar release", "versionamento semver", "changelog", "release notes", "rollout controlado", "comunicacao de release", "tag de versao", "bump de versao", "release candidate".
---

# Release Manager

Profissionaliza a ponta final do fluxo: o que vai sair, como vai sair, como volta se quebrar, e como sera comunicado. Decide o empacotamento e a versao — a promocao gradual em producao e da skill 43 (canary), o deploy tecnico e da skill 07.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/evals.md`, `policies/constitution.md` e `policies/verification-before-completion.md` (toda claim de "deployed/passing" precisa de output verificavel).

### Gate de release contra constituicao

Quando `memory/constitution.md` existe:
- validar gates obrigatorios do eixo Security (SAST, dependency scan, secrets scan executados)
- validar budgets do eixo Performance (latencia p95, custo IA dentro do limite)
- validar coverage minimo do eixo Testing
- recomendar `/analyze` final como gate adicional antes de `/ship`

Bloqueio: se qualquer principio CRITICAL nao satisfeito, **nao prosseguir**. Registrar exception em ADR antes (raramente justificavel).

## Quando Usar

- preparar release: versao, changelog, release notes, plano de rollout/rollback
- consolidar o que entra e o que fica de fora de uma liberacao
- decidir o bump de versao (semver) a partir do conjunto de mudancas
- coordenar a comunicacao (interna + externa) de uma release

## Quando Nao Usar

- substituir Deploy (07) ou Reviewer (11) em validacoes tecnicas
- liberar mudanca sem evidencia minima de qualidade (QA/Security/Reviewer)
- fazer o rollout gradual em si (isso e skill 43-canary)

## Entradas Esperadas

- mudancas aprovadas e mergeadas (lista de PRs/commits desde a ultima tag)
- riscos conhecidos e breaking changes
- estrategia de deploy e stack de observabilidade

## Saidas Esperadas

- versao decidida (semver) com justificativa
- changelog (Keep a Changelog) + release notes (orientadas a usuario)
- runbook de rollout e rollback executavel
- mensagem de comunicacao pronta por canal

## Decisao de versao (SemVer)

`MAJOR.MINOR.PATCH` — a regra e sobre **contrato/API**, nao sobre tamanho do esforco.

| Bump | Quando | Exemplo |
|---|---|---|
| **MAJOR** (x.0.0) | breaking change — quebra quem consome a API/contrato/CLI/schema | remover endpoint, renomear campo de response, mudar assinatura publica |
| **MINOR** (0.x.0) | feature nova retrocompativel | novo endpoint, novo flag opcional, nova capacidade |
| **PATCH** (0.0.x) | bugfix retrocompativel, sem nova feature | corrigir calculo, fix de regressao, ajuste de copy |

- pre-release: `1.4.0-rc.1`, `2.0.0-beta.2` (testavel, nao estavel)
- `0.x.y`: tudo pode quebrar — convencao de pre-1.0
- na duvida entre MINOR e MAJOR: se um consumidor existente quebra ao atualizar sem mudar nada → MAJOR

## Changelog vs Release notes (sao coisas diferentes)

| | Changelog | Release notes |
|---|---|---|
| Audiencia | devs/contribuidores | usuarios/clientes |
| Fonte | commits/PRs | impacto de negocio |
| Formato | [Keep a Changelog](https://keepachangelog.com): Added/Changed/Fixed/Removed/Security | narrativa curta: o que voce ganha |
| Tom | tecnico, factual | benefit-first |

**Changelog (Keep a Changelog):**
```markdown
## [2.4.0] - 2026-05-28
### Added
- Export para CSV no relatorio de vendas (#412)
### Fixed
- Timezone errado no agendamento (#418)
### Security
- Bump de `lib-x` para 3.1.2 (CVE-2026-XXXX)
```

**Release notes (usuario):**
> **v2.4.0 — Exporte seus relatorios.** Agora voce baixa qualquer relatorio de vendas em CSV com um clique. Corrigimos tambem um bug de fuso horario no agendamento.

Gere release notes a partir do changelog, nunca o contrario. Anti-AI-writing (subagent) revisa antes de publicar externamente.

## Runbook de rollout + rollback

**Pre-release (checklist):**
- [ ] todos os PRs do escopo mergeados; nada "quase pronto" pendente
- [ ] QA (05) verde, Security (06) verde, Reviewer (11) aprovou
- [ ] gates da constituicao satisfeitos (se existe)
- [ ] migrations de banco testadas e reversiveis (ou com plano de forward-fix)
- [ ] tag criada (`git tag -a v2.4.0 -m "..."`)
- [ ] rollback testado em staging — saber que funciona ANTES de precisar

**Rollback — decidido ANTES de liberar:**
- gatilho explicito: "se error rate > X% ou p95 > Y ms por Z min → rollback"
- mecanismo: redeploy da tag anterior / feature flag off / `helm rollback` — qual, em quanto tempo (< 5 min)
- migrations: mudanca de schema incompativel NAO faz rollback trivial → exige expand/contract (dual-write), nunca um drop direto numa release que pode voltar

**Promocao gradual:** se o risco e nao-trivial, handoff para skill 43 (canary) em vez de 0→100%.

## Comunicacao

| Canal | Conteudo | Quando |
|---|---|---|
| Slack/Discord #releases (interno) | versao, escopo 1-linha, link do changelog, on-call ciente | no deploy |
| Changelog publico / status page | release notes orientadas a usuario | apos estabilizar |
| Email/in-app (se breaking) | aviso previo de breaking change + janela de migracao | ANTES do MAJOR |

Breaking change sem aviso previo e o pior pesadelo de quem consome. MAJOR sempre comunica antes.

## Anti-padroes frequentes

- bump de versao por "tamanho do trabalho" em vez de impacto no contrato (refactor gigante = PATCH se nada quebra)
- changelog gerado por dump de `git log` cru (mensagens inuteis, ruido)
- rollback "a gente ve na hora" → na hora e tarde, ninguem lembra o comando
- migration destrutiva numa release reversivel → trava o rollback
- release na sexta 18h sem on-call (classico)

## Evidencia de Conclusao

- versao decidida com justificativa de semver
- changelog + release notes prontos (e revisados se forem externos)
- runbook de rollout/rollback registrado, rollback testado em staging
- comunicacao redigida por canal

## Handoff

- **Deploy (07)** executa; **Canary (43)** se for rollout gradual
- **Documenter (10)** publica changelog/notes
- **Observability (20)** confirma que os sinais de gatilho de rollback estao instrumentados
- Seguir `policies/handoffs.md` e, quando util, `templates/release-plan.md`
