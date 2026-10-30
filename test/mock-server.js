/**
 * 本地假客户端：在没有装「Web打印专家」时，用它验证 MCP server 的链路。
 *   node test/mock-server.js
 * 然后在另一个终端把 MCP server 指过来即可。
 *
 * 覆盖 web-print-pdf 的全部消息类型（打印 + 工具方法），只回显、不真的渲染。
 */
import { WebSocketServer } from "ws";

const PORT = Number(process.env.WEBPRINT_PORT) || 16794;

const baseResult = (msg, extra = {}) => ({
    pdfPath: `/tmp/${msg.id}.pdf`,
    pdfFileName: `${msg.id}.pdf`,
    pdfUrl: `http://127.0.0.1:${PORT}/mock/${msg.id}.pdf`,
    printPreviewUrl: `http://127.0.0.1:${PORT}/#/viewPrintPreview?printParams=${msg.id}&_port=${PORT}`,
    action: msg.extraOptions?.action || "print",
    ...extra,
});

const handlers = {
    getConnectStatus: () => true,
    getPrinterList: () => [
        { name: "Mock Printer (A4)", driverName: "mock-driver", default: true },
        { name: "Mock Label Printer", driverName: "mock-tsc", default: false },
    ],
    getPrinterPapers: (msg) => [
        { name: "A4", width: 210, height: 297, unit: "mm" },
        { name: "80mm", width: 80, height: 297, unit: "mm" },
        { name: `driver:${msg.printer?.driverName || "unknown"}`, width: 100, height: 150, unit: "mm" },
    ],
    setTitle: () => true,
    setThemeColor: () => true,
    switchTabsVisibility: () => true,
    setContactUsTabInnerHtml: () => true,
    printHtml: (msg) => baseResult(msg, { contentLength: msg.content?.length ?? 0 }),
    printHtmlByUrl: (msg) => baseResult(msg, { url: msg.url }),
    printHtmlByBase64: (msg) => baseResult(msg, { base64Length: msg.base64?.length ?? 0 }),
    printPdfByUrl: (msg) => baseResult(msg, { url: msg.url }),
    printPdfByBase64: (msg) => baseResult(msg, { base64Length: msg.base64?.length ?? 0 }),
    printImageByUrl: (msg) => baseResult(msg, { url: msg.url }),
    printImageByBase64: (msg) => baseResult(msg, { base64Length: msg.base64?.length ?? 0 }),
    batchPrint: (msg) => {
        const pdfs = (msg.printTaskList || []).map((task, index) => ({
            type: task.type,
            pdfFileName: `${msg.id}-${index + 1}.pdf`,
            pdfUrl: `http://127.0.0.1:${PORT}/mock/${msg.id}-${index + 1}.pdf`,
        }));
        return {
            pdfs,
            printPreviewUrl: `http://127.0.0.1:${PORT}/#/viewPrintPreview?printParams=${msg.id}&_port=${PORT}`,
        };
    },
};

const wss = new WebSocketServer({ port: PORT });

wss.on("error", (err) => {
    if (err?.code === "EADDRINUSE") {
        console.error(`[mock] 端口 ${PORT} 已被占用——很可能是真的「Web打印专家」客户端正在运行。`);
        console.error(`[mock] 直接用真客户端测就行，不需要 mock。`);
        process.exit(0);
    }
    throw err;
});

wss.on("connection", (ws, req) => {
    if (!req.url?.startsWith("/websocket/standard")) {
        ws.close();
        return;
    }
    console.error(`[mock] 客户端接入`);

    ws.on("message", (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            return;
        }
        const handler = handlers[msg.type];
        if (!handler) {
            ws.send(JSON.stringify({
                id: msg.id, type: msg.type, timestamp: Date.now(),
                success: false, message: `not found the type: ${msg.type}`,
            }));
            return;
        }
        console.error(`[mock] ${msg.type} ${msg.extraOptions?.action || ""}`);
        ws.send(JSON.stringify({
            id: msg.id, type: msg.type, timestamp: Date.now(),
            success: true, data: handler(msg),
        }));
    });
});

console.error(`[mock] 假客户端已启动 ws://127.0.0.1:${PORT}/websocket/standard`);
