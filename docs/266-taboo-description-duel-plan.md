# “绕词对决”分步实施计划

- 日期：2026-07-25
- 候选追踪 ID：`taboo-description-duel`
- 建议生产 ID：`word-detour-duel`
- 调研：[`263-taboo-description-duel-research.md`](./263-taboo-description-duel-research.md)
- Brainstorm：[`264-taboo-description-duel-brainstorm.md`](./264-taboo-description-duel-brainstorm.md)
- 规格：[`265-taboo-description-duel-spec.md`](./265-taboo-description-duel-spec.md)
- 目标分类：`experiences/versus/`
- 目标等级：A
- 当前授权：计划完成；不得创建生产目录或 UI

## 1. 计划结论

按以下顺序实施：

```text
命名 Gate
→ 原创题库与来源 Gate
→ 配置验证
→ 纯状态机 / 计时 / 隐私投影
→ 视觉提案
→ 用户视觉确认 Gate
→ DOM / CSS / app
→ 项目文档与浏览器验收
→ 总控共享集成
```

逻辑与内容可以在视觉确认前推进，但生产目录、全局名和 catalog ID 都依赖中性名称。
因此开始任何生产代码前，总控需先确认：

```text
中文名：绕词对决
生产 ID：word-detour-duel
```

如果改名，先更新本规格或追加决策记录，再创建目录；不得以候选追踪名
`taboo-description-duel` 建生产入口后再批量重命名。

## 2. 总控前置

总控派发实现 Session 前必须：

1. 确认中性名称与生产 ID；
2. 为视觉提案、题库审计和最终 verification 预留唯一文档编号；
3. 新建独立 worktree 与 `codex/exp-word-detour-duel` 分支；
4. 记录 main 基线 SHA；
5. 文件所有权只授予：
   - `experiences/versus/word-detour-duel/`
   - 该项目预留的唯一 docs 编号；
   - 确有事实时的唯一 bugs/learn 文件；
6. 明确禁止 executor 修改 catalog、根门户、分类 README、docs README、backlog、
   package lock、共享 runtime 和 Board；
7. 让 executor 完整阅读 263–266 与 orchestration runbook；
8. 把“视觉确认前不生产 UI”写进任务。

任何 worktree 写入和 commit 前都运行：

```bash
git branch --show-current
git rev-parse --show-toplevel
```

禁止 destructive Git、push、amend 和未授权共享写入。

## 3. 阶段 1：题库内容与来源边界

### 3.1 交付

创建：

```text
experiences/versus/word-detour-duel/
├── package.json
├── config.js
└── ATTRIBUTION.md
```

`package.json` 精确为：

```json
{"type":"commonjs"}
```

`config.js` 提供：

- publicTitle/publicInstructions/trustNotice；
- 两个中性玩家标签；
- 三个中性牌组标签；
- 72 张原创卡；
- 三套 4×6 schedule。

`ATTRIBUTION.md` 在第一份内容提交时就存在，不能等 UI 完成后补：

- 官方 Hasbro 产品页和 Virtual Rules PDF；
- USPTO、美国版权局来源；
- 只研究的抽象机制；
- 未复制的品牌、规则、示例、题库、卡面、音效、源码和素材；
- 无第三方开源代码/题库/字体/媒体；
- 全部词卡为仓库独立创作。

### 3.2 内容工作流

先按矩阵建空白清单：

```text
6 themes × 3 difficulties × 4 cards
```

逐卡完成：

1. 写 target；
2. 独立写四个 forbidden；
3. 检查同卡可玩性：绕开四词后仍至少存在两条自然描述路径；
4. 检查目标和禁词全库 exact 重复；
5. 检查商标、人物、作品、歌词、台词和时事；
6. 检查羞辱、身体比较、成人、创伤、疾病和身份刻板印象；
7. 检查是否默认情侣、性别或特定地域知识；
8. 两位审查角色分别标记“原创”和“难度可接受”；
9. 最后生成三套 schedule；
10. 人工朗读抽样，确认不是四个禁词把目标完全封死。

不得抓取、翻译或改写商业/社区/开源题库；不得把生成模型输出未经逐卡人工改写与
查重直接提交。

### 3.3 可选用户贡献

当 `config.js` 骨架准备好后，可以邀请用户写 **6 张有个人语气但不含隐私的示例
词卡**，每主题一张。这是有意义的内容设计，不是样板代码。约束：

