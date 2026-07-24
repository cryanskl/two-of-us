# “这一朵，我先养开”分步实施计划

- 日期：2026-07-24
- 稳定工作 ID：`garden-resource-duel`
- 调研：[`240-garden-resource-duel-research.md`](./240-garden-resource-duel-research.md)
- Brainstorm：[`241-garden-resource-duel-brainstorm.md`](./241-garden-resource-duel-brainstorm.md)
- 规格：[`242-garden-resource-duel-spec.md`](./242-garden-resource-duel-spec.md)
- 设计：[`243-garden-resource-duel-design.md`](./243-garden-resource-duel-design.md)
- 实施方式：子任务接力实现，主任务逐段审查、验证并独立提交

## 1. 前置结论

本项目属于非平凡功能：新增完整作品目录、纯逻辑、UI、catalog、测试、bug/learn 和
验收文档，跨多个文件。已完成 brainstorm → spec → design，本计划冻结实施与提交
边界。

首版没有视觉确认 Gate，可以直接实现。任何改变牌库、季节、花瓣值、虫害、隐私
或终局规则的行为都必须先回到规格，不允许实现者自行调整。

## 2. 文件所有权

### 2.1 逻辑子任务

唯一写入：

```text
experiences/versus/garden-resource-duel/config.js
experiences/versus/garden-resource-duel/logic.js
experiences/versus/garden-resource-duel/logic.test.js
experiences/versus/garden-resource-duel/ATTRIBUTION.md
```

职责：

- 配置清洗；
- seed PRNG 与季节牌堆；
- 严格动作解析；
- reducer、联合结算、终局；
- public/player view；
- history 重放；
- 162,000 组穷举；
- 固定来源与零复制借鉴声明。

逻辑子任务不创建 HTML/CSS/app，不修改 catalog、README、bugs、learn 或 docs。

### 2.2 UI 子任务

在逻辑提交后唯一写入：

```text
experiences/versus/garden-resource-duel/index.html
experiences/versus/garden-resource-duel/app.js
experiences/versus/garden-resource-duel/styles.css
experiences/versus/garden-resource-duel/README.md
```

职责：

- 七个 phase 的阶段 DOM；
- 本地草稿、确认、遮屏和生命周期；
- 双盆花、季节牌、手牌、历史；
- 键盘、焦点、ARIA；
- 320px、平板、桌面、减少动态、强制颜色；
- A 级双击说明与信任边界。

UI 子任务不得修改逻辑规则、测试统计、catalog 或来源。

### 2.3 集成与验收

主任务写入：

```text
catalog/experiences.json
README.md
docs/README.md
experiences/versus/README.md
docs/40-idea-backlog.md
bugs/...
learn/...
docs/245-garden-resource-duel-verification.md
```

实际 catalog 路径以仓库现状为准；开始写入前先检查 schema，不创造新字段。

## 3. 提交边界

每次 commit 前都执行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

并确认：

- 分支为当前目标分支；
- top-level 为 `/Users/zenith/Desktop/two-of-us`；
- 没有把其他会话或用户改动带入；
- 只暂存本部分文件；
- 对应测试已通过。

建议提交序列：

1. `feat: add garden resource duel logic`
   - config、logic、logic test、attribution；
   - 逻辑测试和 162,000 夹具通过。
2. `feat: add garden resource duel interface`
   - index、app、styles、作品 README；
   - 逻辑测试、静态合同和基础 DOM 测试通过。
3. `feat: catalog garden resource duel`
   - catalog、分类 README、根 README、创意池与 docs 索引；
   - `npm test`、`npm run verify` 与统计一致。
4. `docs: record garden resource duel learnings`
   - 仅真实复现 bug 及解决方案；
   - 有复用价值的热座隐私、有限手牌穷举或阶段 DOM 知识。
5. `docs: verify garden resource duel`
   - Chrome、响应式、键盘、生命周期、来源、A 级边界和最终统计。

若某一步发现真实缺陷：

- 先写最小失败测试；
- 修复生产代码；
- 在 `bugs/` 记录症状、复现、根因、修复和回归证据；
- 缺陷修复与 bug 记录放在同一独立提交；
- 不用后续 verification 提交掩盖前面的失败。

## 4. 第一步：逻辑核心

### 4.1 config

- UMD/经典脚本兼容；
- 原创默认文案；
- `DEFAULT_CONFIG` 深冻结；
- `composeResultNote` 只消费公开终局；
- 不含真实私人信息。

### 4.2 logic

按规格实现：

- 常量与冻结；
- `generateSeasonDeck`；
- `createInitialState`；
- `sanitizeConfig`；
- `resolveRound`；
- `reduceGardenResourceDuel`；
- `getPublicView`；
- `getPlayerView`；
- `replayHistory`。

内部 state 可以保存完整 deck 与 sealed cards，但任何 UI 都只能消费 view API。

### 4.3 logic tests

先完成小测试，再运行全枚举：

1. 常量与 seed；
2. 3×3×2 单轮联合结算；
3. 阶段与手牌；
4. 隐私 view；
5. 终局和重开；
6. history replay；
7. hostile object 与冻结；
8. 90 手牌排列 × 20 deck × 90 对手排列。

穷举统计必须与调研一致：

