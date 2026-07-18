# “在雾上，写给你”分步实施计划

> 对应调研与规格：[`111-fog-window-letter-research.md`](./111-fog-window-letter-research.md)、[`112-fog-window-letter-spec.md`](./112-fog-window-letter-spec.md)。本计划按“每完成一个项目或一部分就检查并独立提交”执行。

## 1. 执行原则

- 保持 A 级经典脚本、相对路径、`file://` 直开、零新增安装依赖、零公网请求和零持久化；
- 先用 ImageGen 完成桌面 writing、移动 tracing、桌面 complete 三张完整概念和一张无字生产窗景，再写 UI；
- 规则只读取有界整数状态；Canvas、DPR、CSS、rAF、图片和动效只能投影，不能推进完成；
- 第一遍笔迹与第二遍 anchor 命中必须由同一 reducer 管理，不为鼠标、触摸、笔或直接打开建立第二套业务规则；
- 逻辑与前端由两个子任务按不重叠文件所有权实现，主任务审查 API、不变量、视觉 fidelity、目录和最终验收；
- 每个切片先跑定向检查，再确认分支和仓库根目录，只暂存当前切片；
- 实际复现问题记录到 `bugs/`，经测试或浏览器证明的通用结论才进入 `learn/`；
- 有许可证的来源仍默认零复制；无许可证的精确雾窗示例明确排除，不复制代码、参数、素材、GIF、页面或文案；
- 浏览器验证优先使用 Browser/IAB 或 Chrome MCP；不可用时记录原因，再使用仓库允许的 Playwright Chromium，不绕过工具安全策略。

## 2. 提交切片

### P1：定向调研与 Brainstorm

- 文件：`docs/111-fog-window-letter-research.md` 与两级索引；
- 验收：与刮刮卡的产品差异、四方案、双遍同轨迹、固定来源、许可证、排除项、Go/No-Go；
- 提交：`4be41c9 docs: research fog window letter`；
- 状态：已完成。

### P2：可执行规格

- 文件：`docs/112-fog-window-letter-spec.md` 与两级索引；
- 验收：1000×620 整数窗格、点距/长度/bounds、8/160/480 上限、anchor 生成、线段命中、phase 矩阵、generation、direct、阶段 DOM、等价入口、测试矩阵；
- 只读复核：逻辑子任务确认 DIRECT、generation、phase/anchor 派生、抽样、CLEAR 与测试分支无剩余高/中严重度矛盾；
- 提交：`2c5b537 docs: specify fog window letter`；
- 状态：已完成。

### P3：实施计划

- 文件：本文件、`docs/README.md`、根 `README.md`；
- 验收：依赖顺序、资产清单、文件所有权、定向命令、浏览器剧本、bugs/learn、来源和提交边界明确；
- 提交：`docs: plan fog window letter`；
- 状态：进行中。

### P4：视觉概念与生产资产

- 所有者：主任务；
- 必读技能：`imagegen`；
- 文件：
  - `docs/114-fog-window-letter-design.md`；
  - `design/fog-window-letter/concept-desktop-writing.png`；
  - `design/fog-window-letter/concept-mobile-tracing.png`；
  - `design/fog-window-letter/concept-desktop-complete.png`；
  - `experiences/surprises/fog-window-letter/assets/window-evening.jpg`；
- 概念方向：雨夜旧窗、深墨蓝窗外、暖琥珀远灯、冷灰雾面、少量铜色窗扣和真实水汽；亲密、安静、可触摸，不做玻璃拟态 SaaS、霓虹赛博、签名工具或照片编辑器；
- 完整屏要求：标题、说明、雾窗、当前阶段、主动作、清空/直接打开、暂停；complete 显示真实信件层级和重开；
- 生产资产：一张无字、无 UI、无人物、无品牌、无信件的夜窗场景；雾、手写线、露珠 anchor、窗框、控件和文字由代码生成；
- 过程：逐张生成、用 `view_image` 按原生尺寸检查，拒绝乱码、品牌、商业产品视觉、烘焙控件、不可分离信件或过重细节；
- 设计文档：令牌、字体、图标、组件、Canvas 分层、允许文案、移动重排、copy diff、生产资产提示词、至少十项 fidelity ledger 与刻意偏离；
- 提交：`design: define fog window visuals`。

