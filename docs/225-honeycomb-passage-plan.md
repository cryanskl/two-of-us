# “蜜径相逢”实施计划

- 日期：2026-07-24
- 工作 ID：`honeycomb-passage`
- 前置调研：[`223-honeycomb-passage-research.md`](./223-honeycomb-passage-research.md)
- 可执行规格：[`224-honeycomb-passage-spec.md`](./224-honeycomb-passage-spec.md)
- 目标目录：`experiences/versus/honeycomb-passage/`
- 计划状态：纯逻辑可执行；生产 UI 等视觉提案确认

## 1. 交付策略

实现拆成七个可独立验证、独立提交的批次：

1. 蜂巢几何、坐标正规化与 BFS；
2. 对局历史、封蜡合法性、终局、reducer 与公开 view；
3. 视觉概念图与设计提案；
4. 用户明确确认视觉方向；
5. 生产页面、样式与交互；
6. 浏览器实测、全仓验证、bug/learn 沉淀；
7. catalog、创意池、README 和最终借鉴声明。

批次 1、2 不依赖视觉，可以立即推进。批次 5 不得早于批次 4。任何规则变化先改
规格并单独提交；测试失败修复、bug 记录和学习记录分别跟随其所属完成批次提交。

## 2. 目标文件

```text
experiences/versus/honeycomb-passage/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── app.js
├── logic.test.js
├── README.md
└── ATTRIBUTION.md
```

视觉提案资产：

```text
docs/226-honeycomb-passage-design-proposal.md
docs/assets/honeycomb-passage/
├── concept-intro-desktop.png
├── concept-playing-mobile.png
├── concept-result-desktop.png
└── GENERATION.md
```

编号 `226` 只为当前计划预留；若提交前已有别的文档占用，按实际下一个编号顺延。

## 3. 批次一：几何与 BFS

### 3.1 创建最小脚手架

创建：

- `config.js`：UMD 风格导出默认纯文本配置与 `sanitizeConfig`；
- `logic.js`：UMD 风格导出冻结常量、cell/board/neighbor/BFS API；
- `logic.test.js`：Node `node:test`，先锁定几何 API 和输入硬化；
- `ATTRIBUTION.md`：先写调研来源、固定 commit、借鉴与零复制边界。

此阶段不创建 `index.html`、`styles.css` 或 `app.js`，避免在视觉确认前出现被误认成
生产 UI 的临时页面。

### 3.2 几何实现顺序

1. `deepFreeze`、安全 property 观察、plain record/array 校验；
2. `cellKey`、`parseCellKey`、`isCellOnBoard`；
3. `createBoard` 与固定方向 `getNeighbors`；
4. `isGoalCell`；
5. `findShortestDistance` 的队列 BFS；
6. `sanitizeConfig` 与默认配置导出；
7. API/冻结/无副作用扫描。

### 3.3 几何测试

至少覆盖：

- 37 个唯一格、稳定排序和 canonical key；
- 中心 6 邻居、六个角 3 邻居、所有邻接双向；
- 双方起点距离 6，目标边距离 0；
- 坐标镜像保持在棋盘，距离也镜像；
- 固定走廊、完全截断与多路绕行夹具；
- 重复 blocked、blocked 起点、越界或畸形 key 被拒绝；
- getter、setter、symbol、数组伪装、自定义原型和 Proxy 异常不抛；
- 所有公开数组/cell/config 递归冻结；
- 脚本不含 DOM、storage、网络、随机或计时依赖。

### 3.4 批次一验证与提交

```bash
node --test experiences/versus/honeycomb-passage/logic.test.js
git diff --check
git branch --show-current
git rev-parse --show-toplevel
```

提交建议：

```text
feat: add honeycomb passage geometry
```

## 4. 批次二：对局核心

### 4.1 历史与 replay

按以下顺序扩展 `logic.js`：

1. event/history 正规化；
2. 固定初始位置、库存和空 blocked；
3. `getLegalMoves`；
4. `hasRouteForBoth` 与 `getLegalSeals`；
5. `applyAction`；
6. `replayHistory`；
7. 三类终局与固定优先级；
8. exact state、`createInitialState`、`reduce`；
9. `getScreenView`。

行动是否合法只能走这一条生产管线。测试不得自建一份简化 BFS 或封蜡判定来替
生产实现背书。

内部必须拆出接收“已校验 replay 快照”的 raw helper，供 `replayHistory`、
`getLegalSeals` 和 `hasRouteForBoth` 共用；公开函数负责输入校验与冻结。禁止让
`replayHistory → getLegalSeals → hasRouteForBoth → replayHistory` 形成递归。

### 4.2 回合与终局实现细节

- `ply = history.length`；
- active player 在非终局时为 `ply % 2`；
- `completedRounds = floor(ply / 2)`；
- playing 时公开 round 为 `min(16, completedRounds + 1)`；
- 到边检查紧随本次 move；
- 仅当 `ply === 32` 执行 round-limit；
- 未到 32 才枚举下一位行动并检查 immobilized；
- round-limit 先比距离、再比库存、最后平局；
- 终局后的 event/history/reducer ACT 均拒绝。

### 4.3 对局测试

增加：

