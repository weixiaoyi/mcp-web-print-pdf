/**
 * 端到端冒烟测试：用官方 SDK 的 Client 拉起 bin/mcp.js，
 * 走完 initialize → tools/list → tools/call。
 *
 * 需要「Web打印专家」客户端在 16794 上运行（或用 test/mock-server.js 顶替）：
 *   node test/mock-server.js
 *   node test/smoke.js
 *
 * 测试内部会起一个 127.0.0.1 的临时静态服务，提供网页、图片和一个最小 PDF，
 * 所以不依赖外网。
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createServer } from "node:http";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 1x1 PNG，用来测图片通道
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
);

/** 手搓一个最小可用的单页 PDF，避免依赖客户端生成的大文件。 */
function makeMinimalPdf(text = "Hello PDF") {
    const stream = `BT /F1 18 Tf 30 100 Td (${text}) Tj ET`;
    const objects = [
        null,
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];

    let out = "%PDF-1.4\n";
    const offsets = [];
    for (let i = 1; i < objects.length; i++) {
        offsets[i] = Buffer.byteLength(out, "latin1");
        out += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefOffset = Buffer.byteLength(out, "latin1");
    out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) {
        out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(out, "latin1");
}

const PDF = makeMinimalPdf();

const httpServer = createServer((req, res) => {
    const pathname = (req.url || "").split("?")[0];
    const send = (headers, body) => {
        res.writeHead(200, headers);
        res.end(req.method === "HEAD" ? undefined : body);
    };
    if (pathname === "/page.html") {
        send({ "content-type": "text/html; charset=utf-8" }, "<h1>Remote page</h1>");
        return;
    }
    if (pathname === "/image.png") {
        send({ "content-type": "image/png", "content-length": PNG.length }, PNG);
        return;
    }
    if (pathname === "/doc.pdf") {
        send({ "content-type": "application/pdf", "content-length": PDF.length }, PDF);
        return;
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
});
await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

// 默认跑本地源码；也可以用 MCP_COMMAND / MCP_ARGS / MCP_CWD 指向线上包：
//   MCP_COMMAND=npx MCP_ARGS="-y mcp-web-print-pdf@0.2.0" MCP_CWD=C:/Users/admin node test/smoke.js
const command = process.env.MCP_COMMAND || process.execPath;
const args = process.env.MCP_ARGS
    ? process.env.MCP_ARGS.split(/\s+/).filter(Boolean)
    : ["bin/mcp.js"];
const cwd = process.env.MCP_CWD || process.cwd();

console.log(`mcp: ${command} ${args.join(" ")} (cwd: ${cwd})`);

const transport = new StdioClientTransport({
    command,
    args,
    cwd,
    stderr: "inherit",
    // SDK 默认只透传白名单环境变量，这里把 WEBPRINT_PORT 之类一起带过去
    env: { ...process.env },
});

const client = new Client({ name: "smoke", version: "0.0.2" });
await client.connect(transport);

const { tools } = await client.listTools();
console.log("tools:", tools.map((t) => t.name).join(", "));

let failed = 0;

const EXPECTED_TOOLS = [
    "getConnectStatus",
    "getPrinterList",
    "getPrinterPapers",
    "printHtml",
    "printHtmlByUrl",
    "printHtmlByBase64",
    "printPdfByUrl",
    "printPdfByBase64",
    "printImageByUrl",
    "printImageByBase64",
    "printFile",
    "batchPrint",
    "setTitle",
    "setThemeColor",
    "switchTabsVisibility",
    "setContactUsTabInnerHtml",
];
const missing = EXPECTED_TOOLS.filter((name) => !tools.some((t) => t.name === name));
if (missing.length) {
    failed++;
    console.error(`\n!! 缺少工具：${missing.join(", ")}`);
}

const CALL_OPTIONS = { timeout: 180_000 };

async function call(name, args) {
    const res = await client.callTool({ name, arguments: args }, undefined, CALL_OPTIONS);
    const text = res.content?.[0]?.text ?? "(empty)";
    if (res.isError) failed++;
    console.log(`\n== ${name} ${res.isError ? "FAILED" : "ok"} ==\n${text}`);
    return text;
}

async function expectError(name, args) {
    const res = await client.callTool({ name, arguments: args }, undefined, CALL_OPTIONS);
    const text = res.content?.[0]?.text ?? "(empty)";
    if (!res.isError) failed++;
    console.log(`\n== ${name} ${res.isError ? "预期失败 ok" : "本该失败却成功 FAILED"} ==\n${text}`);
}

// ---------------------------------------------------------------- 状态与打印机
await call("getConnectStatus", {});

const printersText = await call("getPrinterList", {});
const firstPrinter = printersText.match(/^- (.+?)(?:（默认）)?(?: · .+)?$/m)?.[1];
if (firstPrinter) {
    await call("getPrinterPapers", { printer_name: firstPrinter });
} else {
    console.log("\n!! 没解析出打印机名，跳过 getPrinterPapers");
    failed++;
}

// ---------------------------------------------------------------- 各打印通道（全部预览）
await call("printHtml", { html: "<h1>Hello MCP</h1>", dry_run: true });
await call("printHtmlByUrl", { url: `${baseUrl}/page.html`, dry_run: true });
await call("printHtmlByBase64", {
    base64: Buffer.from("<h1>Base64 HTML</h1>").toString("base64"),
    dry_run: true,
});
await call("printImageByUrl", { url: `${baseUrl}/image.png`, dry_run: true });
await call("printImageByBase64", { base64: PNG.toString("base64"), dry_run: true });
await call("printPdfByUrl", { url: `${baseUrl}/doc.pdf`, dry_run: true });
await call("printPdfByBase64", { base64: PDF.toString("base64"), dry_run: true });

// 完整选项透传：版式 + 页眉页脚 + 打印设置（仍然只预览）
await call("printHtml", {
    html: "<h1>Rich options</h1><p>landscape / margin / header-footer / background</p>",
    dry_run: true,
    paper_format: "A5",
    pdf_options: {
        landscape: true,
        printBackground: true,
        margin: { top: "5mm", bottom: "5mm", left: "5mm", right: "5mm" },
        displayHeaderFooter: true,
        headerTemplate: '<span class="title"></span>',
        footerTemplate: '<span class="pageNumber"></span>/<span class="totalPages"></span>',
    },
    print_options: { colorful: true, scaleMode: "fit" },
});

// ---------------------------------------------------------------- 本地文件
const tempHtml = join(tmpdir(), `mcp-web-print-pdf-smoke-${process.pid}.html`);
const tempPng = join(tmpdir(), `mcp-web-print-pdf-smoke-${process.pid}.png`);
const tempPdf = join(tmpdir(), `mcp-web-print-pdf-smoke-${process.pid}.pdf`);
await writeFile(tempHtml, "<h1>Printed from a local file</h1>", "utf8");
await writeFile(tempPng, PNG);
await writeFile(tempPdf, PDF);
await call("printFile", { path: tempHtml, dry_run: true });
await call("printFile", { path: tempPng, dry_run: true });
await call("printFile", { path: tempPdf, dry_run: true });
for (const file of [tempHtml, tempPng, tempPdf]) await unlink(file).catch(() => {});

await expectError("printFile", { path: join(tmpdir(), "mcp-web-print-pdf-smoke-unsupported.xyz") });
// 客户端对 pdfOptions / printOptions 做白名单校验，拼错字段应当直接失败
await expectError("printHtml", { html: "<h1>x</h1>", print_options: { nope: 1 } });
// 设置类工具什么都不传时应当失败，而不是把客户端改成 undefined
await expectError("setTitle", {});

// ---------------------------------------------------------------- 批量
await call("batchPrint", {
    tasks: [
        { type: "printHtml", data: "<h1>Batch 1</h1>" },
        { type: "printHtmlByUrl", data: `${baseUrl}/page.html` },
        { type: "printImageByBase64", data: `data:image/png;base64,${PNG.toString("base64")}` },
    ],
    dry_run: true,
});

// ---------------------------------------------------------------- 客户端设置
await call("setTitle", { title: "MCP Smoke Test" });
await call("setThemeColor", { theme_color: "rgb(229,182,80)" });
await call("switchTabsVisibility", { tabs: [{ name: "Logs", visible: false }] });
await call("setContactUsTabInnerHtml", { html: "<p>hello</p>" });

// 这些调用会改真实客户端的外观，测完恢复默认（null 与 reset 两条路径都覆盖）
await call("setTitle", { title: null });
await call("setThemeColor", { reset: true });
await call("switchTabsVisibility", { reset: true });
await call("setContactUsTabInnerHtml", { html: null });

await client.close();
httpServer.close();

process.exit(failed ? 1 : 0);
