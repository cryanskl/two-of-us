# “藏好这一味”分步实施计划

> 对应调研、规格与设计：[`121-secret-recipe-code-research.md`](./121-secret-recipe-code-research.md)、[`122-secret-recipe-code-spec.md`](./122-secret-recipe-code-spec.md)、[`123-secret-recipe-code-design.md`](./123-secret-recipe-code-design.md)。本计划按“每完成一个项目或一部分就检查并独立提交”执行。

## 1. 交付目标

在 `experiences/versus/secret-recipe-code/` 新增一个 A 级同机双人对抗：两位玩家各藏一轮四格配方，交换设备后用最多七次“同位 / 有料”计数破译，最后按破译次数较少者获胜。默认离线、无第三方运行依赖、无网络、无存储、无音频，可直接双击 HTML。

本批不新增 npm 依赖、服务端、局域网房间、电脑解法、提示器、候选列表、倒计时、排行榜、保存、分享或商业棋盘视觉。

## 2. 公共接口冻结

`config.js` 同时导出 CommonJS 与 `window.SecretRecipeCodeConfig`：

```js
{ DEFAULT_CONFIG, composeMatchNote }
```

`logic.js` 同时导出 CommonJS 与 `window.SecretRecipeCodeLogic`：

```js
{
  VERSION, SLOT_COUNT, MAX_GUESSES, ROUND_COUNT, FAILED_SCORE,
  MAX_PER_SECRET_INGREDIENT, MIN_UNIQUE_SECRET_INGREDIENTS,
  INGREDIENT_IDS, INGREDIENT_COLORS,
  createInitialState, sanitizeConfig, scoreGuess,
  reduceRecipe, assertState, getRecipeView
}
```

- `reduceRecipe(state, action)` 是唯一业务推进入口；
- `getRecipeView(state, safeConfig)` 是前端唯一投影入口，前端不得读取 `state.secret` 渲染 handoff/guessing；
- `sanitizeConfig(candidate, composeStrategy)` 接受用户候选配置与可选结语策略，返回递归冻结安全配置；
- 全部命名和行为以规格为准；如果实现发现接口不足，先回到规格/计划修订并独立提交，不能由子任务私自扩张全局 API。

## 3. 阶段与独立提交

### P0 调研与许可证边界（已完成）

- 文件：`docs/121-secret-recipe-code-research.md` 与文档索引；
- 固定同机交接、重复配料反馈、双轮公平、五个 MIT 参考工程、平台规范、商标边界和零复制路线；
- 提交：`6b016cd docs: research secret recipe code`。

### P1 可执行规格（已完成）

- 文件：`docs/122-secret-recipe-code-spec.md` 与文档索引；
- 冻结六种配料、秘密约束、两遍多重集合反馈、六阶段 state/view、精确 action、40-action golden replay 与 DOM Gate；
- 提交：`c557780 docs: specify secret recipe code`。

### P2 视觉前置与生产资产（已完成）

- 文件：三张 ImageGen 概念、生产背景、`docs/123-secret-recipe-code-design.md` 与文档索引；
- 拒绝错误强调 3 的终局初稿，以 v2 固定“较少次数获胜”；
- 提交：`441c891 design: freeze secret recipe code`。

### P3 分步计划（本提交）

- 文件：本计划与文档索引；
- 冻结公共接口、子任务文件所有权、依赖顺序、验证矩阵和预期提交；
- 检查：`npm run verify`、`git diff --check`；
- 提交：`docs: plan secret recipe code`。

### P4 纯逻辑、配置与测试（逻辑子任务文件所有权）

唯一可写：

```text
experiences/versus/secret-recipe-code/config.js
experiences/versus/secret-recipe-code/logic.js
experiences/versus/secret-recipe-code/logic.test.js
```

- UMD、递归冻结、精确 action schema、严格 `assertState`、配置逐字段清洗；
- 两遍 feedback、秘密重复/多样性边界、角色轮换、成功 1..7、失败 8、平局与 winner；
- covered/handoff/guessing public view 隐私、round-result 揭晓、match-result 纯派生；
- 40-action golden replay、JSON 往返、输入不变、getter/原型污染/畸形 state 反例；
- 准备者 5–10 行可选 TODO 只位于 `composeMatchNote(summary)`，默认无需修改即可完整运行；
- 子任务不得暂存或提交；根任务复核后检查：

```sh
node --check experiences/versus/secret-recipe-code/config.js
node --check experiences/versus/secret-recipe-code/logic.js
node --test experiences/versus/secret-recipe-code/logic.test.js
npm test
```

- 提交：`feat: add secret recipe code logic`。

### P5 前端、来源与作品说明（前端子任务文件所有权）

唯一可写：

```text
experiences/versus/secret-recipe-code/index.html
experiences/versus/secret-recipe-code/styles.css
experiences/versus/secret-recipe-code/app.js
experiences/versus/secret-recipe-code/README.md
experiences/versus/secret-recipe-code/ATTRIBUTION.md
experiences/versus/secret-recipe-code/assets/favicon.svg
```

