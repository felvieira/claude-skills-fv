# Claim Verification Policy

## Princípio

**Nunca afirme que algo funcionou sem evidência observável.**

Se não tem prova — exit code 0, query result, HTTP 200, log line real — escreva
"implementado — verificar com [comando]" em vez de afirmar sucesso.

Este problema não é desonestidade: é o LLM completando padrões plausíveis.
Quando a cadeia de raciocínio aponta pra "deveria ter funcionado", o modelo
escreve o resultado esperado. Sem evidência forçada, o log fica enganoso.

## Evidências aceitas por domínio

| Afirmação | Evidência exigida |
|---|---|
| "Email enviado" | `SELECT status FROM email_queue WHERE id=X` → `sent` |
| "Deploy OK" | `curl -s https://dominio/health` → HTTP 200 ou `docker ps \| grep container` |
| "Teste passou" | Output real do runner (linha "X passing", exit 0) |
| "Migration rodou" | `SELECT version FROM schema_migrations ORDER BY 1 DESC LIMIT 1` |
| "Registro criado/atualizado" | Query de leitura retornando o registro |
| "Credencial válida / logado" | `gh auth status` / `aws sts get-caller-identity` / whoami MCP |
| "Arquivo criado/deletado" | A própria tool Edit/Write é evidência — não precisa de mais |

## Formato correto quando não há evidência

```
# NÃO FAÇA:
✅ Email de boas-vindas enviado para flpchapola@gmail.com

# FAÇA:
📧 Código de envio de email implementado.
   Para confirmar: SELECT id, status FROM email_queue WHERE template_id='welcome' ORDER BY created_at DESC LIMIT 1;
   Só marque como concluído quando status = 'sent'.
```

## Enforcement

Hook ativo: `hooks/scripts/claim-verifier.mjs` (PostToolUse) detecta padrões de
afirmação sem evidência no output após Bash/Edit/Write e injeta lembrete.
Conservador (precisão > cobertura) — só dispara em padrões claros.
Toggle: `hooks/config.json → claim_verifier.enabled: false`.

## Relação com outras policies

- `policies/verification-before-completion.md` — cada phase do pipeline produz
  output verificável ANTES de avançar. Esta policy é a versão micro: cada
  afirmação individual exige evidência, não só phases do pipeline.
- `policies/investigate-first.md` — investigar antes de perguntar. Claim
  verification é o par: verificar antes de afirmar.
- `silent-failure-hunter` (subagent 16) — caça falhas silenciosas no código.
  Esta policy caça afirmações silenciosamente falsas no output do agente.
