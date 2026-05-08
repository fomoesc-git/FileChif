# filechif 内部版本归档与回滚

## 归档规则

内部发布包统一放在仓库根目录的 `releases/`：

```text
filechif-<version>-<channel>-<yyyymmdd>-<platform>.<ext>
```

示例：

```text
filechif-0.1.0-preview-20260509-macos-aarch64.dmg
```

## macOS 发布

在 `filechif/` 目录执行：

```bash
npm run release:internal
```

脚本会执行构建、测试、Tauri 打包、DMG 验证，并复制 DMG 到 `releases/`。

## Windows 发布

Windows 安装包优先由 GitHub Actions 生成：

1. 推送代码到 GitHub。
2. 打开 Actions。
3. 运行或等待 `Build FileChif` workflow。
4. 下载 `filechif-windows` artifact。
5. 在 Windows 测试机执行验收清单。

## 回滚步骤

1. 退出 filechif。
2. 找到上一个已验收的安装包。
3. 重新安装旧版本。
4. 启动应用并确认历史记录、模板库仍存在。
5. 执行一次 DOCX 与 PDF 转换烟雾测试。

## 数据保护

回滚前如需备份，复制数据目录：

```text
~/Library/Application Support/filechif
```

当前版本不会在安装包内覆盖用户数据目录。
