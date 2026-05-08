# filechif 故障诊断

## 应用无法打开

### macOS 提示未签名或无法验证开发者

原因：当前内部预览版没有 Apple Developer 签名和公证。

处理：

1. 打开系统设置。
2. 进入隐私与安全性。
3. 在安全提示中允许打开 `filechif`。
4. 重新启动应用。

如果文件带有隔离属性，可在确认来源可信后执行：

```bash
xattr -dr com.apple.quarantine /Applications/filechif.app
```

## pandoc 不可用

现象：设置页显示 `pandoc` 不可用，或 DOCX/PDF 转换失败。

macOS 安装：

```bash
brew install pandoc
```

Windows 建议：

1. 从 pandoc 官方安装包安装。
2. 确认 `pandoc.exe` 已加入 `PATH`。
3. 重新打开 filechif。

## typst 不可用

现象：DOCX 转换成功，但 PDF 转换失败。

macOS 安装：

```bash
brew install typst
```

Windows 建议：

1. 安装 Typst CLI。
2. 确认 `typst.exe` 已加入 `PATH`。
3. 重新打开 filechif。

## PDF 转换失败

优先检查：

- `pandoc` 是否可用。
- `typst` 是否可用。
- 输出目录是否有写入权限。
- 输入文件是否为 `.md` 或 `.markdown`。

如果错误中出现 `pdflatex`，说明 pandoc 选择了 LaTeX 引擎；当前 filechif 会显式使用 `typst`，请确认安装的是最新构建。

## 模板不可用

可能原因：

- 模板文件被移动或删除。
- 模板不是 `.docx` 文件。
- 模板文件损坏。

处理：

1. 从模板库删除旧记录。
2. 重新添加有效 `.docx` 模板。

## 数据目录

macOS 数据目录：

```text
~/Library/Application Support/filechif
```

数据文件：

- `history.json`
- `templates.json`

如需备份或迁移，复制整个 `filechif` 数据目录即可。
