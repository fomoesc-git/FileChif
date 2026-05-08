# filechif 0.1.0 Preview Release Notes

## Release Type

- Channel: preview
- Build date: 2026-05-09
- Platform: macOS arm64 locally; Windows preview build configured through GitHub Actions
- Repository: `https://github.com/fomoesc-git/FileChif`

## Highlights

- Convert Markdown to DOCX.
- Convert Markdown to PDF using pandoc with typst as the PDF engine.
- Select Markdown input files with a native file picker.
- Auto-generate output paths for DOCX/PDF.
- Save and reuse DOCX reference templates from a local template library.
- View conversion history, filter by status, copy paths, rerun conversions, open outputs, and reveal outputs in Finder.
- Settings page shows app version, build date, release channel, data paths, and dependency status.
- Settings page links to GitHub, release notes, and internal install instructions.
- Data persists in `~/Library/Application Support/filechif`.
- GitHub Actions workflow builds macOS and Windows preview artifacts.

## Artifacts

- App bundle: `filechif/src-tauri/target/release/bundle/macos/filechif.app`
- DMG: `filechif/src-tauri/target/release/bundle/dmg/filechif_0.1.0_aarch64.dmg`
- Internal archive: `releases/filechif-0.1.0-preview-20260509-macos-aarch64.dmg`
- GitHub Actions artifact: `filechif-windows`

## Requirements

- macOS on Apple Silicon.
- `pandoc` installed with Homebrew: `brew install pandoc`
- `typst` installed with Homebrew: `brew install typst`

## Verification

- `npm run build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `npm run tauri -- build`
- `filechif/scripts/verify_dmg_install.sh`
