# 58 个 installed 作品：真实浏览器首载与统一入口矩阵

> 验收日期：2026-07-25  
> 严格基线：`a38c90d01492a30cac05b32c514d305e2a749ae2`  
> 浏览器：真实 Google Chrome（Chrome 扩展会话）  
> 统一运行时：`http://127.0.0.1:4173/`

## 1. 范围、口径与限制

- `experiences/catalog.json` 在基线中登记 58 个 `installed: true` 作品：A 级 50 个、B 级 1 个、C 级 6 个、D 级 1 个。
- 统一门户在 localhost 显示“本地运行时已就绪”、58 张作品卡；D 级《我听见了》显示“能力就绪”。
- 每个作品的首载通过统一门户生成的实际 `href` 导航，不手写猜测入口。
- 每项记录 `document.title`、首个 `h1/h2`、`readyState`、非空正文、Chrome Network 请求/响应、HTTP 4xx/5xx、加载失败、console warning/error、公网请求及首屏横向溢出。
- Chrome 的浏览器安全策略拒绝自动化会话导航 `file://`，并禁止通过其他浏览器通道绕过。因此 A 级的“真实浏览器首载”在 localhost 同源静态托管下完成；A 级“双击 HTML 可直开”另由仓库 A 级静态资源合同和最终 `npm run verify` 验证。本文不会把 localhost 首载冒充成 file 直开。
- 首载矩阵不等于 58 个作品的全流程通关；A/B/C/D 的高风险代表会在后文另列深测边界。

## 2. 统一门户

| 检查项 | 结果 |
| --- | --- |
| 页面标题 | `Two of Us · 两个人的本地游乐场` |
| 运行时状态 | `本地运行时已就绪` |
| catalog 数量 | `58 个体验`，DOM 中 58 张卡 |
| D 级能力标签 | 《我听见了》显示“能力就绪” |
| console warning/error | 0 |

## 3. A 级全量首载矩阵（50/50）

表中“网络”是 Chrome Network 捕获的“请求数/收到响应数”；“页内返库”是作品页面内指向门户根路径的链接数量。50 个作品均为 `readyState=complete`、正文非空、无 4xx/5xx、无加载失败、无意外公网请求、无 console warning/error、无首屏横向溢出。

