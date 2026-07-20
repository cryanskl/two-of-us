# “这一场雨，我们一起接”分步实施计划

- 日期：2026-07-21
- 状态：已执行；验收与保留人工 Gate 见 [`155-cloud-recipe-verification.md`](./155-cloud-recipe-verification.md)
- 对应调研：[`151-cloud-recipe-research.md`](./151-cloud-recipe-research.md)
- 对应规格：[`152-cloud-recipe-spec.md`](./152-cloud-recipe-spec.md)
- 对应设计：[`153-cloud-recipe-design.md`](./153-cloud-recipe-design.md)
- 目标：A 级 `file://` 同屏合作作品，零第三方运行依赖

## 1. 提交原则

用户要求“每完成一个项目或者一部分，就提交一次”。本作继续采用可独立复核的提交边界：

1. 调研：已提交 `6b5a439`；
2. 规格：已提交 `d69c238`；
3. 视觉与 ImageGen 源稿：已提交 `6d46ee2`；
4. 资产 bug 记录：已提交 `b5c5acd`；
5. 本实施计划：单独提交；
6. 逻辑、配置与逻辑测试：单独提交；
7. 前端、生产资产、README 与 ATTRIBUTION：单独提交；
8. catalog 与目录测试：单独提交；
9. 浏览器发现的每个独立 bug：一个问题一个记录，与对应修复一起提交或紧随修复提交；
10. learn 沉淀：单独提交；
11. 最终验证报告与状态索引：单独提交。

每次 commit 前必须执行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

并确认分支为当前任务分支、根目录为 `/Users/zenith/Desktop/two-of-us`。不得使用破坏性 Git 操作，不覆盖无关用户改动。

## 2. 子任务与文件所有权

### 2.1 子任务 A：逻辑、配置与逻辑测试

唯一可写文件：

```text
experiences/co-op/cloud-recipe/config.js
experiences/co-op/cloud-recipe/logic.js
experiences/co-op/cloud-recipe/logic.test.js
```

职责：

- 精确实现 152 号规格的常量、三色、三配方与 UMD/CommonJS API；
- 实现深冻结、安全普通对象/精确字段校验、整套配方回退；
- 实现 createWaveDrops、resolveCatch、28 区间枚举和唯一解证明；
- 实现 config 归一化与安全 completion composer；
- 实现七阶段 reducer、双席边界权限、固定 STEP、完整重放和 public view；
- 测试九波、失败优先级、单席固定不可完成、畸形输入、防伪造、JSON 重放与无网络/存储/随机边界；
- 不创建 DOM、不读取图片、不修改 catalog、README、docs、bugs 或 learn。

完成 Gate：

```bash
node --test experiences/co-op/cloud-recipe/logic.test.js
npm test
git diff --check
```

### 2.2 子任务 B：前端、来源与生产资产

唯一可写文件：

```text
experiences/co-op/cloud-recipe/index.html
experiences/co-op/cloud-recipe/styles.css
experiences/co-op/cloud-recipe/app.js
experiences/co-op/cloud-recipe/README.md
experiences/co-op/cloud-recipe/ATTRIBUTION.md
experiences/co-op/cloud-recipe/assets/favicon.svg
experiences/co-op/cloud-recipe/assets/weather-kitchen-background.png
experiences/co-op/cloud-recipe/assets/cloud-ribbon.png
experiences/co-op/cloud-recipe/assets/weather-ingredients.png
experiences/co-op/cloud-recipe/assets/README.md
```

职责：

- 按 153 号设计实现七阶段真实 DOM、七列舞台、四按钮、纹样、响应式、focus、aria-live、forced-colors 与 reduced-motion；
- app 只通过 `window.CloudRecipeLogic` 获取 state/view，不复制判定；
- 使用经典脚本 `config.js → logic.js → app.js`，保证 `file://`；
- RAF 只在 falling 运行，失焦/隐藏丢弃积压时间；
- 将三张 docs 源稿逐字节复制为运行时资产并核对 SHA-256；
- `ATTRIBUTION.md` 写三个固定 MIT 来源的版权/许可、机制研究与零复制边界；
- README 写直开方式、双席控制、离线/隐私、配置与借鉴声明；
- 不修改 logic/config/test、catalog、根 README、docs、bugs 或 learn。