- 初始合法移动/封蜡与玩家镜像；
- 合法移动、封蜡、库存、切换玩家和 history；
- 最后一条路线被封时，候选列表与直接提交都拒绝；
- 对手占位在 BFS 中忽略、在 move 中拒绝；
- 0 库存、位置重叠、封蜡覆盖棋子、越界和非邻接；
- reached-goal 双方镜像；
- 可构造的 immobilized 夹具；
- 31/32 ply 边界；
- round-limit 的 distance / seals / draw；
- replay、state、view、restart 和 revision；
- 交换玩家 + 坐标镜像的性质测试；
- 固定种子的至少 1,000 条合法随机游走；
- 公开 API、exact keys、递归冻结与调用方引用隔离。

若随机游走发现反例：

1. 把最短反例转成固定回归测试；
2. 在 `/bugs` 写现象、根因、修复与验证；
3. 若结论可复用，在 `/learn` 写不依赖本项目题材的原则；
4. 修复后重新跑定向测试与全仓测试；
5. 不把失败种子只留在终端输出。

### 4.4 批次二验证与提交

```bash
node --test experiences/versus/honeycomb-passage/logic.test.js
node --test experiences/*/*/logic.test.js shared/**/*.test.js
node scripts/verify.mjs
git diff --check
git branch --show-current
git rev-parse --show-toplevel
```

提交建议：

```text
feat: add honeycomb passage duel core
```

若批次二修改量明显过大，可在“历史/行动”和“reducer/view”之间再拆一次提交，但
不能提交不通过定向测试的中间状态。

## 5. 批次三：视觉概念与确认门

本批只创建概念资产和设计文档，不创建生产 UI。提案至少展示：

1. 桌面 intro：规则、双方起点和清晰的开始动作；
2. 手机 playing：37 格可点尺寸、移动/封蜡模式、库存、当前玩家、拒绝原因；
3. 桌面 result：最终路径、封蜡、胜负原因和重开。

设计提案必须冻结：

- 视觉母题、色板、字体栈、格子尺寸与窄屏策略；
- 黄色/紫色之外的形状、纹理和文字冗余；
- 合法移动、合法封蜡、选中模式、hover/focus、不可用和拒绝状态；
- 玩家棋子与中性封蜡的形状差异；
- reduced-motion；
- 概念图中不符合规格或生成错误的排除清单。

提交建议：

```text
docs: propose honeycomb passage visual system
```

提交后暂停生产 UI，并请用户明确回复类似：

```text
确认蜜径相逢，按这套做
```

## 6. 批次四：生产 UI

用户确认后创建：

- `index.html`：语义结构、三个 phase 容器、状态消息和相对经典脚本；
- `styles.css`：响应式蜂巢、按钮状态、焦点、reduced-motion；
- `app.js`：渲染 view、管理表现层 mode、事件委托、焦点和动画；
- `README.md`：玩法、启动方式、个性化、隐私/离线合同；
- 完成 `ATTRIBUTION.md`。

### 6.1 交互合同

- intro 只允许开始；
- playing 默认 `move` 模式；库存为 0 时 seal 模式真实 disabled；
- 切换模式不修改逻辑 state/history/revision；
- 只为 `legalMoveKeys` / `legalSealKeys` 中的格提交 ACT；
- 不合法格仍可被焦点访问并获知原因，但不能推进对局；
- 行动后重绘一次公开 view，焦点落到新棋子格或回合标题；
- 规则状态在 reducer 返回时已完成，动画不负责切换回合；
- result 只允许重开。

### 6.2 A 级运行检查

- 双击 `index.html` 可完整玩完；
- 无 module、fetch、远程请求、storage 或 service worker；
- 断网和静态文件协议不影响规则；
- 单独复制作品目录仍可运行；
- 运行时无第三方包、字体、图像或音频。

## 7. 批次五：浏览器验证

必须用 Chrome MCP 验证：

- 桌面与手机视口；
- 开始、两种模式、合法移动、合法封蜡、断路拒绝、库存归零；
- 到边终局与至少一种 round-limit/immobilized 固定夹具；
- 键盘 Tab、Enter/Space、焦点回落和状态消息；
- reduced-motion；
- 重开与首次加载；
- `file://` 直开；
- console error、网络请求、storage/worker 注册；
- 页面截图与规格/概念提案对比。

若浏览器难以人工走满 32 ply，只能用公开测试夹具或在测试环境注入合法历史；
生产页面不得留下 debug query、全局作弊按钮或隐藏跳关入口。

## 8. 批次六：全仓接入

UI 与浏览器验证通过后：

1. 在 `experiences/catalog.json` 新增唯一 `honeycomb-passage`；
2. 更新 `docs/40-idea-backlog.md` 的创意池 V20 链接与完成数量；
3. 运行 catalog/启动等级/相对路径验证；
4. 再跑全仓 Node tests 与 `node scripts/verify.mjs`；
5. 检查 `git status`，只提交本项目相关文件；
6. 独立提交 catalog/docs 接入。

提交建议：

```text
feat: ship honeycomb passage duel
docs: catalog honeycomb passage duel
```

若 UI、文档和 catalog 能各自保持可验证，应继续拆分，不合成一个大提交。

## 9. 完成定义

只有同时满足以下条件，创意池 V20 才能从“候选”改为“已实现”：

- 纯逻辑定向测试与全仓测试通过；
- 37 格几何、BFS、封路保全、镜像与三类终局有自动化证据；
- 用户确认后的生产 UI 与提案一致；
- Chrome MCP 在桌面/手机与 `file://` 下完成关键路径；
- 页面无网络、storage、worker、console error；
- README 与 ATTRIBUTION 的启动/借鉴声明准确；
- bug 与 learn 按实际发现落盘，没有伪造空记录；
- catalog、创意池计数和 verify 通过；
- 每个完成部分都有独立 commit，工作树干净。
