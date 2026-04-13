# 火箭任务控制系统（纯 Node.js）

本项目已重构为纯 Node.js Web 架构：

- 不再依赖 Electron 桌面程序。
- 管理端和游客端都由同一个 Node.js 服务提供。
- 保留原有倒计时、时间轴、SSE 实时推送、型号配置编辑等功能。
- 已支持 16 套主题配色，管理员可设置默认主题并持久化。
- 支持 HOLD 暂停倒计时（发射时间自动顺延）。

## 快速启动

1. 安装依赖

```bash
npm install
```

2. 启动服务

```bash
npm start
```

默认监听：`http://0.0.0.0:5000`

- 游客页面：`http://127.0.0.1:5000/`
- 管理登录页：`http://127.0.0.1:5000/admin/login`
- 管理控制台：`http://127.0.0.1:5000/admin`（需要登录）

## 主题机制

- 系统内置 16 套主题。
- 管理员在控制台选择主题后，可点击“设为默认主题”保存。
- 默认主题会写入本地文件：`config/app-settings.json`，下次启动自动读取。
- 游客页面可临时切换主题，但刷新后会恢复为管理员设置的默认主题。

## HOLD 与观察点逻辑

- HOLD：
	- 点击 HOLD 后，任务计时暂停。
	- 现实时间继续流逝，发射控制中的发射时间会自动顺延。
	- 再次点击（RESUME）后恢复计时。

- 观察点触发：
	- 每个观察点包含一个目标任务时间（`time`，例如 `-50`）。
	- 点击观察点后，系统会把主任务计时直接对齐到该时间点（例如 `T-50`）。
	- 观察点按钮数量始终与 `observation_points` 配置项数量一致。

## 管理员登录

默认管理员账号：

- 用户名：`admin`
- 密码：`admin123`

建议通过环境变量修改：

- `ADMIN_USERNAME`：管理员用户名
- `ADMIN_PASSWORD`：管理员密码
- `SESSION_SECRET`：会话签名密钥
- `SESSION_TTL_SECONDS`：会话有效期（秒，默认 28800）

示例：

```bash
set ADMIN_USERNAME=your_admin
set ADMIN_PASSWORD=your_password
set SESSION_SECRET=change_me
set SESSION_TTL_SECONDS=14400
npm start
```

## 项目结构

- 服务端入口：`server/index.js`
- 服务端核心：`server/httpServer.js`
- 管理端页面：`templates/admin.html`
- 管理登录页：`templates/admin-login.html`
- 游客页面：`templates/visitor.html`
- 管理端脚本：`static/js/admin.js`
- 登录脚本：`static/js/admin-login.js`
- 游客端脚本：`static/js/visitor.js`

## API 概览

公开 API（游客可访问）：

- `GET /api/state`
- `GET /api/stream`

管理员 API（需登录）：

- `GET /api/admin/settings`
- `POST /api/admin/settings/theme`
- `GET /api/admin/session`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `POST /api/hold`
- `GET /api/visitor_url`
- `GET /api/visitor_qr`
- `GET /api/models`
- `POST /api/select_model`
- `POST /api/launch`
- `POST /api/observation`
- `POST /api/ignition`
- `POST /api/reset`
- `POST /api/models`
- `DELETE /api/models/:name`

公共配置 API：

- `GET /api/public_config`
