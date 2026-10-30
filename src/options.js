import { z } from "zod";

/**
 * 与 web-print-pdf@2.x / 「Web打印专家」客户端对齐的参数层。
 *
 * 上游每个打印方法都接受 (content, pdfOptions, printOptions, extraOptions)。
 * MCP 把三个对象原样透传，另加少量 top-level 便捷参数（paper_format / printer_name /
 * copies / dry_run），方便 agent 只填最常用的几项。
 *
 * 注意：客户端对 pdfOptions / printOptions 做白名单校验（未知字段直接报错），所以这两个
 * schema 用 strict；extraOptions 客户端允许自定义键，所以用 passthrough。
 */

// pdfOptions.paperFormat 只接受固定枚举；printOptions.paperFormat 接受任意纸名
export const PDF_FORMATS = new Set([
    "A0", "A1", "A2", "A3", "A4", "A5", "A6",
    "Letter", "Legal", "Tabloid", "Ledger",
]);

const lengthValue = z
    .union([z.string(), z.number()])
    .describe("长度，可带单位 px / in / cm / mm，例如 '10mm'、'20px'、12");

const positionValue = z
    .union([z.string(), z.number()])
    .describe("坐标，可传数值，或 alignCenter / alignLeft / alignRight / alignTop / alignBottom");

const marginSchema = z
    .object({
        top: lengthValue.optional(),
        right: lengthValue.optional(),
        bottom: lengthValue.optional(),
        left: lengthValue.optional(),
    })
    .describe("页边距，默认四边 0");

const watermarkSchema = z
    .object({
        text: z.string().optional().describe("文本水印内容"),
        base64: z.string().optional().describe("图片水印（data:image/...;base64,...）"),
        color: z.string().optional().describe("文本水印颜色，建议 rgb(...)"),
        x: positionValue.optional(),
        y: positionValue.optional(),
        size: z.number().optional(),
        rows: z.number().int().optional(),
        cols: z.number().int().optional(),
        xSpace: z.number().optional(),
        ySpace: z.number().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
        angle: z.number().min(0).optional(),
        opacity: z.number().min(0).max(1).optional(),
    })
    .describe("文本或图片水印；文本用 text，图片用 base64");

const pageNumberSchema = z
    .object({
        start: z.number().int().optional(),
        x: positionValue.optional(),
        y: positionValue.optional(),
        format: z.string().optional().describe("如 '{{page}}/{{totalPage}}'"),
        color: z.string().optional(),
        size: z.number().optional(),
        xSpace: z.number().optional(),
        ySpace: z.number().optional(),
        opacity: z.number().min(0).max(1).optional(),
    })
    .describe("页码叠加");

const pageRangeSchema = z.object({
    from: z.number().int().min(1),
    to: z.number().int().min(1),
});

export const pdfOptionsSchema = z
    .object({
        paperFormat: z
            .string()
            .optional()
            .describe("A0-A6 / Letter / Legal / Tabloid / Ledger；自定义尺寸请改用 width + height，不要同时设 paperFormat"),
        width: lengthValue.optional(),
        height: lengthValue.optional(),
        displayHeaderFooter: z.boolean().optional().describe("每页显示页眉页脚，配合 headerTemplate / footerTemplate"),
        headerTemplate: z.string().optional().describe("页眉 HTML，可用 class=date/title/url/pageNumber/totalPages"),
        footerTemplate: z.string().optional(),
        landscape: z.boolean().optional().describe("true = 横向"),
        margin: marginSchema.optional(),
        pageRanges: z.array(pageRangeSchema).optional().describe("打印页码范围；空数组 = 全部"),
        preferCSSPageSize: z.boolean().optional().describe("true = CSS @page 尺寸优先于 width/height/paperFormat"),
        printBackground: z.boolean().optional().describe("是否打印 CSS 背景色/背景图"),
        scale: z.number().min(0.1).max(2).optional().describe("页面缩放，0.1–2"),
        outline: z.boolean().optional().describe("生成 PDF 大纲"),
        tagged: z.boolean().optional().describe("生成带标签（无障碍）PDF"),
        watermark: watermarkSchema.optional(),
        pageNumber: pageNumberSchema.optional(),
    })
    .strict()
    .describe("PDF 排版选项（字段与客户端 pdfOptions 白名单一致，未知字段会报错）");

export const printOptionsSchema = z
    .object({
        paperFormat: z
            .string()
            .optional()
            .describe("任意纸名；打印机专有尺寸先用 getPrinterPapers 查 name"),
        colorful: z.boolean().optional().describe("true = 彩色，false（默认）= 黑白"),
        landscape: z.boolean().optional().describe("内容方向，不旋转物理纸张"),
        printerName: z.string().optional(),
        pageRanges: z.array(pageRangeSchema).optional(),
        copies: z.number().int().min(1).max(999).optional(),
        duplexMode: z
            .enum(["simplex", "duplex", "duplexshort", "duplexlong"])
            .optional()
            .describe("单面 / 双面（短边翻转 / 长边翻转）"),
        scaleMode: z
            .enum(["noscale", "shrink", "fit"])
            .optional()
            .describe("原始大小 / 必要时缩小（默认）/ 填满可打印区域"),
        subset: z.enum(["odd", "even"]).optional().describe("只打奇数页 / 偶数页"),
        bin: z.union([z.number().int(), z.string()]).optional().describe("纸盒编号或名称，取决于驱动"),
        sharp: z.boolean().optional().describe("仅热敏打印机：true 开启锐化抗锯齿"),
        dpi: z.number().positive().optional().describe("sharp=true 时的光栅 DPI，默认 203"),
        threshold: z.number().min(0).max(255).optional().describe("sharp=true 时的二值化阈值，默认 160"),
    })
    .strict()
    .describe("打印机选项（字段与客户端 printOptions 白名单一致，未知字段会报错）");

