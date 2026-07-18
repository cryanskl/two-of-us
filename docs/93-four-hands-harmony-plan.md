# “这一拍，刚好和你”分步实施计划

> 对应调研与规格：[`91-four-hands-harmony-research.md`](./91-four-hands-harmony-research.md)、[`92-four-hands-harmony-spec.md`](./92-four-hands-harmony-spec.md)。本计划按“每完成一个项目或一部分就独立提交”执行。

## 1. 执行原则

- 保持 A 级经典脚本、`file://` 直开、零新增安装依赖与零公网请求；
- 共享 tone player 只作可选声音适配器，目录脱离仓库后以静音模式完整可玩；
- ImageGen 完整桌面/移动/完成概念与生产背景先于 UI 编码；
- 纯逻辑与前端由两个子任务按不重叠文件所有权实现；
- 规则、触控、键盘和无声模式投影到同一 reducer，不为不同输入维护平行玩法；
- 每个切片先跑定向检查，再确认分支和仓库根目录，只暂存本切片文件提交；
- 不加入规格外的自由演奏、歌曲库、录音、MIDI、联网房间、排行榜或长期存储；
- 浏览器发现问题时先固定复现条件，再最小修复、回归并写入 `bugs/`；
- `learn/` 只沉淀经过测试或浏览器验证的通用结论；
- 来源不明或视觉过近时采用原创重写，不复制代码、旋律、采样、字体、图标或布局。

## 2. 提交切片

### P1：定向调研

- 文件：`docs/91-four-hands-harmony-research.md` 与两级索引；
- 验收：四方案 brainstorm、浏览器约束、固定来源、许可证、零复制、风险矩阵和 Go/No-Go；
- 提交：`8f720c5 docs: research four hands harmony`；
- 状态：已完成。

### P2：实现规格

- 文件：`docs/92-four-hands-harmony-spec.md` 与两级索引；
- 验收：五节原创乐句、配置、整数 tick、会合/保持/双松手、生命周期、纯逻辑 API、阶段 DOM、音频降级和验收 Gate；
- 提交：`e90b2a0 docs: specify four hands harmony`；
- 状态：已完成。

### P3：实施计划

- 文件：本文件与两级索引；
- 验收：依赖顺序、文件所有权、检查命令、浏览器脚本、bug/learn 和提交边界明确；
- 提交：独立 `docs:` 提交；
- 状态：进行中。

### P4：视觉概念与原创资产

- 所有者：主任务；
- 文件：
  - `docs/94-four-hands-harmony-design.md`；
  - `design/four-hands-harmony/concept-desktop-playing.png`；
  - `design/four-hands-harmony/concept-mobile-playing.png`；
  - `design/four-hands-harmony/concept-desktop-complete.png`；
  - `experiences/co-op/four-hands-harmony/assets/harmony-table.webp`；
- 过程：使用内置 ImageGen 分别生成三个完整状态概念和一张无字生产背景，逐张 `view_image` 检查并迭代；
- 方向：明亮晨光排练角、象牙与浅木、薄荷低音/杏色高音、黄铜和弦印记；避免磁带、打孔轨、比分台、暗色模拟机箱和写实钢琴；
- 验收：设计令牌、允许文案、组件/图标、容器模型、背景处理、移动重排、资产提示词、刻意偏离与 Fidelity ledger 冻结；
- 提交：`design: define four hands harmony visuals`。

### P5：纯逻辑、配置与测试

- 所有者：逻辑子任务；
- 可写：
  - `experiences/co-op/four-hands-harmony/config.js`；
  - `experiences/co-op/four-hands-harmony/logic.js`；
  - `experiences/co-op/four-hands-harmony/logic.test.js`；
- 禁止触碰：HTML、CSS、app、README、ATTRIBUTION、assets、catalog、根索引；
- 特别要求：`config.js` 保留规格要求的 5–10 行 `composeHarmonyMessage(view)` 学习 TODO 和完整默认输出；
- 验收：定向逻辑测试不少于 36 项，覆盖 200ms 会合、300ms 保持、双松手、交换等价、中断、重放、不变性和畸形输入；
- 提交：`feat: add four hands harmony state engine`。

