---
skill_id: 25
skill_name: ai-integration-architect
eval_wave: wave3
eval_version: v2.10.1
pass: A
pass_label: baseline_cold
date: 2026-05-22
tokens_in_approx: 420
tokens_out_approx: 480
quality_score: 2.4
quality_breakdown:
  specificity: 2
  completeness: 2
  correctness: 3
  actionability: 3
  discipline: 2
pass_fail: BASELINE
delta_vs_baseline: 0.0
---

# Pass A — Baseline Cold (no skill 25)

## Input

> Preciso adicionar geração de texto via LLM no nosso SaaS de gestão de tarefas — sumarizar descrição da task em 1 linha. Stack: Node.js + Express + SQLite. Provider: OpenAI ou Anthropic. Como planejo, implemento e protejo cost runaway?

## Response Summary

Resposta genérica de assistente. Cobre os pontos básicos:
- escolha de provider (gpt-4o-mini ou claude-haiku) sem justificativa estruturada
- snippet Express inline com SDK direto (sem adapter pattern)
- proteção de custo via `max_tokens` + rate limiting + cache + alertas de dashboard
- segurança: `.env` para API key
- estrutura de arquivos mínima sugerida (2 arquivos)

## Scoring (1–5 cada critério)

| Critério       | Score | Justificativa |
|----------------|-------|---------------|
| specificity    | 2     | Snippet funcional mas sem adapter pattern, sem fallback chain, sem separação de responsabilidades. Prompt inline no controller. |
| completeness   | 2     | Falta: fallback de modelo, observabilidade (logging de tokens/custo), migration SQLite, invalidação de cache, handoffs para outras skills. |
| correctness    | 3     | O código funciona mas viola boas práticas (provider acoplado direto à rota, chave hardcoded no exemplo sem aviso de padrão). |
| actionability  | 3     | Dá para seguir, mas requer decisões não guiadas (quando cachear, o que logar, como invalidar). |
| discipline     | 2     | Sem arquitetura em camadas, sem referência a patterns estabelecidos, sem checklist de segurança, sem estimativa de custo real. |

**Total raw:** 12 / 25  
**Normalizado (÷5):** **2.4**

## Notas do Avaliador

A resposta é adequada para um desenvolvedor iniciante mas insuficiente como saída de um AI Architect. Falta o padrão Adapter + Gateway, fallback chain, observabilidade estruturada, estimativa de custo calculada e security checklist formal. O prompt está embutido inline no controller — antipadrão que dificulta reutilização e teste.
