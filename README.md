# 火箭任务控制系统（纯 Node.js）

本项目已重构为纯 Node.js Web 架构：

- 不再依赖 Electron 桌面程序。
- 管理端和游客端都由同一个 Node.js 服务提供。
- 保留原有倒计时、时间轴、SSE 实时推送、型号配置编辑等功能。

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

- `GET /api/admin/session`
- `POST /api/admin/login`
- `POST /api/admin/logout`
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
