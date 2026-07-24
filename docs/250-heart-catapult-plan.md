# “这一颗，绕回来找你”分步实施计划

- 日期：2026-07-24
- 稳定工作 ID：`heart-catapult`
- 调研：[`247-heart-catapult-research.md`](./247-heart-catapult-research.md)
- Brainstorm：[`248-heart-catapult-brainstorm.md`](./248-heart-catapult-brainstorm.md)
- 规格：[`249-heart-catapult-spec.md`](./249-heart-catapult-spec.md)
- 目标目录：`experiences/versus/heart-catapult/`
- 启动等级：A（真实 `file://` 直开）
- 实施方式：子任务分段实现，主任务逐段审查、验证并独立提交

## 1. 任务分类与冻结边界

这是非平凡功能：新增完整对抗作品、确定性连续碰撞、热座隐私、Canvas 表现、
catalog、来源声明、浏览器验收与学习记录，跨多个文件。已经完成
brainstorm → spec，本计划只拆执行顺序，不改写玩法。

实现必须服从 249 的 exact 合同，尤其不能弱化：

1. Q12 常量、有理事件、ties-to-even、`candidateVy` 反弹来源和单次反弹；
2. 99 组合矩阵、五条 golden、198 条镜像轨迹和安全整数 headroom；
3. 两份秘密输入收齐后才播放，第一发结束不计分，第二发后联合结算；
4. 达到 3 次且严格领先才获胜，最多 12 个完整轮；
5. exact state/action/API/public DTO、descriptor snapshot、hostile input 与 revision
   headroom；
6. A 级经典脚本、零网络、零远程资产、零第三方运行依赖；
7. 五个固定 MIT 来源、完整 SHA、许可与零复制边界。

首版不设置视觉确认暂停。Brainstorm 已冻结“纸雕城堡、软垫地面、爱心投石器、
双席镜像”的 code-native 方向；逻辑稳定后先产出一份独立设计文档，再按其实现。
若设计文档需要改变 DOM、玩法或公开 DTO，必须回到规格，不得让 CSS 或 app 临时
创造规则。

## 2. 提交纪律

用户要求“每完成一个项目或者一部分，就提交一次”。本作固定以下独立提交：

1. 本实施计划；
2. 纯逻辑、配置、测试、目录级 CommonJS 边界与生产借鉴声明；
3. code-native 视觉设计文档；
4. 语义 HTML、app 阶段渲染、输入与动画生命周期；
5. CSS、favicon、响应式、降级与视觉闭环；
6. 作品 README、catalog、门户、分类索引、创意池和仓库合同；
7. 每个真实 bug：失败夹具、最小修复和对应 `bugs/` 记录组成独立提交；
8. 每个有跨项目价值的结论：对应 `learn/` 记录独立提交；
9. 最终浏览器验收与 verification 文档独立提交。

每次 commit 前必须执行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

并确认：

- 当前分支属于本任务；
- top-level 是 `/Users/zenith/Desktop/two-of-us`；
- 没有混入用户或其他会话的修改；
- 只暂存当前完成部分；
- 本部分定向 Gate、`npm test`、`npm run verify` 与 `git diff --check` 全绿。

pre-commit hook 失败时修问题、重新 add、创建新 commit，绝不使用 `--amend`
补救。

建议提交主题：

```text
docs: plan heart catapult implementation
feat: add heart catapult logic
docs: design heart catapult interface
feat: add heart catapult interaction
feat: style heart catapult
feat: catalog heart catapult
fix: <heart-catapult bug>
docs: capture <reusable learning>
docs: verify heart catapult
```

## 3. 子任务与文件所有权

### 3.1 逻辑子任务

唯一写入：

```text
experiences/versus/heart-catapult/package.json
experiences/versus/heart-catapult/config.js
experiences/versus/heart-catapult/logic.js
experiences/versus/heart-catapult/logic.test.js
experiences/versus/heart-catapult/ATTRIBUTION.md
```

职责：

- exact frozen API 与 CONSTANTS；
- 配置清洗；
- ties-to-even、有理比较、slab、事件排序和连续接触；
- 99 组合 `simulateShot`；
- reducer、history replay、revision/token headroom；
- public view 隐私；
- 固定来源声明与零复制边界；
- 独立 BigInt oracle。

不得创建 HTML/CSS/app，不修改 catalog、根索引、docs、bugs 或 learn。

### 3.2 设计子任务

在逻辑提交后唯一写入：