- 经典脚本顺序、语义 DOM、内联配料 SVG、stable live region 与无 JS 说明；
- 全部 UI 只消费冻结 view；covered 时先删草稿 DOM，handoff/guessing 不创建秘密节点；
- 数字键 1–6、Backspace、Escape、blur/hidden、Tab/Enter/Space 与 Pointer；
- 48px 控件、focus 转移、reduced motion、forced colors、背景失败、1280/390/320；
- README/ATTRIBUTION 固定五个 MIT commit/权利主体、平台规范、官方商标边界、Knuth 论文边界、ImageGen 输入链和零复制声明；
- 子任务不得暂存或提交；根任务整合、静态 Gate 与浏览器修复后提交：`feat: build secret recipe code`。

### P6 目录、入口与创意池

- `experiences/catalog.json` 新增：

```text
id: secret-recipe-code
title: 藏好这一味
category: versus
level: A
entry: experiences/versus/secret-recipe-code/index.html
dependencies: []
network: none
```

- 同步根 `index.html` 内置 fallback、`experiences/versus/README.md`、根/文档状态与 `docs/40-idea-backlog.md` V09 链接；
- 扩展 `shared/runtime/catalog.test.js`：精确字段、A 级经典脚本、零网络/存储、隐私 DOM、来源标题、viewport 与背景资产；
- 检查：目录定向测试、`npm test`、`npm run verify`、门户进入；
- 提交：`feat: register secret recipe code`。

### P7 Bug 记录

- 只记录本轮真实复现并修复的问题；每条写环境、步骤、预期/实际、根因、修复、回归测试和提交；
- 更新 `bugs/README.md`；没有复现缺陷时不创建空记录，也不制造提交；
- 提交：`docs: record secret recipe code fixes`。

### P8 Learn 沉淀

- 主题候选：含重复元素的反馈为何必须“精确位先消费，再取剩余频数交集”；或同机热座秘密如何同时隔离 view 与 DOM；
- 只有形成跨作品可复用结论时新增 `learn/2026-07-19-*.md` 并更新索引；
- 提交：`docs: explain hot-seat secret isolation`（按实际主题调整）。

### P9 浏览器、视觉与最终验收

- Browser/IAB 优先；若工具安全策略拒绝 `file://`，如实记录，以同文件集本地 HTTP 实玩 + 静态 A Gate 组合证明；
- 金牌路径：intro → round0 设置 B B M H → cover/resume → handoff → 1/2、2/2、4/0 → swap → 设置 S C O S → 1/3、4/0 → final 2–3 → restart；
- 隐私：covered、handoff、guessing 三态扫描 DOM 全文/属性，不含秘密顺序；round-result 才公开；
- 分支：七次失败或同次数平局至少浏览器实走一条，另一条逻辑全覆盖；
- 输入：Pointer、数字键、Backspace、Escape、blur/hidden、Tab/Enter；历史不抢焦点；
- 响应式：1280×800、390×844、320×700；检查横向溢出、48px、首个交互区、七行历史和最终两轮摘要；
- 降级：背景失败、reduced motion、forced colors；只能静态验证时明确标为 CODE/STATIC PASS；
- 保存临时 QA 截图，与三张概念在同一轮 `view_image`；完成至少五项 fidelity ledger 和 above-fold copy diff，删除临时 QA 文件；
- 最终文档：`docs/125-secret-recipe-code-verification.md` 与文档索引；
- 检查：定向测试、目录测试、`npm test`、`npm run verify`、`git diff --check`、worktree clean；
- 提交：`docs: verify secret recipe code`。

## 4. 依赖图与并行边界

```text
P0 research → P1 spec → P2 design → P3 plan
                                      ├─→ P4 logic/tests
                                      └─→ P5 frontend/docs
P4 + P5 → P6 catalog → P7 bugs → P8 learn → P9 verification
```

P4 与 P5 可并行，因为全局名、view 形状和 action 已冻结；两者只能写各自文件集合。根任务负责接口整合、浏览器修复、目录、全部检查与逐块提交；子任务不 commit，避免共享 worktree 的索引竞争。

## 5. 预提交纪律

每次提交前必须执行：

```sh
git branch --show-current
git rev-parse --show-toplevel
```

确认当前分支与 `{repo-root}` 一致，再 add/commit。hook 失败时修复、重新 add、新建 commit；不得 amend。任何破坏性 Git 或文件操作仍需当前消息显式授权。

## 6. 完成判据

1. feedback 对重复配料无重复计算，状态/配置/输出都冻结且可重放；
2. secret 在 covered、handoff、guessing 的 view 与 DOM 中都不可见，round-result 才公开；
3. 两轮角色和比分只由合法 round result 派生，失败计 8、较低分胜、同分平；
4. A 级目录可独立复制，零运行依赖、零网络、零存储，背景失败仍完整；
5. 视觉实现与三个冻结概念同轮对照，无可修复的比分、布局或首屏文案漂移；
6. 来源、固定 commit、许可证、商标、论文、ImageGen 与零复制边界完整；
7. tests/build/verify/browser/bugs/learn/索引/提交链闭环，worktree 干净。
