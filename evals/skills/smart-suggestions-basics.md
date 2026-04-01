# Eval - Smart Suggestions Basics

## Objetivo
Validar que o Smart Suggestions prioriza corretamente e entrega sugestoes relevantes com justificativa.

## Entrada
- projeto com auditoria existente
- ultima sessao: Backend concluido, QA pendente, bug aberto em autenticacao

## Esperado
- primeira sugestao: resolver bug de autenticacao (blocker / segurança)
- segunda sugestao: rodar QA (passo pendente do pipeline)
- terceira sugestao: outra acao de alto impacto (ex: Security Review)
- cada sugestao com skill sugerida e contexto disponivel

## Evidencias Minimas
- entre 3 e 5 sugestoes listadas
- bug de autenticacao aparece como prioridade 1
- cada sugestao tem skill e justificativa em uma linha

## Casos Limite
- nenhuma auditoria disponivel: sugerir Repo Auditor como primeira acao
- projeto recentemente iniciado sem historico: sugerir PO -> Design Intelligence -> Backend como fluxo base
- usuario menciona deadline amanha: escalar urgencia, eliminar steps opcionais das sugestoes
