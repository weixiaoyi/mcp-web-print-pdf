# 更新日志

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)；版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 仓库展示：logo、社交预览图（`assets/social-preview.png`）、README 徽章与「支持的宿主」矩阵
- `llms.txt`：给 AI 检索用的项目摘要
- GitHub Actions：`test` 工作流（Node 18 / 20 / 22 × Ubuntu，Node 20 × Windows）
- Issue / PR 模板、`CONTRIBUTING.md`

## [0.2.3]

### Added

- `printFile`：按本机路径打印 `.pdf` / `.html` / 图片，绕开 MCP stdio 的 10MB 单条消息上限
- `batchPrint` 支持一次提交混合任务

### Changed

- 打印工具默认 `dry_run: false`（直接出纸），预览需显式 `dry_run: true` 或 `extra_options.action: "preview"`
- README 补充「大文件怎么打」「已知边界」两节

### Fixed

- `batchPrint` 任务格式按客户端校准为 `{ type, data, … }`，不再要求上游示例里的 `content` / `url` / `base64`

## [0.2.0]

### Changed

- **破坏性变更**：工具名从 snake_case 改为与 `web-print-pdf@2.x` 方法名一致
  - `print_status` → `getConnectStatus`
  - `list_printers` → `getPrinterList`
  - `print_html` → `printHtml`
  - `print_pdf_url` → `printPdfByUrl`

### Added

- 覆盖上游全部公开 API：HTML / URL / Base64 / PDF / 图片 / 批量打印
- 客户端设置工具：`setTitle`、`setThemeColor`、`switchTabsVisibility`、`setContactUsTabInnerHtml`

## [0.1.0]

### Added

- 首个发布版本：MCP server 骨架、状态查询、打印机列表、HTML 与 PDF 打印
