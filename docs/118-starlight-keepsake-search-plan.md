# “把夜晚照成我们”分步实施计划

> 对应调研与规格：[`116-starlight-keepsake-search-research.md`](./116-starlight-keepsake-search-research.md)、[`117-starlight-keepsake-search-spec.md`](./117-starlight-keepsake-search-spec.md)。本计划按“每完成一个项目或一部分就检查并独立提交”执行。

## 1. 交付目标

在 `experiences/surprises/starlight-keepsake-search/` 新增一个 A 级单人惊喜：移动光心，在五个固定空间目标上连续停留 14 tick；每次发现永久留下名称和短句，第五件同 tick 点亮整幅夜景与完整信。默认离线、零依赖、零存储，支持鼠标 hover、触摸/笔拖动、方向键/Home、暂停恢复与直接点亮。

本批不新增 npm 依赖、共享运行时、服务端路由、音频、用户照片、题库编辑器、随机目标、存档、分享或统计。

## 2. 阶段与独立提交

### P1 调研与许可证边界（已完成）

- 文件：`docs/116-starlight-keepsake-search-research.md` 与两级索引；
- 固定 S08 与星码/灯塔/雾窗/刮刮卡差异、四方案比较、整数停留路线、四个 MIT 工程、平台规范和排除来源；
- 检查：`npm run verify`、`git diff --check`；
- 提交：`docs: research starlight keepsake search`。

### P2 可执行规格（已完成）

- 文件：`docs/117-starlight-keepsake-search-spec.md` 与两级索引；
- 冻结 1000×620 地图、opaque ID、14 tick、输入接管、direct 真实状态、阶段 DOM、配置策略、21 action golden replay 与 app accumulator；
- 子任务只读对抗审阅，不编辑、不提交；根任务吸收有效反例；
- 检查：`npm run verify`、`git diff --check`；
- 提交：`docs: specify starlight keepsake search`。

### P3 分步计划（本提交）

- 文件：本计划与两级索引；
- 冻结文件所有权、依赖顺序、验证命令、浏览器矩阵和提交边界；
- 检查：`npm run verify`、`git diff --check`；
- 提交：`docs: plan starlight keepsake search`。

### P4 视觉前置与生产资产

- 使用 built-in ImageGen，先做完整状态概念，后做独立生产背景；
- 概念文件：
  - `design/starlight-keepsake-search/concept-desktop-searching.png`；
  - `design/starlight-keepsake-search/concept-mobile-focusing.png`；
  - `design/starlight-keepsake-search/concept-desktop-complete.png`；
- 生产资产：`experiences/surprises/starlight-keepsake-search/assets/keepsake-night.jpg`；
- 设计文档：`docs/119-starlight-keepsake-search-design.md`；
- 背景必须清楚包含车票、双杯、照片、钥匙、窗边星光；P4 用接受资产实测中心校准一次规格坐标，随后冻结；不含 UI、可读秘密、品牌、水印、人物或手；
- 提取：颜色锁、字体、容器、光圈/暗幕处理、控制样式、图标、首屏允许文案、三视口重排、至少五项 fidelity ledger；
- 检查：`view_image` 原始尺寸、文件类型/尺寸、`npm run verify`、`git diff --check`；
- 提交：`design: freeze starlight keepsake search`。

### P5 纯逻辑、配置与测试（逻辑子任务文件所有权）

唯一可写：

```text
experiences/surprises/starlight-keepsake-search/config.js
experiences/surprises/starlight-keepsake-search/logic.js
experiences/surprises/starlight-keepsake-search/logic.test.js
```

- UMD、递归冻结、exact action schema、assertState、五目标地图校验、配置清洗；
- Pointer generation、键盘接管、先移动后停留、13/14 边界、分片等价、direct/restart；
- 21 action golden replay 只使用公开 action；
- 准备者 5–10 行 TODO 只放在 `composeStarlightLetter(view)`，默认可完整运行；
- 子任务不暂存、不提交；根任务复核后检查：

```sh
node --check experiences/surprises/starlight-keepsake-search/config.js
node --check experiences/surprises/starlight-keepsake-search/logic.js
node --test experiences/surprises/starlight-keepsake-search/logic.test.js
npm test
```

- 提交：`feat: add starlight keepsake search logic`。

### P6 前端、来源与作品说明（前端子任务文件所有权）

唯一可写：

```text
experiences/surprises/starlight-keepsake-search/index.html
experiences/surprises/starlight-keepsake-search/styles.css
experiences/surprises/starlight-keepsake-search/app.js
experiences/surprises/starlight-keepsake-search/README.md
experiences/surprises/starlight-keepsake-search/ATTRIBUTION.md
experiences/surprises/starlight-keepsake-search/assets/favicon.svg
```

