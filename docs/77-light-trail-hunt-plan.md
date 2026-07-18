# 「光轨围猎」分步实施计划

> 对应规格：[`76-light-trail-hunt-spec.md`](./76-light-trail-hunt-spec.md)。本计划按“一个可独立验收的部分一个提交”执行。

## 1. 执行原则

- 所有实现遵守 A 级 `file://` 直开边界；
- 先冻结视觉概念，再写 UI；
- 纯逻辑与 DOM / Canvas 前端由不同子任务负责，文件所有权不重叠；
- 每个切片先跑定向检查，再确认分支与仓库根目录，最后独立提交；
- 不借机改造共享运行时，不加入首版未要求的 AI、音频、联网或道具；
- 浏览器发现的缺陷先写复现测试或最小复现，再修复并记录到 `bugs/`；
- 可跨项目复用的结论单独写入 `learn/`，不埋在验收文档里。

## 2. 提交切片

### P0：调研

- 文件：`docs/75-light-trail-hunt-research.md`、两级索引；
- 验收：固定提交、许可证、零复制边界、规则矩阵和浏览器 Gate 完整；
- 提交：`b3c4720 docs: research light trail hunt`；
- 状态：已完成。

### P1：规格

- 文件：`docs/76-light-trail-hunt-spec.md`、两级索引；
- 验收：配置、状态、API、原子碰撞、比赛阶段、视觉和测试契约冻结；
- 提交：`3f460df docs: specify light trail hunt`；
- 状态：已完成。

### P2：实施计划

- 文件：本文件、两级索引；
- 验收：文件所有权、依赖顺序、检查命令和提交边界明确；
- 提交：独立 docs 提交；
- 状态：进行中。

### P3：视觉概念与原创资产

- 文件：`docs/78-light-trail-hunt-design.md`、`design/light-trail-hunt/` 概念图、作品 `assets/` 原创资源；
- 所有者：主任务；
- 产出：桌面进行中、手机进行中、桌面终局三张完整概念；
- 验收：使用 ImageGen 生成并通过 `view_image` 检查，记录桌面/手机布局、设计令牌、允许文案、资产用途和刻意偏离；
- 提交：`design: define light trail hunt visuals`。

### P4：纯逻辑层

- 文件所有权：
  - `experiences/versus/light-trail-hunt/config.js`
  - `experiences/versus/light-trail-hunt/logic.js`
  - `experiences/versus/light-trail-hunt/logic.test.js`
- 所有者：逻辑子任务；
- 禁止触碰：HTML、CSS、app、catalog、README、assets；
- 验收：规格第 10.1 节全部通过，公共状态无可变集合泄漏，`git diff --check` 通过；
- 提交：`feat: add light trail hunt state engine`。

### P5：前端与作品说明

- 文件所有权：
  - `index.html`
  - `styles.css`
  - `app.js`
  - `README.md`
  - `ATTRIBUTION.md`
  - `assets/favicon.svg`
- 所有者：前端子任务；
- 只调用已经冻结的逻辑 API，不修改逻辑层；
- 验收：六阶段 DOM、Canvas、键盘、双 Pointer、暂停/恢复、无脚本注入、借鉴声明完整；
- 提交：`feat: add light trail hunt duel`。

### P6：目录接入

- 文件：catalog 数据、catalog 测试、创意池、根 README、作品索引；
- 所有者：主任务；
- 验收：条目字段与规格一致，V01 从待实现转为已实现，全仓校验不遗漏入口或 attribution；
- 提交：`docs: catalog light trail hunt` 或 `feat: catalog light trail hunt`，以实际改动性质为准。

### P7：自动化与浏览器修复

- 文件：仅实际需要的实现/测试文件；
- 所有者：主任务；
- 验收顺序：
  1. `node experiences/versus/light-trail-hunt/logic.test.js`；
  2. `npm test`；
  3. `npm run verify`；
  4. `git diff --check`；
  5. `file://` 桌面 1504×1046；
  6. `file://` 手机 390×844；
  7. `file://` 窄屏 320×700；
  8. localhost 对照一次；
  9. console error、page error、外部请求均为 0；
  10. 核心碰撞、双 Pointer、暂停恢复、下一轮和重赛真实操作。
