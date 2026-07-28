# Memory Merge Board implementation plan

- 日期：2026-07-25
- 候选 ID：`memory-merge-board`
- 对外名称：把小事，合成我们的故事
- 分类：`co-op`
- 等级目标：A
- 前置：
  - `docs/322-memory-merge-board-research.md`
  - `docs/323-memory-merge-board-brainstorm.md`
  - `docs/324-memory-merge-board-spec.md`
- 当前决策：**Conditional Go**

## 1. 实施目标

在不复制参考仓库源码、布局或资产的前提下，实现一个：

- 双击 `index.html` 即可运行；
- 无网络、无存储、无权限；
- 同设备双人合作；
- 固定关卡可由状态搜索证明可解；
- 整理者与补页者每回合都作出真实决策；
- 键盘、按钮与触屏完整可用；
- 有完整固定 commit 借鉴声明；
- 通过仓库测试、verify 与 Chromium `file://` Gate

的 A 级项目。

本计划不授权修改共享 catalog、Board、README 或索引。这些共享文件由根代理在候选通过完整 Gate 后统一处理。

## 2. 工作范围

### 2.1 允许新增

项目唯一目录：

```text
experiences/co-op/memory-merge-board/
├── ATTRIBUTION.md
├── README.md
├── app.js
├── config.js
├── index.html
├── levels.js
├── logic.js
├── logic.test.js
├── package.json
├── solver.js
├── solver.test.js
└── styles.css
```

如发现真实、与本候选唯一相关的问题或学习，可新增：

```text
bugs/memory-merge-board-<slug>.md
learn/memory-merge-board-<slug>.md
```

不得创建泛化或占位 bug/learn。

### 2.2 禁止修改

- `experiences/catalog.json`
- `docs/orchestration-board.md`
- 仓库根 README
- 共享索引
- 其他体验目录
- 共享运行时或依赖
- vendor
- 本轮已定稿的 322–325 之外其他规划文档

若实现确实需要共享改动，停止并交回根代理，不在候选分支自行扩权。

## 3. Git 与提交纪律

每个实施部分必须独立提交。

在每一次文件编辑前和每一次 commit 前运行：

```bash
git branch --show-current
git rev-parse --show-toplevel
```

必须确认：

```text
branch: codex/exp-memory-merge-board
worktree: {worktree-base}/memory-merge-board
```

每次提交前还要：

```bash
git status --short
git diff --check
git diff --cached --check
```

规则：

- 只暂存当前部分明确列出的文件；
- 不使用 `git add .`；
- 不使用 `--amend`；
- 不进行 reset、clean、force push 或覆盖他人修改；
- hook 失败时修复后重新 add，再创建新 commit；
- 发现不属于本候选的工作树变化时停止写入并报告；
- 每完成一个项目部分立即 commit，不等项目全部完成。

## 4. 建议提交序列

| 顺序 | 里程碑 | 建议 commit |
|---:|---|---|
| 1 | 边界、归因与空壳 | `feat: scaffold memory merge board` |
| 2 | 纯规则与不变量 | `feat: add memory merge rules` |
| 3 | 求解器与三关 | `feat: add solved memory merge levels` |
| 4 | 状态机与可玩 DOM | `feat: make memory merge board playable` |
| 5 | 视觉、响应式与无障碍 | `feat: polish memory merge experience` |
| 6 | 合同测试与文档 | `test: verify memory merge contracts` |
| 7 | 浏览器验收修复，如有 | `fix: pass memory merge browser gate` |

第 7 个提交只有在浏览器验收发现真实问题并修复时才创建。没有修复就不制造空提交。

## 5. 阶段 0：执行前再确认

### 目标

确保实施时的仓库状态仍符合本计划。

### 操作

1. 完整读取当时生效的 `AGENTS.md`。
2. 重新读取 runbook、Board、catalog 与 322–325。
3. 检查目标目录尚未被另一分支实现。
4. 检查分支、worktree、HEAD 与工作树。
5. 重新打开固定上游 commit 与 LICENSE，确认链接仍可用。
6. 记录固定 LICENSE SHA-256：

```text
57e12c39a6ad9d98b2e451065bfdfbd15fc9e0c2ed3bf4dc1d09acab41ff02fc
```

### 停止条件

