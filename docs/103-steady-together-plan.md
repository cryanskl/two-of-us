# “稳稳地，和你一起向前”分步实施计划

> 对应调研与规格：[`101-steady-together-research.md`](./101-steady-together-research.md)、[`102-steady-together-spec.md`](./102-steady-together-spec.md)。本计划严格执行“每完成一个项目或一部分就独立提交”。

## 1. 执行原则

- 保持 A 级经典脚本、`file://` 直开、零新增安装依赖、零公网请求；
- 先用内置 ImageGen 生成完整桌面进行态、移动进行态、桌面完成态和生产背景，再冻结设计系统并编码；
- 纯逻辑与前端交给两个不重叠文件所有权的子任务实现，主任务审查 API、联调与浏览器验收；
- 键盘、双 Pointer、普通动效、reduced-motion 与 forced-colors 只投影同一个 reducer；
- 每个切片先跑定向检查，再确认分支与仓库根目录，只暂存本切片文件；
- 不加入规格外的音频、振动、传感器、gamepad、难度、分数、联网、账号、排行或存储；
- 浏览器发现问题时先固定环境和复现，再做最小修复、回归并记录到 `bugs/`；
- `learn/` 只沉淀经过自动测试或浏览器实玩确认的通用结论；
- 所有参考只研究通用机制，C06 不复制代码、公式、参数、关卡、素材、字体、音频、截图、页面结构或文案。

## 2. 提交切片

### P1：定向调研

- 文件：`docs/101-steady-together-research.md` 与两级索引；
- 验收：四方案 brainstorm、合作不可退化、固定来源、许可证、零依赖判断、排除项、零复制与 Go/No-Go；
- 提交：`f5c267d docs: research steady together`；
- 状态：已完成。

### P2：实现规格

- 文件：`docs/102-steady-together-spec.md` 与两级索引；
- 验收：整数常量、更新顺序、稳定 Gate、检查点、终点保持、inputId、生命周期、视图和测试边界；
- 提交：`e47e821 docs: specify steady together`；
- 状态：已完成。

### P3：实施计划

- 文件：本文件与两级索引；
- 验收：设计前置、依赖图、子任务文件所有权、浏览器脚本、bugs/learn 和提交边界明确；
- 提交：独立 `docs:` 提交；
- 状态：进行中。

### P4：视觉概念与生产背景

- 所有者：主任务；
- 必用：`build-web-apps:frontend-app-builder` 与其指定的 `imagegen` 技能、内置 ImageGen；
- 文件：
  - `docs/104-steady-together-design.md`；
  - `design/steady-together/concept-desktop-playing.png`；
  - `design/steady-together/concept-mobile-playing.png`；
  - `design/steady-together/concept-desktop-complete.png`；
  - `experiences/co-op/steady-together/assets/balance-journey.webp`；
- 概念范围：完整 1504×1046 桌面进行态、390×844 移动进行态和桌面完成态，不能只生成标题区；
- 方向：晨光纸景、瓷白与拉丝黄铜的平衡车、玫瑰与青绿双端、沿途两盏检查灯；避免霓虹街机、医疗仪表、健身 App、默认卡片墙、写实人物和文字烘焙进背景；
- 生产背景：无字、无 UI、无水印，保留中部给原生 SVG 横梁/滚珠，路线和检查灯可作为环境叙事但不得承担规则判定；
- 强制提取：允许首屏文案、精确色值、背景色温、字体/控件层级、spacing、容器模型、图标、三状态布局、移动重排、动效与资产处理；
- 意图偏离：动态横梁、滚珠、目标区和 HUD 采用生产级原生 SVG/DOM，以便无障碍、forced-colors 与确定性投影；设计文档必须说明这不是用粗糙占位图替换概念艺术；
- 验收：逐张 `view_image`；生成稿完整、文字可读、操作区足够大、视觉能由静态背景 + 原生 SVG 忠实实现；
- 提交：`design: define steady together visuals`。

### P5：纯逻辑、配置与测试

- 所有者：逻辑子任务；
- 可写：
  - `experiences/co-op/steady-together/config.js`；
  - `experiences/co-op/steady-together/logic.js`；
  - `experiences/co-op/steady-together/logic.test.js`；
- 禁止触碰：HTML、CSS、app、README、ATTRIBUTION、assets、catalog、根索引；
- `config.js` 必须保留规格要求的 5–10 行 `composeSteadyMessage(view)` 学习 TODO，并先提供完整安全默认输出；
- 验收：定向逻辑测试不少于 54 项，尤其覆盖负数 `.5` 舍入、单边/持续双按失败、生产 reducer 可达轨迹、镜像、检查点、掉落余量、终点 29/30、release Gate、暂停和重放；
- 主任务复核公式与规格逐项一致后提交；
- 提交：`feat: add steady together state engine`。

### P6：前端与作品说明

- 所有者：前端子任务；
- 可写：
  - `experiences/co-op/steady-together/index.html`；
  - `experiences/co-op/steady-together/styles.css`；
  - `experiences/co-op/steady-together/app.js`；
  - `experiences/co-op/steady-together/README.md`；
  - `experiences/co-op/steady-together/ATTRIBUTION.md`；
  - `experiences/co-op/steady-together/assets/favicon.svg`；
