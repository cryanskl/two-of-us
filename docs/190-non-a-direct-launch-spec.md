# B/C/D 作品直达启动器与已有运行时复用规格

- 日期：2026-07-21
- 状态：可执行规格
- 对应 Brainstorm：[`189-non-a-direct-launch-brainstorm.md`](./189-non-a-direct-launch-brainstorm.md)
- 外部依赖：无新增

## 1. 完成定义

本批只有同时满足以下条件才算完成：

1. catalog 中每个 `installed === true` 且 `level` 为 B/C/D 的作品目录都有 `start.command` 与 `start.bat`；
2. 两种 wrapper 只进入仓库根目录并调用 `scripts/start.mjs --experience <exact-id>`，不复制端口、依赖、房间或浏览器逻辑；
3. 首次双击仍启动一个共享运行时并直接打开目标作品；
4. 同一候选端口窗口内已有可信 Two of Us 运行时，顺序重复双击只复用它、打开目标作品并让第二个 Node 进程退出；
5. 外部服务、损坏响应、错误 catalog、目标缺失、超时或网络异常都不被误认成可复用运行时；
6. 目标 URL 必须与被复用运行时同源，catalog 不能令启动器打开公网或任意 scheme；
7. 根启动器、端口顺延、C 级局域网地址、D 级能力检查和 Ctrl+C 退出行为不回归；
8. 自动化、真实进程集成、整仓测试、仓库校验与真实浏览器目标直达都有证据；
9. 本批文档说明无新外部借鉴，并更新启动说明与文档索引；
10. 每个完成阶段形成独立 commit。

并发启动的原子互斥、后台常驻 daemon、系统服务注册、Linux `.desktop`、自带 Node 发行包、`experience.json` 和 D 级模型安装向导不属于本批。

## 2. 冻结常量与身份响应

新增 `scripts/runtime-reuse.mjs`，冻结并导出：

```js
RUNTIME_HEADER_NAME = "x-two-of-us-runtime"
RUNTIME_HEADER_VALUE = "1"
RUNTIME_PROTOCOL_VERSION = 1
RUNTIME_PROBE_TIMEOUT_MS = 250
DEFAULT_MAX_PORT_ATTEMPTS = 20
```

共享运行时对以下两条成功响应同时发送：

```text
x-two-of-us-runtime: 1
```

- `GET|HEAD /api/health`
- `GET|HEAD /api/catalog`

其他静态资源、404、错误 API 和 capability artifact 不附加该身份 header。header 是避免误认普通本机服务的协议标识，不是认证、密码或对恶意本机进程的安全证明。

`/api/health` 继续返回现有 JSON；复用探测只接受同时满足：

```js
{
  ok: true,
  service: "two-of-us",
  version: 1,
  port: candidatePort,
  localUrl: `http://127.0.0.1:${candidatePort}/`
}
```

其余现有字段可存在但不参与身份判断。

## 3. 候选端口

`buildRuntimeCandidateUrls(preferredPort, maxPortAttempts)`：

- 两项都必须是 primitive safe integer；
- `preferredPort` 范围 `0..65535`；
- `maxPortAttempts` 范围 `1..20`；
- `preferredPort === 0` 返回 `[]`，表示操作系统随机端口不可发现；
- 否则生成递增的 `http://127.0.0.1:<port>/`，在 65535 截止；
- 不回绕、不探测 IPv4/IPv6 字面地址、局域网地址或公网；
- 返回新数组，不依赖输入对象、iterator 或排序。

示例：`preferredPort=65534,maxPortAttempts=20` 只产生 65534 与 65535 两项。

`scripts/start.mjs` 必须把同一个 `DEFAULT_MAX_PORT_ATTEMPTS` 同时传给复用探测和 `createRuntimeServer`，保证扫描窗口与监听窗口一致。

`shared/runtime/server.js` 的监听循环也必须在 65535 截止；不得把 `preferredPort + offset > 65535` 交给 `server.listen`。如果窗口内合法端口都被占用，抛出既有中文端口占用错误，不暴露 `ERR_SOCKET_BAD_PORT`。因此 `65534/20` 的探测与监听都只有 65534、65535 两项。

