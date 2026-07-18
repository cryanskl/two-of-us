# A 级「光轨围猎」定向调研

> 状态：玩法、来源、许可证、技术边界与验证向量已收口；下一步见实现规格。

## 1. 结论先行

「光轨围猎」适合做成一个 **零依赖、纯前端、双击即可运行** 的 A 级双人对抗作品：

- 目录 ID：`light-trail-hunt`；
- 入口：`experiences/versus/light-trail-hunt/index.html`；
- 运行边界：原生 HTML、CSS、JavaScript 与 Canvas 2D，无构建步骤、无网络请求；
- 玩法：双方持续前进，只能相对左转或右转；经过的格子永久成为轨迹；撞墙、撞旧轨迹或同 tick 相撞即结束本局；
- 公平核心：双方输入在同一个固定逻辑 tick 内同时生效，碰撞原子结算；
- 原创边界：不使用 TRON 名称、标识、车辆造型、电影视觉资产，也不复制参考项目的代码、素材、音频或依赖。

它补齐了当前作品库较少见的“实时同屏、持续运动、空间封锁”对抗类型。难点不在 Canvas 绘制，而在公平结算、键盘冲突、后台暂停和确定性重放。

## 2. 玩法 brainstorm 与取舍

| 方案 | 优点 | 风险 | 结论 |
| --- | --- | --- | --- |
| 连续坐标自由驾驶 | 视觉流畅，转向自由 | 碰撞穿透、帧率差异、重放困难 | 不采用 |
| 固定网格逐 tick 前进 | 规则清晰，结果可重放，碰撞可枚举 | 需要用渲染插值保持观感 | 采用 |
| 道具、加速、临时断轨 | 变化丰富 | 随机性和规则复杂度破坏首版公平 | 不采用 |
| 同设备键盘双人 | 零安装，真实同时操作 | 键盘 ghosting 与方向键滚动 | 采用，并提供备用键和触屏按钮 |
| 全画布 swipe | 画面干净 | 双人多点难发现、误触阈值不稳定 | 不采用 |
| 四个显式转向按钮 | 可发现、支持两个 pointerId 同时按下 | 手机底部占空间 | 采用 |
| 无限局累计比分 | 可长期对战 | 单次体验没有明确结束点 | 不采用 |
| 三局上限、先到两胜 | 节奏短，历史有界 | 第三局仍可能总比分相同 | 采用，允许比赛平局 |

首版刻意不加入 AI、联网、随机物品、音频和自定义地图。它们不是让核心玩法成立的条件。

## 3. 固定来源与许可证审计

以下项目只用于研究公开规则、架构取舍和已知风险。最终实现采用原创代码与原创资产，不直接引入任何一项。

### 3.1 JDStraughan/html5-lightcycles

