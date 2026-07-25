# 「七片同心」实施计划

> 正式 ID：`seven-piece-duet`
>
> 历史 worktree / 分支代号：`tangram-heart-duet`
>
> 规格：[`docs/328-tangram-heart-duet-spec.md`](./328-tangram-heart-duet-spec.md)
>
> 当前状态：四阶段前置文档完成后可实施；安装结论仍为 **Conditional Go**

## 1. 计划目标

把“七片同心”实现为一个 A 级、无运行依赖、本地双击即可完成四形的同屏双人合作项目，并按“小批次实现 → 对应测试 → 独立提交”交付。

本计划只授权候选独有文件：

- `experiences/co-op/seven-piece-duet/**`
- 真实发生时的 `bugs/*seven-piece-duet*.md`
- 值得沉淀且真实验证时的 `learn/*seven-piece-duet*.md`

不授权修改：

- `experiences/catalog.json`
- `docs/orchestration-board.md`
- `docs/README.md`
- 根 `README.md`
- 分类索引、统一门户或其他作品

这些共享文件只在项目全部 Gate 通过、由总控决定安装时另开集成提交。

## 2. 工作流与提交纪律

这是跨多文件的新功能，实施走：

```text
research → brainstorm → spec → plan
→ geometry proof
→ original target generation/audit
→ reducer
→ UI/input
→ attribution/docs
→ Chrome/file acceptance
→ integration decision
```

每次文件写入前、每次提交前都执行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

预期：

```text
codex/exp-tangram-heart-duet
/Users/zenith/Desktop/two-of-us-worktrees/tangram-heart-duet
```

历史分支名可以保留，但生产目录、文案和测试统一使用正式 ID `seven-piece-duet`。

提交规则：

- 每完成一个可验证部分立即独立提交；
- 一次提交只包含该阶段声明的文件；
- 提交前 `git status --short`、`git diff --check`、阶段测试和 `npm run verify`；
- commit hook 失败时修复、重新 add、创建普通新提交，绝不 `--amend`；
- 不使用 reset、checkout、clean、force push 等破坏性命令；
- 不覆盖其他 worktree 或用户未提交内容；
- 基线失败与本阶段失败分开记录，不顺手修无关项目。

## 3. 子任务驱动与文件所有权

实现按仓库约定使用子任务驱动，但必须避免多个执行者同时编辑同一文件。建议顺序：

| 子任务 | 前置 | 独占文件 | 输出 |
| --- | --- | --- | --- |
| Geometry | 四份文档 | `geometry.js`、`geometry.test.js` | 精确整数几何与证明 |
| Content | Geometry API 冻结 | `tools/generate-targets.mjs`、`targets.js`、`TARGETS.md`，必要时只追加 geometry tests | 四个原创目标和审计 |
| Logic | Geometry + Content 提交 | `logic.js`、`logic.test.js` | 席位权限、draft、四局状态机 |
| UI | Logic API 冻结 | `index.html`、`styles.css`、`app.js` | 语义页面、Pointer、键盘、响应式 |
| Docs/Rights | UI 基本完成 | `README.md`、`ATTRIBUTION.md` | 启动、隐私、来源、原创边界 |
| Acceptance | 上述完成 | 先只读；修复只回到对应 owner 文件 | Chrome / `file://` 证据与 Gate 判断 |

如果使用并行 worktree，任何执行者提交前仍须证明当前分支与路径。Geometry 和 Content 不能并行，因为目标生成依赖冻结的 canonical shape；Logic 和 UI 也不能在接口未冻结时并行。

验收执行者不得直接“大扫除”所有文件。问题要按归属回给对应阶段，修复后创建新的窄提交。

## 4. 依赖统一策略

### 4.1 结论

**不新增运行依赖，也不新增开发依赖。**

运行时只使用：

- HTML、CSS、经典 JavaScript；
- 原生 SVG；
- Pointer Events；
- DOM、focus、媒体查询。

开发期只使用：

- 仓库已存在的 Node；
- `node:test` / `assert` 或仓库当前测试风格；
- 根 `npm run verify`；
- 已配置的 Chrome 浏览器验证工具。

`tools/generate-targets.mjs` 只用 Node 标准库，不被浏览器加载。它不是用户安装步骤。

### 4.2 禁止引入

