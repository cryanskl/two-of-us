# “这一串，我还记得”分步实施计划

> 对应调研、规格与设计：[`126-memory-bid-research.md`](./126-memory-bid-research.md)、[`127-memory-bid-spec.md`](./127-memory-bid-spec.md)、[`128-memory-bid-design.md`](./128-memory-bid-design.md)。本计划按“每完成一个项目或一部分就检查并独立提交”执行。

## 1. 交付目标

在 `experiences/versus/memory-bid/` 新增一个 A 级同机双人对抗作品：共同观看八件旅行纪念物，公开升价自己能按序记住的前缀长度，最高报价者承担证明；固定四轮且双方各先开价两次，总分高者获胜，2–2 平局。

默认离线、零第三方运行依赖、零网络、零存储、零音频，完成安装后可直接双击 HTML。生产背景和六件透明图集已经冻结；本批不新增 npm 依赖、服务端、局域网、电脑玩家、提示器、倒计时、货币、排行榜、保存或分享。

## 2. 公共接口冻结

`config.js` 同时导出 CommonJS 与 `window.MemoryBidConfig`：

```js
{ DEFAULT_CONFIG, composeMatchNote }
```

`logic.js` 同时导出 CommonJS 与 `window.MemoryBidLogic`：

```js
{
  VERSION, ROUND_COUNT, SEQUENCE_LENGTH, MIN_BID, MAX_BID,
  ITEM_IDS, PHASES, PLAYBACK_MODES, ACTION_TYPES,
  generateSequences, createInitialState, sanitizeConfig,
  reduceMemoryBid, assertState, getMemoryBidView,
  summarizeMatch, deepFreeze
}
```

- `reduceMemoryBid(state, action, safeConfig)` 是唯一业务推进入口；
- `getMemoryBidView(state, safeConfig)` 是 UI 唯一投影入口，前端不得直接读取 `state.sequences`；
- `sanitizeConfig(candidate, composeStrategy)` 第二参数可选；接收 `composeMatchNote` 后只在 match-result 组合纯文本结语，异常与越界回退；
- `generateSequences(seed)` 是确定性规则函数，Web Crypto 只在 app 开始时提供 seed；
- 全部命名、字段、动作和行为以规格为准；实现发现接口不足时先修订规格/计划并独立提交，子任务不得私自扩张全局 API。

## 3. 阶段与独立提交

### P0 调研、许可证与公平性（已完成）

- `2197b05 docs: research memory bid`：调研 MIT 候选、平台规范、商业边界和零复制策略；
- `122f60c docs: correct memory bid fairness`：独立审计后改为固定四轮、双方各两次先手，并增加证明认输。

### P1 可执行规格（已完成）

- 文件：`docs/127-memory-bid-spec.md`；
- 冻结六件纪念物、四轮序列、2–8 升价、自动/手动展示、generation、权威 state/public view、精确 action、响应式与测试 Gate；
- 提交：`c520037 docs: specify memory bid`。

### P2 ImageGen 概念与生产资产（已完成）

- 文件：三张状态概念、背景源图、图集源图、JPEG 背景、透明图集与 `docs/128-memory-bid-design.md`；
- 明确拒绝概念时间戳、装饰英文、超高移动比例和规则外信息；
- 提交：`2201058 design: freeze memory bid`。

### P3 分步计划（本提交）

- 文件：本计划；
- 冻结公共接口、文件所有权、依赖顺序、金牌路径、提交边界和完成 Gate；
- 检查：`npm test`、`npm run verify`、`git diff --check`；
- 提交：`docs: plan memory bid`。

### P4 纯逻辑、配置与测试（逻辑子任务）

唯一可写：

```text
experiences/versus/memory-bid/config.js
experiences/versus/memory-bid/logic.js
experiences/versus/memory-bid/logic.test.js
```

实现内容：

