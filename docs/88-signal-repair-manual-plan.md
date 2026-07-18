# 「把信号接回来」分步实施计划

> 对应调研：[`86-signal-repair-manual-research.md`](./86-signal-repair-manual-research.md)。对应规格：[`87-signal-repair-manual-spec.md`](./87-signal-repair-manual-spec.md)。本计划按“每完成一个项目或一部分就独立提交”执行。

## 1. 执行原则

- 保持 A 级 `file://` 直开、零第三方运行依赖、零公网请求；
- ImageGen 三态完整概念与无字生产背景先于前端编码；
- 逻辑和前端交给两个子任务串行实现，按互斥文件所有权分别提交；
- 每个切片先跑定向检查，再显式确认 `main` 与 `/Users/zenith/Desktop/two-of-us`，只暂存本切片文件；
- 不加入规格外的炸弹表达、音频、照片、网络、存储、随机规则、编辑器、计分或排行榜；
- 参考项目只进入借鉴声明，不复制代码、规则表、术语、版式或素材；
- 浏览器发现缺陷时先固定复现条件，再修复、回归、写 `bugs/` 并独立提交；
- `learn/` 只沉淀经过自动测试和真实浏览器验证的结论；
- 临时截图和测试脚本只放 `output/playwright/`，验收前删除，不混入正式提交。

## 2. 提交切片

### P1：定向调研

- 文件：`docs/86-signal-repair-manual-research.md`、两级索引；
- 验收：C04/C05/C12 横向比较、固定来源、许可证、商标边界、原创机制、可访问 Gate 完整；
- 提交：`79ef24a docs: research signal repair manual`；
- 状态：已完成。

### P2：实现规格

- 文件：`docs/87-signal-repair-manual-spec.md`、两级索引；
- 验收：12 张题卡、规则 DSL、唯一解、配置、状态机、计时、DOM、输入、视觉、响应式与自动/浏览器 Gate 冻结；
- 提交：`794bde1 docs: specify signal repair manual`；
- 状态：已完成。

### P3：实施计划

- 文件：本文件、两级索引；
- 验收：依赖顺序、子任务所有权、提交边界、检查命令、实玩脚本与停止条件明确；
- 提交：独立 `docs:` 提交；
- 状态：进行中。

### P4：视觉概念与原创资产

- 所有者：主任务；
- 技能：内置 ImageGen；
- 文件：
  - `docs/89-signal-repair-manual-design.md`；
  - `design/signal-repair-manual/concept-desktop-playing.png`；
  - `design/signal-repair-manual/concept-mobile-handoff.png`；
  - `design/signal-repair-manual/concept-desktop-complete.png`；
  - `experiences/co-op/signal-repair-manual/assets/signal-dust.webp`；
- 过程：先生成桌面进行态，再生成移动交接态与桌面完成态；最后单独生成无字、无 UI、可裁切的星尘桌面纹理；每张图移动到仓库后用 `view_image` 原生检查；
- 验收：文档冻结色板、字体回退、容器、朝向、符号、纹理、允许文案、响应式和资产降级；声明生产资产为 AI 生成并记录最终提示词和日期；
- 提交：`design: define signal repair visuals`。

### P5：纯逻辑与配置

- 所有者：逻辑子任务；
- 必读：86 调研、87 规格、89 设计；
- 文件所有权：
  - `experiences/co-op/signal-repair-manual/config.js`；
  - `experiences/co-op/signal-repair-manual/logic.js`；
  - `experiences/co-op/signal-repair-manual/logic.test.js`；
- 禁止触碰：HTML、CSS、app、README、ATTRIBUTION、assets、catalog、根索引、docs；
- 特别要求：`config.js` 保留 5–10 行学习 TODO `composeTransmission(view)`，有完整可运行默认值；主任务在继续工作的同时邀请用户以后自定义；
- 验收：12 张题卡逐一唯一解；配置、无放回、rejection sampling、全状态 reducer、错误锁定、超时、暂停、重放、view/input 全覆盖；`logic.js` 可在浏览器和 CommonJS 使用；
- 定向命令：`node experiences/co-op/signal-repair-manual/logic.test.js`、`node --check` 三个 JS、`git diff --check`；
- 提交：`feat: add signal repair state engine`。

### P6：前端与作品说明

- 所有者：前端子任务；
- 前置：P5 已提交且工作区干净；
- 必读：86 调研、87 规格、89 设计、P5 公开 API；
- 文件所有权：
  - `experiences/co-op/signal-repair-manual/index.html`；
  - `experiences/co-op/signal-repair-manual/styles.css`；
  - `experiences/co-op/signal-repair-manual/app.js`；
  - `experiences/co-op/signal-repair-manual/README.md`；
  - `experiences/co-op/signal-repair-manual/ATTRIBUTION.md`；
  - `experiences/co-op/signal-repair-manual/assets/favicon.svg`；
