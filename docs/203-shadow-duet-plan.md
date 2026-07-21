# A 级“把影子，跳成我们”分步实施计划

- 日期：2026-07-21
- 状态：执行中；纯逻辑可先行，生产 UI 等待 ImageGen 概念与用户确认
- 对应调研与 Brainstorm：[171-shadow-duet-research.md](./171-shadow-duet-research.md)
- 对应规格：[172-shadow-duet-spec.md](./172-shadow-duet-spec.md)
- 目标目录：`experiences/co-op/shadow-duet/`
- 启动等级：A（`file://` 直开、零安装、零公网、零第三方运行依赖）

## 1. 当前决策

171 已完成 brainstorm：摄像头姿态识别、自由关节拖动和音游谱面均被排除，正式方向是公开目标的双席定格舞。172 已冻结四姿势、六幕、30Hz 整数 tick、`[48,61]` 定格窗、连续 6 tick 成功、持有栈、七阶段 reducer、配置、DOM、输入与验收合同。

因此本轮不重复发明玩法，直接按“纯规则先行、视觉后置”的边界实施：

1. 先完成不依赖 DOM/RAF/图片的 `logic.js + config.js + logic.test.js`；
2. 再写完整 ImageGen 视觉简报，生成并逐张审阅完整状态；
3. 只有用户接受概念后，才实现生产 DOM、输入、样式和生成资产；
4. 最后登记 catalog、来源、bugs/learn 与浏览器证据。

## 2. 独立提交边界

用户要求每完成一个项目或一部分就提交一次。本作按以下边界独立提交：

1. 171 定向调研/brainstorm：已提交；
2. 172 可执行规格：已提交；
3. 本实施计划与索引：独立提交；
4. `config.js + logic.js + logic.test.js`：独立提交；
5. ImageGen 完整状态简报：独立提交；
6. 概念生成台账、原图与设计提案：独立提交；
7. 用户接受后的 design-system inventory：独立提交；
8. semantic DOM、键盘/Pointer、RAF、焦点与 live：独立提交；
9. styles、响应式、reduced-motion、forced-colors 与资产降级：独立提交；
10. README、ATTRIBUTION、favicon、catalog 与分类索引：按职责独立提交；
11. 每个独立 bug：失败回归、修复与 `bugs/` 记录放在同一提交；
12. 有跨项目证据的知识点：实现/测试与 `learn/` 记录独立提交；
13. 最终浏览器验收与验证报告：独立提交。

每次提交前固定运行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

本轮记录的预期 worktree 是 `/Users/zenith/Desktop/two-of-us`，当前预期分支是任务开始时实测的 `main`。每次提交都必须重新确认当前分支/worktree 与当时任务目标一致；若主线程后来有意切到别的任务分支，以更新后的明确记录为准，不能把 `main` 当永久条件。子任务不暂存、不提交；主线程审阅、测试并提交。

### 2.1 子任务、所有权与前置依赖

| 角色 | 只读输入 | 唯一可写路径 | 前置依赖 | 提交者 |
| --- | --- | --- | --- | --- |
| 规则实现子任务 | 171、172、203、相邻逻辑实现 | `experiences/co-op/shadow-duet/config.js`、`logic.js`、`logic.test.js` | 203 已提交 | 主线程审阅后提交 |
| 视觉简报子任务 | 171、172、203、前端构建/ImageGen 指令 | `docs/204-shadow-duet-imagegen-brief.md` | 规则合同冻结；不要求 UI 代码 | 主线程审阅后提交 |
| 概念与台账子任务 | 204、统一图像偏好 | `docs/assets/shadow-duet/*`、`docs/205-shadow-duet-design-proposal.md` | 用户确认图像工具/清晰度/配置范围 | 主线程逐图审阅后提交 |
| 设计冻结子任务 | 用户接受的 205 原图 | `docs/205-shadow-duet-design-proposal.md` 的状态与 design-system inventory | 用户明确接受概念 | 主线程提交 |
| DOM/输入子任务 | 171–172、203–205、已提交 logic API | `experiences/co-op/shadow-duet/index.html`、`app.js` | 视觉已接受、logic 已提交 | 主线程用 Chrome 验证后提交 |
| 样式/资产子任务 | 接受概念、已提交 DOM | `experiences/co-op/shadow-duet/style.css`、`experiences/co-op/shadow-duet/assets/*` | DOM/输入已提交 | 主线程用 Chrome 与 `view_image` 验证后提交 |
| 体验文档子任务 | 已完成体验与四项固定来源 | `experiences/co-op/shadow-duet/README.md`、`ATTRIBUTION.md` | UI/styles 已提交 | 主线程提交 |
| 共享登记与最终报告 | 完整体验、实测数字与浏览器证据 | `experiences/catalog.json`、`index.html`、`experiences/co-op/README.md`、`README.md`、`docs/README.md`、`docs/40-idea-backlog.md`、`shared/runtime/catalog.test.js`、`docs/206-shadow-duet-verification.md` | 其余阶段提交完成 | 仅主线程串行写与提交 |

