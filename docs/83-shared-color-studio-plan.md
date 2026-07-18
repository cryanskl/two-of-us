# 「把颜色调到一起」分步实施计划

> 对应规格：[`82-shared-color-studio-spec.md`](./82-shared-color-studio-spec.md)。本计划按“每完成一个项目或一部分就独立提交”执行。

## 1. 执行原则

- 保持 A 级 `file://` 直开、零依赖、无公网请求；
- ImageGen 完整概念与生产背景先于 UI 编码；
- 逻辑与前端由两个子任务按不重叠文件所有权实现；
- 每个切片先做定向检查，再确认分支和仓库根目录，然后只暂存本切片文件提交；
- 不加入规格外的音频、照片、账号、随机题库、排行榜、编辑器或长期存储；
- 浏览器发现缺陷时先固定复现条件，再修复、回归并记录；
- `bugs/` 只写真实复现的问题，`learn/` 只写经本作验证的通用结论；
- 任一来源或许可边界不明时采用原创重写，不复制代码或素材。

## 2. 提交切片

### P0：创意池校准

- 文件：`docs/40-idea-backlog.md`；
- 验收：60 个创意与现有 37 个目录逐项对齐；
- 提交：`eeaa102 docs: align idea backlog with catalog`；
- 状态：已完成。

### P1：定向调研

- 文件：`docs/81-shared-color-studio-research.md`；
- 验收：brainstorm、固定来源、许可证、零复制、色彩/可访问性标准、测试向量和浏览器 Gate 完整；
- 提交：`f5aaf27 docs: research shared color studio`；
- 状态：已完成。

### P2：实现规格

- 文件：`docs/82-shared-color-studio-spec.md`、两级索引；
- 验收：五题坐标、配置、状态、API、整数 tick、阶段 DOM、颜色回退、视觉与 30 项自动 Gate 冻结；
- 提交：`1b6c032 docs: specify shared color studio`；
- 状态：已完成。

### P3：实施计划

- 文件：本文件、两级索引；
- 验收：依赖顺序、文件所有权、检查命令、浏览器脚本和提交边界明确；
- 提交：独立 `docs:` 提交；
- 状态：进行中。

### P4：视觉概念与原创资产

- 所有者：主任务；
- 文件：
  - `docs/84-shared-color-studio-design.md`；
  - `design/shared-color-studio/concept-desktop-playing.png`；
  - `design/shared-color-studio/concept-mobile-playing.png`；
  - `design/shared-color-studio/concept-desktop-complete.png`；
  - `experiences/co-op/shared-color-studio/assets/pigment-table.webp`；
- 过程：用内置 ImageGen 分别生成三个完整状态概念和一张无字生产背景；使用 `view_image` 检查每张图；
- 验收：设计令牌、允许文案、容器模型、图标、背景处理、响应式和刻意偏离写入设计文档；生产资产有用途、提示词边界与 CSS fallback；
- 提交：`design: define shared color studio visuals`。

### P5：纯逻辑与配置

- 所有者：逻辑子任务；
- 文件所有权：
  - `experiences/co-op/shared-color-studio/config.js`；
  - `experiences/co-op/shared-color-studio/logic.js`；
  - `experiences/co-op/shared-color-studio/logic.test.js`；
- 禁止触碰：HTML、CSS、app、README、ATTRIBUTION、assets、catalog、根索引；
- 特别要求：在 `config.js` 保留规格要求的 5–10 行 `composeStudioResult(view)` 学习 TODO，带可运行默认实现；
- 验收：规格第 10 节至少 30 项通过；状态不变性、交换律、重放和 OKLCH/HSL 派生可单独测试；
- 提交：`feat: add shared color studio state engine`。

### P6：前端与作品说明

- 所有者：前端子任务；
- 文件所有权：
  - `experiences/co-op/shared-color-studio/index.html`；
  - `experiences/co-op/shared-color-studio/styles.css`；
  - `experiences/co-op/shared-color-studio/app.js`；
  - `experiences/co-op/shared-color-studio/README.md`；
  - `experiences/co-op/shared-color-studio/ATTRIBUTION.md`；
  - `experiences/co-op/shared-color-studio/assets/favicon.svg`；
- 只调用 P5 冻结 API，不修改逻辑文件和生产背景；
- 验收：六阶段 DOM、四键/四按钮、rAF accumulator、暂停恢复、焦点、live region、HSL fallback、资产 fallback、reduced motion 与借鉴声明完整；
- 提交：`feat: add shared color studio experience`。

P5 与 P6 可以并行启动，但 P6 必须以规格接口和 P4 设计为准。接口不一致由主任务审查后做最小兼容修复，子任务不得跨文件所有权“顺手修”。

### P7：接口联调与定向修复

- 所有者：主任务；
- 文件：只限真实不兼容或失败测试涉及的实现/测试文件；
- 验收顺序：逻辑定向测试 → `node --check` → `npm test` → `npm run verify` → `git diff --check`；
- 无需修复则不创建空提交；
- 每个独立根因用一个 `fix:` 提交；
- 若有真实 bug，同一根因的 `bugs/` 记录可随修复提交，也可在 P10 独立提交。

### P8：目录接入

- 所有者：主任务；
- 文件：catalog 数据与测试、创意池、根 README、作品索引；
- 验收：作品字段与规格一致，C11 链接改为已实现，作品数与三分类统计同步，入口和 attribution 被仓库校验发现；
- 提交：`feat: catalog shared color studio`。

### P9：浏览器验证与视觉修复

