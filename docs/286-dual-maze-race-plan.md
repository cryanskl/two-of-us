# 「同路，谁先到」实施计划

> 产品 ID：`dual-maze-race`
> 目标目录：`experiences/versus/dual-maze-race/`
> 状态：设计完成，实施前仍为 Conditional Go
> 规格：[285-dual-maze-race-spec.md](./285-dual-maze-race-spec.md)

## 1. 执行原则

这是非平凡新功能，实施继续采用“纯模型 → 规则 → 视觉方案确认 → UI → 浏览器证据 →
仓库集成”的顺序。

每个阶段：

1. 开始写入或 commit 前执行
   `git branch --show-current && git rev-parse --show-toplevel`；
2. 只改该阶段声明的文件；
3. 跑阶段测试、`npm run verify` 与 `git diff --check`；
4. 测试失败先修复，不带失败进入下一阶段；
5. 独立 commit，不使用 `--amend`；
6. 实际 bug 才写 `bugs/`，实际可复用经验才写 `learn/`；
7. 若参考外部开源项目，写代码前先补借鉴声明。

推荐由控制者把独立文件组交给 subagent 实现；共享 catalog、首页和全仓验收只由控制者
处理。subagent 不应同时编辑同一文件。

## 2. 已完成的前置阶段

| 阶段 | 产物 | 独立 commit |
| --- | --- | --- |
| P0 调研 | `docs/283-dual-maze-race-research.md` | `f3cf9d6` |
| P1 Brainstorm | `docs/284-dual-maze-race-brainstorm.md` | `9591933` |
| P2 Spec | `docs/285-dual-maze-race-spec.md` | `d9f9453` |
| P3 Plan | 本文件 | 本阶段提交后回填以实际 SHA 为准 |

上述阶段没有创建生产目录、UI、catalog、bug 或 learn。

## 3. 文件所有权

| 文件组 | 建议 owner | 可并行前提 |
| --- | --- | --- |
| `maze.js`, `maze.test.js` | Maze agent | Spec 已冻结；不依赖 DOM |
| `logic.js`, `logic.test.js` | Rules agent | Maze API 与固定 fixture 已落地 |
| 视觉方向说明 / 用户选择 | 控制者 | 规则 API 已稳定 |
| `index.html`, `styles.css`, `app.js`, `config.js` | UI agent | 用户已确认视觉方向；logic API 已稳定 |
| `README.md`, `ATTRIBUTION.md` | Docs agent | 实际实现和来源已稳定 |
| 浏览器验收与小修复 | Browser agent / 控制者 | UI 阶段 commit 完成 |
| `experiences/catalog.json`, 首页与共享文档 | 仅控制者 | 全部 Gate 通过后 |

不要让 Maze agent 和 Rules agent 同时创建同一目录骨架。控制者先建立空目录或明确第一个
owner；后续 agent 只添加自己拥有的文件。

## 4. 依赖顺序

```text
P4 确定性迷宫
  └── P5 规则状态机
        ├── P6 视觉方向确认
        │     └── P7 UI 与本地运行
        └── P8 文档与借鉴声明
                 └── P9 浏览器验收与定向修复
                       └── P10 catalog / 首页集成
                             └── P11 全仓验收
```

P6 的设计提案可以在 P5 后与 P8 的资料整理并行；P7 必须等用户选择视觉方向。P10
必须等本作品从 Conditional Go 转为 Go。

## 5. P4：确定性迷宫内核

### 目标

实现精确的 `xorshift32`、迭代 DFS、passage 位图、fingerprint、BFS 和结构校验。

### 文件

- `experiences/versus/dual-maze-race/maze.js`
- `experiences/versus/dual-maze-race/maze.test.js`

### 步骤

1. 按 spec 写方向常量、index / 坐标转换；
2. 实现非零 uint32 的 xorshift32；
3. 实现迭代 DFS，冻结邻居顺序；
4. 输出普通深冻结 DTO 和 v1 fingerprint；
5. 实现 `validateMaze`；
6. 实现 BFS 与 `analyzeMaze`；
7. 用生产函数生成 `COUP`、`PAIR`；
8. 复核路径 28 / 30、转弯 18 / 19、死胡同 10 / 10；
9. 冻结两个完整 fingerprint fixture；
10. 覆盖可变引用与异常输入。