同一时刻不并发修改重叠文件。`docs/205` 在“生成提案”和“用户接受后冻结”两个阶段串行修改；共享登记永远最后由主线程处理。bugs/learn 只有真实问题或跨项目证据出现时才另行分配唯一文件并串行提交。

## 3. 子任务 A：配置、纯规则与 oracle 测试

唯一可写文件：

```text
experiences/co-op/shadow-duet/config.js
experiences/co-op/shadow-duet/logic.js
experiences/co-op/shadow-duet/logic.test.js
```

职责：

- classic browser global/CommonJS 双出口，加载顺序 `logic.js → config.js → app.js`；
- 精确冻结 `SEATS / POSES / SCENES / tick` 合同，并在模块加载时自检；
- 使用捕获的 intrinsic 与 own-data descriptor snapshot 处理 hostile object、Array/Proxy、污染原型和 late throw；
- 原子配置回退、Unicode 字素席位名、延迟 completion composer 与 thenable/异常/超长防护；
- canonical 七阶段状态、精确 action schema、revision/attempt headroom 与 malformed-state 安全初态；
- 每席去重持有栈、释放回退、跨席隔离与 `SUSPEND`；
- `STEP 1..5` 逐 tick 结算，证明 48–53、56–61、57–61 与 tick 62 边界；
- 六幕失败/重试/完成/重开、双席必要性、JSON action-log 重放与冻结 public view；
- 独立 oracle 不能调用生产 reducer 来证明合作必要性和 tick 边界；
- 生产逻辑不访问 DOM、RAF、Date、performance、timer、random、network、storage、audio、camera、model 或 runtime hook；
- 不创建 UI、资产、README、ATTRIBUTION、catalog、bugs 或 learn。

完成 Gate：

```bash
node --check experiences/co-op/shadow-duet/logic.js
node --check experiences/co-op/shadow-duet/config.js
node --test experiences/co-op/shadow-duet/logic.test.js
npm test
npm run verify
git diff --check
```

## 4. 子任务 B：完整视觉概念

使用前端构建与 ImageGen 流程，先写 `docs/204-shadow-duet-imagegen-brief.md`，再把原图/生成台账保存在 `docs/assets/shadow-duet/`，并用 `docs/205-shadow-duet-design-proposal.md` 汇总提案。简报覆盖全部主要状态，而不是只画一个舞台 hero。至少单独概念化：

- desktop intro；
- desktop scene-intro；
- desktop dancing 准备区；
- desktop dancing 定格窗；
- desktop pose-result；
- desktop missed；
- desktop act-result；
- desktop complete；
- 390×844 双触控进行态；
- 320×568 missed/无 JavaScript；
- 844×390 进行态；
- reduced-motion、forced-colors 与图片阻断。

所有文字、键位、按钮、稳定计数和结果日志必须 code-native；生成图只承担无字纸幕背景与八姿势剪影。概念接受前不得创建生产 `index.html/app.js/style.css`。

生成台账逐图记录 prompt、工具、模型暴露状态、日期、原生尺寸、格式、SHA-256、第三方输入“无”、处理链、用途和运行时状态。任何第三方人物、品牌、截图、字体或素材都不得作为 ImageGen 输入。

完成 Gate：

```text
1. 简报阶段：本地链接、允许文案、状态数量、阶段隐私、git diff --check、npm test、npm run verify。
2. 概念阶段：每张原图用 view_image(detail="original")；尺寸与 SHA-256 对上 GENERATION.md/205；无第三方输入。
3. 接受阶段：用户明确接受；design-system inventory、允许文案、资产清单和至少五项 fidelity ledger 冻结。
```

每个 Gate 通过后才提交对应部分；概念接受前继续禁止生产 UI。

## 5. 子任务 C：semantic DOM、输入与规则时钟

视觉接受后串行写：

```text
experiences/co-op/shadow-duet/index.html
experiences/co-op/shadow-duet/app.js
```

职责：

