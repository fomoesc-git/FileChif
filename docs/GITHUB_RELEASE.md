# GitHub 开源与自动构建

## 仓库

- GitHub：`https://github.com/fomoesc-git/FileChif`
- 当前项目结构：仓库根目录包含 `filechif/` 应用目录、`docs/` 文档目录、`releases/` 内部归档目录。

## GitHub Actions

- Workflow：`.github/workflows/build.yml`
- 触发方式：
  - 推送到 `main`
  - 创建 `v*` 标签
  - Pull Request 到 `main`
  - 手动 `workflow_dispatch`

## 构建内容

- macOS：构建 `.app` 与 `.dmg`。
- Windows：构建 NSIS `.exe` 安装包。
- 每个平台都会先执行：
  - `npm ci`
  - `npm run build`
  - `cargo check --manifest-path src-tauri/Cargo.toml`
  - `cargo test --manifest-path src-tauri/Cargo.toml`

## Windows 版本说明

- Windows 安装包由 GitHub Actions 的 `windows-latest` runner 构建。
- Windows 转换 DOCX/PDF 仍依赖本机安装 `pandoc`。
- PDF 转换仍依赖本机安装 `typst`。
- Windows 首版属于内部/开源预览构建，暂不做代码签名。

## 发布建议

1. 本地完成验证并更新里程碑文档。
2. 推送到 GitHub `main`。
3. 在 GitHub Actions 下载 `filechif-macos` 与 `filechif-windows` artifacts。
4. 确认 Windows 机器上能安装、启动，并完成 DOCX/PDF 烟雾测试。
5. 需要稳定版本时再创建 `v0.1.0-preview.N` 标签。

## 不纳入仓库的内容

- `filechif/node_modules/`
- `filechif/dist/`
- `filechif/src-tauri/target/`
- 本地历史与模板数据文件
- 大体积分发安装包
