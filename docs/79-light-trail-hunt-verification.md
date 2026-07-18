# 「光轨围猎」验收记录

> 验收日期：2026-07-18。作品入口：[`../experiences/versus/light-trail-hunt/index.html`](../experiences/versus/light-trail-hunt/index.html)。本记录覆盖纯逻辑、catalog、真实 `file://`、localhost、三档响应式、交互、视觉和来源声明。

## 1. 结论

「光轨围猎」已达到 A 级本地优先完成标准：

- 双击 `index.html` 可直接运行；
- 无构建、无网络、无存储、无浏览器能力权限；
- 双方输入按同一旧快照原子结算；
- fatal tick 保留尝试位置但不半提交轨迹；
- 最多三轮、先到 2 分提前结束，三轮后允许比赛平局；
- 键盘与四个 Pointer 按钮进入同一个输入队列；
- 三档原生 viewport 无横纵溢出；
- 来源、固定提交、许可证与零复制边界完整；
- catalog、创意池和对抗目录均已接入。

## 2. 自动化结果

### 2.1 纯逻辑

命令：

```bash
node experiences/versus/light-trail-hunt/logic.test.js
```

结果：`21 / 21` 通过。覆盖：

- 默认与非法配置回退；
- CommonJS / 浏览器全局双入口；
- 六个键位与未知键；
- 安全移动与双方同时提交；
- 单方 / 双方撞墙；
- 自己旧轨 / 对方旧轨；
- 同格与换位平局；
- 不同原因双亡与多原因固定排序；
- fatal tick 不半提交；
- 最后意图与事件顺序无关；
- 出生变体镜像公平；
- 暂停、恢复、倒计时与无效阶段幂等；
- 下一轮比分、两胜提前结束、三轮平局与重赛；
- 同日志重放、返回视图隔离和公共状态无可变集合。

### 2.2 catalog 与静态边界

命令：

```bash
node --test shared/runtime/catalog.test.js
npm run verify
```

结果：

- catalog 定向：`51 / 51`；
- 仓库验收：`37 个作品入口、1 个能力声明`；
- 光轨围猎静态 Gate 确认无模块脚本、外链、网络 / 存储 / 媒体 API、随机数和 `innerHTML`；
- 检查统一 `queueTurn()`、rAF、`visibilitychange`、`same-destination`、`head-swap`、纹理路径、`touch-action: none` 与四个固定来源。

### 2.3 全仓

命令：

```bash
npm test
git diff --check
```

结果：`462 / 462` 通过，diff whitespace 检查通过。该数字包含同一时间完成的「这一颗我先到」测试；光轨围猎自己的逻辑与 catalog 定向数字在上方单列，避免把并行项目混成作品自测数量。

## 3. 真实浏览器路径

应用内 Browser / Chrome 连接在当前环境不可调用，因此按浏览器技能的回退路径使用 Playwright 1.61.1 驱动本机 Google Chrome。Playwright 自带 Chromium 未安装，最终使用：

```text
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

### 3.1 `file://`

真实导航：

```text
file:///Users/zenith/Desktop/two-of-us/experiences/versus/light-trail-hunt/index.html
```

三个页面上下文都直接加载本地文件，没有用 localhost 冒充 A 级直开。每档均记录：

- console error：0；
- page error：0；
- 非 `file://` 请求：0；
- H1：`光轨围猎`；
- 副标题：`别追光，去改写它的边界。`；
- ready → countdown → playing → paused → playing → round-end 完整走通。

### 3.2 localhost 对照

启动：

```bash
TWO_OF_US_PORT=4199 node scripts/start.mjs --no-open light-trail-hunt
```

检查：

- `GET /api/health` 返回 `ok: true`；
- `http://localhost:4199/experiences/versus/light-trail-hunt/index.html` 三档重复通过；
- console error、page error、跨源请求均为 0；
- 完成后发送 SIGINT，运行时报告端口已释放。

## 4. 响应式几何

| viewport | 文档 `client / scroll` | 棋盘实际尺寸 | 触控按钮 | 结论 |
| --- | --- | --- | --- | --- |
| 1504×1046 | 1504×1046 / 1504×1046 | 958×638 | 桌面隐藏触控组，显示键位栏 | 无横纵溢出 |
| 390×844 | 390×844 / 390×844 | 364×242 | 4 个 56×56 | 无横纵溢出 |
| 320×700 | 320×700 / 320×700 | 294×195.33 | 4 个 48×48 | 无横纵溢出 |

三档棋盘宽高比均约为 `1.5`；逻辑网格始终是 48×32，CSS 尺寸和 DPR 不进入 reducer。

## 5. 真实交互

每档执行同一场景：

1. 点击“开始围猎”，等待 2400ms 倒计时；
2. 以 `pointerId=41` 让玩家 1 左转；
3. 同一 tick 以 `pointerId=42` 让玩家 2 右转；
4. 等待一个逻辑步并截取 playing；
5. 按 Escape 暂停；
6. 检查暂停面板出现，再点击“继续”；
7. 玩家 1 向北撞上边界；
8. 进入 `round-end`，结果为“阿昼 留住了这片边界”；
9. 截取终局，检查碰撞震点、比分 `0 — 1` 和“下一轮”。

键盘路径另执行 A/D 与方向键；静态和逻辑测试同时固定 J/L 备用键、重复键忽略和事件顺序无关。

## 6. 生命周期与 reduced motion

- 浏览器上下文以 `reducedMotion: reduce` 启动，`matchMedia('(prefers-reduced-motion: reduce)')` 为 true；
- 倒计时和逻辑 tick 照常推进，说明减弱动态没有替换规则；
- 在真实页面派发标准 `window.blur` 事件后，阶段进入 `paused`；
- 可见原因是“离开页面，已为你们暂停”。

