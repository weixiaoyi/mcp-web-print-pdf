# 贡献指南

欢迎 issue、PR 和文档纠错。这个仓库的定位很窄，提交前请先对照一下边界。

## 这个仓库做什么 / 不做什么

- ✅ 把 `web-print-pdf@2.x` 的公开 API 映射成 MCP 工具
- ✅ 补充上游没有的便利能力（例如 `printFile`：按本机路径打印）
- ❌ 不实现打印逻辑本身——渲染、授权、驱动投递都在客户端里
- ❌ 不改「Web打印专家」客户端的行为；客户端的问题请去客户端仓库提

## 本地跑起来

```bash
npm install
npm test                      # 单元测试：参数合并、默认 action
node test/mock-server.js      # 终端 1：假客户端
node test/smoke.js           # 终端 2：端到端冒烟，走一遍 16 个工具
```

没有实体打印机也能开发和验证——`test/mock-server.js` 覆盖了全部消息类型。

## 代码约定

- 工具名必须与上游方法名一致（去掉 `utils.` 前缀），不要另造别名。
- **stdout 是 MCP 协议通道**，任何日志只能写 `stderr`，否则宿主会解析失败。
- `pdf_options` / `print_options` 的字段名由客户端白名单校验，写错会直接报错——新增字段前先在客户端确认。
- 参数优先级：显式写在 options 对象里的字段 > 便捷参数（`paper_format` / `printer_name` / `copies`）。
- 打印工具默认 `dry_run: false`（真的出纸），新增工具保持同样的默认值。

## 提交信息

用 `<type>: <subject>`，例如 `fix: keep batchPrint action consistent`、`docs: add Cursor setup`。

## PR 检查清单

- [ ] `npm test` 通过
- [ ] 端到端冒烟通过（`mock-server.js` + `smoke.js`）
- [ ] 改到 README 里描述过的行为时，同步更新 `README.md` 和 `README_EN.md`
- [ ] 新增工具时补 `test/smoke.js` 的调用和 README 的工具表

## 文档

中英文两份 README 需要保持同构：改了一边记得改另一边。`llms.txt` 是给 AI 检索用的摘要，
新增工具或改接入方式时顺手更新它。
