# mcp-web-print-pdf

**中文** | [English](README_EN.md)

让 AI agent（Claude Desktop / Cursor / dsh）把 HTML、网页、PDF、图片打印到本机打印机。

它**不改**「Web打印专家」客户端，也不改 `web-print-pdf` 浏览器库——它只是给客户端已有的
`ws://127.0.0.1:16794/websocket/standard` 再加一个客户端，并把 `web-print-pdf@2.x` 的公开 API
一对一映射成 MCP 工具。

- 官网：<https://webprintpdf.com/>
- 底层 npm 包：[web-print-pdf](https://www.npmjs.com/package/web-print-pdf)
- 文档：<https://webprintpdf.com/docs/>

```
Claude / dsh ──stdio──> mcp-web-print-pdf ──ws──> Web打印专家客户端 ──> 打印机
```

## 前置条件

- 本机安装并启动 [Web打印专家客户端](https://webprintpdf.com/downloadApp/)（Windows 10/11、macOS 11+、Linux / 银河麒麟 / 统信 UOS）
- 客户端默认监听 `ws://127.0.0.1:16794/websocket/standard`
- 不需要改客户端或前端代码；本 MCP 只是把 [web-print-pdf](https://www.npmjs.com/package/web-print-pdf) 的公开 API 映射成 MCP 工具
- MCP 接入指南：<https://webprintpdf.com/docs/mcp-print/>

## 安装

宿主会自动通过 `npx -y mcp-web-print-pdf` 拉取，不需要全局安装。

从源码开发：

```bash
npm install
```

## 配置

所有宿主都通过 stdio 启动同一个 MCP server，统一用：

```json
{ "command": "npx", "args": ["-y", "mcp-web-print-pdf"] }
```

> 从源码调试时，把 `command` 换成 `node`、`args` 换成 `["<repo>/bin/mcp.js"]` 即可，其余字段不变。

### Claude Desktop

`%APPDATA%\Claude\claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "webprint": {
      "command": "npx",
      "args": ["-y", "mcp-web-print-pdf"],
      "env": { "WEBPRINT_PORT": "16794" }
    }
  }
}
```

### Cursor

项目级 `.cursor/mcp.json`（只对当前项目生效），或全局 `~/.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "webprint": {
      "command": "npx",
      "args": ["-y", "mcp-web-print-pdf"],
      "env": { "WEBPRINT_PORT": "16794" }
    }
  }
}
```

改完在 Cursor 的 **Settings → MCP** 里确认 `webprint` 是绿灯；工具会出现在 Agent 的工具列表里。

### DeepSeek Harness（dsh）

dsh 用 `@deepseek-ai/dsh-mcp-client` 挂载外部 MCP。编辑当前 profile 的
`~/.dsh/profiles/<profile>/cordis.patch.yml`，追加一段 `insert`：

```yaml
- insert:
    - id: mcp-webprint
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: webprint
        transport: stdio
        command: npx
        args:
          - '-y'
          - 'mcp-web-print-pdf'
        toolCallTimeoutMs: 180000
```

保存后 dsh 会热加载（`serverName` 需匹配 `[A-Za-z0-9_-]{1,32}`，且同一 profile 内唯一）。
模型侧看到的工具名带命名空间：`mcp__webprint__printHtml`、`mcp__webprint__getPrinterList`、
`mcp__webprint__batchPrint` …

### Claude Code

```bash
claude mcp add --scope user webprint -- npx -y mcp-web-print-pdf
claude mcp list
```

`--scope user` 全局可用；去掉则只对当前项目生效。团队共享可以提交项目根的 `.mcp.json`：

```json
{
  "mcpServers": {
    "webprint": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-web-print-pdf"]
    }
  }
}
```

### VS Code + GitHub Copilot

`.vscode/mcp.json`（注意顶层是 `servers`，不是 `mcpServers`）：

```json
{
  "servers": {
    "webprint": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-web-print-pdf"]
    }
  }
}
```

命令面板运行 **MCP: List Servers** 可启动 / 重启 / 看输出；便携格式 `.mcp.json` 则用 `mcpServers`。

### OpenAI Codex CLI

`~/.codex/config.toml`：

```toml
[mcp_servers.webprint]
command = "npx"
args = ["-y", "mcp-web-print-pdf"]
```

### Cline / Roo Code / Kilo Code

Cline 面板 → MCP Servers → Configure → Configure MCP Servers，编辑 `cline_mcp_settings.json`：

```json
{
  "mcpServers": {
    "webprint": {
      "command": "npx",
      "args": ["-y", "mcp-web-print-pdf"],
      "disabled": false
    }
  }
}
```

Roo Code / Kilo Code 是 Cline 的分叉，配置结构相同，只是文件路径不同。

### Cherry Studio

设置 → **MCP 服务器** → **添加服务器**：

- 类型：`STDIO`
- 命令：`npx`
- 参数：`-y mcp-web-print-pdf`

保存后回到聊天框，打开输入框旁的 MCP 开关即可。

### Trae

设置 → **MCP** → **手动添加**，粘贴：

```json
{
  "mcpServers": {
    "webprint": {
      "command": "npx",
      "args": ["-y", "mcp-web-print-pdf"]
    }
  }
}
```

项目级配置放在 `.trae/mcp.json`（需先在设置里打开「项目级 MCP」）。

### 其它宿主

| 宿主 | 配置位置 | 顶层键 |
|---|---|---|
| CodeBuddy | `settings.json` | `mcpServers`（加 `"disabled": false`） |
| Qoder | `~/.qoder/settings.json` | `mcpServers`（或 `qoder mcp add webprint -- npx -y mcp-web-print-pdf`） |
| JetBrains AI Assistant | Settings → Tools → AI Assistant → MCP → Add | `mcpServers`（也可直接 Import from Claude） |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` |
| GitHub Copilot CLI | `~/.copilot/mcp-config.json` | `mcpServers` |

> ChatGPT / claude.ai 网页版只接受远程 HTTP MCP，不能直连本机的 stdio server；要支持它们需要再加一层
> HTTP 桥（本项目暂未提供）。Gemini CLI 个人版已转向 Antigravity，这里不再单列。

> 客户端端口默认 `16794`，可用 `WEBPRINT_PORT` 覆盖；WebSocket 请求超时默认 120s，可用
> `WEBPRINT_TIMEOUT`（毫秒）覆盖。

## 工具

工具名与 `web-print-pdf@2.x` 的方法名一一对应（`utils.` 前缀不能出现在 MCP 工具名里，故省略）。
只有 `printFile` 是本仓库额外加的——上游没有「按本机路径打印」的方法。

### 状态与打印机

| 工具 | 对应 | 作用 |
|---|---|---|
| `getConnectStatus` | `utils.getConnectStatus` | 检查客户端是否在线 |
| `getPrinterList` | `utils.getPrinterList` | 列出本机打印机（名称 + 驱动） |
| `getPrinterPapers` | `utils.getPrinterPapers` | 查询某台打印机支持的纸张，用于填 `paper_format` / `print_options.bin` |

### 打印

所有打印工具默认 `dry_run: false`：直接出纸；要只渲染预览请显式传 `dry_run: true`
（或 `extra_options.action: "preview"`）。默认会真的用纸，请先确认打印机和纸张。

> 不传 `paper_format` 时，PDF 渲染默认用 A4，但打印阶段会沿用客户端默认打印机的纸张。
> 要固定纸张（比如热敏 80mm、面单 100×150），请显式传 `paper_format` / `pdf_options`。

| 工具 | 作用 |
|---|---|
| `printHtml` | 打印 HTML 字符串 |
| `printHtmlByUrl` | 抓取网页后打印 |
| `printHtmlByBase64` | 打印 Base64 HTML |
| `printPdfByUrl` | 打印 PDF 链接 |
| `printPdfByBase64` | 打印 Base64 PDF |
| `printImageByUrl` | 打印图片链接 |
| `printImageByBase64` | 打印 Base64 图片 |
| `printFile` | 按扩展名自动选通道，打印本机 `.pdf` / `.html` / 图片（额外提供） |
| `batchPrint` | 一次提交多个混合任务 |

> `batchPrint` 的任务格式以客户端为准：每项是 `{ type, data, pdfOptions?, printOptions?, extraOptions? }`，
> **不是**上游 README 示例里的 `content` / `url` / `base64`。`data` 按 `type` 解释：`printHtml` 放 HTML，
> `…ByUrl` 放地址，`…ByBase64` 放 base64。

### 客户端设置

| 工具 | 对应 | 说明 |
|---|---|---|
| `setTitle` | `utils.setTitle(title \| null)` | 设置窗口标题 |
| `setThemeColor` | `utils.setThemeColor(color \| null)` | 设置主题色 |
| `switchTabsVisibility` | `utils.switchTabsVisibility(tabs \| null)` | 切换标签页显隐 |
| `setContactUsTabInnerHtml` | `utils.setContactUsTabInnerHtml(html \| null)` | 设置「联系我们」页面 |

这四个都支持 `reset: true` 恢复默认——有些宿主会把 JSON `null` 序列化成字符串 `"null"`，这时用
`reset: true` 比传 `null` 稳。

> 0.1.0 用的是 snake_case（`print_status` / `list_printers` / `print_html` / `print_pdf_url`），
> 0.2.0 起统一改成上游方法名，对应关系：`print_status` → `getConnectStatus`、`list_printers` →
> `getPrinterList`、`print_html` → `printHtml`、`print_pdf_url` → `printPdfByUrl`。

## 参数

打印工具共用一套参数，与上游四个实参一一对应：

| MCP 参数 | 对应 | 说明 |
|---|---|---|
| 内容字段 | 第 1 个实参 | `html` / `url` / `base64` / `path` / `tasks` |
| `pdf_options` | `pdfOptions` | 排版成 PDF：纸张、边距、页眉页脚、背景、水印、页码… |
| `print_options` | `printOptions` | 投递打印机：打印机名、份数、单双面、缩放、纸盒、热敏锐化… |
| `extra_options` | `extraOptions` | `action`、`requestTimeout`、`cookies`、`httpHeaders`、`localStorages`… |
| `dry_run` | — | 默认出纸；`true` 只预览；显式 `action` 优先 |
| `paper_format` | — | 便捷参数，等价于 `print_options.paperFormat` |
| `printer_name` | — | 便捷参数，等价于 `print_options.printerName` |
| `copies` | — | 便捷参数，等价于 `print_options.copies` |

三个 options 对象中，`pdf_options` / `print_options` 走客户端白名单校验（字段名写错会直接报错）；
`extra_options` 允许任意自定义键，会原样透传并在响应里返回。

合并规则：**对象里显式写的字段优先**，便捷参数只补空缺。

### `pdf_options`

`paperFormat`、`width`、`height`、`displayHeaderFooter`、`headerTemplate`、`footerTemplate`、
`landscape`、`margin{top,right,bottom,left}`、`pageRanges[{from,to}]`、`preferCSSPageSize`、
`printBackground`、`scale`、`outline`、`tagged`、`watermark`、`pageNumber`。

> `pdfOptions.paperFormat` 只认固定枚举（A0–A6 / Letter / Legal / Tabloid / Ledger）。
> 80mm 小票、100×150 面单这类自定义尺寸请改用 `width` + `height`，不要设 `paperFormat`。

### `print_options`

`paperFormat`（任意纸名，含打印机专有尺寸）、`colorful`、`landscape`、`printerName`、
`pageRanges`、`copies`、`duplexMode`（`simplex` / `duplex` / `duplexshort` / `duplexlong`）、
`scaleMode`（`noscale` / `shrink` / `fit`）、`subset`（`odd` / `even`）、`bin`、`sharp`、
`dpi` / `threshold`（`sharp: true` 时的光栅参数，默认 203 / 160）。

### `extra_options`

`action`（`print` / `preview`）、`requestTimeout`（秒）、`devtool`、`cookies`、`httpHeaders`、
`localStorages`、`sessionStorages`，以及任意自定义键（会随响应原样返回）。

## 示例

预览一张 A4 发票（不出纸）：

```json
{
  "tool": "printHtml",
  "arguments": {
    "html": "<h1>发票 #12345</h1><p>合计 ¥99.99</p>",
    "dry_run": true,
    "paper_format": "A4",
    "pdf_options": { "printBackground": true, "margin": { "top": "10mm", "bottom": "10mm" } }
  }
}
```

真正打印到指定打印机、双面、两份：

```json
{
  "tool": "printHtml",
  "arguments": {
    "html": "<h1>对账单</h1>",
    "dry_run": false,
    "printer_name": "财务室激光",
    "copies": 2,
    "print_options": { "duplexMode": "duplex", "colorful": false }
  }
}
```

打印 80mm 热敏小票（自定义纸宽）：

```json
{
  "tool": "printHtml",
  "arguments": {
    "html": "<div style='width:72mm'>小票内容</div>",
    "dry_run": false,
    "pdf_options": { "width": "80mm", "height": "297mm", "margin": { "top": "0", "bottom": "0", "left": "2mm", "right": "2mm" } },
    "print_options": { "paperFormat": "80mm", "sharp": true }
  }
}
```

打印本机 PDF 文件：

```json
{ "tool": "printFile", "arguments": { "path": "<path-to-pdf>", "dry_run": false } }
```

批量混合任务：

```json
{
  "tool": "batchPrint",
  "arguments": {
    "dry_run": false,
    "printer_name": "仓库标签机",
    "tasks": [
      { "type": "printHtml", "data": "<h1>面单 1</h1>" },
      { "type": "printPdfByUrl", "data": "https://example.com/a.pdf" },
      { "type": "printHtmlByUrl", "data": "https://example.com/report" }
    ]
  }
}
```

> 批量任务里每个 `extraOptions.action` 必须一致（客户端在浅合并后会校验），所以别在单个任务里
> 混用 `print` 和 `preview`；统一用顶层 `dry_run` 控制即可。

## 大文件怎么打

MCP 的 stdio 通道单条消息默认上限 **10MB**（SDK 的 `ReadBuffer`），所以：

- `printHtmlByBase64` / `printPdfByBase64` / `printImageByBase64` 只适合小文件——
  约 7MB 以内的 base64（≈5MB 原始文件）。超过后连接会被直接关闭，工具里来不及报错。
- 大 PDF / 图片 / HTML 请用 `printFile`：由 MCP server 在本机读取文件，再通过 WebSocket 发给
  客户端，绕开 MCP 的消息上限。
- 也可以先把文件挂到 HTTP 地址，用 `printPdfByUrl` / `printImageByUrl` / `printHtmlByUrl`。

## 与 [web-print-pdf@2.1.9](https://www.npmjs.com/package/web-print-pdf) 的覆盖对照

| 上游公开 API | 本 MCP |
|---|---|
| `printHtml` / `printHtmlByUrl` / `printHtmlByBase64` | ✅ 同名 |
| `printPdfByUrl` / `printPdfByBase64` | ✅ 同名 |
| `printImageByUrl` / `printImageByBase64` | ✅ 同名 |
| `batchPrint` | ✅ 同名 |
| `utils.getConnectStatus` / `utils.getPrinterList` / `utils.getPrinterPapers` | ✅ 去掉 `utils.` 前缀后同名 |
| `utils.setTitle` / `utils.setThemeColor` / `utils.switchTabsVisibility` / `utils.setContactUsTabInnerHtml` | ✅ 去掉 `utils.` 前缀后同名 |
| `utils.onResponse` / `utils.onError` | — 事件回调，MCP 里每个调用都有返回值，不需要 |
| `_printByRawMessage` | — 下划线私有 API，未纳入 |

外加一个上游没有的方法：`printFile`（按本机路径打印，避免把大文件塞进 MCP 消息）。

## 实现要点

- 请求字段放在消息**顶层**（`content` / `url` / `printOptions` …），不在 `data` 里；这是客户端
  `websocket/standard/index.js` 的约定，与 `web-print-pdf` 的 `dist/index.js` 一致。
- 响应形如 `{ id, type, timestamp, success, data }`，`data` 里通常有 `pdfFileName` /
  `pdfUrl` / `printPreviewUrl` / `pdfPath`。
- `extraOptions.action = 'preview'` 时，客户端走 `core/printPdf._printPreview()`，只渲染不送印，
  也**不检查授权**；`action = 'print'` 才会检查 `NOTALLOWUSE`。
- `pdfOptions.paperFormat` 只认固定枚举；`printOptions.paperFormat` 认任意纸名——代码里对两者分别处理。
- 客户端对 `pdfOptions` / `printOptions` 做**白名单校验**，未知字段直接报错；`extraOptions` 允许自定义键。
- HTML / PDF 的 Base64 入参会去掉 `data:...;base64,` 前缀和空白字符；图片通道相反——客户端要求
  `data:image/...;base64,` 前缀并把它原样塞进 `<img src>`，所以服务端会对裸 base64 按文件头补前缀。
- stdout 是 MCP 协议通道，日志一律走 stderr。
- 客户端侧实现见 `ElctronPrintWeb` 仓库：消息入口在 `electronApp/server/websocket/standard/`，
  参数白名单在 `core/generatePdf` 与 `core/printPdf`。

## 本地验证（没装客户端也能跑）

```bash
# 终端 1：假客户端（覆盖全部消息类型）
node test/mock-server.js

# 终端 2：端到端冒烟，会走一遍 16 个工具
node test/smoke.js

# 或交互式调试
npx @modelcontextprotocol/inspector node bin/mcp.js
```

装好宿主后也可以直接用模型验证：dsh 下工具名是 `mcp__webprint__printHtml` 这种带命名空间的形式，
先 `getConnectStatus` 探活，再 `printHtml` + `dry_run: true` 看预览是否生成即可。

## 已知边界

- 只支持本机已启动的客户端；没有云端中继。
- 打印是异步队列，返回的是「已提交」，不是「已出纸」。
- 「已提交」只代表进了 Windows 打印队列；打印机暂停 / 离线 / 缺纸时队列会停住。可用
  `Get-PrintJob -PrinterName "<打印机名>"` 看作业状态，别只看工具返回值。
- 未授权时 `dry_run: false` 会报 `Not allowed to use, please purchase authorization`。
- 预览返回的是 URL，agent 看不到图；要「给模型看图」还需把 PDF 转 PNG。
- `printFile` 会读取 agent 指定的本机文件，只应在可信环境里启用。
- 走 Base64 的工具受 MCP stdio 10MB 单条消息上限约束，大文件用 `printFile` 或 URL 通道。
- 批量任务的所有 `extraOptions.action` 必须一致，否则客户端报错。
- MCP 宿主一般给单次工具调用 60s 左右超时；批量或大文件可能被宿主掐断，需要调大宿主超时或拆批。
- 预览模式下非法的 `printerName` 可能被客户端忽略而不报错，正式出纸前建议用 `action: "print"` 验证。
- 参数与消息结构按 `ElctronPrintWeb`（客户端 1.0.9）源码校准：`batchPrint` 任务用 `data` 字段，
  不是 `web-print-pdf` README 示例里的 `content` / `url` / `base64`。

## 相关链接

- 官网：<https://webprintpdf.com/>
- 文档：<https://webprintpdf.com/docs/>
- MCP 接入指南：<https://webprintpdf.com/docs/mcp-print/>
- 客户端下载：<https://webprintpdf.com/downloadApp/>
- web-print-pdf（npm）：<https://www.npmjs.com/package/web-print-pdf>
- 本仓库：<https://github.com/weixiaoyi/mcp-web-print-pdf>

## License

MIT
