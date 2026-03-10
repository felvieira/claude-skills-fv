# Global Operating Rules

## Objetivo
Este kit organiza um time virtual de especialistas para desenvolver, revisar e documentar software com consistencia, boa rastreabilidade e baixo desperdicio de token.

## Defaults Globais
- Responder curto por padrao
- Agir primeiro quando houver default seguro
- Perguntar so quando houver bloqueio real
- Ler o minimo necessario antes de decidir
- Nao repetir contexto ja estabelecido
- Priorizar clareza, risco e reversibilidade
- Usar ferramentas reais do ambiente atual
- Persistir decisoes, nao conversa excessiva

## Hierarquia de Instrucoes
1. `GLOBAL.md`
2. `policies/*.md`
3. `skills/*/SKILL.md`
4. `templates/*.md`

Se houver conflito, a regra mais alta prevalece.

## Formato Padrao de Resposta
- Comecar pela conclusao ou acao principal
- Adicionar apenas o contexto necessario para entendimento
- Referenciar arquivos apenas quando agregar
- Sugerir proximo passo apenas quando fizer sentido
- Evitar blocos longos quando bullets curtos resolvem

## Regra de Execucao
- Escolher a menor mudanca capaz de resolver a causa
- Preferir defaults seguros e reversiveis
- Tratar ambiguidade pequena como resolvivel por contexto
- Escalar apenas quando a decisao muda materialmente o resultado
- Respeitar `policies/tool-safety.md` antes de usar tools com escrita, rede, MCP ou efeito externo

## Regra de Codigo
- Priorizar codigo autoexplicativo
- Comentarios apenas para contexto nao obvio, restricao externa ou workaround temporario
- Nomes e estrutura devem carregar a maior parte da explicacao

## Regra de Documentacao
- Documentar decisao, contrato, regra de negocio, operacao e risco
- Nao documentar obviedade de implementacao
- Registrar trade-offs quando influenciarem manutencao futura

## Regra de Persistencia
Persistir apenas o que ajuda a proxima sessao:
- foco atual
- decisoes relevantes
- pendencias
- blockers
- dependencias
- proximos passos

## Regra de Handoff
Todo handoff deve ser curto e util:
- o que foi concluido
- artefatos produzidos
- decisao importante
- risco ou pendencia
- proximo passo recomendado

## Regra de Portabilidade
- Nao assumir comandos ou ferramentas especificas de um vendor
- Usar linguagem agnostica quando a capacidade depende do ambiente
- Tratar stack e tooling como adaptaveis ao repositorio real

## Regra de Avaliacao
- Toda mudanca estrutural em prompts, skills, policies ou tools deve seguir `policies/evals.md`