- jQuery、jQuery UI、Konva；
- SAT、多边形 clipping、物理或拖拽库；
- React/Vue/Svelte、打包器、TypeScript 工具链；
- 随机库、求解器 npm 包；
- CDN、远程字体、图标、图片、音频；
- 项目私有 `node_modules` 或复制的 vendor bundle。

如果任一阶段认为必须新增依赖，立即暂停并回到规格评审；不能先安装再补文档。

## 5. 阶段 0：基线和污染检查

### 任务

1. 运行分支/worktree 精确检查。
2. 记录：

```bash
git rev-parse HEAD
git status --short
```

3. 确认目标目录尚不存在，或审计其全部已有文件。
4. 检查其他 worktree/任务是否正在写 `seven-piece-duet`。
5. 执行：

```bash
npm run verify
git diff --check
```

6. 搜索正式 ID 与历史候选代号，确保没有冲突安装项。

### 阻塞

- 分支/root 不匹配；
- 存在来源不明的目标目录改动；
- catalog 已出现同 ID 但状态不明；
- 基线 verify 失败且无法证明与候选无关。

基线失败不得写入候选 bugs。只有候选阶段实际触发、复现且确认属于本项目的问题才记录。

### 提交

没有文件变化，不提交。

## 6. 阶段 1：整数几何内核

### 文件

- `experiences/co-op/seven-piece-duet/geometry.js`
- `experiences/co-op/seven-piece-duet/geometry.test.js`

### 任务 1.1：规范数据

实现：

- integer vertex 校验；
- doubled-area 为 1 的原子三角形校验；
- 数值顶点排序；
- canonical triangle key；
- canonical shape、去重、冻结和引用隔离。

测试：

- 顶点排列的六种顺序同 key；
- 负数、两位数坐标防字符串排序错误；
- 重复点、共线、非整数、非法面积；
- 重复 triangle key；
- getter、污染原型、稀疏数组等畸形输入。

### 任务 1.2：精确变换和集合

实现：

- mirror → quarter-turn → translate 的冻结顺序；
- shape transform；
- subset、intersection、union；
- D4 + 平移归一化 fingerprint。

测试：

- 四次 quarter-turn 回原形；
- mirror 两次回原形；
- 变换不改输入；
- 边接触没有共享 triangle key；
- 正面积重叠产生交集；
- fingerprint 对八种 D4 变换和整数平移不变。

### 任务 1.3：独立七片模板

按规格的数学构造编写七片模板，不读取调研上游 `src`：

- 两大三角各 4；
- 中三角 2；
- 两小三角各 1；
- 正方形 2；
- 平行四边形 2。

测试总面积 16、两组各 8、凸性和允许姿态。平行四边形翻面必须产生四分之一转不可达的 canonical shape。

### 阶段验证

```bash
node experiences/co-op/seven-piece-duet/geometry.test.js
npm run verify
git diff --check
```

建议额外以 1,000 个固定整数 pose 做性质循环，证明变换后原子数保持不变；不引入 property-testing 包。

### 独立提交

```bash
git add \
  experiences/co-op/seven-piece-duet/geometry.js \
  experiences/co-op/seven-piece-duet/geometry.test.js
git commit -m "feat: add exact seven-piece geometry"
```

## 7. 阶段 2：原创目标生成与内容审计

### 文件

- `experiences/co-op/seven-piece-duet/tools/generate-targets.mjs`
- `experiences/co-op/seven-piece-duet/targets.js`
- `experiences/co-op/seven-piece-duet/TARGETS.md`
- 必要时补充 `geometry.test.js`

### 任务 2.1：确定性候选生成

工具只导入本项目 geometry API，并使用固定枚举顺序：

1. 固定第一片到规范原点，消除纯平移重复；
2. 按 piece ID 固定顺序放置；
3. 枚举 quarterTurns、平行四边形 flip 和有限整数平移；
4. 候选必须与已放片至少共享一条完整原子边；
5. 禁止 triangle key 重叠；
6. 限制 bounding box、长宽比和边界复杂度；
7. 完成七片后验证 edge-connected、无洞和组间接触；
8. 计算 D4 fingerprint 并去重；
9. 输出候选 ID、标准解、cells、fingerprint 和可读 ASCII/SVG 预览。