运行时继续监听 IPv4 wildcard `0.0.0.0` 以同时服务本机与局域网，但本机公告、health `localUrl`、复用探测和浏览器本机入口必须统一使用 `127.0.0.1`。不得公告不确定解析到 `::1` 的 `localhost`；局域网入口仍由真实 IPv4 网卡地址生成。真实 socket 测试必须证明同端口即使存在 IPv6-only 外部服务，本机入口仍确定命中 Two of Us 的 IPv4 listener。

## 4. 单候选探测

每个候选按端口升序串行执行：

1. 在 250ms deadline 内以 `redirect: "error"` 请求 `GET <base>api/health`；
2. 要求 status 200、`response.url` 精确等于请求 URL、identity header 精确为 `1`；否则不读取 JSON body；
3. 解析 JSON 并核对第 2 节的五个身份字段；
4. 在新的 250ms deadline 内同样以 `redirect: "error"` 请求 `GET <base>api/catalog`；
5. 要求 status 200、`response.url` 精确等于请求 URL、identity header 精确为 `1`，再解析 JSON；
6. 用共享 catalog validator 验证 `schemaVersion===1`、experiences 数组和每个 entry；
7. 用 `resolveExperienceUrl` 对目标 ID 做 installed 与同源校验；
8. 全部通过才返回可复用结果。

每次请求各自创建 AbortController；deadline 到达时 abort。无论成功、失败或抛错都清理 timer。不得跟随同源、跨源或多段 redirect；任一步失败只拒绝当前候选并继续下一端口，不向终端打印逐端口噪声。

返回 exact object：

```js
{
  localUrl,
  openUrl,
  catalog
}
```

扫描结束仍无结果则返回 `null`。函数不得启动、停止、写文件、杀进程、访问 storage 或打开浏览器。

## 5. Catalog 与目标 URL 加固

`shared/runtime/catalog.js` 导出纯 `validateCatalog(catalog)`，`loadCatalog` 解析磁盘 JSON 后调用它。原有等级与必填字段检查保留，并把 entry 冻结为：

```text
experiences/(surprises|co-op|versus)/<lower-kebab-id>/index.html
```

catalog experience 的 `id` 也必须是 lower-kebab，且 entry 目录末段精确等于 `id`。当前 55 个条目必须全部继续通过。

`resolveExperienceUrl(catalog, localUrl, experienceId)` 继续只接受 installed target；另外必须：

- `localUrl` 可构造为 HTTP URL；
- entry 通过上述 validator；
- `new URL(entry, localUrl)` 与 base 的 `origin` 精确相等；
- 结果 pathname 仍是 `/` 加 entry；
- 不接受 absolute URL、protocol-relative URL、反斜杠、query、fragment、`.`/`..` segment 或编码后的路径逃逸。

任一失败抛出中文错误。复用扫描捕获该错误并继续；正常新启动遇到本地 catalog 失效则保持现有 fail-fast。

## 6. `start.mjs` 流程

冻结流程：

```text
解析 CLI 与端口
  → 扫描可复用运行时
    → 找到：打印复用信息 → 按 --no-open 决定是否打开 → 正常退出
    → 未找到：创建共享运行时 → 打印既有详情 → 按 --no-open 决定是否打开 → 注册退出清理
```

复用分支可见输出精确包含：

```text
Two of Us 已经在运行，正在复用
本机入口：<localUrl>
当前作品：<openUrl>       # 仅传 --experience 时
```

不输出新的局域网地址或二维码，也不声称拥有已有进程；这些信息留在首个运行时终端和门户。`--no-open` 只抑制浏览器打开，不抑制探测或输出。

新启动分支的现有中文输出和 Ctrl+C/SIGTERM 清理保持不变。

## 7. Wrapper exact template

### macOS `start.command`

```bash
#!/bin/bash

set -u
cd "$(dirname "$0")/../../.." || exit 1

node scripts/start.mjs --experience <id>
status=$?

if [ "$status" -ne 0 ]; then
  echo
  read -r -p "启动失败。按回车键关闭窗口……"
fi

exit "$status"
```

- LF、UTF-8、末尾换行；
- Git executable mode `100755`；
- `<id>` 是所在目录对应的 exact catalog ID，不加引号、变量或用户输入。

### Windows `start.bat`