### P6：前端与作品说明

- 所有者：前端子任务；
- 可写：
  - `experiences/co-op/four-hands-harmony/index.html`；
  - `experiences/co-op/four-hands-harmony/styles.css`；
  - `experiences/co-op/four-hands-harmony/app.js`；
  - `experiences/co-op/four-hands-harmony/README.md`；
  - `experiences/co-op/four-hands-harmony/ATTRIBUTION.md`；
  - `experiences/co-op/four-hands-harmony/assets/favicon.svg`；
- 只调用 P5 冻结 API，不修改逻辑/配置/测试或生产背景；
- 验收：五阶段 DOM、八键/八按钮、两个 pointerId、rAF accumulator、暂停恢复、稳定焦点、live region、共享音频缺失降级、reduced motion、forced colors 和完整借鉴声明；
- 提交：`feat: add four hands harmony experience`。

P5 与 P6 在 P4 冻结后并行启动。P6 先按规格 API 接线；接口不一致由主任务审查后做最小兼容修复，子任务不得跨文件所有权“顺手修”。

### P7：接口联调与定向修复

- 所有者：主任务；
- 文件：只限真实失败涉及的实现/测试文件；
- 验收顺序：逻辑定向测试 → 三个生产脚本 `node --check` → `npm test` → `npm run verify` → `git diff --check`；
- 无需修复则不创建空提交；每个独立根因单独 `fix:` 提交；
- 同一根因的 `bugs/` 记录可与修复同提交，也可在浏览器验证后单独补齐。

### P8：目录接入与创意池校准

- 所有者：主任务；
- 文件：catalog 数据与测试、`docs/40-idea-backlog.md`、根 README 与作品索引；
- 验收：`category: "co-op"`、`level: "A"`、`installed: true`、`networkRequired: false`；C04 标为已实现；总数、三分类和 A–D 统计同步；
- 仓库 Gate 额外检查经典脚本、共享音频路径、静音回退、无网络/存储/音频文件、forced colors、reduced motion、借鉴标题和本地资产；
- 提交：`feat: catalog four hands harmony`。

### P9：浏览器实玩与视觉修复

- 所有者：主任务；
- Browser/IAB 优先；不可用或不可靠时记录原因并回退 Playwright；
- 路径：真实 `file://`，再跑 localhost 作品和门户；
- 尺寸：1504×1046、390×844、320×700；
- 状态：intro、playing、measure-complete、paused、complete；
- 核心：键盘同时按、两个 pointerId、200ms 边界、300ms 保持、提前/双边松开、五节完成、重开；
- 生命周期：Escape、blur、hidden、stalled、pointercancel、lost capture 和明确继续；
- 降级：声音关闭、AudioContext 缺失、共享脚本缺失、背景缺失、reduced motion、forced colors；
- 截图：`docs/assets/four-hands-harmony/`；临时 QA 产物放 `output/playwright/` 并在验收前删除；
- 每个真实根因独立 `fix:` 提交；没有修复不创建提交。

### P10：bug 记录

- 文件：`bugs/YYYY-MM-DD-four-hands-harmony-*.md` 与 `bugs/README.md`；
- 每条包含环境、复现、期望、实际、根因、修复、回归和 commit；
- 只记录真实复现的问题，不为了满足目录要求虚构 bug；
- 提交：与对应修复同提交，或独立 `docs:` 提交。

### P11：学习沉淀

- 文件：`learn/YYYY-MM-DD-*.md` 与 `learn/README.md`；
- 候选主题：
  - 用整数 tick 分离共同输入判定与 Web Audio；
  - 用 inputId 精确释放键盘与多 Pointer，避免卡键和旧事件污染；
  - 用“完成记录增长”保证可选声音恰好播放一次；
  - 为同时合作设计无声、非颜色和硬件 ghosting 等价路径；
- 只沉淀经测试/浏览器实玩确认的结论；
- 每个独立主题用一个 `learn:` 提交。

### P12：验收闭环

