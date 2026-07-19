# “三枚以后，都是我们”分步实施计划

> 对应调研、规格与设计：[`131-future-cookie-notes-research.md`](./131-future-cookie-notes-research.md)、[`132-future-cookie-notes-spec.md`](./132-future-cookie-notes-spec.md)、[`133-future-cookie-notes-design.md`](./133-future-cookie-notes-design.md)。本计划按“每完成一个项目或一部分就检查并独立提交”执行。

## 1. 交付目标

在 `experiences/surprises/future-cookie-notes/` 新增一个 A 级单人惊喜作品：收件人任意顺序打开“什么时候 / 去哪里 / 一起做什么”三枚未来签，三段齐全后主动合成一封邀请。

默认离线、零随机、零第三方运行依赖、零网络、零存储、零音频，安装完成后可直接双击 HTML。本批不新增 npm 依赖、服务端、局域网、账号、题库编辑器、本地存储、倒计时、随机签语、下载、分享、照片或音乐。

## 2. 公共接口冻结

`config.js` 以 UMD 导出 `window.FutureCookieNotesConfig`；仓库内 Node 测试用 CommonJS 出口：

```js
{ DEFAULT_CONFIG, composeInvitation }
```

`logic.js` 以 UMD 导出 `window.FutureCookieNotesLogic`；仓库内 Node 测试用 CommonJS 出口：

```js
{
  VERSION,
  NOTE_IDS,
  NOTE_META,
  PHASES,
  ACTION_TYPES,
  createInitialState,
  sanitizeConfig,
  reduceFutureCookieNotes,
  assertState,
  getFutureCookieNotesView,
  replayFutureCookieNotes,
  deepFreeze
}
```

- `reduceFutureCookieNotes(state, action)` 是唯一业务推进入口；
- `getFutureCookieNotesView(state, safeConfig)` 是 UI 唯一数据投影入口，前端不得直接读取原始配置正文；
- `sanitizeConfig(candidate, composeStrategy)` 允许准备者以纯文本策略定制最终邀请，异常或越界安全回退；
- reducer 无时间、随机、DOM、存储或图片依赖；
- 实现发现接口不足时，先修订规格/计划并独立提交，子任务不得私自扩张全局 API。

## 3. 阶段与独立提交

### P0 创意池校准（已完成）

- 修正 60 项创意池的已实现口径；
- 提交：`63650d4 docs: correct idea backlog counts`。

### P1 调研、许可证与零复制（已完成）

- 文件：`docs/131-future-cookie-notes-research.md`；
- 固定两个 MIT 同题材项目、一个元数据不一致排除案例、三类平台规范、无随机的机制差异与借鉴声明策略；
- 提交：`53f87d3 docs: research future cookie notes`。

### P2 可执行规格（已完成）

- 文件：`docs/132-future-cookie-notes-spec.md`；
- 冻结三阶段、三动作、最小状态、六种打开排列、配置限长、阶段 view、焦点、响应式、故障回退和测试 Gate；
- 提交：`9a4bf91 docs: specify future cookie notes`。

### P3 ImageGen 概念与生产资产（已完成）

- 文件：三张概念、背景源图、色键图集源图、JPEG 背景、RGBA 图集与 `docs/133-future-cookie-notes-design.md`；
- 明确拒绝概念图中的两处文字误差，冻结精确代码文字、token、组件家族、布局、动效、处理链、alpha 统计和哈希；
- 提交：`f1c24a4 design: freeze future cookie notes`。

### P4 分步计划（本提交）

- 文件：`docs/134-future-cookie-notes-plan.md`；
- 冻结公共接口、文件所有权、子任务边界、依赖顺序、金牌路径、提交边界和完成 Gate；
- 检查：`npm test`、`npm run verify`、`git diff --check`；
- 预期提交：`docs: plan future cookie notes`。

### P5 纯逻辑、配置与测试（逻辑子任务）

唯一可写：

```text
experiences/surprises/future-cookie-notes/config.js
experiences/surprises/future-cookie-notes/logic.js
experiences/surprises/future-cookie-notes/logic.test.js
```

实现内容：