- 共享 catalog 已存在同 ID 但机制不同；
- 其他代理已创建同一项目目录；
- 分支或 worktree 不匹配；
- 322–325 被根代理重新决策为 No-Go；
- 固定来源或许可证无法核验；
- 工作树含无法安全区分的他人修改。

阶段 0 不产生 commit。

## 6. 阶段 1：边界、归因与空壳

### 目标

先建立独立运行边界和归因，确保后续代码一开始就处在正确合同里。

### 新增文件

```text
experiences/co-op/memory-merge-board/package.json
experiences/co-op/memory-merge-board/ATTRIBUTION.md
experiences/co-op/memory-merge-board/README.md
experiences/co-op/memory-merge-board/index.html
```

### `package.json`

只包含：

```json
{
  "type": "commonjs"
}
```

目的：

- Node 测试可 `require()` 纯逻辑；
- 浏览器仍通过经典 script 使用相同文件；
- 不增加 npm 依赖；
- 不引入构建步骤。

### `ATTRIBUTION.md`

必须包含：

- 仓库：`gabrielecirulli/2048`
- 固定 commit 完整 URL：
  <https://github.com/gabrielecirulli/2048/tree/478b6ec346e3787f589e4af751378d06ded4cbbc>
- 固定许可证 URL：
  <https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/LICENSE.txt>
- `MIT License`
- `Copyright (c) 2014 Gabriele Cirulli`
- 实际借鉴：
  - 整盘沿正交方向移动；
  - 同主题同阶段相邻线索一次合并；
  - 新合并结果同次不再合并；
  - 无效移动不推进；
  - 无合法移动结束。
- 未复制：
  - 源码；
  - 测试与函数结构；
  - 名称与数字；
  - 随机生成与计分；
  - 4×4 视觉布局；
  - CSS、配色、字体与资产；
  - 本地最高分与继续挑战结构。

### `README.md`

写明：

- 产品一句话；
- `file://` 双击启动；
- 两人角色；
- 隐私与依赖合同；
- 键盘与按钮操作；
- 固定来源简要声明；
- 当前项目内部文件职责。

不写 catalog 状态，不声称已安装。

### `index.html`

第一提交只做语义空壳：

- 中文 `lang`；
- 正确 `<title>`；
- welcome 主标题；
- 隐私承诺；
- `<noscript>`；
- about/归因入口占位；
- 只引用本地 `styles.css`、`config.js`、`levels.js`、`logic.js`、`app.js` 的最终计划路径。

为避免引用尚不存在文件导致 verify 或浏览器错误，可以在同一提交创建最小空文件，或延后 script 引用到相应文件存在的提交。不得留下破损引用。

### 验证

```bash
npm test
npm run verify
git diff --check
```

静态确认：

- 目录没有远程运行时 URL；
- ATTRIBUTION 固定 SHA、MIT、版权人与未复制边界齐全；
- HTML 没有 CDN 或 module fetch。

### 提交

```text
feat: scaffold memory merge board
```

## 7. 阶段 2：纯规则与不变量

### 目标

实现与 DOM、动画、关卡内容无关的原创规则核。

### 新增或修改

```text
config.js
logic.js
logic.test.js
```

### `config.js`

冻结并导出：

- `SEATS`
- `DIRECTIONS`
- `THEMES`
- `TIERS`
- `PHASES`
- `BOARD_ROWS = 3`
- `BOARD_COLUMNS = 4`
- `TARGET_DISTINCT_CHAPTERS = 3`
- 默认文案与分享题

要求：

- CommonJS 与经典浏览器脚本暴露相同冻结数据；
- 不含私人信息默认值；
- 不含数字皮肤、分值、随机种子或上游名称；
- 配置对象递归冻结。

### `logic.js`

按 spec 独立实现：

- `isValidTile`
- `isValidBoard`
- `mergeLine`
- `slideBoard`
- `getIncomingEdgeIndexes`
- `getLegalPlacements`
- `canSlide`
- `hasAnyLegalSlide`
- `createInitialState`
- `reduceGame`
- `createCanonicalKey`
- `assertStateInvariant`

API 名称可以在实现时微调，但职责不可合并到 DOM。

### 关键原则

- 所有公开函数不修改输入；
- 返回状态递归冻结，或至少在测试边界冻结；
- 非法输入安全拒绝或回到明确错误，不产生半状态；
- 同一合并结果在一次动作中不二次合并；
- 章节出板；
- 无效方向不推进候选、角色或回合；
- 分享两个按钮映射到同一规则动作；
- 候选选择和落点分两个 phase；
- role swap 只在补页成功后发生。

