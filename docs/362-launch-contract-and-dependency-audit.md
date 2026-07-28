# Two of Us 全仓依赖、运行时与启动合同审计

- 日期：2026-07-25
- 严格基线：`260c0bfcde8adcd1c5e119cab88f1b9e19117703`
- 审计分支：`codex/exp-launch-contract-audit`
- 审计范围：catalog/schema、静态依赖与路径闭包、依赖安装、共享运行时、A/B/C/D 启动器，以及不需要生产 UI 的真实执行证据
- 明确不在范围：修改 Board、catalog、package/lock、共享运行时、launcher、作品入口或 UI；生产 UI 仍等待用户视觉确认 Gate

## 结论

基线上的 58 个已安装作品已经形成一套基本统一、可执行的本地启动体系：

- 50 个 A 级作品由 `index.html` 直开；
- 1 个 B 级、6 个 C 级、1 个 D 级作品通过同一个根运行时和逐字一致的薄启动器启动；
- 根目录只有 3 个精确版本直接依赖，没有作品级 `node_modules` 或作品级 lockfile；
- `npm ci`、`npm test`、`npm run verify` 均通过；
- 真实本机运行时成功返回 58/58 个作品入口，8/8 个非 A 启动器都能独立启动并返回自己的入口；
- 当前机器的 `speech-whisper-base` 能力经 doctor 判定为 `available (OK)`，因此 D 级作品在这台机器上具备完整本地能力前提。

但还不能把当前状态表述为“任何 checkout 下双击都必然打开当前内容”。本次确认了两个真实缺陷和三个残余风险：

1. 运行时复用只有协议身份，没有当前 checkout 的内容身份；可静默打开另一 worktree 的旧内容；
2. 共享依赖借鉴声明有未固定链接，`heart-sprint` 的 Socket.IO 固定版本与许可证 URL 实际返回 404；
3. A 级静态 Gate 明确只闭合 HTML/CSS 声明依赖，链接的经典 JavaScript 可动态请求公网而仍通过；
4. 用户 setup 目前执行 `npm install`，可用但不是 lockfile 的冻结安装语义；
5. D 级“页面能打开”与“可完成语音玩法”是两层承诺；全新机器仍需一次联网安装约 148 MB 的固定模型。

因此当前判定为：

| 合同层 | 结果 | 说明 |
| --- | --- | --- |
| catalog/schema | 通过 | 58 项重算一致，字段、路径、ID、分类与安装状态通过现有 validator |
| 静态依赖/路径闭包 | 当前仓库通过，合同有已知边界 | 58 项当前资源无缺失或越界；A 级 JS 动态依赖不能由现有 Gate 证明 |
| 非 UI 启动执行 | 通过 | 58/58 HTTP 入口、8/8 非 A 启动器、共享 API/供应商资产均返回成功 |
| 运行时复用一致性 | 未通过 | 相同协议但不同 checkout 的进程会被接受 |
| 依赖固定与许可证 | 包安装通过，声明链接待修 | 直接/传递包均锁定并带 integrity；部分借鉴 URL 漂移 |
| 生产 UI | 未验收 | 本阶段按任务要求没有打开或修改生产 UI |

## 审计方法与证据边界

### 已完整读取

- `docs/orchestration-runbook.md`
- `experiences/catalog.json`
- 根 `package.json` 与完整 `package-lock.json`
- `scripts/experience-contracts.mjs`、setup/start/target/reuse/verify/test/capability 脚本
- `shared/runtime` 的 catalog、server、static、vendor、network、room、sealed round、two-player membership 和 capability 实现
- 根级 A/B/C/D 启动入口与全部 8 组非 A `start.command` / `start.bat`
- 启动合同、运行时复用、setup 与共享运行时的相关测试
- `speech-whisper-base` manifest、README、浏览器资产和许可证登记

### 环境

| 项目 | 值 |
| --- | --- |
| macOS | `26.5.2` |
| Node.js | `v22.22.3` |
| npm | `10.9.8` |
| Git | `2.50.1 (Apple Git-155)` |
| worktree | `{worktree-base}/launch-contract-audit` |

### 证据限制