不从网络下载题面，不读取上游仓库文件，不以第三方截图或 silhouette 作为输入。若使用固定 seed 选择候选，seed、PRNG 和枚举顺序必须写入 TARGETS；更简单时优先完全无随机的序号选择。

### 任务 2.2：选择四形

从工具输出中选：

- `embrace` / 相拥；
- `side-by-side` / 并肩；
- `echo` / 回响；
- `interlock` / 相扣。

名称是抽象叙事，不要求图形像人物、船、动物或具体物件。至少：

- 四个 fingerprint 互异；
- 第三形要求平行四边形翻面；
- 不是简单正方形复原；
- 每形两组都有跨组边接触；
- 教学到综合的边界复杂度递增；
- 在 320px 板面上片边界可辨。

### 任务 2.3：人工内容审计

`TARGETS.md` 记录：

- 七片独立推导；
- 工具版本/commit 和完整运行命令；
- 固定候选编号或 seed；
- 四形标准解与 fingerprint；
- 未使用网络题面、图片、开源坐标或素材；
- 与 `photo-swap-puzzle`、`moving-home-together`、`dual-maze-race`、`tethered-heart` 的内容/机制差异；
- 对仓库心形、星形、迷宫、家具、照片等高频视觉的人工检查；
- 已知限制：独立生成不能证明世界上不存在偶然相似，只能证明来源链和筛选过程。

如果某形过于像知名角色、标志、常见网络题面或仓库现有视觉，删除该候选并生成新 fingerprint；不要只改名字。

### 阶段验证

```bash
node experiences/co-op/seven-piece-duet/tools/generate-targets.mjs --check
node experiences/co-op/seven-piece-duet/geometry.test.js
npm run verify
git diff --check
```

再运行两次生成器并比较输出哈希，必须一致。确认 `index.html` 尚未加载 `tools/`。

### 独立提交

```bash
git add \
  experiences/co-op/seven-piece-duet/tools/generate-targets.mjs \
  experiences/co-op/seven-piece-duet/targets.js \
  experiences/co-op/seven-piece-duet/TARGETS.md \
  experiences/co-op/seven-piece-duet/geometry.test.js
git commit -m "feat: add original seven-piece targets"
```

若 geometry test 没有改动，不要为了照抄命令而暂存它。

## 8. 阶段 3：席位权限与四局 reducer

### 文件

- `experiences/co-op/seven-piece-duet/logic.js`
- `experiences/co-op/seven-piece-duet/logic.test.js`

### 任务 3.1：状态和归属

实现：

- `createInitialState`；
- phase、roundIndex、revision；
- `fine/bold` 片组；
- `AB → BA → AB → BA` 四局日程；
- 深冻结与 public view；
- 白名单 action 解析。

测试：

- 初态深相等和引用隔离；
- 四局 owner；
- 正式 ID/目标顺序；
- 畸形 state/action；
- revision 迟到拒绝。

### 任务 3.2：draft 生命周期

实现：

- START、SELECT；
- MOVE_DRAFT、ROTATE_DRAFT、FLIP_DRAFT；
- CANCEL_DRAFT；
- 同席单 draft、两席各一 draft；
- tray/board origin。

测试：

- A action 不能移动 B owner，反向同理；
- 一个自然人仍可依次使用两席是已知设备边界，不写假身份测试；
- 已放片选择/取消保留 committedPose；
- 非法 flip、移动和旋转；
- state 不读取 DOM、Pointer 或时间。

### 任务 3.3：提交与完成

实现：

- 精确 subset/overlap；
- reason 优先级；
- conflict piece 固定顺序；
- 合法提交；
- 非法提交清 draft、保留 committedPose；
- 完成检查；
- NEXT_ROUND、RESTART_ROUND、RESTART_MATCH。

测试：

- 越界 + 重叠优先报告越界；
- 边接触合法、triangle 交集非法；
- 缺片、留空、重叠不完成；
- 四个标准解转成公开 action golden replay；
- 四局换组并最终完成；
- 同一 action log 深相等。

### 阶段验证

```bash
node experiences/co-op/seven-piece-duet/geometry.test.js
node experiences/co-op/seven-piece-duet/logic.test.js
npm run verify
git diff --check
```

### 独立提交

