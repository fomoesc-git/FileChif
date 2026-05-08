# 03 数据模型规范

## 文档元信息

- 版本：v1.0
- 状态：已冻结（MVP阶段）
- 最后更新：2026-05-08

## 核心实体

## ConvertJob

```json
{
  "job_id": "uuid",
  "job_type": "single|batch",
  "input_type": "md|txt|ai_text",
  "input_path": "string|null",
  "raw_text": "string|null",
  "template_id": "string",
  "output_formats": ["docx", "pdf"],
  "options": {
    "watermark": "string|null",
    "toc": true,
    "page_size": "A4"
  },
  "status": "pending|running|success|failed",
  "error": "string|null",
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

## TemplateMeta

```json
{
  "template_id": "meeting-minutes-v1",
  "name": "会议纪要",
  "category": "meeting|proposal|contract",
  "version": "1.0.0",
  "placeholders": [
    {"key": "title", "type": "string", "required": true}
  ]
}
```

## HistoryRecord

```json
{
  "record_id": "uuid",
  "job_id": "uuid",
  "input_summary": "string",
  "template_id": "string",
  "outputs": [
    {"format": "docx", "path": "string"},
    {"format": "pdf", "path": "string"}
  ],
  "status": "success|failed",
  "error_code": "string|null",
  "created_at": "ISO8601"
}
```

## 存储策略（MVP）

- `data/history.json`：历史记录数组。
- `data/jobs/<job_id>.json`：任务详情。
- `templates/<template_id>/template.json`：模板元数据。

## 版本与变更记录

- v1.0（2026-05-08）：首版模型定义。