本报告证明文件、schema、依赖、loopback 服务、启动进程和 HTTP 响应；它不证明首屏视觉、可访问名称、焦点、响应式、真实麦克风权限、两台设备联机或完整玩法交互。后者必须继续留在生产 UI / 真实设备 Gate，不能由 HTTP 200 代替。

## 第一层：58 项 catalog/schema 重算

### 总量与等级

| 等级 | 数量 | 含义 |
| --- | ---: | --- |
| A | 50 | 本地文件直开 |
| B | 1 | 本机 HTTP 服务 |
| C | 6 | 同一局域网双设备 |
| D | 1 | 本机 HTTP 服务加可选大型能力 |
| 合计 | 58 | 全部 `installed: true` |

按分类重算：

| 分类 | A | B | C | D | 合计 |
| --- | ---: | ---: | ---: | ---: | ---: |
| surprise | 16 | 1 | 0 | 0 | 17 |
| co-op | 20 | 0 | 3 | 1 | 24 |
| versus | 14 | 0 | 3 | 0 | 17 |
| 合计 | 50 | 1 | 6 | 1 | 58 |

58 项的 `networkRequired` 都是 `false`。这里的语义是“安装完成后核心玩法不依赖公网”；C 级仍需要本地局域网，D 级仍需要首次安装能力包。

### 完整清单

#### A 级 50 项

- surprise（16）：`love-tree`、`memory-letter`、`scratch-surprise`、`date-wheel`、`photo-swap-puzzle`、`future-ticket`、`instant-photo`、`nested-gift`、`paper-plane-mail`、`star-code-unlock`、`hand-crank-music-box`、`moon-phase-secret`、`fog-window-letter`、`starlight-keepsake-search`、`future-cookie-notes`、`origami-heart`
- co-op（20）：`hot-seat-pictionary`、`twin-light-maze`、`tethered-heart`、`lighthouse-passage`、`rhythm-relay`、`telegraph-codebook`、`kitchen-relay`、`closer-cards`、`shared-color-studio`、`signal-repair-manual`、`four-hands-harmony`、`same-pace-star`、`steady-together`、`moving-home-together`、`moon-base-power`、`fog-navigation`、`cloud-recipe`、`together-zipper`、`seven-day-garden`、`constellation-relay`
- versus（14）：`balloon-dare`、`number-target`、`paper-soccer`、`echo-arena`、`dots-and-boxes`、`light-trail-hunt`、`orbit-star-race`、`secret-recipe-code`、`memory-bid`、`garden-resource-duel`、`heart-catapult`、`soft-sumo`、`reaction-duel`、`ribbon-tug`

#### 非 A 级 8 项

- B：`panorama-memory`
- C co-op：`together-lock`、`lan-pictionary`、`compatibility-quiz`
- C versus：`lan-connect-four`、`sealed-rps`、`heart-sprint`
- D：`i-heard-you`

schema validator 还证明了 lower-kebab ID、分类目录、entry/README 精确形状、唯一 ID/入口、合法等级与布尔字段。它不证明磁盘文件或页面执行，后两层分别补足。

## 第二层：依赖、静态闭包与路径

### 根依赖是唯一安装面

`package.json` 的三个直接依赖都是精确版本：

| 依赖 | 版本 | 实际用途 | 浏览器暴露方式 |
| --- | --- | --- | --- |
| `pannellum` | `2.5.7` | B 级全景投影 | 仅两个固定 `/vendor/pannellum/2.5.7/*` 白名单资源 |
| `qrcode` | `1.5.4` | 生成局域网入口二维码 Data URL | 只在 Node 运行时使用，不向页面暴露包目录 |
| `socket.io` | `4.8.1` | C 级本地房间、广播、定向与密封消息 | 服务端自带 `/socket.io/socket.io.js` |

作品目录内有 18 个 `package.json`，内容只声明 `"type": "commonjs"`，用于在根 ESM 边界下提供真实 CommonJS 测试/加载边界；它们没有 dependencies。作品目录内：

- `node_modules`：0
- `package-lock.json` / `npm-shrinkwrap.json`：0
- 新的第三方安装入口：0

因此这些小型 manifest 不是重复依赖安装。

### lockfile 完整性

完整解析 `package-lock.json` 得到：

