# filechif Known Limits

## Preview Distribution

- The current package is a preview build, not notarized by Apple.
- The DMG is intended for local testing on the current macOS machine.
- Users may need to allow the app manually in macOS security settings.

## External Dependencies

- DOCX/PDF conversion depends on `pandoc`.
- PDF conversion depends on `typst`.
- The app searches common Homebrew paths, including `/opt/homebrew/bin` and `/usr/local/bin`.

## Template Support

- Template support currently uses pandoc `--reference-doc`.
- Template library entries store absolute file paths.
- If a template file is moved or deleted, the entry must be removed or updated manually.

## Data Storage

- Runtime data is stored in `~/Library/Application Support/filechif`.
- Project-local `data/history.json` and `data/templates.json` are migration sources only.

## Packaging

- Current local release target is macOS arm64.
- Windows packaging is configured through GitHub Actions and still needs first-run verification on a Windows machine.
- Linux packaging has not been verified.
- Formal app icon design, code signing, notarization, and auto-update are future work.

## Open Source Preview

- GitHub repository: `https://github.com/fomoesc-git/FileChif`
- macOS and Windows preview builds are unsigned.
- Windows users must install `pandoc` and `typst` separately.