### 单元测试

先写失败测试，再实现：

1. 四方向与 4×3 索引。
2. `A0 A0 → A1`。
3. `A0 A0 A0 → A1 A0`。
4. `A0 A0 A0 A0 → A1 A1`。
5. `A0 A0 A1 → A1 A1`，不连锁成 A2。
6. 不同主题/阶段不合并。
7. `A2 A2` 形成章节并从输出移除。
8. 多行合并与多章节稳定次序。
9. 无效滑动严格保持规则状态。
10. 选择候选、补候选、合法/非法落点。
11. 完整回合后角色交换。
12. 重复章节不增加 distinct 进度。
13. 胜利、blocked、supply-exhausted。
14. hostile/畸形输入不破坏状态。
15. 输入数组和对象未被修改。
16. CommonJS 与浏览器全局 API 同构。

### 验证

```bash
node --test experiences/co-op/memory-merge-board/logic.test.js
npm test
npm run verify
git diff --check
```

### 提交

```text
feat: add memory merge rules
```

## 8. 阶段 3：求解器与三关

### 目标

先证明内容可解，再把关卡接给 UI。

### 新增或修改

```text
levels.js
solver.js
solver.test.js
README.md
```

### `solver.js`

Node 测试使用，不由浏览器入口加载。

实现：

- 状态规范键；
- 合法动作枚举；
- 有界 BFS 或带记忆的确定性搜索；
- 路径重放；
- 分支统计；
- 搜索上限与明确失败原因。

求解动作包含：

- `slide(direction)`
- `continueShare`
- `choose(candidateIndex)`
- `place(boardIndex)`

分享不区分两个按钮，因为规则后继相同。

### 防止状态爆炸

- 使用规范状态键去重；
- 去掉 announcement、动画和焦点；
- archived themes 只保留规范化的 distinct 集合供求解；
- 设每关最大访问状态数；
- 超限测试失败，不静默接受；
- 不使用随机探索作为可解性证明。

### `levels.js`

以求解器反复验证后定稿：

- `first-page`
- `crossed-notes`
- `album-night`

每关包含：

- 12 格初始棋盘；
- 两张初始候选；
- 固定 supply；
- 左侧初始整理者；
- 三个不同主题目标；
- 求解器生成并人工选择的黄金路径；
- 首步提示；
- 预计难度与说明。

### 内容 Gate

每关必须：

- 至少一解；
- 黄金路径可完整重放；
- 成功前至少三次角色交换；
- 不依赖重复章节；
- 不出现补页无合法落点；
- 正式关至少两次候选产生不同规范后继；
- 正式关至少两次存在多个合法落点；
- 状态搜索在约定上限内完成；
- 相同输入重复运行得到同一结果。

如无法为 4×3、三主题目标找到范围合理的固定关卡：

1. 先调整初始棋盘和 supply；
2. 再减少关卡复杂度；
3. 不改变双角色、非随机或章节出板合同；
4. 仍无法满足时判定 No-Go。

### 测试

- 三关 schema；
- 三关可解；
- 黄金路径重放；
- 分支数量；
- 搜索确定性；
- 配置递归冻结；
- 浏览器全局与 Node 数据同构；
- 无用户可见数字分值。

### 验证

```bash
node --test \
  experiences/co-op/memory-merge-board/logic.test.js \
  experiences/co-op/memory-merge-board/solver.test.js
npm test
npm run verify
git diff --check
```

### 提交

```text
feat: add solved memory merge levels
```

## 9. 阶段 4：状态机与可玩 DOM

### 目标

在不做最终装饰的情况下，完整走通一关。

### 修改

```text
index.html
app.js
styles.css
README.md
```

### `index.html`

建立语义结构：

- welcome；
- level select；
- play；
- result；
- about；
- 单一 live region；
- `<template>` 或稳定容器；
- 原生 button 控件；
- 完整的本地 classic script 顺序。

### `app.js`

职责：

- 初始化 reducer state；
- 只通过 dispatch 修改规则状态；
- 渲染顶层视图；
- 渲染相册、角色、棋盘、候选与 phase 控制；
- 绑定方向按钮、候选、落点、分享、重开与导航；
- 处理方向键；
- 处理单指 pointer gesture；
- 调度但不拥有动画；
- 管理焦点与 live announcement；
- 页面隐藏/失焦时清理手势和呈现锁。

