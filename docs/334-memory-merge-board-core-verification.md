# Memory Merge Board 非视觉核心验收

- 日期：2026-07-25
- 项目 ID：`memory-merge-board`
- 对外名称：把小事，合成我们的故事
- 分类：`co-op`
- 等级目标：A
- worktree：`/Users/zenith/Desktop/two-of-us-worktrees/memory-merge-board-core`
- 分支：`codex/exp-memory-merge-board-core`
- 基线：`40fd69a6bdaf8e311a2b4468433aeb9d0a8712ca`
- 核心结论：**Core Go**
- 完整项目结论：**Conditional Go**

## 1. 结论

非视觉核心已满足进入视觉提案阶段的条件：

- 4×3 非数字棋盘规则由原创纯函数实现；
- 同主题同阶段一次合并，新结果同次不连锁；
- 章节形成后离开棋盘；
- 整理者滑动、补页者选候选与边缘落点；
- 只有成功补页才交换角色并增加完整回合；
- 分享继续与留白使用同一规则动作，不记录选择；
- 三个不同主题章节共同胜利；
- 三个固定关卡均由有界确定性搜索求解；
- 黄金路径经真实 reducer 逐动作重放；
- 正式关候选与落点分支达到规格 Gate；
- 核心不使用 DOM、随机、时钟、网络、存储或权限 API；
- 固定来源、许可证、版权人、实际借鉴和未复制边界完整。

完整项目仍是 Conditional Go，因为本轮按授权没有创建 UI，也没有做 `file://`、
键盘、Pointer、响应式、可访问性、控制台或双人试玩验收。

## 2. 授权范围审计

### 新增核心文件

```text
experiences/co-op/memory-merge-board/
├── ATTRIBUTION.md
├── README.md
├── config.js
├── levels.js
├── logic.js
├── logic.test.js
├── package.json
├── solver.js
└── solver.test.js
```

### 新增项目记录

```text
bugs/memory-merge-board-blocked-fixture.md
bugs/memory-merge-board-catalog-test-path.md
learn/memory-merge-board-deterministic-branch-proof.md
docs/334-memory-merge-board-core-verification.md
```

### 明确未创建

- `index.html`
- `styles.css`
- `style.css`
- `app.js`
- favicon
- 图片、字体、音频或浏览器资产

### 明确未修改

- `experiences/catalog.json`
- `docs/orchestration-board.md`
- 根 README
- 根 `package.json`
- 锁文件
- 共享 runtime
- 共享索引
- 其他体验目录

项目仍未进入 catalog，不计 installed。

## 3. 提交纪律

实现阶段每个独立部分均单独提交：

| Commit | 内容 |
|---|---|
| `5653a49` | scaffold、CommonJS 边界、冻结配置、README 与 ATTRIBUTION |
| `4c2a577` | 规则与 reducer 红灯测试 |
| `a5fca5a` | 修复 blocked 测试夹具并记录真实 bug |
| `06aae0a` | 原创纯规则与 reducer |
| `7bbdfa7` | solver、关卡、静态边界红灯测试及 catalog 路径 bug 记录 |
| `6b0d3b0` | 有界确定性 solver、三关、黄金路径与 README 证据 |
| `5ddc227` | 确定性分支证明的可复用 learn |

每次文件编辑和 commit 前均核验：

```text
codex/exp-memory-merge-board-core
/Users/zenith/Desktop/two-of-us-worktrees/memory-merge-board-core
```

没有使用 amend、reset、clean、force push 或共享文件捎带提交。

## 4. 依赖与安装

执行：

```bash
npm ci
```

结果：

- 安装 55 个仓库既有包；
- audit 56 个包；
- vulnerabilities：0；
- 根 lockfile 未修改。

项目级：

- 运行时第三方依赖：0；
- 新增开发依赖：0；
- 构建步骤：0；
- 服务依赖：0。

项目 `package.json` 只包含：

```json
{
  "type": "commonjs"
}
```

## 5. 配置边界

`config.js` 通过 CommonJS 与浏览器经典脚本暴露同一递归冻结 API：

- 3 行；
- 4 列；
- 12 格；
- 左右两席；
- 四个正交方向；
- 地点、味道、声音、照顾四主题；
- 碎片、片段、故事、章节四阶段；
- `slide/share/choose/place/won/lost` 六 phase；
- 三个不同主题章节目标；
- 四条原创、中性分享提示；
- 不录音、不保存、不上传的隐私文案。

配置不含：

- 数字皮肤；
- 分值；
- 最高分；
- 随机种子；
- 私人信息默认值；
- 上游名称或视觉数据。

## 6. 纯规则验收

`logic.js` 的公开职责：

