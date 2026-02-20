#!/bin/bash

# Usage: ./generate_icons.sh [svg_path]
# Example: ./scripts/generate_icons.sh web/public/svgs/logo.svg

# Set up paths relative to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PUBLIC_DIR="$PROJECT_ROOT/web/public"
ICONS_DIR="$PUBLIC_DIR/icons"

# Check for rsvg-convert (preferred for SVG rendering)
if ! command -v rsvg-convert &> /dev/null; then
    echo "Error: rsvg-convert is not installed or not in PATH."
    echo ""
    echo "Install it with:"
    echo "  macOS:  brew install librsvg"
    echo "  Ubuntu: sudo apt-get install librsvg2-bin"
    exit 1
fi

# Check for ImageMagick (needed for favicon.ico generation)
CONVERT_CMD=""
if command -v convert &> /dev/null; then
    CONVERT_CMD="convert"
elif command -v magick &> /dev/null; then
    CONVERT_CMD="magick convert"
else
    echo "Warning: ImageMagick is not installed. Favicon generation may fail."
    echo "Install it with:"
    echo "  macOS:  brew install imagemagick"
    echo "  Ubuntu: sudo apt-get install imagemagick"
fi

# Create required directory
mkdir -p "$ICONS_DIR"

# Default path if not provided
SVG=${1:-"$PUBLIC_DIR/svgs/logo.svg"}

echo "Generating icons from $SVG..."

# Function to generate icons
generate_icon() {
    local svg=$1
    local output="$ICONS_DIR/$(basename $2)"
    local size=$3

    echo "Generating $output (${size}x${size})..."
    if ! rsvg-convert --width $size --height $size "$svg" -o "$output"; then
        echo "Error: Failed to generate $output"
        exit 1
    fi
}

# Function to generate icons with solid background (for Apple devices)
generate_apple_icon() {
    local svg=$1
    local output="$ICONS_DIR/$(basename $2)"
    local size=$3
    local bg_color=$4

    echo "Generating $output (${size}x${size}) with background $bg_color..."
    local temp_png="/tmp/temp_icon_$$.png"
    if ! rsvg-convert --width $size --height $size "$svg" -o "$temp_png"; then
        echo "Error: Failed to convert SVG for $output"
        exit 1
    fi

    if [ -n "$CONVERT_CMD" ]; then
        if ! $CONVERT_CMD -background "$bg_color" -flatten "$temp_png" "$output"; then
            echo "Error: Failed to add background to $output"
            rm -f "$temp_png"
            exit 1
        fi
        rm -f "$temp_png"
    else
        cp "$temp_png" "$output"
        rm -f "$temp_png"
        echo "Warning: ImageMagick not available, icon generated without background"
    fi
}

# Generate PWA icons referenced in site.webmanifest
echo "Generating PWA icons..."
generate_icon "$SVG" "icon-192x192.png" 192
generate_icon "$SVG" "icon-256x256.png" 256
generate_icon "$SVG" "icon-384x384.png" 384
generate_icon "$SVG" "icon-512x512.png" 512
generate_icon "$SVG" "icon-1024x1024.png" 1024

# Generate Apple Touch Icons
echo "Generating Apple Touch Icons..."
generate_apple_icon "$SVG" "apple-touch-icon-152x152.png" 152 "#FFFFFF"
generate_apple_icon "$SVG" "apple-touch-icon-120x120.png" 120 "#FFFFFF"

# Generate App Store icon (1024x1024 with solid background, no transparency)
echo "Generating App Store icon..."
generate_apple_icon "$SVG" "app-store-icon-1024x1024.png" 1024 "#FFFFFF"

# Generate standard favicons
echo "Generating standard favicons..."
generate_icon "$SVG" "favicon-16x16.png" 16
generate_icon "$SVG" "favicon-32x32.png" 32
generate_icon "$SVG" "favicon-48x48.png" 48
generate_icon "$SVG" "favicon-64x64.png" 64
# Generate favicon.ico from the rsvg-rendered PNGs (ImageMagick's SVG renderer mishandles transforms)
if [ -n "$CONVERT_CMD" ]; then
    $CONVERT_CMD "$ICONS_DIR/favicon-16x16.png" "$ICONS_DIR/favicon-32x32.png" "$ICONS_DIR/favicon-48x48.png" "$ICONS_DIR/favicon-64x64.png" "$ICONS_DIR/favicon.ico"
else
    echo "Warning: ImageMagick not available, skipping favicon.ico generation"
fi

# Generate root-level Apple Touch Icons
echo "Generating root-level Apple Touch Icons..."
generate_apple_icon "$SVG" "apple-touch-icon.png" 180 "#FFFFFF"
generate_apple_icon "$SVG" "apple-touch-icon-precomposed.png" 180 "#FFFFFF"

# Copy files to their final locations
echo "Copying files to public directory..."
cp "$ICONS_DIR/favicon.ico" "$PUBLIC_DIR/" 2>/dev/null
cp "$ICONS_DIR/apple-touch-icon.png" "$PUBLIC_DIR/"
cp "$ICONS_DIR/apple-touch-icon-precomposed.png" "$PUBLIC_DIR/"

# Verify all required files exist
echo "Verifying generated files..."
required_files=(
    # Root level files
    "$PUBLIC_DIR/apple-touch-icon.png"
    "$PUBLIC_DIR/apple-touch-icon-precomposed.png"
    # Icon directory files
    "$ICONS_DIR/favicon-16x16.png"
    "$ICONS_DIR/favicon-32x32.png"
    "$ICONS_DIR/icon-192x192.png"
    "$ICONS_DIR/icon-256x256.png"
    "$ICONS_DIR/icon-384x384.png"
    "$ICONS_DIR/icon-512x512.png"
    "$ICONS_DIR/icon-1024x1024.png"
    "$ICONS_DIR/apple-touch-icon-152x152.png"
    "$ICONS_DIR/apple-touch-icon-120x120.png"
    "$ICONS_DIR/app-store-icon-1024x1024.png"
)

missing_files=0
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "Missing file: $file"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -eq 0 ]; then
    echo "All required files generated successfully!"
else
    echo "Error: $missing_files files are missing"
    exit 1
fi