- 固定提交：[`b19dc25bb78f9ac7299f83193774978089ff0cc2`](https://github.com/JDStraughan/html5-lightcycles/tree/b19dc25bb78f9ac7299f83193774978089ff0cc2)；
- 许可：仓库没有独立 `LICENSE` 文件，但该固定提交的 [README 包含完整 MIT 文本](https://github.com/JDStraughan/html5-lightcycles/blob/b19dc25bb78f9ac7299f83193774978089ff0cc2/README.md)，Copyright 2013 Jason D. Straughan；
- 研究价值：轻量 Canvas、轨迹占用和 A 级直开边界；
- 不采用处：逐个更新玩家会产生顺序偏差，`setInterval`、旧式 `keyCode` 和随机 AI 也不适合作为确定性核心。

### 3.2 thatplatypus/LightCycle

- 固定提交：[`1d35ea0306766bbc5f4a52244ef820db431776fc`](https://github.com/thatplatypus/LightCycle/tree/1d35ea0306766bbc5f4a52244ef820db431776fc)；
- 许可：根目录为 [MIT License](https://github.com/thatplatypus/LightCycle/blob/1d35ea0306766bbc5f4a52244ef820db431776fc/LICENSE)，Copyright 2025 thatplatypus；
- 额外边界：[README 的音频清单](https://github.com/thatplatypus/LightCycle/blob/1d35ea0306766bbc5f4a52244ef820db431776fc/README.md#credits) 同时包含 CC BY-NC 4.0、CC BY 3.0 与 CC0，根 MIT 不能覆盖这些第三方素材；
- 研究价值：本地多人、暂停与触摸输入；
- 不采用处：SvelteKit、PixiJS、第三方音频和逐玩家更新逻辑全部排除。

### 3.3 dpren/WebGL-Tron

- 固定提交：[`7d4faa2cfa7152186924484d5bd191778babdff0`](https://github.com/dpren/WebGL-Tron/tree/7d4faa2cfa7152186924484d5bd191778babdff0)；
- 许可：根目录为 [MIT License](https://github.com/dpren/WebGL-Tron/blob/7d4faa2cfa7152186924484d5bd191778babdff0/LICENSE)，Copyright 2015 dpren；
- 风险：仓库捆绑 Three.js、Ramda、dat.gui、字体、模型、图片和大量声音，未逐项证明素材来源；
- 研究价值：轨迹逐渐封锁空间的节奏；
- 不采用处：所有库、字体、模型、图片、声音和影视化视觉均排除。

### 3.4 patorjk/JavaScript-Snake

- 固定提交：[`68d0ef1a53d6a4191a9c4e4b851d5d4fdc86ce05`](https://github.com/patorjk/JavaScript-Snake/tree/68d0ef1a53d6a4191a9c4e4b851d5d4fdc86ce05)；
- 许可：根目录为 [MIT License](https://github.com/patorjk/JavaScript-Snake/blob/68d0ef1a53d6a4191a9c4e4b851d5d4fdc86ce05/LICENSE)，Copyright Patrick Gillespie；
- 研究价值：离散网格、持续前进和占用格；
- 不采用处：代码、CSS、图片资源和 Parcel 开发依赖均不复制。

### 3.5 许可证结论

- 复制 MIT 项目的实质性代码时必须保留版权和许可文本；本作品不走复制路径。
- 仓库根许可证不自动重授权其中的第三方音频、字体、模型或图片。
- 只研究抽象玩法、状态不变量和工程风险，并使用独立表达与原创实现，可以保持作品边界清晰。
- `ATTRIBUTION.md` 仍会透明列出研究来源、固定提交、许可证与未使用内容。

## 4. 冻结规则

### 4.1 棋盘与出生点

- 逻辑棋盘固定为 `48 × 32`；
- 默认逻辑步长为 `100ms`，即每秒 10 格；
- 玩家 1 初始点 `(8, 8)`、朝东；
- 玩家 2 初始点 `(39, 23)`、朝西；
- 出生格从第 0 tick 起就是各自轨迹；
- 每轮交替使用中心对称的出生变体，避免长期重复同一局部路线。

Canvas 大小、设备像素比和窗口宽度只影响渲染，不影响逻辑坐标。

### 4.2 转向

- 玩家每 tick 可直行、相对左转或相对右转；
- 不能停车，不能直接 180° 掉头；
- 同一玩家在同一 tick 收到多个有效意图时，以最后一个为准；
- `keydown.repeat` 不产生额外转向；
- 两位玩家输入事件的到达顺序不能改变下一状态。

### 4.3 原子碰撞

每个逻辑 tick 严格按以下顺序结算：

1. 从同一个旧状态读取双方转向意图；
2. 计算双方新方向；
3. 只计算两个尝试位置，不修改轨迹；
4. 分别检查越界与旧轨迹；
5. 再检查双方是否进入同一空格，以及是否交换旧头部位置；
6. 收集双方完整死亡原因；
7. 一次性决定本局胜负或平局；
8. 若有人死亡，记录尝试位置，但不把安全一方的新格单独写入轨迹；
9. 若双方都安全，再同时提交两个新位置与占用格。

由此得到明确规则：

- 仅一人死亡，另一人获胜；
- 同 tick 两人死亡，无论原因相同与否，都判平局；
- 同一空格相撞是平局；
- 交换相邻头部位置是平局；
- 一人撞墙、另一人同 tick 撞旧轨迹，仍是平局；
- 玩家编号和事件先后永远不用于打破平局。

### 4.4 比赛结构

- 单局唯一幸存者得 1 分，平局双方不得分；
- 一场比赛最多三轮；
- 任一方先得 2 分则提前结束；
- 三轮后若仍同分，整场比赛判平；
- “下一轮”保留比分；
- “重新比赛”清空比分和轮次历史。

## 5. 确定性与可重放状态

权威状态不直接保存可变 `Set`、`Map` 或向外暴露的 `Uint8Array`。每轮保存：

```text
round = {
  spawnVariant,
  ticks: [
    { turns: [-1 | 0 | 1, -1 | 0 | 1] }
  ]
}
```

完整比赛状态建议为：

```text
phase: ready | countdown | playing | paused | round-end | match-end
playerNames: [string, string]
rounds: round[]
countdownMs: integer
pauseReason: null | manual | hidden | blur | stalled
revision: integer
```

视图通过 `replayRound()` 从出生点和 tick 日志派生占用格、位置、方向、碰撞原因、轮次结果和比分。这样可以保证：

- 同一配置和 tick 日志总能得到相同状态；
- UI 无法在权威状态之外偷偷改轨迹；
- 复现 bug 时只需保存小型输入日志；
- resize、刷新率、Canvas DPR 和渲染插值都不会污染结果；
- 历史最多三轮，不会无限膨胀。

驱动层使用 `requestAnimationFrame + accumulator`，reducer 只接受整数时间片。页面隐藏、失焦或单帧间隔超过 `500ms` 时自动暂停并清空 accumulator，不补跑积压 tick。

## 6. 输入、触屏与可访问性

### 6.1 键盘

- 玩家 1：`KeyA` 左转、`KeyD` 右转；
- 玩家 2：`ArrowLeft` 左转、`ArrowRight` 右转；
- 玩家 2 备用：`KeyJ` 左转、`KeyL` 右转，缓解部分键盘 ghosting；
- 仅在 `playing` 且命中游戏键时阻止浏览器默认行为；
- `Escape` 暂停或恢复；
- 页面隐藏或失焦自动暂停。

使用 `KeyboardEvent.code` 表达物理按键位置，与 W3C [UI Events KeyboardEvent code](https://www.w3.org/TR/uievents-code/) 对游戏控制的定义一致。硬件矩阵漏报不能由 JavaScript 修复，因此必须保留备用键和触屏入口。

### 6.2 触屏

控制区提供四个真实按钮：

```text
[玩家1 左转] [玩家1 右转]   [玩家2 左转] [玩家2 右转]
```

- 使用 `pointerdown`，不同 `pointerId` 独立处理；
- 控制区声明 `touch-action: none`，符合 [Pointer Events](https://www.w3.org/TR/pointerevents/) 的手势协商方式；
- 每个目标至少 `48 × 48px`，主手机尺寸建议 56px；
- `pointercancel` 与 `lostpointercapture` 清除按下视觉状态；
- 每个按钮提供完整 `aria-label`；
- 身份同时使用文字、头部形状或轨迹纹理与颜色，不只靠颜色区分。

### 6.3 状态播报与减弱动态

- 胜负、平局、暂停和恢复进入 `role="status"` 的 live region；
- 不逐 tick 播报坐标；
- `prefers-reduced-motion` 只关闭脉冲、粒子和震动表现，不改变速度、规则或结果；
- 结果出现后焦点进入结果标题或“下一轮”按钮，重开后回到首个有效控制。

## 7. 核心测试向量

以下碰撞向量使用 `7 × 7` 小棋盘，坐标为 `0…6`：

| 编号 | 旧状态与意图 | 预期 |
| --- | --- | --- |
| T01 | P1 `(1,3) E`，P2 `(5,3) W` | 安全移至 `(2,3)`、`(4,3)` |
| T02 | P1 `(2,3) E`，P2 `(4,3) W` | 同到 `(3,3)`，双方死亡，平局 |
| T03 | P1 `(2,3) E`，P2 `(3,3) W` | 交换头部格，双方死亡，平局 |
| T04 | P1 `(0,2) W`，P2 安全 | P1 越界，P2 获胜 |
| T05 | P1 `(0,2) W`，P2 `(6,4) E` | 双方越界，平局 |
| T06 | P1 下一格是自己的旧轨，P2 安全 | P1 自撞，P2 获胜 |
| T07 | P1 下一格是 P2 的旧轨，P2 安全 | P1 撞对方轨迹，P2 获胜 |
| T08 | P1 越界，P2 同 tick 撞旧轨 | 不同原因双亡，平局 |
| T09 | 双方同到一个已有轨迹的格 | 保留多个死亡原因，但只产生一个平局 |
| T10 | 同玩家同 tick 先左后右 | 只消费最后一个有效意图 |
| T11 | 以 P1→P2、P2→P1 两种顺序送入输入 | 下一状态逐字段相同 |
| T12 | `10 × 10ms` 与 `1 × 100ms` 驱动 | 都只推进一个逻辑 tick |

还必须覆盖：隐藏自动暂停、暂停期间不推进、resize 状态哈希不变、同日志重放一致、致命 tick 无半提交、结束后输入幂等、下一轮保留比分、重赛清零、重复键忽略、非游戏键不拦截、双 pointerId 同 tick 输入、减弱动态不改规则、恶意姓名按纯文本输出、`file://` 无外部请求。

## 8. 浏览器验收 Gate

### 8.1 共同 Gate

- 真实使用 `file:///.../index.html` 打开，不以 localhost 代替；
- 控制台 error 0、page error 0、外部网络请求 0；
- 真实操作开局、左右转、单方死亡、同格平局、换位平局、暂停、恢复、下一轮和重赛；
- 键盘与触屏都进入同一个 `queueTurn(player, turn)`；
- 高 DPR 只提升 Canvas 清晰度，不改变逻辑尺寸；
- 页面无横向溢出，按钮不重叠，结果层不挡住主操作。

### 8.2 `320 × 700`

- `scrollWidth === clientWidth === 320`；
- 棋盘建议约 `296 × 197px`；
- 四按钮至少 `48 × 48px`、间距至少 8px；
- 棋盘、比分和四个按钮尽量同屏；
- 使用两个 pointerId 验证双方同 tick 转向。

### 8.3 `390 × 844`

- `scrollWidth === clientWidth === 390`，无非预期纵向滚动；
- 棋盘建议约 `366 × 244px`；
- 触控按钮建议 `56 × 56px`；
- 长姓名、两位数比分、暂停文案不挤压棋盘。

### 8.4 `1504 × 1046`

- 棋盘最大约 `900 × 600px` 或 `960 × 640px`，逻辑仍为 `48 × 32`；
- 完成一局真实键盘对战，验证 A/D 与方向键同时操作；
- 以程序化输入验证 T02、T04、T08；
- 相同输入日志在不同 rAF 分片下得到相同状态哈希；
- 截取准备、进行中、平局和单方胜利四态。

## 9. 借鉴声明草案

README 简版：

> 「光轨围猎」是基于经典 light-cycle / trail-survival 机制重新设计的原创本地双人游戏。研究阶段参考了 JDStraughan/html5-lightcycles、thatplatypus/LightCycle、dpren/WebGL-Tron 与 patorjk/JavaScript-Snake 的公开规则描述及架构取舍。最终实现未复制这些项目的代码、素材、音频或依赖，游戏逻辑、界面、文案、视觉资源与测试均为独立实现。

作品内 `ATTRIBUTION.md` 必须进一步列出四个固定提交、许可证、作者，以及每个项目明确未使用的代码或资产范围。
