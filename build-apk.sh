#!/bin/bash

# Script completo para compilar frontend e gerar APK do AlphaCoach
# Uso: ./build-apk.sh

set -e

echo "🚀 Build Completo: Frontend + APK (AlphaCoach)"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configurar Java 21 (Gradle do Capacitor 8 não suporta Java 25)
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH"

# Garantir Android SDK
if [ -z "$ANDROID_HOME" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

echo -e "${BLUE}☕ Usando Java 21${NC}"
java -version 2>&1 | head -1
echo -e "${BLUE}🤖 ANDROID_HOME=${ANDROID_HOME}${NC}"
echo ""

# 1. Gerar ícones do Android
echo -e "${BLUE}🎨 Step 1/4: Gerando ícones do Android...${NC}"
./generate-icons.sh
echo ""

# 2. Build do Frontend (React/Vite)
echo -e "${BLUE}📦 Step 2/4: Compilando Frontend...${NC}"
npm run build
echo -e "${GREEN}✅ Frontend compilado!${NC}"
echo ""

# 3. Sincronizar com Capacitor
echo -e "${BLUE}🔄 Step 3/4: Sincronizando com Capacitor...${NC}"
npx cap sync android
echo -e "${GREEN}✅ Sincronização concluída!${NC}"
echo ""

# 4. Gerar APK via Gradle
echo -e "${BLUE}🔨 Step 4/4: Gerando APK...${NC}"
echo -e "${YELLOW}⏳ Isso pode demorar alguns minutos...${NC}"
echo ""

cd android
./gradlew assembleDebug --no-daemon
cd ..

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 APK GERADO COM SUCESSO!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo -e "${YELLOW}📱 Localização:${NC}"
    echo "   $APK_PATH"
    echo ""
    echo -e "${YELLOW}📊 Tamanho:${NC} $APK_SIZE"
    echo ""
    echo -e "${YELLOW}📋 Como instalar no celular:${NC}"
    echo "1. Transfira o APK para seu celular (USB, email, WhatsApp)"
    echo "2. No celular, abra o arquivo APK"
    echo "3. Permita 'Instalar de fontes desconhecidas' se solicitado"
    echo "4. Clique em 'Instalar'"
    echo ""

    echo -e "${BLUE}🔍 Abrindo pasta do APK...${NC}"
    open android/app/build/outputs/apk/debug

    echo ""
    echo -e "${GREEN}✨ Build completo!${NC}"
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ ERRO: APK não foi gerado!${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Verifique os erros acima."
    exit 1
fi
