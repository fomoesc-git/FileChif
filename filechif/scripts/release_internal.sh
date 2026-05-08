#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_DIR="$(cd "$ROOT_DIR/.." && pwd)"
VERSION="0.1.0"
CHANNEL="preview"
DATE="$(date +%Y%m%d)"
PLATFORM="macos-aarch64"
RELEASE_DIR="$REPO_DIR/releases"
SOURCE_DMG="$ROOT_DIR/src-tauri/target/release/bundle/dmg/FileChif_0.1.0_aarch64.dmg"
TARGET_DMG="$RELEASE_DIR/FileChif-${VERSION}-${CHANNEL}-${DATE}-${PLATFORM}.dmg"

cd "$ROOT_DIR"

echo "FileChif internal release"
echo "Version: $VERSION"
echo "Channel: $CHANNEL"
echo "Platform: $PLATFORM"

npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri -- build
scripts/verify_dmg_install.sh

mkdir -p "$RELEASE_DIR"
cp "$SOURCE_DMG" "$TARGET_DMG"

echo "Release artifact:"
echo "$TARGET_DMG"