- 所有者：主任务；
- Browser/IAB 优先；当前环境不可用或不可靠时记录理由并回退 Playwright CLI；
- 先检查 `npx`，再用 Playwright wrapper；
- 尺寸：1504×1046、390×844、320×700；
- 路径：真正 `file://`，再跑一次 localhost 门户；
- 状态：ready、playing、timeout、complete；
- 核心：键盘、四按钮、两个 pointerId、重试、五题、重开、hidden/blur、HSL fallback、资产 fallback、reduced motion；
- 截图放 `docs/assets/shared-color-studio/`，临时 QA 文件放 `output/playwright/` 并在验收前删除；
- 每个真实视觉/交互根因形成独立 `fix:` 提交；没有修复不创建提交。

### P10：bug 记录

- 文件：`bugs/YYYY-MM-DD-shared-color-studio-*.md`、`bugs/README.md`；
- 每条包含环境、复现、期望、实际、根因、修复、回归和 commit；
- 只写真实复现问题，不为了满足目录要求虚构 bug；
- 修复时已同提交记录则不重复；浏览器后补写时用独立 `docs:` 提交。

### P11：学习沉淀

- 文件：`learn/YYYY-MM-DD-*.md`、`learn/README.md`；
- 候选主题：
  - 用正交离散轴设计可交换的双人合作 reducer；
  - 把感知颜色显示与确定性规则判定分离；
  - 环形色相的最短方向与线性明度钳制；
  - 色彩游戏的文字、数字、形状三重反馈；
- 只沉淀经过逻辑测试和浏览器验证的结论；
- 提交：独立 `learn:` 提交。

### P12：验收闭环

- 文件：`docs/85-shared-color-studio-verification.md`、两级索引、必要的创意池统计；
- 内容：命令结果、三档尺寸、file/localhost、网络边界、完整状态、HSL/资产降级、fidelity ledger、copy diff、刻意偏离、残余风险和提交链；
- 最终同一 QA 轮用 `view_image` 查看三个概念和最新三档截图；
- 提交：`docs: verify shared color studio`。

## 3. 依赖图

```text
P0 创意池校准
  ↓
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

- 必读：研究、规格、设计文档；
- 可写：config/logic/logic.test 三个文件；
- 必交：实际测试数字、未覆盖边界、提交 hash；
- 必止：API 需要变化、题目坐标矛盾、需要 DOM 或随机数、需要改前端文件。

### 4.2 前端子任务收到

- 必读：研究、规格、设计文档与逻辑 API；
- 可写：HTML/CSS/app/README/ATTRIBUTION/favicon；
- 必交：node 语法检查、逻辑测试、无外部资源扫描、提交 hash；
- 必止：逻辑 API 缺失、必须修改配置/状态机、概念无法在三档尺寸实现、需要新增规格外文案或组件。

## 5. 浏览器实玩脚本

### 场景 A：最短路径成功

1. 开始并完成倒计时；
2. 第一题从 H8/L2 出发，P1 顺时针 5 格，P2 变亮 5 格；
3. 交错执行动作，检查进入 success 且两轴步数各 5；
4. 继续按键不得重复完成；
5. 点击“收下这张”，检查第二题固定起点和 24 秒。

### 场景 B：超时与重试

1. 第二题只移动色相，使单轴命中；
2. 推进到剩余 0，检查 timeout、completed 未增加；
3. 点击“再调一次”，检查同题、attempt 2、固定起点、步数 0；
4. 完成后记录 attempts=2，再进入第三题。

### 场景 C：双输入与交换律

1. 桌面交替/近同时按 D 与 L；
2. 手机用两个 pointerId 分别点两组按钮；
3. 记录 D→L 与 L→D 两条事件日志；
4. 检查 current、moves、outcome 完全相同。

### 场景 D：完整色册与重开

1. 程序化完成余下色笺；
2. 第五题命中后仍停在结果态；
3. 点击“收下这张”进入 complete，色册恰好五张；
4. 检查最终文案来自 `composeStudioResult(view)`；
5. 重开后回 ready、completed 空、第一题未提前显示隐藏内容。

### 场景 E：生命周期与降级

1. playing 切后台超过 500ms，返回后不补扣；
2. resize 三档，状态哈希不变；
3. 强制 CSS.supports 返回 false，检查 `data-color-mode=hsl` 且可完成；
4. 阻断背景图片，检查 CSS fallback 和所有文字/控制仍可用；
5. reduced motion 下完成一题，时间与结果一致。

## 6. 每次提交前检查

```bash
git branch --show-current
git rev-parse --show-toplevel
git status --short
git diff --check
```

然后只 `git add` 当前切片文件，查看 `git diff --cached --stat` 和 `git diff --cached`，再提交。任何其他会话或用户改动保持未暂存，不混入提交。

## 7. 停止条件

以下情况必须暂停对应切片并先修订规格或请求方向：

- 需要复制许可证不明、非商业或 proprietary 来源的代码/素材；
- 逻辑必须读取 DOM/CSS/真实时钟/随机数才可通过；
- 一人能越权改变另一条轴；
- HSL fallback 改变完成判定；
- file 直开触发模块、fetch 或跨域错误；
- 倒计时结果依赖刷新率或后台时长；
- 必须增加首版之外的网络、存储、照片、音频或构建依赖；
- 视觉概念与可访问性 Gate 无法同时满足且需要改变核心布局。

小型实现 bug 可定向修复并提交；任何规则、状态或用户流程变化必须先更新规格。
