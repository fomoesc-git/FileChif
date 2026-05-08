# FileChif

FileChif 是一个面向个人与小团队的桌面文档工作台，用于把 Markdown、AI 对话稿和轻量文本快速整理为 DOCX/PDF 交付文件。

## 当前状态

- 阶段：M7 产品化基础
- 平台：macOS 已本地验证；macOS/Windows 已通过 GitHub Actions 构建
- 发布通道：preview
- 仓库：`https://github.com/fomoesc-git/FileChif`

## 功能

- Markdown 转 DOCX
- Markdown 转 PDF
- DOCX reference 模板库
- 转换历史记录
- 输出文件打开/显示
- 设置页依赖检查
- 关于页与版本信息

## 本地开发

```bash
cd filechif
npm install
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri -- build
```

## 运行依赖

DOCX/PDF 转换依赖本机 CLI：

- `pandoc`
- `typst`

macOS 可通过 Homebrew 安装：

```bash
brew install pandoc typst
```

## 示例文件

- `filechif/examples/sample-report.md`

可用它快速验收 DOCX/PDF 转换链路。

## 文档

- `docs/ACCEPTANCE_CHECKLIST.md`
- `docs/GITHUB_RELEASE.md`
- `docs/INTERNAL_INSTALL.md`
- `docs/KNOWN_LIMITS.md`
- `docs/RELEASE_NOTES.md`
- `docs/ROLLBACK.md`
- `docs/TROUBLESHOOTING.md`

## 数据目录

运行时数据保存在系统应用数据目录中。macOS 当前路径：

```text
~/Library/Application Support/filechif
```

为了兼容已创建的历史记录和模板库，底层数据目录暂时保留小写 `filechif`。