禁止：

- 在事件处理器里直接改棋盘数组；
- 根据 DOM 反推规则状态；
- 使用 `innerHTML` 拼接用户输入；
- 使用 timer 决定规则；
- 读写网络、存储或权限 API。

### 可玩 Gate

在普通无装饰样式下：

1. 打开首页。
2. 选首关。
3. 用按钮完成黄金路径。
4. 分享“继续”和“留白”均可前进。
5. 完成三个不同主题。
6. 结果页可重开和换关。
7. 失败路径可重开。

### 自动测试补充

若仓库当前没有 DOM 测试工具，不新增沉重框架。采用：

- 纯 reducer 测试覆盖规则；
- 静态 HTML 结构测试；
- Chromium MCP 做真实 DOM 验收；
- 必要时只新增仓库已经使用的轻量测试方式。

### 验证

```bash
npm test
npm run verify
git diff --check
```

然后用 Chrome MCP 直接打开 worktree 的 `file://.../index.html`，至少走完首关按钮路径。

### 提交

```text
feat: make memory merge board playable
```

## 10. 阶段 5：视觉、响应式与无障碍

### 目标

把可玩原型完成为原创“共同剪贴簿”体验，并通过输入与重排合同。

### 主要修改

```text
styles.css
index.html
app.js
```

### 视觉

- 原创纸页/书签/缝线语言；
- 4×3 开放书架，不模仿 2048 的方形数字盘；
- 主题使用符号、文字、纹理与颜色；
- 阶段使用文字和图形完整度，不显示数字；
- 不采用上游奶油/棕色主色与数值色阶；
- 不显示 Score、Best、连击或排名；
- SVG 全部原创并在装饰场景 `aria-hidden`。

### 响应式

检查：

- 320×800；
- 常见手机宽度；
- 600–959px；
- 1440×900；
- 400% 缩放；
- 页面整体无水平滚动；
- 控件不被固定高度裁剪。

### 键盘

- 四方向按钮；
- `Arrow*` 全局捷径只在 slide phase 生效；
- 不劫持按钮、输入或可编辑区域；
- 忽略 repeat；
- 所有流程可只用 Tab、Enter、Space 与方向键完成。

### 指针

- 单一 pointer；
- 28px 初始阈值；
- 对角取主轴；
- `pointercancel` 清理；
- 页面隐藏/失焦清理；
- 一次手势最多一个动作；
- 不全局设置 `touch-action: none`；
- 滑动始终有按钮替代。

### 焦点与公告

- 每个 phase 的焦点落点符合 spec；
- `:focus-visible` 清晰；
- 单一 polite live region；
- 状态公告不抢焦点；
- 分享和结果标题可被聚焦；
- 动画锁不造成键盘死路。

### reduced motion

- 规则状态先提交；
- reduced-motion 下不做位移动画；
- 页面隐藏时跳到最终呈现；
- 动画超时兜底；
- 不闪烁或抖屏。

### Chrome Gate

使用 Chrome MCP：

1. 1440×900 按钮黄金路径。
2. 1440×900 仅键盘黄金路径。
3. 320×800 滑动 + 单击混合路径。
4. 400% 缩放检查。
5. reduced-motion 检查。
6. Console error 为 0。
7. 外部网络请求为 0。
8. 切后台再回来，无永久锁。
9. 快速重复输入不重复提交。

### 验证

```bash
npm test
npm run verify
git diff --check
```

### 提交

```text
feat: polish memory merge experience
```

## 11. 阶段 6：合同测试与文档

### 目标

把“能玩”升级为可持续验收的 A 级项目。

### 修改

```text
logic.test.js
solver.test.js
README.md
ATTRIBUTION.md
```

如静态合同无法放入既有测试，可在项目目录新增：

```text
contract.test.js
```

### 静态合同

测试或审查：

- 所有 HTML/CSS/JS 引用文件存在；
- 运行时不含 CDN；
- 无网络 API；
- 无存储 API；
- 无权限 API；
- 无 `2048`、Score、Best 等用户界面文案；
- 固定 commit 在 README 和 ATTRIBUTION；
- MIT、版权人、实际借鉴、未复制边界齐全；
- 项目不依赖 catalog 才能直接打开；
- 项目没有额外 npm 运行时依赖。

