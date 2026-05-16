#!/bin/bash

# Script para criar keystore para assinar APK/AAB de release (Play Store)
# Uso: ./create-keystore.sh

set -e

echo "🔐 Criando Keystore para Assinar Release (AlphaCoach)"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Java 21 para o keytool ser consistente com o resto do build
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH"

KEYSTORE_DIR="android/app"
KEYSTORE_NAME="alphacoach-release.keystore"
KEYSTORE_PATH="$KEYSTORE_DIR/$KEYSTORE_NAME"
KEYSTORE_ALIAS="alphacoach"

mkdir -p "$KEYSTORE_DIR"

if [ -f "$KEYSTORE_PATH" ]; then
    echo -e "${YELLOW}⚠️  Keystore já existe em: $KEYSTORE_PATH${NC}"
    echo -e "${RED}    NÃO SOBRESCREVA se já publicou o app na Play Store!${NC}"
    echo -e "${RED}    Você perderá a capacidade de atualizar o app.${NC}"
    echo ""
    read -p "Sobrescrever mesmo assim? (digite SIM em maiúsculas para confirmar): " CONFIRM
    if [ "$CONFIRM" != "SIM" ]; then
        echo "Operação cancelada."
        exit 0
    fi
    rm -f "$KEYSTORE_PATH"
fi

echo -e "${BLUE}📝 Você precisará fornecer:${NC}"
echo "   - Senha da keystore (mínimo 6 caracteres)"
echo "   - Nome completo (CN)"
echo "   - Organização (O)"
echo "   - Cidade (L)"
echo "   - Estado (ST)"
echo "   - País (C) — 2 letras, ex: BR"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Guarde a senha em local seguro (1Password, etc).${NC}"
echo -e "${YELLOW}   Se perder a senha, NÃO conseguirá atualizar o app na Play Store.${NC}"
echo ""

keytool -genkeypair \
    -v \
    -keystore "$KEYSTORE_PATH" \
    -alias "$KEYSTORE_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storetype PKCS12

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Keystore criada!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📁 Local:${NC}  $KEYSTORE_PATH"
echo -e "${BLUE}🔑 Alias:${NC} $KEYSTORE_ALIAS"
echo ""
echo -e "${YELLOW}📋 Próximo passo:${NC}"
echo "   ./configure-signing.sh"
echo ""
