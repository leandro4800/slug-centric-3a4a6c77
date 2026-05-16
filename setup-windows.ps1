# ============================================================================
# setup-windows.ps1
# Setup completo (PRIMEIRA VEZ) do AlphaCoach Android no Windows
# ============================================================================
# Faz:
#   1. Verifica pre-requisitos (Node, JDK, Android SDK, ImageMagick)
#   2. npm install
#   3. Build do frontend (Vite)
#   4. Adiciona plataforma Android via Capacitor (se ainda nao existir)
#   5. Gera icones e splash
#   6. Sincroniza com Capacitor
#   7. Build do APK debug
#
# Use:
#   .\setup-windows.ps1            # APK debug (testes)
#   .\setup-windows.ps1 -Prod      # tambem cria keystore e configura signing
#
# Se o PowerShell bloquear a execucao:
#   powershell -ExecutionPolicy Bypass -File .\setup-windows.ps1
# ============================================================================

param(
    [switch]$Prod
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Write-Step($msg)    { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)      { Write-Host "OK $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "!! $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host "XX $msg" -ForegroundColor Red }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Find-Java21 {
    # 1) JAVA_HOME ja apontando pra 21
    if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
        $ver = & "$env:JAVA_HOME\bin\java.exe" -version 2>&1 | Out-String
        if ($ver -match 'version "21') { return $env:JAVA_HOME }
    }

    # 2) Localizacoes comuns no Windows
    $candidates = @(
        "$env:ProgramFiles\Eclipse Adoptium\jdk-21*",
        "$env:ProgramFiles\Java\jdk-21*",
        "$env:ProgramFiles\Microsoft\jdk-21*",
        "$env:ProgramFiles\Zulu\zulu-21*",
        "${env:ProgramFiles(x86)}\Java\jdk-21*"
    )
    foreach ($pattern in $candidates) {
        $dir = Get-ChildItem -Path (Split-Path $pattern) -Filter (Split-Path -Leaf $pattern) -ErrorAction SilentlyContinue |
                Select-Object -First 1
        if ($dir) { return $dir.FullName }
    }
    return $null
}

function Find-AndroidSdk {
    if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) { return $env:ANDROID_HOME }
    if ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) { return $env:ANDROID_SDK_ROOT }
    $default = "$env:LOCALAPPDATA\Android\Sdk"
    if (Test-Path $default) { return $default }
    return $null
}

# ---------------------------------------------------------------------------
# 1) Pre-requisitos
# ---------------------------------------------------------------------------
Write-Step "Verificando pre-requisitos..."

if (-not (Test-Command "node")) {
    Write-Err "Node.js nao encontrado. Instale em https://nodejs.org (LTS)."
    exit 1
}
Write-OK "Node $(node -v)"

if (-not (Test-Command "npm")) {
    Write-Err "npm nao encontrado (deveria vir junto com Node)."
    exit 1
}

$java = Find-Java21
if (-not $java) {
    Write-Err "JDK 21 nao encontrado."
    Write-Host "Instale Eclipse Temurin 21 em https://adoptium.net/temurin/releases/?version=21"
    Write-Host "Ou rode no PowerShell: winget install EclipseAdoptium.Temurin.21.JDK"
    exit 1
}
$env:JAVA_HOME = $java
$env:PATH = "$java\bin;$env:PATH"
Write-OK "Java 21 em $java"

$sdk = Find-AndroidSdk
if (-not $sdk) {
    Write-Err "Android SDK nao encontrado."
    Write-Host "Instale o Android Studio (https://developer.android.com/studio)"
    Write-Host "ou apenas o command-line tools, e defina ANDROID_HOME."
    exit 1
}
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:PATH = "$sdk\platform-tools;$sdk\cmdline-tools\latest\bin;$env:PATH"
Write-OK "Android SDK em $sdk"

if (-not (Test-Command "magick")) {
    Write-Warn "ImageMagick nao encontrado."
    Write-Host "Para gerar icones automaticamente, instale com:"
    Write-Host "  winget install ImageMagick.ImageMagick"
    $useMagick = $false
} else {
    $useMagick = $true
    Write-OK "ImageMagick disponivel"
}

# ---------------------------------------------------------------------------
# 2) npm install
# ---------------------------------------------------------------------------
Write-Step "npm install..."
npm install
if ($LASTEXITCODE -ne 0) { Write-Err "npm install falhou"; exit 1 }
Write-OK "Dependencias instaladas"