```text
docs/251-heart-catapult-design.md
```

职责：

- 一套 code-native 视觉令牌；
- 七阶段信息结构；
- 960×540 Canvas 舞台构图；
- 桌面、平板、390px、320px 与横屏响应式；
- reduced-motion、forced-colors、no-CSS、no-JS 与 Canvas failure；
- 焦点、触控、文案和隐私可见性。

不生成生产图片，不修改逻辑或生产 UI。

### 3.3 交互子任务

在逻辑与设计提交后唯一写入：

```text
experiences/versus/heart-catapult/index.html
experiences/versus/heart-catapult/app.js
```

职责：

- 经典脚本加载；
- phase DOM；
- 唯一当前瞄准者的 app-local 草稿，锁定或退出阶段立即销毁；
- 遮屏、生命周期与隐私；
- Canvas frame 消费；
- 正常动画、skip 与 reduced-motion 的 token 化完成；
- 键盘、焦点、ARIA 和无 JS 结构。

不得修改逻辑、样式、来源、catalog 或 docs。

### 3.4 视觉子任务

在交互提交后唯一写入：

```text
experiences/versus/heart-catapult/styles.css
experiences/versus/heart-catapult/assets/favicon.svg
```

职责：

- 忠实实现 251；
- 响应式、缩放、触控尺寸；
- reduced-motion 与 forced-colors；
- 零远程资源。

若浏览器验证发现结构或规则问题，停止本批并另开独立 bug/fix 提交，不能把 JS
修复混入 CSS 提交。

### 3.5 集成与验收

主任务按真实 schema 写入：

```text
experiences/versus/heart-catapult/README.md
experiences/catalog.json
experiences/versus/README.md
README.md
docs/README.md
docs/40-idea-backlog.md
shared/runtime/catalog.test.js
scripts/experience-contracts.test.mjs
docs/252-heart-catapult-verification.md
bugs/...
learn/...
```

只有测试证明精确统计变化时才修改计数 Gate；不得预估数字后直接改断言。

## 4. 批次一：纯逻辑、配置、来源与测试

### 4.1 模块边界

- 目录级 `package.json` 只含 `{"type":"commonjs"}`；
- `config.js` 同时提供可编辑 `window.HEART_CATAPULT_CONFIG` 与 CommonJS 导出；
- `logic.js` 同时提供 `window.HeartCatapultLogic` 与真实 `require()`；
- 根级 ESM 测试以 side-effect `import()` 验证浏览器全局路径；
- 初始化不读取 DOM、clock、random、timer、storage、network、audio 或权限。

### 4.2 物理实现顺序

按依赖从小到大实现：

1. 递归冻结、exact 普通对象与 descriptor snapshot；
2. `roundEven`、最大公因数和规范化有理数；
3. exact `CONSTANTS`、角度/力度表与 `mirrorXQ`；
4. slab、ground、horizontal/top exit 候选；
5. 精确最小 `t` 与相等 tie-break；
6. `resolveSegmentEvent` 的 `±8,000,000` 输入域和逐步 safe 检查；
7. `simulateShot` 的半隐式 Euler、单次反弹和 terminal frame；
8. 配置清洗；
9. state 校验、history replay、reducer；
10. exact public view 与阶段隐私。

`simulateShot` 必须调用公开事件 helper；测试 oracle 不能调用生产 helper 生成
expected。

### 4.3 测试 Gate

定向测试至少覆盖：

- 30-key CONSTANTS 与 15-key 顶层 API 的 exact 顺序和递归冻结；
- 浏览器 global、真实 CommonJS 与根 ESM side-effect import；
- `roundEven` 正负半值、镜像恒等式、非法输入和安全边界；
- slab 平行轴、闭边界、起点在框内、四类事件、严格先后和相等 tie-break；
- `candidateVy` 反弹回归，禁止旧 `vy`；
- 99 组合固定矩阵与 23/45/25/6/0/0 计数；
- 198 条镜像 frame、五条 golden、最慢 tick 181；
- 独立 BigInt oracle 与全部中间量 headroom；
- exact config、action、state、history、JSON clone、hostile getter/Proxy；
- 第一发不计分、第二发联合结算、延长轮、winner、12 轮 round-cap；
- revision 96-action 上界、stale revision、旧 token 和 restart；
- 每 phase exact public DTO、断引用、递归冻结与秘密 sentinel。

命令：

```bash
node --check experiences/versus/heart-catapult/config.js
node --check experiences/versus/heart-catapult/logic.js
node --test experiences/versus/heart-catapult/logic.test.js
npm test
npm run verify
git diff --check
```

