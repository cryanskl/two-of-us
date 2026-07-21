# B/C/D 作品直达启动器与运行时复用实施计划

- 日期：2026-07-21
- 状态：待实施
- Brainstorm：[`189-non-a-direct-launch-brainstorm.md`](./189-non-a-direct-launch-brainstorm.md)
- 规格：[`190-non-a-direct-launch-spec.md`](./190-non-a-direct-launch-spec.md)

## 1. 提交序列

已完成：

1. `5042fc7 docs: define non-A direct launch scope`
2. `558fb1c docs: specify reusable direct launchers`

后续按以下边界独立提交：

3. `docs: plan reusable direct launchers`
4. `feat: reuse an existing local runtime`
5. `feat: add direct launchers for non-A experiences`
6. `docs: document reusable experience launchers`
7. `test: verify reusable direct launchers in browser`

若实现中发现已复现缺陷，bug 修复与对应 `bugs/` 记录作为单独 commit 插入，不把修复埋进无关文档提交。

## 2. 阶段一：共享复用协议

由 subagent 实现，主线程逐行审查。文件边界：

```text
scripts/runtime-reuse.mjs
scripts/runtime-reuse.test.mjs
scripts/start.mjs
scripts/start-target.mjs
scripts/start-target.test.mjs
scripts/start-reuse.integration.test.mjs
shared/runtime/catalog.js
shared/runtime/server.js
shared/runtime/server.test.js
```

实施顺序：

1. 从 `catalog.js` 导出 `validateCatalog`，冻结 lower-kebab ID、exact entry 与 same-origin target；
2. 在 server health/catalog 成功响应加入 runtime identity header；
3. 把 listener 的端口窗口在 65535 截断；
4. 实现候选 URL、带 deadline/abort/redirect-error 的请求与可复用运行时查找；
5. 在 `start.mjs` 监听前复用已有 runtime，保持新启动与退出路径不变；
6. 补纯函数、真实 server 和真实 child-process 测试。

定向验证：

```text
node --check scripts/runtime-reuse.mjs
node --check scripts/start.mjs
node --check shared/runtime/catalog.js
node --check shared/runtime/server.js
node --test scripts/runtime-reuse.test.mjs scripts/start-target.test.mjs scripts/start-reuse.integration.test.mjs shared/runtime/server.test.js
git diff --check
```

主线程审查重点：

- redirect 不会被默认 fetch 悄悄跟随；
- timeout 后 timer 与 AbortController 不残留；
- 外部 entry 不能跨 origin；
- 65535 不会调用非法端口；
- IPv4 listener、`127.0.0.1` 公告和复用探测地址族一致；
- 第二个进程退出不关闭第一个进程；
- cleanup 后没有遗留 child process 或端口。

## 3. 阶段二：七个作品级 wrapper

由另一 subagent 只创建下列 14 个文件，不碰共享脚本、测试或文档：

```text
experiences/surprises/panorama-memory/start.command
experiences/surprises/panorama-memory/start.bat
experiences/co-op/together-lock/start.command
experiences/co-op/together-lock/start.bat
experiences/co-op/lan-pictionary/start.command
experiences/co-op/lan-pictionary/start.bat
experiences/co-op/compatibility-quiz/start.command
experiences/co-op/compatibility-quiz/start.bat
experiences/versus/lan-connect-four/start.command
experiences/versus/lan-connect-four/start.bat
experiences/versus/sealed-rps/start.command
experiences/versus/sealed-rps/start.bat
experiences/versus/heart-sprint/start.command
experiences/versus/heart-sprint/start.bat
```

每份内容严格使用规格模板；`.command` 设为 executable。主线程在 `shared/runtime/catalog.test.js` 新增动态 Gate：从生产 catalog 计算所有 installed B/C/D 条目，不硬编码“只有八个”；按 entry 推导目录并核对两种 wrapper、exact ID、共享入口、禁止私有 server/npm/curl/PowerShell，以及 macOS mode。

定向验证：

```text
node --test shared/runtime/catalog.test.js scripts/start-target.test.mjs
find experiences -type f \( -name start.command -o -name start.bat \) -print | sort
git diff --check
```

## 4. 阶段三：文档与可复用知识

更新：

```text
README.md
docs/README.md
shared/runtime/README.md
experiences/surprises/panorama-memory/README.md
experiences/co-op/together-lock/README.md
experiences/co-op/lan-pictionary/README.md
experiences/co-op/compatibility-quiz/README.md
experiences/versus/lan-connect-four/README.md
experiences/versus/sealed-rps/README.md
experiences/versus/heart-sprint/README.md
learn/local-runtime-reuse-and-thin-launchers.md
```

要求：

- 根 README A 级数量从 catalog 动态核对为 47；
- B/C/D 使用说明先写本作品目录入口，也保留根门户；
- 共享运行时说明身份 header、redirect/同源 Gate、顺序复用、首进程生命周期与非认证边界；
- Learn 记录何时适合薄 wrapper、为何不做 daemon、如何安全发现 loopback runtime、如何测试真实进程；
- 借鉴声明明确无新外部参考，内部复用 `i-heard-you` wrapper；
- 不在文档里声称并发互斥、Linux launcher、自带 Node 或 D 模型安装向导已经完成。

## 5. 阶段四：整仓与真实浏览器验收

先运行：

```text
npm test
npm run verify
git diff --check
```

真实运行：

1. 选一个可用固定端口，执行生产 `node scripts/start.mjs --experience panorama-memory --no-open`；
2. 等待 `/api/health` ready，记录 PID、端口和 health/catalog identity header；
3. 在首进程仍运行时执行 `node scripts/start.mjs --experience compatibility-quiz --no-open`；
4. 核对第二进程 0 退出、输出复用文案、两个 open URL 使用同一端口、下一个候选端口未被 Two of Us 占用；
5. Browser/IAB 优先访问 `127.0.0.1` 上的 B 级目标与 C 级目标，核对地址、页面标题、启动 Gate 与 console；
6. Browser/IAB 不可用才记录原因并使用 Playwright Chromium；
7. SIGTERM 首进程，核对端口释放；
8. 删除临时截图/日志，不把 QA 临时产物提交。

把环境、命令、结果、真实未覆盖边界和 commit 写入 `docs/192-non-a-direct-launch-verification.md`。浏览器只能证明生产 URL 页面行为，wrapper 双击由 exact 文件、mode 与真实 child process 证明；不得把两者混为一个证据。

## 6. Bug 与回退策略

- 探测误跟 redirect、端口越界、第二进程不退出、首进程被关闭、目标跨源、wrapper 路径错误或 Windows shell 语义错误，一旦复现必须写 `bugs/YYYY-MM-DD-<slug>.md`；
- 与本批无关的既有页面问题只记录，不顺手重构玩法；
- 核心协议提交可独立回退到原“每次新建服务”行为；
- wrapper 提交可独立保留或回退，不影响根启动器；
- 文档与验收提交不得包含新的运行逻辑。

## 7. 借鉴与来源声明

本计划没有新增外部参考、代码、素材或依赖。作品 wrapper 只推广仓库内 `i-heard-you` 已有模式；共享复用协议和测试为本仓库独立实现。Socket.IO 与 node-qrcode 的既有 MIT 声明继续由 `shared/runtime/README.md` 维护。