### P5：配置、纯逻辑与测试

- 所有者：逻辑子任务；
- 可写：
  - `experiences/surprises/fog-window-letter/config.js`；
  - `experiences/surprises/fog-window-letter/logic.js`；
  - `experiences/surprises/fog-window-letter/logic.test.js`；
- 禁止触碰：HTML、CSS、app、README、ATTRIBUTION、assets、catalog、根索引；
- 特别要求：
  - 状态、action、view 与配置递归冻结，JSON 往返可继续；
  - anchor 只由 strokes 生成，外部伪造必须被 `assertState` 拒绝；
  - point-to-segment 使用规格整数投影/叉积公式，不读 Canvas；
  - `lastGeneration`、active write、internal endReason、phase 矩阵和 CLEAR/RESTART 精确实现；
  - `composeFogWindowLetter(view)` 保留 5–10 行学习 TODO 与完整默认返回；
  - 测试不少于 110 项，覆盖规格 15 节全部阈值、公式分支、上限、伪造状态和生命周期；
- 验收：`node --check` 三文件、定向测试、`git diff --check`；
- 提交：`feat: add fog window state engine`。

### P6：前端、说明与借鉴声明

- 所有者：前端子任务；
- 可写：
  - `experiences/surprises/fog-window-letter/index.html`；
  - `experiences/surprises/fog-window-letter/styles.css`；
  - `experiences/surprises/fog-window-letter/app.js`；
  - `experiences/surprises/fog-window-letter/README.md`；
  - `experiences/surprises/fog-window-letter/ATTRIBUTION.md`；
  - `experiences/surprises/fog-window-letter/assets/favicon.svg`；
- 禁止修改 P5 文件和 `window-evening.jpg`；只调用冻结公共 API；
- 验收：
  - complete 前 DOM 不存在信件正文，complete 才用节点 + textContent 创建；
  - 单 active Pointer、exact generation、coalesced 可选增强、capture/document 兜底；
  - DPR/resize 从 view 全量重绘，两 Canvas context 失败仍能直接打开；
  - 1280×800、390×844、320×700 首屏、48px 按钮、280px 雾窗、无横向溢出；
  - reduced motion、forced colors、背景缺失、favicon、焦点与 live region；
  - README 与 ATTRIBUTION 固定全部版本、权利主体、仅研究、未复制、无许可证排除与 ImageGen；
- 提交：`feat: add fog window letter experience`。

P5/P6 只在 P4 视觉冻结后启动，可并行。P6 以 112 规格和 P5 导出 API 为唯一接口；任何不一致先交回主任务，不跨文件所有权修补。

### P7：主线程接口审查与定向修复

- 顺序：定向逻辑测试 → 三个生产脚本 `node --check` → 静态边界扫描 → `npm test` → `npm run verify` → `git diff --check`；
- 重点：UMD 加载顺序、config 安全摘要、nextGeneration、active write 重绘、anchor ID 顺序、direct/paused DOM、context 失败、resize/DPR 与信件焦点；
- 无需修复时不创建空提交；每个独立根因最小修复并独立 `fix:` 提交；
- 修复若改变 action、state、数值阈值、phase 或隐私合同，先修订规格再实现。

### P8：目录接入与创意池校准

- 所有者：主任务；
- 文件：`experiences/catalog.json`、门户内嵌目录、`shared/runtime/catalog.test.js`、`docs/40-idea-backlog.md`、根 README、作品/文档索引；
- 目录值：
  - `id: "fog-window-letter"`；
  - `title: "在雾上，写给你"`；
  - `category: "surprise"`；
  - `level: "A"`；
  - `players: "1 人准备，1 人体验"`；
  - `devices: "单设备"`；
  - `installed: true`；
  - `networkRequired: false`；