| id | `document.title` | 首个 `h1/h2` | 网络 | 页内返库 | 结论 |
| --- | --- | --- | ---: | ---: | --- |
| love-tree | 献给我一生最爱的人 | （无 h1/h2） | 13/13 | 0 | 通过 |
| memory-letter | 一封慢慢打开的信 | 有一封信，想请你亲手打开 | 5/5 | 0 | 通过 |
| scratch-surprise | 爱的刮刮卡 · Two of Us | 有一份小惊喜，想请你亲手打开 | 6/6 | 1 | 通过 |
| date-wheel | 今晚做什么 · Two of Us | 今晚做什么？ | 6/6 | 1 | 通过 |
| photo-swap-puzzle | 拼回这一刻 · Two of Us | 拼回这一刻 | 5/5 | 0 | 通过 |
| future-ticket | 未来车票 · Two of Us | 未来车票 | 7/7 | 1 | 通过 |
| instant-photo | 拍立得显影 · Two of Us | 拍立得显影 | 8/8 | 1 | 通过 |
| nested-gift | 一层一层 · Two of Us | 一层一层 | 7/7 | 1 | 通过 |
| paper-plane-mail | 纸飞机投递 · Two of Us | 航路预测图 | 7/7 | 1 | 通过 |
| star-code-unlock | 星码解锁 · Two of Us | 私人星盘 / 观测面 01 | 7/7 | 1 | 通过 |
| hand-crank-music-box | 把这首转给你 · Two of Us | 把这首转给你 | 8/8 | 1 | 通过 |
| moon-phase-secret | 把月亮拨回那一天 · Two of Us | 把月亮拨回那一天 | 8/8 | 1 | 通过 |
| fog-window-letter | 在雾上，写给你 | 在雾上，写给你 | 8/8 | 0 | 通过 |
| starlight-keepsake-search | 把夜晚照成我们 | 把夜晚照成我们 | 8/8 | 0 | 通过 |
| future-cookie-notes | 三枚以后，都是我们 | 三枚以后，都是我们 | 8/8 | 0 | 通过 |
| origami-heart | 沿着折痕，折到你心里 | 沿着折痕，慢慢折 | 7/7 | 1 | 通过 |
| hot-seat-pictionary | 同机你画我猜 | 你画，我猜，我们一起赢 | 5/5 | 0 | 通过 |
| twin-light-maze | 双光点归巢 · Two of Us | 双光点归巢 | 7/7 | 1 | 通过 |
| tethered-heart | 同心牵引 · Two of Us | 同心牵引 | 8/8 | 0 | 通过 |
| lighthouse-passage | 为你引航 · Two of Us | 为你引航 | 8/8 | 0 | 通过 |
| rhythm-relay | 节拍接力 · Two of Us | 节拍接力 | 6/6 | 1 | 通过 |
| telegraph-codebook | 默契电报码 · Two of Us | 默契电报码 | 6/6 | 1 | 通过 |
| kitchen-relay | 双人小馆 · Two of Us | 双人小馆 | 8/8 | 1 | 通过 |
| closer-cards | 靠近一点 · Two of Us | 靠近一点 | 7/7 | 1 | 通过 |
| shared-color-studio | 把颜色调到一起 · Two of Us | 把颜色调到一起 | 8/8 | 1 | 通过 |
| signal-repair-manual | 把信号接回来 · Two of Us | 把信号接回来 | 8/8 | 1 | 通过 |
| four-hands-harmony | 这一拍，刚好和你 · Two of Us | 这一拍，刚好和你 | 9/9 | 1 | 通过 |
| same-pace-star | 慢一点，也和你一起 · Two of Us | 慢一点，也和你一起 | 8/8 | 1 | 通过 |
| steady-together | 稳稳地，和你一起向前 · Two of Us | 稳稳地，和你一起向前 | 8/8 | 0 | 通过 |
| moving-home-together | 一起，把家搬进来 · Two of Us | 一起，把家搬进来 | 8/8 | 0 | 通过 |
| moon-base-power | 月面，保持有光 | 月面，保持有光 | 9/9 | 1 | 通过 |
| fog-navigation | 雾里，跟着你走 | 雾里，跟着你走 | 9/9 | 0 | 通过 |
| cloud-recipe | 这一场雨，我们一起接 | 这一场雨，我们一起接 | 9/9 | 1 | 通过 |
| together-zipper | 把两边，拉成我们 · Two of Us | 把两边，拉成我们 | 7/7 | 1 | 通过 |
| seven-day-garden | 把七天，养成一朵花 · Two of Us | 把七天，养成一朵花 | 10/10 | 1 | 通过 |
| constellation-relay | 把星光，一笔一笔交给你 · Two of Us | 把星光，一笔一笔交给你 | 9/9 | 1 | 通过 |
| balloon-dare | 气球胆量局 · Two of Us | 气球胆量局 | 8/8 | 1 | 通过 |
| number-target | 数字凑靶 · Two of Us | 数字凑靶 | 7/7 | 1 | 通过 |
| paper-soccer | 纸上球局 · Two of Us | 纸上球局 | 7/7 | 1 | 通过 |
| echo-arena | 回声擂台 · Two of Us | 回声擂台 | 8/8 | 1 | 通过 |
| dots-and-boxes | 这一格归谁 · Two of Us | 这一格归谁 | 8/8 | 1 | 通过 |
| light-trail-hunt | 光轨围猎 · Two of Us | 光轨围猎 | 8/8 | 0 | 通过 |
| orbit-star-race | 这一颗我先到 · Two of Us | 朱方 | 9/9 | 1 | 通过 |
| secret-recipe-code | 藏好这一味 · Two of Us | 藏好这一味 | 8/8 | 0 | 通过 |
| memory-bid | 这一串，我还记得 | 这一串，我还记得 | 8/8 | 0 | 通过 |
| garden-resource-duel | 这一朵，我先养开 · Two of Us | 这一朵，我先养开 | 6/6 | 0 | 通过 |
| heart-catapult | 这一颗，绕回来找你 · 双人爱心投射 | 这一颗，绕回来找你 | 7/7 | 0 | 通过 |
| soft-sumo | 软软相扑 | 软软相扑 | 9/9 | 1 | 通过 |
| reaction-duel | 反应力对决 | 别急。等它变绿。 | 4/4 | 0 | 通过 |
| ribbon-tug | 心动拔河 · Two of Us | 心动拔河 | 5/5 | 1 | 通过 |

