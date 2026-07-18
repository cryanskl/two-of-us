# “一起，把家搬进来”分步实施计划

> 对应调研与规格：[`106-moving-home-together-research.md`](./106-moving-home-together-research.md)、[`107-moving-home-together-spec.md`](./107-moving-home-together-spec.md)。本计划严格按“每完成一个项目或一部分就测试并独立提交”执行。

## 1. 执行原则

- 保持 A 级经典脚本、相对路径、`file://` 直开、零新增安装依赖和零公网请求；
- 先使用 ImageGen 完成桌面进行、移动进行、桌面完成三个完整概念与一张无字生产背景，再开始 UI 编码；
- 纯逻辑和前端由两个子任务按不重叠文件所有权实现，主任务负责 API 审查、联调、目录和最终验收；
- 键盘、双 Pointer、rAF、暂停、reduced-motion 都只产生相同 reducer action，不建立第二套规则；
- 固定地图必须由生产 action golden replay 证明可达，不能用测试专用传送、内部状态写入或关闭碰撞；
- 每个切片先跑定向检查，再确认分支与仓库根目录，只暂存该切片文件；
- 浏览器发现真实问题时先记录环境与复现，再按单一根因最小修复并提交；
- `bugs/` 只记录实际复现的问题，`learn/` 只沉淀经自动测试或浏览器实玩确认的通用结论；
- 来源不明、许可不清或视觉过近时只作原创重写，不复制代码、API、参数、关卡、图形、音频、字体、截图、文案或布局。

## 2. 提交切片

### P1：定向调研

- 文件：`docs/106-moving-home-together-research.md` 与两级索引；
- 验收：四方案 brainstorm、家具与 couch co-op 语义拆分、整数运动学、固定来源、许可证、零复制与 Go/No-Go；
- 提交：`59633b9 docs: research moving home together`；
- 状态：已完成。

### P2：可执行规格

- 文件：`docs/107-moving-home-together-spec.md`；
- 验收：256 格方向表、输入合成、S 形地图、四轴 Gate、微步、终点、生命周期、API、DOM 与验收矩阵；
- 证据：用规格 SAT 公式扫描 1503 个安全姿态，两个转身中心各覆盖完整 256 角度；
- 提交：`c24bc01 docs: specify moving home together`；
- 文件契约修正：`ee69ae4 docs: align moving home file contract`；
- 状态：已完成。

### P3：实施计划

- 文件：本文件、`docs/README.md`、根 `README.md`；
- 验收：依赖顺序、文件所有权、测试命令、浏览器剧本、bugs/learn、来源和提交边界明确；
- 提交：独立 `docs:` 提交；
- 状态：进行中。

### P4：视觉概念与原创资产

- 所有者：主任务；
- 必读技能：`imagegen`；
- 文件：
  - `docs/109-moving-home-together-design.md`；
  - `design/moving-home-together/concept-desktop-playing.png`；
  - `design/moving-home-together/concept-mobile-playing.png`；
  - `design/moving-home-together/concept-desktop-complete.png`；
  - `experiences/co-op/moving-home-together/assets/moving-day-paper.jpg`；
- 过程：先生成三个完整状态概念，再生成无字、可裁切的生产背景；每张用 `view_image` 检查，不接受可读乱码、第三方品牌、商业游戏造型或把控件烘焙进背景；
- 方向：俯视纸艺搬家平面图、亚麻米白、陶土红沙发、鼠尾草绿目标地毯、石墨墙线、黄铜路线针；亲密、轻松、有手作感，不做商业搬家游戏海报、3D 写实、公寓地产图、玻璃拟态或霓虹街机；
- 验收：设计令牌、允许文案、组件、图标、容器模型、移动重排、资产提示词、素材尺寸、fidelity ledger 与刻意偏离冻结；
- 提交：`design: define moving home visuals`。

### P5：纯逻辑、配置与测试

- 所有者：逻辑子任务；
- 可写：
  - `experiences/co-op/moving-home-together/config.js`；
  - `experiences/co-op/moving-home-together/logic.js`；
  - `experiences/co-op/moving-home-together/logic.test.js`；
- 禁止触碰：HTML、CSS、app、README、ATTRIBUTION、assets、catalog、根索引；
- 特别要求：
  - 256 项角度表是提交字面量，运行期无 `Math.sin/Math.cos`；
  - 所有 reducer 状态保持整数、可序列化、可深相等；
  - golden replay 只使用公开 action，从初态走到完整完成；
  - `config.js` 保留一个 5–10 行、带完整默认结果的 `composeMovingHomeMessage(view)` 学习 TODO，让用户可自行改最终落款，不改也能完整游玩；
- 验收：定向逻辑测试不少于 60 项，覆盖输入 Gate、八向合成、跨 0 角、SAT 边界、六障碍、微步、路线、目标、12 tick、生命周期、重放、帧分片和不变性；
- 提交：`feat: add moving home state engine`。

### P6：前端与作品说明