- lockfileVersion：3
- 非根 package record：55
- 唯一包名：52
- 每条 record 都有版本、`resolved`、`integrity` 和许可证字段
- 所有 tarball 都来自 `registry.npmjs.org`
- 许可证分布：MIT 48、ISC 7
- `npm ci` 实际安装 55 个包，审计 56 个 package，报告 0 个已知漏洞

唯一多版本包是 `debug`：

- `4.3.7`
- `4.4.3`

它来自 Socket.IO 当前锁定的传递依赖图。当前不存在第二套根依赖或作品级副本；在不升级 Socket.IO 的前提下强行 override/去重会扩大风险，本轮不建议为“数字更小”而改 lock。

### 作品内容重复

对 58 个已安装目录的 549 个文件按 SHA-256 分组，只有一组完全相同的文件：`origami-heart/package.json` 与 `heart-catapult/package.json`。两者都是一行 CommonJS 边界，保留在各自目录才能决定最近 package scope，不应抽到共享目录。

没有发现值得新增共享运行依赖的重复文件组。

### 当前静态闭包

现有 Gate 的有效边界：

- A 级：解析入口 HTML、内联/外部 CSS、递归 `@import`、`url()` 和声明型媒体/脚本资源；
- 拒绝绝对路径、公网 scheme、protocol-relative URL、越界 realpath、危险 symlink、module script、iframe/embed/base/refresh 等未支持加载族；
- 非 A：校验入口声明资源、固定 vendor 白名单、Socket.IO 本地路径和两平台启动器；
- capability：校验 manifest schema、固定 URL、字节数、SHA-256、浏览器资产、README 与许可证文件。

对当前生产文件的网络 API 扫描结果：

- D 级 `i-heard-you` 只请求同源 `/api/capabilities`；
- 根 portal 只请求同源 health/catalog/capabilities；
- 共享启动脚本只加载仓库内模块；
- `love-tree` 携带的旧 jQuery 含通用 Ajax 实现，但当前作品代码没有调用公网 endpoint；
- 其余作品没有发现生产路径上的 `fetch`、WebSocket、EventSource、service worker、dynamic import 或公网资源请求。

因此“当前 58 项没有新增公网运行依赖”有源码证据，但“validator 能永久阻止未来 JS 动态公网依赖”不成立。

### JavaScript 闭包残余风险

临时 A 级夹具：

```html
<script src="app.js"></script>
```

其中 `app.js` 只有：

```js
fetch("https://example.invalid/private-runtime-dependency");
```

`validateExperienceContracts` 返回空错误数组并接受该夹具。这符合既有文档对 HTML/CSS 静态 Gate 的能力边界，但意味着 `networkRequired: false` 不能单独靠当前 validator 强制。

最小方案不是承诺“完全理解任意 JavaScript”，而是组合：

1. 保留现有严格 HTML/CSS/path Gate；
2. 增加 catalog 驱动的生产 JS 直接字面量扫描，至少覆盖 URL、`fetch`、XHR、Worker、WebSocket、EventSource、service worker 和动态 import，并提供极小的本机 API allowlist；
3. 每项作品仍用真实浏览器的 request/WebSocket/console 监听器做运行证据，先用正向探针证明监听器有效；
4. 动态计算、用户操作后分支和浏览器差异继续由作品级测试负责，不把静态扫描伪装成完整浏览器。

## 第三层：非 UI 真实启动证据

### 共享运行时

从审计 worktree 直接创建运行时，绑定随机 loopback 端口后得到：

| 路径 | HTTP | 内容 |
| --- | ---: | --- |
| `/` | 200 | 根 portal，39141 bytes |
| `/api/health` | 200 | health JSON 与运行时身份头 |
| `/api/catalog` | 200 | 58 项 catalog |
| `/api/capabilities` | 200 | capability 状态 |
| `/socket.io/socket.io.js` | 200 | 154232 bytes |
| `/vendor/pannellum/2.5.7/pannellum.js` | 200 | 56407 bytes |

随后逐项请求 58 个 catalog entry，结果为 58/58 HTTP 200 且响应体非空。

### 8 个非 A 启动器