- 若无需修复：不创建空提交；
- 若需修复：每个同根因修复形成独立 `fix:` 提交。

### P8：bug 记录

- 文件：`bugs/YYYY-MM-DD-light-trail-hunt-*.md`、`bugs/README.md`；
- 只有真实复现过的问题才记录；
- 每条包含环境、复现步骤、期望、实际、根因、修复、回归测试与对应 commit；
- 同一个已修复根因可与修复代码放在同一提交；若浏览器验证后补写，则单独 `docs:` 提交。

### P9：学习沉淀

- 文件：`learn/YYYY-MM-DD-*.md`、`learn/README.md`；
- 候选主题：
  - 实时双人游戏的原子 tick 与公平碰撞；
  - 用不可变输入日志代替可变占用数组作为权威状态；
  - rAF 只驱动、不裁决，以及后台暂停不补帧；
  - 多 Pointer 与键盘 ghosting 的本地双人输入设计；
- 只写经过本作测试或浏览器验证的结论；
- 提交：独立 `learn:` 提交。

### P10：验收闭环

- 文件：`docs/79-light-trail-hunt-verification.md`、两级索引；
- 内容：命令结果、浏览器尺寸、真实路径、状态覆盖、网络边界、fidelity ledger、刻意偏离、残余风险、提交链；
- 完成后再更新创意池统计和仓库总数；
- 提交：`docs: verify light trail hunt`。

## 3. 依赖顺序

```text
P0 调研
  ↓
P1 规格
  ↓
P2 计划
  ↓
P3 视觉概念与资产
  ↓
P4 纯逻辑 ─────┐
                ├→ P6 目录 → P7 浏览器 → P8/P9 → P10 验收
P5 前端与说明 ─┘
```

P4 与 P5 可以并行，但 P5 只能依赖已冻结的规格接口，不能自行改写逻辑契约。若接口不一致，由主任务统一裁决并用小型兼容提交修正。

## 4. 浏览器实玩脚本

### 场景 A：单方撞墙

1. 开始比赛并等待倒计时；
2. 双方分别转向保持路线分离；
3. 让玩家 1 主动撞墙，玩家 2 保持安全；
4. 检查玩家 2 得 1 分、fatal tick 没有半提交；
5. 进入下一轮，检查出生变体切换。

### 场景 B：同格与换位平局

1. 使用可重复的程序化 tick 日志制造同格碰撞；
2. 检查双方死亡原因都含 `same-destination`；
3. 重赛后制造头部换位；
4. 检查双方原因都含 `head-swap`；
5. 两场都不得分。

### 场景 C：双人同时输入

1. 桌面同时按 A/D 与方向键组合；
2. 手机以两个不同 pointerId 在同一 tick 点击两位玩家按钮；
3. 检查两项输入进入同一个 tick；
4. 更换事件先后顺序，状态哈希保持一致。

### 场景 D：生命周期

1. 进行中切到后台超过 500ms；
2. 返回后确认处于暂停且位置未跳变；
3. 恢复后只从新帧开始累计；
4. resize 三档尺寸，状态哈希不变；
5. 完成三轮后重赛，历史和比分清空。

## 5. 停止条件

出现以下任一情况时暂停对应切片并记录：

- 需要复制许可证边界不明的第三方代码或素材；
- 逻辑测试无法在无 DOM 环境运行；
- `file://` 触发模块或资源 CORS 限制；
- 双 Pointer 被 CSS 手势处理吞掉；
- 浏览器结果依赖帧率或输入事件先后；
- 需要改变规格中的玩法、比赛规则或隐私边界。

小型实现缺陷可直接定向修复；会改变冻结规则的偏差必须先更新规格并独立提交。