- UMD、递归冻结、配置逐字段清洗、Unicode code point 限长、异常策略回退；
- 32 位 xorshift + 拒绝采样 + Fisher–Yates + 确定性相邻修复；
- intro/reveal/bidding/proof/round-result/match-result 六阶段与精确 action schema；
- auto/manual、pause/resume、generation 迟到回调失效；
- 严格升价、PASS 前置、8 自动 proof、证明首错、主动认输、四轮对称先手和 2–2 平局；
- `assertState` 重算序列、报价、结果与分数，拒绝多余字段、畸形对象和伪造终局；
- public view 在 reveal 只暴露一件，在 bidding/proof 不暴露答案，round-result 只暴露已结算轮；
- deterministic replay、JSON 往返、输入不变、冻结/断引用、配置策略与异常反例；
- 准备者可选 5–10 行 TODO 只位于 `composeMatchNote(summary)`，默认不修改即可完整运行。

子任务不得暂存或提交。根任务复核后执行：

```sh
node --check experiences/versus/memory-bid/config.js
node --check experiences/versus/memory-bid/logic.js
node --test experiences/versus/memory-bid/logic.test.js
npm test
```

预期提交：`feat: add memory bid logic`。

### P5 前端、作品说明与借鉴声明（前端子任务）

唯一可写：

```text
experiences/versus/memory-bid/index.html
experiences/versus/memory-bid/styles.css
experiences/versus/memory-bid/app.js
experiences/versus/memory-bid/README.md
experiences/versus/memory-bid/ATTRIBUTION.md
experiences/versus/memory-bid/assets/favicon.svg
```

已有的 `auction-table.jpg` 和 `keepsake-atlas.png` 只读，不得替换、重压缩或改名。

实现内容：

- 经典脚本顺序、语义 DOM、无 JS 说明、稳定 live region 与阶段焦点；
- UI 只消费 public view，未公开序列不进入 DOM、dataset、注释、日志或预加载文本；
- 自动展示 UI timer、暂停/继续、hidden/blur 清 timer 且不自动恢复；手动逐件等价路径；
- 竞价合法金额、当前席位、PASS、证明槽、1–6、Backspace、Escape、提交、认输、四轮复盘和重开；
- 生产背景与 3×2 图集、编号与名称、禁图回退、44px 控件、focus ring、live text；
- 1586×992 桌面构图、390×844 证明态、320×700 可滚动、reduced motion、forced colors；
- README 说明双击、两种模式、规则、个性化 TODO、隐私和依赖；
- ATTRIBUTION 固定四个研究仓库的 commit/MIT/权利主体、Hasbro 商业边界、平台规范、ImageGen 输入与处理链、零代码/零素材复制。

子任务不得暂存或提交。根任务整合、浏览器初检和静态 Gate 后执行定向检查并提交：`feat: build memory bid`。

### P6 目录、门户与创意池

更新：

```text
experiences/catalog.json
index.html 内置 fallback
experiences/versus/README.md
docs/40-idea-backlog.md
docs/README.md（若存在显式索引项）
README.md（若存在显式索引项）
shared/runtime/catalog.test.js
```

目录精确字段：

```text
id: memory-bid
title: 这一串，我还记得
category: versus
level: A
entry: experiences/versus/memory-bid/index.html
dependencies: []
network: none
```

目录测试覆盖 A 级经典脚本、零网络/存储、两种播放、四轮公平、来源标题、ImageGen 资产、viewport、public view 边界和直接入口存在。检查定向目录测试、`npm test`、`npm run verify` 与门户进入。

预期提交：`feat: register memory bid`。

### P7 Bug 记录

- 只记录真实复现并修复的问题，至少包含环境、步骤、预期/实际、根因、修复、回归和关联提交；
- 已知一条待归档：系统 Python 缺少 Pillow 导致去背脚本失败；工作区共享 Python 成功解决且输出 alpha 已验证；
- 浏览器、逻辑整合或响应式发现的新问题分别追加；
- 更新 `bugs/README.md`；
- 预期提交：`docs: record memory bid fixes`。

