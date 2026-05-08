# 04 Command 接口契约

## 文档元信息

- 版本：v1.0
- 状态：已冻结（MVP阶段）
- 最后更新：2026-05-08

## 统一返回结构

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "trace_id": "uuid"
}
```

失败示例：

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "CONVERT_FAILED",
    "message": "pandoc exited with non-zero status"
  },
  "trace_id": "uuid"
}
```

## 命令列表（MVP）

1. `health_check`
   - 入参：无
   - 出参：版本、运行环境、依赖状态

2. `convert_markdown_to_docx`
   - 入参：`request: { input_path, output_path, template_path? }`
   - 出参：`job_id`、输出路径、格式、模板路径

3. `convert_markdown_to_pdf`
   - 入参：`request: { input_path, output_path, template_path? }`
   - 出参：`job_id`、输出路径、格式、模板路径

4. `batch_generate_documents`
   - 状态：后续里程碑实现

5. `list_history`
   - 入参：无
   - 出参：历史记录列表

## 错误码规范

- `INVALID_PARAM`
- `TEMPLATE_NOT_FOUND`
- `INPUT_NOT_FOUND`
- `INVALID_INPUT_EXTENSION`
- `INVALID_OUTPUT_EXTENSION`
- `OUTPUT_DIR_NOT_WRITABLE`
- `CONVERT_FAILED`
- `PANDOC_UNAVAILABLE`
- `INTERNAL_ERROR`

## 兼容性约束

- 新增字段只增不删。
- 已发布命令名称不可直接改名。
- 废弃命令至少保留 1 个小版本。

## 版本与变更记录

- v1.0（2026-05-08）：首版 command contract。
- v1.1（2026-05-08）：落地 MVP 路径转换入参、历史查询和错误码。