export const extraOptionsSchema = z
    .object({
        action: z.enum(["print", "preview"]).optional().describe("print = 出纸；preview = 只渲染并返回预览地址"),
        requestTimeout: z.number().positive().max(3600).optional().describe("加载 URL 的网络超时，单位秒，默认 15"),
        devtool: z.boolean().optional().describe("渲染 HTML 时打开 DevTools，仅开发调试"),
        cookies: z.record(z.string()).optional().describe("随页面请求发送的 Cookie"),
        localStorages: z.record(z.string()).optional().describe("注入被打印页面的 localStorage"),
        sessionStorages: z.record(z.string()).optional().describe("注入被打印页面的 sessionStorage"),
        httpHeaders: z.record(z.string()).optional().describe("附加请求头，值必须是字符串"),
    })
    .passthrough()
    .describe("额外选项：action/requestTimeout/cookies/httpHeaders/localStorages/sessionStorages，以及任意自定义键（会原样返回）");

/**
 * 各打印工具共用的参数定义。
 */
export const printArgsShape = {
    pdf_options: pdfOptionsSchema.optional(),
    print_options: printOptionsSchema.optional(),
    extra_options: extraOptionsSchema.optional(),
    paper_format: z
        .string()
        .optional()
        .describe("便捷参数：纸张名。标准纸名会同时写入 pdf_options.paperFormat 与 print_options.paperFormat；其它纸名只写后者"),
    printer_name: z.string().optional().describe("便捷参数：打印机名，留空用系统默认打印机"),
    copies: z.number().int().min(1).max(999).optional().describe("便捷参数：份数"),
    dry_run: z
        .boolean()
        .default(true)
        .describe("true（默认）= 只渲染预览不出纸；false = 真正出纸。显式 extra_options.action 优先于本项"),
};

/**
 * 合并顶层便捷参数与三个选项对象。
 *
 * 优先级：pdf_options / print_options / extra_options 里显式写的字段优先，
 * 便捷参数只补空缺，避免同名字段互相打架。
 *
 * @returns {{ pdfOptions: object, printOptions: object, extraOptions: object, action: string }}
 */
export function buildOptions(args = {}) {
    const pdfOptions = { ...(args.pdf_options || {}) };
    const printOptions = { ...(args.print_options || {}) };
    const extraOptions = { ...(args.extra_options || {}) };

    const paper = args.paper_format;
    if (paper) {
        if (printOptions.paperFormat === undefined) printOptions.paperFormat = paper;
        // 非标准纸名（80mm、100x150…）不能塞进 pdfOptions.paperFormat，否则客户端直接报错；
        // 这类纸张请用 pdf_options.width / height 指定 PDF 尺寸。
        if (PDF_FORMATS.has(paper) && pdfOptions.paperFormat === undefined) {
            pdfOptions.paperFormat = paper;
        }
    }

    if (args.printer_name && printOptions.printerName === undefined) {
        printOptions.printerName = args.printer_name;
    }
    if (args.copies && printOptions.copies === undefined) {
        printOptions.copies = args.copies;
    }

    const action = extraOptions.action || (args.dry_run === false ? "print" : "preview");
    extraOptions.action = action;

    return { pdfOptions, printOptions, extraOptions, action };
}

/** HTML / PDF 的 base64 允许带 data URL 前缀，客户端自己会去掉。 */
export function stripDataUrl(input) {
    const match = /^data:[^,]*;base64,/i.exec(input);
    const body = match ? input.slice(match[0].length) : input;
    // 有些工具输出的 base64 带换行，客户端不一定容忍
    return body.replace(/\s+/g, "");
}

/** 从文件头判断图片 MIME，兜底 image/png。 */
export function sniffImageMime(buffer, fallback = "image/png") {
    if (!buffer || buffer.length < 4) return fallback;
    if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return "image/png";
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
    const head6 = buffer.subarray(0, 6).toString("latin1");
    if (head6 === "GIF87a" || head6 === "GIF89a") return "image/gif";
    if (buffer.subarray(0, 2).toString("latin1") === "BM") return "image/bmp";
    if (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
        buffer.subarray(8, 12).toString("latin1") === "WEBP"
    ) {
        return "image/webp";
    }
    const head4 = buffer.subarray(0, 4).toString("latin1");
    if (head4 === "II*\u0000" || head4 === "MM\u0000*") return "image/tiff";
    return fallback;
}

/**
 * 图片通道要求 base64 必须带 `data:image/xxx;base64,` 前缀——
 * 客户端会把它原样塞进 <img src>，缺前缀会直接报错。
 */
export function toImageDataUrl(input, fallbackMime = "image/png") {
    const value = String(input).trim();
    const existing = /^data:image\/[a-z0-9.+-]+;base64,/i.exec(value);
    if (existing) {
        const body = value.slice(existing[0].length).replace(/\s+/g, "");
        return `${existing[0]}${body}`;
    }
    const body = value.replace(/\s+/g, "");
    const mime = sniffImageMime(Buffer.from(body.slice(0, 64), "base64"), fallbackMime);
    return `data:${mime};base64,${body}`;
}