- 所有者：前端子任务；
- 可写：
  - `experiences/co-op/moving-home-together/index.html`；
  - `experiences/co-op/moving-home-together/styles.css`；
  - `experiences/co-op/moving-home-together/app.js`；
  - `experiences/co-op/moving-home-together/README.md`；
  - `experiences/co-op/moving-home-together/ATTRIBUTION.md`；
  - `experiences/co-op/moving-home-together/assets/favicon.svg`；
- 只调用 P5 规格化公共 API，不修改逻辑、配置、测试或 ImageGen 生产背景；
- 验收：SVG 场景、WASD/方向键、两个独立 Pointer 盘、死区与八向量化、rAF accumulator、暂停恢复、焦点、live region、reduced-motion、forced-colors、三档布局、个性化说明和完整借鉴声明；
- 提交：`feat: add moving home experience`。

P5 与 P6 只在 P4 视觉冻结后启动。两者可并行，但 P6 接线以 107 规格的 action/state 契约为唯一接口；接口矛盾由主任务先修规格或作最小兼容修复，子任务不得越过文件所有权“顺手修改”。

### P7：接口联调与定向修复

- 所有者：主任务；
- 文件：只限真实失败涉及的实现、测试或作品说明；
- 验收顺序：定向逻辑测试 → 三个生产脚本 `node --check` → `npm test` → `npm run verify` → `git diff --check`；
- 重点：全局命名空间加载顺序、config 默认回退、state 到 SVG 投影、碰撞提示节流、Pointer 会话 generation 和暂停时 accumulator 清理；
- 无需修复则不创建空提交；每个独立根因使用独立 `fix:` 提交。

### P8：目录接入与创意池校准

- 所有者：主任务；
- 文件：`experiences/catalog.json`、`shared/runtime/catalog.test.js`、`docs/40-idea-backlog.md`、根 README、作品索引；
- 目录值：
  - `id: "moving-home-together"`；
  - `category: "co-op"`；
  - `level: "A"`；
  - `players: "2 人合作"`；
  - `devices: "单设备同屏"`；
  - `installed: true`；
  - `networkRequired: false`；
- Gate：经典脚本、无外链、无 fetch/存储/音频/随机数、角度表字面量、Pointer 生命周期、forced-colors、reduced-motion、借鉴标题和本地资产；
- 提交：`feat: catalog moving home together`。

### P9：浏览器实玩与视觉修复

- 所有者：主任务；
- 工具顺序：Chrome MCP 的真实浏览器验证；若安全边界不允许 `file://`，记录限制并回退仓库既有本机服务和 Playwright 路径，不尝试绕过；
- 路径：真实 `file://`（工具允许时）、localhost 作品、localhost 门户；
- 尺寸：1280×800、390×844、320×700；
- 状态：intro、门厅、转角、客厅、collision、paused、complete；
- 核心：键盘完整路线、双 Pointer 同时输入、第三指、死区、碰撞停止、双方松手 11/12 tick、重开；
- 生命周期：Escape、blur、hidden、long-frame、pointercancel、lost capture、document pointerup 与显式恢复；
- 降级：生产背景缺失、CSS animation 禁用、reduced-motion、forced-colors；
- 截图：`docs/assets/moving-home-together/`；临时 QA 文件放 `output/playwright/`，验收前清理；
- 每个真实根因独立 `fix:` 提交，没有修复不创建提交。

### P10：bug 记录

- 文件：`bugs/YYYY-MM-DD-moving-home-together-*.md` 与 `bugs/README.md`；
- 每条包含环境、复现、期望、实际、根因、修复、回归和 commit；
- 只记录实际复现问题，不为满足目录要求虚构 bug；
- 提交：与对应修复同提交，或浏览器确认后独立 `docs:` 提交。

### P11：学习沉淀

- 文件：`learn/YYYY-MM-DD-*.md` 与 `learn/README.md`；
- 候选主题：
  - 用四个投影轴和定标整数实现单 OBB 对静态 AABB 的可重放 Gate；
  - 用“双方非零”作为 reducer 规则，而不是 UI 提示，保证合作必要性；
  - 用 production-action golden replay 同时证明固定地图可达、无穿透和终点可结算；
  - 用唯一 Pointer 会话 generation 防止 pointerId 复用与迟到 release；
  - 把背景视觉、SVG 投影和整数权威状态分层，使资源/动效降级不改变玩法；
- 只沉淀经测试或浏览器实玩确认的结论；每个独立主题使用一个 `learn:` 提交。

### P12：验收闭环

- 文件：`docs/110-moving-home-together-verification.md` 与两级索引，必要时更新创意池统计；
- 内容：命令结果、三档尺寸、file/localhost、golden replay、键盘/双 Pointer、生命周期、降级、来源、copy diff、fidelity ledger、刻意偏离、残余风险和完整提交链；
- 同一 QA 轮用 `view_image` 查看已接受的完整概念与最新浏览器截图，按原生尺寸至少比较布局、层级、颜色、形状、控件位置、状态表达、文案和移动重排八项；
- 提交：`docs: verify moving home together`。

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

