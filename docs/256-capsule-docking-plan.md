# “转一点，推一点，刚好回家”分步实施计划

- 日期：2026-07-25
- 稳定工作 ID：`capsule-docking`
- 调研：[`176-capsule-docking-research.md`](./176-capsule-docking-research.md)
- 规格：[`177-capsule-docking-spec.md`](./177-capsule-docking-spec.md)
- Brainstorm：[`207-capsule-docking-brainstorm.md`](./207-capsule-docking-brainstorm.md)
- 视觉简报：[`208-capsule-docking-imagegen-brief.md`](./208-capsule-docking-imagegen-brief.md)
- 来源复核：[`228-capsule-docking-source-refresh.md`](./228-capsule-docking-source-refresh.md)
- 目标目录：`experiences/co-op/capsule-docking/`
- 预计启动等级：A（最终 UI 完成后真实 `file://` 直开）

## 1. 任务分类与当前边界

这是非平凡功能：它包含双席权限、确定性整数物理、连续碰撞、六项 Gate、七阶段
reducer、敌对输入防御、浏览器输入生命周期和完整视觉验收，跨越多个文件。
brainstorm、research 与 spec 已完成，本计划不重新设计玩法，只拆分后续提交和验收
顺序。

视觉概念尚未获得用户确认，因此当前只执行总控明确授权的**非视觉核心阶段**：

- 可以创建目录级 CommonJS 边界、纯配置、纯领域逻辑、固定测试 fixture、逻辑测试
  和项目级来源声明；
- 不创建 `index.html`、`app.js`、样式、图片、运行资产或宣称“可玩/已安装”的
  README；
- 不修改 catalog、统一门户、分类索引、共享 runtime 或全局计数；
- 本阶段浏览器验收为 N/A，A 级启动合同仍是未完成状态。

这是一条受控的预实现边界：先证明规则可解、可重放且没有第三方运行依赖，再等待
视觉确认。它不把“逻辑通过”冒充“作品完成”。

## 2. 提交纪律

用户要求每完成一个项目或一部分就提交一次。本作固定以下里程碑：

1. 本实施计划；
2. 非视觉核心、测试、目录级 CommonJS 边界与来源声明；
3. 用户确认后的设计系统与端到端 UI 实施计划；
4. 语义 HTML、浏览器输入与固定步调度；
5. CSS、响应式、降级与视觉闭环；
6. README、catalog、门户、分类索引与仓库合同；
7. 每个真实 bug 的回归测试、修复和 `bugs/` 记录；
8. 可复用结论对应的 `learn/` 记录；
9. 浏览器验收与最终 verification。

每次 commit 前必须精确运行：

```bash
git branch --show-current && git rev-parse --show-toplevel
```

并确认工作树、分支、暂存范围与本项目一致。pre-commit hook 失败时修复后重新
暂存并创建新 commit，绝不 `--amend`。

## 3. 批次一：非视觉核心

本批允许写入：

```text
experiences/co-op/capsule-docking/package.json
experiences/co-op/capsule-docking/config.js
experiences/co-op/capsule-docking/logic.js
experiences/co-op/capsule-docking/golden-fixtures.js
experiences/co-op/capsule-docking/logic.test.js
experiences/co-op/capsule-docking/ATTRIBUTION.md
```

### 3.1 实现顺序

1. exact 普通对象与 descriptor snapshot、递归冻结、安全整数帮助函数；
2. 规格冻结常量、256 项整数三角表与哈希验证边界；
3. `roundDiv`、环形角差、向零阻尼和圆/AABB 查询；
4. 六项对接 Gate 与整数微步移动；
5. exact state/action 校验与七阶段 reducer；
6. public view、配置清洗和完成赠言隔离；
7. 三条显式固定 action fixture；
8. 独立 oracle、敌对输入、重放和静态边界测试；
9. 固定来源、许可证、借鉴点与零复制声明。

### 3.2 冻结实现约束

- `package.json` 精确为 `{"type":"commonjs"}`，不新增依赖或脚本；
- `logic.js` 同时暴露冻结 `window.CapsuleDockingLogic` 与真实 CommonJS 导出；
- 生产物理不调用 `Math.sin`、`Math.cos`、随机、时间、DOM、网络或存储；
- 物理顺序、微步碰撞、闭区间 Gate、stable 30 tick 和 action 闭包逐项服从
  177，不用近似实现替换；
- fixture 只保存显式动作段，不在测试运行时搜索答案；
- public view 不泄露两席 control tick、金路径、评分、燃料或个人失误；
- 配置只能改变两席称呼和最终赠言，不能覆盖规则；
- Gymnasium、p2.js、SAT.js、Phaser 与 NASA 资料都不是运行依赖，不复制其代码、
  测试、参数、素材、品牌或界面。

### 3.3 核心测试 Gate

定向测试至少覆盖：

- API、常量、三航段、冻结与 CommonJS/浏览器经典脚本双出口；
- 三角表长度、象限、对称关系与规范 SHA-256；
- `roundDiv`、角差、阻尼、双按抵消和“新角度施力”顺序；
- 圆/AABB 四边四角、相切 ±1、世界边界、最大速度斜穿和失败优先级；
- 六项 Gate、255/0 角差、仍按键不累计、打断归零与 30 tick；
- 三条 fixture 的 367/382/386 tick、精确终态、两席参与和最终稳定窗；
- 无推进、无姿态、持续压键、失败/重试、SUSPEND、三段完成与重开；
- exact action/state/config、accessor、自定义原型、数组子类和 Proxy 陷阱；
- public view 断引用、阶段文案、failed Gate 覆盖和 terminal Gate hidden；
- 生产目录零网络、零存储、零随机、零 DOM 物理和零第三方运行 import。

命令：

```bash
node --check experiences/co-op/capsule-docking/config.js
node --check experiences/co-op/capsule-docking/logic.js
node --test experiences/co-op/capsule-docking/logic.test.js
npm test
npm run verify
git diff --check
```

完成条件：项目测试与可行的仓库级 Gate 全绿，改动只落在授权路径，然后独立提交
`feat: add capsule docking core`。

## 4. 批次二：视觉确认后的 UI

本批当前阻塞。只有用户明确接受概念后，才可：

1. 生成并审阅 208 定义的 D1–D13 设计锚点；
2. 创建/更新 `209-capsule-docking-design-proposal.md`，记录接受状态、设计令牌、
   组件库存、资产台账与 fidelity ledger；
3. 编写 UI 阶段计划；
4. 实现 `index.html → logic.js → config.js → app.js` 的 A 级经典脚本页面；
5. 完成键盘、双 pointer、input epoch、rAF generation、焦点与 live region；
6. 完成四档视口、两档 200% zoom、reduced-motion、forced-colors、图片阻断和
   无 JavaScript 验收。

不得用本批核心测试结果绕过视觉确认，也不得提前创建占位 UI 或空资产台账。

## 5. 集成与 installed Gate

非视觉核心提交只能进入 `In Progress`。总控在后续 UI 完成后，才可以串行修改：

```text
experiences/catalog.json
README.md
experiences/co-op/README.md
docs/README.md
docs/40-idea-backlog.md
shared/runtime/*
scripts/*
```

只有核心玩法、项目测试、A 级 `file://` 启动、桌面/移动/键盘/触屏/无障碍、
隐私与零网络、README/ATTRIBUTION、catalog/门户/索引、全仓测试和真实浏览器
场景全部通过，才可标记 `installed: true`。逻辑阶段不会增加 installed 计数。