### A 级阶段结论

- 真实 Chrome 首载：50/50 通过。
- HTTP 错误、资源加载失败、意外公网请求、console warning/error：均为 0。
- 返库链接按 `/` 与 `/index.html` 两种等价根入口复核：32/50 个 A 级页面有页内返库链接，18/50 个依赖浏览器后退。
- `love-tree` 没有 `h1/h2`，但页面标题、正文、资源与脚本均正常；记录为语义观察，不判为首载失败。

## 4. 非 A 首载矩阵

统一运行时保持在 `127.0.0.1:4173`。对 8 个作品分别执行
`node scripts/start.mjs --experience <id> --no-open`，8/8 都识别并复用了已运行服务，
输出的“当前作品”与门户实际 `href` 完全一致；随后用真实 Chrome 导航该入口。

| 级别 | id | `document.title` | 首个 `h1/h2` | 网络 | 页内返库 | 结论 |
| --- | --- | --- | --- | ---: | ---: | --- |
| B | panorama-memory | 回到那一天 · Two of Us | 回到那一天 | 7/7 | 0 | 通过 |
| D | i-heard-you | 我听见了 · Two of Us | 我听见了 | 9/9 | 1 | 通过 |
| C | together-lock | 同心解锁 · Two of Us | 隔着两块屏幕，按住同一颗心。 | 10/10 | 0 | 通过 |
| C | lan-pictionary | 隔屏画猜 · Two of Us | 你画的，我来猜。 | 11/10 | 1 | 通过 |
| C | compatibility-quiz | 和你一样 · Two of Us | 和你一样 | 12/12 | 0 | 通过 |
| C | lan-connect-four | 连心四子棋 · Two of Us | 连心四子棋 | 11/11 | 1 | 通过 |
| C | sealed-rps | 密封猜拳 · Two of Us | 密封猜拳 | 12/11 | 0 | 通过 |
| C | heart-sprint | 心跳冲刺 · Two of Us | 心跳冲刺 | 12/12 | 2 | 通过 |

### 非 A 阶段结论

- 统一 launcher 复用：8/8；localhost 首载：8/8。
- HTTP 4xx/5xx、加载失败、意外公网请求、console warning/error、首屏横向溢出：均为 0。
- `lan-pictionary` 与 `sealed-rps` 的“请求数比响应数多 1”来自保持中的 Socket.IO/WebSocket 连接；Chrome 没有记录 `Network.loadingFailed`。
- 4/8 个非 A 页面有页内返库链接：`i-heard-you`、`lan-pictionary`、`lan-connect-four`、`heart-sprint`；其余 4 个依赖浏览器后退。

## 5. A/B/C/D 高风险代表深测

| 层级与代表 | 深测路径 | 真实 Chrome 结果 |
| --- | --- | --- |
| A · `origami-heart` | 门户进入 → 开始 → 依次完成五道折痕 → 主动翻面 → 页内返库 | 最终出现“这颗心，折给你”和“再折一次”；console 0；页内链接实际返回 58 卡门户 |
| B · `panorama-memory` | launcher 复用 → Pannellum JS/CSS 本地首载 → 本地运行时前置 → 门户进入后浏览器后退 | `/vendor/pannellum/2.5.7/` 两个资源均 200，文件输入启用，替换/清除在选择前正确禁用；浏览器后退回到运行时就绪的 58 卡门户 |
| C · `sealed-rps` | 两个真实 Chrome 标签 → 创建/加入同一房间 → 主机开局 → 玩家一先密封石头 → 玩家二后密封剪刀 → 同步揭晓 | 玩家一提交后，玩家二页面仍只显示“等待揭晓”，未出现石头；第二份提交后两端同时显示“玩家一出石头，玩家二出剪刀。玩家一胜。”且比分均为 1:0；两端 console 0 |
| D · `i-heard-you` | 能力 gate → 加载约 142 MiB 本地模型 → 进入录音就绪态 → 页内返库 | gate 明确显示模型已安装；准备后出现“按下开始说”。CDP 读取到 `crossOriginIsolated=true`、`SharedArrayBuffer=function`、麦克风 API 可用；未触发麦克风权限；console 0；返库成功 |