```bash
git add \
  experiences/co-op/seven-piece-duet/logic.js \
  experiences/co-op/seven-piece-duet/logic.test.js
git commit -m "feat: add seven-piece duet rules"
```

## 9. 阶段 4：语义页面与静态视觉

### 文件

- `experiences/co-op/seven-piece-duet/index.html`
- `experiences/co-op/seven-piece-duet/styles.css`
- `experiences/co-op/seven-piece-duet/app.js`

### 任务 4.1：页面骨架

先实现稳定 DOM：

- header 与本地隐私短句；
- round summary；
- A/B 两席托盘和控制；
- 共享 SVG board；
- polite status；
- round/match result；
- help 与借鉴入口占位。

全部主要动作使用原生 button。脚本是相对经典脚本，页面在 `file://` 不依赖模块。

### 任务 4.2：SVG 投影

- 从 public view 生成目标轮廓和拼片；
- 使用同一逻辑 viewBox；
- piece 交互 DOM 在 render 中保持稳定 key；
- 颜色、纹理、A/B 标记共同表达归属；
- 合法、越界、冲突和完成有文字/图形；
- 不渲染或隐藏标准解；
- 不读取 CSS transform 回写规则。

### 任务 4.3：响应式与基础无障碍

- 三列、板上双列、单列三档布局；
- 五个规格视口没有玩法横向溢出；
- 48×48 项目 hit-area Gate；
- `:focus-visible`；
- reduced motion、forced colors；
- SVG title 和当前完成摘要；
- 不禁止缩放。

这个阶段可以先用按钮完成规则，不急于加入拖动，以便隔离视觉和 reducer 接线问题。

### 阶段验证

```bash
node experiences/co-op/seven-piece-duet/geometry.test.js
node experiences/co-op/seven-piece-duet/logic.test.js
npm run verify
git diff --check
```

Chrome localhost 检查：

- intro、playing、非法、round complete、match complete；
- 控制台零错误；
- Network 无远程资源；
- 320×568、390×844、844×390、768×1024、1440×900。

### 独立提交

```bash
git add \
  experiences/co-op/seven-piece-duet/index.html \
  experiences/co-op/seven-piece-duet/styles.css \
  experiences/co-op/seven-piece-duet/app.js
git commit -m "feat: add seven-piece duet interface"
```

## 10. 阶段 5：Pointer、键盘与生命周期

### 文件

- `experiences/co-op/seven-piece-duet/app.js`
- 必要时 `styles.css`
- 必要时补充 `logic.test.js`

### 任务 5.1：Pointer

实现：

- pointerId + generation；
- SELECT 后 capture；
- client → viewBox → integer cell 量化；
- 双席各一会话；
- release 才 COMMIT；
- cancel/lost capture/blur/hidden 清会话并 CANCEL；
- 第三触点和迟到 pointerup 安全；
- revision 防旧事件覆盖；
- 单鼠标走同一路径。

### 任务 5.2：键盘

实现：

- Tab 到片；
- Enter/Space 选择/提交；
- draft 期间方向键移动；
- 可聚焦左转、右转、翻面、放下、取消；
- Escape 仅有 draft 时取消；
- 焦点从托盘片提交到板上同片；
- 不注册全局 WASD 或单字符快捷键。

### 任务 5.3：live 与错误

- notice serial 去重复播报；
- 选择、放下、取消、越界、重叠、换形和完成短句；
- 不逐格播报；
- 非法提交不归因或嘲讽；
- “席位”说明不声称身份认证。

### 阶段验证

自动：

```bash
node experiences/co-op/seven-piece-duet/geometry.test.js
node experiences/co-op/seven-piece-duet/logic.test.js
npm run verify
git diff --check
```

Chrome：

- 鼠标完整一形；
- 键盘完整一形；
- 真实双 Pointer 两席各一 draft；
- cancel 一席不影响另一席；
- 冲突提交顺序；
- blur/hidden/lost capture；
- 200%、400%、reduced motion、forced colors。

### 独立提交

```bash
git add \
  experiences/co-op/seven-piece-duet/app.js \
  experiences/co-op/seven-piece-duet/styles.css \
  experiences/co-op/seven-piece-duet/logic.test.js
git commit -m "feat: complete seven-piece duet controls"
```

只暂存实际修改的文件。

## 11. 阶段 6：README 与借鉴声明

### 文件