每个非 A `start.command` 都是 `0755`，内容由同一 renderer 生成；Windows `start.bat` 也逐字匹配统一模板。

审计还对 8 个 ID 分别启动：

```text
TWO_OF_US_PORT=0 node scripts/start.mjs --no-open --experience <id>
```

每次都取得对应 `当前作品：http://127.0.0.1:<port>/<entry>`，入口 HTTP 200，随后用 SIGTERM 安全停止且 child exit code 为 0。通过项：

`panorama-memory`、`i-heard-you`、`together-lock`、`lan-pictionary`、`compatibility-quiz`、`lan-connect-four`、`sealed-rps`、`heart-sprint`。

这证明 Node 启动层、target resolution、HTTP serving 和退出处理可执行；不证明两设备玩法和 UI。

### D 级能力

`speech-whisper-base` 当前 manifest 固定：

- whisper.cpp `1.8.6` / revision `23ee03506a91ac3d3f0071b40e66a430eebdfa1d`
- 模型 revision `5359861c739e955e79d9a303bcbc70fb988958b1`
- 模型 `147951465` bytes
- 模型 SHA-256 `60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe`
- 3 个提交到仓库的浏览器资产都有固定 bytes 与 SHA-256

当前机器运行：

```text
node scripts/capabilities.mjs status
node scripts/capabilities.mjs doctor speech-whisper-base
```

两者都报告 `available (OK)`。

但全新机器的真实承诺应写成：

- 安装根依赖后，D 级页面可启动并展示能力状态；
- 首次完整使用语音前，需要联网安装并校验固定模型；
- 模型可用后，核心转写离线运行；
- `--skip-optional` 或非交互 setup 跳过模型时，不能宣称 D 级玩法“已经完整可玩”。

## 已确认缺陷

### 1. 跨 checkout 运行时误复用

临时 HTTP 服务提供合法 header、health、catalog 和目标 ID，但入口返回另一 checkout marker。`probeRuntimeCandidate` 接受它并返回该入口。

根因是 health/probe 只验证服务与协议身份，不比较当前 checkout 的 deterministic content identity。详见：

- [`bugs/2026-07-25-runtime-reuse-cross-checkout-drift.md`](../bugs/2026-07-25-runtime-reuse-cross-checkout-drift.md)
- [`learn/2026-07-25-runtime-compatibility-is-not-content-identity.md`](../learn/2026-07-25-runtime-compatibility-is-not-content-identity.md)

### 2. 共享依赖借鉴链接漂移

`heart-sprint` 的 Socket.IO `tree/4.8.1` 与 `blob/4.8.1/LICENSE` 都返回 HTTP 404；实际 tag 是 `socket.io@4.8.1`。其他相关 README 多使用会漂移的仓库根链接。

包本身的版本、MIT metadata 和许可证文件都存在；缺陷位于固定来源证据。详见：

- [`bugs/2026-07-25-shared-dependency-attribution-link-drift.md`](../bugs/2026-07-25-shared-dependency-attribution-link-drift.md)

## 最小统一方案

以下变更应由总控串行完成，本审计分支没有修改共享文件。

### P0：给运行时复用增加内容身份

1. 生成覆盖 package lock、catalog、共享运行时和全部可服务作品文件的 deterministic content manifest/hash；
2. health 返回 `contentIdentity`；
3. 当前启动器计算 expected identity，只有精确相等才复用；
4. 不相等时不终止旧进程，只选择下一个端口；
5. 增加“同协议、不同静态 marker”的跨根 integration test。

只哈希 worktree 路径不够，因为同一路径更新后旧进程仍会漂移；只哈希 Git HEAD 也必须处理 dirty worktree 与无 Git 分发包。

### P1：把用户安装路径改为冻结安装

根 lock 已经完整且 `npm ci` 实测成功。npm 10 官方文档说明，`npm ci` 在 package 与 lock 不一致时失败、不会改写 lock，并会先清理已有 `node_modules`；这比 setup 当前的 `npm install` 更符合“安装后依赖与仓库审计完全一致”的交付语义。

建议：

- 用户 setup：`npm ci --no-audit --no-fund`
- 维护者添加/升级依赖：显式 `npm install <package>@<exact-version>` 后审查并提交 lock
- 不做静默 fallback；lock 不一致应明确失败，避免安装器自行改变仓库