- 文件：`docs/95-four-hands-harmony-verification.md` 与两级索引，必要时更新创意池统计；
- 内容：命令结果、三档尺寸、file/localhost、五节实玩、输入/生命周期/音频/资产降级、copy diff、Fidelity ledger、刻意偏离、残余风险和完整提交链；
- 同一 QA 轮用 `view_image` 查看三个概念和最新三档截图；
- 提交：`docs: verify four hands harmony`。

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

- 必读：91 调研、92 规格、94 设计；
- 可写：config/logic/logic.test 三个文件；
- 必交：实际测试数字、未覆盖边界和提交 hash；
- 必止：API 需要变化、五节规则矛盾、必须读取 DOM/真实时钟/AudioContext/随机数，或需要改前端文件。

### 4.2 前端子任务收到

- 必读：91 调研、92 规格、94 设计与 P5 公共 API；
- 可写：HTML/CSS/app/README/ATTRIBUTION/favicon；
- 必交：语法检查、定向测试、外部资源扫描和提交 hash；
- 必止：逻辑 API 缺失、必须改配置/状态机、两个 Pointer 无法接线、概念无法在三档尺寸实现，或需要新增规格外文案/组件。

## 5. 浏览器实玩脚本

### 场景 A：最短键盘完整路径

1. 点击“开始合奏”，检查进入第 1 节并尝试启用声音；
2. 同时按 A+L，保持 5 tick 不完成，第 6 tick进入 measure-complete；
3. 只松 A 仍停在本节，再松 L 才进入第 2 节；
4. 依次完成 D+K、F+J、S+K、A+;；
5. 第 5 节完成后双松手进入 complete，completed 恰好 5 条；
6. “再合一次”回 intro，所有输入与记录清空。

### 场景 B：窗口、错误与防跨节

1. 按低音目标，延迟恰好 4 tick 后按高音目标，应 join；
2. 重开同节，延迟 5 tick 后按，应提示差一点且不完成；
3. 双方松开，按错一个本席音，再按正确组合，检查错误无惩罚；
4. join 后第 5 tick 松一边，检查 hold 清零；
5. 完成一节后持续长按并推进大量 tick，不得进入下一节。

### 场景 C：双 Pointer

1. 手机尺寸用两个 pointerId 分别按低/高目标；
2. 保持 300ms 完成，先后 pointerup 验证双松手；
3. 一边 pointercancel、另一边 lostpointercapture，检查输入均不会卡住；
4. 同一 pointerId 尝试占两席，只允许第一处；
5. 合成 click 不得产生第二次 PRESS。

### 场景 D：暂停与生命周期

1. playing 中按住一边后 Escape，检查 paused 且 held 清空；
2. 继续后同一小节从 0 开始，不补旧 hold；
3. measure-complete 未松手时 blur，返回点击继续，检查成果保留并安全进入下一节；
4. hidden 与 >500ms stalled 重复上述清理；
5. 普通 tick 不重建键盘，聚焦的琴键保持不变。

### 场景 E：声音与资产降级

1. 声音开启完整一节，确认两个短音只在 completed 增长时重叠播放一次；
2. 切声音关闭后继续通关，completed 与有声日志一致；
3. 移除/阻断 AudioContext 与共享播放器，完整通关且出现视觉模式状态；
4. 阻断生产背景，CSS fallback 仍保留全部文字和按键；
5. reduced motion/forced colors 下完成一节，规则和焦点不变。

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
- 需要第三方旋律、录音、SoundFont、字体或新运行包才能成立；
- 规则必须读取 DOM、CSS、真实时钟、声音状态或随机数；
- 一席能越权占据另一声部，或同一 pointerId 能包办双方；
- file 直开触发 module/fetch/CORS 或共享播放器缺失使玩法无法继续；
- 音频初始化延迟、刷新率或后台时长改变和弦判定；
- 同时合作退化为轮流点击，或视觉/声音成为唯一状态提示；
- 视觉概念与 48px、三档布局、forced colors 无法同时满足且需要改变核心结构。

小型实现 bug 可按根因定向修复并提交；任何规则、状态、公开 API 或用户流程变化必须先更新规格。
