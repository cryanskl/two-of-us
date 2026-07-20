# “把两边，拉成我们”分步实施计划

- 日期：2026-07-21
- 状态：已执行并验收；结果见 [`160-together-zipper-verification.md`](./160-together-zipper-verification.md)
- 对应调研：[`156-together-zipper-research.md`](./156-together-zipper-research.md)
- 对应规格：[`157-together-zipper-spec.md`](./157-together-zipper-spec.md)
- 对应设计：[`158-together-zipper-design.md`](./158-together-zipper-design.md)
- 目标：A 级 `file://` 同屏合作作品，零第三方运行依赖

## 1. 提交原则

用户要求“每完成一个项目或者一部分，就提交一次”。本作采用以下可独立复核的提交边界：

1. 调研：已提交 `6f83fe3`；
2. 规格：已提交 `44c92ea`；
3. 视觉与 ImageGen 源稿：已提交 `0de3e10`；
4. 本实施计划：单独提交；
5. 逻辑、配置与逻辑测试：单独提交；
6. 前端、生产资产、README 与 ATTRIBUTION：单独提交；
7. catalog、分类索引与目录测试：单独提交；
8. 浏览器发现的每个独立 bug：一个问题一个记录，与对应修复一起提交或紧随修复提交；
9. learn 沉淀：单独提交；
10. 最终验证报告与状态索引：单独提交。

每次 commit 前必须执行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

并确认分支为当前任务分支、根目录为 `/Users/zenith/Desktop/two-of-us`。不得使用破坏性 Git 操作，不覆盖无关用户改动。子代理不 stage、不 commit，由主线程审阅后按边界提交。

## 2. 子任务与文件所有权

### 2.1 子任务 A：逻辑、配置与逻辑测试

唯一可写文件：

```text
experiences/co-op/together-zipper/config.js
experiences/co-op/together-zipper/logic.js
experiences/co-op/together-zipper/logic.test.js
```

职责：

- 精确实现 157 号规格的常量、三段 4/5/6 齿、UMD/CommonJS API；
- 实现深冻结、安全普通对象/精确字段校验、冻结数据整套回退；
- 实现 `resolvePulls`、配置归一化与安全 completion composer；
- 实现七阶段 reducer、闭时间窗、第一输入、六种 jam 原因、12 tick 反馈、前缀记录与 public view；
- 对 STEP 逐 tick 消费，阶段转换时丢弃余 tick，防止穿透；
- 实现 native-style `classifyPullKey` 与 `KeyF/KeyJ` 角色映射；
- 测试窗口边界、同步阈值、单席不可完成、全 15 齿路线、摘要、hostile 输入、MAX_SAFE revision、JSON 重放与无运行时副作用；
- 不创建 DOM、不读取图片、不修改 catalog、README、docs、bugs 或 learn。

完成 Gate：

```bash
node --check experiences/co-op/together-zipper/logic.js
node --test experiences/co-op/together-zipper/logic.test.js
npm test
git diff --check
```

### 2.2 子任务 B：前端、来源与生产资产

唯一可写文件：

```text
experiences/co-op/together-zipper/index.html
experiences/co-op/together-zipper/styles.css
experiences/co-op/together-zipper/app.js
experiences/co-op/together-zipper/README.md
experiences/co-op/together-zipper/ATTRIBUTION.md
experiences/co-op/together-zipper/assets/tailor-table-background.png
experiences/co-op/together-zipper/assets/brass-zipper-pull.png
experiences/co-op/together-zipper/assets/completed-keepsake.png
experiences/co-op/together-zipper/assets/README.md
```

职责：

- 按 158 号设计实现七阶段真实 DOM、严格 15 齿、单公共时间轨、两席等权控制、结果与完成摘要；
- app 只通过 `window.TogetherZipperLogic` 获取 state/view，不复制窗口或成功判定；
- 使用经典脚本 `config.js → logic.js → app.js`，保证 `file://`；
- `pointerdown` 与 click 去重，键盘拒绝 repeat，RAF 只在 playing/tooth-result/jammed 运转；
- 失焦/隐藏停止累积，恢复不追赶；实现 focus、aria-live、forced-colors、reduced-motion 和坏图降级；
- 将三张 docs 源稿逐字节复制为运行资产并核对 SHA-256；概念图不得进入运行目录；
- `ATTRIBUTION.md` 写三个固定 MIT 来源、webosu 混合许可排除、ImageGen 原创资产与零复制边界；
- README 写直开方式、双席控制、离线/隐私、配置和借鉴声明；
- 不修改 logic/config/test、catalog、根 README、docs、bugs 或 learn。

完成 Gate：

```bash
node --check experiences/co-op/together-zipper/app.js
cmp docs/assets/together-zipper/tailor-table-background-source.png experiences/co-op/together-zipper/assets/tailor-table-background.png
cmp docs/assets/together-zipper/brass-zipper-pull-source.png experiences/co-op/together-zipper/assets/brass-zipper-pull.png
cmp docs/assets/together-zipper/completed-keepsake-source.png experiences/co-op/together-zipper/assets/completed-keepsake.png
npm run verify
npm test
git diff --check
```

前端子任务可以在逻辑文件尚未存在时按 157 号公开 API 编写；不得创建临时 mock 文件提交到作品目录。如果规格与实际逻辑 API 不一致，回报主线程，不私自复制规则到 app。

