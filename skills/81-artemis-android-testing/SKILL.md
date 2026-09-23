---
name: artemis-android-testing
description: |
  Testa um app Android real (debug build, APK local, ou app já instalado) no emulador usando
  google/artemis — agente que executa a tarefa em linguagem natural (navegar, tocar, preencher
  campo, verificar texto na tela) via Accessibility Helper + Gemini, sem escrever um teste
  instrumentado. Usa a instalação local já configurada em D:\Repos\GERAL\artemis, com
  GEMINI_API_KEY já presente no .env e emulador Medium_Phone_API_36.0 disponível.
  Trigger em: "testa esse apk no emulador", "roda isso no artemis", "abre o emulador e testa",
  "verifica isso no android", "testa a tela de", "no celular", "simula um usuário tocando",
  "testa no emulador com IA", "funcionando no android antes de", "antes de dar merge",
  "antes de commitar", "testa esse app no celular".
allowed-tools: Bash, Read, Grep, Glob
metadata:
  argument-hint: "<tarefa em linguagem natural> [--apk caminho.apk] [--profile flash|pro]"
---

# Artemis Android Testing — Testar App Real no Emulador via Linguagem Natural

Executa uma tarefa de teste manual — "abre a tela de login e verifica que o botão Entrar aparece",
"preenche o formulário de cadastro e confirma que salva" — contra um emulador Android real, usando
[google/artemis](https://github.com/google/artemis) já instalado e configurado localmente em
`D:\Repos\GERAL\artemis`. Não escreve teste instrumentado (Espresso/UIAutomator) nem faz assert de
código: o Artemis interage com a tela como um usuário faria e reporta se conseguiu, com gravação de
vídeo da sessão.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/tool-safety.md`.

**Regra de escopo: verificação exploratória, não substituto de teste automatizado no CI.** Esta skill
serve para checar rapidamente durante o desenvolvimento ("será que essa tela funciona?"), não para
suíte de regressão versionada — isso continua sendo Espresso/Compose Test/Detox no próprio projeto do
app. Se o usuário pedir "adiciona isso como teste permanente", isso é trabalho da skill 37
(tdd-engineer) ou do stack de teste nativo do projeto, não desta skill.

**Regra de pré-requisito, não de instalação.** Esta skill assume que `D:\Repos\GERAL\artemis` já está
clonado, com `uv sync` feito e `GEMINI_API_KEY` configurada no `.env` (ver
`references/setup-local.md` para como isso foi feito e como verificar). Se o ambiente não existir
neste PC, a skill para e informa o comando de setup — não tenta clonar/instalar sozinha sem
confirmação, porque isso envolve obter uma API key de conta do usuário (ação sensível, ver
`references/setup-local.md`).

## Quando Usar

- o usuário pede pra testar uma tela, fluxo, ou comportamento de um app Android num emulador
- existe um APK local (debug build recém-gerado) ou um app já instalado no emulador que precisa de
  verificação manual antes de commitar/dar prosseguimento
- o usuário quer confirmar visualmente que uma mudança de UI funciona no Android sem abrir o
  emulador manualmente e tocar a tela ele mesmo

## Quando Nao Usar

- teste de regressão que deve rodar no CI a cada PR — isso é Espresso/UIAutomator/Compose Test
  nativo do projeto, não Artemis (Artemis é mais lento e depende de LLM, não serve pra pipeline)
- app iOS — Artemis é Android-only nesta instalação (Accessibility Helper é um APK)
- teste de unidade ou de lógica de negócio sem UI — nada a ver com Artemis
- o ambiente `D:\Repos\GERAL\artemis` não existe neste PC e o usuário não confirmou que quer
  configurar do zero (setup de chave de API é ação sensível, precisa de confirmação explícita)

## Entradas Esperadas

- a tarefa em linguagem natural (obrigatório): o que verificar/fazer na tela
- opcionalmente, caminho de um APK local pra instalar antes de rodar (`--apk` ou "instala esse apk
  e testa")
- opcionalmente, `--profile pro` quando o usuário quer verificação mais rigorosa com checkpoint
  (mais lento); padrão é `flash` (reativo, rápido)
- opcionalmente, nome do pacote pra restringir o agente a um app específico (`--locked-app`)

## Saidas Esperadas

- resultado da tarefa (sucesso/falha) com a explicação que o Artemis reportou
- caminho do vídeo da sessão (`recording.mp4`) e da trace completa, para o usuário revisar o que
  aconteceu tela a tela
- se falhar: o turno onde travou e o motivo reportado pelo log, não só "não funcionou"

## Protocolo

### 1. Confirmar pré-requisitos antes de rodar

```bash
# Emulador ligado?
"$HOME/AppData/Local/Android/Sdk/platform-tools/adb.exe" devices
```

Se não aparecer nenhum device com status `device`:

```bash
"$HOME/AppData/Local/Android/Sdk/emulator/emulator.exe" -avd Medium_Phone_API_36.0 -no-snapshot-load &
```

Aguardar o boot (tipicamente 20-40s) e checar `adb devices` de novo antes de prosseguir — não
disparar a tarefa do Artemis contra um device que ainda não terminou de bootar.

Se o app precisa ser instalado (APK local fornecido e ainda não presente no device), a própria flag
`--app-path` do `artemis run` instala antes de começar — não instalar manualmente com `adb install`
separado, deixar o Artemis fazer no mesmo comando.

### 2. Rodar a tarefa

```bash
cd /d/Repos/GERAL/artemis && uv run --env-file .env artemis run "<tarefa em linguagem natural>" --profile flash
```

Com APK local:

```bash
cd /d/Repos/GERAL/artemis && uv run --env-file .env artemis run "<tarefa>" --profile flash --app-path "<caminho/do/apk.apk>"
```

Restringindo a um app específico (evita o agente navegar pra outro app por engano):

```bash
cd /d/Repos/GERAL/artemis && uv run --env-file .env artemis run "<tarefa>" --profile flash --locked-app com.exemplo.app
```

Rodar em background (`run_in_background`) quando a tarefa for longa — não bloquear esperando com
`timeout` curto, porque tarefas reais de UI levam mais que os 2 minutos padrão do Bash e cortar no
meio produz um falso negativo (o processo continua rodando, só a leitura do resultado que corta).

### 3. Ler o resultado real, não confiar só no exit code

O CLI pode retornar rápido mesmo com a tarefa ainda enfileirada no daemon (mensagem
"⏳ Task queued in scheduler, waiting for device..."). O resultado confiável está na trace:

```bash
cd /d/Repos/GERAL/artemis && ls -ltd traces/*/ | head -3
```

A pasta mais recente, com sufixo `_PASS_<timestamp>` ou `_FAIL_<timestamp>` depois de terminar, tem
o `stdout.log` com o passo a passo real e `recording.mp4` com o vídeo da sessão. Ler o log procurando
por:
- `✅ Automation '<id>' is success` — tarefa completou
- `Executing Flash tool: report_task_status({'status': 'completed', 'explanation': ...})` — a
  explicação final que o Artemis deu sobre o que viu na tela
- qualquer linha com `❌` ou `Authentication Error` — falha real a diagnosticar, não um problema de
  device

### 4. Reportar ao usuário

Sempre incluir: resultado (sucesso/falha), a explicação textual que o Artemis reportou sobre o que
viu, e o caminho do `recording.mp4` para quem quiser assistir a sessão.

## Diagnóstico Rápido de Falha

| Sintoma no log | Causa real | Fix |
|---|---|---|
| `⏳ Task queued in scheduler, waiting for device...` que nunca avança | Quase sempre **não é** o device — ler `traces/<id>/stdout.log` da sessão, o erro real geralmente é auth | Ver linha abaixo |
| `Authentication Error: Planner requires GOOGLE_API_KEY in .env` | `GEMINI_API_KEY`/`GOOGLE_API_KEY` ausente, vazia, ou o daemon (`artemis ui`/`artemis run`) foi iniciado ANTES da chave existir no `.env` e nunca recarregou | Confirmar `.env` tem a chave (`grep GEMINI_API_KEY .env`), depois `uv run artemis stop` e reiniciar — daemon não recarrega env em caliente |
| `Failed to start scrcpy recording: [WinError 2]` | `scrcpy`/`ffmpeg` não instalados ou não estão no PATH da sessão que iniciou o daemon | `winget install Gyan.FFmpeg Genymobile.scrcpy` (ver `references/setup-local.md`); reiniciar o daemon numa sessão que já tenha o PATH atualizado |
| `No such option: --with-video-recording` | Nome de flag errado | É `--with-video-recording-tools` / `--without-video-recording-tools` |
| Nenhum device em `adb devices` | Emulador não está de pé | Iniciar `emulator.exe -avd Medium_Phone_API_36.0 -no-snapshot-load`, aguardar boot completo |

## Anti-Padroes

- rodar `artemis run` com `timeout` curto do Bash e reportar "travou" sem checar a trace — o corte é
  do shell, não do Artemis; a tarefa pode ter completado normalmente em background
- reinstalar/reconfigurar o ambiente do zero quando o erro real é só o daemon precisar de restart
  para pegar uma env var nova
- prometer suporte a iOS — esta instalação e esta skill são Android-only
- tentar obter ou trocar a `GEMINI_API_KEY` sozinha sem o usuário ter confirmado explicitamente qual
  chave usar (ação de credencial, fora do escopo de qualquer skill deste kit)

## Evidencia de Conclusao

- tarefa executada contra o emulador real (não simulada/assumida)
- resultado lido da trace real (`stdout.log`), não só do retorno do CLI
- caminho do `recording.mp4` e da pasta de trace informados ao usuário

## Handoff

### Recebe de

- Usuário pedindo verificação manual de tela/fluxo Android durante desenvolvimento
- Skill 04 (Frontend Engineer) ou equivalente mobile, depois de implementar uma tela, antes de dar
  como concluído

### Entrega para

- **Skill 37 (tdd-engineer)** — se o usuário decidir que a verificação deve virar teste automatizado
  permanente no CI, isso é convertido para Espresso/Compose Test/Detox nativo, não repetido via
  Artemis
- Usuário final: resultado + vídeo, para decisão de continuar ou corrigir

Seguir `policies/handoffs.md`.

## Integracao com Pipeline

- **Frontend Engineer / mobile (04):** consultar depois de implementar uma tela Android, antes de
  marcar a tarefa como concluída, quando houver emulador disponível
- **Orchestrator (09):** roteia para cá quando o pedido for verificação visual/funcional num
  emulador Android já configurado, não criação de teste automatizado permanente

## Fontes

Mecanismo desta skill (protocolo de invocação, diagnóstico de falha, comandos) escrito para este kit
a partir da instalação e depuração reais feitas nesta sessão — não existe upstream equivalente.
[google/artemis](https://github.com/google/artemis) (Apache-2.0) é a ferramenta subjacente, instalada
localmente em `D:\Repos\GERAL\artemis`; ver `references/setup-local.md` para o setup completo
(dependências, `.env`, emulador, Accessibility Helper, `scrcpy`/`ffmpeg`).
