#!/usr/bin/env node
import { start } from "../src/server.js";

start().catch((err) => {
    // stdout 是 MCP 协议通道，任何日志只能走 stderr
    console.error("[mcp-web-print-pdf] 启动失败:", err?.stack || err);
    process.exit(1);
});