完成条件：定向测试和全仓测试全绿，diff 只含本批五个文件，独立审阅无 P0/P1
问题，然后提交 `feat: add heart catapult logic`。

## 5. 批次二：code-native 视觉设计

`251-heart-catapult-design.md` 必须冻结：

- 温暖纸张、莓红、蜜金、深靛与鼠尾草色令牌；
- 桌面双侧操控台、中部纸雕战场、顶部比分/轮次的视觉层级；
- handoff 和 aiming 不保留上一位参数形状或数值；
- reveal-ready 是中性遮屏，不预画任何轨迹；
- flying 只展示当前公开弹体，第一发不出现第二发参数；
- round-result 同时对比两发摘要，complete 明确 winner 或 round-cap 平局；
- Canvas 只画场地、弹体与轨迹，不承载唯一文本；
- 320px 起不横溢，按钮和步进控件至少 48×48 CSS px；
- 200% text、400% zoom、reduced-motion、forced-colors、no-CSS、no-JS 和 Canvas
  failure 的结构；
- 不引用商业弹射游戏的角色、弹弓、美术、声音、关卡或品牌表达；
- 不引入图片生成素材、远程字体、图标库或模式开关。

设计文档经审阅后独立提交；不得和生产 UI 合并。

## 6. 批次三：语义 HTML、app 与动画生命周期

### 6.1 HTML

- `lang="zh-CN"`、完整标题和描述；
- `config.js → logic.js → app.js` 三个经典相对脚本；
- 一个 `main`、公开 status/live region 与 no-JS 说明；
- Canvas 有 fallback，但状态和主动作都在真实 DOM；
- 不预埋 hidden/template 秘密节点；
- 不含远程 URL、module、inline network、第三方资产。

### 6.2 app

- authority state 只通过 `reduce` 更新；
- 所有业务渲染只消费 `getPublicView`；
- 任一时刻最多存在一份当前瞄准者的 app-local range 草稿，锁定时一次性提交两个
  索引并立即销毁，不能保留已锁 aim 的第二份副本；
- blur、hidden、pagehide、Escape 立即丢草稿并进入 app-local opaque cover；
  authority state 保持原 aiming，不派发规格外动作；用户显式恢复后才移除 cover，
  并从 canonical 默认值重建一份全新草稿；
- 每次 render 卸载旧阶段节点，不靠 CSS 隐藏旧秘密；
- Canvas 只把公开 Q12 frames 映射到像素，不重新积分；
- 正常动画和 reduced-motion 共用一个 token 化 `COMPLETE_FLIGHT` 完成器；
- skip、迟到 rAF、重复 click、旧 token 与 compatibility click 都幂等；
- 第一发完成只切第二发，第二发完成才显示联合比分；
- phase 转换后把焦点放到新阶段标题或唯一主动作；
- 不访问 storage、cookie、URL/history、clipboard、network、权限或 console 私密值。

### 6.3 验证

除批次一命令外，用 Chrome MCP 验证：

- 两位分别锁定、第二位阶段扫描第一份参数零命中；
- 第一发阶段扫描第二份参数和 frames 零命中；
- direct、bounce、second-ground、exit 四条真实路径；
- 正常动画、skip、reduced-motion 结果一致且只完成一次；
- blur、hidden、pagehide、Escape 清草稿并遮屏；
- range、步进按钮、Tab、Shift+Tab、Enter、Space、方向键；
- no-JS、Canvas null/throw 和经典 `file://` 加载。

本批只提交 HTML/app；任何逻辑缺口先回到独立逻辑 fix。

## 7. 批次四：CSS、favicon 与视觉闭环

- 实现 251 冻结的纸雕城堡和软垫舞台；
- 使用 CSS/Canvas 基本几何与本地 SVG favicon；
- 动画不参与规则，不使用无限闪烁、抖动或全屏闪白；
- 所有 hover、active、score、hit/miss 同时有非颜色提示；
- focus 至少 3px 清晰轮廓；
- 原生 range 与步进按钮支持触控和键盘；
- 覆盖 1728×906、1280×800、768×1024、390×844、320×568、844×390；
- 200% text 与 400% zoom 允许纵滚但禁止横溢；
- reduced-motion 立即投影终点，不恢复旧动画；
- forced-colors 隐藏装饰渐变/阴影，保留真实 border、outline 与文本状态；
- no-CSS 仍按 DOM 顺序可理解，Canvas failure 仍可完成操作。