- 每张只写 target + 四个 forbidden；
- 不用双方真实姓名、地址、账号或不愿公开的私人梗；
- 不引用商业示例、歌词、台词或角色；
- 提交前仍走同一原创与敏感内容审计。

用户不参与也不阻塞默认 72 张中性题库。

### 3.4 测试

本阶段先用临时 Node 内建断言或随后同 commit 的最小验证函数证明：

- 72 张、6×3×4；
- ID/target 唯一；
- 每卡四禁词；
- target 不等于任何 forbidden；
- schedule 恰好使用所有卡一次；
- 每 hand 六主题、难度 2/2/2；
- 每位玩家累计主题/难度对称；
- 配置和 attribution 不含复制内容或外部资产路径。

不新增 npm 依赖。

### 3.5 独立 commit

建议：

```text
content: add original word detour card corpus
```

commit 前运行定向内容测试、`git diff --check` 和精确 branch/root 检查。

## 4. 阶段 2：配置验证与基础逻辑

### 4.1 交付

新增：

```text
logic.js
logic.test.js
```

先实现：

- CONSTANTS / ACTIONS / DEFAULT_CONFIG；
- Unicode 和 lexeme 清洗；
- validateCorpus；
- validateSchedules；
- sanitizeConfig 原子回退；
- scoreTurn；
- deriveMatchResult；
- CommonJS + 浏览器经典全局双暴露；
- 递归冻结和断引用工具。

本阶段不实现 reducer，不创建 HTML/CSS/app。

### 4.2 测试优先顺序

1. DEFAULT_CONFIG 自证；
2. corpus 数量和分布；
3. schedules 对称；
4. Unicode、控制字符、双向字符；
5. 原型、descriptor、Symbol、getter、Proxy；
6. 原子回退；
7. 计分的正、零、负和平局；
8. 输入不变、返回递归冻结；
9. VM 中无 module 时的浏览器全局；
10. Node 真实 require。

所有恶意输入只使用测试本地对象，不把 Proxy/异常配置写入生产 config。

### 4.3 独立 commit

```text
feat: validate word detour deck and scoring
```

Gate：定向测试全绿、`git diff --check`、`npm run verify`。

## 5. 阶段 3：纯状态机、计时与隐私投影

### 5.1 reducer

按 spec 顺序实现：

```text
intro
→ setup
→ handoff
→ card-ready
→ describing
↔ interrupted
→ turn-ended
→ turn-review
→ handoff / match-result
```

动作逐批：

1. ENTER_SETUP / SET_VARIANT / SET_TIMER；
2. START_MATCH / REVEAL_CARD / START_CLOCK；
3. RECORD_OUTCOME / TICK；
4. INTERRUPT / PREPARE_RESUME；
5. SHOW_REVIEW / RECLASSIFY_CARD / CONFIRM_TURN；
6. RESTART。

每批先写失败测试，再实现最小逻辑。不要先搭 UI 猜 reducer 行为。

### 5.2 计时

必须用注入 `nowMs` 和 token：

- `< deadline` 才接受 outcome；
- `>= deadline` 到时优先；
- 第六卡和到时不双结算；
- old token no-op；
- hidden/blur/pagehide 进入中断或到时；
- 恢复不自动跑钟；
- untimed 无 deadline。

测试使用整数和小数 nowMs，覆盖非有限、负数、倒退和溢出。

### 5.3 隐私投影

用 72 个互不相同的 marker fixture 验证序列化 view：

- handoff/interrupted/turn-ended 为零秘密；
- card-ready/describing 只有当前卡；
- review 只有已使用卡；
- result 只有统计；
- 任何未来卡、schedule、难度、clock token 和完整 config 不泄露。

测试不能只断言字段名不存在，还要断言 marker 内容不存在。

### 5.4 独立 commit

```text
feat: implement word detour match state
```

Gate：全部 `logic.test.js`、`git diff --check`、`npm run verify`。

## 6. 阶段 4：逻辑审查与非 UI 验收

在 UI 前由独立 reviewer 检查：

