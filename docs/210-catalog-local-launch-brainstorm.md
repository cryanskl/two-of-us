# Catalog 驱动的本地直达合同：从“入口存在”到“真的能打开”

- 日期：2026-07-21
- 对应既有规格：[190-non-a-direct-launch-spec.md](./190-non-a-direct-launch-spec.md)
- 后续规格：[211-catalog-local-launch-spec.md](./211-catalog-local-launch-spec.md)
- 后续计划：[212-catalog-local-launch-plan.md](./212-catalog-local-launch-plan.md)
- 状态：决策冻结，等待实现

## 1. 问题

仓库现有 `npm run verify` 会确认入口、README 和 HTML 直接引用的资源存在；目录测试还会确认 B/C/D 作品具有精确启动器。两类证据仍有空隙：

1. A 级入口即使存在，也可能因 `type=module`、根路径、远程资源、CSS 深层缺图或网络 API 而无法在 `file://` 下独立运行；
2. B/C/D 启动器合同藏在一份 1900 行目录测试里，验证器本身不知道“非 A 必须一键直达”；
3. HTML、CSS、JS 的运行依赖图没有统一遍历，新作品容易只通过“入口存在”这层弱检查；
4. 当前作品级测试很有价值，但不能自动覆盖未来新增条目。

目标不是替换每个玩法的专属测试，而是补一层由 catalog 自动扩展的仓库级最低合同。

## 2. 方案比较

### 方案 A：继续给每个作品手写测试

优点是可以检查私密文案、规则和 DOM 细节。缺点是新增条目时可以忘记写，且相同的本地启动规则会复制几十次。保留为作品专属层，不作为通用答案。

### 方案 B：启动真实浏览器遍历全部页面，作为默认 verify

最接近用户路径，但依赖浏览器安装、权限和图形环境，不适合作为每次 `npm run verify` 的唯一前提。适合发布/批次验收，不适合代替静态合同。

### 方案 C：静态依赖图 + 启动器合同 + 批次浏览器证据

采用。默认 verify 快速、确定性地沿 catalog 检查入口合同；批次验收再用真实 Chrome 加载全部 A 级 `file://` 页面，并抽查 B/C/D 启动器路径。静态和动态证据互补。

## 3. 冻结边界

### 3.1 所有 installed 条目

- 先增强共享 `validateCatalog`，校验 schema、必填展示字段、布尔字段、ID/entry/readme/category 对应关系与唯一性；
- entry 与 README 必须存在且保持在仓库根目录内；
- README 必须有 `## 借鉴与来源声明`；
- `networkRequired` 必须为 false；“局域网协作”不等于“依赖公网”。

### 3.2 A 级

- 入口必须能以 `file://` 加载；
- 禁止 `type=module`、远程/协议相对/根相对运行资源和 `/socket.io/socket.io.js`；
- 使用仓库冻结的保守 HTML/CSS profile，遍历 script、stylesheet、图片、音视频、source、track、object、poster、inline style 与 style attribute；profile 不支持的 fetch-capable 标签、属性或畸形引用直接报错；
- 继续遍历已引用 CSS 的 `url()` 和 `@import`；任何本地依赖都必须经 realpath 证明仍在仓库内；
- `link rel=icon` 可使用精确 `data:,`，或五个以 SHA-256 固定的既有 percent-encoded SVG；新增图标必须使用可追踪本地文件。其他静态可加载位置拒绝 data/blob；
- 不把 JS token 扫描列为直达硬 Gate：Love Tree 的旧版兼容库合法包含 `eval`、`Function` 与 XHR capability。是否真的离开本地由浏览器的实际 request 事件证明，交互后网络边界继续由作品专属测试证明。

静态扫描不是 HTML/CSS/JavaScript 标准解析器，也不宣称能证明所有动态行为；真实 Chrome 在导航前安装请求与错误监听，才负责证明本批首屏没有发出 `http/https/ws/wss/ftp` 等网络承载请求。`data:`、`blob:` 与 `about:` 是本地浏览器资源，不按公网请求误报，静态入口仍受上面的窄 profile 约束。

### 3.3 B/C/D

- 作品目录必须同时有 `start.command` 与 `start.bat`；
- 两份启动器内容必须由同一 renderer 按 catalog ID 生成，禁止手写漂移；
- macOS 启动器必须是 `0755`；
- 启动目标只能是当前 installed ID，并继续复用 190 冻结的共享运行时协议。

## 4. 错误模型

验证器返回稳定、可排序的中文错误数组，不在发现第一项时提前退出。每条包含作品 ID、仓库相对文件和脱敏引用；query/fragment 被移除，data/blob 只显示 `<data-url>` / `<blob-url>`，控制字符转义，不输出文件正文、私人配置或 token。

`npm run verify` 汇总现有资源/归因检查与新合同；测试直接调用纯导出，不能通过解析 console 文案验证内部行为。

## 5. 浏览器证据

实现批次使用真实 Chrome：

- 逐个打开 catalog 中 47 个 installed A 级 `file://` entry；
- 每次导航前注册并重置 request、requestfailed、WebSocket、WebTransport、console error、pageerror 与 unhandledrejection 监听；WebSocket 使用 Playwright `page.on("websocket")` 或 CDP `Network.webSocketCreated`，WebTransport 必须使用 Chromium CDP `Network.webTransportCreated`，不假设普通 request 会覆盖；
- 每页至少确认 exact `file:` 最终 URL、文档完成加载、有非空标题与可见主内容、没有页面错误、失败资源和 `http/https/ws/wss/ftp` 等网络承载请求；
- 三分类各保留一个代表页面的可见截图/检查记录；
- B/C/D 从作品启动器等价命令抽查 B、C、D 各一项，确认最终 URL 为对应 entry 而不是门户。

浏览器连接若不支持 `file://`，必须明确记录工具限制，再以本机 Chrome CLI 或 Playwright Chromium fallback 执行；不能把 HTTP 结果冒充 A 级直开证据。

## 6. 来源与借鉴声明

本批只重构本仓库已有 catalog、验证器和 190 启动器合同，不参考、引入或复制新的外部开源项目、脚本模板、算法或素材。Socket.IO、qrcode、Pannellum 和 Whisper 能力的既有许可证与声明不变。

## 7. 完成定义

1. 通用合同自动覆盖所有 installed 条目；
2. A 与 B/C/D 的启动模型分别被精确验证；
3. fixture 覆盖合法路径与每类拒绝路径；
4. `npm test`、`npm run verify` 全绿；
5. 真实浏览器证据覆盖全部 A 级和 B/C/D 代表项；
6. 缺陷写入 `bugs/`，可复用知识写入 `learn/`；
7. 规划、实现、验收分别独立提交。
