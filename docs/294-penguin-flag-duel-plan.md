# 企鹅冰原夺旗：plan

## 1. 目标与执行口径

实现 `penguin-flag-duel`：一款 A 级、本地点开即玩的同屏双人低摩擦夺旗游戏。

本计划按非平凡功能执行：

```text
research → brainstorm → spec → plan
→ 分阶段实现与提交
→ 项目测试
→ file:// 浏览器验收
→ 修复与沉淀
→ 验证文档
→ 总控集成共享文件
```

research、brainstorm 和 spec 已冻结。后续实现不得把规则简化成相扑、碰旗即得分或推旗进门。

## 2. 依赖方案

### 2.1 运行依赖

**不新增运行依赖。**

- 浏览器运行：HTML、CSS、原生 JavaScript、内联 SVG；
- 物理：项目内专用定点整数求解器；
- 输入：KeyboardEvent 与 Pointer Events；
- 调度：`requestAnimationFrame` + 60 Hz accumulator；
- 存储/网络：无。

不得引入 Box2D 包、Canvas 引擎、游戏框架、字体包、图标包或图片素材包。Box2D 只是研究概念来源。

### 2.2 开发与验收依赖

统一复用仓库已有能力：

```bash
npm test
npm run verify
git diff --check
```

项目逻辑测试通过 `node scripts/run-tests.mjs` 被统一发现；浏览器验收使用已有浏览器自动化能力直接打开 `file://.../index.html`。不为本项目增加独立 package、锁文件或启动器。

### 2.3 降级

- JavaScript 不可用：静态说明；
- Pointer Events 不可用：不宣称触控完整支持，键盘仍可开局；
- 键盘矩阵自检失败：非阻断警告，推荐双指触控；
- 不存在“依赖安装失败”分支，因为作品自身零运行依赖。

## 3. 写入边界

执行 Session 只写：

```text
experiences/versus/penguin-flag-duel/**
design/penguin-flag-duel/**              # 仅真实验收截图
docs/<allocator-assigned>-penguin-flag-duel-verification.md
bugs/<unique-penguin-flag-duel-bug>.md   # 仅实际发生
learn/<unique-penguin-flag-duel-learn>.md # 仅可复用结论
```

共享文件由总控在审查通过后单独集成：

```text
experiences/catalog.json
README/门户/分类索引
docs/40-idea-backlog.md
共享计数或 Board
```

执行 Session 不得抢先修改共享文件。

## 4. Git 纪律

每次文件写入和每次 commit 前精确执行：

```bash
git branch --show-current
git rev-parse --show-toplevel
```

并确认：

- 分支以 `codex/` 开头且对应本项目；
- top level 是分配给本项目的 worktree；
- 没有覆盖其他 Session 或用户改动。

每个可独立验收阶段单独 commit。commit 前至少运行对应项目测试与 `git diff --check`；进入 UI 阶段后还要运行 `npm run verify`。hook 失败后修复、重新 add、新建 commit，绝不 `--amend`。

## 5. 实现阶段

## 阶段 1：静态骨架、配置与借鉴声明

### 写入

- 创建生产目录；
- `index.html`：语义结构、首屏规则、比分/时间、SVG 冰场容器、两席方向盘、覆盖层；
- `config.js`：默认席位名和静态文案；
- `styles.css`：只建立可读的基础布局，不做最终装饰；
- `README.md`：玩法、控制、本地直开、隐私、限制；
- `ATTRIBUTION.md`：固定 Box2D 来源与零复制边界；
- `assets/favicon.svg`：原创基础几何。

### 验收

- 所有引用为相对本地路径；
- 无 module、fetch、CDN 或远程字体；
- HTML 在无 JS 时显示静态说明；
- `ATTRIBUTION.md` 与 spec 第 17 节逐项一致；
- favicon 不包含第三方 path。

### 提交

```text
feat(penguin-flag-duel): add local-first game shell
```

阶段提交必须能直接打开且没有资源 404；游戏按钮可以暂时禁用并明确标注“规则核心正在接入”，不能伪装可玩。

## 阶段 2：状态机、定点运动与碰撞

### 写入

先在 `logic.test.js` 中写本阶段合同，再实现 `logic.js`：

- 配置 sanitization；
- 严格状态/action schema、deep freeze、revision；
- `intro/countdown/playing/paused/capture-reset/match-result` 状态机框架；
- 9 值意图；
- 定点加速度、阻尼、速度上限；
- 世界边界；
- 两个冰岛的圆-AABB 修正；
- 16 向玩家碰撞与同心 fallback；
- 地图镜像派生；
- DOM-free 公共 API。

