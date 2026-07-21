# B/C/D 作品直达启动器与运行时复用验收记录

- 日期：2026-07-21
- 平台：macOS；Node `v22.22.3`
- 核心实现提交：`35bb887 feat: reuse an existing local runtime`
- 启动器提交：`35a5b6c feat: add direct launchers for non-A experiences`
- 文档提交：`6c961e8 docs: explain reusable direct launchers`

## 1. 交付范围

以下七个原本缺少作品级入口的已安装 B/C 级作品，现均有 `start.command` 与 `start.bat`：

- B：`panorama-memory`；
- C：`together-lock`、`lan-pictionary`、`compatibility-quiz`、`lan-connect-four`、`sealed-rps`、`heart-sprint`。

既有 D 级 `i-heard-you` 继续使用同一薄启动模式。目录测试从 catalog 动态枚举所有已安装非 A 作品，核对 macOS/Windows 文件存在、命令文本与 macOS 可执行位，防止新增作品再次漏配。

本批没有新增第三方依赖、源码、图片、字体、音频或外部开源参考；启动器和复用协议来自本仓库内部实现。现有 Socket.IO 与 node-qrcode 的借鉴和许可证边界保持不变。

## 2. 自动化验收

最终执行：

```text
npm test
1545 tests / 1545 pass / 0 fail / 0 skipped

npm run verify
仓库验收通过：55 个作品入口、1 个能力声明、资源与借鉴声明完整。

git diff --check
通过
```

关键自动化覆盖：

- health/catalog 双 identity header、状态、协议版本、端口和本机地址精确核对；
- redirect、timeout、无关服务、错误 catalog、未安装目标与跨源入口 fail closed；
- 第二个真实 child process 复用首进程并正常退出；
- 无关 HTTP 服务占据首选端口时跳过并使用下一端口；
- 端口扫描与 listener 在 65535 截止；
- 同端口存在 IPv6-only 外部服务时，`127.0.0.1` 仍命中 Two of Us 的 IPv4 listener；
- 所有已安装 B/C/D 作品的两套薄启动器合同。

## 3. 真实进程复用

以固定首选端口 `43173` 启动 B 级作品：

```text
Two of Us 已启动
本机入口：http://127.0.0.1:43173/
当前作品：http://127.0.0.1:43173/experiences/surprises/panorama-memory/index.html
```

首进程保持运行时，再启动 C 级 `compatibility-quiz`：

```text
Two of Us 已经在运行，正在复用
本机入口：http://127.0.0.1:43173/
当前作品：http://127.0.0.1:43173/experiences/co-op/compatibility-quiz/index.html
```

验收结果：

- 第二进程以状态 0 退出；
- `43173` 只有首个 Node PID `51587` 监听；
- 下一候选端口 `43174` 没有 listener；
- `/api/health` 返回 `200`、`x-two-of-us-runtime: 1`、`service: two-of-us`、`version: 1`，且 `localUrl` 精确为 `http://127.0.0.1:43173/`。

PID 只用于本次验收取证，不是运行时协议的一部分。

## 4. Browser/IAB 验收

使用 Codex 内置浏览器直接访问两个目标页。

### B 级“回到那一天”

- URL：`http://127.0.0.1:43173/experiences/surprises/panorama-memory/index.html`
- `document.title`：`回到那一天 · Two of Us`
- `h1`：`回到那一天`
- 协议：`http:`
- 文件选择器：enabled，证明 B 级 `file://` Gate 已解除；
- console warning/error：0。

### C 级“和你一样”

- URL：`http://127.0.0.1:43173/experiences/co-op/compatibility-quiz/index.html`
- `document.title`：`和你一样 · Two of Us`
- `h1`：`和你一样`
- 首个房间动作：`创建房间` 可见；
- 脚本来源：`/socket.io/socket.io.js` 与本地 `app.js`；
- console warning/error：0。

本批没有修改作品视觉，因此没有重新做视觉忠实度或响应式回归；浏览器验收聚焦启动路径、HTTP Gate、共享实时依赖和控制台。

## 5. 停止与清理

向首进程发送 SIGINT 后输出：

```text
收到 SIGINT，正在停止本地服务……
本地服务已停止，端口已经释放。
```

随后用真实 HTTP server 在 `127.0.0.1:43173` 重新监听并成功关闭，证明端口已释放。浏览器验收 tab 已清理，没有遗留 Node 启动器或运行时进程；QA 临时响应文件也未进入仓库。

## 6. 人工边界

- `.command` 与 `.bat` 的内容、路径和权限由自动化测试覆盖；本次没有通过 Finder 或 Windows Explorer 真实双击。
- macOS 真实 Node 进程、内置浏览器、身份响应、复用与端口释放已覆盖；Windows `.bat` 的 Explorer 双击仍属于发布前平台烟测。
- 并发同时双击造成的竞态按规格不在本批范围；顺序重复双击已闭环。

## 7. 结论

本批验收通过：八个已安装 B/C/D 作品都有目录内直达入口；七个新增入口与既有 D 级入口共用根依赖和运行时；顺序重复启动能识别并复用可信 Two of Us 服务，不会生成第二个常驻进程；异常本地服务、IPv6 地址族错配和端口上界均有回归保护。