# ---------------------------------------------------------------------------
# 3) Build do frontend
# ---------------------------------------------------------------------------
Write-Step "Build do frontend (Vite)..."
Remove-Item Env:CAP_DEV -ErrorAction SilentlyContinue
$env:NODE_ENV = if ($Prod) { 'production' } else { 'development' }
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Build do frontend falhou"; exit 1 }
Write-OK "Frontend compilado em dist/"

# ---------------------------------------------------------------------------
# 4) Adicionar Android (se nao existir)
# ---------------------------------------------------------------------------
if (Test-Path "android") {
    Write-Warn "Pasta android/ ja existe, pulando 'cap add android'"
} else {
    Write-Step "Adicionando plataforma Android (npx cap add android)..."
    npx cap add android
    if ($LASTEXITCODE -ne 0) { Write-Err "cap add android falhou"; exit 1 }
    Write-OK "Plataforma Android adicionada"
}

# ---------------------------------------------------------------------------
# 5) Gerar icones e splash
# ---------------------------------------------------------------------------
if ($useMagick) {
    Write-Step "Gerando icones e splash..."
    $src = if (Test-Path "resources\icon.png") { "resources\icon.png" }
           elseif (Test-Path "public\favicon.png") { "public\favicon.png" }
           else { $null }
    $splashSrc = if (Test-Path "resources\splash.png") { "resources\splash.png" } else { $src }

    if (-not $src) {
        Write-Warn "Nenhum icone encontrado (resources\icon.png ou public\favicon.png). Pulando."
    } else {
        $resDir = "android\app\src\main\res"
        $sizes = @{
            "mipmap-mdpi"    = 48
            "mipmap-hdpi"    = 72
            "mipmap-xhdpi"   = 96
            "mipmap-xxhdpi"  = 144
            "mipmap-xxxhdpi" = 192
        }
        foreach ($folder in $sizes.Keys) {
            $size = $sizes[$folder]
            $dir = Join-Path $resDir $folder
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
            magick $src -resize "${size}x${size}" (Join-Path $dir "ic_launcher.png")
            magick $src -resize "${size}x${size}" (Join-Path $dir "ic_launcher_round.png")
        }

        $splashDirs = @(
            "drawable","drawable-port-mdpi","drawable-port-hdpi","drawable-port-xhdpi",
            "drawable-port-xxhdpi","drawable-port-xxxhdpi",
            "drawable-land-mdpi","drawable-land-hdpi","drawable-land-xhdpi",
            "drawable-land-xxhdpi","drawable-land-xxxhdpi"
        )
        foreach ($d in $splashDirs) {
            $dir = Join-Path $resDir $d
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
            magick -size 1024x1024 xc:black $splashSrc -resize 512x512 -gravity center -composite (Join-Path $dir "splash.png")
        }

        # Remove adaptive icons (usamos PNG direto)
        Get-ChildItem -Path $resDir -Recurse -Filter "ic_launcher_foreground.*" -ErrorAction SilentlyContinue |
            Remove-Item -Force -ErrorAction SilentlyContinue
        Remove-Item "$resDir\mipmap-anydpi-v26\ic_launcher.xml" -ErrorAction SilentlyContinue
        Remove-Item "$resDir\mipmap-anydpi-v26\ic_launcher_round.xml" -ErrorAction SilentlyContinue
        Remove-Item "$resDir\drawable\ic_launcher_background.xml" -ErrorAction SilentlyContinue
        Remove-Item "$resDir\drawable-v24\ic_launcher_foreground.xml" -ErrorAction SilentlyContinue
        Remove-Item "$resDir\values\ic_launcher_background.xml" -ErrorAction SilentlyContinue

        Write-OK "Icones e splash gerados"
    }
}

# ---------------------------------------------------------------------------
# 6) cap sync
# ---------------------------------------------------------------------------
Write-Step "npx cap sync android..."
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Err "cap sync falhou"; exit 1 }
Write-OK "Sync concluido"

