# Shadow Duet 非视觉核心复验证明

- 复验日期：2026-07-25
- 基线：`a4eea1eb2f7f01fb18c21797cd970c16d67bfb3c`
- 分支：`codex/exp-shadow-duet-core`
- worktree：`{worktree-base}/shadow-duet-core`
- 范围：既有非视觉核心再验收、重复机制与来源审计；不创建生产 UI

## 1. 结论

`shadow-duet` 的非视觉核心在本次任务开始前已经完整存在于 main。当前实现与
[`203-shadow-duet-plan.md`](./203-shadow-duet-plan.md) 子任务 A 是同一套合同，
重复创建配置、关卡或 reducer 会覆盖已完成且已经回归验证的工作。

本轮因此按“现有核心再验收/缺口修复”执行。复验没有发现可复现的核心缺口：

- 纯配置、原创四姿势和六幕目标完整；
- 固定 tick、持有栈、七阶段 reducer、重放和公开视图完整；
- CommonJS 与浏览器经典脚本边界完整；
- 固定开源来源、许可证、版权、证据哈希和零复制范围完整；
- 定向、全仓与仓库验收全部通过。

本轮没有修改 `logic.js`、`config.js`、测试、归因、共享运行时、根依赖或
catalog，也没有新增 bug/learn 记录。唯一新增文件是本复验证明。

## 2. 历史实现证据

关键历史提交：

| Commit | 日期 | 职责 |
| --- | --- | --- |
| `5363a8b` | 2026-07-21 | 定向调研与 brainstorm |
| `4d9be74` | 2026-07-21 | 可执行规格 |
| `230a9e5` | 2026-07-21 | 分步实施计划 |
| `65c9dee` | 2026-07-21 | 完整视觉简报 |
| `6b49df1` | 2026-07-21 | 修正 CommonJS 计划边界 |
| `ee7df10` | 2026-07-21 | 配置、纯规则、测试与三项核心 bug 修复 |
| `78eca7b` | 2026-07-24 | 16 态视觉概念、台账和设计提案 |
| `9c44040` | 2026-07-24 | 固定来源维护复核 |
| `9cca69e` | 2026-07-24 | 体验目录借鉴与生成资产声明 |

`ee7df10` 新增了：

```text
experiences/co-op/shadow-duet/package.json
experiences/co-op/shadow-duet/config.js
experiences/co-op/shadow-duet/logic.js
experiences/co-op/shadow-duet/logic.test.js
```

同一提交记录并修复了：

- CommonJS 边界被根级 ESM 覆盖；
- 无 `Intl.Segmenter` 时的多语种字素回退；
- attempt 上限没有为剩余幕保留最低预算。

后续 `9cca69e` 增加 `ATTRIBUTION.md` 及相应归因回归测试。当前
`logic.test.js` 共 28 个顶层用例。

## 3. 当前核心合同

### 3.1 原创配置与关卡

- 席位固定为 `left / right`；
- 姿势固定为 `high / wide / low / near`；
- 左席使用 `W / A / S / D`，右席使用四个方向键；
- 六幕目标对全部唯一，每席覆盖 `wide:2 / near:2 / high:1 / low:1`；
- 席位称呼与完成结语可配置，但不能改变姿势、关卡、时钟或胜利条件；
- composer 只接收冻结隔离摘要，异常、thenable、篡改、空白或超长输出回退。

### 3.2 reducer 与重放

- 规则时钟固定 30Hz；
- 定格窗为闭区间 `[48, 61]`；
- 正确姿势对连续保持 6 tick 才完成；
- `STEP` 每次只接受 `1..5`，逐 tick 结算并在成功/失败处原子停止；
- 两席分别维护去重持有栈，释放当前姿势后回退到仍持有的最后一项；
- 七阶段为 `intro / scene-intro / dancing / missed / pose-result /
  act-result / complete`；
- revision、attempt 和剩余幕最低预算都受安全整数边界保护；
- 相同 JSON action log 从初态得到字节等价公开完成视图。

### 3.3 hostile input 与公开视图

- action、state、配置和 summary 都要求普通对象、精确字段和 own data
  descriptor；