- Gate：经典脚本、无远程 URL、fetch/storage/media/clipboard/FileReader/innerHTML/random、anchor 规则字面证据、generation、Canvas 降级、48/280px、reduced/forced colors、来源和本地资产；
- 提交：`feat: catalog fog window letter`。

### P9：浏览器实玩与视觉修复

- 所有者：主任务；
- 工具：Chrome MCP / Browser/IAB 优先；不可用时记录原因并用允许的 Playwright Chromium；
- 路径：工具允许时真实 `file://`，另查 localhost 作品与门户；
- 尺寸：1280×800、390×844、320×700，并尽量补概念原生尺寸；
- 阶段：intro、短笔 Gate、ready、tracing 79%/80%、paused、direct complete、traced complete、restart；
- 输入：mouse、touch/pen 模拟、coalesced 有/无、第二指、capture 失败、cancel、lost capture、blur/hidden/Escape/long-frame；
- 降级：阻断生产背景、Canvas context 失败、reduced motion、forced colors；
- 视觉：同轮保存最新浏览器截图并用 `view_image` 对比三张已接受概念；至少五项 fidelity，做首屏 copy diff；
- 每个真实视觉/交互根因独立 `fix:` 提交；临时 QA 文件验收后清理。

### P10：Bug 记录

- 文件：`bugs/YYYY-MM-DD-fog-window-*.md` 与 `bugs/README.md`；
- 每条写环境、复现、预期、实际、根因、解决方案、回归和提交；
- 只记录实际复现的问题，不虚构；
- 修复已先提交时，记录文件另作 `docs:` 提交，并明确关联 commit。

### P11：Learn 沉淀

- 文件：`learn/YYYY-MM-DD-*.md` 与 `learn/README.md`；
- 候选主题：
  - 用第一遍轨迹生成第二遍目标，把自由表达转成确定性 Gate；
  - 以 anchor-to-segment 整数距离抵抗 Pointer 事件频率差异；
  - DPR/resize 只重绘、不改规则的 Canvas 分层；
  - generation 入权威状态，拒绝 pointerId 复用后的迟到事件；
  - 阶段拥有私密 DOM，直接打开与手写完成共享同一内容出口；
- 只沉淀被测试或浏览器证实的结论；独立 `learn:` 提交。

### P12：验收闭环

- 文件：`docs/115-fog-window-letter-verification.md` 与两级索引；
- 内容：测试数字、anchor golden、三档布局、file/localhost、Pointer/lifecycle、DPR/resize、context/背景降级、DOM 隐私、来源、bugs/learn、copy diff、fidelity ledger、刻意偏离、残余限制和完整提交链；
- 同轮 `view_image` 概念与最新截图；若工具安全策略阻止，记录证据范围，不把静态检查冒充像素验收；
- 提交：`docs: verify fog window letter`。

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

## 4. 子任务交接

### 4.1 逻辑子任务

- 必读：111 调研、112 规格、114 设计；
- 可写：config、logic、logic.test；
- 必交：实际测试数、anchor golden、资源上限、完成日志、外部状态拒绝和未覆盖边界；
- 必止：整数算法无法唯一实现、有效 Gate 不能保证 18 anchors、状态必须依赖 Canvas/DOM/时间、或需要改前端文件。

### 4.2 前端子任务

- 必读：111 调研、112 规格、114 设计和 P5 导出；
- 可写：HTML、CSS、app、README、ATTRIBUTION、favicon；
- 必交：语法、静态扫描、三档截图/几何、核心 Pointer 路径、DOM 隐私、context/背景降级和来源检查；
- 必止：公共 API 缺失、必须改 state/config、概念无法在三档实现、或需要加入未批准文案/组件/素材。

## 5. 浏览器实玩剧本

### A：有效笔迹与 ready

1. 点击“开始写”，在雾面点一下并抬起：不能 ready，提示点数；
2. 写一条很长但几乎水平的线：长度可能足够，高度 Gate 仍不通过；
3. 清空后写一个宽高都展开的符号，结束时进入 ready；
4. ready 再落一笔，临时回 writing，抬起后重新 ready；
5. 清空只清内容，下一 generation 继续单调，迟到旧事件不写入。

