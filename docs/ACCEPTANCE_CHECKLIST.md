# filechif 内部验收清单

## 基础安装

- 能从 DMG 或 Windows 安装包完成安装。
- 能正常启动应用。
- 设置页显示正确版本、构建日期、发布通道。
- 设置页显示数据目录。
- 设置页能打开 GitHub、发布说明、安装说明。

## 依赖状态

- `pandoc` 显示为可用。
- `typst` 显示为可用。
- 依赖缺失时，设置页显示安装提示。

## DOCX 转换

- 能选择 `.md` 输入文件。
- 能自动生成 `.docx` 输出路径。
- 能成功转换为 DOCX。
- 能打开输出文件。
- 能在系统文件管理器中显示输出文件。
- 历史记录新增成功记录。

## PDF 转换

- 能选择 `.md` 输入文件。
- 能自动生成 `.pdf` 输出路径。
- 能成功转换为 PDF。
- 能打开输出文件。
- 能在系统文件管理器中显示输出文件。
- 历史记录新增成功记录。

## 模板库

- 能添加 DOCX 模板。
- 能从模板库选择模板。
- 能使用模板完成 DOCX 转换。
- 能删除模板记录。
- 重启应用后模板记录仍保留。

## 数据持久化

- 重启应用后历史记录仍保留。
- 重启应用后模板库仍保留。
- 更新安装后历史记录和模板库不丢失。

## 回归命令

在 `filechif/` 目录执行：

```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml
```

macOS 内部分发前执行：

```bash
npm run release:internal
```