```text
player 0 win = 59,444
player 1 win = 59,444
draw = 43,112
```

## 5. 第二步：UI

### 5.1 HTML

- 无远程 URL；
- 三个本地经典脚本；
- 一个主要 app root 与公开 live region；
- noscript 说明；
- 无永久隐藏秘密节点；
- 元信息、标题和语言正确。

### 5.2 app

- 所有 render 输入来自 public/player view；
- choosing 草稿只存在局部 UI 状态；
- confirm 后先清草稿再 dispatch；
- blur/hidden/pagehide/Escape 清草稿并 COVER；
- 不写 storage、URL 或 console；
- 不用动画事件、计时器或网络推进规则；
- seed 由 app 开局生成并交给逻辑；
- 终局组合文案异常时安全回退。

### 5.3 styles

- 忠实实现设计令牌；
- 七 phase 的中央结构；
- CSS 双盆花与三类纹理牌；
- 焦点、hover、active 不替代语义状态；
- 320/600/960 三段响应式；
- reduced-motion；
- forced-colors；
- 不引用第三方资产。

### 5.4 作品 README

必须写：

- 玩法；
- 双击启动；
- 可编辑配置；
- 键盘与遮屏；
- 正常热座隐私边界；
- 不承诺开发者工具级保密；
- 来源入口和零复制说明；
- 不需要安装、服务、网络、权限或素材。

## 6. 第三步：catalog 与仓库合同

开始前读取真实 catalog schema 和现有 A 级对抗条目。只添加 schema 已有字段。

同步更新：

- 根 catalog；
- `experiences/versus/README.md`；
- 根 `README.md` 的作品列表、能力描述和数量；
- `docs/README.md`；
- `docs/40-idea-backlog.md` 的 V12 状态；
- 作品总数、A/B/C/D 数量和对抗样板数量。

先用自动验证产出真实统计，再写文案；不能手算后直接声称。

## 7. 第四步：bugs 与 learn

### 7.1 bugs

只记录真实复现的产品/仓库缺陷。每份记录包括：

```text
现象
最小复现
影响
根因
修复
回归测试
适用范围
```

命令拼写错误、临时调试脚本失误或没有进入产品的草案不算项目 bug。

### 7.2 learn

至少评估三项是否值得沉淀：

1. 热座游戏为什么不能在第一位确认后提前扣公开手牌；
2. 如何把重复手牌与公共牌堆压缩成 162,000 个可重复穷举夹具；
3. 为什么阶段 DOM 卸载比 `display:none` 更适合秘密交接。

只有能跨作品复用的内容才写入 `learn/`，不复制规格全文。

## 8. 第五步：验证

### 8.1 命令

至少执行：

```bash
node experiences/versus/garden-resource-duel/logic.test.js
npm test
npm run verify
git diff --check
```

若仓库没有独立 typecheck/build 脚本，如实记录；`npm test` 与 `npm run verify` 是本
项目现有的全仓测试/构建合同，不虚构不存在的命令。

### 8.2 Chrome

按照 `chrome:control-chrome` skill：

- 启动或复用本机服务；
- 在 Chrome MCP 中跑真实点击路径；
- 检查 console、网络、DOM 与可访问树；
- 验证第一位确认、ready-to-reveal 两个秘密阶段；
- 验证单方得分、虫害阻断、双得分、终局和平局夹具；
- 验证键盘与 Escape；
- 验证 blur/hidden 恢复；
- 检查 320×568、768×1024、1440×900；
- 检查 reduced-motion 与 forced-colors 能力范围。

Chrome 自动化若因 URL 策略不允许 `file://` 导航，不规避策略。分别保留：

- 静态 A 级 file 合同；
- README 人工双击说明；
- localhost 同源 Chrome 行为证据；
- 明确限制说明。

### 8.3 verification

`docs/245-garden-resource-duel-verification.md` 记录：

- 每条命令和真实结果；
- 单项目与全仓测试数；
- 162,000 穷举统计；
- catalog 与总数；
- Chrome phase/隐私/响应式/键盘证据；
- A 级 file 合同与自动化限制；
- 来源与借鉴声明；
- bugs/learn；
- fidelity ledger；
- 未解决限制。

## 9. 子任务审查

逻辑与 UI 子任务交付后，主任务必须逐项检查：

- 是否只改了分配文件；
- 是否改变冻结规则；
- 是否从 state 而不是 view 渲染；
- 是否复制现有作品代码但没有说明；
- 是否添加远程 URL、依赖、素材或 storage；
- 是否有测试数字无法由命令复现；
- 是否在 README 夸大热座保密性；
- 是否留下 console、TODO、调试 seed 或不可达分支。

子任务完成不等于可提交；主任务审查、测试与 worktree 核对通过后才提交。

## 10. 停止条件

以下情况暂停生产并回到用户或规格：

- 需要改变冻结规则才能避免必胜或软锁；
- 必须引入第三方素材或运行时；
- catalog schema 无法表达 A 级本地作品；
- 浏览器真实行为与阶段隐私合同冲突且不能在原范围修复；
- 发现用户未提交改动与目标文件重叠；
- 视觉实现需要新的重大产品选择。

普通实现 bug、测试失败或样式偏差不构成停止条件，应在当前范围内修复并记录。