- 只调用 P5 规格化公共 API，不修改 logic/config/tests 或生产背景；
- 验收：阶段 DOM、原生 SVG 投影、A/L、双 pointerId、rAF accumulator、暂停恢复、焦点、live regions、reduced-motion、forced-colors、背景降级和完整借鉴声明；
- 主任务在暂存前核对外部资源、脚本类型、文案与设计概念；
- 提交：`feat: add steady together experience`。

P5 与 P6 只在 P4 视觉冻结后启动，可由两个子任务并行完成。P6 以 102 规格的公共 API 为唯一契约；若接口出现矛盾，子任务停止并交给主任务判定，不能跨所有权顺手改另一侧文件。

### P7：接口联调与定向修复

- 所有者：主任务；
- 文件：只限真实失败涉及的实现、测试或作品说明；
- 验收顺序：定向逻辑测试 → 生产脚本 `node --check` → `npm test` → `npm run verify` → `git diff --check`；
- 可达轨迹必须只派发生产 action，不得直写 state 或调用测试后门；
- 无需修复不创建空提交；每个独立根因单独 `fix:` 提交；
- 同一根因的 `bugs/` 记录与修复同提交，或在浏览器确认后独立提交。

### P8：目录接入与创意池校准

- 所有者：主任务；
- 文件：catalog 数据与测试、`docs/40-idea-backlog.md`、根 README 与作品索引；
- 验收：`category: "co-op"`、`level: "A"`、`installed: true`、`networkRequired: false`；C06 标为已实现；总数、三分类和 A–D 统计同步；
- repository Gate 额外检查经典脚本、无网络/存储/音频、双 Pointer 生命周期、forced-colors、reduced-motion、完整借鉴标题和本地资产；
- 提交：`feat: catalog steady together`。

### P9：浏览器实玩与视觉修复

- 所有者：主任务；
- 优先使用 Browser/IAB 或 Chrome MCP；不可用或不可靠时记录原因并回退仓库现有 Playwright Chromium；
- 路径：真正 `file://`，再跑 localhost 作品与门户；
- 尺寸：1504×1046、390×844、320×700；
- 状态：intro、playing 三坡段、release-gate、ready、paused、final-hold、complete；
- 核心：键盘完整路线、双 Pointer、单边、持续双按、快速过中、两个检查点、掉落回退、终点保持、重开；
- 生命周期：Escape、blur、hidden、stalled、pointercancel、lost capture、document pointerup 与明确恢复；
- 降级：背景缺失、CSS animation 禁用、reduced-motion、forced-colors；
- 概念对比：同一 QA 轮对已接受概念和最新浏览器截图分别 `view_image`，完成不少于五项 fidelity ledger 与首屏 copy diff；
- 截图：`docs/assets/steady-together/`；临时 QA 产物放 `output/playwright/` 并在验收前清理；
- 每个真实根因独立 `fix:` 提交；没有修复不创建提交。

### P10：bug 记录

- 文件：`bugs/YYYY-MM-DD-steady-together-*.md` 与 `bugs/README.md`；
- 每条包含环境、复现、期望、实际、根因、修复、回归和 commit；
- 只记录真实复现问题，不为满足目录要求虚构 bug；
- 提交：与对应修复同提交，或独立 `docs:` 提交。

### P11：学习沉淀

- 文件：`learn/YYYY-MM-DD-*.md` 与 `learn/README.md`；
- 候选主题：
  - 用定标整数和对称舍入实现可镜像的轻量动力学；
  - 把掉落、检查点和终点保持排进单 tick 优先级；
  - 用反例测试证明连续合作不能退化成单边或持续双按；
  - rAF 只累积 tick，长帧改为暂停而不是后台追帧；
  - SVG 作为纯 view 投影，同时提供 reduced-motion 和 forced-colors 等价信息；
  - 比较多个作品后再抽共享 accumulator，避免过早抽象不同暂停语义；
- 只沉淀经自动测试或浏览器实玩确认的结论；
- 每个独立主题用一个 `learn:` 提交。

### P12：验收闭环

- 文件：`docs/105-steady-together-verification.md` 与两级索引，必要时同步创意池统计；
- 内容：命令结果、三档尺寸、file/localhost、完整实玩、输入/生命周期/动效/资产降级、概念对比、copy diff、fidelity ledger、刻意偏离、残余风险和完整提交链；
- 最终同一轮 `view_image` 检查概念和最新截图，确认实现达到设计签收标准；
- 提交：`docs: verify steady together`。

## 3. 依赖图