### 测试

覆盖 spec 15.1 的 1–13、25–26、30：

- 倒计时；
- 八方向和速度限制；
- 阻尼；
- 四墙、冰岛、高速穿透；
- 玩家碰撞对称；
- 镜像；
- hostile state；
- DOM/time/random/network 隔离。

运行：

```bash
node experiences/versus/penguin-flag-duel/logic.test.js
npm test
git diff --check
```

### 提交

```text
feat(penguin-flag-duel): implement deterministic ice physics
```

不得留下预期失败测试或跳过高速穿透用例。

## 阶段 3：拾旗、撞落、计分与重放

### 写入

- 旗严格状态；
- 单人/双人同刻拾取；
- 等距无人拾取；
- 玩家接触掉旗；
- 合法掉落点投影；
- 15 tick 锁定；
- 480 tick 回中央；
- 撞落先于进基地；
- 得分、90 tick 重置、3 分终局；
- 90 秒高分/平局；
- 会话动作日志与 `replaySession`；
- `getViewModel`。

### 测试

覆盖 spec 15.1 的 14–24、27–29：

- 所有旗状态转换；
- 压哨得分；
- 暂停不计时；
- 重放 strict equal；
- 重放 hostile log；
- 30/60/144 Hz 帧切分等价。

额外增加一个完整比赛 fixture：

```text
开局 → 左席拾旗 → 被撞落 → 右席拾旗 → 右席回基地
→ 重复至目标分 → 结果 → 重放严格相等
```

运行：

```bash
node experiences/versus/penguin-flag-duel/logic.test.js
npm test
git diff --check
```

### 提交

```text
feat(penguin-flag-duel): complete flag capture rules and replay
```

至此核心玩法必须真实可完成。

## 阶段 4：应用调度、键盘与双 pointer 输入

### 写入

在 `app.js` 接入：

- reducer 状态与视图模型；
- 60 Hz accumulator；
- 每帧最多 5 tick；
- gap >250 ms / 积压超限暂停；
- WASD 与方向键 held set；
- 同轴相消和 9 值编译；
- Escape 暂停/恢复；
- 四步键盘矩阵自检；
- 两席八方向 pointer 控制；
- pointer capture 与取消清理；
- hidden、blur、pagehide 暂停；
- 会话日志只记录被接受动作；
- SVG 节点更新和阶段覆盖层。

### 自动化与人工验收

- 直接 `file://` 打开；
- 两套键盘输入可同时影响两席；
- 四组矩阵自检状态正确；
- 用两个 pointer 同时产生两个非零意图；
- `pointercancel` 和 `lostpointercapture` 不粘键；
- hidden/blur/pagehide/长帧都暂停；
- 恢复后 90 tick 内无移动；
- 浏览器无 console error 和意外网络请求；
- 完成至少一场真实比赛。

### 提交

```text
feat(penguin-flag-duel): add dual input and fair pause flow
```

提交前运行项目测试、`npm test`、`npm run verify` 与 `git diff --check`。

## 阶段 5：原创视觉、响应式与可访问性

### 写入

- 完成原创企鹅、旗、基地、冰岛和裂纹 SVG 几何；
- 左右席除颜色外增加围巾尾形、席位文字和基地纹样；
- 桌面、横屏、竖屏与 320 px 布局；
- 至少 44×44 CSS px 触控目标；
- focus-visible；
- aria-live 状态；
- `prefers-reduced-motion`；
- forced colors；
- 得分、锁旗、暂停和结果的静态文本冗余；
- 更新 README 的真实操作和限制。

### 浏览器矩阵

| 场景 | 必验 |
| --- | --- |
| 1504×1046 | 首屏、比赛、结果 |
| 844×390 | 横屏两席控制 |
| 390×844 | 竖屏完整冰场和控制 |
| 320×700 | 无关键裁切 |
| 200% zoom | 流程按钮、比分、暂停 |
| reduced motion | 无装饰漂移/晃动/缩放 |
| forced colors | 玩家、旗、基地、焦点可辨 |
| keyboard-only | 首屏、暂停、恢复、重开 |

保存真实关键截图到 `design/penguin-flag-duel/`；不提交临时调试图片。

### 提交

```text
feat(penguin-flag-duel): finish responsive original presentation
```

## 阶段 6：验收、实际 bug 修复与知识沉淀

### 全量验收

```bash
node experiences/versus/penguin-flag-duel/logic.test.js
npm test
npm run verify
git diff --check
```

然后按 spec 15.2 完成浏览器验收，记录：

