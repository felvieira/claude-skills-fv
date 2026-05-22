---
scenario: 15-mobile-tauri
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2100
tokens_out_approx: 1380
time_seconds: 31
quality_score: 4.3
quality_breakdown:
  specificity: 5
  completeness: 4
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.5
notes: "Skill entregou config completa com CSP, safe-areas CSS, hook de plataforma, fs-scope deny-list, checklist pré-build e handoff QA. Baseline não tinha nada disso. Pequena perda em correctness por path Android SDK que varia por SO."
---

# Treatment — Tauri v2 para React+Vite existente: APK + .exe + .dmg

## 1. Instalar dependências

```bash
npm install -D @tauri-apps/cli@latest
npx tauri init
npm install @tauri-apps/api@latest
npm install @tauri-apps/plugin-notification \
            @tauri-apps/plugin-fs \
            @tauri-apps/plugin-shell \
            @tauri-apps/plugin-http
```

Durante o `tauri init`, responda:
- **Web assets location:** `../dist`
- **Dev server URL:** `http://localhost:5173`
- **Frontend dev command:** `npm run dev`
- **Frontend build command:** `npm run build`

---

## 2. tauri.conf.json — configuração completa

```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173"
  },
  "productName": "MeuApp",
  "version": "1.0.0",
  "identifier": "com.empresa.meuapp",
  "app": {
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.suaempresa.com"
    },
    "windows": [
      {
        "title": "MeuApp",
        "width": 1024,
        "height": 768,
        "minWidth": 360,
        "minHeight": 640,
        "resizable": true
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "windows": { "wix": { "language": "pt-BR" } },
    "macOS": { "minimumSystemVersion": "10.15" }
  },
  "plugins": {
    "fs": {
      "scope": {
        "allow": ["$APPDATA/**", "$DOWNLOAD/**"],
        "deny":  ["$HOME/.ssh/**"]
      }
    }
  }
}
```

> **Vite:** atualize `vite.config.ts` para `clearScreen: false` e `server.strictPort: true` — o Tauri CLI depende disso.

---

## 3. Adaptar o frontend para mobile

### Detecção de plataforma

```typescript
// src/lib/platform.ts
import { platform } from '@tauri-apps/plugin-os';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

export async function getPlatform() {
  if (!isTauri()) return 'web';
  return await platform(); // 'android' | 'ios' | 'windows' | 'macos' | 'linux'
}
```

### Safe areas (Android notch / iOS homeIndicator)

```css
/* src/index.css */
:root {
  --safe-top:    env(safe-area-inset-top,    0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left:   env(safe-area-inset-left,   0px);
  --safe-right:  env(safe-area-inset-right,  0px);
}

.app-container {
  padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
  min-height: 100dvh;
}

.bottom-nav {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  padding-bottom: var(--safe-bottom);
}
```

---

## 4. Permissões mobile (capabilities)

No Tauri v2, permissões são declaradas em `src-tauri/capabilities/`:

```json
// src-tauri/capabilities/mobile.json
{
  "identifier": "mobile-default",
  "platforms": ["android", "ios"],
  "permissions": [
    "core:default",
    "notification:default",
    "fs:default"
  ]
}
```

Para permissões nativas Android (câmera, localização, etc.), edite
`src-tauri/gen/android/app/src/main/AndroidManifest.xml` **somente com
o que o app realmente usa** — princípio do menor privilégio:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<!-- Adicione apenas o que o app precisa: -->
<!-- <uses-permission android:name="android.permission.CAMERA" /> -->
<!-- <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" /> -->
```

---

## 5. Build por plataforma

### Pré-requisitos Android

```bash
# Variáveis de ambiente (Linux/macOS — adapte para Windows)
export ANDROID_HOME="$HOME/Android/Sdk"      # Android Studio SDK
export NDK_HOME="$ANDROID_HOME/ndk/25.2.9519653"
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
```

No Windows, configure as mesmas variáveis em Configurações → Variáveis de Ambiente.

```bash
# Init (só uma vez)
npx tauri android init

# APK debug
npx tauri android build --apk --debug

# APK release (sem assinar ainda)
npx tauri android build --apk
```

O APK fica em:
`src-tauri/gen/android/app/build/outputs/apk/universal/release/`

### Desktop

```bash
npx tauri build   # gera .exe/.msi (Windows), .dmg (macOS), .deb/.AppImage (Linux)
```

Cada SO só compila para si mesmo. Para CI multi-plataforma use GitHub Actions com matrix de runners.

---

## 6. Assinatura (signing)

### Android — keystore

```bash
# Gerar keystore (guarde o arquivo em local seguro, fora do repo)
keytool -genkey -v \
  -keystore release.keystore \
  -alias meuapp \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

Crie `src-tauri/gen/android/key.properties` (**não commite este arquivo**):

```properties
storePassword=SUA_SENHA
keyPassword=SUA_SENHA
keyAlias=meuapp
storeFile=../../../release.keystore
```

Adicione `key.properties` ao `.gitignore`.

### Windows — certificado .pfx

```json
// em tauri.conf.json > bundle > windows
"certificateThumbprint": "THUMBPRINT_DO_CERT",
"digestAlgorithm": "sha256",
"timestampUrl": "http://timestamp.digicert.com"
```

Para testes use certificado auto-assinado; para distribuição pública compre de DigiCert/Sectigo.

### macOS — Apple Developer

```bash
# Variáveis de ambiente antes do build
export APPLE_CERTIFICATE="$(base64 -i Developer_ID_Application.p12)"
export APPLE_CERTIFICATE_PASSWORD="senha-do-p12"
export APPLE_ID="seu@email.com"
export APPLE_PASSWORD="app-specific-password"  # gere em appleid.apple.com
export APPLE_TEAM_ID="XXXXXXXXXX"
```

Requer inscrição no Apple Developer Program ($99/ano).

---

## 7. Checklist pré-distribuição

```
[ ] Permissões mínimas configuradas (sem permissões extras no AndroidManifest)
[ ] CSP configurado no tauri.conf.json (sem 'unsafe-eval')
[ ] fs.scope com deny-list ($HOME/.ssh, credenciais)
[ ] Ícones gerados para todos os tamanhos (32, 128, 256, 512, .icns, .ico)
[ ] Testado em dispositivo Android físico (não só emulador)
[ ] Validado em Windows 10 + macOS 13 (versões mínimas alvo)
[ ] key.properties e .p12 no .gitignore
[ ] Auto-update configurado para desktop (se aplicável)
[ ] Performance em Android entry-level validada
```

---

## 8. Handoff para QA/Deploy

Entregue ao próximo:

1. APK debug + release assinado
2. Executáveis `.exe` (Windows) e `.dmg` (macOS)
3. Lista de permissões nativas e justificativa de cada uma
4. Instruções de instalação por plataforma (sideload Android, notarize macOS)
5. Matriz: quais features funcionam em web / Android / desktop

> **Risco principal:** macOS notarization leva 5-30 min após submissão à Apple — não deixe para o dia do release.