- UMD、CommonJS、递归冻结、精确常量、三枚公开 meta；
- 配置逐字段安全读取、Unicode code point 限长、异常 getter 与策略回退；
- `collecting / ready / finale` 三阶段，`OPEN_NOTE / ASSEMBLE / RESTART` 三精确 action schema；
- 三个 ID 唯一打开、第三枚只进 ready、主动合成、终局重开和非法动作幂等；
- `assertState` 拒绝多字段、畸形原型、阶段/长度不一致、重复/未知 ID；
- public view 只公开已打开正文，ready 不公开最终文字，finale 才完整公开；
- view 笔记始终按 `NOTE_IDS` 语义顺序，不按 `openedOrder` 重排；
- 六种打开排列、确定性重放、JSON 往返、输入不变、冻结/断开引用、异常与越界反例；
- 准备者可选 5–10 行 TODO 只位于 `DEFAULT_CONFIG` 和 `composeInvitation`，默认不修改仍完整运行。

子任务不得暂存或提交。根任务复核后执行：

```sh
node --check experiences/surprises/future-cookie-notes/config.js
node --check experiences/surprises/future-cookie-notes/logic.js
node --test experiences/surprises/future-cookie-notes/logic.test.js
npm test
```

预期独立提交：`feat: add future cookie notes logic`。

### P6 前端、作品说明与借鉴声明（前端子任务）

唯一可写：

```text
experiences/surprises/future-cookie-notes/index.html
experiences/surprises/future-cookie-notes/styles.css
experiences/surprises/future-cookie-notes/app.js
experiences/surprises/future-cookie-notes/README.md
experiences/surprises/future-cookie-notes/ATTRIBUTION.md
experiences/surprises/future-cookie-notes/assets/favicon.svg
```

已有的 `night-tea-table.jpg` 和 `future-cookie-atlas.png` 只读，不得替换、重压缩、改名或改哈希。

实现内容：

- 经典脚本顺序、语义 DOM、no-JS 说明、持久 status region 和阶段焦点；
- UI 只消费 public view，未公开文本不进 DOM、dataset、属性、注释、控制台或隐藏模板；
- 三枚原生按钮、任意顺序打开、已开 article、下一合法焦点、齐套合成和终局重开；
- 三态 sprite 的 closed / cracked / open 短暂 UI 帧，不阻止输入，不增加 reducer 阶段；
- 深墨蓝夜茶桌、奶白纸签、深红主按钮、黄铜细线，严格使用设计 token 和上首屏文案锁；
- collecting 桌面三列、ready 移动三签 + 首屏主按钮、finale 单封长信 + 三条边注；
- 1280×800、768×1024、390×844、320×700，focus-visible、reduced motion、forced colors、图失效回退和 48px 主操作；
- README 说明双击、规则、个性化 TODO、阶段私密边界、图失效和零依赖；
- ATTRIBUTION 固定两个 MIT 候选、一个排除数据包、权利主体、平台规范、ImageGen 处理链、哈希和零复制。

子任务不得暂存或提交。根任务整合、初步浏览器检查与静态 Gate 后独立提交：`feat: build future cookie notes`。

### P7 目录、门户与创意池

更新：

```text
experiences/catalog.json
index.html 内置 fallback
experiences/surprises/README.md
docs/40-idea-backlog.md
docs/README.md
README.md（若有显式列表）
shared/runtime/catalog.test.js
```

目录精确字段：

```text
id: future-cookie-notes
title: 三枚以后，都是我们
category: surprise
level: A
entry: experiences/surprises/future-cookie-notes/index.html
dependencies: []
network: none
```

目录测试覆盖 A 级经典脚本、零网络/存储、三阶段、阶段 DOM、六种打开排列、固定来源、ImageGen 资产、viewport、public view 与直接入口存在。

预期独立提交：`feat: register future cookie notes`。

### P8 Bug 记录

- 只记录真实复现并修复的问题，包含环境、步骤、预期/实际、根因、修复、回归与关联提交；
- 已知候选：RGBA 图集的原始查看器展示透明像素中保留的色键 RGB，必须在浏览器合成底上判断是查看器表象、色溢缺陷还是 alpha 处理问题；
- 浏览器、逻辑整合、快速连点、阶段 DOM、焦点或响应式发现的新问题分别追加；
- 更新 `bugs/README.md`；
- 只在实际有缺陷时创建并独立提交。

