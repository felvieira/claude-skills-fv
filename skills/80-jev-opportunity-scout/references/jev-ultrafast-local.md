# jev-ultrafast — Instalado Localmente Neste Ambiente

`browser-use/jev-ultrafast` é um agente de navegador que usa o Jev pra decidir qual elemento clicar/digitar, em vez de um LLM completo em cada passo. Instalado e testado de ponta a ponta nesta sessão.

## Onde está

```
D:\Repos\GERAL\jev-ultrafast\      # o agente
D:\Repos\GERAL\browser-harness\    # dependência, conecta ao Chrome real via CDP
```

## Patch aplicado

O código original tem a URL da API TypeSafe hardcoded (`https://api.typesafe.ai/v1/systemone`), que exige uma chave em waitlist. Patch de duas linhas em `jev_ultrafast/model.py` trocou isso por uma env var com fallback pro valor original:

```python
typesafe_url = os.environ.get("TYPESAFE_API_URL", "https://api.typesafe.ai/v1/systemone")
result = post_json(typesafe_url, os.environ["TYPESAFE_API_KEY"], body)
```

`.env` local aponta `TYPESAFE_API_URL=https://openrouter.ai/api/v1/systemone` e usa a `OPENROUTER_API_KEY` já existente em `~/.dev-team-kit/.env` tanto pra `TYPESAFE_API_KEY` quanto pra `TEXT_MODEL_API_KEY` — nenhuma chave nova precisou ser criada.

## Como rodar

```bash
cd /d/Repos/GERAL/jev-ultrafast
uv run --env-file .env python examples/run.py --url "<url>" --goal "<objetivo em texto>"
```

Ou via biblioteca:

```python
from jev_ultrafast import Agent

with Agent("<url>", "<objetivo>") as agent:
    for state in agent.run():
        print(state["elapsed_ms"], state["status"])
```

## Resultado de teste real

Tarefa: abrir o artigo da Wikipedia sobre os teoremas da incompletude de Gödel.
Resultado: **7.557ms**, 2 ações, URL final correta. Custo de poucas chamadas Jev, fração de centavo no total.

## Pré-requisito de conexão (feito uma vez por máquina)

`browser-harness` precisa que o Chrome permita debugging remoto:
1. Abrir `chrome://inspect/#remote-debugging`, marcar a checkbox.
2. Clicar "Allow" no diálogo que o próprio Chrome mostra na primeira conexão.

Verificar status: `uv run browser-harness --doctor` — deve mostrar `daemon alive` e `active browser connections >= 1`.

**Atenção de segurança:** essa conexão dá acesso ao Chrome de uso pessoal real da máquina, incluindo sessões logadas — não é um browser isolado. `--doctor` mostra a aba ativa real quando conectado, o que serve como confirmação visual do que está exposto.
