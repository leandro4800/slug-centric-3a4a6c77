# ============================================================================
# update-windows.ps1
# Rebuild rapido apos mudancas no codigo (no Windows)
# ============================================================================
# Faz:
#   1. Build do frontend (Vite)
#   2. cap sync android
#   3. Gradle: APK debug (default) OU AAB release assinado (-Prod)
#
# Use:
#   .\update-windows.ps1            # APK debug
#   .\update-windows.ps1 -Prod      # AAB assinado pra Play Store
#
# Pre-requisito: ja ter rodado .\setup-windows.ps1 antes (-Prod se for prod).
# ============================================================================

param(
    [switch]$Prod
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "OK $msg" -ForegroundColor Green }
function Write-Err($msg)  { Write-Host "XX $msg" -ForegroundColor Red }

function Find-Java21 {
    if ($env:JAVA_HOME -and (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
        $ver = & "$env:JAVA_HOME\bin\java.exe" -version 2>&1 | Out-String
        if ($ver -match 'version "21') { return $env:JAVA_HOME }
    }
    $candidates = @(
        "$env:ProgramFiles\Eclipse Adoptium\jdk-21*",
        "$env:ProgramFiles\Java\jdk-21*",
        "$env:ProgramFiles\Microsoft\jdk-21*",
        "$env:ProgramFiles\Zulu\zulu-21*"
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
# Sanity checks
# ---------------------------------------------------------------------------
if (-not (Test-Path "android")) {
    Write-Err "Pasta android/ nao existe. Rode .\setup-windows.ps1 primeiro."
    exit 1
}

$java = Find-Java21
if (-not $java) { Write-Err "JDK 21 nao encontrado. Veja setup-windows.ps1."; exit 1 }
$env:JAVA_HOME = $java
$env:PATH = "$java\bin;$env:PATH"

$sdk = Find-AndroidSdk
if (-not $sdk) { Write-Err "Android SDK nao encontrado."; exit 1 }
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:PATH = "$sdk\platform-tools;$sdk\cmdline-tools\latest\bin;$env:PATH"

if ($Prod -and -not (Test-Path "android\keystore.properties")) {
    Write-Err "android\keystore.properties nao existe."
    Write-Host "Rode .\setup-windows.ps1 -Prod primeiro pra criar a keystore."
    exit 1
}

# ---------------------------------------------------------------------------
# 1) Build do frontend
# ---------------------------------------------------------------------------
Write-Step "Build do frontend (Vite)..."
Remove-Item Env:CAP_DEV -ErrorAction SilentlyContinue
$env:NODE_ENV = if ($Prod) { 'production' } else { 'development' }
npm run build
if ($LASTEXITCODE -ne 0) { Write-Err "Build do frontend falhou"; exit 1 }
Write-OK "Frontend compilado"

# ---------------------------------------------------------------------------
# 2) cap sync
# ---------------------------------------------------------------------------
Write-Step "npx cap sync android..."
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Err "cap sync falhou"; exit 1 }
Write-OK "Sync concluido"

# ---------------------------------------------------------------------------
# 3) Gradle
# ---------------------------------------------------------------------------
Push-Location android
try {
    if ($Prod) {
        Write-Step "Gradle: bundleRelease (AAB assinado)..."
        .\gradlew.bat bundleRelease --no-daemon
    } else {
        Write-Step "Gradle: assembleDebug (APK debug)..."
        .\gradlew.bat assembleDebug --no-daemon
    }
    if ($LASTEXITCODE -ne 0) { Write-Err "Gradle falhou"; exit 1 }
}
finally {
    Pop-Location
}

# ---------------------------------------------------------------------------
# 4) Resultado
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
    Write-Host " Build OK: $out ($size)" -ForegroundColor Green
    Write-Host "===============================================" -ForegroundColor Green
    explorer.exe (Split-Path $out)
} else {
    Write-Err "Saida nao encontrada em $out"
    exit 1
}
