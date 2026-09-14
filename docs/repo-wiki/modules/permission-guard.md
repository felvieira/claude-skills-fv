# Permission ladder guard

**Caminho:** hooks/scripts/permission-ladder-guard.mjs

## Propósito

Classifica comandos Bash em lanes de permissão e retorna decisão ao hook.

## Entradas e saídas

- **Entradas:** Payload JSON do evento de ferramenta.
- **Saídas:** JSON de continuidade ou bloqueio no stdout.

## Dependências

Configuração do hook, regex da ladder e parsing de segmentos shell.

## Testes

A revisão leu a decomposição e a suíte geral do repositório foi validada; combinações de precedência continuam pendentes.

## Riscos

Regex não substitui parser shell completo; a precedência de regras em comandos compostos exige cobertura adversarial.

## Evidências

[evidence: hooks/scripts/permission-ladder-guard.mjs:116-116]