- 经典脚本、语义 DOM、双层 Canvas/DOM fallback、动态发现列表与完成信；
- 鼠标 enter/leave、触摸/笔 capture、方向键/Home、键盘接管、generation；
- rAF accumulator 严格遵守换目标清空、同目标保留、250ms 边界、长帧暂停；
- DPR resize 从 view 重绘，背景加载不派业务 action；
- 48px 操作、stable live region、focus 转移、reduced motion、forced colors、320/390/1280；
- ATTRIBUTION 固定四工程/五规范/排除来源、ImageGen 和零复制声明；
- 子任务不暂存、不提交；根任务复核、浏览器修复后提交：`feat: build starlight keepsake search`。

### P7 目录、入口与创意池

- `experiences/catalog.json` 新增：

```text
id: starlight-keepsake-search
title: 把夜晚照成我们
category: surprise
level: A
entry: experiences/surprises/starlight-keepsake-search/index.html
dependencies: []
network: none
```

- 更新根 `index.html` 内置 fallback、`experiences/surprises/README.md`、根/文档状态与 `docs/40-idea-backlog.md` S08 链接；
- 扩展 `shared/runtime/catalog.test.js`：精确字段、A 级经典脚本、零网络/存储/像素读取、秘密 DOM、来源标题和目标尺寸；
- 检查：目录测试、`npm test`、`npm run verify`、浏览器门户；
- 提交：`feat: register starlight keepsake search`。

### P8 Bug 记录

- 只记录真实复现并修复的问题；每条含环境、步骤、预期/实际、根因、修复、回归测试和提交；
- 更新 `bugs/README.md`；
- 检查：相应测试、`git diff --check`；
- 提交：`docs: record starlight keepsake search fixes`；
- 若没有复现缺陷，不创建空文件或虚构 bug，也不强行提交该阶段。

### P9 Learn 沉淀

- 候选主题：连续停留交互如何同时冻结 reducer tick 与浏览器 accumulator；
- 只有形成跨作品可复用结论时写 `learn/2026-07-19-*.md` 并更新索引；
- 提交：`docs: explain deterministic dwell discovery`；
- 若只是作品说明，不重复 README，也不强行提交。

### P10 浏览器、视觉与最终验收

- Browser/IAB 优先；`file://` 若被工具安全策略拒绝，如实记录，以同文件集本地 HTTP 实玩 + 静态 A Gate 组合证明，不换浏览器绕过；
- 完整路径：intro → start → k1 13/14 → 同圈移动保留 → 移出清零 → 任意顺序五件 → complete → restart；
- 分支路径：direct partial、pause/resume、mouse leave、touch cancel/lost、键盘接管、Home、旧 generation、长帧；
- 响应式：1280×800、390×844、320×700；检查横向溢出、首屏主动作、48px、完成信滚动和焦点；
- 降级：背景失败、Canvas context 失败、reduced motion、forced colors；无法动态模拟的只标 CODE/STATIC PASS；
- 保存临时实现截图，与三张概念在同一轮 `view_image`；原生概念尺寸可行时截图，至少五项 fidelity ledger、首屏 copy diff 和所有有意偏差；临时文件最终删除；
- 最终文档：`docs/120-starlight-keepsake-search-verification.md` 与两级索引；
- 检查：定向测试、目录测试、`npm test`、`npm run verify`、`git diff --check`、worktree clean；
- 提交：`docs: verify starlight keepsake search`。

## 3. 依赖图

```text
P1 research ─→ P2 spec ─→ P3 plan ─→ P4 visual
                                         ├─→ P5 logic/tests
                                         └─→ P6 frontend/docs
P5 + P6 ─→ P7 catalog ─→ P8 bugs ─→ P9 learn ─→ P10 verification
```

P5 与 P6 可在 P4 后并行，但双方只能写自己的文件集合。根任务负责整合、浏览器修复、目录与全部提交；子任务不得 commit，避免共享 worktree 提交竞争。

## 4. 预提交纪律

每次提交前必须执行：

```sh
git branch --show-current
git rev-parse --show-toplevel
```

确认当前分支与 `/Users/zenith/Desktop/two-of-us` 一致，再 add/commit。hook 失败时修复、重新 add、新建 commit；不得 amend。任何 destructive Git/文件操作仍需当前消息显式授权。

## 5. 完成判据

项目完成不是“页面能亮”，而是同时有证据证明：

1. 规则只能由连续 14 tick 命中推进，图片/像素/动画不拥有业务真相；
2. 相同公开 action 日志确定，Pointer/键盘/暂停/长帧/resize 不偷 tick；
3. 五件秘密按发现时点进入 DOM，direct 等价揭示但不伪造 state；
4. A 级目录可独立复制、零运行依赖、零网络/存储/媒体/传感器；
5. 视觉实现与冻结概念同轮对照达到 agency-signoff，无可修复漂移；
6. 来源、许可证、ImageGen、排除项和零复制边界完整；
7. tests/build/verify/browser/bugs/learn/索引/提交链全部闭环，worktree 干净。
