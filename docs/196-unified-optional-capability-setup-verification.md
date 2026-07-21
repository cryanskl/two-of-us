# D 级可选能力统一安装验收记录

- 日期：2026-07-21
- 对应规格：[`194-unified-optional-capability-setup-spec.md`](./194-unified-optional-capability-setup-spec.md)
- 实现提交：`9154407 feat: integrate optional capabilities into setup`
- 文档提交：`99f6511 docs: explain optional capability setup`

## 1. 交付结果

根 `setup.command`、`setup.bat`、`npm run setup` 与 `node scripts/setup.mjs` 现在共享同一流程：

1. 检查 Node 18+；
2. 完成并锁定基础 npm 依赖；
3. 动态枚举已登记的 D 级能力；
4. 交互终端只对缺失能力逐项询问，用户明确接受后才调用既有原子安装器；
5. 用户拒绝、非交互环境或 `--skip-optional` 不下载模型；
6. 汇总已可用、已安装、已跳过和失败能力，并给出直接启动入口。

没有新增 downloader、模型、外部依赖或作品启动时的隐式下载。

## 2. 自动化验证

执行环境：macOS，Node `v22.22.3`。

| 检查 | 结果 |
| --- | --- |
| `node --check scripts/setup.mjs` | 通过 |
| `node --test scripts/setup.test.mjs scripts/capabilities.test.mjs` | setup 定向 29/29 通过；能力管理器既有用例通过 |
| `npm test` | 1563/1563 通过，0 fail、0 skipped |
| `npm run verify` | 55 个作品入口、1 个能力声明、资源与借鉴声明完整 |
| `git diff --check` | 通过 |

定向矩阵覆盖 import 无副作用、Node/npm gate、未知参数、空能力、已安装、非 TTY、显式跳过、用户拒绝、安装成功、CLI 非零/抛错、status 失败、多能力继续、重复 ID 和敏感错误流。

## 3. 真实无下载烟测

从干净工作树执行：

```text
$ node --version
v22.22.3
$ node scripts/setup.mjs --skip-optional
Node.js 22.22.3 检查通过。
正在安装并锁定 Two of Us 的共享依赖……

up to date in 268ms
基础共享依赖安装完成。
已按 --skip-optional 跳过全部可选能力。
现在可以双击根目录或作品目录的 start.command / start.bat。
```

命令退出码为 0；真实 `npm install --no-audit --no-fund` 已执行；命令前后 `git status --short` 均为空，lockfile 和工作树没有变化。

`--skip-optional` 分支在基础阶段后直接返回；回归测试进一步注入会抛错的 list/status/install API，证明该路径不会访问能力 API。因此本次 smoke 没有下载 `ggml-base.bin`，也没有创建或修改用户 capability 数据。

## 4. 模型安装边界

没有自动执行交互输入 `Y` 后的约 141 MB 模型下载。该动作包含当次网络、磁盘和模型来源确认，必须由用户本人明确接受，不能由验收脚本代替。

这一分支由两层证据覆盖：setup 注入测试证明确认后的调用、二次 status 和聚合退出语义；既有 capability 测试证明固定 URL、`.part`、长度、SHA-256、原子落盘、receipt、doctor 与 remove。未来用户真实安装时仍走同一能力管理器。

## 5. 独立审查与 Bug 闭环

独立审查最初发现一个 P2：内层能力 CLI 可以在返回非零前把完整 URL、绝对路径和哈希写进 setup 的真实 stderr，绕过外层脱敏。

修复后改为私有错误 buffer，只保留合法稳定码，并新增真实绕过方式的回归测试。复核结果：原 P2 关闭，没有新 P0/P1/P2。问题、根因与回归记录见 [`bugs/2026-07-21-setup-capability-stderr-leak.md`](../bugs/2026-07-21-setup-capability-stderr-leak.md)。

## 6. 借鉴与来源声明

本批只整合仓库内部 `scripts/setup.mjs`、`scripts/capabilities.mjs` 与 `scripts/capabilities-lib.mjs`，没有参考或复制新的第三方开源项目，也没有新增第三方依赖。`speech-whisper-base` 使用的引擎、模型、构建资产与许可证继续由对应 capability 目录单独声明。
