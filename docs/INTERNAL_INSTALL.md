# filechif Internal Install Guide

## Audience

This guide is for internal studio users.

## Requirements

- Apple Silicon macOS.
- Homebrew.
- `pandoc`: `brew install pandoc`
- `typst`: `brew install typst`

## Install

1. Open the latest DMG from `releases/`.
2. Drag `filechif.app` to Applications.
3. Launch `filechif.app` from Applications.
4. If macOS blocks the app because it is unsigned, open System Settings and allow it manually.

## First Run Check

1. Open Settings.
2. Confirm data directory is `~/Library/Application Support/filechif`.
3. Confirm `pandoc` is available.
4. Confirm `typst` is available.
5. Convert one Markdown file to DOCX.
6. Convert one Markdown file to PDF.
7. Confirm history records are saved.
8. Add one DOCX template to the template library.

## Update

1. Quit filechif.
2. Install the newer DMG.
3. Replace the app in Applications.
4. Launch and confirm history/template data is preserved.

## Rollback

Use an older DMG from `releases/`.

More details:

- Acceptance checklist: `docs/ACCEPTANCE_CHECKLIST.md`
- Troubleshooting: `docs/TROUBLESHOOTING.md`
- Rollback policy: `docs/ROLLBACK.md`
- GitHub build notes: `docs/GITHUB_RELEASE.md`