- phase-owned DOM，不用 hidden/template 预置未来完成内容；
- 页面只消费 `getPublicView()`，不复制姿势、六幕、tick、成功谓词、attempt 或 summary；
- 两个 fieldset、八个稳定原生按钮、`aria-pressed`、当前姿势与目标等价文本；
- `keydown/keyup` 使用固定 `KeyboardEvent.code`，过滤 repeat/modifier/composing/editable；
- Pointer ID → seat/pose 映射；pointerdown 先成功 `setPointerCapture`，若它抛错则先安装该 pointer ID 专属的 document up/cancel fallback，只有 capture 或 fallback 建立成功后才派 `PRESS`；二者都失败则不改规则状态；
- up/cancel/lostcapture 共用幂等清理：先原子取出并删除 pointer 映射，再派唯一 `RELEASE`，随后释放 capture/移除 fallback；迟到或重复事件 no-op，click 不重复提交；
- 单一 RAF 所有权与 accumulator：阶段进入只启动一条循环，阶段退出/暂停取消；首帧只建基准；timestamp 非有限或倒退时重置基准且不派 STEP；
- 每帧最多派 `STEP {ticks:5}`，长帧超额部分丢弃并重置基准；SUSPEND 后的迟到回调 no-op，恢复只建新基准、不追后台时间；
- blur/hidden/pagehide 共用幂等输入清理并派一次 `SUSPEND`；
- render 后用 token 化 microtask 安排标题焦点，防止旧阶段焦点迟到；
- live 只播窗口开始、成功、失败、暂停、换幕和完成，不逐 tick 播报；
- no-JS 页面不伪造舞台进行态或完成记录。

浏览器适配层不得用 DOM 坐标、CSS animation、图片帧、音频或现实时间裁决胜负。

完成 Gate：

```bash
node --check experiences/co-op/shadow-duet/app.js
node --test experiences/co-op/shadow-duet/logic.test.js
npm test
npm run verify
git diff --check
```

此外必须用 Chrome MCP 验证 intro→scene-intro→dancing、纯键盘、双 pointer、capture throw fallback、up/cancel/lostcapture 竞态、暂停/恢复与一次成功/失败。用可控 RAF/clock 浏览器夹具验证首帧、非法/倒退 timestamp、长帧最多 5 tick、无双循环、退出后无迟到 STEP；发现问题先补可重复回归再提交。

## 6. 子任务 D：样式、资产与降级

接受概念后写：

```text
experiences/co-op/shadow-duet/style.css
experiences/co-op/shadow-duet/assets/*
```

职责：

- 从接受概念提取并冻结颜色、字体、spacing、container、舞台比例、按钮族、focus 与响应式 token；
- 生成无字背景与八姿势剪影时固定左右朝向，逐格原尺寸审阅；
- 图片阻断时用原创 CSS 轮廓、姿势中文与目标文本完整完成六幕；
- 1504×1046、1280×800、844×390、390×844、320×568、200% text 与 400% zoom；
- 八按钮中心 `elementFromPoint()` 命中归属，触控按钮至少 44×44px、主动作至少 48px；
- reduced-motion 只移除表现位移/闪动，不改变 30Hz 规则；
- forced-colors 使用系统色、真实 border/outline、文字与虚实线表达两席/窗口；
- 零横向溢出、焦点环不裁切、图片/字体/资产失败无规则损失。

完成 Gate：

```bash
node --check experiences/co-op/shadow-duet/app.js
node --test experiences/co-op/shadow-duet/logic.test.js
npm test
npm run verify
git diff --check
```

每次样式/资产改动后用 Chrome MCP 验证五档视口、200/400%、reduced-motion、forced-colors、图片阻断、八按钮尺寸/命中和零横溢；同一 QA pass 对接受概念与最新浏览器截图执行 `view_image(detail="original")`，写入 fidelity ledger 后才提交。

## 7. 子任务 E：文档、归因与目录登记

生产体验完成后写：

```text
experiences/co-op/shadow-duet/README.md
experiences/co-op/shadow-duet/ATTRIBUTION.md
experiences/catalog.json
index.html
experiences/co-op/README.md
README.md
docs/README.md
docs/40-idea-backlog.md
shared/runtime/catalog.test.js
docs/206-shadow-duet-verification.md
```

并按现有 catalog 结构更新门户、co-op 索引、根 README、docs 索引与创意池。README/ATTRIBUTION 必须分别写明：

- 规则、六幕、数值、状态机、代码、中文文案与资产独立实现；
- Bemuse、osu!、PixiJS、MediaPipe 的固定 commit、许可证、版权与只研究范围；
- 未复制/翻译/链接/打包源码、算法表达、判定参数、谱面、模型、WASM、资源、品牌、UI 或测试；
- 零第三方运行依赖与 A 级 `file://` 边界；
- 每个 ImageGen 文件的台账、运行时使用与图片阻断降级。