- 冷启动方式和 URL；
- 核心比赛证据；
- 键盘矩阵结果；
- 双 pointer 结果；
- 暂停/恢复结果；
- 视口、缩放、降动效、forced colors；
- 网络和控制台；
- 原创素材与 attribution 核对。

### bug 记录规则

只有实际复现的问题才写入：

```text
/Users/zenith/Desktop/two-of-us/bugs/YYYY-MM-DD-penguin-flag-duel-<slug>.md
```

每个文件包含：

- 环境与复现步骤；
- 预期/实际；
- 影响；
- 根因；
- 修复；
- 回归命令和浏览器证据；
- 对应 commit。

若命中已有同根因 bug，追加项目与新证据，不制造重复文件。预防性风险只留在 spec，不冒充 bug。

### learn 记录规则

仅当结论可复用于其他本地实时双人作品时写入：

```text
/Users/zenith/Desktop/two-of-us/learn/YYYY-MM-DD-<reusable-topic>.md
```

优先候选：

- 键盘矩阵自检如何区分软件映射与硬件 ghosting；
- 固定步 + 长帧暂停如何避免后台偷跑；
- 八方向定点法线如何形成可重放碰撞；
- Pointer capture 取消链如何避免触控粘键。

每篇必须包含适用范围、反例、测试方式和来源；没有新知识则明确“无新增 learn”，不能为了数量编造。

### 修复提交

每个独立根因修复单独提交，例如：

```text
fix(penguin-flag-duel): clear pointer state after capture loss
docs(bugs): record penguin flag duel pointer cancellation
docs(learn): document local dual-input keyboard matrix checks
```

小 bug 可把代码、回归测试和对应 bug 记录放在同一个聚焦 commit；不同根因不得揉成一个“fix all”提交。

## 阶段 7：验证文档

写 allocator 分配的验证文档，内容至少包括：

- 项目 ID、标题、分类、A 级；
- 分支、worktree、基线和全部 commits；
- 修改文件；
- 项目/全仓测试；
- `file://` 冷启动；
- 完整比赛和终局；
- 键盘矩阵与双 pointer；
- 暂停、响应式、可访问性、隐私、网络、控制台；
- Box2D 固定来源和零复制边界；
- 实际新增 bug/learn，或明确无新增；
- 遗留风险。

提交：

```text
docs: verify penguin flag duel
```

验证文档不得把未执行项目写成通过。

## 阶段 8：总控共享集成

执行 Session 返回包通过审查后，总控：

1. 检查分支/worktree/基线和提交边界；
2. 重跑项目测试与关键浏览器场景；
3. 集成项目 commits 到本地 main；
4. 单独更新 catalog、门户、分类索引、V18/backlog 和计数；
5. 在 main 上运行 `npm test`、`npm run verify`、`git diff --check`；
6. 从统一门户启动并完成核心玩法；
7. 创建一个共享集成 commit。

建议共享提交：

```text
chore(catalog): install penguin flag duel
```

只有 main 上全部 Gate 通过，才能把 `installed` 设为 true 并计入总数。

## 6. 提交序列总览

预期至少形成：

1. `feat(penguin-flag-duel): add local-first game shell`
2. `feat(penguin-flag-duel): implement deterministic ice physics`
3. `feat(penguin-flag-duel): complete flag capture rules and replay`
4. `feat(penguin-flag-duel): add dual input and fair pause flow`
5. `feat(penguin-flag-duel): finish responsive original presentation`
6. 按实际情况追加独立 `fix` / `docs(bugs)` / `docs(learn)` commits
7. `docs: verify penguin flag duel`
8. 由总控创建 `chore(catalog): install penguin flag duel`

每个提交必须可解释、可回滚、在其声明范围内通过测试。禁止把整个项目压成一个提交，也禁止在阶段末 `--amend` 前一提交。

## 7. 完成定义

项目 Ready for Review 需要：

- 规格中的核心循环和终局可实际完成；
- 项目测试与全仓测试通过；
- A 级 `file://` 冷启动零网络、零未解释控制台错误；
- 键盘矩阵和双 pointer 路径有证据；
- 30/60/144 Hz 重放等价；
- hidden/blur/pagehide/长帧暂停公平；
- 桌面、横竖屏、320 px、200% zoom、降动效、forced colors 通过；
- 全部视觉原创；
- Box2D 来源、版本、commit、MIT、版权人和零复制边界准确；
- 实际 bug/learn 已记录，没有则明确无新增；
- 每个阶段都有独立 commit；
- worktree clean。

最终 installed 还要求总控在 main 完成共享集成和统一门户验收。
