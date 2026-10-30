<p align="center"><img src="assets/logo.svg" width="96" height="96" alt="mcp-web-print-pdf logo"></p>

<h1 align="center">mcp-web-print-pdf</h1>

<p align="center">
  <b>Let AI agents print HTML / web pages / PDFs / images straight to a local printer</b><br>
  <sub>MCP server for silent printing · Claude Desktop · Cursor · Claude Code · VS Code · Cline · Codex · dsh</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/mcp-web-print-pdf"><img src="https://img.shields.io/npm/v/mcp-web-print-pdf?logo=npm&logoColor=white&label=npm&color=cb3837" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/mcp-web-print-pdf"><img src="https://img.shields.io/npm/dm/mcp-web-print-pdf?logo=npm&logoColor=white&label=downloads&color=cb3837" alt="npm downloads"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-6f42c1" alt="MCP compatible"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white" alt="node >=18"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/weixiaoyi/mcp-web-print-pdf?color=2b9348" alt="license MIT"></a>
  <a href="https://github.com/weixiaoyi/mcp-web-print-pdf/actions/workflows/test.yml"><img src="https://github.com/weixiaoyi/mcp-web-print-pdf/actions/workflows/test.yml/badge.svg?branch=master" alt="CI"></a>
  <a href="https://github.com/weixiaoyi/mcp-web-print-pdf/stargazers"><img src="https://img.shields.io/github/stars/weixiaoyi/mcp-web-print-pdf?style=social" alt="GitHub stars"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs welcome"></a>
</p>

<p align="center">
  <a href="README.md">中文</a> · <b>English</b> ·
  <a href="https://webprintpdf.com/">Website</a> ·
  <a href="https://webprintpdf.com/docs/mcp-print/">MCP guide</a> ·
  <a href="https://webprintpdf.com/downloadApp/">Download client</a>
</p>

---

In one line: **install one MCP server and the model can "say it once, print it once"** — no screenshots,
no browser pop-ups, no asking the user to hit Ctrl+P.

It does **not** modify the Web Print Expert client or the `web-print-pdf` browser library — it simply
adds another client to the existing `ws://127.0.0.1:16794/websocket/standard` endpoint and maps the
public `web-print-pdf@2.x` API one-to-one onto 16 MCP tools.

```
Claude / Cursor / Cline / dsh ──stdio──> mcp-web-print-pdf ──ws──> Web Print Expert client ──> printer
```

## Why this one

| What you want | Usual approach | With mcp-web-print-pdf |
|---|---|---|
| Have the model print an invoice / report | screenshot → open it → Ctrl+P | model calls `printHtml`, silent output |
| Print 100 shipping labels | loop over pages, confirm each one | one `batchPrint` with mixed tasks |
| 80mm thermal receipts | `window.print()` mangles the layout | `pdf_options` controls width / margin / watermark |
| Print a local PDF | upload it, then download it again | `printFile` reads it by path |
| Labels and dot-matrix forms | needs a vendor SDK | system print driver + `print_options` |

Compared with Playwright / Puppeteer printing, this is not "headless browser saves a PDF": it **drives the
printer driver already installed on the machine**. Thermal, dot-matrix and label printers work, driver-level
options (tray, duplex, scaling, sharpening) are reachable, and there is no Chromium download.

## Quick start (30 seconds)

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