```bat
@echo off
setlocal
cd /d "%~dp0\..\..\.."

node scripts\start.mjs --experience <id>
if errorlevel 1 (
  echo.
  echo 启动失败，请查看上方提示。
  pause
  exit /b 1
)
```

- UTF-8、末尾换行；
- 不调用 PowerShell、npm、curl、浏览器 executable 或作品私有 server；
- 复用成功返回 0，不 pause。

7 个缺失作品各新增两份；已有 `i-heard-you` 两份作为 canonical template 一并纳入动态目录测试，不复制成第二套逻辑。

## 8. 测试合同

### 8.1 纯函数

新增 `scripts/runtime-reuse.test.mjs`，覆盖：

- 0、普通端口、65534 边界与非法参数；
- 按升序跳过连接失败、错误 status、错误 header、错误 health、错误 catalog；
- health/catalog 的同源 redirect、跨源 redirect、多段 redirect 与伪造 `response.url` 全部 fail closed；
- 同端口 health/catalog 两次请求与各自 deadline；
- timeout abort 且后续候选仍可成功；
- 目标缺失、未安装、同源逃逸与外部 entry fail closed；
- 成功 exact return 与 `experienceId=null` 根门户；
- `--no-open` 所需结果不含浏览器副作用。

扩充 `scripts/start-target.test.mjs` 与 `shared/runtime/catalog.test.js`，覆盖 catalog entry 加固、same-origin 和 8 个非 A 作品的 wrapper 内容/mode。

### 8.2 真实服务与进程

- `shared/runtime/server.test.js` 核对 health/catalog GET/HEAD identity header，其他路由没有；
- 监听器与扫描器在 65535 使用同一截断窗口；65534、65535 被占用时返回中文窗口耗尽错误，不尝试 65536；
- 用真实临时端口启动 runtime，生产 `findReusableRuntime` 能找到并解析目标；
- 用 child process 启动第一个 `scripts/start.mjs --no-open`，再以同端口启动第二个；第二个必须在有界时间内以 0 退出、打印复用文案，第一个仍存活，候选下一端口未被占用；
- 外部 HTTP 服务占首选端口时，生产启动器仍在下一端口启动自己的 runtime。

所有 child process 必须在 test cleanup 中 SIGTERM，并等待退出；测试不得留下端口或后台进程。

### 8.3 仓库与浏览器

```text
node --test scripts/runtime-reuse.test.mjs scripts/start-target.test.mjs shared/runtime/server.test.js
npm test
npm run verify
git diff --check
```

浏览器/IAB 优先完成：

1. 从作品 launcher 等价命令启动 `panorama-memory`，地址直接落在该作品而非门户；
2. 保持首个运行时，执行另一个作品目标，浏览器直接落到一个 C 级作品且服务端口不变；
3. `/api/health` 与 `/api/catalog` 正常；
4. 浏览器 console 无本批新增错误。

浏览器工具不能自动双击系统脚本时，只把“wrapper 字节/mode + 真实 child process”作为脚本证据，把同一生产 URL 的浏览器访问作为页面证据，不伪称完成了 OS Finder/Explorer 人工双击。

## 9. 文档、Bug 与 Learn

- 根 README 把 A 级数量校正为 catalog 真值，并说明 B/C/D 可从各自目录双击启动；
- 7 个作品 README 从“回根目录/门户进入”改为优先写本目录 launcher，同时保留根门户路径；
- `shared/runtime/README.md` 记录复用协议、非认证边界和首个终端的生命周期所有权；
- `docs/README.md` 索引 189–191；
- 若实现中发现且复现缺陷，写入 `bugs/`；
- 将“本机运行时发现、同源 target 与薄 wrapper”沉淀到 `learn/`，因为它同时服务 8 个作品并可复用到未来 B/C/D。

## 10. 借鉴与来源声明

本批不参考或引入新的外部开源项目、代码、脚本模板或素材。wrapper 结构来自本仓库已存在的 `i-heard-you` 作品级启动器；复用协议、catalog 加固与进程测试由本仓库为自己的运行时独立设计和实现。

Socket.IO 与 node-qrcode 继续仅作为共享运行时依赖使用，版本与 MIT 声明保持在 `shared/runtime/README.md`；本批没有复制其示例、文档、测试或实现。
