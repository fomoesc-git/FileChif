# filechif

filechif 是一个文档工作台 MVP：将 Markdown/TXT/AI 文本转换为 DOCX/PDF。

## 当前阶段

- M6：内部团队分发与维护自动化进行中；macOS 内部发布脚本已跑通，GitHub Actions 已配置 macOS/Windows 构建。

## 本地运行

```bash
npm install
npm run build
npm run dev
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri -- build
```

完整转换依赖本机安装 `pandoc`。当前环境已通过 Homebrew 安装并验证 `pandoc 3.9.0.2`。
PDF 转换使用 `typst` 作为 pandoc PDF 引擎，当前环境已安装并验证 `typst 0.14.2`。

## 目录

- `src-tauri/` Rust 后端与 Tauri 命令
- `src/` 前端工作台
- `templates/` 模板资产
- `data/` 本地数据（history/jobs）
- `scripts/` 开发脚本

## 已实现命令

- `health_check`
- `convert_markdown_to_docx`
- `convert_markdown_to_pdf`
- `list_history`

## 工作台能力

- 选择 Markdown 输入文件
- 自动生成 DOCX/PDF 输出路径
- 选择输出文件保存位置
- 选择可选 DOCX 模板文件
- 查看转换结果与历史记录
- 转换成功后打开输出文件或显示文件位置
- 从历史记录打开成功输出或显示文件位置
- 按全部、成功、失败筛选历史记录
- 从历史记录复制路径或重新转换
- 将 DOCX 模板加入模板库
- 从模板库快速选择或删除模板
- 设置页查看应用版本、数据目录、pandoc 与 typst 状态

## 当前限制

- 模板参数当前通过 `--reference-doc` 传给 pandoc，主要面向 DOCX 输出。
- 数据文件会保存到系统应用数据目录；macOS 路径为 `~/Library/Application Support/filechif`。
- 项目内旧 `data/history.json` 与 `data/templates.json` 会在首次读取时自动迁移。

## 预览版路径

- `src-tauri/target/release/bundle/macos/filechif.app`
- `src-tauri/target/release/bundle/dmg/filechif_0.1.0_aarch64.dmg`

## 发布验证

```bash
scripts/verify_dmg_install.sh
npm run release:internal
```

发布说明与已知限制见：

- `../docs/RELEASE_NOTES.md`
- `../docs/KNOWN_LIMITS.md`
- `../docs/INTERNAL_INSTALL.md`
- `../docs/ACCEPTANCE_CHECKLIST.md`
- `../docs/TROUBLESHOOTING.md`
- `../docs/ROLLBACK.md`
- `../docs/GITHUB_RELEASE.md`

## 开发约定

详见：`../docs/specs/08-dev-standards.md`
