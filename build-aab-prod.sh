#!/bin/bash

# Gera AAB (Android App Bundle) assinado pra publicar na Play Store
# Uso: ./build-aab-prod.sh

set -e

echo "🚀 Build PRODUÇÃO: AAB assinado (AlphaCoach)"
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

echo -e "${BLUE}📦 Step 2/4: Frontend (produção, sem CAP_DEV)${NC}"
unset CAP_DEV
NODE_ENV=production npm run build
echo -e "${GREEN}✅ Frontend OK${NC}"
echo ""

echo -e "${BLUE}🔄 Step 3/4: Capacitor sync${NC}"
npx cap sync android
echo -e "${GREEN}✅ Sync OK${NC}"
echo ""

echo -e "${BLUE}🔨 Step 4/4: bundleRelease (AAB assinado)${NC}"
echo -e "${YELLOW}⏳ Pode demorar alguns minutos...${NC}"
cd android
./gradlew bundleRelease --no-daemon
cd ..

AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"

if [ -f "$AAB_PATH" ]; then
    AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 AAB GERADO E ASSINADO!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📦 Arquivo:${NC} $AAB_PATH"
    echo -e "${BLUE}📊 Tamanho:${NC} $AAB_SIZE"
    echo ""
    echo -e "${YELLOW}📋 Como publicar na Play Store:${NC}"
    echo "   1. Acesse https://play.google.com/console"
    echo "   2. Selecione o app (ou crie um novo com applicationId 'app.lovable.alphacoach')"
    echo "   3. Vá em Release → Production → Create new release"
    echo "   4. Faça upload do .aab acima"
    echo "   5. Aceite o Play App Signing na primeira vez"
    echo ""
    open android/app/build/outputs/bundle/release
else
    echo -e "${RED}❌ AAB não foi gerado!${NC}"
    exit 1
fi