Chrome MCP 必须截图并检查上述视口、全部 phase、长名字、12 轮终局、winner/draw、
forced-colors 和 reduced-motion。只在真实视觉 Gate 全绿后提交样式批次。

## 8. 批次五：说明、catalog 与仓库合同

### 8.1 作品 README

必须说明：

- 双击 `index.html` 即玩；
- 两人同设备秘密瞄准、依次放飞、联合计分；
- 角度/力度、直接/反弹命中与 12 轮终止；
- 可编辑名字配置；
- 键盘、降动效、强制颜色和 Canvas fallback；
- 热座隐私只保证正常 UI 不泄露，不抵御开发者工具读取内存；
- 不需要安装、服务、网络、账号、权限、远程素材或第三方运行库；
- “借鉴与来源声明”入口和零复制说明。

### 8.2 借鉴声明

生产 `ATTRIBUTION.md` 必须保留调研冻结的五个仓库：

- `tridpt/TwoPlayerGames`
  `c96b802232d87d58408ed653dcbe43c0a68611f6`；
- `niccolofanton/tanks-game`
  `e4eb4c694d9bb3671de84ce1ea29b80f8c1d8c12`；
- `liabru/matter-js`
  `acb99b6f8784c809b940f1d2cf745427e088e088`；
- `schteppe/p2.js`
  `2beb2750f42d29014e289cb803b7269d5b0edaad`；
- `jriecken/sat-js`
  `20e612681d1f9eabc9ea34dc98c4d27f985ffec6`。

逐项写许可证、权利主体、实际借鉴抽象和未复制范围；不能只放链接或统一写一句
“参考了开源项目”。

### 8.3 Catalog

先读取 `experiences/catalog.json` 的真实 schema 和现有 A 级对抗条目，再添加
`heart-catapult`。同步：

- `experiences/versus/README.md`；
- 根 `README.md`；
- `docs/README.md`；
- `docs/40-idea-backlog.md`；
- 必要的 catalog / experience contract 测试。

运行测试得到真实作品数、A/B/C/D 数量后再写文案。此批不得修改生产逻辑或 UI。

## 9. 批次六：浏览器验收、bugs 与 learn

最终验收同时覆盖真实 `file://` 和统一 localhost：

1. 完整热座流程、四类轨迹、延长、winner、round-cap draw、restart；
2. 第二位瞄准与第一发飞行阶段的 DOM/ARIA/attribute/Canvas text/console 隐私；
3. stale token、快速重复激活、skip、reduced-motion 与生命周期；
4. 六档视口、200% text、400% zoom、forced-colors、no-CSS、no-JS；
5. `scrollWidth <= clientWidth`、焦点、live region、Canvas fallback；
6. console 与 network 清洁；
7. README、ATTRIBUTION、catalog、创意池和数量 Gate；
8. `npm test`、`npm run verify`、`git diff --check` 与干净 worktree。

真实缺陷按“一问题一文件”写入 `bugs/`，必须含复现、根因、修复、回归证据和相关
提交；修复与记录同一独立提交。只有具备跨项目复用价值的结论才写入 `learn/`，例如：

- 连续碰撞必须区分最早事件与相等 tie-break；
- 半隐式 Euler 反弹必须冻结速度取值时点；
- 固定顶层 DTO 如何与结构性秘密缺失共存；
- 确定性对称游戏如何证明有限终止。

最后创建 `docs/252-heart-catapult-verification.md`，记录命令、测试数量、浏览器矩阵、
截图、来源、A 级证据、已知限制，以及 verification 提交前被验收的
实现/catalog HEAD；单独提交 `docs: verify heart catapult`。该 verification
commit 自身的 SHA 只在提交成功后的交付结果中报告，不回写文档，也不使用 amend
制造自引用。

## 10. 完成定义

只有以下条件全部满足，`heart-catapult` 才算完成：

- 生产目录文件齐全，真实双击 `index.html` 可玩；
- 99 组合、198 镜像、五条 golden、reducer、隐私和 headroom 测试全绿；
- 两人能在同一设备完成整局，不出现秘密泄露或无限局；
- UI、响应式、键盘、生命周期与降级通过 Chrome 验收；
- 五项来源声明完整，明确独立实现和零复制；
- catalog、分类、创意池、统计和仓库 Gate 同步；
- 每个项目部分、bug、learn 和最终验收均按边界独立提交；
- worktree 干净。
