#!/bin/bash

# Script para gerar ícones do Android a partir do icon do projeto
# Uso: ./generate-icons.sh

set -e

echo "🎨 Gerando ícones do Android..."
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar se ImageMagick está instalado
if ! command -v magick &> /dev/null; then
    echo -e "${YELLOW}⚠️  ImageMagick não encontrado. Instalando...${NC}"
    brew install imagemagick
fi

# Preferimos resources/icon.png (1024x1024). Fallback para public/favicon.png
if [ -f "resources/icon.png" ]; then
    SOURCE_ICON="resources/icon.png"
    echo -e "${BLUE}📄 Usando resources/icon.png${NC}"
elif [ -f "public/favicon.png" ]; then
    SOURCE_ICON="public/favicon.png"
    echo -e "${BLUE}📄 Usando public/favicon.png${NC}"
else
    echo -e "${RED}❌ Ícone não encontrado!${NC}"
    exit 1
fi

if [ -f "resources/splash.png" ]; then
    SPLASH_SOURCE="resources/splash.png"
else
    SPLASH_SOURCE="$SOURCE_ICON"
fi

# Diretório base dos recursos Android
RES_DIR="android/app/src/main/res"

# Gerar ícones mipmap (launcher icons)
echo -e "${BLUE}🖼️  Gerando ícones mipmap...${NC}"

generate_icon() {
    local size=$1
    local output=$2
    magick "$SOURCE_ICON" -resize ${size}x${size} "$output"
}

# mdpi (48x48)
generate_icon 48 "$RES_DIR/mipmap-mdpi/ic_launcher.png"
generate_icon 48 "$RES_DIR/mipmap-mdpi/ic_launcher_round.png"

# hdpi (72x72)
generate_icon 72 "$RES_DIR/mipmap-hdpi/ic_launcher.png"
generate_icon 72 "$RES_DIR/mipmap-hdpi/ic_launcher_round.png"

# xhdpi (96x96)
generate_icon 96 "$RES_DIR/mipmap-xhdpi/ic_launcher.png"
generate_icon 96 "$RES_DIR/mipmap-xhdpi/ic_launcher_round.png"

# xxhdpi (144x144)
generate_icon 144 "$RES_DIR/mipmap-xxhdpi/ic_launcher.png"
generate_icon 144 "$RES_DIR/mipmap-xxhdpi/ic_launcher_round.png"

# xxxhdpi (192x192)
generate_icon 192 "$RES_DIR/mipmap-xxxhdpi/ic_launcher.png"
generate_icon 192 "$RES_DIR/mipmap-xxxhdpi/ic_launcher_round.png"

echo -e "${GREEN}✅ Ícones gerados!${NC}"
echo ""

# Gerar splash screens (fundo preto + ícone centralizado)
echo -e "${BLUE}🖼️  Gerando splash screens...${NC}"

for dir in drawable-land-hdpi drawable-land-mdpi drawable-land-xhdpi drawable-land-xxhdpi drawable-land-xxxhdpi \
           drawable-port-hdpi drawable-port-mdpi drawable-port-xhdpi drawable-port-xxhdpi drawable-port-xxxhdpi \
           drawable; do
    mkdir -p "$RES_DIR/$dir"
    magick -size 1024x1024 xc:black "$SPLASH_SOURCE" -resize 512x512 -gravity center -composite "$RES_DIR/$dir/splash.png"
done

echo -e "${GREEN}✅ Splash screens gerados!${NC}"
echo ""

# Remover adaptive icons para usar PNG diretos
echo -e "${BLUE}🔧 Removendo adaptive icons...${NC}"
rm -f "$RES_DIR/mipmap-anydpi-v26/ic_launcher.xml"
rm -f "$RES_DIR/mipmap-anydpi-v26/ic_launcher_round.xml"
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  rm -f "$RES_DIR/mipmap-$d/ic_launcher_foreground.png"
  rm -f "$RES_DIR/mipmap-$d/ic_launcher_foreground.webp"
done
rm -f "$RES_DIR/drawable/ic_launcher_background.xml"
rm -f "$RES_DIR/drawable-v24/ic_launcher_foreground.xml"
rm -f "$RES_DIR/values/ic_launcher_background.xml"
echo -e "${GREEN}✅ Adaptive icons removidos!${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Ícones do Android gerados com sucesso!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Próximo passo:${NC}"
echo "Execute: ./build-apk.sh"
echo ""
