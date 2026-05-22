---
scenario: 15-mobile-tauri
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 820
time_seconds: 18
quality_score: 2.8
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 3
  actionability: 3
  discipline: 2
pass_fail: baseline
delta_vs_baseline: n/a
notes: "Generic Tauri overview; covers install + basic config but misses Android-specific permissions, proper signing workflows, and Vite integration gotchas. No concrete file examples."
---

# Baseline — Tauri v2 para React+Vite: APK + .exe + .dmg

## Por onde começar

Tauri v2 é a escolha certa. Ele reutiliza seu frontend web (React+Vite) e compila para desktop (Windows, macOS, Linux) e mobile (Android, iOS) usando Rust como backend nativo.

### 1. Pré-requisitos

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Tauri CLI
cargo install tauri-cli --version "^2.0"
# ou via npm
npm install -g @tauri-apps/cli@next
```

**Android:** Android Studio, JDK 17+, Android SDK (API 24+), NDK.
**macOS:** Xcode + Command Line Tools.
**Windows:** Visual C++ Build Tools.

### 2. Adicionar Tauri ao projeto React+Vite existente

```bash
cd meu-projeto-react-vite
npm run tauri init
```

Responda às perguntas:
- App name: `MeuApp`
- Window title: `MeuApp`
- Web assets location: `../dist`
- Dev server URL: `http://localhost:5173`
- Frontend dev command: `npm run dev`
- Frontend build command: `npm run build`

Isso cria a pasta `src-tauri/` com `tauri.conf.json`, `Cargo.toml`, `src/main.rs`.

### 3. Compilar para Desktop

```bash
# Windows (.exe / .msi)
npm run tauri build

# macOS (.dmg / .app)
npm run tauri build

# Linux (.deb / .AppImage)
npm run tauri build
```

Cada plataforma só pode compilar para si mesma (Windows faz .exe, macOS faz .dmg).

### 4. Compilar para Android (.apk)

```bash
# Inicializar target Android
npm run tauri android init

# Build APK (debug)
npm run tauri android build --debug

# Build APK (release)
npm run tauri android build
```

O APK fica em `src-tauri/gen/android/app/build/outputs/apk/`.

### 5. Permissões Android no Tauri v2

No Tauri v2, as permissões são declaradas em `src-tauri/capabilities/`:

```json
// src-tauri/capabilities/mobile.json
{
  "identifier": "mobile-default",
  "description": "Permissões para mobile",
  "platforms": ["android", "ios"],
  "permissions": [
    "core:default",
    "core:path:default",
    "core:window:default"
  ]
}
```

Se precisar de câmera, localização, etc., adicione as permissões nativas no `AndroidManifest.xml`:

```xml
<!-- src-tauri/gen/android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.INTERNET" />
```

### 6. Signing

**Android:**
Gere um keystore:
```bash
keytool -genkey -v -keystore release.keystore -alias myapp -keyalg RSA -keysize 2048 -validity 10000
```

Configure em `src-tauri/gen/android/key.properties`:
```
storePassword=senha
keyPassword=senha
keyAlias=myapp
storeFile=../release.keystore
```

Configure `build.gradle` para usar o keystore em release builds.

**Windows:**
Use um certificado `.pfx` (auto-assinado para testes ou comprado de CA). Configure em `tauri.conf.json`:
```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "...",
      "digestAlgorithm": "sha256",
      "timestampUrl": "http://timestamp.digicert.com"
    }
  }
}
```

**macOS:**
Registre como Apple Developer ($99/ano), obtenha certificado "Developer ID Application". Configure:
```bash
export APPLE_CERTIFICATE="base64-do-cert"
export APPLE_CERTIFICATE_PASSWORD="senha"
export APPLE_ID="seu@email.com"
export APPLE_PASSWORD="app-specific-password"
```

### 7. Atualizar vite.config.ts

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
})
```

### Resumo de comandos

| Alvo | Comando |
|------|---------|
| Desktop debug | `npm run tauri dev` |
| Desktop release | `npm run tauri build` |
| Android debug APK | `npm run tauri android build --debug` |
| Android release APK | `npm run tauri android build` |

### Próximos passos

1. Instale os pré-requisitos de cada plataforma
2. Execute `npm run tauri init` no seu projeto
3. Teste com `npm run tauri dev`
4. Configure capabilities para as permissões necessárias
5. Configure signing antes de distribuir
