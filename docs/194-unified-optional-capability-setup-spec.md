# D 级可选能力统一安装可执行规格

- 日期：2026-07-21
- 上游决策：[`193-unified-optional-capability-setup-brainstorm.md`](./193-unified-optional-capability-setup-brainstorm.md)
- 适用入口：`setup.command`、`setup.bat`、`npm run setup`、`node scripts/setup.mjs`

## 1. 文件边界

### `scripts/setup.mjs`

重构为无 import 副作用的 CLI 模块，并导出：

```js
export async function main(argv = process.argv.slice(2), dependencies = {})
```

模块入口使用 `pathToFileURL(process.argv[1])` 判断后设置 `process.exitCode = await main()`。测试 import 不得执行 npm、读取真实能力状态或修改 `process.exitCode`。

默认 dependencies：

- `env`、`stdin`、`stdout`、`stderr`、`platform`、`nodeVersion`；
- `rootDir` 指向仓库根 URL；
- `runNpmInstall()` 封装当前 `npm install --no-audit --no-fund` child process；
- `listCapabilityIds`、`getCapabilityStatus` 来自 `capabilities-lib.mjs`；
- `capabilityMain` 来自 `capabilities.mjs`。

测试可以替换这些函数和 stream，不访问公网、真实 npm 或用户数据目录。

### `scripts/setup.test.mjs`

只测试 setup orchestration；能力下载、哈希、receipt 与 CLI 确认细节继续由 `capabilities.test.mjs` 覆盖，不复制其 fixture。

## 2. 参数合同

首版只支持：

```text
--skip-optional
```

- 未知参数：向 stderr 输出 `[UNKNOWN_OPTION] 未知选项：<value>`，返回 1，且不运行 npm；
- `--skip-optional`：仍安装基础依赖，随后不读取能力目录，明确报告跳过；
- 不增加 `--yes` 或“自动安装全部”选项，避免脚本误触大型下载；需要无交互预装时继续使用已有精确命令 `capabilities.mjs install <id> --yes`。

## 3. Node 与 npm 阶段

1. `nodeVersion` 取第一个点号前的十进制整数；不是安全正整数或小于 18 均返回 1；
2. 失败输出当前版本与 nodejs.org LTS 操作提示；不得调用 npm 或 capability API；
3. 通过后调用一次 `runNpmInstall()`；默认 runner 在 Windows 使用 `npm.cmd`，其他平台使用 `npm`，cwd 为仓库根，stdio 为 inherit；
4. runner 以以下冻结结果之一 resolve：

```js
{ ok: true }
{ ok: false, kind: "spawn", message }
{ ok: false, kind: "signal", signal }
{ ok: false, kind: "exit", code }
```

5. npm 失败按当前中文语义写 stderr 并返回 1 或正整数退出码；不得进入能力阶段；
6. npm 成功后先输出“基础共享依赖安装完成。”，即使后续某个可选能力失败也不回滚或谎称基础阶段未完成。

## 4. 能力枚举与状态

`--skip-optional` 未出现时：

1. 使用 `listCapabilityIds(rootDir)`；实现应继续依赖其稳定排序，不自行读取目录；
2. 空列表：输出“仓库中没有已登记的可选能力。”并成功完成；
3. 每个 ID 调用 `getCapabilityStatus({ rootDir, dataDir, id })`；`dataDir` 由 `resolveDataDir({ env })` 统一得到；
4. `available`：加入 `ready`，输出 `<id> 已安装且校验通过。`，不调用 `capabilityMain`；
5. 其他状态在交互终端进入安装流程，在非交互环境加入 `skipped`；
6. 单项状态检查抛错时加入 `failed`，继续下一个 ID，最终返回 1。

交互终端定义为 `stdin.isTTY === true && stdout.isTTY === true`。stderr 是否 TTY 不参与判断。

## 5. 交互安装

对每个非 available 能力调用：

```js
await capabilityMain(["install", id], {
  env, stdin, stdout, stderr, rootDir,
})
```

这样继续使用已有 manifest 说明、体积、来源、许可证、`y/N`、进度、原子安装和错误码。

调用后必须再次读取 status：

- status `available`：加入 `installed`；
- CLI 返回 0 且仍非 available：视为用户拒绝，加入 `skipped`；
- CLI 非 0、抛错或再次 status 抛错：加入 `failed`，继续后续能力；
- 不把 `capabilityMain` 的返回 0 单独当作安装成功。

同一 setup 进程最多调用每个 capability 的安装一次。

## 6. 非交互与显式跳过

### 非交互

基础依赖完成后，对每个非 available 能力输出：

```text
<id> 尚未安装；当前不是交互终端，已跳过。
需要时运行：node scripts/capabilities.mjs install <id>
```

返回 0，不调用 `capabilityMain`。

### `--skip-optional`

输出：

```text
已按 --skip-optional 跳过全部可选能力。
```

不调用 `listCapabilityIds`、`getCapabilityStatus` 或 `capabilityMain`，返回 0。

## 7. 汇总与退出

最终始终输出基础入口：

```text
现在可以双击根目录或作品目录的 start.command / start.bat。
```

如果存在 skipped，再输出每个精确安装命令；如果存在 failed，向 stderr 输出失败 ID 汇总和“基础共享依赖已经完成，可修复后安全重试 setup 或精确能力命令”。

- 没有 failed：返回 0；
- 至少一个 failed：返回 1；
- ready/installed/skipped/failed 数组仅在内部组织输出，不新增 JSON API。

## 8. 测试矩阵

至少覆盖：

1. import 无副作用；
2. Node `17.x`、畸形版本与 Node 18+；
3. npm spawn、signal、exit 与成功；
4. 未知参数和 `--skip-optional`；
5. 空能力列表；
6. 已 available 不调用安装；
7. 非 TTY 跳过并给精确命令；
8. TTY 用户拒绝（CLI 0 + status 仍 missing）；
9. TTY 安装成功（status 变 available）；
10. CLI 非零、CLI 抛错、status 抛错；
11. 多能力稳定顺序、拒绝继续、失败继续和最终聚合退出码；
12. stdout/stderr 不泄露能力下载 URL、hash、绝对 artifact 文件路径或用户隐私内容；manifest 安装说明保留的 origin 与数据根目录属于已批准输出。

## 9. 验收

```text
node --check scripts/setup.mjs
node --test scripts/setup.test.mjs scripts/capabilities.test.mjs
npm test
npm run verify
git diff --check
```

真实烟测不得下载 141 MB 模型：使用 `--skip-optional` 验证根 `.command`/`.bat` 合同，或在临时 fixture root/dataDir 运行可注入 main。真实模型安装继续由用户明确接受后执行。

## 10. 借鉴与来源声明

本规格复用仓库内部 capability 管理器，没有新增第三方依赖或外部开源参考。所有 D 级引擎、模型、构建资产与许可证声明保持在对应 capability 目录，不由 setup 文档重复或替代。