- accessor、Symbol、数组子类、异常原型、稀疏数组和 Proxy 反射异常失败关闭；
- 非法 state 交给 reducer 时回到全新初态；
- 非法 state/config 交给公开视图时安全回退且不抛异常；
- 状态、常量、配置、summary 和公开视图全部断开引用并递归冻结；
- 公开视图没有个人分数、赢家、准确率、失败次数、时间戳或 action log。

## 4. 重复机制审计

当前仓库已有若干“双方同时操作”或“连续稳定”作品，但没有重复
`shadow-duet` 的核心组合：

| 相邻作品 | 核心机制 | 与 Shadow Duet 的边界 |
| --- | --- | --- |
| `four-hands-harmony` | 两个声部在 200ms 内会合并保持 300ms | 单次双键和弦，不是双席四姿势词汇、持有栈和六幕姿势对 |
| `same-pace-star` | 领拍与接拍轮流完成按住/松开四拍 | 严格轮换交接，不是双方在公开闭区间共同选姿势 |
| `together-zipper` | 每颗齿两席各提交一次离散拉动 | 一次性事件时间差，不是持续姿势状态和连续六 tick |
| `steady-together` | 两席持续支撑同一公开物理状态并沿路线前进 | 连续运输/平衡，不是离散姿势组合和短定格窗 |
| `moon-base-power` | 两席配置电源/负载路由并保持 90 个安全 tick | 静态路由谜题与唯一安全向量，不是姿势词汇或窗口表演 |
| `capsule-docking` | 姿态席与推进席控制确定性飞行并满足六项 Gate | 分工物理控制和三航段，不是两席各选四姿势的镜像组合 |

`shadow-duet` 的独立增量仍是：两席各自拥有四姿势去重持有栈，在公开且短暂的
`[48,61]` 窗口内组成指定左右姿势对，连续稳定六 tick，依次留下六幕共同记录。
本轮不扩展玩法。

## 5. 来源与归因复核

### 5.1 远端 HEAD 快照

2026-07-25 使用 `git ls-remote <repo> HEAD` 得到：

| 来源 | 当前 HEAD | 本项目固定 commit |
| --- | --- | --- |
| Bemuse | `4722ff7b6f9607c9e69f8be1086d74d36445a1aa` | `5688164b1904c0cc129b832c91160704b96b3cf3` |
| osu! | `5da71008b082d1a77e4bb301dc98886f1f24b895` | `b11b274d1cb5c22eabe9dba5df14fa1e4ecc4e6d` |
| PixiJS | `1d90a20c62433ba68dff78466e06ee372a5a5232` | 相同 |
| MediaPipe | `0ad5a71bcdff3d756dc5b07f93765aaeb4152538` | 相同 |

Bemuse 与 osu! 的 HEAD 已比
[`231-shadow-duet-source-refresh.md`](./231-shadow-duet-source-refresh.md)
的 2026-07-24 快照前进。该文档明确是历史快照，生产声明继续固定到已审计对象，
不自动跟随上游 HEAD；固定 raw 文件仍可访问，因此无需改实现或归因。

### 5.2 固定证据哈希

重新下载固定 commit 的证据载体后，SHA-256 全部与
`ATTRIBUTION.md` 一致：

| 证据 | SHA-256 |
| --- | --- |
| Bemuse `LICENSE` | `06b332e1fa559c005a0fc8099741d88beb63d2433548c23931d2c396ca41aa72` |
| Bemuse `README.md` | `23dc204d5f06b640dde7fe82ffac648c1c09485b6f4a17250f8a311544bc84ac` |
| Bemuse `bemuse/package.json` | `65a9c6d2af53797cd389ac4ec9838f8409a15e85b658912d63f07c1d0cd7323a` |
| osu! `LICENCE` | `2e73c7c4295cc3da18697ac982f64a4ec449e0781e8f4c59318216e13998864a` |
| osu! `README.md` | `fb95dc87d17380e49a50d26d06e648e5bbb861bbd64da662b19e07a6fce50847` |
| PixiJS `LICENSE` | `5ce7447bc57f7349ffc48338782fbcabe613696e00712b20d66bc58e780f9473` |
| MediaPipe `LICENSE` | `8707eef0533987efc5b155d64761eeb6e20793f50b9bd1a68dad1cf4719d0ed8` |