- `createTile`
- `isValidTile`
- `isValidBoard`
- `mergeLine`
- `slideBoard`
- `getIncomingEdgeIndexes`
- `getLegalPlacements`
- `canSlide`
- `hasAnyLegalSlide`
- `createInitialState`
- `isState`
- `reduce`
- `createCanonicalKey`
- `getPublicView`

### 合并

规则测试覆盖：

- 两项合并；
- 三项不连锁；
- 四项分成两对；
- 新生成阶段不与原有同阶段再次合并；
- 不同主题不合并；
- 不同阶段不合并；
- 隔开的同主题不越过合并；
- 故事合成章节后出板；
- 一次整盘形成多个章节时顺序稳定；
- 输入数组和棋盘不被修改。

### 方向与补页

- 棋盘固定 3×4 行主序；
- 四方向压缩结果精确；
- `left` 的来向为最右列；
- `right` 的来向为最左列；
- `up` 的来向为最下行；
- `down` 的来向为最上行；
- 只能把待补碎片放到对应来向边缘的空格；
- 无效方向保持原状态引用；
- 无效方向不消耗候选、不换角色、不增加回合。

### 状态机

实际 reducer 路径：

```text
slide
→ share（若形成章节）
→ choose
→ place
→ slide
```

终态：

- 三个不同主题且分享完成后进入 `won`；
- 补页后没有合法方向进入 `lost / blocked`；
- 下一次需要选择但候选与 supply 均空时进入
  `lost / supply-exhausted`。

重复章节会出板并可分享，但不增加不同主题进度。`won/lost` 拒绝游戏动作，
`RESTART` 恢复完全相同的固定初始状态。

### 防御边界

- state 与 action 使用 own data descriptor 快照；
- accessor、Proxy、稀疏数组、额外字段和非法 prototype 安全拒绝；
- 畸形 state 经公开 reduce 回到固定初态；
- 规则状态递归冻结；
- 公共 view 与输入状态断开引用。

## 7. Canonical state

求解器 key 包含：

- level ID；
- 12 格棋盘；
- 当前整理者；
- phase；
- 候选顺序；
- supply cursor；
- 待放线索；
- 来向方向；
- 分享队列；
- 规范化的不同归档主题。

不包含：

- DOM；
- 动画；
- 焦点；
- 公告；
- 回合显示值；
- 重复归档排列噪声。

同一规则局面因此只搜索一次，呈现变化不会扩大状态空间。

## 8. 求解器

`solver.js` 是 Node 专用核心工具，不由未来浏览器页面加载。

它提供：

- 当前 phase 的全部合法 action 枚举；
- 真实 reducer replay；
- 有界、确定性的最佳优先搜索；
- canonical 去重；
- 状态上限、深度上限和结构化结果；
- 黄金路径中的角色与分支分析。

优先级只改变搜索顺序。所有后继仍必须由生产 reducer 生成，不会跳步、自动合并
或绕过补页。

结果类型：

- `solved`
- `unsolved`
- `state-limit`
- `invalid-level`

达到预算会明确返回 `state-limit`，不会误报无解。

## 9. 三关证明

严格测试参数：

```text
maxVisitedStates = 10000
maxDepth = 64
```

默认诊断上限：

```text
maxVisitedStates = 120000
maxDepth = 96
```

实测：

| 关卡 | 结果 | 访问状态 | 生成状态 | 黄金动作 | 完整回合 | 实质候选分支 | 多落点分支 |
|---|---|---:|---:|---:|---:|---:|---:|
| `first-page` | solved | 4161 | 6769 | 28 | 8 | 5 | 8 |
| `crossed-notes` | solved | 4161 | 6769 | 28 | 8 | 5 | 8 |
| `album-night` | solved | 4163 | 6771 | 28 | 8 | 5 | 8 |

三条 witness 均满足：

- 逐动作经真实 reducer 重放；
- 每一步都改变状态；
- 最终 `won`；
- 三个不同主题；
- 重复章节 0；
- 左右两席都当过整理者；
- 左右两席都当过补页者；
- 至少三次完整角色交换；
- 相同关卡重复求解的路径与统计完全一致。

### 实质候选分支

在每个 `choose` 状态：

1. 枚举所有候选动作；
2. 经真实 reducer 生成后继；
3. 比较 canonical key；
4. 至少两个不同 key 才计为实质分支。

按钮数量相同但后继规则相同不会计数。

### 多落点分支

在 `place` 状态直接枚举来向边缘合法空位。至少两个合法 board index 才计为一次
多落点分支。

正式关均远高于规格要求的两次。

## 10. 自动测试

### 定向

```bash
node --test \
  experiences/co-op/memory-merge-board/logic.test.js \
  experiences/co-op/memory-merge-board/solver.test.js
```

结果：