归因文件中允许出现来源 URL 和 `2048` 名称；静态扫描必须区分文档归因与运行时引用，不能把合法声明误报为依赖。

### README 最终内容

- 一句话玩法；
- 双击启动；
- 双人回合；
- 操作方式；
- 关卡和确定性；
- 隐私；
- 依赖；
- 测试命令；
- 固定借鉴；
- 未复制边界；
- 已知限制：不保存局面、无自定义内容、仅同设备。

### 最终自动化

```bash
node --test experiences/co-op/memory-merge-board/*.test.js
npm test
npm run verify
git diff --check
```

### 提交

```text
test: verify memory merge contracts
```

## 12. 阶段 7：浏览器最终 Gate

### 目标

在真实 `file://` 页面完成发布前验收。

### 必测路径

#### 路径 A：首关按钮

- welcome → 选关；
- 用四方向按钮；
- 每次选择候选与边缘落点；
- 分别使用一次“继续”和“留白”；
- 完成首关；
- 重开得到相同初始状态。

#### 路径 B：仅键盘

- 不使用鼠标；
- 完成首关；
- 焦点顺序与 phase 一致；
- live 状态可理解。

#### 路径 C：触屏窄屏

- 320×800；
- 使用棋盘滑动；
- 使用单击按钮替代一次滑动；
- 无水平滚动；
- 目标至少 44×44；
- 页面缩放没有被全局禁用。

#### 路径 D：错误与生命周期

- 尝试无效方向；
- 尝试非法落点；
- 快速重复输入；
- 动画期间切标签；
- 返回后继续；
- 走一条 blocked 或 supply-exhausted 路径；
- 重开恢复。

#### 路径 E：隐私与网络

- Console error 为 0；
- 外部网络请求为 0；
- 无权限弹窗；
- Application 面板无本项目存储；
- 刷新不恢复局面。

### 修复纪律

若发现真实问题：

1. 在 `bugs/memory-merge-board-<slug>.md` 记录：
   - 环境；
   - 重现步骤；
   - 预期；
   - 实际；
   - 根因；
   - 修复；
   - 回归测试。
2. 修复生产代码。
3. 增加回归测试。
4. 重跑定向、全量、verify 和浏览器路径。
5. 独立提交：

```text
fix: pass memory merge browser gate
```

若只是临时环境或共享仓库问题，不写入本候选 bug 文件；报告根代理处理。

## 13. learn 沉淀规则

只有出现可复用、超出本候选显然规则的学习时，新增：

```text
learn/memory-merge-board-<slug>.md
```

可记录：

- 4×3 合并棋盘的状态规范化方法；
- 双角色动作如何减少求解器分支；
- `file://` 下经典脚本与 Node 测试共享纯逻辑；
- 动画与原子规则状态分离；
- 滑动的按钮等价路径与焦点流；
- 不记录回答的亲密分享设计。

不要记录：

- 普通命令输出；
- 已在 spec 中明确的常识；
- 未验证猜想；
- 其他项目的共享问题；
- 私人内容。

learn 与对应实现或测试在同一独立 commit 中提交，或作为明确的后续独立文档 commit；不能积攒到项目末尾。

## 14. 实施中的 Conditional Go 审计

每个阶段都重新回答：

### 双人强度

- 整理者的方向选择是否改变空间？
- 补页者的候选与落点是否改变未来？
- 是否每个有效回合都交换职责？
- 是否存在一人长期只是按“继续”？

### 独立性

- 是否出现数字、分数、随机出生？
- 是否趋近双盘竞速？
- 是否变成纯卡片问答？
- 是否使用参考项目视觉或代码结构？

### 本地 A 级

- 是否仍能双击 HTML？
- 是否新增网络、构建或权限？
- 是否出现存储写入？
- 是否有不存在的资源引用？

### 可验证性

- 新关卡是否经求解器验证？
- 每个 bug 是否有回归测试？
- 浏览器路径是否仍通过？
- README 与 ATTRIBUTION 是否与代码一致？

任何阶段破坏硬条件，应停止并判定 No-Go 或回到 spec，不用视觉补丁掩盖。

## 15. 最终完成清单

### 代码

- [ ] 规则纯函数独立原创
- [ ] 4×3 棋盘
- [ ] 四主题四阶段
- [ ] 一次合并不连锁
- [ ] 章节出板
- [ ] 整理/补页双角色
- [ ] 有效完整回合换位
- [ ] 固定公开候选
- [ ] 三个不同主题胜利
- [ ] 友好失败与重开

