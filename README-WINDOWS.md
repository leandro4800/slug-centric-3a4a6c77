# Build do AlphaCoach no Windows

Dois scripts PowerShell pra compilar o app Android no Windows:

- **`setup-windows.ps1`** — rode **uma vez** (primeira configuração)
- **`update-windows.ps1`** — rode **toda vez** que mudar o código

---

## Pré-requisitos (instala uma vez)

Abre o **PowerShell como administrador** e roda:

```powershell
# Node.js LTS
winget install OpenJS.NodeJS.LTS

# JDK 21 (obrigatório — Gradle do Capacitor 8 não suporta Java 22+)
winget install EclipseAdoptium.Temurin.21.JDK

# ImageMagick (pra gerar ícones)
winget install ImageMagick.ImageMagick

# Android Studio (vem com SDK + emulador). Se preferir só o SDK, use cmdline-tools.
winget install Google.AndroidStudio
```

Depois de instalar o Android Studio, abre ele uma vez pra ele baixar o SDK. Confirma que existe a pasta:

```
C:\Users\<você>\AppData\Local\Android\Sdk
```

Se não existir, define a variável `ANDROID_HOME` apontando pro lugar onde o SDK foi instalado:

```powershell
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "$env:LOCALAPPDATA\Android\Sdk", "User")
```

**Fecha e reabre o PowerShell** pra ele pegar a variável nova.

---

## Liberar execução de scripts PowerShell

Por padrão o Windows bloqueia `.ps1`. No PowerShell, roda **uma vez**:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Ou rode os scripts contornando a política:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1
```

---

## Primeira vez — `setup-windows.ps1`

Entra na pasta do projeto e roda:

```powershell
cd C:\caminho\para\slug-centric-3a4a6c77
.\setup-windows.ps1
```

Ele vai:

1. Conferir que Node, Java 21, Android SDK e ImageMagick estão OK
2. `npm install`
3. Build do frontend (Vite)
4. `npx cap add android` (cria a pasta `android\`)
5. Gerar ícones (mipmap) e splash a partir de `resources\icon.png`
6. `npx cap sync android`
7. Build do APK debug

Sai um **APK** em `android\app\build\outputs\apk\debug\app-debug.apk` que você instala direto no celular (USB, email, WhatsApp).

### Variante de produção: `setup-windows.ps1 -Prod`

```powershell
.\setup-windows.ps1 -Prod
```

Faz tudo acima **+** cria a keystore (te pede senha + dados) **+** edita `build.gradle` pra assinar releases **+** gera um **AAB** assinado em `android\app\build\outputs\bundle\release\app-release.aab` pronto pra subir na Play Store.

⚠️ **A senha da keystore — anota num gerenciador de senhas AGORA.** Se perder, você nunca mais consegue atualizar o app na Play Store. O arquivo `alphacoach-release.keystore` também: faz backup em local seguro (Google Drive privado, 1Password, etc).

---

## Atualizações — `update-windows.ps1`

Toda vez que mudar código:

```powershell
.\update-windows.ps1            # rebuild debug
.\update-windows.ps1 -Prod      # rebuild AAB assinado
```

Faz só: build do frontend → cap sync → gradle.

---

## Antes de cada release pra Play Store

Incrementa o `versionCode` em `android\app\build.gradle`:

```gradle
versionCode 1       // vira 2, 3, 4...
versionName "1.0"   // vira "1.0.1", "1.1", etc
```

A Play Store rejeita upload com `versionCode` igual ou menor que o último publicado.

---

## Problemas comuns

### "execution of scripts is disabled on this system"
Você não liberou a execução. Veja a seção "Liberar execução" acima.

### "JDK 21 não encontrado"
O script procura em locais padrão do Windows. Se você instalou em outro lugar, define manualmente antes de rodar:

```powershell
$env:JAVA_HOME = "C:\caminho\para\jdk-21"
.\setup-windows.ps1
```

### "Android SDK não encontrado"
Define o `ANDROID_HOME`:

```powershell
$env:ANDROID_HOME = "C:\caminho\para\Sdk"
.\setup-windows.ps1
```

### Gradle reclama de "Unsupported class file major version"
Você está com Java errado (provavelmente 22+). Instala o JDK 21 (`winget install EclipseAdoptium.Temurin.21.JDK`) — o script força usar essa versão.

### "magick: command not found"
ImageMagick não instalado. Roda `winget install ImageMagick.ImageMagick` e abre um terminal novo. Sem ImageMagick os ícones não são gerados, mas o build do APK continua funcionando (vai usar os ícones padrão do Capacitor).

### Build é muito lento na primeira vez
Normal. Gradle baixa ~500MB de dependências. Da segunda vez em diante é rápido (cache).

---

## Equivalência com os scripts macOS

| macOS | Windows |
|---|---|
| `./build-apk.sh` | `.\update-windows.ps1` |
| `./create-keystore.sh` + `./configure-signing.sh` + `./build-aab-prod.sh` | `.\setup-windows.ps1 -Prod` (primeira vez) + `.\update-windows.ps1 -Prod` |