- 与 `hot-seat-pictionary` 的机制差异是否仍成立；
- 两位描述者是否精确对称；
- 复核是否只能改当前回合；
- 分数是否只从 history 派生；
- timer token/phase 是否存在竞态；
- 秘密 marker 是否越阶段；
- action/state/config 是否可能被 mutate；
- 商业品牌是否进入生产 title/meta/config/API；
- 题库是否真为原创并完成内容审计。

发现 bug：

- 先新增失败测试；
- 修复；
- 把实际复现、根因和回归写入唯一 bug 文件；
- 若是可复用的计时/隐私知识，写唯一 learn 文件；
- 不为纯假设创建 bug。

修复独立 commit：

```text
fix: harden word detour match boundaries
```

没有实际问题则不制造空 commit 或空 bug/learn。

## 7. 阶段 5：视觉提案

### 7.1 提案范围

在总控预留的新 docs 编号中提供至少三个原创方向，只做设计提案和静态概念，不写
生产 HTML/CSS/app。每个方向都必须避开商业版：

- 蜂鸣器、卡槽、包装式卡面；
- 商业 logo、字体、经典配色；
- “电子复刻”视觉；
- 3D 翻卡作为保密机制。

建议比较：

1. **纸条接力**：手写便签但不模仿商业卡槽；
2. **电台绕词**：两席广播台、静态仪表；
3. **路线改道**：目标在中心，四个禁用提示像封闭路口。

每个方向需展示：

- intro/setup；
- 秘密描述卡；
- 中断遮屏；
- turn review；
- match result；
- 320px 与桌面重排；
- focus、对比、reduced-motion；
- 不依赖图片/音频时的完整性。

### 7.2 用户确认 Gate

视觉提案完成后暂停生产 UI，等待用户明确选择、修改或否决。确认内容至少包括：

- 整体视觉方向；
- 秘密卡 320px 排版；
- 三个结果按钮层级；
- 复核页密度；
- 终局标题语气。

只有明确确认后才能进入阶段 6。视觉提案独立 commit：

```text
docs: propose word detour visual directions
```

## 8. 阶段 6：语义 HTML 与 app 投影

### 8.1 先建 HTML

创建 `index.html`：

- 永久骨架；
- 相对经典脚本；
- noscript；
- 原创 title/meta；
- 不含默认词卡、秘密或全部阶段静态 markup；
- 不含外链、module、预加载远程资源。

### 8.2 再建 app

创建 `app.js`：

- reducer 是唯一状态写入入口；
- DOM 只由 getView 投影；
- secret subtree 按 phase 创建/销毁；
- `textContent`，无 innerHTML；
- performance.now 注入；
- token 化 timer cleanup；
- blur/hidden/pagehide 中断；
- focus/ARIA/status；
- 无日志泄露。

### 8.3 DOM 定向测试

至少用仓库现有测试模式证明：

- stage 节点存在性；
- secret 离场后 DOM/属性无 marker；
- 三按钮派发同一 action 入口；
- 复核只能改当前 turn；
- timer 只在 timed describing 运行；
- cleanup 后旧 callback 无效果；
- restart 清空 UI 和逻辑。

### 8.4 独立 commit

```text
feat: render word detour duel flow
```

本 commit 可以包含 HTML + app，但不混入最终 CSS 大规模设计。

## 9. 阶段 7：确认后的 CSS

创建 `styles.css`，只实现用户确认的方向：

- 320/390/768/1440；
- 48px 目标；
- 明确 focus-visible；
- correct/foul/skip 文字与非颜色冗余；
- 200% zoom；
- reduced-motion；
- 零闪烁、零持续脉冲、零 3D 翻卡；
- 不引入第三方字体、图片、音频或远程素材。

CSS 不得决定 phase、到时、分数、秘密可见性或操作合法性。

独立 commit：

```text
style: apply approved word detour direction
```

## 10. 阶段 8：README 与项目归因

补齐 README：

- 双击启动；
- 30 秒首局规则；
- 信任型友谊赛；
- 猜词者背屏；
- 不录音、不联网、不存储；
- 计时与不计时；
- 中断和刷新；
- 屏幕阅读器扬声器泄密提示；
- 配置明文；
- 题库定制与原创要求；
- 测试命令；
- 商业品牌/表达边界；
- 无开源依赖。

复核 ATTRIBUTION 与实际代码一致；若实施中查看了新开源项目，必须补固定 commit、
许可证、版权人、借鉴点和未复制范围。不能只写“参考网络”。