### 内容

- [ ] 三关固定数据
- [ ] 每关至少一解
- [ ] 黄金路径可重放
- [ ] 正式关候选与落点有实质分叉
- [ ] 四个原创分享题
- [ ] 留白无惩罚

### 本地与隐私

- [ ] `file://` 完整可玩
- [ ] 零运行时第三方依赖
- [ ] 零外部网络
- [ ] 零浏览器存储
- [ ] 零权限
- [ ] 无私人输入或记录

### 无障碍

- [ ] 方向按钮替代滑动
- [ ] 仅键盘可完成
- [ ] 触控目标至少 44px
- [ ] 320px 无水平滚动
- [ ] 400% 缩放可操作
- [ ] reduced-motion
- [ ] 可见焦点
- [ ] 单一礼貌状态公告
- [ ] 主题不只靠颜色

### 来源

- [ ] 固定 commit 完整 URL
- [ ] MIT License
- [ ] Copyright (c) 2014 Gabriele Cirulli
- [ ] 实际借鉴列表
- [ ] 未复制边界
- [ ] README 与 ATTRIBUTION 一致

### 验证

- [ ] 项目定向测试
- [ ] `npm test`
- [ ] `npm run verify`
- [ ] `git diff --check`
- [ ] Chromium 桌面按钮路径
- [ ] Chromium 仅键盘路径
- [ ] Chromium 320px 触屏路径
- [ ] Console error 0
- [ ] 外部网络请求 0
- [ ] 页面生命周期测试

### Git

- [ ] 每部分独立 commit
- [ ] commit 前 branch/worktree 复核
- [ ] 无 amend
- [ ] 无共享 catalog/Board 修改
- [ ] 工作树最终干净

## 16. 根代理合并 Gate

候选分支交付根代理时提供：

- commit 列表；
- 最终 HEAD；
- `npm test` 结果；
- `npm run verify` 结果；
- 定向测试结果；
- 浏览器 Gate 结果；
- 来源与许可证证据；
- `git diff --check`；
- 与基线的文件清单；
- bug/learn 文件清单，没有则明确为无；
- 最终 Go / Conditional Go / No-Go。

只有最终为 Go，根代理才可在自己的串行合并阶段：

- 更新 `experiences/catalog.json`；
- 更新 Board；
- 更新共享索引或 README；
- 做全仓回归；
- 提交共享文件。

候选实现提交不得捎带这些共享修改。

## 17. 预计风险与回退

| 风险 | 最早发现阶段 | 回退 |
|---|---|---|
| 4×3 三主题目标状态空间过大 | 阶段 3 | 调整固定棋盘与 supply；不改核心机制 |
| 补页者选择不实质 | 阶段 3 | 提高候选/落点分叉；仍不足则 No-Go |
| 一次多章节造成状态机竞态 | 阶段 2/4 | 规则先排稳定 shareQueue，逐个展示 |
| 动画重复提交 | 阶段 4/5 | reducer 原子提交，呈现层单独加锁与兜底 |
| 窄屏格子难读 | 阶段 5 | 缩短标签、增强符号，保持 4×3 |
| 滑动影响页面滚动 | 阶段 5 | 局部手势区、按钮替代，不全局禁缩放 |
| 被感知为 2048 换皮 | 双人试玩 | 强化双角色与相册，不用数字/分数；仍失败则 No-Go |
| 分享引起压力 | 试玩 | 留白同后果、减少频率、调整中性文案 |

不允许的回退：

- 改成随机生成；
- 删除补页者决策；
- 改成双盘竞速；
- 增加在线服务；
- 用数字或分数提高反馈；
- 复制上游 CSS/代码节省时间。

## 18. 计划结论

建议按七个小提交实施，前三个提交先解决法律边界、纯规则和可解性，之后才投入 UI。

当前状态仍是 **Conditional Go**。解除条件是：

1. 三关由确定性搜索证明可解；
2. 正式关证明补页者有实质分叉；
3. 双人试玩能清楚感知互补职责；
4. `file://`、零网络、零存储、零权限通过；
5. 键盘、触屏、320px、400% 与 reduced-motion 通过；
6. 固定开源归因完整；
7. 全仓测试与 verify 通过。

任一核心条件不能成立，就收缩或 No-Go，不进入 catalog。