### P8 Learn 沉淀

候选主题：

- 奇数胜点制为何会给升价博弈带来额外先手差异，何时改用偶数轮总分；
- 有 generation 的显式播放动作如何让页面隐藏、暂停与迟到 timer 可重放；
- 图集 chroma-key 的源图、透明统计、坐标和哈希如何构成可审计生产链。

只形成跨作品可复用结论，不复述项目 README；更新 `learn/README.md` 并独立提交。预期提交按实际主题命名。

### P9 浏览器、视觉与最终验收

- 先完整读取 Browser/IAB 技能，优先使用 Browser/IAB；若 `file://` 受工具策略限制，以同文件集本地 HTTP 实玩 + 静态 A Gate 组合证明并如实记录；
- 金牌路径：manual → round0 看八件 → 你报 2 / TA 报 4 / 你 PASS → TA 正确证明 → round1 TA 报 8 自动 proof → 错误证明 → round2 逐级升价后认输 → round3 正确证明 → 2–2 或 3–1 终局 → restart；
- 另走 auto：show/hide、手动 pause/resume、blur/hidden、旧 generation 与最后一件；
- 隐私：reveal 遮挡、bidding、proof 扫描 DOM 全文与属性，不含当前/未来答案；round-result 才出现本轮序列；
- 输入：Pointer、1–6、Backspace、Escape、Tab/Enter/Space，阶段切换后焦点不丢失；
- 响应式：1586×992、1280×800、768×1024、390×844、320×700；检查横向溢出、主动作、五槽、2×3 物件和四轮记录；
- 降级：阻断背景、阻断图集、reduced motion、forced colors；
- 保存临时 QA 截图，在同一轮对概念与实际截图执行 `view_image`，完成至少五项 fidelity ledger 和 above-fold copy diff；之后删除临时 QA 文件；
- 新建 `docs/130-memory-bid-verification.md`，同步设计 Gate 与必要索引；
- 最终执行定向测试、目录测试、`npm test`、`npm run verify`、`git diff --check`，确认 worktree 干净；
- 预期提交：`docs: verify memory bid`。

## 4. 依赖图与并行边界

```text
P0 research/fairness → P1 spec → P2 design → P3 plan
                                              ├─→ P4 logic/config/tests
                                              └─→ P5 frontend/docs
P4 + P5 → P6 catalog → P7 bugs → P8 learn → P9 verification
```

P4 和 P5 可并行，因为 action、view、文案、资产和全局名已冻结；它们只能写各自文件集合。根任务负责接口整合、浏览器修复、目录、全部检查和逐块提交。子任务不执行 Git 写操作，避免共享 worktree 的索引竞争。

## 5. 预提交纪律

每次提交前执行：

```sh
git branch --show-current
git rev-parse --show-toplevel
```

确认当前分支为 `main` 且仓库根为 `/Users/zenith/Desktop/two-of-us`，再 add/commit。hook 失败时修复、重新 add、新建 commit；不得 amend。破坏性 Git、数据库或文件操作仍需用户在当前消息显式授权。

## 6. 完成判据

1. 四轮序列可重放，每轮六种齐全、两种不同重复、无相邻重复；
2. 自动/手动展示、暂停、页面隐藏与旧 timer 不漏物件、不跳物件；
3. 升价、PASS、8 自动证明、首错、认输、得分、双方两次先手与 2–2 平局只由合法 action 派生；
4. reveal 只公开一件，bidding/proof 的 view 与 DOM 不含答案，round-result 才公开本轮；
5. A 级目录可独立复制，零运行依赖、零网络、零存储、零音频，图片失败仍完整；
6. 实现与三张概念、两个生产资产和文案锁同轮对照，达到 agency sign-off；
7. 四个研究项目、平台规范、商业边界、ImageGen 和零复制声明完整；
8. tests/build/verify/browser/bugs/learn/索引/提交链闭环，worktree 干净。