## 3. 主线程整合

子任务返回后，主线程按顺序：

1. 先审逻辑 diff 和测试，不接受超出文件所有权的改动；
2. 跑逻辑定向测试与全仓测试，修正后独立提交逻辑部分；
3. 再审前端 diff、阶段 DOM、资产哈希、README 与来源声明；
4. 跑脚本检查、静态验证与全仓测试，修正后独立提交前端部分；
5. 更新 `experiences/catalog.json`、根 `index.html` 内置目录、`experiences/co-op/README.md`、根 README 状态、`docs/README.md` 当前状态与 `docs/40-idea-backlog.md` 的 C14；
6. 在 `shared/runtime/catalog.test.js` 增加本作目录测试，验证本地路径、经典脚本、来源、离线、阶段语义和资产；
7. 独立提交 catalog 部分。

预计目录从 52 增至 53，A 级从 44 增至 45；创意池已实现从 36 增至 37，双人合作从 15 增至 16，未实现从 24 降至 23。所有数量以脚本实测为准，不手写未经验证的结果。

若子任务发现规格矛盾，必须停止相关实现并回报；主线程在 `bugs/` 记录根因与修正，更新规格后再继续，不能让两个实现各自猜测。

## 4. 浏览器验证顺序

使用 Chrome MCP / Browser 工具，不能只依赖静态检查。

### 4.1 生产路径

1. 通过仓库统一服务打开 `experiences/co-op/together-zipper/index.html`；
2. 检查 console、network、三张生产图片与经典脚本加载；
3. 第一段用屏幕按钮制造 early、apart、missed-left、missed-right 与 missed-both；
4. 验证 jammed 12 tick 后只重试同一齿、attempt + 1、已完成前缀不丢；
5. 用触控完成第一段，用 `F/J` 完成后两段，核对 4/5/6 与总 15 齿；
6. 在窗口结束 tick 提交输入，确认仍有效；长按/重复键不能写第二次；
7. 核对三段 attempts/jams、总摘要和配置结语；
8. complete 重开回 exact intro；
9. playing 切后台/失焦再回来，确认不补 tick、不瞬间失败、不粘输入。

### 4.2 `file://` 与 localhost 边界

- 优先尝试真实 `file://`；若控制工具因 URL 安全策略禁止导航，只记录能力边界，不绕过；
- localhost 必须使用仓库统一启动器/静态服务，不新增作品私有服务；
- A 级直开同时由经典相对脚本、零 fetch/模块/网络和目录 Gate 证明；真实双击仍保留一次人工 Gate。

### 4.3 视口与视觉

- 1728×906：完整 playing 与 complete；
- 1280×800：低高度控制可见；
- 390×844：舞台在上、双席控制在下、按钮 ≥64px；
- 320×568：无横向溢出、按钮 ≥58px、允许必要纵向滚动；
- 200% zoom、键盘 Tab、focus-visible、aria-live；
- reduced-motion 与 forced-colors；
- 阻断三张图片，验证 CSS/DOM 降级；
- 截图保存到 `/tmp`，用 `view_image(detail="original")` 与 158 号概念/fidelity ledger 比较；QA 截图不进入仓库；
- 本轮最后一个 Chrome 动作调用 skill 要求的 finalize，不能遗留浏览器会话。

## 5. Bug 记录规则

任何可复现问题写入：

```text
bugs/YYYY-MM-DD-together-zipper-<slug>.md
```

必须包括环境、复现、预期、实际、根因、修复、回归验证与相关提交。修复前优先增加回归测试；纯视觉问题记录视口和测量值。

若复现 ImageGen 伪透明，只更新既有 [`2026-07-18-imagegen-fake-transparent-sprite-atlas.md`](../bugs/2026-07-18-imagegen-fake-transparent-sprite-atlas.md) 的再次复现段，不建立同根因重复文件。本作当前三张源稿均为明确实底，没有触发该 bug。

## 6. Learn 候选

最终至少评估：

1. **闭时间窗的事件顺序**：为什么最后一 tick 的 PULL 有效，而跨界 STEP 才漏接；批量 STEP 为何在阶段切换时丢余量；
2. **双人节拍的合作必要性**：如何用互斥席位字段、第一次输入与单席不可完成测试，把“同拍”从视觉口号变成形式条件；
3. **生成式材质与规则 DOM 的分工**：为什么织物/黄铜可以是图片，齿数、同步窗、进度和失败原因必须是 DOM。

只有能跨项目复用且有真实实现证据时才写入 `learn/`；不把普通开发流水账当知识沉淀。

## 7. 完成与退出条件

本作完成需要同时满足：

- 157/158 规格全部实现，没有静默删减核心 Gate；
- 逻辑、前端、catalog、bugs、learn、验证按本计划分别提交；
- 目录验证、定向测试、全仓测试、完整 15 齿、两条输入、生命周期、三档响应式和坏图降级全部通过；
- 来源 commit、MIT 版权、混合许可排除、零复制声明在研究、ATTRIBUTION 与 README 三处一致；
- 最终验证文档记录测试总数、目录总数、浏览器路径、截图对照、资产哈希、已知限制和所有相关 commit；
- worktree clean。

满足本作完成不等于整个长期目标完成。完成后继续从创意池选择下一未实现候选，不调用 goal complete。
