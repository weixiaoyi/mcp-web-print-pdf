# mcp-web-print-pdf

[中文](README.md) | **English**

Let AI agents (Claude Desktop / Cursor / dsh) print HTML, web pages, PDFs, and images to local printers.

It does **not** modify the Web Print Expert client or the `web-print-pdf` browser library — it simply
adds another client to the existing `ws://127.0.0.1:16794/websocket/standard` endpoint and maps the
public `web-print-pdf@2.x` API one-to-one onto MCP tools.

- Website: <https://webprintpdf.com/>
- Underlying npm package: [web-print-pdf](https://www.npmjs.com/package/web-print-pdf)
- Docs: <https://webprintpdf.com/docs/>

```
Claude / dsh ──stdio──> mcp-web-print-pdf ──ws──> Web Print Expert client ──> printer
```

## Prerequisites

- Install and start the [Web Print Expert client](https://webprintpdf.com/downloadApp/) (Windows 10/11, macOS 11+, Linux / Kylin / UOS)
- The client listens on `ws://127.0.0.1:16794/websocket/standard` by default
- No changes to the client or your frontend code; this MCP just maps the public [web-print-pdf](https://www.npmjs.com/package/web-print-pdf) API onto MCP tools
- MCP guide: <https://webprintpdf.com/docs/mcp-print/>

## Installation

Nothing to install. Hosts start it via `npx -y mcp-web-print-pdf`; the first run downloads and caches
the package.

> To pin a version, append it to the package name, for example `npx -y mcp-web-print-pdf@0.2.3`.

## Configuration

Every host launches the same MCP server over stdio:

```json
{ "command": "npx", "args": ["-y", "mcp-web-print-pdf"] }
```

> To run from source, replace `command` with `node` and `args` with `["<repo>/bin/mcp.js"]`; all other
> fields stay the same.

### Claude Desktop

`%APPDATA%\Claude\claude_desktop_config.json`:

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

Project-level `.cursor/mcp.json` (applies to the current project only), or global `~/.cursor/mcp.json`:

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

After saving, open **Settings → MCP** in Cursor and make sure `webprint` shows a green dot; the tools
will appear in the Agent's tool list.

### DeepSeek Harness (dsh)

dsh mounts external MCP servers through `@deepseek-ai/dsh-mcp-client`. Edit the current profile's
`~/.dsh/profiles/<profile>/cordis.patch.yml` and append an `insert` block:

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

dsh hot-reloads after saving (`serverName` must match `[A-Za-z0-9_-]{1,32}` and be unique within the
profile). The model sees namespaced tool names: `mcp__webprint__printHtml`,
`mcp__webprint__getPrinterList`, `mcp__webprint__batchPrint`, and so on.

### Claude Code

```bash
claude mcp add --scope user webprint -- npx -y mcp-web-print-pdf
claude mcp list
```

`--scope user` makes it available globally; omit it to scope the server to the current project. For
team sharing, commit a `.mcp.json` at the project root:

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

`.vscode/mcp.json` (note the top-level key is `servers`, not `mcpServers`):

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

Run **MCP: List Servers** from the Command Palette to start, restart, or inspect output. The portable
`.mcp.json` format uses `mcpServers` instead.

### OpenAI Codex CLI

`~/.codex/config.toml`:

```toml
[mcp_servers.webprint]
command = "npx"
args = ["-y", "mcp-web-print-pdf"]
```

### Cline / Roo Code / Kilo Code

In the Cline panel: MCP Servers → Configure → Configure MCP Servers, then edit
`cline_mcp_settings.json`:

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

Roo Code and Kilo Code are Cline forks with the same structure; only the file path differs.

### Cherry Studio

Settings → **MCP Servers** → **Add Server**:

- Type: `STDIO`
- Command: `npx`
- Arguments: `-y mcp-web-print-pdf`

After saving, return to the chat and enable the MCP toggle next to the input box.

### Trae

Settings → **MCP** → **Add manually**, then paste:

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

Project-level configuration goes in `.trae/mcp.json` (enable "Project-level MCP" in Settings first).

### Other hosts

| Host | Config location | Top-level key |
|---|---|---|
| CodeBuddy | `settings.json` | `mcpServers` (add `"disabled": false`) |
| Qoder | `~/.qoder/settings.json` | `mcpServers` (or `qoder mcp add webprint -- npx -y mcp-web-print-pdf`) |
| JetBrains AI Assistant | Settings → Tools → AI Assistant → MCP → Add | `mcpServers` (or Import from Claude) |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `mcpServers` |
| GitHub Copilot CLI | `~/.copilot/mcp-config.json` | `mcpServers` |

> ChatGPT and the claude.ai web app only accept remote HTTP MCP servers and cannot connect to a local
> stdio server; supporting them would require an HTTP bridge (not provided yet). Gemini CLI's personal
> tier has moved to Antigravity, so it is not listed separately.

> The client port defaults to `16794` and can be overridden with `WEBPRINT_PORT`. The WebSocket request
> timeout defaults to 120s and can be overridden with `WEBPRINT_TIMEOUT` (milliseconds).

## Tools

Tool names match the `web-print-pdf@2.x` method names one-to-one (the `utils.` prefix cannot appear in
an MCP tool name, so it is omitted). `printFile` is the only addition — upstream has no "print a local
file by path" method.

### Status and printers

| Tool | Maps to | Purpose |
|---|---|---|
| `getConnectStatus` | `utils.getConnectStatus` | Check whether the client is online |
| `getPrinterList` | `utils.getPrinterList` | List local printers (name + driver) |
| `getPrinterPapers` | `utils.getPrinterPapers` | List the paper sizes a printer supports, for `paper_format` / `print_options.bin` |

### Printing

Every printing tool defaults to `dry_run: false`: it actually prints. To render a preview only, pass
`dry_run: true` explicitly (or `extra_options.action: "preview"`). The default really uses paper —
check the printer and paper first.

> When `paper_format` is omitted, the PDF is rendered at A4 but the print stage uses the client's
> default printer paper. To pin the paper (80mm thermal, 100×150 labels, etc.), pass `paper_format` /
> `pdf_options` explicitly.

| Tool | Purpose |
|---|---|
| `printHtml` | Print an HTML string |
| `printHtmlByUrl` | Fetch a web page and print it |
| `printHtmlByBase64` | Print Base64-encoded HTML |
| `printPdfByUrl` | Print a PDF URL |
| `printPdfByBase64` | Print a Base64-encoded PDF |
| `printImageByUrl` | Print an image URL |
| `printImageByBase64` | Print a Base64-encoded image |
| `printFile` | Print a local `.pdf` / `.html` / image by extension (extra) |
| `batchPrint` | Submit several mixed tasks at once |

> `batchPrint` follows the client's task format: each item is
> `{ type, data, pdfOptions?, printOptions?, extraOptions? }`, **not** the `content` / `url` / `base64`
> fields shown in the upstream README examples. `data` is interpreted by `type`: HTML for `printHtml`,
> a URL for `…ByUrl`, base64 for `…ByBase64`.

### Client settings

| Tool | Maps to | Purpose |
|---|---|---|
| `setTitle` | `utils.setTitle(title \| null)` | Set the window title |
| `setThemeColor` | `utils.setThemeColor(color \| null)` | Set the theme color |
| `switchTabsVisibility` | `utils.switchTabsVisibility(tabs \| null)` | Show/hide tabs |
| `setContactUsTabInnerHtml` | `utils.setContactUsTabInnerHtml(html \| null)` | Set the "Contact us" page |

All four accept `reset: true` to restore defaults — some hosts serialize JSON `null` into the string
`"null"`, in which case `reset: true` is safer than passing `null`.

> 0.1.0 used snake_case (`print_status` / `list_printers` / `print_html` / `print_pdf_url`). Since
> 0.2.0 the names match upstream methods: `print_status` → `getConnectStatus`, `list_printers` →
> `getPrinterList`, `print_html` → `printHtml`, `print_pdf_url` → `printPdfByUrl`.

## Parameters

All printing tools share one parameter set, mirroring the upstream four arguments:

| MCP parameter | Maps to | Notes |
|---|---|---|
| content field | 1st argument | `html` / `url` / `base64` / `path` / `tasks` |
| `pdf_options` | `pdfOptions` | PDF layout: paper, margins, header/footer, background, watermark, page numbers… |
| `print_options` | `printOptions` | Printer delivery: printer name, copies, duplex, scaling, tray, thermal sharpening… |
| `extra_options` | `extraOptions` | `action`, `requestTimeout`, `cookies`, `httpHeaders`, `localStorages`… |
| `dry_run` | — | Prints by default; `true` previews only; an explicit `action` wins |
| `paper_format` | — | Convenience for `print_options.paperFormat` |
| `printer_name` | — | Convenience for `print_options.printerName` |
| `copies` | — | Convenience for `print_options.copies` |

`pdf_options` and `print_options` go through the client's whitelist validation (a misspelled field
fails immediately); `extra_options` allows arbitrary custom keys, which are passed through and returned
in the response.

Merge rule: **fields explicitly set inside an options object win**; convenience parameters only fill
gaps.

### `pdf_options`

`paperFormat`, `width`, `height`, `displayHeaderFooter`, `headerTemplate`, `footerTemplate`,
`landscape`, `margin{top,right,bottom,left}`, `pageRanges[{from,to}]`, `preferCSSPageSize`,
`printBackground`, `scale`, `outline`, `tagged`, `watermark`, `pageNumber`.

> `pdfOptions.paperFormat` only accepts a fixed set (A0–A6 / Letter / Legal / Tabloid / Ledger). For
> custom sizes such as 80mm receipts or 100×150 labels, use `width` + `height` and leave
> `paperFormat` unset.

### `print_options`

`paperFormat` (any paper name, including printer-specific sizes), `colorful`, `landscape`,
`printerName`, `pageRanges`, `copies`, `duplexMode`
(`simplex` / `duplex` / `duplexshort` / `duplexlong`), `scaleMode` (`noscale` / `shrink` / `fit`),
`subset` (`odd` / `even`), `bin`, `sharp`, `dpi` / `threshold` (raster settings when `sharp: true`,
defaults 203 / 160).

### `extra_options`

`action` (`print` / `preview`), `requestTimeout` (seconds), `devtool`, `cookies`, `httpHeaders`,
`localStorages`, `sessionStorages`, plus arbitrary custom keys (returned verbatim in the response).

## Examples

Preview an A4 invoice (no paper):

```json
{
  "tool": "printHtml",
  "arguments": {
    "html": "<h1>Invoice #12345</h1><p>Total ¥99.99</p>",
    "dry_run": true,
    "paper_format": "A4",
    "pdf_options": { "printBackground": true, "margin": { "top": "10mm", "bottom": "10mm" } }
  }
}
```

Actually print to a specific printer, duplex, two copies:

```json
{
  "tool": "printHtml",
  "arguments": {
    "html": "<h1>Statement</h1>",
    "dry_run": false,
    "printer_name": "Finance Laser",
    "copies": 2,
    "print_options": { "duplexMode": "duplex", "colorful": false }
  }
}
```

Print an 80mm thermal receipt (custom paper width):

```json
{
  "tool": "printHtml",
  "arguments": {
    "html": "<div style='width:72mm'>Receipt content</div>",
    "dry_run": false,
    "pdf_options": { "width": "80mm", "height": "297mm", "margin": { "top": "0", "bottom": "0", "left": "2mm", "right": "2mm" } },
    "print_options": { "paperFormat": "80mm", "sharp": true }
  }
}
```

Print a local PDF file:

```json
{ "tool": "printFile", "arguments": { "path": "<path-to-pdf>", "dry_run": false } }
```

Batch of mixed tasks:

```json
{
  "tool": "batchPrint",
  "arguments": {
    "dry_run": false,
    "printer_name": "Warehouse Label Printer",
    "tasks": [
      { "type": "printHtml", "data": "<h1>Label 1</h1>" },
      { "type": "printPdfByUrl", "data": "https://example.com/a.pdf" },
      { "type": "printHtmlByUrl", "data": "https://example.com/report" }
    ]
  }
}
```

> Every task's `extraOptions.action` must be the same (the client validates after a shallow merge), so
> do not mix `print` and `preview` per task; control it with the top-level `dry_run` instead.

## Printing large files

MCP's stdio channel has a default **10MB** per-message limit (the SDK's `ReadBuffer`), so:

- `printHtmlByBase64` / `printPdfByBase64` / `printImageByBase64` are for small files only — roughly
  7MB of base64 (≈5MB raw). Beyond that the connection is closed before the tool can report an error.
- For large PDFs / images / HTML, use `printFile`: the MCP server reads the file locally and sends it to
  the client over WebSocket, bypassing the MCP message limit.
- Alternatively host the file over HTTP and use `printPdfByUrl` / `printImageByUrl` / `printHtmlByUrl`.

## Coverage vs [web-print-pdf@2.1.9](https://www.npmjs.com/package/web-print-pdf)

| Upstream public API | This MCP |
|---|---|
| `printHtml` / `printHtmlByUrl` / `printHtmlByBase64` | ✅ same name |
| `printPdfByUrl` / `printPdfByBase64` | ✅ same name |
| `printImageByUrl` / `printImageByBase64` | ✅ same name |
| `batchPrint` | ✅ same name |
| `utils.getConnectStatus` / `utils.getPrinterList` / `utils.getPrinterPapers` | ✅ same name without the `utils.` prefix |
| `utils.setTitle` / `utils.setThemeColor` / `utils.switchTabsVisibility` / `utils.setContactUsTabInnerHtml` | ✅ same name without the `utils.` prefix |
| `utils.onResponse` / `utils.onError` | — event callbacks; every MCP call already returns a value |
| `_printByRawMessage` | — private underscore API, not mapped |

Plus one method upstream does not have: `printFile` (print by local path, avoiding large payloads over
MCP).

## Implementation notes

- Request fields live at the **top level** of the message (`content` / `url` / `printOptions` …), not
  inside `data`; this is the client's `websocket/standard/index.js` convention, matching
  `web-print-pdf`'s `dist/index.js`.
- Responses look like `{ id, type, timestamp, success, data }`, where `data` usually contains
  `pdfFileName` / `pdfUrl` / `printPreviewUrl` / `pdfPath`.
- With `extraOptions.action = 'preview'`, the client takes `core/printPdf._printPreview()`: it renders
  without printing and **skips the license check**; only `action = 'print'` checks `NOTALLOWUSE`.
- `pdfOptions.paperFormat` only accepts a fixed set; `printOptions.paperFormat` accepts any paper name —
  the code handles them separately.
- The client performs **whitelist validation** on `pdfOptions` / `printOptions` and rejects unknown
  fields; `extraOptions` allows custom keys.
- Base64 input for HTML / PDF has its `data:...;base64,` prefix and whitespace stripped. The image
  channel is the opposite — the client requires the `data:image/...;base64,` prefix and injects it into
  `<img src>`, so the server adds the prefix for bare base64 based on the file header.
- stdout is the MCP protocol channel; all logs go to stderr.
- The client-side implementation lives in the `ElctronPrintWeb` repository: message entry points under
  `electronApp/server/websocket/standard/`, option whitelists in `core/generatePdf` and
  `core/printPdf`.

## Local development

```bash
git clone https://github.com/weixiaoyi/mcp-web-print-pdf.git
cd mcp-web-print-pdf
npm install
npm test
```

`npm test` runs unit tests for option merging and the default action; the end-to-end smoke test is
below.

## Local verification (works without the client)

```bash
# Terminal 1: fake client (covers every message type)
node test/mock-server.js

# Terminal 2: end-to-end smoke test, walks through all 16 tools
node test/smoke.js

# Or interactive debugging
npx @modelcontextprotocol/inspector node bin/mcp.js
```

You can also verify directly from a host: in dsh the tool names are namespaced like
`mcp__webprint__printHtml`; call `getConnectStatus` first, then `printHtml` with `dry_run: true` and
check that a preview appears.

## Known limitations

- Only works with a locally running client; there is no cloud relay.
- Printing is an asynchronous queue: the result means "submitted", not "paper came out".
- "Submitted" only means the job reached the Windows print queue; a paused / offline / out-of-paper
  printer will hold it. Use `Get-PrintJob -PrinterName "<printer>"` to check the job, not just the tool
  result.
- Without a license, `dry_run: false` fails with
  `Not allowed to use, please purchase authorization`.
- Previews return a URL; the agent cannot see the image. To "show the model the page" you still need to
  convert the PDF to PNG.
- `printFile` reads local files named by the agent; enable it only in trusted environments.
- Base64 tools are constrained by MCP stdio's 10MB per-message limit; use `printFile` or URL channels
  for large files.
- All `extraOptions.action` values in a batch must match, otherwise the client errors.
- MCP hosts typically time out a single tool call at around 60s; batches or large files may be cut off —
  raise the host timeout or split the batch.
- In preview mode an invalid `printerName` may be silently ignored; verify with `action: "print"`
  before relying on it for real output.
- Parameters and message shapes are calibrated against the `ElctronPrintWeb` (client 1.0.9) source:
  `batchPrint` tasks use a `data` field, not the `content` / `url` / `base64` fields shown in the
  `web-print-pdf` README examples.

## Links

- Website: <https://webprintpdf.com/>
- Docs: <https://webprintpdf.com/docs/>
- MCP guide: <https://webprintpdf.com/docs/mcp-print/>
- Client download: <https://webprintpdf.com/downloadApp/>
- web-print-pdf (npm): <https://www.npmjs.com/package/web-print-pdf>
- This repository: <https://github.com/weixiaoyi/mcp-web-print-pdf>

## License

MIT