# ---------------------------------------------------------------------------
# 7) Setup de signing (opcional, com -Prod)
# ---------------------------------------------------------------------------
if ($Prod) {
    Write-Step "Configurando assinatura de release..."

    $keystoreFile = "android\app\alphacoach-release.keystore"
    $keystoreAlias = "alphacoach"

    if (Test-Path $keystoreFile) {
        Write-Warn "Keystore ja existe em $keystoreFile (nao sobrescrevendo)"
    } else {
        Write-Host ""
        Write-Host "Voce vai criar a keystore que assina o app pra Play Store."
        Write-Host "IMPORTANTE: guarde a senha em local seguro (1Password, etc)."
        Write-Host "Se perder a senha, NAO consegue mais atualizar o app na Play."
        Write-Host ""

        $pwd = Read-Host "Senha da keystore (minimo 6 chars)" -AsSecureString
        $pwdPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($pwd))

        $cn = Read-Host "Nome completo (CN)"
        $o  = Read-Host "Organizacao (O)"
        $l  = Read-Host "Cidade (L)"
        $st = Read-Host "Estado (ST)"
        $c  = Read-Host "Pais (2 letras, ex: BR)"

        $dname = "CN=$cn, O=$o, L=$l, ST=$st, C=$c"

        & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v `
            -keystore $keystoreFile `
            -alias $keystoreAlias `
            -keyalg RSA -keysize 2048 -validity 10000 -storetype PKCS12 `
            -storepass $pwdPlain -keypass $pwdPlain `
            -dname $dname
        if ($LASTEXITCODE -ne 0) { Write-Err "Geracao da keystore falhou"; exit 1 }
        Write-OK "Keystore criada em $keystoreFile"

        # keystore.properties
        $props = @"
storePassword=$pwdPlain
keyPassword=$pwdPlain
keyAlias=$keystoreAlias
storeFile=alphacoach-release.keystore
"@
        Set-Content -Path "android\keystore.properties" -Value $props -NoNewline
        Write-OK "android\keystore.properties criado"

        # .gitignore
        $gi = "android\.gitignore"
        if (-not (Test-Path $gi)) { New-Item -ItemType File -Path $gi | Out-Null }
        $giContent = Get-Content $gi -ErrorAction SilentlyContinue
        if ($giContent -notcontains "keystore.properties") { Add-Content $gi "keystore.properties" }
        if ($giContent -notcontains "app/alphacoach-release.keystore") {
            Add-Content $gi "app/alphacoach-release.keystore"
        }
        Write-OK "android\.gitignore atualizado"
    }

    # Patch do build.gradle
    $bg = "android\app\build.gradle"
    $src = Get-Content $bg -Raw
    if ($src -match "signingConfigs") {
        Write-Warn "build.gradle ja tem signingConfigs, pulando"
    } else {
        Copy-Item $bg "$bg.backup"

        $header = @"
def keystorePropertiesFile = rootProject.file('keystore.properties')
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

"@
        $signingBlock = @"
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
"@
        $src = $header + $src
        $src = $src -replace "(android\s*\{\r?\n)", "`$1$signingBlock`r`n"
        $src = $src -replace "(buildTypes\s*\{\s*\r?\n\s*release\s*\{\s*\r?\n)", "`$1            signingConfig signingConfigs.release`r`n"

        Set-Content -Path $bg -Value $src -NoNewline
        Write-OK "build.gradle atualizado (backup em build.gradle.backup)"
    }
}

# ---------------------------------------------------------------------------
# 8) Build do APK / AAB
# ---------------------------------------------------------------------------
Push-Location android
try {
    if ($Prod) {
        Write-Step "Build AAB de RELEASE (assinado)..."
        .\gradlew.bat bundleRelease --no-daemon
    } else {
        Write-Step "Build APK debug..."
        .\gradlew.bat assembleDebug --no-daemon
    }
    if ($LASTEXITCODE -ne 0) { Write-Err "Gradle falhou"; exit 1 }
}
finally {
    Pop-Location
}

# ---------------------------------------------------------------------------
# 9) Resultado
# ---------------------------------------------------------------------------
if ($Prod) {
    $out = "android\app\build\outputs\bundle\release\app-release.aab"
} else {
    $out = "android\app\build\outputs\apk\debug\app-debug.apk"
}

if (Test-Path $out) {
    $size = "{0:N1} MB" -f ((Get-Item $out).Length / 1MB)
    Write-Host ""
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host " SUCESSO! Arquivo gerado:" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    Write-Host " $out ($size)" -ForegroundColor Green
    Write-Host ""
    explorer.exe (Split-Path $out)
} else {
    Write-Err "Saida nao encontrada em $out"
    exit 1
}

Write-Host ""
Write-Host "Pronto. Pra atualizar depois de mudar codigo, rode:" -ForegroundColor Cyan
if ($Prod) {
    Write-Host "  .\update-windows.ps1 -Prod"
} else {
    Write-Host "  .\update-windows.ps1"
}