自动化限制：Playwright 的隔离上下文即使打开第二页也保持原页 `visibilityState=visible`，CDP freeze 也不等价于用户切换标签页；因此本轮没有把这两种操作伪称为真实 `visibilitychange=hidden`。隐藏 / stalled 的纯逻辑与接线已有单元和静态测试，真实 tab 切换保留为手工硬件复核项。

## 7. 视觉 fidelity ledger

同一轮 QA 中以原始尺寸同时查看：

- [`desktop-playing.png`](../design/light-trail-hunt/desktop-playing.png) 与 1504×1046 浏览器 playing；
- [`mobile-playing.png`](../design/light-trail-hunt/mobile-playing.png) 与 390×844 浏览器 playing；
- [`desktop-draw.png`](../design/light-trail-hunt/desktop-draw.png) 与 1504×1046 浏览器 round-end。

| 对照项 | 结果 | 说明 |
| --- | --- | --- |
| 深靛蓝纸张与黄铜网格 | 通过 | 31KB 本地 WebP + 程序网格，加载失败仍有纯色降级 |
| 青绿 / 珊瑚双轨 | 通过 | 颜色对比明确，低强度余辉没有变成 synthwave 霓虹 |
| 缺口圆环 / 菱形 | 通过 | 身份不只靠颜色，赛场和图例一致 |
| 桌面棋盘主导 | 通过 | 实际 958×638，侧栏只保留两条规则和图例 |
| 手机棋盘主导 | 通过 | 364×242，标题、比分、轮次和控制全部首屏可见 |
| 双玩家触控分组 | 通过 | 青 / 珊瑚左右两组，中间黄铜分隔，两个 pointerId 可同时输入 |
| 暂停层级 | 通过 | 桌面居中、手机全宽，未抢走比分与棋盘 |
| 终局保留现场 | 通过 | 结果在桌面右栏，Canvas 保留 fatal 尝试与震点 |
| 小圆角与编辑式排版 | 通过 | 按钮 2px 圆角，没有胶囊、玻璃卡或营销卡片 |
| 320px 降级 | 通过 | 装饰收敛，48px 按钮、294×195 棋盘，无滚动 |

### 7.1 above-fold 文案差异

- H1：概念与实现均为 `光轨围猎`；
- 副标题：实现严格使用 `别追光，去改写它的边界。`；
- playing 状态：均为 `围猎进行中`；
- 概念展示第 2 轮 `1 — 0`，验收截图是新比赛第 1 轮 `0 — 0`，属于状态差异，不是文案漂移；
- 生成概念里的长制图说明被实现压缩为两条冻结规则。

### 7.2 刻意偏离

- 不加载生成稿的书法字体，使用系统宋体 / 无衬线 / 等宽回退；
- 不引入圆规、尺子、地图纸角饰图片，减少资源与窄屏噪声；
- 真实 Canvas 严格 48×32，不照抄概念图近似格数；
- 终局不实现概念中的“再看这一局”，因为首版规格没有定义回放 UI；
- 手机概念是高分辨率构图稿，实际以 390×844 CSS 像素 Gate 为准。

## 8. 来源与资产

[`ATTRIBUTION.md`](../experiences/versus/light-trail-hunt/ATTRIBUTION.md) 已列出：

- `JDStraughan/html5-lightcycles@b19dc25...`；
- `thatplatypus/LightCycle@1d35ea0...`；
- `dpren/WebGL-Tron@7d4faa2...`；
- `patorjk/JavaScript-Snake@68d0ef1...`。

声明明确最终实现未复制这些项目的代码、构建产物、图片、字体、模型、音频或依赖；状态机、界面、文案、视觉资源与测试均为独立实现。`board-texture.webp` 为本项目 ImageGen 原创生产资产。

## 9. 已修复 bug

- [`../bugs/2026-07-18-light-trail-attribution-heading-contract.md`](../bugs/2026-07-18-light-trail-attribution-heading-contract.md)：作品 README 最初使用“借鉴声明”，catalog 接入后不满足机器 Gate；已改为“借鉴与来源声明”，定向和仓库验收通过。

## 10. 学习沉淀

- [`../learn/2026-07-18-simultaneous-tick-atomic-collision.md`](../learn/2026-07-18-simultaneous-tick-atomic-collision.md)：同时输入、旧快照、尝试位置、多原因单次结算、fatal tick 不半提交、输入槽位与重放日志。

## 11. 完成提交链

| commit | 部分 |
| --- | --- |
| `b3c4720` | 定向调研 |
| `3f460df` | 实现规格 |
| `3912d8b` | 分步实施计划 |
| `c2912c2` | 视觉概念与原创纹理 |
| `deda169` | 纯逻辑状态机与 21 项测试 |
| `f87914a` | 前端、Canvas、输入与来源说明 |
| `42977cc` | 来源标题 bug 与复现记录 |
| `14d1447` | catalog、创意池、对抗索引与静态测试 |
| `2b54fcb` | 原子 simultaneous tick 学习沉淀 |

本验收文档与两级索引形成最后一个独立 docs 提交。

## 12. 残余风险

- 键盘 ghosting 取决于实体键盘矩阵，JavaScript 无法消除；作品提供 J/L 备用键和触控按钮；
- 自动化环境不能把原页切为 `visibilityState=hidden`，真实标签切换仍建议在常用浏览器手工复核一次；
- 当前不提供 AI、音频、联网、随机道具和回放 UI，这是首版冻结边界，不是缺失运行依赖。

这些风险不影响 A 级 `file://` 双人同屏核心闭环。
