# “慢一点，也和你一起”分步实施计划

> 对应调研与规格：[`96-same-pace-star-research.md`](./96-same-pace-star-research.md)、[`97-same-pace-star-spec.md`](./97-same-pace-star-spec.md)。本计划严格按“每完成一个项目或一部分就独立提交”执行。

## 1. 执行原则

- 保持 A 级经典脚本、`file://` 直开、零新增安装依赖、零公网请求；
- ImageGen 完整桌面/移动/完成概念与无字生产背景先于 UI 编码；
- 纯逻辑与前端由两个子任务按不重叠文件所有权实现，主任务审查接口并联调；
- 键盘、双 Pointer、正常动画和 reduced-motion 投影到同一 reducer；
- 每个切片先跑定向检查，再确认分支与仓库根目录，只暂存本切片文件；
- 不加入规格外的音频、振动、呼吸预设、健康评估、题库、联网、账号、排行或长期存储；
- 浏览器发现问题时先固定环境与复现，再做最小修复、回归并记录到 `bugs/`；
- `learn/` 只沉淀经过自动测试或浏览器实玩确认的通用结论；
- 来源不明、许可不清或视觉过近时只作原创重写，不复制代码、处方、音频、字体、图标、SVG、论文图表、文案或布局。

## 2. 提交切片

### P1：定向调研

- 文件：`docs/96-same-pace-star-research.md` 与两级索引；
- 验收：四方案 brainstorm、与“同心解锁”的差异、健康措辞、固定来源、许可证、零复制、风险矩阵和 Go/No-Go；
- 提交：`0c087d8 docs: research same pace star`；
- 状态：已完成。

### P2：实现规格

- 文件：`docs/97-same-pace-star-spec.md` 与两级索引；
- 验收：六颗四拍、整数 boundary、物理 inputId、failure priority、release Gate、配置、API、DOM、降动效和验收 Gate；
- 提交：`0f7a936 docs: specify same pace star`；
- 状态：已完成。

### P3：实施计划

- 文件：本文件与两级索引；
- 验收：依赖顺序、文件所有权、检查命令、浏览器场景、bugs/learn 和提交边界明确；
- 提交：独立 `docs:` 提交；
- 状态：进行中。

### P4：视觉概念与原创资产

- 所有者：主任务；
- 文件：
  - `docs/99-same-pace-star-design.md`；
  - `design/same-pace-star/concept-desktop-playing.png`；
  - `design/same-pace-star/concept-mobile-playing.png`；
  - `design/same-pace-star/concept-desktop-complete.png`；
  - `experiences/co-op/same-pace-star/assets/quiet-sky.webp`；
- 过程：使用内置 ImageGen 分别生成三个完整状态概念和一张无字生产背景，逐张 `view_image` 检查并迭代；
- 方向：静谧夜色、靛蓝纸纹、月白与暖金星光、两种不同轮廓的手感光环；避免冥想 App、医疗仪表、心电图、霓虹节奏机、玻璃卡片墙和写实人物；
- 验收：设计令牌、允许文案、组件/图标、容器模型、移动重排、资产提示词、刻意偏离与 fidelity ledger 冻结；
- 提交：`design: define same pace star visuals`。

### P5：纯逻辑、配置与测试

- 所有者：逻辑子任务；
- 可写：
  - `experiences/co-op/same-pace-star/config.js`；
  - `experiences/co-op/same-pace-star/logic.js`；
  - `experiences/co-op/same-pace-star/logic.test.js`；
- 禁止触碰：HTML、CSS、app、README、ATTRIBUTION、assets、catalog、根索引；
- 特别要求：`config.js` 保留规格要求的 5–10 行 `composeSamePaceMessage(view)` 学习 TODO 与完整默认输出；
- 验收：定向逻辑测试不少于 44 项，覆盖 7/8、19/20、23/24 边界、四边沿、左右镜像、双长按失败、release Gate、分片等价、中断、重放与不变性；
- 提交：`feat: add same pace star state engine`。

### P6：前端与作品说明

- 所有者：前端子任务；
- 可写：
  - `experiences/co-op/same-pace-star/index.html`；
  - `experiences/co-op/same-pace-star/styles.css`；
  - `experiences/co-op/same-pace-star/app.js`；
  - `experiences/co-op/same-pace-star/README.md`；
  - `experiences/co-op/same-pace-star/ATTRIBUTION.md`；
  - `experiences/co-op/same-pace-star/assets/favicon.svg`；