- 禁止触碰：config/logic/tests、生产背景、catalog、根索引、docs；
- 验收：七阶段语义 DOM、桌面北席单层旋转、移动单列、两席准备、A/B/C、Pointer、暂停、rAF accumulator、焦点、status、资产/reduced-motion 降级和完整借鉴声明；
- 定向命令：`node --check app.js`、逻辑测试、外部 URL/模块/fetch 扫描、`git diff --check`；
- 提交：`feat: add signal repair experience`。

### P7：接口联调与定向修复

- 所有者：主任务；
- 检查顺序：作品逻辑测试 → `node --check` → `npm test` → `npm run verify` → `git diff --check`；
- 文件：只限真实接口不兼容或失败测试涉及的实现/测试文件；
- 无需修复则不创建空提交；
- 每个独立根因用一个 `fix:` 提交，并在同一提交或紧随其后的独立提交记录 `bugs/`；
- 任何需要改变题库、流程或状态的修复先更新规格，不把产品变化伪装成 bug。

### P8：目录接入

- 所有者：主任务；
- 文件：目录数据/测试、`docs/40-idea-backlog.md`、根 `README.md`、`docs/README.md` 和相关计数；
- 验收：C12 标为已实现；作品字段、A 级、合作分类、路径、借鉴声明和入口被仓库校验识别；A 级与合作作品数同步；
- 定向命令：目录测试、`npm run verify`、链接/路径扫描、`git diff --check`；
- 提交：`feat: catalog signal repair manual`。

### P9：浏览器验证与视觉修复

- 所有者：主任务；
- 工具顺序：Browser/IAB 优先；若当前环境不可用，记录理由并回退 Playwright；使用前检查 `npx`；
- 路径：真正 `file://` 直开，再通过 localhost 门户打开；
- 尺寸：`1504×1046`、`390×844`、`320×700`；
- 状态：intro、handoff、playing、wrong-lock、paused、timeout、round-result、complete；
- 交互：两席准备、Pointer、Tab/Enter/Space、A/B/C、Escape、blur/hidden、超时重试、四轮角色交换、重开；
- 降级：背景 404、颜色语义关闭、reduced motion、crypto 缺失；
- 截图：`docs/assets/signal-repair-manual/`；
- 每个真实根因形成独立 `fix:` 提交；没有修复不创建提交。

### P10：bug 记录

- 文件：`bugs/YYYY-MM-DD-signal-repair-manual-*.md`、`bugs/README.md`；
- 每条包含环境、复现、期望、实际、根因、修复、回归命令和 commit；
- 只写真实复现问题，不为满足目录要求虚构 bug；
- 若修复提交已包含记录，不重复；若在修复后补齐，使用独立 `bug:` 或 `docs:` 提交。

### P11：学习沉淀

- 文件：`learn/YYYY-MM-DD-*.md`、`learn/README.md`；
- 候选主题：
  - 用单一规则 token 同时生成用户说明与机器谓词；
  - 对人工谜题库执行首条唯一命中校验；
  - 让 CSS 视觉旋转不污染 DOM 与焦点顺序；
  - 用共享整数 tick 统一倒计时与短暂输入锁；
  - 用 rejection sampling 生成可注入的无偏题目计划；
- 只沉淀经过作品测试和真实浏览器验证的结论；
- 每个独立主题使用独立 `learn:` 提交，或同一紧密主题合并一份。

### P12：验收闭环

- 文件：`docs/90-signal-repair-manual-verification.md`、两级索引、最终截图和必要统计；
- 内容：命令结果、12 张唯一解、file/localhost、网络边界、完整四轮、超时/重试/暂停、三档响应式、资产/颜色/crypto 降级、Fidelity ledger、copy diff、刻意偏离、残余风险和提交链；
- 最终同一 QA 轮用 `view_image` 原生查看三个获选概念和最新三档截图；
- 删除 `output/playwright/` 中本作临时 QA 文件并确认仓库状态；
- 提交：`docs: verify signal repair manual`。

## 3. 依赖图

```text
P1 调研 → P2 规格 → P3 计划 → P4 视觉与资产
                                  ↓
                            P5 逻辑子任务
                                  ↓
                            P6 前端子任务
                                  ↓
                       P7 联调 → P8 目录 → P9 浏览器
                                                    ↓
                                              P10 bugs
                                              P11 learn
                                                    ↓
                                              P12 验收
```

P5 与 P6 刻意串行：前端子任务必须读取已落地的公开 API，不能在共享工作区猜接口。P4 的 assets 目录可先存在；P5 只能新增自己的三个文件，P6 只能新增其六个文件。

