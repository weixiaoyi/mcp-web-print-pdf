import WebSocket from "ws";
import { randomUUID } from "node:crypto";

const DEFAULT_PORT = 16794;
const DEFAULT_TIMEOUT = Number(process.env.WEBPRINT_TIMEOUT) || 120_000;

/**
 * 与「Web打印专家」Electron 客户端通信的 WebSocket 客户端。
 *
 * 协议（来自 electronApp/server/websocket/standard，与 web-print-pdf 一致）：
 *   请求 { id, type, timestamp, ...业务字段 }   ← 业务字段在顶层，不在 data 里
 *   响应 { id, type, timestamp, success, data | message }
 */
export class WebPrintClient {
    constructor({ host = "127.0.0.1", port = Number(process.env.WEBPRINT_PORT) || DEFAULT_PORT } = {}) {
        this.host = host;
        this.port = port;
        this.ws = null;
        this.connecting = null;
        this.pending = new Map();
    }

    get url() {
        return `ws://${this.host}:${this.port}/websocket/standard`;
    }

    async ensure() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

        if (this.connecting) return this.connecting;

        this.connecting = new Promise((resolve, reject) => {
            const ws = new WebSocket(this.url, { handshakeTimeout: 5000 });
            let opened = false;

            ws.once("open", () => {
                opened = true;
                this.ws = ws;
                this.connecting = null;
                resolve();
            });

            ws.on("message", (raw) => this.#onMessage(raw));

            ws.on("error", (err) => {
                if (!opened) {
                    this.connecting = null;
                    reject(
                        new Error(
                            `连不上「Web打印专家」客户端（${this.url}）：${err?.message || err}。请确认客户端已启动。`
                        )
                    );
                    return;
                }
                // 连接建立后的错误交给 close 处理，这里只记录，避免 EventEmitter 抛未捕获异常
                console.error(`[mcp-web-print-pdf] WebSocket 错误：${err?.message || err}`);
            });

            ws.on("close", () => {
                if (this.ws === ws) this.ws = null;
                this.connecting = null;
                this.#failAll(new Error("「Web打印专家」客户端连接已断开"));
            });
        });

        return this.connecting;
    }

    #onMessage(raw) {
        let msg = null;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            return;
        }
        const waiter = this.pending.get(msg?.id);
        if (!waiter) return;

        this.pending.delete(msg.id);
        clearTimeout(waiter.timer);

        if (msg.success === false) {
            const err = new Error(msg.message || "客户端返回失败");
            err.response = msg;
            waiter.reject(err);
        } else {
            waiter.resolve(msg.data);
        }
    }

    #failAll(err) {
        for (const [, waiter] of this.pending) {
            clearTimeout(waiter.timer);
            waiter.reject(err);
        }
        this.pending.clear();
    }

    /**
     * @param {string} type  e.g. printHtml / printPdfByUrl / getPrinterList
     * @param {object} params  业务字段，直接摊到消息顶层
     * @param {number} timeout
     */
    async request(type, params = {}, timeout = DEFAULT_TIMEOUT) {
        await this.ensure();

        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error(`与「Web打印专家」客户端的连接未就绪（${this.url}）`);
        }

        const id = randomUUID();
        const message = { ...params, id, type, timestamp: Date.now() };

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`${type} 超时（${timeout}ms）`));
            }, timeout);

            this.pending.set(id, { resolve, reject, timer });

            this.ws.send(JSON.stringify(message), (err) => {
                if (!err) return;
                clearTimeout(timer);
                this.pending.delete(id);
                reject(err);
            });
        });
    }

    close() {
        try {
            this.ws?.close();
        } catch {
            /* ignore */
        }
        this.ws = null;
        this.connecting = null;
    }
}