- 只调用 P5 规格化公共 API，不修改逻辑/配置/测试或生产背景；
- 验收：七阶段 DOM、A/L、双 pointerId、rAF accumulator、暂停恢复、稳定焦点、live region、reduced-motion、forced-colors、健康短句和完整借鉴声明；
- 提交：`feat: add same pace star experience`。

P5 与 P6 只在 P4 视觉冻结后启动。两者可并行工作，但 P6 的接线必须以 97 规格 API 为唯一契约；接口不一致由主任务审查后作最小兼容修复，子任务不得跨所有权“顺手修改”。

### P7：接口联调与定向修复

- 所有者：主任务；
- 文件：只限真实失败涉及的实现、测试或作品说明；
- 验收顺序：定向逻辑测试 → 三个生产脚本 `node --check` → `npm test` → `npm run verify` → `git diff --check`；
- 无需修复则不创建空提交；每个独立根因单独 `fix:` 提交；
- 同一根因的 `bugs/` 记录可与修复同提交，也可在浏览器验证后独立补齐。

### P8：目录接入与创意池校准

- 所有者：主任务；
- 文件：catalog 数据与测试、`docs/40-idea-backlog.md`、根 README 与作品索引；
- 验收：`category: "co-op"`、`level: "A"`、`installed: true`、`networkRequired: false`；C05 标为已实现；总数、三分类和 A–D 统计同步；
- repository Gate 额外检查经典脚本、无网络/存储/音频、Pointer 生命周期、forced-colors、reduced-motion、健康措辞、借鉴标题和本地资产；
- 提交：`feat: catalog same pace star`。

### P9：浏览器实玩与视觉修复

- 所有者：主任务；
- 使用 Chrome MCP；不可用或不可靠时记录原因并回退仓库现有 Playwright 路径；
- 路径：真正 `file://`，再跑 localhost 作品与门户；
- 尺寸：1504×1046、390×844、320×700；
- 状态：intro、playing、release-gate、ready、measure-complete、paused、complete；
- 核心：键盘六颗、双 Pointer 左右各领拍、7/8 和 19/20 边界、早按、错席、提前松手、持续双按、重试、重开；
- 生命周期：Escape、blur、hidden、stalled、pointercancel、lost capture、document pointerup 与明确恢复；
- 降级：背景缺失、CSS 动画禁用、reduced-motion、forced-colors；
- 截图：`docs/assets/same-pace-star/`；临时 QA 产物放 `output/playwright/` 并在验收前清理；
- 每个真实根因独立 `fix:` 提交；没有修复不创建提交。

### P10：bug 记录

- 文件：`bugs/YYYY-MM-DD-same-pace-star-*.md` 与 `bugs/README.md`；
- 每条包含环境、复现、期望、实际、根因、修复、回归和 commit；
- 只记录真实复现的问题，不为了满足目录要求虚构 bug；
- 提交：与对应修复同提交，或独立 `docs:` 提交。

### P11：学习沉淀

- 文件：`learn/YYYY-MM-DD-*.md` 与 `learn/README.md`；
- 候选主题：
  - 逐 boundary 消费整数 tick，保持大帧与小帧分片等价；
  - 先同步物理 inputId、再裁决业务动作，避免错误路径卡键；
  - 用四个输入边沿防止“双键一直压住”穿透合作玩法；
  - 为节奏玩法设计正常动画、降动效、非颜色和无音频的同规则投影；
  - 在温柔合作 UI 中分离结构化失败原因与不责备的可见反馈；
- 只沉淀经测试/浏览器实玩确认的结论；
- 每个独立主题用一个 `learn:` 提交。

### P12：验收闭环

- 文件：`docs/100-same-pace-star-verification.md` 与两级索引，必要时更新创意池统计；
- 内容：命令结果、三档尺寸、file/localhost、六颗实玩、输入/生命周期/动效/资产降级、VoiceOver 限制、copy diff、fidelity ledger、刻意偏离、残余风险与完整提交链；
- 同一 QA 轮使用 `view_image` 查看三个概念和最新三档截图；
- 提交：`docs: verify same pace star`。

## 3. 依赖图

```text
P1 调研 → P2 规格 → P3 计划 → P4 视觉与资产
                                  ↓
                       P5 逻辑 ───┐
                                  ├→ P7 联调 → P8 目录 → P9 浏览器
                       P6 前端 ───┘                    ↓
                                                   P10 bugs
                                                   P11 learn
                                                      ↓
                                                   P12 验收
```

## 4. 子任务交接契约

### 4.1 逻辑子任务收到

