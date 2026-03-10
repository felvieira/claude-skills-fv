---
name: mobile-tauri
description: |
  Skill OPCIONAL do Mobile/Desktop Developer para criar apps nativos usando Tauri v2. Use quando precisar
  gerar APK Android, executável Windows/macOS/Linux, ou adaptar o frontend web para plataformas nativas.
  Trigger em: "mobile", "Tauri", "APK", "app nativo", "desktop app", "Windows app", "macOS app",
  "Android", "cross-platform", "build nativo", "executável", ".exe", ".dmg", ".deb", ".AppImage",
  "notificação nativa", "file system nativo".
---

# Mobile/Desktop Developer - Tauri v2 (OPCIONAL)

Skill OPCIONAL. Usa Tauri para empacotar o frontend web como app nativo para Android, Windows, macOS e Linux.

## Responsabilidades

1. Configurar projeto Tauri no repositório existente
2. Adaptar frontend para mobile/desktop (navegação, safe areas, responsividade)
3. Gerar builds nativos (APK, .exe/.msi, .dmg, .deb/.AppImage)
4. Configurar permissões nativas com princípio de menor privilégio
5. Implementar features nativas (notificações, file system, shell)
6. Otimizar performance para dispositivos mobile de baixo custo

## Stack

```
Framework:    Tauri v2
Frontend:     Mesmo React/Next.js do projeto web
Side-car:     Rust (via Tauri core)
Build:        Cargo + Tauri CLI
Android:      Tauri Android plugin → APK
Desktop:      Windows (.exe/.msi), macOS (.dmg), Linux (.deb/.AppImage)
```

## Setup

```bash
npm install -D @tauri-apps/cli@latest
npx tauri init
npm install @tauri-apps/api@latest
npm install @tauri-apps/plugin-notification @tauri-apps/plugin-fs @tauri-apps/plugin-shell @tauri-apps/plugin-http
```

## Configuracao Base

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
      "wix": {
        "language": "pt-BR"
      }
    },
    "macOS": {
      "minimumSystemVersion": "10.15"
    },
    "linux": {
      "deb": {
        "depends": ["libwebkit2gtk-4.1-0", "libssl3"]
      }
    }
  },
  "plugins": {
    "notification": {
      "enabled": true
    },
    "fs": {
      "scope": {
        "allow": ["$APPDATA/**", "$DOWNLOAD/**"],
        "deny": ["$HOME/.ssh/**"]
      }
    }
  }
}
```

## Adaptacoes Mobile

### Deteccao de Plataforma

```typescript
import { platform } from '@tauri-apps/plugin-os';

function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

async function getPlatform(): Promise<'android' | 'ios' | 'windows' | 'macos' | 'linux' | 'web'> {
  if (!isTauri()) return 'web';
  const p = await platform();
  return p as 'android' | 'ios' | 'windows' | 'macos' | 'linux';
}
```

### Hook de Navegacao Mobile

```typescript
import { useState, useEffect } from 'react';

interface MobileNavState {
  showBackButton: boolean;
  showBottomNav: boolean;
  showSidebar: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

function useMobileNavigation(): MobileNavState {
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
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}

.app-container {
  padding-top: var(--safe-area-top);
  padding-bottom: var(--safe-area-bottom);
  padding-left: var(--safe-area-left);
  padding-right: var(--safe-area-right);
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

.top-header {
  position: sticky;
  top: 0;
  padding-top: var(--safe-area-top);
  background: white;
  border-bottom: 1px solid #e5e7eb;
  z-index: 50;
}
```

## Comandos de Build

```bash
npx tauri dev

npx tauri build

npx tauri android build --apk

npx tauri android dev
```

## Setup Android

### Pre-requisitos

Android Studio com SDK 33+, NDK 25+, Build Tools 33+. JAVA_HOME apontando para JDK 17.

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export NDK_HOME="$ANDROID_HOME/ndk/25.2.9519653"
export JAVA_HOME="/usr/lib/jvm/java-17-openjdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools"
```

### Init e Build

```bash
npx tauri android init

npx tauri android build --apk
```

O APK gerado fica em `src-tauri/gen/android/app/build/outputs/apk/universal/release/`.

## Features Nativas

### Notificacoes

```typescript
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

async function notify(title: string, body: string): Promise<void> {
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

async function saveData(filename: string, data: Record<string, unknown>): Promise<void> {
  await writeTextFile(filename, JSON.stringify(data, null, 2), {
    baseDir: BaseDirectory.AppData,
  });
}

async function loadData<T>(filename: string): Promise<T | null> {
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

## Checklist Pre-Build

```
Permissoes minimas configuradas (allowlist restritivo)
CSP configurado no tauri.conf.json
Icones gerados para todas as plataformas (32, 128, 256, 512, icns, ico)
Splash screen configurada para Android
Deep links configurados (se aplicavel)
Auto-update configurado para desktop (se aplicavel)
Testado em dispositivo real (Android + desktop)
Performance validada em dispositivo de baixo custo
Fallback offline implementado para features criticas
Assinatura de APK configurada para release
```

## Handoff

### Recebe do Frontend

1. App web funcional com build de producao
2. Assets (icones, splash) em alta resolucao
3. Lista de features que precisam de acesso nativo
4. Variaveis de ambiente documentadas

### Entrega para QA

1. APK de debug e release assinado
2. Executaveis desktop (Windows, macOS, Linux)
3. Lista de permissoes nativas utilizadas e justificativa
4. Instrucoes de instalacao por plataforma
5. Matriz de features nativas vs web (o que funciona em cada)

## Regra de Codigo

Zero comentarios no codigo. Nomes de funcoes, variaveis e tipos devem ser autoexplicativos. Codigo limpo dispensa comentarios.
