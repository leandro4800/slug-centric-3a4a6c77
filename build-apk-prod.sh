#!/bin/bash

# Gera APK assinado em modo release (instalação direta, não Play Store)
# Pra Play Store use build-aab-prod.sh
# Uso: ./build-apk-prod.sh

set -e

echo "🚀 Build PRODUÇÃO: APK assinado (AlphaCoach)"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH"

if [ -z "$ANDROID_HOME" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

if [ ! -f "android/keystore.properties" ]; then
    echo -e "${RED}❌ android/keystore.properties não existe.${NC}"
    echo "   Rode: ./create-keystore.sh && ./configure-signing.sh"
    exit 1
fi

echo -e "${BLUE}☕ Java 21${NC}"
java -version 2>&1 | head -1
echo ""

echo -e "${BLUE}🎨 Step 1/4: Ícones${NC}"
./generate-icons.sh
echo ""

echo -e "${BLUE}📦 Step 2/4: Frontend (produção)${NC}"
unset CAP_DEV
NODE_ENV=production npm run build
echo ""

echo -e "${BLUE}🔄 Step 3/4: Capacitor sync${NC}"
npx cap sync android
echo ""

echo -e "${BLUE}🔨 Step 4/4: assembleRelease (APK assinado)${NC}"
cd android
./gradlew assembleRelease --no-daemon
cd ..

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 APK assinado gerado!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📱 Arquivo:${NC} $APK_PATH"
    echo -e "${BLUE}📊 Tamanho:${NC} $APK_SIZE"
    echo ""
    open android/app/build/outputs/apk/release
else
    echo -e "${RED}❌ APK não foi gerado (verifique se a keystore.properties está correto).${NC}"
    exit 1
fi
