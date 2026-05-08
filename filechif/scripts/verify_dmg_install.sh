#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DMG_PATH="$ROOT_DIR/src-tauri/target/release/bundle/dmg/FileChif_0.1.0_aarch64.dmg"
APP_PATH="$ROOT_DIR/src-tauri/target/release/bundle/macos/FileChif.app"
DATA_DIR="$HOME/Library/Application Support/filechif"

echo "FileChif DMG verification"

test -f "$DMG_PATH"
echo "OK: DMG exists: $DMG_PATH"

test -d "$APP_PATH"
echo "OK: app bundle exists: $APP_PATH"

/opt/homebrew/bin/pandoc --version | head -n 1
/opt/homebrew/bin/typst --version
echo "OK: pandoc and typst are available from Homebrew paths"

if [[ -d "$DATA_DIR" ]]; then
  echo "OK: app data directory exists: $DATA_DIR"
else
  echo "WARN: app data directory does not exist yet. It is created on first app status/history/template read."
fi

echo "Manual checks:"
echo "1. Open the DMG and drag FileChif.app to Applications."
echo "2. Launch FileChif from Applications."
echo "3. Open Settings and confirm data dir is: $DATA_DIR"
echo "4. Confirm pandoc and typst are shown as available."
echo "5. Convert one Markdown file to DOCX and PDF."