```text
P1 调研 → P2 规格 → P3 计划 → P4 视觉概念与背景
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

- 必读：101 调研、102 规格、104 设计；
- 可写：config/logic/logic.test 三个文件；
- 必交：实际测试数、生产 reducer 可达轨迹说明、未覆盖边界和变更摘要；
- 必止：规格公式自相矛盾、可达轨迹必须改 state、需要 DOM/真实时钟/随机数，或必须改前端文件。

### 4.2 前端子任务收到

- 必读：101 调研、102 规格、104 设计及 P5 公共 API 契约；
- 可写：HTML/CSS/app/README/ATTRIBUTION/favicon；
- 必交：语法检查、外部资源扫描、阶段/输入接线和响应式说明；
- 必止：逻辑 API 缺失、必须改 config/logic/tests、两个 Pointer 无法精确释放、概念无法在三档尺寸实现，或需要新增规格外组件/文案。

### 4.3 主任务审查

- 子任务不得 commit；主任务检查共享工作区变更后按 P5/P6 文件边界分别暂存和提交；
- 接口问题先用公开规格裁决，不把一侧的临时假设变成另一侧的隐式依赖；
- 用户或其他会话的无关修改保持未暂存，不混入当前切片。

## 5. 浏览器实玩脚本

### 场景 A：键盘完整路径

1. 点击“开始前进”，同时用 A/L 托起；
2. 第一坡段逐步增加右端相对支撑，把滚珠从右偏趋势接回中央；
3. 通过第一盏检查灯后，坡势反转，逐步增加左端相对支撑；
4. 通过第二盏检查灯后共同回正，保持滚珠低速居中；
5. 终点保持条连续完成 30 tick 后进入 complete；
6. “再走一次”回 intro，检查点、输入、物理和尝试数清空。

### 场景 B：合作反例与边界

1. 只按 A 并推进足够 ticks，support 不成立，路线保持起点；只按 L 镜像相同；
2. 从开始持续同时按 A+L，第一坡段滚珠掉落，不能取得检查点；
3. 双方支撑足够但滚珠在中央外、速度 19、倾角 49 时分别不前进；
4. warmup 11 tick 不前进，第 12 tick 增加 3；
5. 到终点保持 29 tick 仍未完成，第 30 tick 完成；
6. 终点期间短暂失稳，final hold 清零而路线保留 2400。

### 场景 C：检查点、掉落与双 Pointer

1. 第一段通过后使滚珠越过边缘，检查 routeProgress 回 800；
2. 双方仍按住时停在 release-gate，只松一边仍等待，双方都松才可重试；
3. 第二段通过后掉落回 1600，不撤销两个检查点；
4. 手机尺寸用 pointer 11/12 占左右 pad；pointercancel 11 不释放 12；
5. 同一 pointerId 尝试占两席只登记第一次；迟到旧 pointerup 不释放新 pointer；
6. document pointerup、lostpointercapture 与正常 pointerup 都精确、幂等释放。

### 场景 D：暂停与生命周期

1. playing 中按住一边后 Escape，检查 paused、active 和物理清空并回检查点；
2. 继续进入 ready/resume，不从半个 tick 继续；
3. hidden、blur 与 `delta > 500ms` 都不派发追帧 TICK；
4. paused/complete 中大量 TICK 不改变状态；
5. 普通 TICK 不重建操作按钮，当前焦点保持稳定。

### 场景 E：视觉、语义与资产降级

1. reduced-motion 下完成一段，背景不滚动、无晃动，但 SVG 位置和规则一致；
2. forced-colors 下检查中央区、滚珠、端点、检查灯、active 和焦点可辨；
3. 阻断 `balance-journey.webp` 后，CSS/SVG 回退仍可完成整局；
4. 320×700 与 390×844 不出现横向滚动，两个 pad 均约 120px 高；
5. live region 只播报检查点、掉落、暂停与完成，不逐 tick 刷屏；
6. 对概念和实现截图逐项比较文案、布局、排版、色彩、资产融合、间距、控件和移动重排。

## 6. 每次提交前检查

```bash
git branch --show-current && git rev-parse --show-toplevel
git status --short
git diff --check
```

然后只 `git add` 当前切片文件，检查 `git diff --cached --stat` 与 `git diff --cached`，再提交。pre-commit hook 失败时修复后重新 add 并创建新 commit，不使用 `--amend`。其他会话或用户改动保持未暂存。

## 7. 停止条件

以下情况必须先修订规格或请求方向：

- 必须复制许可证不明、权利主体可疑或 proprietary 来源的代码/素材；
- 必须新增物理引擎、CDN、网络、传感器权限或服务才能成立；
- 生产 reducer 无法通过公开 action 完成路线，或必须读 DOM/真实时钟/随机数；
- 单边、持续双按或高速掠过中央能够通关；
- 掉落与同 tick 检查点/完成优先级无法按规格确定；
- 同一 inputId 能占两席，旧 release 能清除新输入，或错误路径无法可靠松手；
- `file://` 触发 module/fetch/CORS，或背景缺失使玩法无法继续；
- 刷新率、后台时长、reduced-motion、forced-colors 或 Pointer 类型改变规则；
- 视觉概念和三档布局无法同时容纳规则信息与足够大的双操作区；
- 需要新增规格外 UI、评分、难度或责任归因才能解释玩法。

小型实现 bug 按根因定向修复并单独提交；任何规则、状态、公开 API、视觉结构、来源边界或用户流程变化必须先更新规格。