## 4. 子任务交接契约

### 4.1 逻辑子任务

- 收到：调研、规格、设计文档绝对路径，当前 commit，允许写文件清单；
- 必交：作品测试结果、测试总数、API 清单、未覆盖边界、commit hash；
- 提交前：显式运行分支/worktree 检查，只暂存三个所有权文件；
- 必止并报告：题卡表无法唯一求解、规格 API 相互矛盾、必须读取 DOM/真实时钟/随机全局、需要修改设计或前端文件。

### 4.2 前端子任务

- 收到：调研、规格、设计、逻辑 API 文件绝对路径，P5 commit，允许写文件清单；
- 必交：语法检查、逻辑测试、外部资源扫描结果、实现状态、commit hash；
- 提交前：显式运行分支/worktree 检查，只暂存六个所有权文件；
- 必止并报告：逻辑 API 缺失、必须修改 config/logic/tests、概念无法满足三档尺寸、需要增加网络/存储/音频或规格外文案。

## 5. 浏览器实玩脚本

### 场景 A：准备与第一次成功

1. 以桌面尺寸直开，确认 intro 没有题面或答案；
2. 开始后只点南席准备，确认仍在 handoff 且信息未揭示；
3. 再点北席准备，确认进入 playing、45 秒、南席为操作员；
4. 根据当前计划读取求解器答案，先故意选错一条；
5. 锁定期再次选择无效，约 900ms 后恢复；
6. 选对后进入 round-result，记录正确分支、命中规则与 attempts=2；
7. 后续按键不得重复结算。

### 场景 B：角色交换与完整四轮

1. 点击下一轮，确认北席改为操作员、两席 ready 清零；
2. 完成第二、三、四轮，每轮核对操作员严格南→北→南→北；
3. 第四轮成功后仍停在 round-result，点击拼合才进入 complete；
4. complete 恰有四段配置传输和四条记录；
5. 重开回 intro，不残留题目计划、答案、尝试或传输进度。

### 场景 C：超时与重试

1. playing 推进到剩余 1 tick，确认仍未泄露答案；
2. 最后一 tick 进入 timeout，页面与 DOM 不含正确分支、ruleIndex 或命中规则；
3. 点击再听一次，回同一卡 handoff，已完成历史不丢失；
4. 两席重新准备后恢复 450 ticks，错误 attempts 保留；
5. 选对后记录同一 puzzleId。

### 场景 D：暂停与焦点

1. playing 按 Escape，进入 paused；
2. 等待并切后台/回前台，remainingTicks 不变；
3. Tab 顺序只包含暂停面板，点击继续后焦点回当前阶段；
4. blur 和 hidden 各触发一次，均不自动继续、不补扣；
5. 北席视觉旋转时，键盘焦点顺序仍按 DOM 语义而不是屏幕坐标乱跳。

### 场景 E：响应式与降级

1. 同一局状态 resize 1504→390→320，状态哈希不变；
2. 桌面北席单层旋转，移动端取消旋转并显示交接提示；
3. 阻断 `signal-dust.webp`，检查 CSS 背景和全部题面仍在；
4. 将页面转成灰度或覆盖颜色，依靠编号、纹理文字、节点数、符号和刻度完成；
5. 模拟无 crypto，计划固定但四张唯一；
6. reduced motion 下完成整轮，计时、锁定和答案一致。

## 6. 每次提交前检查

```bash
git branch --show-current
git rev-parse --show-toplevel
git status --short
git diff --check
```

然后只 `git add` 当前切片文件，检查 `git diff --cached --stat` 和 `git diff --cached`，再提交。其他会话或用户改动保持未暂存，不混入提交。提交后立即读取 `git status --short` 和最新 log，确认下一个切片从预期父提交开始。

## 7. 停止条件

以下情况必须暂停对应切片并先修订规格或请求方向：

- 需要复制 KTaNE、参考仓库或许可证不明来源的代码、规则、术语、布局、字体、图像或音频；
- 任一题卡无法由 DSL 得到唯一首条命中，或用户文案与机器谓词必须分开维护；
- reducer 必须读取 DOM、CSS、真实时钟或随机全局才能通过；
- file 直开触发模块、fetch、CORS 或远程资源错误；
- 倒计时、900ms 锁定或结果依赖刷新率、后台时长；
- CSS 旋转导致 DOM/焦点不可理解，且不能通过布局层修复；
- 背景或颜色缺失会让答案不可辨；
- 必须增加网络、存储、音频、打印、第二设备或构建依赖。

小型实现 bug 可定向修复并独立提交；任何题库、规则、状态或用户流程变化必须先更新规格。没有真实 bug 时不创建空修复或虚构 `bugs/` 条目。