### B：沿自己的轨迹重走

1. “就写到这里”进入 tracing，原笔迹转成露珠引导；
2. 在笔迹外来回涂抹，hit 不增加；
3. 一条 Pointer 线段跨过多个 anchor，即使中间没有 move 事件也逐一命中；
4. 重复同一段只计一次；79% 不完成，达到 ceil(80%) 的同一 action 完成；
5. 完成卡只在此时创建，标题、正文、落款和重开可读。

### C：Pointer 与 generation

1. pointer 11 开始写，pointer 12 同时按下不能抢占；
2. pointercancel/lost capture 结束当前笔但不伪造额外终点；
3. capture 失败后 document pointerup 仍精确闭合；
4. 下一会话复用 pointerId 11 但 generation +1；旧 ADD/END 不影响新会话；
5. 支持 coalesced 时路径更细，无 coalesced 时同一业务 Gate 仍成立。

### D：暂停、直接打开与重开

1. active write 中 Escape：笔以 pause 闭合，paused 后恢复 writing 或 ready；
2. active trace 中 blur/hidden/long-frame：不增加 hit，恢复 tracing；
3. writing、tracing、paused 各自点击直接打开：全部产生同一完整信，reason=direct；
4. complete 前 DOM 搜索不到默认正文，complete 后出现；
5. “再写一次”恢复与首次 intro 深相等，下一 BEGIN 从 generation 1 开始。

### E：布局与降级

1. 三档尺寸无横向溢出，完整雾窗、状态与主动作在首屏；
2. DPR 1/2/3 与 resize 后 strokes/anchors/hits 摘要不变；
3. 阻断背景只失去窗外图，规则与信件完整；
4. Canvas context 失败时交互面降级并可直接打开；
5. reduced motion/forced colors 下完成路径、焦点、实/空 anchor 和文字进度仍可辨。

## 6. 提交前命令

每片都执行：

```bash
git branch --show-current && git rev-parse --show-toplevel
git status --short
git diff --check
```

代码片另执行：

```bash
node --test experiences/surprises/fog-window-letter/logic.test.js
node --check experiences/surprises/fog-window-letter/config.js
node --check experiences/surprises/fog-window-letter/logic.js
node --check experiences/surprises/fog-window-letter/app.js
npm test
npm run verify
```

只 `git add` 当前切片文件，检查 staged diff，再提交。其他会话或用户改动不暂存、不覆盖。

## 7. 用户可参与但不阻塞的私人代码

P5 会在 `config.js` 准备好 `composeFogWindowLetter(view)` 的函数签名、只读摘要、注释和完整默认实现。准备者之后可以用 5–10 行根据笔画数、横/竖/均衡形态和手写/直接完成方式组合私人结语；不写也能完整运行。

这是有真实产品取舍的创作点：按形态回应会更像“这封信看见了你的手势”，保持统一默认则更克制、也更不暴露轨迹。实现不在当前流程等待用户输入，最终会给出精确文件位置供自愿修改。

## 8. 停止条件

以下情况必须先修订规格或请求方向：

- 需要第三方绘图库、WebGL、模型、远程字体、音频、上传或存储才能成立；
- 完成必须读取 Canvas alpha、DPR、CSS 尺寸、真实时间或动效状态；
- 相同整数日志在不同事件分片下产生不同 anchors/hits；
- active write 无法闭合、generation 不能拒绝迟到事件、伪造 anchors 可通过 assertState；
- 直接打开不能产生与手写完成同样完整的内容；
- complete 前正文必须常驻 DOM 才能实现；
- `file://` 触发 module/fetch/CORS，或背景/Canvas 缺失使接收者永久卡住；
- 视觉必须复制无许可证雾窗项目、签名产品或商业手写工具才能表达。

普通实现 Bug 按单一根因修复并提交；任何阈值、action、state、phase、隐私或来源边界变化先更新规格。