### 验证

```bash
node --test experiences/versus/dual-maze-race/maze.test.js
npm run verify
git diff --check
```

### 停止条件

- 任一 seed 指标不符；
- 不是 81 节点、80 边、全连通生成树；
- passage 不双向；
- 相同 seed 不稳定；
- 调用方能修改 maze；
- 为了通过测试需要改 spec 里的 seed、方向顺序或算法。

任何停止条件触发时，先回到调研模型比对，不直接更新 fixture。

### commit

```text
feat: add deterministic dual maze generator
```

## 6. P5：规则状态机

### 目标

实现完全不依赖 DOM 和时钟的四局赛制、输入队列、fixed tick、暂停与 public view。

### 文件

- `experiences/versus/dual-maze-race/logic.js`
- `experiences/versus/dual-maze-race/logic.test.js`

### 步骤

1. 加载并校验两张生产 maze；
2. 实现 HEATS、初始状态和深冻结；
3. 实现名字清理与输入检查状态；
4. 实现长度 2 FIFO；
5. 实现开局 / 恢复倒数；
6. 实现按 tick 同时消费两人输入；
7. 实现撞墙、原子抵达与本局结果；
8. 实现同 seed 换席和四局积分；
9. 实现暂停、继续、下一局、重赛；
10. 实现不含 queue / gold path / PRNG 的 public view；
11. 用 action trace 验证事件顺序与帧分组不影响结果；
12. 镜像玩家编号验证公平。

### 验证

```bash
node --test experiences/versus/dual-maze-race/maze.test.js
node --test experiences/versus/dual-maze-race/logic.test.js
npm test
npm run verify
git diff --check
```

### 停止条件

- DOM event timestamp 或浮点秒进入 reducer；
- 先处理的玩家在同 tick 获得优势；
- heat 换席后积分跟错 DOM 位置；
- public view 暴露队列或最短路；
- reducer 修改前态；
- 非法 action 抛错或产生新 state。

### commit

```text
feat: add dual maze race rules
```

## 7. P6：视觉方向提案与用户确认

### 目标

在不改生产文件的前提下，提出 2–3 个明确视觉方向，让用户选择后才实施 UI。

### 提案必须说明

- 桌面和手机的两盘排布；
- 玩家身份的颜色 + 形状 + 纹理冗余；
- 墙、当前位置、终点、比分与换席提示的层级；
- 两组 52px 方向按钮如何放置；
- 普通与 reduced-motion 差异；
- forced-colors 与 200% zoom 处理；
- 为什么风格适合“给对象准备”的仓库；
- 不涉及规则扩张。

### 不得先做

- 未确认的完整 UI；
- 新增音频、图片、字体；
- 隐藏一个棋盘的移动布局；
- 将动态动效变成 phase 驱动；
- 为“更好看”修改规格常量。

### 验证

用户明确选择一个方向，或给出可执行的修改意见。这个阶段如果只产出讨论、不写文件，
无需空 commit；若落盘设计说明，则独立 docs commit。

## 8. P7：UI 与本地运行

### 目标

用已确认视觉方向实现语义 HTML、响应式 CSS、配置层、浏览器驱动和 DOM 投影。

### 文件

- `experiences/versus/dual-maze-race/index.html`
- `experiences/versus/dual-maze-race/styles.css`
- `experiences/versus/dual-maze-race/config.js`
- `experiences/versus/dual-maze-race/app.js`

### 步骤

