# B/C/D 作品直达启动器与运行时复用 Brainstorm

- 日期：2026-07-21
- 状态：范围已冻结，等待可执行规格
- 对应总目标：安装完成后，每个体验都能从自己的目录直接打开；依赖、端口与运行时保持统一
- 影响范围：1 个 B 级作品、6 个 C 级作品、1 个已有启动器的 D 级作品，以及共享 `scripts/start.mjs`

## 1. 当前证据

仓库已有统一根安装器、根启动器、共享静态服务、Socket.IO 房间、二维码与稳定的 `--experience <id>` 目标解析；`experiences/co-op/i-heard-you/` 也已经证明作品级 `start.command` / `start.bat` 可以只调用共享入口。

但当前 8 个已安装的非 A 级作品中，只有 `i-heard-you` 自带作品级双击入口。以下 7 个作品仍要求用户回到仓库根目录启动服务，再从门户寻找作品：

| 等级 | ID | 目录 |
| --- | --- | --- |
| B | `panorama-memory` | `experiences/surprises/panorama-memory/` |
| C | `together-lock` | `experiences/co-op/together-lock/` |
| C | `lan-pictionary` | `experiences/co-op/lan-pictionary/` |
| C | `compatibility-quiz` | `experiences/co-op/compatibility-quiz/` |
| C | `lan-connect-four` | `experiences/versus/lan-connect-four/` |
| C | `sealed-rps` | `experiences/versus/sealed-rps/` |
| C | `heart-sprint` | `experiences/versus/heart-sprint/` |

另一个独立缺口是重复启动：当前 `start.mjs` 遇到占用端口会顺延选择下一个端口，即使占用者就是已经运行的 Two of Us。顺序重复双击因此可能产生多个可用但无人管理的本地服务，不满足 `docs/04-implementation-program-spec.md` 的“重复启动不会产生多个失控进程”。

## 2. Brainstorm 方案

### 方案 A：只补作品级 wrapper

- 优点：改动最少，立刻能从作品目录双击。
- 缺点：重复双击仍会启动第二个运行时；只修入口，不修生命周期。
- 结论：不采用。

### 方案 B：每个作品复制完整启动逻辑

- 优点：每个作品可以单独决定端口和提示。
- 缺点：依赖检查、端口、浏览器打开、退出清理和错误文案会产生 8 份分叉；违背统一运行时目标。
- 结论：不采用。

### 方案 C：薄 wrapper + 共享运行时探测复用

- 每个 B/C/D 作品只提供 macOS/Windows 薄 wrapper，传自己的稳定 catalog ID；
- `start.mjs` 在监听前扫描配置的候选端口范围，只认可带固定 Two of Us 健康标识的响应；
- 找到已有运行时后，读取它的本地 catalog，确认目标仍是已安装作品，再直接打开该作品 URL 并退出新进程；
- 找不到可信运行时才按现有逻辑启动新服务；普通端口占用者继续被跳过；
- 首个运行时仍由原终端持有，Ctrl+C 继续负责关闭和释放端口。

优点是同时补齐“目录直达”和“顺序重复启动复用”，并保持一份权威运行逻辑。代价是需要冻结健康探测的 fail-closed 边界和短超时。

**结论：采用方案 C。**

## 3. 产品与安全边界

1. 只扫描确定的 IPv4 loopback `127.0.0.1`，与共享运行时的 `0.0.0.0` IPv4 listener 对齐；不依赖 `localhost` 的 IPv4/IPv6 解析顺序，也不探测局域网或公网地址。
2. 只扫描 `preferredPort .. preferredPort + maxPortAttempts - 1`；`preferredPort=0` 时不做复用探测。
3. 健康探测必须短时、只读、无凭证；失败、超时、错误 header、错误状态或错误 catalog 全部视为“不可信”，继续正常启动。
4. 不杀死、不接管、不修改已有进程，也不创建后台守护进程。
5. 复用只保证顺序重复启动；真正同时发生的进程级竞态不在本批伪装成已解决。
6. B 级全景照片仍只存在于当前浏览器的 `blob:` URL；运行时复用不会上传、缓存或新增照片路由。
7. C 级作品继续由首个运行时在终端显示局域网地址，房间与二维码协议不变。
8. D 级能力检查、模型 manifest 与本机限定 API 不变。

## 4. 启动 UX 冻结

### 首次启动

作品 wrapper → 共享启动器 → 新建运行时 → 打印本机/局域网入口 → 打开目标作品 → 终端保持运行。

### 顺序重复启动

作品 wrapper → 发现可信已有运行时 → 打印“复用已经运行的 Two of Us”与目标 URL → 打开目标作品 → 第二个终端进程正常退出。

### 外部服务占用端口

探测不认可该服务 → 按原有端口顺延逻辑启动 Two of Us → 不向外部服务发送作品数据。

### 依赖未安装或目标失效

保持现有中文可操作错误；wrapper 在失败时停留，用户能读到提示。不得静默打开门户或猜测相近 ID。

## 5. 验证证据

后续规格与实现至少覆盖：

- catalog 中每个 installed B/C/D 条目都存在两种作品级 wrapper；
- wrapper 只调用共享 `scripts/start.mjs --experience <exact-id>`；
- macOS wrapper 具备 executable mode，Windows wrapper 使用仓库相对路径；
- 可信运行时可被复用，目标 URL 由它自己的 catalog 解析；
- foreign service、错误标识、损坏 catalog、超时和网络异常不会被复用；
- `preferredPort=0` 不扫描；候选端口顺序与运行时监听范围一致；
- 新启动、已有运行时复用、目标不存在与 `--no-open` 都有自动化测试；
- `npm test`、`npm run verify` 与真实浏览器目标直达通过。

## 6. 借鉴与来源声明

本批不参考或引入新的外部开源项目、代码、脚本模板或素材。作品级 wrapper 结构复用本仓库已有 `experiences/co-op/i-heard-you/start.command` 与 `start.bat`；端口选择、健康 API、catalog 解析和浏览器打开均继续演进本仓库自己的共享运行时。

根运行时使用的 Socket.IO 与 node-qrcode 依赖声明保持在 `shared/runtime/README.md`，本批不复制它们的示例源码，也不改变其许可证边界。
