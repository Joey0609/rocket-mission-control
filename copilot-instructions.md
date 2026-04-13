# Copilot 工作区指令

## 架构边界

- 本仓库仅允许 Node.js Web 服务架构（前后端同服）。
- 不要再引入 Python、Flask、bat、vbs 启动链。

## 计时显示规则

- 页面主计时必须只有一个。
- 0 秒后自动切换正计时。
- 不允许同时显示倒计时和正计时两套主时钟。

## 实时规则

- 优先使用 SSE。
- 仅在 SSE 不可用时使用兜底轮询。
- 兜底轮询间隔必须读取 next_poll_hint_ms。

## 配置规则

- 配置目录: config/<型号>/config.json
- 使用 version 2 结构。
- stages/events/observation_points 节点都应有稳定 id。