1. 建立语义页面、名字输入和规则摘要；
2. 建立输入检查与键盘风险提示；
3. 渲染两块共享 maze 的 Board；
4. 渲染当前 logical player 与动态席位；
5. 接入键盘归一化；
6. 接入八个原生方向 button，避免 pointerdown + click 双入队；
7. 接入 fixed-step RAF driver；
8. 接入 hidden / blur / pagehide / stalled 暂停；
9. 接入小局、换席与整场结果；
10. 接入安全 `composeMatchNote`；
11. 实现四档响应式、focus-visible、forced-colors、reduced motion；
12. 检查脚本全为经典相对路径。

### 静态检查

```bash
rg -n "type=['\\\"]module|fetch\\(|XMLHttpRequest|WebSocket|WebRTC|localStorage|sessionStorage|indexedDB|serviceWorker|https?://" \
  experiences/versus/dual-maze-race
node --test experiences/versus/dual-maze-race/maze.test.js
node --test experiences/versus/dual-maze-race/logic.test.js
npm test
npm run verify
git diff --check
```

URL 扫描允许 README / ATTRIBUTION 中的资料链接；生产 HTML、CSS、JS 不得出现远程
运行资源。

### 停止条件

- UI 自行计算赢家；
- 两盘不是同一 maze public DTO；
- 移动端隐藏一盘或方向按钮小于 52px；
- 暂停后发生 catch-up；
- reduced motion 改变 action trace；
- `file://` 需要服务器或权限。

### commit

```text
feat: build dual maze race interface
```

## 9. P8：使用说明与借鉴声明

### 目标

记录准确的启动方式、规则、定制边界、输入限制、隐私和来源。

### 文件

- `experiences/versus/dual-maze-race/README.md`
- `experiences/versus/dual-maze-race/ATTRIBUTION.md`

### README 必须包含

- 双击 `index.html`；
- 四局、换席、tick、撞墙和计分；
- 键盘与触控操作；
- ghosting 与多点触控不保证；
- 暂停语义；
- 如何只改称呼和赛后文案；
- 不联网、不存储、不申请权限；
- 浏览器和小屏限制；
- 测试命令。

### ATTRIBUTION 必须包含

- 独立实现声明；
- 调研论文、规范和硬件说明的固定 URL；
- 这些资料用于什么、未复制什么；
- “未参考外部开源实现”的当前事实；
- 若实施期间实际参考开源仓库，补固定 commit/tag、LICENSE、版权、借鉴与未复制范围；
- 若引入代码或素材，保留许可证正文和 notice。

### 验证

```bash
npm run verify
git diff --check
```

### commit

```text
docs: document dual maze race
```

## 10. P9：浏览器验收与定向修复

### 目标

通过真实浏览器证明交互、布局和本地合同；只修复实际观察到的问题。

### 环境

- localhost 自动化：用于稳定导航、action trace、视口与 a11y；
- `file://` 手工：用于证明最终用户直开；
- 至少一台真实触屏设备：用于双 pointer / 双 activation；
- 至少一块目标物理键盘：用于联合输入检查。

### 验收批次

#### 批次 A：核心流程

- 输入名字；
- 方向与联合检查；
- 完成四局；
- 两次同 seed 且换席正确；
- 同 tick 平局；
- 分数与结果可解释；
- 重赛保留名字、重置比赛。

#### 批次 B：时序与故障

- 高频交错键盘输入；
- 队列满；
- 撞墙；
- 手动暂停；
- tab hidden、window blur、pagehide；
- 人工制造 >500ms stall；
- 恢复倒数；
- 无后台 catch-up。

#### 批次 C：输入平台

- WASD 与方向键单独及同时；
- ghosting warning；
- 两组按钮鼠标 / 键盘 activation；
- 真实双触点；
- pointercancel 后无残留按下态。

#### 批次 D：可访问与响应式

- Tab、Enter、Space；
- 焦点可见且顺序合理；
- live region 不逐 tick 刷屏；
- 200% zoom；
- forced-colors；
- reduced motion；
- `1440 × 900`、`1280 × 800`、`390 × 844`、`320 × 700`；
- 无横向滚动、双盘尺寸达 Gate。

#### 批次 E：本地与隐私

- `file://` 完成四局；
- 复制作品目录后直开；
- Network 无远程请求；
- Storage 无新增；
- 图片阻断和离线仍可玩；
- Console 无错误；
- public DOM / ARIA 无最短路与输入队列。