权利边界保持：

- Bemuse 只研究时间线/判定分层；根 AGPLv3 与历史 package metadata
  `AGPL-1.0` 的冲突不由本项目解释，零复制、零链接；
- osu! 的 MIT 代码边界不覆盖其品牌和另行许可的游戏资源；
- PixiJS 只研究 ticker、场景和交互职责分离，不引入引擎/API；
- MediaPipe 只用于确认摄像头姿态识别的模型与隐私成本，并明确排除；
- 四项来源都不是运行依赖，没有复制源码、算法表达、参数、谱面、模型、
  WASM、品牌、资源、UI 或测试。

### 5.3 docs-only ImageGen 概念

`docs/assets/shadow-duet/` 的 S1–S16 共 16 张 PNG 已逐文件重新计算
SHA-256，全部与 `ATTRIBUTION.md` 一致；`sips` 读取的原生尺寸也逐项一致。
这些图片只用于设计评审，不位于体验目录，也没有被运行时读取。

## 6. 实测命令与结果

### 6.1 定向测试

```sh
node --check experiences/co-op/shadow-duet/logic.js
node --check experiences/co-op/shadow-duet/config.js
node -e "require('./experiences/co-op/shadow-duet/logic.js')"
node -e "require('./experiences/co-op/shadow-duet/config.js')"
node --test experiences/co-op/shadow-duet/logic.test.js
```

结果：28/28 通过。真实 CommonJS require、浏览器 VM、加载自检、全部姿势对
oracle、tick 边界、七阶段、重放、headroom、hostile input、字素回退、配置和
归因断言均通过。

### 6.2 全仓回归

新 worktree 初始没有 `node_modules`，按现有 lockfile 执行 `npm ci`；安装
55 个已声明 package，审计 56 个 package，0 vulnerability。没有修改根
`package.json` 或 `package-lock.json`。

```sh
npm test
```

结果：

```text
tests 2258
pass 2258
fail 0
cancelled 0
skipped 0
todo 0
```

```sh
npm run verify
```

结果：

```text
仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

### 6.3 静态与登记边界

- `logic.js` 的副作用 API 扫描没有发现 DOM、现实时间、timer、随机、网络、
  storage、音频、相机或 Worker；
- 体验目录当前只有 `package.json / config.js / logic.js / logic.test.js /
  ATTRIBUTION.md`；
- catalog、门户、co-op README 和 catalog test 中没有 `shadow-duet` 登记；
- 16 张概念图只在 docs 目录；
- `git diff --check` 通过。

## 7. bug 与 learn

历史四项真实问题均已有唯一记录：

- `bugs/2026-07-21-shadow-duet-commonjs-boundary.md`
- `bugs/2026-07-21-shadow-duet-grapheme-fallback.md`
- `bugs/2026-07-21-shadow-duet-attempt-headroom.md`
- `bugs/2026-07-24-shadow-duet-imagegen-state-contract-drift.md`

本轮没有发现新的可复现产品 bug，也没有形成需要脱离已有文档单独维护的跨项目
学习结论，因此不新增 `bugs/` 或 `learn/` 文件。

## 8. 仍未完成的 Gate

本文件只证明非视觉核心，不证明作品已可玩或已安装。以下内容仍未完成：

- 用户尚未明确接受 205 的视觉提案；
- 没有生产 `index.html`、`style.css` 或 `app.js`；
- 没有生产背景、姿势 atlas、favicon、README 或启动入口；
- 没有键盘/Pointer、RAF、焦点、live region、暂停/恢复的真实浏览器接线；
- 没有五档视口、200%/400%、reduced-motion、forced-colors、图片阻断、
  no-JS 或双触点浏览器验收；
- 没有 `file://` 完整六幕、Chrome/Safari、iOS/Android touch 证据；
- 没有 catalog、门户、分类索引、创意池或 launcher 登记。

只有视觉确认、生产 UI、浏览器 Gate、来源/资产终审和目录登记全部完成后，
`shadow-duet` 才能标记为 installed。本轮严格不越过该边界。