```text
tests 40
pass 40
fail 0
```

其中：

- 规则/reducer：23；
- solver/关卡/静态合同：17。

### 全仓

```bash
npm test
```

结果：

```text
tests 2194
pass 2194
fail 0
```

### Repository verify

```bash
npm run verify
```

结果：

```text
仓库验收通过：
58 个作品入口
50 个 A 级直开
8 个非 A 启动器
1 个能力声明
资源与借鉴声明完整
```

数量保持不变，符合“核心未 installed”边界。

## 11. 静态边界

自动扫描 `config.js`、`logic.js`、`levels.js`、`solver.js`，确认不调用：

- DOM；
- random；
- clock/timer；
- network；
- storage；
- permission；
- runtime code generation。

另有测试确认：

- 项目没有 UI 和 favicon 文件；
- README 与 ATTRIBUTION 含固定来源和未复制边界；
- catalog 不含 `memory-merge-board`；
- CommonJS 与经典脚本配置/关卡边界同构；
- 项目没有 npm 依赖。

## 12. 借鉴与许可证

固定来源：

- 仓库：<https://github.com/gabrielecirulli/2048>
- commit：
  <https://github.com/gabrielecirulli/2048/tree/478b6ec346e3787f589e4af751378d06ded4cbbc>
- LICENSE：
  <https://github.com/gabrielecirulli/2048/blob/478b6ec346e3787f589e4af751378d06ded4cbbc/LICENSE.txt>
- 许可证：MIT License
- 版权人：Copyright (c) 2014 Gabriele Cirulli
- LICENSE SHA-256：
  `57e12c39a6ad9d98b2e451065bfdfbd15fc9e0c2ed3bf4dc1d09acab41ff02fc`

实际借鉴：

- 整盘沿正交方向移动；
- 相同条件相邻元素一次合并；
- 新结果同次不二次合并；
- 无效移动不推进；
- 无合法移动进入结束状态。

未复制：

- 源码与测试；
- 函数结构、对象模型、变量名和控制流；
- 名称、数字体系、随机生成和计分；
- 4×4 视觉布局；
- CSS、配色、字体、截图、图标、文案和资产；
- 本地最高分与继续挑战结构。

当前没有打包上游 MIT 源码或资产。

## 13. 实际 bug

### `memory-merge-board-blocked-fixture`

原 blocked 测试夹具只检查行，意外在列中留下相邻 `taste`，所以规则正确判断仍有
合法移动。

修复：

- 重新设计满盘主题排列；
- 水平和垂直相邻边全部不同；
- 回归断言 `hasAnyLegalSlide === false`；
- reducer 正确进入 `lost / blocked`。

记录：

`bugs/memory-merge-board-blocked-fixture.md`

### `memory-merge-board-catalog-test-path`

静态测试从项目目录多返回一层，误查仓库根 `catalog.json`。

修复：

- 从 `../../../catalog.json` 改为 `../../catalog.json`；
- 成功读取真实 `experiences/catalog.json`；
- 确认候选未进入 catalog。

记录：

`bugs/memory-merge-board-catalog-test-path.md`

## 14. Learn

已新增：

`learn/memory-merge-board-deterministic-branch-proof.md`

沉淀内容：

- canonical key 如何隔离规则与呈现；
- 启发式只排序、不替代 reducer；
- `state-limit` 与 `unsolved` 必须区分；
- 黄金路径必须回放生产 reducer；
- 用不同 canonical successor 证明第二位玩家决策真实；
- solver 证据不能替代 UI 与试玩验收。

## 15. 未完成 Gate

本轮没有 UI，因此没有也不能声称完成：

- `file://` 首载；
- 浏览器 Console；
- 网络面板；
- 键盘；
- Pointer / swipe；
- 焦点；
- live region；
- 320px；
- 400% zoom；
- reduced motion；
- 双人试玩；
- “是否仍被感知为 2048 换皮”的盲测。

这些属于后续视觉提案 `docs/335` 和最终验收 `docs/336`。

## 16. 最终判定

### Core Go

非视觉核心满足：

- 规则正确；
- reducer 路径闭合；
- 三关可解；
- witness 确定；
- 分支真实；
- 状态上限受控；
- 两席均参与；
- 无运行依赖与浏览器副作用；
- 归因完整；
- 测试、全仓与 verify 通过。

### 完整项目 Conditional Go

仍需：

1. 用户确认原创视觉方向；
2. 实现 HTML/CSS/app；
3. 完成真实 `file://` 浏览器 Gate；
4. 完成键盘、触屏、响应式与无障碍 Gate；
5. 完成双人试玩和独立性盲测；
6. 由根代理更新 catalog、Board 与共享索引。

在这些完成前，本项目不得标 installed。
