# filechif 文档中心

本目录用于在跨对话开发中沉淀**技术规范**与**开发里程碑**，保证新会话可快速恢复上下文。

## 目录结构

- `specs/`：技术规范（长期有效，变更需版本化）
- `milestones/`：里程碑总结（阶段性快照，按时间递增）

## 使用约定

- 规范文档优先级高于临时讨论。
- 每完成一个里程碑，新增一份总结文档到 `milestones/`。
- 规范变更时，必须在对应文档中更新“版本与状态”与“变更记录”。

## 命名规范

- 规范文档：`NN-<name>.md`，如 `01-product-scope.md`
- 里程碑文档：`M<序号>-<名称>-YYYY-MM-DD.md`

## 推荐阅读顺序（新对话）

1. `docs/specs/01-product-scope.md`
2. `docs/specs/02-architecture.md`
3. `docs/specs/04-command-contract.md`
4. `docs/specs/06-convert-pipeline.md`
5. 最新一份 `docs/milestones/*.md`

## 分发与验收

- `docs/INTERNAL_INSTALL.md`：内部安装说明
- `docs/ACCEPTANCE_CHECKLIST.md`：内部验收清单
- `docs/TROUBLESHOOTING.md`：故障诊断
- `docs/ROLLBACK.md`：版本归档与回滚
- `docs/GITHUB_RELEASE.md`：GitHub 开源与自动构建