1. Install and start the [Web Print Expert client](https://webprintpdf.com/downloadApp/) (listens on `ws://127.0.0.1:16794/websocket/standard`)
2. Paste the JSON above into your host config (locations below)
3. Ask the model to call `getConnectStatus`, then `printHtml` a test page

> The first `npx` run downloads and caches the package; pin it with `npx -y mcp-web-print-pdf@0.2.3`.

## Contents

- [Why this one](#why-this-one) · [Quick start](#quick-start-30-seconds) · [Supported hosts](#supported-hosts)
- [Prerequisites](#prerequisites) · [Installation](#installation) · [Configuration](#configuration)
- [Tools](#tools) · [Parameters](#parameters) · [Examples](#examples)
- [FAQ](#faq)
- [Printing large files](#printing-large-files) · [Implementation notes](#implementation-notes)
- [Local development](#local-development) · [Known limitations](#known-limitations) · [Links](#links)

## Supported hosts

| Host | Config location | Top-level key |
|---|---|---|
| [Claude Desktop](#claude-desktop) | `claude_desktop_config.json` | `mcpServers` |
| [Cursor](#cursor) | `.cursor/mcp.json`, `~/.cursor/mcp.json` | `mcpServers` |
| [Claude Code](#claude-code) | `claude mcp add` or `.mcp.json` | `mcpServers` |
| [VS Code + Copilot](#vs-code--github-copilot) | `.vscode/mcp.json` | `servers` |
| [DeepSeek Harness (dsh)](#deepseek-harness-dsh) | `cordis.patch.yml` | — |
| [Codex CLI](#openai-codex-cli) | `~/.codex/config.toml` | `[mcp_servers.…]` |
| [Cline / Roo / Kilo](#cline--roo-code--kilo-code) | `cline_mcp_settings.json` | `mcpServers` |
| [Cherry Studio](#cherry-studio) · [Trae](#trae) | GUI | `mcpServers` |
| [Other hosts](#other-hosts) | see table | `mcpServers` |

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

## FAQ

### What is MCP, and why route printing through it?

MCP (Model Context Protocol) is the common protocol models use to call external tools. Once printing is
an MCP server, Claude, Cursor, Cline and dsh share one integration instead of each writing its own.

### Does it need a network connection?

No. Every request goes to the local `ws://127.0.0.1:16794/websocket/standard`; only the first `npx`
download needs the network.

### Do I need a separate license?

Previews (`extra_options.action = "preview"` / `dry_run: true`) render without printing and skip the
license check. Real output is validated by the Web Print Expert client; without a license it returns
`Not allowed to use, please purchase authorization`.

### Will it "secretly" print and waste paper?

`dry_run: false` really prints, matching the server-side API semantics. While building a layout pass
`dry_run: true`, then flip it to `false` once the preview looks right.

### Do thermal receipt and label printers work?

Yes. Thermal, dot-matrix and label printers all go through the system driver: shape the page with
`pdf_options.width` / `height`, pick the driver paper name with `print_options.paperFormat`, and add
`sharp: true` + `dpi` for crisper small text.

### How is this different from Playwright / Puppeteer printing?

Playwright renders in headless Chromium and then prints, which means downloading a browser engine and
losing driver-level controls (tray, sharpening, duplex flipping). This project hands the options to the
already-installed client and driver — closer to "actually printing on this machine".

### Does it work on macOS / Linux / domestic OSes?

The client supports Windows 10/11, macOS 11+, and Linux / Kylin / UOS. This MCP server is a plain Node
process (Node ≥ 18), so anywhere the client runs, it runs.

### Why does a preview only return a URL?

Previews return `pdfUrl` / `printPreviewUrl`; the MCP channel carries no image bytes. To let the model
"see" the page you need to convert the PDF to PNG first.

### Why do large files or large HTML payloads fail?

MCP's stdio transport caps a single message at 10MB by default, and Base64 inflates by ~4/3. Use
`printFile` (reads locally) or host the file and use `printPdfByUrl` / `printImageByUrl`.

### What if the client runs on a non-default port?

Set `WEBPRINT_PORT`; set `WEBPRINT_TIMEOUT` (milliseconds) for the request timeout. Pass both through the
host config's `env`.

### Can the ChatGPT or claude.ai web app use it?

Not yet. Those only accept remote HTTP MCP servers, so a local stdio server needs an HTTP bridge (not
provided here).

### Output is blank or clipped — why?

Usually the paper size does not match the content: pass `paper_format` or `pdf_options.width` / `height`
explicitly, and enable `printBackground: true` (backgrounds are not printed by default).

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
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- AI-readable summary: [llms.txt](llms.txt)

## Contributing

Issues, PRs and doc fixes are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

If this saved you time, a ⭐ helps other people searching for "MCP printing" find it.

## License

MIT
