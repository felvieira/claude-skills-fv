# Setup Local do Artemis — Como Foi Feito Nesta Máquina

Documenta o setup real feito e validado numa sessão real, para reproduzir em outra máquina ou
diagnosticar o que já está configurado nesta.

## 1. Clone + dependências

```bash
git clone https://github.com/google/artemis.git D:\Repos\GERAL\artemis
cd D:\Repos\GERAL\artemis
uv sync
```

`uv sync` instala dezenas de dependências (LangGraph, uiautomator2, etc.) — puramente Python, sem
passo manual extra.

## 2. `.env` — chave de API

```bash
cp .env.example .env
```

Depois preencher `GEMINI_API_KEY=` (ou `GOOGLE_API_KEY=`) com uma chave real do
[Google AI Studio](https://aistudio.google.com/apikey).

**Ponto crítico de arquitetura do Artemis** (`artemis/config/settings.py`): o Planner exige
literalmente `GOOGLE_API_KEY` internamente (`artemis/config/llm.py`, `provider == "google"` checa
`settings.GOOGLE_API_KEY`), mas `settings.py` já faz fallback automático:

```python
if not self.GOOGLE_API_KEY:
    if self.GEMINI_API_KEY:
        self.GOOGLE_API_KEY = self.GEMINI_API_KEY
```

Ou seja, preencher só `GEMINI_API_KEY` é suficiente — não precisa duplicar nos dois campos.

**Obtenção de chave é ação sensível.** Nunca copiar uma chave de API existente do usuário sem ele
apontar explicitamente qual usar (múltiplas chaves na mesma conta podem ter faturamento pós-pago
ativo, ligadas a outros projetos). Se o usuário pedir pra "criar uma chave nova" via automação de
browser, esteja ciente que o Google AI Studio pode bloquear a criação com
`"The request is suspicious. Please try again."` quando detecta automação — não insistir tentando
contornar; pedir que o usuário clique manualmente ou aponte uma chave já existente.

## 3. Emulador Android

Requer Android Studio + SDK já instalado (`%LOCALAPPDATA%\Android\Sdk`), com pelo menos um AVD
criado. Nesta máquina, o AVD é `Medium_Phone_API_36.0`.

```bash
"$HOME/AppData/Local/Android/Sdk/emulator/emulator.exe" -avd Medium_Phone_API_36.0 -no-snapshot-load &
```

Confirmar boot completo:

```bash
"$HOME/AppData/Local/Android/Sdk/platform-tools/adb.exe" devices
# esperado: emulator-5554	device
```

## 4. Accessibility Helper (uma vez por emulador/device)

```bash
cd D:\Repos\GERAL\artemis && uv run --env-file .env artemis helper install --serial emulator-5554
```

Instala um APK helper *no device* (não no PC) que expõe a hierarquia de UI ao Artemis. Precisa
rodar de novo se o emulador for recriado do zero (snapshot novo sem o helper).

## 5. `scrcpy` + `ffmpeg` (gravação de vídeo da sessão)

Sem isso, cada `artemis run` falha silenciosamente em gravar vídeo (`Failed to start scrcpy
recording: [WinError 2]`) — a tarefa continua funcionando, só não gera `recording.mp4`.

```powershell
winget install --accept-package-agreements --accept-source-agreements Gyan.FFmpeg Genymobile.scrcpy
```

**Pegadinha real encontrada nesta sessão:** o `winget install` funciona, mas o `winget.exe` em si
pode não estar no `PATH` do shell atual mesmo com o pacote `Microsoft.DesktopAppInstaller`
instalado (falha com `winget: command not found` no Bash, ou `CommandNotFoundException` no
PowerShell) — nesse caso chamar o binário pelo caminho completo:

```powershell
& "$env:LOCALAPPDATA\Microsoft\WindowsApps\winget.exe" install ...
```

**Segunda pegadinha:** mesmo depois de instalado, `scrcpy` pode não resolver no PATH da sessão atual
(o alias fica em `WindowsApps`, propagado só em sessões novas do Windows). O daemon do Artemis
(`artemis ui` ou `artemis run`, que sobem um processo persistente na porta 8000) herdam o PATH de
quando foram iniciados — **reiniciar o daemon numa sessão que já tenha o PATH atualizado é
obrigatório**, só reiniciar o comando de teste não basta se o daemon continuar de pé com o PATH
antigo:

```bash
cd D:/Repos/GERAL/artemis && uv run artemis stop
# nova sessão de shell, ou export PATH manual apontando pro diretório real do scrcpy:
export PATH="/c/Users/<user>/AppData/Local/Microsoft/WinGet/Packages/Genymobile.scrcpy_Microsoft.Winget.Source_8wekyb3d8bbwe/scrcpy-win64-v4.1:$PATH"
uv run --env-file .env artemis run "<tarefa>" --profile flash --with-video-recording-tools
```

O comando `artemis run` sozinho (sem `artemis ui` rodando antes) já sobe um daemon de API na porta
8000 automaticamente se nenhum estiver ativo — não precisa necessariamente rodar `artemis ui`
primeiro só para testar uma tarefa via CLI.

## 6. Limitação conhecida: build da UI Angular (Showcase)

`artemis ui` tenta recompilar a UI Angular do Showcase (`apps/showcase_ui/`) a cada start quando
detecta mudança de fonte. Nesta máquina, esse build falhou com um erro interno do Node
(`ERR_INTERNAL_ASSERTION`, race condition em `@babel/core` via `@angular/build`/esbuild) — bug
conhecido de certas combinações de versão do Node com esse toolchain, não relacionado ao Artemis em
si. **Isso não impede `artemis run` via CLI** (o servidor de API na porta 8000 sobe independente da
UI Angular), só a interface web de acompanhamento visual fica sem build atualizado. Se a UI web for
necessária, o fix é isolado ao toolchain Node/Angular (versão do Node, cache do `node_modules`), não
ao Artemis.

## Checklist de verificação rápida

```bash
# 1. Emulador de pé?
adb devices

# 2. Chave configurada?
grep GEMINI_API_KEY D:/Repos/GERAL/artemis/.env

# 3. Daemon rodando e saudável?
cd D:/Repos/GERAL/artemis && uv run artemis status
```
