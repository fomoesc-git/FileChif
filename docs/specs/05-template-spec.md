# 05 模板规范

## 文档元信息

- 版本：v1.0
- 状态：已冻结（MVP阶段）
- 最后更新：2026-05-08

## 模板目录结构

```text
templates/
  meeting-minutes-v1/
    template.json
    body.md
    preview.png
```

## template.json 规范

```json
{
  "template_id": "meeting-minutes-v1",
  "name": "会议纪要",
  "version": "1.0.0",
  "description": "标准会议纪要模板",
  "placeholders": [
    {"key": "title", "type": "string", "required": true},
    {"key": "date", "type": "date", "required": true}
  ]
}
```

## 占位符语法

- 变量：`{{title}}`
- 条件块（预留）：`{{#if confidential}}...{{/if}}`
- 列表（预留）：`{{#each items}}...{{/each}}`

MVP 至少支持变量替换。

## 模板质量要求

- 必须包含标题层级（H1-H3）。
- 合同模板必须包含：双方信息、金额、工期、签署位。
- 模板渲染失败时返回可定位字段名。

## 版本与变更记录

- v1.0（2026-05-08）：首版模板规范。
