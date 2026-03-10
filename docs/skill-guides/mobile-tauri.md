# Mobile Tauri Guide

> Guia auxiliar da skill `15-mobile-tauri`. Consultar apenas quando a tarefa exigir empacotamento nativo, setup de permissoes ou builds desktop/Android detalhados.

---

## Indice

- [Stack e Pre-requisitos](#stack-e-pre-requisitos)
- [Setup Inicial](#setup-inicial)
- [Configuracao Base (tauri.conf.json)](#configuracao-base-tauriconfjson)
- [Adaptacoes Mobile](#adaptacoes-mobile)
- [Features Nativas](#features-nativas)
- [Setup Android](#setup-android)
- [Comandos de Build](#comandos-de-build)
- [Permissoes — Principio de Menor Privilegio](#permissoes--principio-de-menor-privilegio)
- [Checklist Pre-Build](#checklist-pre-build)

---

## Stack e Pre-requisitos

```
Framework:    Tauri v2
Frontend:     Mesmo React/Next.js/Vite do projeto web
Rust:         Instalado via rustup
Build:        Cargo + Tauri CLI
Android:      Android Studio, SDK 33+, NDK 25+, JDK 17
Desktop:      Windows (.exe/.msi), macOS (.dmg), Linux (.deb/.AppImage)
```

### Dependencias do sistema

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update

# Tauri CLI
npm install -D @tauri-apps/cli@latest

# Plugins essenciais
npm install @tauri-apps/api@latest
npm install @tauri-apps/plugin-notification
npm install @tauri-apps/plugin-fs
npm install @tauri-apps/plugin-shell
npm install @tauri-apps/plugin-http
npm install @tauri-apps/plugin-os
```

---

## Setup Inicial

```bash
# Inicializar Tauri em projeto existente
npx tauri init

# Rodar em modo dev (desktop)
npx tauri dev

# Build desktop
npx tauri build

# Inicializar suporte Android
npx tauri android init

# Rodar em Android (emulador ou device)
npx tauri android dev

# Build Android APK
npx tauri android build --apk
```

---

## Configuracao Base (tauri.conf.json)

```json
{
  "$schema": "https://raw.githubusercontent.com/nicogaldamez/tauri-schema/refs/heads/main/tauri.conf.json",
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "frontendDist": "../out",
    "devUrl": "http://localhost:3000"
  },
  "productName": "MeuApp",
  "version": "1.0.0",
  "identifier": "com.empresa.meuapp",
  "app": {
    "security": {
      "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.empresa.com"
    },
    "windows": [
      {
        "title": "MeuApp",
        "width": 1024,
        "height": 768,
        "minWidth": 360,
        "minHeight": 640,
        "resizable": true,
        "fullscreen": false
      }
    ]
  },
  "bundle": {
    "active": true,
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "targets": "all",
    "windows": {
      "wix": { "language": "pt-BR" }
    },
    "macOS": {
      "minimumSystemVersion": "10.15"
    },
    "linux": {
      "deb": { "depends": ["libwebkit2gtk-4.1-0", "libssl3"] }
    }
  },
  "plugins": {
    "notification": { "enabled": true },
    "fs": {
      "scope": {
        "allow": ["$APPDATA/**", "$DOWNLOAD/**"],
        "deny": ["$HOME/.ssh/**"]
      }
    }
  }
}
```

---

## Adaptacoes Mobile

### Deteccao de plataforma

```typescript
import { platform } from '@tauri-apps/plugin-os';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

export async function getPlatform(): Promise<'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'web'> {
  if (!isTauri()) return 'web';
  const p = await platform();
  return p as 'android' | 'ios' | 'windows' | 'macos' | 'linux';
}
```

### Hook de navegacao mobile

```typescript
import { useState, useEffect } from 'react';

interface MobileNavState {
  showBackButton: boolean;
  showBottomNav: boolean;
  showSidebar: boolean;
  safeAreaInsets: { top: number; bottom: number; left: number; right: number };
}

export function useMobileNavigation(): MobileNavState {
  const [state, setState] = useState<MobileNavState>({
    showBackButton: false,
    showBottomNav: false,
    showSidebar: true,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  });

  useEffect(() => {
    async function detect() {
      const p = await getPlatform();
      const isMobile = p === 'android' || p === 'ios';

      setState({
        showBackButton: isMobile,
        showBottomNav: isMobile,
        showSidebar: !isMobile,
        safeAreaInsets: isMobile
          ? { top: 44, bottom: 34, left: 0, right: 0 }
          : { top: 0, bottom: 0, left: 0, right: 0 },
      });
    }

    detect();
  }, []);

  return state;
}
```

### CSS Safe Areas

```css
:root {
  --safe-area-top:    env(safe-area-inset-top,    0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left:   env(safe-area-inset-left,   0px);
  --safe-area-right:  env(safe-area-inset-right,  0px);
}

.app-container {
  padding-top:    var(--safe-area-top);
  padding-bottom: var(--safe-area-bottom);
  padding-left:   var(--safe-area-left);
  padding-right:  var(--safe-area-right);
  min-height: 100dvh;
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: var(--safe-area-bottom);
  background: white;
  border-top: 1px solid #e5e7eb;
  z-index: 50;
}
```

---

## Features Nativas

### Notificacoes

```typescript
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

export async function notify(title: string, body: string): Promise<void> {
  let granted = await isPermissionGranted();

  if (!granted) {
    const permission = await requestPermission();
    granted = permission === 'granted';
  }

  if (!granted) return;

  sendNotification({ title, body });
}
```

### File System

```typescript
import { writeTextFile, readTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';

export async function saveAppData(filename: string, data: unknown): Promise<void> {
  await writeTextFile(filename, JSON.stringify(data, null, 2), {
    baseDir: BaseDirectory.AppData,
  });
}

export async function loadAppData<T>(filename: string): Promise<T | null> {
  try {
    const content = await readTextFile(filename, {
      baseDir: BaseDirectory.AppData,
    });
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
```

---

## Setup Android

### Variaveis de ambiente

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/25.2.9519653"
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools"
```

### Requisitos

- Android Studio instalado
- SDK 33+ instalado via SDK Manager
- NDK 25+ instalado via SDK Manager
- Build Tools 33+ instalado
- JDK 17 configurado no JAVA_HOME

### Build e output

```bash
npx tauri android init
npx tauri android build --apk
```

APK gerado em: `src-tauri/gen/android/app/build/outputs/apk/universal/release/`

---

## Comandos de Build

| Plataforma | Comando | Output |
|------------|---------|--------|
| Dev desktop | `npx tauri dev` | Janela local |
| Build desktop | `npx tauri build` | `.exe`/`.msi`/`.dmg`/`.deb` |
| Dev Android | `npx tauri android dev` | Emulador/device |
| Build Android | `npx tauri android build --apk` | `.apk` |

---

## Permissoes — Principio de Menor Privilegio

```json
{
  "plugins": {
    "fs": {
      "scope": {
        "allow": ["$APPDATA/**"],
        "deny": ["$HOME/.ssh/**", "$HOME/.gnupg/**"]
      }
    },
    "http": {
      "scope": {
        "allow": ["https://api.empresa.com/**"]
      }
    }
  }
}
```

**Regras:**
- Solicitar apenas as permissoes que a feature usa de fato
- Usar escopos restritos no file system (nao `$HOME/**`)
- Nao usar `shell` sem necessidade real
- CSP no `tauri.conf.json` deve listar apenas os dominios necessarios

---

## Checklist Pre-Build

```
Configuracao
☐ CSP configurado no tauri.conf.json
☐ Permissoes minimas (allowlist restritivo)
☐ Identificador correto (com.empresa.app)
☐ Versao atualizada

Assets
☐ Icones gerados para todas as plataformas (32, 128, 256, 512, icns, ico)
☐ Splash screen configurada para Android (se aplicavel)

Android
☐ Variaveis ANDROID_HOME, NDK_HOME e JAVA_HOME configuradas
☐ npx tauri android init executado
☐ APK de release assinado com keystore

Qualidade
☐ Testado em dispositivo real (nao apenas emulador)
☐ Performance validada em dispositivo de baixo custo
☐ Fallback offline implementado para features criticas
☐ Deep links configurados se aplicavel
☐ Auto-update configurado para desktop se aplicavel
```
