#!/bin/bash

# Script para configurar assinatura automática do build de release
# - Gera android/keystore.properties (com senhas, gitignored)
# - Edita android/app/build.gradle pra ler essas properties no buildType release
# Uso: ./configure-signing.sh

set -e

echo "🔐 Configurando Assinatura do Release"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

KEYSTORE_NAME="upload-keystore.jks"
KEYSTORE_ALIAS="upload"
KEYSTORE_PATH="android/app/$KEYSTORE_NAME"
KEYSTORE_PROPERTIES="android/keystore.properties"
BUILD_GRADLE="android/app/build.gradle"

if [ ! -f "$KEYSTORE_PATH" ]; then
    echo -e "${RED}❌ Keystore não encontrada em $KEYSTORE_PATH${NC}"
    echo "   Execute primeiro: ./create-keystore.sh"
    exit 1
fi

echo -e "${BLUE}📝 Informe as senhas da keystore:${NC}"
echo ""
read -sp "Senha da keystore (storePassword): " KEYSTORE_PASSWORD
echo ""
read -sp "Senha da key (keyPassword, geralmente a mesma): " KEY_PASSWORD
echo ""
echo ""

cat > "$KEYSTORE_PROPERTIES" << EOF
storePassword=$KEYSTORE_PASSWORD
keyPassword=$KEY_PASSWORD
keyAlias=$KEYSTORE_ALIAS
storeFile=$KEYSTORE_NAME
EOF

chmod 600 "$KEYSTORE_PROPERTIES"
echo -e "${GREEN}✅ $KEYSTORE_PROPERTIES criado (modo 600)${NC}"
echo ""

# Garantir gitignore
GITIGNORE="android/.gitignore"
touch "$GITIGNORE"
grep -qxF "keystore.properties" "$GITIGNORE" || echo "keystore.properties" >> "$GITIGNORE"
grep -qxF "app/$KEYSTORE_NAME" "$GITIGNORE" || echo "app/$KEYSTORE_NAME" >> "$GITIGNORE"
echo -e "${GREEN}✅ android/.gitignore atualizado${NC}"
echo ""

# Patch build.gradle (idempotente)
if grep -q "signingConfigs" "$BUILD_GRADLE"; then
    echo -e "${YELLOW}⚠️  build.gradle já tem signingConfigs, pulando edição${NC}"
else
    echo -e "${BLUE}📝 Editando $BUILD_GRADLE...${NC}"
    cp "$BUILD_GRADLE" "$BUILD_GRADLE.backup"

    # Inserir bloco de leitura das properties no topo (antes do apply plugin)
    # e signingConfigs/release dentro do android { ... }
    python3 - <<'PYEOF'
import re
path = "android/app/build.gradle"
with open(path) as f:
    src = f.read()

# 1) Bloco no topo pra ler keystore.properties
header = """def keystorePropertiesFile = rootProject.file('keystore.properties')
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

"""
if "keystorePropertiesFile" not in src:
    src = header + src

# 2) signingConfigs dentro de android { ... }
signing_block = """    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
"""
# Inserir signingConfigs logo após "android {"
src = re.sub(r"(android\s*\{\n)", r"\1" + signing_block, src, count=1)

# 3) Adicionar signingConfig signingConfigs.release no buildTypes.release
src = re.sub(
    r"(buildTypes\s*\{\s*\n\s*release\s*\{\s*\n)",
    r"\1            signingConfig signingConfigs.release\n",
    src,
    count=1,
)

with open(path, "w") as f:
    f.write(src)
print("OK")
PYEOF
    echo -e "${GREEN}✅ build.gradle atualizado (backup em build.gradle.backup)${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Assinatura configurada!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📋 Próximo passo:${NC}"
echo "   ./build-aab-prod.sh    # gera AAB assinado pra Play Store"
echo "   ./build-apk-prod.sh    # gera APK assinado (instalação direta)"
echo ""