完成 Gate：

```bash
npm run verify
npm test
git diff --check
```

## 3. 主线程整合

子任务返回后，主线程按顺序：

1. 先审 logic diff 和测试，不接受超出文件所有权的改动；
2. 跑逻辑定向测试与全仓测试，修正后独立提交逻辑部分；
3. 再审前端 diff、资产哈希、来源声明和阶段 DOM；
4. 跑静态验证与全仓测试，修正后独立提交前端部分；
5. 更新 `shared/runtime/catalog.js`、co-op 分类 README、根 README 数量与 `docs/40-idea-backlog.md` 的 C13 状态；
6. 在 `shared/runtime/catalog.test.js` 增加本作目录测试，验证本地路径、经典脚本、来源、离线、语义与资产；
7. 独立提交 catalog 部分。

若子任务发现规格矛盾，必须停止相关实现并回报；主线程在 `bugs/` 记录根因与修正，更新规格后再继续，不能让两个实现各自猜测。

## 4. 浏览器验证顺序

使用 Chrome MCP / Browser 工具，不能只依赖静态检查。

### 4.1 `file://` 首测

1. 打开 `experiences/co-op/cloud-recipe/index.html`；
2. 检查 console、network 与真实经典脚本加载；
3. 开始第一份配方；
4. 用键盘制造一次 missed；
5. 用触控按钮制造一次 contamination；
6. 正确完成当前波并进入下一味；
7. 用脚本或真实按钮完成九波，核对三瓶、总尝试和结语；
8. complete 重开回 exact intro；
9. falling 切后台/失焦再回来，确认不补 tick。

### 4.2 localhost 对照

使用仓库统一启动器或受控静态服务打开同一路径，复测至少一波和 complete，不创建项目私有服务。

### 4.3 视口与视觉

- 1440×1000：完整进行态与 complete；
- 1280×800：低高度控制可见；
- 390×844：舞台在上、两席控制在下、按钮 ≥56px；
- 320×568：无横向溢出、按钮 ≥52px；
- 200% zoom、键盘 Tab、focus-visible、aria-live；
- reduced-motion 与 forced-colors；
- 阻断三张图片，验证 CSS/DOM 降级；
- 截图后用 `view_image(detail="original")` 与 153 号 fidelity ledger 比较。

## 5. Bug 记录规则

任何可复现问题写入：

```text
bugs/YYYY-MM-DD-cloud-recipe-<slug>.md
```

必须包括环境、复现、预期、实际、根因、修复、回归验证与相关提交。修复前先写/更新测试；纯视觉问题提供视口、截图路径或测量值。

已知资产风险继续归入既有 [`2026-07-18-imagegen-fake-transparent-sprite-atlas.md`](../bugs/2026-07-18-imagegen-fake-transparent-sprite-atlas.md)，不建立同根因重复文件。

## 6. Learn 候选

最终至少评估以下两项是否值得沉淀：

1. **用邻接负样本构造唯一合作区间**：如何从 28 个闭区间证明恰好一个解，并证明固定任一席不能通关；
2. **规则图层与生成式气氛资产分工**：为什么 lane/drop/handle 必须是 DOM，背景/材质/完成插画可以是 ImageGen，以及如何验证伪透明。

只有能跨项目复用且有真实实现证据时才写入 `learn/`；不把普通开发流水账当知识沉淀。

## 7. 完成与退出条件

本作完成需要同时满足：

- 152/153 规格全部实现，没有静默删减核心 Gate；
- 逻辑、前端、catalog、bugs、learn、验证分别按本计划提交；
- 目录验证、定向测试、全仓测试、file、localhost、生命周期、三档响应式和图片降级全部通过；
- 来源 commit、MIT 版权、零复制声明在研究、ATTRIBUTION 与 README 三处一致；
- 最终验证文档记录测试总数、目录总数、浏览器路径、截图、哈希、已知限制和所有相关 commit；
- worktree clean。

满足本作完成不等于整个长期目标完成。完成后继续从创意池选择下一未实现候选，不调用 goal complete。