### 文件与权限边界

- A `photo-swap-puzzle` 与 B `panorama-memory` 的文件选择器都已由真实 Chrome 打开，但扩展未开启 “Allow access to file URLs”，`setFiles` 被 Chrome 拒绝。按 Chrome 控制规范不能改用其他通道绕过，因此照片解码、拼图完成态和全景拖动不在本轮实证范围。
- D 级仅验证到本地模型和录音按钮就绪。点击录音会请求麦克风权限；本任务没有授权接受麦克风权限，所以没有录制、转写或保存任何声音。
- C 级深测覆盖双标签本机房间与密封揭晓；没有把第二台物理设备或真实 Wi-Fi 漫游冒充为已测。

### 390 × 844 移动视口代表

使用 Chrome DevTools 设备指标覆盖真实渲染 A/B/C/D 四个代表，并在结束后清除覆盖。四页均为
`innerWidth=clientWidth=scrollWidth=390`，关键容器存在、可见且左右边界都在视口内：

| 层级 | 关键容器宽度 | 左/右边界 | 横向溢出 |
| --- | ---: | ---: | --- |
| A · `origami-heart` | 358 px | 16 / 374 | 0 |
| B · `panorama-memory` | 342 px | 24 / 366 | 0 |
| C · `sealed-rps` | 368 px | 11 / 379 | 0 |
| D · `i-heard-you` | 354 px | 18 / 372 | 0 |

### 深测结论

- 完整核心路径：A、C 通过。
- 关键能力前置与可操作就绪：B、D 通过；受 Chrome 文件访问设置与麦克风权限边界影响，没有声称完成照片/录音内容路径。
- 返库复核：36/58 有页内返库链接；22/58 依赖浏览器后退。A 页内返库与 B 浏览器后退两种路径均已在真实 Chrome 中返回运行时就绪的 58 卡门户。

## 6. 端口释放与最终仓库验收

### 运行时退出

- 向拥有运行时的 launcher 发送 `SIGINT`。
- `lsof -nP -iTCP:4173 -sTCP:LISTEN` 没有发现 listener。
- 随后请求 `http://127.0.0.1:4173/api/health` 立即得到
  `curl: (7) Failed to connect`，证明 4173 已释放，而不是只关闭了浏览器页面。

### 最终检查

| 命令 | 结果 |
| --- | --- |
| `npm test` | 2298 tests，2298 pass，0 fail，0 skipped |
| `npm run verify` | 通过：58 个入口、50 个 A 级直开、8 个非 A 启动器、1 个能力声明，资源与借鉴声明完整 |
| `git diff --check a38c90d..HEAD` | 通过 |

### Chrome 证据方法

- 通过 Chrome 扩展浏览器会话控制真实 Google Chrome，没有使用独立 Playwright 浏览器替代。
- DOM/标题与交互：`domSnapshot`、精确 locator、`readyState` 和有限 DOM 投影。
- console：每页读取 `warn` / `error` 日志。
- 网络：Chrome DevTools Protocol `Network.requestWillBeSent`、
  `Network.responseReceived`、`Network.loadingFailed`；所有公网 URL、4xx/5xx 和失败请求均单独筛选。
- C 级：两个真实 Chrome 标签连接同一 Socket.IO 房间。
- 响应式：CDP 设备指标设为 390 × 844，检查后调用
  `Emulation.clearDeviceMetricsOverride` 并恢复默认视口。

### 最终结论与异常清单

- 58/58 真实 Chrome localhost 首载通过；50 个 A 级直开合同由 `verify` 通过。
- 发现的仓库运行 bug：0；因此没有创建 `bugs/` 记录。
- console warning/error、HTTP 4xx/5xx、资源加载失败、意外公网请求：均为 0。
- 非仓库阻断只有两个：Chrome 扩展未开启文件 URL 访问，阻断自动选择本地照片；麦克风权限不在本任务授权范围内。两者都已明确限制相应深测结论，没有绕过、没有伪报。
- 本轮没有产生足以独立沉淀的新实现知识，因此没有创建 `learn/` 记录。

## 借鉴与来源声明

本文是对本仓库实际页面、统一运行时和 Chrome 运行证据的原创验收记录，没有复制第三方项目文案、代码或测试报告。