### bug 与 learn

只有观察到真实失败才创建：

```text
bugs/<date>-dual-maze-race-<slug>.md
```

至少记录：环境、复现、预期、实际、根因、修复、回归测试、修复 commit。

只有能跨项目复用的结论才创建：

```text
learn/<date>-<topic>.md
```

例如真实双触点事件边界、fixed-step stall 策略或经典脚本 VM 测试方式。不得把 spec 的
待办提前伪装成 bug / learn。

### commit

每个独立修复单独提交：

```text
fix: <concise dual maze issue>
docs: record <verified reusable lesson>
```

## 11. P10：catalog 与首页集成

### 前置 Gate

只有以下全部成立才进入：

- P4–P9 完成；
- 单测、全仓测试与 verify 通过；
- `file://` 四局完成；
- 键盘联合与真实双触控证据完成；
- 四档视口与 a11y 通过；
- 借鉴声明准确；
- Conditional Go 已转 Go。

### 允许控制者修改

- `experiences/catalog.json`
- 首页或共享入口的必要文件
- 创意池状态与项目索引的必要文档

catalog 条目：

```json
{
  "id": "dual-maze-race",
  "title": "同路，谁先到",
  "category": "versus",
  "level": "A",
  "installed": true
}
```

实际字段必须以当前 catalog schema 为准，不能只复制上面示意对象。描述应提到同题
双盘、同 seed 换席四局和 fixed tick；不要声称“兼容所有键盘/手机”。

### 验证

```bash
npm test
npm run verify
git diff --check
```

再在首页打开条目并完成一次启动。共享文件的冲突由控制者在目标 worktree 解决，
subagent 不自行 rebase、force push 或覆盖其他项目集成。

### commit

```text
feat: install dual maze race
```

## 12. P11：最终验收

### 自动化

```bash
node --test experiences/versus/dual-maze-race/maze.test.js
node --test experiences/versus/dual-maze-race/logic.test.js
npm test
npm run verify
git diff --check
git status --short
```

### 人工 / 浏览器

- 从仓库首页打开作品；
- 直接双击作品 `index.html`；
- 桌面键盘完成四局；
- 真实触屏完成四局；
- 复核换席、平局、暂停、结果；
- 复核四档视口；
- 复核离线、Network、Storage、Console；
- 复核 README、ATTRIBUTION、实际 bug / learn。

### 最终报告

报告分开列出：

- 产品结论：Go / Conditional Go / No-Go；
- 推荐 ID、标题、分类、等级；
- 作品与集成 commit；
- 自动测试；
- 浏览器与实机证据；
- `file://` 与 localhost 证据；
- 依赖、网络、存储、权限；
- 外部开源参考与许可证结论；
- bugs / learn（没有就明确没有实际条目）；
- 工作树是否干净。

## 13. 失败回退

| 失败 | 处理 |
| --- | --- |
| 生成指标漂移 | 停止 P4，比较精确算法，不更新 fixture 掩盖 |
| 同 tick 不可交换 | 停止 P5，修 reducer 原子性 |
| 键盘联合检查失败 | 提示触控；若目标设备也无法触控，则保持 Conditional Go |
| 真机双触控漏报 | 调整事件路径后重测；仍不可靠则 No-Go |
| 390 / 320 双盘不可读 | 重新做已确认视觉布局；不得隐藏一盘 |
| `file://` 失败 | 移除模块 / fetch /路径依赖；不得降级为 B |
| 无障碍状态刷屏 | 降低播报频率，不停止规则 tick |
| 发现外部源码参考 | 暂停写码，先补 ATTRIBUTION 与许可证 |
| 共享文件冲突 | 交还控制者，保留各阶段 commit，不破坏性覆盖 |

## 14. 本计划完成标准

本计划本身只冻结实施顺序，不授权创建生产 UI 或把项目标记 installed。下一步从 P4
开始；每完成一个可验证部分就独立 commit。