完成 Gate：

```bash
node --test shared/runtime/catalog.test.js
npm test
npm run verify
git diff --check
```

先核对 `file://` 相对脚本/资产、catalog/门户链接和 README/ATTRIBUTION 来源逐项一致，再提交文档/目录登记；最终报告中的测试数、入口数、commit 与 hash 必须取自实测，不能提前手写。

## 8. 浏览器验证顺序

### 8.1 核心玩法

1. 统一服务与真实 `file://` 分别打开；
2. intro → scene-intro，核对公开目标与左右姿势；
3. 第一幕在 tick 48–53 保持成功；
4. 第二幕故意在 57 才开始，验证 62 missed 与 attempt 不责怪个人；
5. 重试第二幕，使用多键换姿势并释放旧键，验证当前姿势回退正确；
6. 六幕全部完成，核对共同记录、total attempts/retries、act-result、composer 与 complete；
7. RESTART 回 exact intro，刷新不恢复旧局。

### 8.2 输入与生命周期

- 纯键盘完整一轮；
- 双 Pointer 完整一幕；
- 同席第二 pointer、多键栈、repeat、modifier、editable、IME；
- pointercancel/lostcapture、blur、hidden、pagehide 不 stuck、不补 tick、不增加 attempt；
- `setPointerCapture` 抛错时 fallback 成功才 PRESS；capture/fallback 都失败时不 PRESS；up/cancel/lostcapture 任意顺序只 RELEASE 一次；
- 控件 click 不重复派动作，方向键仅在 dancing 阶段阻止滚动；
- 可控 RAF 覆盖首帧、非有限/倒退 timestamp、长帧截断、单循环所有权、阶段退出取消、迟到回调和恢复不追后台时间；
- focus/live/aria-pressed/主动作唯一/DOM 与视觉顺序。

### 8.3 响应式与 fidelity

- 1504×1046、1280×800、844×390、390×844、320×568；
- 200% text、约 320 CSS px 的 400% zoom；
- reduced-motion、forced-colors、图片阻断、无 JavaScript；
- 八按钮 computed size 与 `elementFromPoint()`；
- 零 console error/warning、零公网/失败请求、零 storage/permission；
- 每次 UI 改动先用 Chrome MCP 走对应功能/视口；最终再用 Browser/IAB 截图，并在同一 QA pass 对接受概念与浏览器截图分别 `view_image(detail="original")`；
- fidelity ledger 至少比较文案、布局、舞台比例、剪影方向、配色、字体、间距、控制状态、响应式和降级十项。

## 9. bugs 与 learn 规则

新问题写到：

```text
bugs/YYYY-MM-DD-shadow-duet-<slug>.md
```

必须包含环境、复现、预期、实际、根因、修复、回归验证和相关提交。输入问题还记录 seat/pose/pointerId/held stack/phase/tick；时钟问题记录 accumulator、STEP batch、visibility/focus；视觉问题记录视口、computed size 与概念对照。

只有出现真实实现与回归证据后，才评估以下 `/learn` 主题：

1. 多键持有栈为何比单 active key 更抗释放乱序；
2. 固定 tick reducer 与 RAF accumulator 的职责分离；
3. batch STEP 为何必须逐 tick 结算并在终态截断；
4. blur/hidden/pagehide 如何复用幂等清理器；
5. 同机合作只能证明席位权限，不能证明物理身份；
6. 生成剪影与 CSS 语义降级如何避免资产成为规则单点故障。

同根因已有记录时补充原文件，不建立重复条目；修复前优先增加能失败的回归测试。

## 10. 完成条件

- 171/172 与获接受的完整视觉规格全部实现；
- config/logic/UI/styles/assets/归因/catalog/验证按边界分别提交；若发现 bug 或形成跨项目可复用证据，则连同对应回归按 bugs/learn 边界独立提交，否则最终报告明确“本作无新增 bug/learn 记录”；
- 常量、六幕、持有栈、tick 48/53/56/57/61/62、七阶段、重放与 hostile input 全绿；
- 双席必要性有独立 oracle 证明，不以生产 reducer 自证；
- Chrome/Safari desktop 与至少一次 iOS Safari/Android Chrome 真实 touch 有记录；
- A 级 `file://`、五档视口、200/400%、reduced、forced、图片阻断、零网络/storage/console 问题通过；
- 四项机制来源与全部生成资产在研究、README、ATTRIBUTION、生成台账一致；
- 最终报告包含 commits、测试数、目录数、浏览器路径、截图、fidelity ledger、限制和 asset hash；
- worktree clean。

本作完成不等于长期目标完成；完成后继续下一候选，不调用 goal complete。
