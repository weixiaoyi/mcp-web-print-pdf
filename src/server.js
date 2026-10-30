import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { z } from "zod";
import { WebPrintClient } from "./webprint-client.js";
import {
    buildOptions,
    extraOptionsSchema,
    pdfOptionsSchema,
    printArgsShape,
    printOptionsSchema,
    stripDataUrl,
    toImageDataUrl,
} from "./options.js";

const client = new WebPrintClient();

// 批量任务可能包含多份文档，给足时间
const BATCH_TIMEOUT = 600_000;

const ok = (text) => ({ content: [{ type: "text", text }] });
const fail = (err) => ({
    content: [{ type: "text", text: `失败：${err?.message || err}` }],
    isError: true,
});

/** 统一包 try/catch，避免任何一个工具把异常抛给 MCP 框架。 */
const guard = (fn) => async (args) => {
    try {
        return await fn(args);
    } catch (err) {
        return fail(err);
    }
};

function jsonPreview(value, max = 4000) {
    let text;
    try {
        text = JSON.stringify(value);
    } catch {
        text = String(value);
    }
    if (text === undefined) text = String(value);
    return text.length > max ? `${text.slice(0, max)}…（已截断）` : text;
}

function describeResult(res, action) {
    const preview = action === "preview";
    if (res === undefined || res === null || res === true) {
        return preview ? "已渲染预览（未出纸）。" : "已提交到打印机。";
    }

    const lines = [preview ? "已渲染预览（未出纸）" : "已提交到打印机"];

    if (Array.isArray(res)) {
        lines.push(`任务数：${res.length}`);
        res.forEach((item, index) => {
            const url = item?.pdfUrl || item?.printPreviewUrl;
            if (url) lines.push(`${index + 1}. ${url}`);
        });
    } else if (typeof res === "object") {
        if (Array.isArray(res.pdfs)) {
            lines.push(`任务数：${res.pdfs.length}`);
            res.pdfs.forEach((item, index) => {
                const url = item?.pdfUrl || item?.printPreviewUrl;
                if (url) lines.push(`${index + 1}. ${url}`);
            });
        }
        if (res.pdfFileName) lines.push(`文件：${res.pdfFileName}`);
        if (res.pdfUrl) lines.push(`PDF：${res.pdfUrl}`);
        if (res.printPreviewUrl) lines.push(`预览页面：${res.printPreviewUrl}`);
        if (res.pdfPath) lines.push(`本地路径：${res.pdfPath}`);
    }

    // 客户端返回了没见过的结构时，把原始 JSON 给 agent，别吞掉
    if (lines.length === 1) lines.push(`返回：${jsonPreview(res)}`);
    return lines.join("\n");
}

const ack = (res) => (res === undefined || res === null || res === true ? "" : `\n返回：${jsonPreview(res)}`);

async function printVia(method, payload, args, timeout) {
    const { pdfOptions, printOptions, extraOptions, action } = buildOptions(args);
    const res = await client.request(
        method,
        { ...payload, pdfOptions, printOptions, extraOptions },
        timeout
    );
    return ok(describeResult(res, action));
}

const FILE_KINDS = new Map([
    [".pdf", "pdf"],
    [".html", "html"],
    [".htm", "html"],
    [".png", "image"],
    [".jpg", "image"],
    [".jpeg", "image"],
    [".webp", "image"],
    [".bmp", "image"],
    [".gif", "image"],
    [".tif", "image"],
    [".tiff", "image"],
]);

const BATCH_TYPES = [
    "printHtml",
    "printHtmlByUrl",
    "printHtmlByBase64",
    "printPdfByUrl",
    "printPdfByBase64",
    "printImageByUrl",
    "printImageByBase64",
];

const batchTaskSchema = z
    .object({
        type: z.enum(BATCH_TYPES).describe("任务类型，对应上游方法名"),
        data: z
            .string()
            .min(1)
            .describe("任务内容：printHtml 传 HTML，…ByUrl 传地址，…ByBase64 传 base64"),
        pdfOptions: pdfOptionsSchema.optional(),
        printOptions: printOptionsSchema.optional(),
        extraOptions: extraOptionsSchema.optional(),
    })
    .strict()
    .describe("单个批量任务；客户端只认 type/data/pdfOptions/printOptions/extraOptions 这五个字段");

const tabVisibilitySchema = z.object({
    name: z.enum(["BasicInfo", "Printers", "Logs", "Run Example", "ContactUs"]),
    visible: z.boolean(),
});