### P1：统一借鉴声明固定 URL

把共享运行时和相关作品 README 中的依赖链接统一为本文末尾的固定版本 URL；保留现有“实际用了什么”和“没有复制什么”边界。

### P2：补 JS 动态依赖的保守 Gate

把它定位为“低成本明显风险拦截”，而不是 JavaScript 完整闭包证明。真实浏览器网络/console Gate 仍必须保留。

### P2：拆分 setup 完成文案

完成文案至少区分：

- 基础依赖已完成，A/B/C 可按各自合同启动；
- D 能力已安装并 doctor 通过；
- D 能力被跳过或失败，页面可打开但完整语音玩法尚未就绪。

### 不建议做

- 不给每个作品创建自己的依赖和安装器；
- 不把整个 `node_modules` 公开给浏览器；
- 不为消除一个 `debug` 多版本而强行 override；
- 不把 148 MB 模型提交到 Git；
- 不用 HTTP 200 代替生产 UI、两设备和真实麦克风验收。

## 验收记录

| 命令 / 探针 | 结果 |
| --- | --- |
| `npm ci` | 通过；安装 55，审计 56，0 vulnerability |
| `npm ls --all --json` | 通过；依赖树完整 |
| `npm test` | 通过；Node test runner 全仓 648 项均为 `ok` |
| `npm run verify` | 通过；58 项、50 A、8 非 A、1 capability |
| runtime reuse 定向测试 | 11/11 通过；同时证明现有测试未覆盖内容身份 |
| 58 entry HTTP 探针 | 58/58 通过 |
| 8 launcher 真实进程矩阵 | 8/8 通过 |
| capability status/doctor | `speech-whisper-base: available (OK)` |
| `git diff --check 260c0bf..HEAD` | 在最终提交后执行 |
| 生产 UI 浏览器 Gate | 未执行，等待用户视觉确认 |

## 开源依赖与文档借鉴声明

| 项目 | 固定来源 | 状态 | 本仓库/本审计实际使用 | 未复制边界 |
| --- | --- | --- | --- | --- |
| Socket.IO 4.8.1 | [源码 tag](https://github.com/socketio/socket.io/tree/socket.io%404.8.1) / [LICENSE](https://github.com/socketio/socket.io/blob/socket.io%404.8.1/LICENSE) | MIT | 共享本地房间、广播、ack、定向与密封传输；审计其单一根依赖和本地 client route | 未复制示例源码、文档、视觉或素材 |
| node-qrcode 1.5.4 | [源码 tag](https://github.com/soldair/node-qrcode/tree/v1.5.4) / [license](https://github.com/soldair/node-qrcode/blob/v1.5.4/license) | MIT | 共享运行时通过公开 API 生成局域网入口 Data URL | 未复制示例源码、文档、视觉或素材 |
| Pannellum 2.5.7 | [源码 tag](https://github.com/mpetroff/pannellum/tree/2.5.7) / [COPYING](https://github.com/mpetroff/pannellum/blob/2.5.7/COPYING) | MIT | B 级全景作品使用官方 build JS/CSS，运行时只暴露固定白名单 | 未复制示例配置、文档文案、视觉或素材 |
| npm CLI 10.9.8 文档 | [`npm ci`](https://docs.npmjs.com/cli/v10/commands/npm-ci/) / [`npm install`](https://docs.npmjs.com/cli/v10/commands/npm-install/) | 官方命令参考，不是新增运行依赖 | 只用于比较冻结安装和普通安装语义 | 未复制 npm CLI 代码或文档正文；只做行为摘要 |

`speech-whisper-base` 的 whisper.cpp、Emscripten、OpenAI Whisper 和固定模型来源、许可证原文、实际使用与未复制边界已经在其 README 和 licenses 目录逐项记录；本报告只核对并复述固定 manifest 值，没有引入新的语音上游。

除上表和能力 README 已声明的第三方外，本审计的夹具、统计脚本、启动探针、缺陷分析和统一方案均为针对 Two of Us 仓库的独立工作，没有复制或改写其他开源项目的代码、页面、文案、视觉或素材。