- 必读：96 调研、97 规格、99 设计；
- 可写：config/logic/logic.test 三个文件；
- 必交：实际测试数字、未覆盖边界和提交 hash；
- 必止：API 需要变化、boundary 顺序矛盾、必须读取 DOM/真实时钟/动画/随机数，或需要改前端文件。

### 4.2 前端子任务收到

- 必读：96 调研、97 规格、99 设计与 P5 公共 API 契约；
- 可写：HTML/CSS/app/README/ATTRIBUTION/favicon；
- 必交：语法检查、定向测试、外部资源扫描和提交 hash；
- 必止：逻辑 API 缺失、必须改配置/状态机、两个 Pointer 无法接线、概念无法在三档尺寸实现，或需要新增规格外文案/组件。

## 5. 浏览器实玩脚本

### 场景 A：键盘完整路径

1. 点击“开始接光”，第 1 颗进入左领拍 step 0；
2. tick 8 按 A，边界后 tick 8 按 L；下一拍 tick 8 松 A；最后一拍 tick 8 松 L；
3. 检查第 1 颗只追加一次并进入 measure-complete；
4. 点击“下一颗”，右席领拍，按 L → A → 松 L → 松 A；
5. 继续完成六颗，左右各领拍三次，终局 completed 恰好 6 条；
6. “再来一次”回 intro，活动输入、时间与完成记录清空。

### 场景 B：边界、错误与防穿透

1. 在 tick 7 按期望键，检查 early-edge 与 release-gate；全部松开后重试；
2. 在 tick 8 和 tick 19 分别按，均接受；跨 tick 20 未按则 missed-edge；
3. 领拍正确后，对方在下一 step 之前早按，检查 wrong-seat；
4. 两边正确按住后，领拍在释放 step 开窗前松手，检查 released-early；
5. 从开局持续压住 A+L 并推进大量 tick，不能点亮星；
6. release-gate 中只松一边仍等待，双方都松才出现“再试这颗”。

### 场景 C：双 Pointer

1. 手机尺寸用 pointer 11/12 分别占左右 pad，完成左领拍一颗；
2. 下一颗交换右领拍，动作数与窗口一致；
3. 同一 pointerId 尝试占两席，只允许第一次登记；
4. pointercancel、lostpointercapture 与 document pointerup 均精确释放；
5. 迟到的旧 pointerup 不得释放新 pointer；合成 click 不派发第二次 PRESS。

### 场景 D：暂停与生命周期

1. playing 中按住一边后 Escape，检查 paused 且 active/step 余量清空；
2. 继续后进入 ready/retry，不从半拍继续；
3. measure-complete 时 blur，返回后仍保留已完成星与“下一颗”；
4. hidden 与 >500ms stalled 重复清理，均不补算后台 tick；
5. 普通 TICK 不重建 pad，当前焦点与 live region 保持稳定。

### 场景 E：动效、资产与语义降级

1. reduced-motion 下完成左右各领拍一颗，四格离散轨与默认规则一致；
2. forced-colors 下检查边框、焦点、active、当前拍与完成星可辨；
3. 阻断生产背景，CSS fallback 仍保留全部动作与进度；
4. 禁用 CSS animation，完整六颗仍可完成；
5. VoiceOver 检查步骤、失败、暂停与完成只在阶段变化播报，不逐 tick 刷屏；
6. 检查首屏明确“不需要配合真实呼吸”，全页没有健康效果承诺。

## 6. 每次提交前检查

```bash
git branch --show-current && git rev-parse --show-toplevel
git status --short
git diff --check
```

然后只 `git add` 当前切片文件，检查 `git diff --cached --stat` 与 `git diff --cached`，再提交。其他会话或用户改动保持未暂存，不混入当前提交。

## 7. 停止条件

以下情况必须先修订规格或请求方向：

- 需要复制许可证不明、非商业或 proprietary 来源的代码/素材；
- 需要第三方健康处方、音频、字体、图片或新运行包才能成立；
- 规则必须读取 DOM、CSS、真实时钟、动效状态或随机数；
- 同一 inputId 能占两席，持续双按能够通关，或错误路径无法可靠松手；
- file 直开触发 module/fetch/CORS，或背景缺失使玩法无法继续；
- 刷新率、后台时长、reduced-motion 或 Pointer 类型改变规则结果；
- 文案要求玩家改变真实呼吸，或声称任何健康、生理同步与治疗效果；
- 视觉概念与 56px、三档布局、forced-colors 无法同时满足且需要改变核心结构。

小型实现 bug 可按根因定向修复并提交；任何规则、状态、公开 API、健康边界或用户流程变化必须先更新规格。
