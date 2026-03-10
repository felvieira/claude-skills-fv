---
name: llm-selector
description: |
  Skill de recomendação de modelo LLM por tipo de tarefa e complexidade. Sugere qual modelo usar e mostra
  o comando, mas NÃO troca o modelo programaticamente. Use quando precisar decidir qual modelo é mais
  adequado para uma tarefa. Trigger em: "modelo", "llm", "model", "rapido", "balanceado", "profundo",
  "haiku", "sonnet", "opus", "custo", "performance", "qual modelo".
---

# LLM Selector - Recomendação de Modelo por Tarefa

O LLM Selector analisa a tarefa e sua complexidade para recomendar o nível de modelo mais adequado. Ele **sugere e mostra o comando** — a troca deve ser feita manualmente pelo usuário.

## Níveis Genéricos

Os níveis são abstrações independentes de modelo. A tabela abaixo mapeia cada nível ao modelo atual e pode ser atualizada quando novos modelos forem lançados.

| Nível | Quando Usar | Modelo Atual | Comando |
|-------|-------------|-------------|---------|
| Rápido | Boilerplate, formatação, rename, microcopy, gerar skeleton, config, templates, checklists | Haiku 4.5 | `/model haiku` |
| Balanceado | Implementação, testes, integração, debug simples, docs, design, copy | Sonnet 4.6 | `/model sonnet` |
| Profundo | Arquitetura, security review, debug complexo, orquestração, decisões críticas, refactoring grande | Opus 4.6 | `/model opus` |

## Mapeamento Padrão por Skill

| # | Skill | Nível Padrão | Exceções |
|---|-------|-------------|----------|
| 01 | PO Feature Spec | Balanceado | — |
| 02 | UI/UX Design | Balanceado | — |
| 03 | Backend API | Balanceado | Rápido para CRUD simples, Profundo para auth/real-time |
| 04 | Frontend Integration | Balanceado | Rápido para CRUD, Profundo para state machines |
| 05 | QA Testing | Balanceado | — |
| 06 | Security Review | Profundo | — |
| 07 | Deploy Docker | Rápido | — |
| 08 | Context Manager | Rápido | — |
| 09 | Orchestrator | Profundo | — |
| 10 | Documenter | Balanceado | — |
| 11 | Reviewer | Profundo | — |
| 12 | Motion Design | Balanceado | — |
| 13 | Marketing Copy | Balanceado | — |
| 14 | SEO Specialist | Rápido | — |
| 15 | Mobile Tauri | Balanceado | — |

## Overrides de Complexidade

Nem toda tarefa dentro de uma skill tem a mesma complexidade. Use os critérios abaixo para subir ou descer do nível padrão.

### Quando Subir de Nível (Upgrade)

- Tarefa envolve múltiplos módulos ou serviços interagindo
- Decisão de arquitetura com impacto de longo prazo
- Lógica de negócio com muitas regras condicionais
- Segurança ou autenticação envolvida
- Refactoring que afeta mais de 5 arquivos
- Debug que exige raciocínio sobre fluxo entre camadas
- Integração com APIs externas com edge cases

### Quando Descer de Nível (Downgrade)

- Tarefa repetitiva com padrão já estabelecido
- Gerar código a partir de template existente
- Renomear, reformatar ou reorganizar arquivos
- Criar arquivo de config com valores conhecidos
- Gerar checklist ou skeleton de documentação
- Tarefas de copy/microcopy simples
- CRUD básico seguindo padrão do projeto

### Exemplos Práticos

| Tarefa | Skill Padrão | Nível Padrão | Override | Nível Final |
|--------|-------------|-------------|----------|-------------|
| CRUD de usuários | Backend (03) | Balanceado | Downgrade (padrão repetitivo) | Rápido |
| Auth com JWT + refresh token | Backend (03) | Balanceado | Upgrade (segurança) | Profundo |
| Componente de botão | Frontend (04) | Balanceado | Downgrade (template) | Rápido |
| State machine de checkout | Frontend (04) | Balanceado | Upgrade (lógica complexa) | Profundo |
| Dockerfile padrão | Deploy (07) | Rápido | — | Rápido |
| Multi-stage build com secrets | Deploy (07) | Rápido | Upgrade (complexidade) | Balanceado |
| Review de PR simples | Reviewer (11) | Profundo | Downgrade (PR pequeno) | Balanceado |
| Auditoria OWASP completa | Security (06) | Profundo | — | Profundo |

## Formato de Saída

Ao recomendar um modelo, sempre usar este formato:

```
Recomendacao: [Nivel] ([Modelo])
Comando: /model [modelo]
Motivo: [razao curta]
```

### Exemplos

```
Recomendacao: Rapido (Haiku 4.5)
Comando: /model haiku
Motivo: CRUD simples seguindo padrao existente do projeto
```

```
Recomendacao: Balanceado (Sonnet 4.6)
Comando: /model sonnet
Motivo: Implementacao de feature com testes e integracao
```

```
Recomendacao: Profundo (Opus 4.6)
Comando: /model opus
Motivo: Decisao de arquitetura com impacto em multiplos modulos
```

## Sobre os Níveis e Modelos

Os três níveis (Rápido, Balanceado, Profundo) são **categorias genéricas de capacidade**. Os modelos mapeados a cada nível representam a configuração atual e **devem ser atualizados** quando novos modelos forem lançados.

Para atualizar o mapeamento:

1. Identificar o novo modelo e sua categoria de capacidade
2. Atualizar a tabela de Níveis Genéricos com o novo modelo e comando
3. Testar a recomendação com tarefas de cada nível
4. Os overrides de complexidade permanecem válidos independente do modelo

O que **não muda** com novos modelos:

- Os três níveis de complexidade
- Os critérios de quando usar cada nível
- O mapeamento padrão por skill
- As regras de upgrade/downgrade

O que **muda** com novos modelos:

- O nome do modelo em cada nível
- O comando `/model` correspondente
- Possíveis ajustes nos limiares de complexidade se a diferença entre modelos diminuir

## Código Limpo

Todo código gerado sob orientação desta skill segue a regra de zero comentários. Código autoexplicativo através de nomes descritivos e estrutura clara.

## Integração com Pipeline

- **Orquestrador (skill 09):** Pode consultar esta skill antes de delegar tarefas para escolher o modelo ideal
- **Context Manager (skill 08):** Rastreia qual modelo foi usado em cada tarefa para análise de custo/benefício