独立 commit：

```text
docs: document word detour trust and sources
```

## 11. 阶段 9：项目验收与修复

### 11.1 自动测试

```bash
node --test experiences/versus/word-detour-duel/logic.test.js
npm test
npm run verify
git diff --check
```

如果根 test script 已自动发现项目测试，仍保留定向命令作为回包证据。

### 11.2 浏览器

按 spec 第 20 节完整执行：

- 30/60/90/null；
- 三 outcome；
- 手动中断、hidden、blur；
- 到时竞态；
- review 更正；
- 四回合和终局；
- restart；
- 320/390/768/1440；
- 键盘、触屏、200% zoom；
- reduced-motion；
- Console 与 Network。

受控 Chrome 若不能访问 file://，诚实记录限制；另用操作系统真实双击证明 A 级，
localhost 只承担自动化。

### 11.3 验证文档

在总控预留编号写 verification：

- commits；
- 定向/全仓/verify 数字；
- file:// 与 localhost 分开；
- 浏览器场景；
- 响应式、键盘、触屏、焦点、降动效；
- 隐私、Console、Network；
- 题库审计；
- attribution；
- bug/learn；
- 遗留风险。

修复必须先有失败证据，独立 commit：

```text
fix: resolve word detour acceptance findings
```

验证记录独立 commit：

```text
docs: verify word detour duel
```

## 12. 阶段 10：总控共享集成

executor 回包后，总控：

1. 核对 worktree、branch、baseline、commit 和文件范围；
2. 查看每个 commit 与最终 diff；
3. 重跑定向测试；
4. 重做关键浏览器场景；
5. 逐个集成项目 commits 到本地 main；
6. 由总控单独更新：
   - `experiences/catalog.json`
   - 根 `index.html`
   - 根 `README.md`
   - `experiences/versus/README.md`
   - `docs/README.md`
   - backlog
   - Board
7. 运行项目测试、全仓测试、verify、统一门户浏览器验收；
8. 创建共享集成独立 commit；
9. 只有所有 Gate 通过才把 installed 从 58 增加到 59。

建议共享 commit：

```text
docs: install word detour duel in catalog
```

不得默认 push、发布或部署。

## 13. Commit 清单

预期最小可追踪序列：

1. `content: add original word detour card corpus`
2. `feat: validate word detour deck and scoring`
3. `feat: implement word detour match state`
4. `docs: propose word detour visual directions`
5. 用户确认 Gate
6. `feat: render word detour duel flow`
7. `style: apply approved word detour direction`
8. `docs: document word detour trust and sources`
9. 必要时 `fix: resolve word detour acceptance findings`
10. `docs: verify word detour duel`
11. 总控 `docs: install word detour duel in catalog`

每个 commit 前：

```bash
git branch --show-current
git rev-parse --show-toplevel
git diff --check
```

每个阶段完成后至少跑定向测试；配置/逻辑/UI/文档变更后跑 `npm run verify`；项目
完成前跑全仓测试。pre-commit 失败后修复并新建 commit，绝不 amend。

## 14. 停止条件

出现以下任一项，停止并回到总控 Board：

- 用户不同意中性名称，或要求使用商业品牌；
- 题库来源无法证明原创；
- 视觉提案未确认却要求生产 UI；
- 自动语音裁判被加入 A 级范围；
- 两位玩家的 hand 分布不对称；
- 秘密 marker 跨阶段泄露；
- 浏览器核心路径、file:// 或零网络合同失败；
- executor 修改未授权共享文件；
- 需要 destructive Git、push、账号、凭据或发布；
- 新开源来源未固定版本/许可证/版权与借鉴边界。

阻塞只影响本项目，不应占住执行槽位或阻止其他独立候选继续推进。

## 15. Executor 回包模板

```text
项目 ID：word-detour-duel（候选追踪：taboo-description-duel）
worktree / 分支：
基线 main SHA：
提交列表：
修改文件：
题库原创审计：
项目测试：
全仓测试 / verify：
浏览器验证：
可访问性 / 响应式 / 隐私 / 控制台 / Network：
A 级启动证据：
借鉴与许可证：
新增 bug / learn：
需要总控修改的共享文件：
遗留风险或阻塞：
```

当前阶段不创建生产目录、不跑浏览器，不计 installed。