### P9 Learn 沉淀

候选主题：

- 为什么“打开顺序”应记录在状态，而“阅读顺序”应冻结在 public view；
- 如何在纯前端直开作品中诚实表达“DOM 阶段私密”与“源码不是密文”的能力边界；
- 如何让短暂视觉中间帧不污染 reducer，同时不阻止快速连续输入；
- 如何用色键源图、容差、alpha 统计、网格位置和哈希构成可审计 sprite 链。

只形成跨作品可复用结论，不复述作品 README；更新 `learn/README.md` 并独立提交。

### P10 浏览器、视觉与最终验收

- 先完整读取 Browser/IAB 技能，优先使用 Browser/IAB；若 `file://` 受工具策略限制，用同文件集本地 HTTP 实玩 + 静态 A Gate 组合证明并如实记录；
- 金牌指针路径：打开 `where` → 打开 `when` → 打开 `together` → 确认 ready 不含最终结语 → assemble → 确认固定语义顺序 → restart；
- 键盘路径：Tab 到 `together`，用 Enter / Space 交替打开三枚，焦点逐步落到下一合法项与 assemble；
- 快速输入：连续点三枚、重复双击一枚、合成后再激活旧节点，不重复 article、不丢 action、不错位阶段；
- 私密：collecting 每打开一枚扫描 DOM 文本/属性/注释，ready 扫描最终文字，finale 才完整公开；
- 响应式：1586×992 概念原尺寸、1280×800、768×1024、390×844、320×700；检查溢出、主动作、三列/三签、长信和焦点；
- 降级：阻断背景、阻断图集、reduced motion、forced colors；
- 保存临时 QA 截图，在同一轮对概念与最新实装截图执行 `view_image`，完成至少五项 fidelity ledger 和 above-the-fold copy diff；之后删除临时 QA 文件；
- 新建 `docs/135-future-cookie-notes-verification.md`，同步设计 Gate 与必要索引；
- 最终执行定向测试、目录测试、`npm test`、`npm run verify`、`git diff --check`，确认 worktree 干净；
- 预期独立提交：`docs: verify future cookie notes`。

## 4. 依赖图与并行边界

```text
P0 backlog → P1 research → P2 spec → P3 design → P4 plan
                                                        ├─→ P5 logic/config/tests
                                                        └─→ P6 frontend/docs
P5 + P6 → P7 catalog → P8 bugs → P9 learn → P10 verification
```

P5 和 P6 可并行，因为 action、view、文案、资产、全局名和焦点规则已冻结。两个子任务只能写各自文件集，不更改规格、设计、生产资产、目录、仓库根文档、bugs 或 learn。根任务负责接口整合、视觉修复、目录、全部检查和逐块提交。

子任务不执行 `git add`、`git commit`、`git checkout`、`git reset`、`git clean` 或任何分支写操作，避免共享 worktree 的索引竞争。

## 5. 预提交纪律

每次提交前执行：

```sh
git branch --show-current
git rev-parse --show-toplevel
```

确认当前分支为 `main` 且仓库根为 `/Users/zenith/Desktop/two-of-us`，再 add/commit。hook 失败时修问题、重新 add、新建 commit；不得 amend。破坏性 Git、数据库或文件操作仍需用户在当前消息显式授权。

## 6. 完成判据

1. 三个 ID 可以任意顺序唯一打开，第三枚只进 ready，用户必须主动 assemble；
2. 六种打开排列均得到相同语义顺序的最终邀请，但 `openedOrder` 忠实保留真实探索顺序；
3. collecting 只公开已开正文，ready 不含最终文字，finale 才完整公开；
4. 指针、Enter、Space 走同一原生按钮路径，焦点正确转移，快速连点不丢 action；
5. A 级目录可单独复制，零运行依赖、零网络、零存储、零音频，图片失效仍完整；
6. 实装与三张概念、两个生产资产、token、上首屏文案锁在同一 QA 轮次达到 agency sign-off；
7. 两个 MIT 研究项目、一个排除数据包、平台规范、权利主体、零复制和 ImageGen 生产链完整；
8. logic tests、静态 Gate、全仓 test/build/verify、浏览器、四档响应式、降级、bugs、learn、索引和独立提交链全部闭环，worktree 干净。