- `experiences/co-op/seven-piece-duet/README.md`
- `experiences/co-op/seven-piece-duet/ATTRIBUTION.md`

### README 必须写明

- 正式名称、分类、A 级；
- 直接双击启动；
- A/B 席规则和非身份认证边界；
- 四形、换组和共同完成；
- 鼠标、触摸、键盘操作；
- 零依赖、零网络、零存储、零权限；
- 不保存进度；
- `TARGETS.md` 原创题面链；
- 固定来源与零复制摘要；
- 已知限制和无障碍入口。

### ATTRIBUTION 必须写明

逐项写固定链接、commit、LICENSE、许可证、版权主体、仅研究内容和未复制范围：

1. `shgalus/tangram@a5cdfdc9a85894bf58829fb4f4dbddcf22b41764`，MIT，Copyright (c) 2018 Stanisław Galus；
2. `JozefJarosciak/BlockPuzzleSolver@f49e89f576186ec773ca21d0ee173175f36f75e9`，MIT，Copyright (c) Jozef Jarosciak；
3. `w3c/pointerevents@238e8273305bb2e3c76f9f0bb289fb127c3dff74`，W3C Software and Document License，W3C contributors；
4. `w3c/wcag@07123b871c103268375880980fd715b2b26b2ff0`，W3C Document License，W3C contributors。

声明：

- 主参考只借鉴七块组成轮廓的抽象机制；
- solver 只对照 README 中格约束、旋转、反射问题；
- 不复制代码、API、算法、测试、坐标、比例、题面、标准解、UI、视觉、文字或素材；
- 不引入上游 jQuery/jQuery UI/Konva 或求解器；
- 片模板为规格中的独立数学推导；
- 四目标由仓库工具确定性生成并经人工内容审计。

若实际事实不符合，先修正声明和许可处理，不能照抄计划中的“零复制”。

### 阶段验证

```bash
rg -n \
  'a5cdfdc9a85894bf58829fb4f4dbddcf22b41764|f49e89f576186ec773ca21d0ee173175f36f75e9|238e8273305bb2e3c76f9f0bb289fb127c3dff74|07123b871c103268375880980fd715b2b26b2ff0' \
  experiences/co-op/seven-piece-duet/README.md \
  experiences/co-op/seven-piece-duet/ATTRIBUTION.md
npm run verify
git diff --check
```

### 独立提交

```bash
git add \
  experiences/co-op/seven-piece-duet/README.md \
  experiences/co-op/seven-piece-duet/ATTRIBUTION.md
git commit -m "docs: document seven-piece duet"
```

## 12. 阶段 7：Chrome 与 `file://` 完整验收

### 12.1 自动测试

```bash
node experiences/co-op/seven-piece-duet/geometry.test.js
node experiences/co-op/seven-piece-duet/logic.test.js
node experiences/co-op/seven-piece-duet/tools/generate-targets.mjs --check
npm run verify
git diff --check
```

生成器连续两次输出哈希一致。静态扫描：

```bash
rg -n \
  'fetch\\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|caches\\.|<script[^>]+type=[\"'\"']module|https?://' \
  experiences/co-op/seven-piece-duet
```

远程 URL 只允许存在 README/ATTRIBUTION 的来源链接；运行 HTML/CSS/JS 中不得存在。

### 12.2 Chrome 功能矩阵

逐项保留事实证据：

- 鼠标第一形；
- 键盘第二形；
- 双 Pointer 第三形；
- 综合路径第四形；
- 四局组归属顺序；
- 平行四边形翻面；
- 两席冲突；
- pointercancel / lost capture；
- blur / hidden；
- 迟到 pointerup；
- 本形重开、全部重玩；
- round/match focus 和 live 文案。

### 12.3 视口和模式

- 320×568；
- 390×844；
- 844×390；
- 768×1024；
- 1440×900；
- 200%、400%；
- reduced motion；
- forced colors；
- 断网。

浏览器验证发现 UI 问题时，先归属到 UI/Input 阶段并创建窄修复提交；修复后重跑全矩阵。不要把多项无关修复压成“polish”提交。

### 12.4 `file://`

真实从 Finder 双击：

```text
experiences/co-op/seven-piece-duet/index.html
```

完成四形并核对：