- 必读：106 调研、107 规格、109 设计；
- 可写：config、logic、logic.test 三个文件；
- 必交：实际测试数字、golden replay 长度、路线关键姿态、未覆盖边界和提交 hash；
- 必止：API 需要变化、整数公式矛盾、地图无法以公开 action 到达、必须读取 DOM/真实时钟/动画/随机数，或需要修改前端文件。

### 4.2 前端子任务收到

- 必读：106 调研、107 规格、109 设计；
- 可写：HTML、CSS、app、README、ATTRIBUTION、favicon；
- 必交：语法检查、外部资源扫描、DOM/样式静态 Gate、三档布局自查和提交 hash；
- 必止：逻辑 API 缺失、必须修改 config/state、两个 Pointer 无法独立接线、概念无法在三档尺寸实现，或需要新增规格外文案/组件。

## 5. 浏览器实玩剧本

### 场景 A：键盘完整路线

1. 点击“开始一起搬”，左侧按 D、右侧按 →，把沙发横移到中央 `x≈500`；
2. 顺时针转到竖直：先左 W / 右 ↓，中段改左 W+D / 右 ↓+←，末段改左 D / 右 ←；
3. 左 W、右 ↑，沿中央通道上移到 `y≈160`；
4. 逆时针转回水平：先左 A / 右 →，中段改左 S+A / 右 ↑+→，末段改左 S / 右 ↑；
5. 左 D、右 →，移进客厅地毯；双方松手，检查第 11 tick 未完成、第 12 tick 完成；
6. “再搬一次”回到 intro，姿态、输入、路线、碰撞与完成计数深相等。

### 场景 B：合作 Gate 与碰撞

1. 只按左 D，姿态不动且提示“还差右边”；只按右 → 同理；
2. 两边同向平移、反向旋转、混合输入同时平移和小角转动；
3. 从门厅直接顶左上封闭区，碰撞只停住并出现中性提示，不回弹、不扣分；
4. 在窄门斜着尝试穿过，所有接受姿态都不侵入障碍；
5. 目标中检查中心已进入但角点越界、角度超过 2 格、仍有输入和保持不足都不完成。

### 场景 C：双 Pointer

1. 手机尺寸用 pointer 11/12 分别占左右盘，同向拖动，两盘都显示各自方向且沙发移动；
2. 交换两指按下顺序，结果一致；第三指不抢占任一盘；
3. 各盘拖进 18% 中心死区，只释放该侧 reducer 输入，但继续保留 pointer capture；
4. `pointercancel`、`lostpointercapture` 和 document pointerup 精确释放；
5. 复用同一 pointerId 时，旧 generation 的迟到 release 不得释放新会话。

### 场景 D：暂停与生命周期

1. playing 中按住双方后 Escape，检查 paused、heldInputs 清空且 pose 保留；
2. “继续一起搬”后第一帧不补 tick；
3. blur、hidden 与 >250ms long-frame 分别暂停，均不追算后台时间；
4. 正常 accumulator 一帧最多 5 tick，超过上限进入 long-frame pause；
5. 普通 TICK 不重建触控盘，键盘焦点和 live region 保持稳定。

### 场景 E：视觉、动效与资源降级

1. 1280×800、390×844、320×700 都能看到场景、路线提示、两盘入口和暂停；
2. reduced-motion 下完成路线，逻辑与默认模式一致；
3. forced-colors 下墙、沙发、地毯、方向、碰撞和焦点均可区分；
4. 阻断生产背景或禁用 CSS animation，仍可完成整个游戏；
5. 检查 live region 只在阶段、碰撞节流、暂停和完成时播报，不逐 tick 刷坐标。

## 6. 每次提交前检查

```bash
git branch --show-current && git rev-parse --show-toplevel
git status --short
git diff --check
```

代码切片另跑：

```bash
node --test experiences/co-op/moving-home-together/logic.test.js
node --check experiences/co-op/moving-home-together/config.js
node --check experiences/co-op/moving-home-together/logic.js
node --check experiences/co-op/moving-home-together/app.js
npm test
npm run verify
```

然后只 `git add` 当前切片文件，检查暂存内容，再提交。其他会话或用户改动保持未暂存，不混入当前提交。

## 7. 停止条件

以下情况必须先修订规格或请求方向：

- 需要复制许可证不明、非商业或 proprietary 来源的代码/素材；
- 需要第三方物理引擎、字体、音频、图片或新运行包才能成立；
- 规则必须读取 DOM、CSS、真实时钟、动效状态或随机数；
- 单侧能移动、同一 pointer 会话占两盘、旧 release 能清掉新会话，或隐藏页面补算；
- golden replay 只能靠测试传送、关闭碰撞或直接写内部状态完成；
- 已接受姿态会侵入障碍，或不同渲染分片产生不同权威终态；
- `file://` 触发 module/fetch/CORS，或背景缺失使玩法无法继续；
- 视觉需要借用商业搬家游戏名称、家具造型、地图、图标、截图或文案才能表达。

小型实现 bug 可按单一根因定向修复并提交；任何规则、地图、状态、公开 API、输入边界或完成条件变化必须先更新规格。