export async function start() {
    const server = new McpServer({
        name: "mcp-web-print-pdf",
        version: "0.2.0",
    });

    /** 注册一个「一种内容来源 + 完整打印选项」的工具。 */
    const registerPrint = (name, description, extraShape, method, toPayload, timeout) => {
        server.tool(
            name,
            description,
            { ...extraShape, ...printArgsShape },
            guard(async (args) => printVia(method, toPayload(args), args, timeout))
        );
    };

    // ---------------------------------------------------------------- 状态 / 打印机

    server.tool(
        "getConnectStatus",
        "检查本地「Web打印专家」客户端是否在线",
        {},
        guard(async () => {
            await client.request("getConnectStatus", {}, 5_000);
            return ok(`客户端在线：${client.url}`);
        })
    );

    server.tool(
        "getPrinterList",
        "列出本机可用的打印机（名称 + 驱动）",
        {},
        guard(async () => {
            const printers = await client.request("getPrinterList", {}, 15_000);
            if (!Array.isArray(printers) || printers.length === 0) {
                return ok("本机没有检测到打印机。");
            }
            const table = printers
                .map((p) => `- ${p.name}${p.default ? "（默认）" : ""}${p.driverName ? ` · ${p.driverName}` : ""}`)
                .join("\n");
            return ok(table);
        })
    );

    server.tool(
        "getPrinterPapers",
        "查询指定打印机支持的纸张列表，用于填 paper_format / print_options.paperFormat / print_options.bin",
        {
            printer_name: z.string().describe("打印机名称，取自 getPrinterList"),
            driver_name: z.string().optional().describe("驱动名；不填会自动从打印机列表里查"),
        },
        guard(async ({ printer_name, driver_name }) => {
            let printer;
            if (driver_name) {
                printer = { name: printer_name, driverName: driver_name };
            } else {
                const printers = await client.request("getPrinterList", {}, 15_000);
                const list = Array.isArray(printers) ? printers : [];
                printer = list.find((p) => p?.name === printer_name);
                if (!printer) {
                    const names = list.map((p) => p?.name).filter(Boolean).slice(0, 10).join("、") || "(空)";
                    throw new Error(`找不到打印机「${printer_name}」。先调用 getPrinterList 确认名称，现有：${names}`);
                }
            }
            const papers = await client.request("getPrinterPapers", { printer }, 15_000);
            if (!Array.isArray(papers) || papers.length === 0) {
                return ok(`打印机「${printer_name}」没有返回可选纸张。`);
            }
            const lines = papers.map((p) => {
                const size = p?.width && p?.height ? ` · ${p.width}×${p.height}${p.unit || ""}` : "";
                return `- ${p?.name || "(未命名)"}${size}`;
            });
            return ok(`打印机：${printer_name}\n${lines.join("\n")}`);
        })
    );

    // ---------------------------------------------------------------- 打印

    registerPrint(
        "printHtml",
        "把 HTML 字符串渲染成 PDF 并打印。默认只渲染预览、不出纸（dry_run: false 才出纸）",
        { html: z.string().describe("完整页面或 HTML 片段") },
        "printHtml",
        ({ html }) => ({ content: html })
    );

    registerPrint(
        "printHtmlByUrl",
        "抓取一个网页并渲染成 PDF 打印。默认只预览；登录态可用 extra_options.cookies / httpHeaders / localStorages 处理",
        { url: z.string().url().describe("网页 http(s) 地址") },
        "printHtmlByUrl",
        ({ url }) => ({ url })
    );

    registerPrint(
        "printHtmlByBase64",
        "把 Base64 编码的 HTML 渲染成 PDF 打印。默认只预览",
        { base64: z.string().min(1).describe("HTML 的 base64，可带 data:text/html;base64, 前缀") },
        "printHtmlByBase64",
        ({ base64 }) => ({ base64: stripDataUrl(base64) })
    );

    registerPrint(
        "printPdfByUrl",
        "下载一个 PDF 链接并打印。默认只渲染预览、不出纸",
        { url: z.string().url().describe("PDF 的 http(s) 地址") },
        "printPdfByUrl",
        ({ url }) => ({ url })
    );

    registerPrint(
        "printPdfByBase64",
        "把 Base64 编码的 PDF 打印。默认只预览",
        { base64: z.string().min(1).describe("PDF 的 base64，可带 data:application/pdf;base64, 前缀") },
        "printPdfByBase64",
        ({ base64 }) => ({ base64: stripDataUrl(base64) })
    );

    registerPrint(
        "printImageByUrl",
        "下载一张图片并打印。默认只预览",
        { url: z.string().url().describe("图片的 http(s) 地址") },
        "printImageByUrl",
        ({ url }) => ({ url })
    );

    registerPrint(
        "printImageByBase64",
        "把 Base64 编码的图片打印。默认只预览；缺 data:image/...;base64, 前缀时会自动补",
        { base64: z.string().min(1).describe("图片的 base64；带不带 data:image/...;base64, 前缀都可以") },
        "printImageByBase64",
        ({ base64 }) => ({ base64: toImageDataUrl(base64) })
    );

    server.tool(
        "printFile",
        "打印本机文件：按扩展名自动选择 PDF / HTML / 图片通道。默认只预览、不出纸",
        {
            path: z.string().min(1).describe("本机文件路径，绝对路径或相对当前工作目录"),
            ...printArgsShape,
        },
        guard(async (args) => {
            const file = resolve(args.path);
            const kind = FILE_KINDS.get(extname(file).toLowerCase());
            if (!kind) {
                throw new Error(
                    `不支持的文件类型：${extname(file) || "(无扩展名)"}。支持 .pdf / .html / .htm / .png / .jpg / .jpeg / .webp / .bmp / .gif / .tif / .tiff`
                );
            }
            const base64 = (await readFile(file)).toString("base64");
            const method =
                kind === "pdf" ? "printPdfByBase64" : kind === "html" ? "printHtmlByBase64" : "printImageByBase64";
            return printVia(method, { base64: kind === "image" ? toImageDataUrl(base64) : base64 }, args);
        })
    );

    server.tool(
        "batchPrint",
        "一次提交多个打印任务（HTML / 网页 / PDF / 图片，URL 或 Base64 混合）。默认只预览、不出纸",
        {
            tasks: z.array(batchTaskSchema).min(1).describe("任务列表，每项含 type 与对应内容字段"),
            ...printArgsShape,
        },
        guard(async (args) => {
            const printTaskList = args.tasks.map((task) => {
                // 客户端按任务类型把 data 映射到 content / url / base64；
                // 图片通道还要求 data 是完整的 data URL
                if (task.type === "printImageByBase64") {
                    return { ...task, data: toImageDataUrl(task.data) };
                }
                if (task.type === "printHtmlByBase64" || task.type === "printPdfByBase64") {
                    return { ...task, data: stripDataUrl(task.data) };
                }
                return task;
            });
            return printVia("batchPrint", { printTaskList }, args, BATCH_TIMEOUT);
        })
    );

    // ---------------------------------------------------------------- 客户端设置

    server.tool(
        "setTitle",
        "设置客户端窗口标题；reset: true（或 title: null）= 恢复默认",
        {
            title: z.string().nullable().optional().describe("新标题；传 null 恢复默认"),
            reset: z.boolean().optional().describe("true = 恢复默认，等价于 title: null"),
        },
        guard(async ({ title, reset }) => {
            if (!reset && title === undefined) throw new Error("请提供 title，或传 reset: true 恢复默认");
            const value = reset ? null : title;
            const res = await client.request("setTitle", { title: value }, 15_000);
            return ok(`已${value === null ? "恢复默认" : `设置为「${value}」`}客户端标题。${ack(res)}`);
        })
    );

    server.tool(
        "setThemeColor",
        "设置客户端主题色，如 rgb(229,182,80)；reset: true（或 theme_color: null）= 恢复默认",
        {
            theme_color: z.string().nullable().optional().describe("rgb(...) 颜色；传 null 恢复默认"),
            reset: z.boolean().optional().describe("true = 恢复默认，等价于 theme_color: null"),
        },
        guard(async ({ theme_color, reset }) => {
            if (!reset && theme_color === undefined) {
                throw new Error("请提供 theme_color，或传 reset: true 恢复默认");
            }
            const value = reset ? null : theme_color;
            const res = await client.request("setThemeColor", { themeColor: value }, 15_000);
            return ok(`已${value === null ? "恢复默认" : `设置为 ${value}`}客户端主题色。${ack(res)}`);
        })
    );

    server.tool(
        "switchTabsVisibility",
        "切换客户端 5 个标签页的显隐；reset: true（或 tabs: null）= 全部恢复默认",
        {
            tabs: z.array(tabVisibilitySchema).nullable().optional().describe("要改的标签页；传 null 恢复默认"),
            reset: z.boolean().optional().describe("true = 恢复默认，等价于 tabs: null"),
        },
        guard(async ({ tabs, reset }) => {
            if (!reset && tabs === undefined) throw new Error("请提供 tabs，或传 reset: true 恢复默认");
            const value = reset ? null : tabs;
            const res = await client.request("switchTabsVisibility", { tabsVisibility: value }, 15_000);
            return ok(`已${value === null ? "恢复默认" : "更新"}标签页显隐。${ack(res)}`);
        })
    );

    server.tool(
        "setContactUsTabInnerHtml",
        "设置客户端「联系我们」页面的 HTML；reset: true（或 html: null）= 恢复默认",
        {
            html: z.string().nullable().optional().describe("新的 HTML；传 null 恢复默认"),
            reset: z.boolean().optional().describe("true = 恢复默认，等价于 html: null"),
        },
        guard(async ({ html, reset }) => {
            if (!reset && html === undefined) throw new Error("请提供 html，或传 reset: true 恢复默认");
            const value = reset ? null : html;
            const res = await client.request("setContactUsTabInnerHtml", { html: value }, 15_000);
            return ok(`已${value === null ? "恢复默认" : "更新"}「联系我们」页面。${ack(res)}`);
        })
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[mcp-web-print-pdf] 已启动 → ${client.url}`);
}