- 控制台零错误；
- Network 零远程请求；
- Application 零存储/缓存/Service Worker；
- 断网不改变结果；
- 复制项目目录到临时位置仍能打开；
- `tools/` 不被运行页面加载。

如果自动化工具不能导航 file URL，只能把 localhost 作为 UI 自动验收，真实双击仍需单独完成。

### 提交

纯验收无变化，不提交。

若有修复，每个相对独立问题单独提交，例如：

```text
fix: cancel stale duet pointer sessions
fix: preserve duet focus after placement
fix: fit duet controls at 320px
```

绝不 amend 先前阶段提交。

## 13. bugs 与 learn 记录

目录使用用户指定位置：

- `/Users/zenith/Desktop/two-of-us/bugs`
- `/Users/zenith/Desktop/two-of-us/learn`

在本 worktree 中对应仓库相对目录 `bugs/`、`learn/`。只有真实内容才创建文件，不预建占位。

### 13.1 Bug 记录条件

当问题：

- 可复现；
- 属于 `seven-piece-duet`；
- 已确认原因；
- 有实际修复和回归证据；

创建：

```text
bugs/YYYY-MM-DD-seven-piece-duet-<slug>.md
```

至少记录环境、复现、原因、错误行为、修复、测试和 commit。与修复同一提交，或在修复后立即独立文档提交。

不记录：

- 短暂命令输入错误；
- 与候选无关的基线失败；
- 未证实猜测；
- 已在测试名中充分表达且没有复用价值的琐碎 typo。

### 13.2 Learn 记录条件

当结论已经通过代码/测试/浏览器证据，且能复用于其他项目时，创建：

```text
learn/YYYY-MM-DD-seven-piece-duet-<topic>.md
```

候选学习主题可能包括：

- 用整数原子三角形避免多边形 epsilon；
- Pointer generation + revision 防迟到提交；
- D4 fingerprint 用于原创固定题面去重；
- 同机席位权限与自然人身份认证的诚实边界。

“可能包括”不是预授权；没有验证就不创建。每份 learn 写清适用条件和不适用范围，避免把项目特例包装成通用规律。

## 14. 最终差异与权利复核

安装前比较：

| 项目 | 必须仍然不同 |
| --- | --- |
| `photo-swap-puzzle` | 无照片、无矩形九宫格、无任意两块交换 |
| `moving-home-together` | 无共享刚体、双端合成、走廊、连续碰撞或松手保持 |
| `dual-maze-race` | 无双盘、竞速、tick、赛程、积分；也不复用“同路”命名 |
| `tethered-heart` | 无心形主视觉、丝带、张力、惯性、危险物或刺绣 |
| `constellation-relay` | 无严格轮流、连边、交叉或无解前缀 |

权利复核：

- `git diff d5e780c...HEAD` 仅有授权路径；
- 搜索上游函数名、文件名、依赖和坐标污染；
- 对照固定 LICENSE 和版权主体；
- README、ATTRIBUTION、TARGETS、实际代码一致；
- 若生成器或实现实际阅读/借用了额外来源，必须补固定来源和边界；
- 不把公开源码误当成素材授权。

## 15. Go / Conditional Go / No-Go

### Go

只有规格第 17 节全部满足，且：

- 精确几何、四目标、golden replay 通过；
- 鼠标、键盘、真实双触控通过；
- 五档视口、缩放、reduced motion、forced colors 通过；
- `file://` 四形、零依赖、零网络、零存储、零权限通过；
- 固定来源、零复制和原创题面链完整；
- `npm run verify`、项目测试和 diff-check 通过；

才可以由总控进入共享集成。

### Conditional Go

任一浏览器、内容审计或真实设备 Gate 尚未有证据时，项目可以保留在分支，但不得加入 catalog 或宣称 installed。

### No-Go

出现以下任一项且无法在首版范围内解决：

- 90° 整数格元无法形成四个自然、可解、互异目标；
- 必须复制上游坐标、题面、代码或素材；
- 必须引入多边形/物理依赖或恢复浮点自由旋转；
- seat owner 在生产 action 中可被绕过；
- 真实双触控、键盘或 320px 无法可信使用；
- `file://` 需要服务器或网络；

则判 No-Go。不要改成竞速、照片拼图、共享刚体或心形牵引来保住项目名；那会变成另一个候选。
