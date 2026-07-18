# A 级「双人调色台」定向调研

> 调研日期：2026-07-18。目标是把创意池 C11 收敛为一个可双击、无公网依赖、同机双人合作、结果可确定重放的短局色彩作品。

## 1. 选题结论

- 作品名：**把颜色调到一起**；
- 目录 ID：`shared-color-studio`；
- 主分类：双人合作；
- 启动等级：A，直接双击本目录 `index.html`；
- 核心分工：玩家 1 只能转动共享颜色的色相，玩家 2 只能调节明度；两条轴都落到目标刻度才完成一张色笺；
- 首版边界：五张固定色笺、每张 24 秒、失败可无惩罚重试；不做相机取色、照片导入、绘画、颜料物理模拟、随机题库、联网、AI、排行榜或色彩诊断。

当前合作目录还没有“双方各持一个连续参数、共同校准同一结果”的样板。这个机制不依赖私人照片或声音，一句话可以解释，而且任何一名玩家都不能独自完成两条轴。

## 2. Brainstorm 与取舍

| 方案 | 优点 | 风险 | 结论 |
| --- | --- | --- | --- |
| 两人都能拖动完整取色器 | 自由度高 | 分工不存在，一人可包办 | 不采用 |
| 一人控制色相、一人控制明度 | 分工对称，状态只有两个离散轴 | 必须提供非颜色反馈 | 采用 |
| 连续滑杆 + 允许误差 | 手感细腻 | 浮点边界、触屏精度与测试不稳定 | 不采用 |
| 12 格色相环 + 9 格明度尺 | 可键盘、触屏、重放和精确判定 | 刻度明显会降低辨色挑战 | 采用；挑战定位为限时协调而非色觉考试 |
| 隐藏目标刻度只看颜色 | 更像猜色 | 对色觉差异用户不公平 | 不采用 |
| 固定五张色笺 | 可设计难度曲线，复现稳定 | 重玩变化较少 | 首版采用 |
| 随机目标和开局 | 重玩变化丰富 | 难复现，可能生成过近目标 | 首版不采用 |
| 失败扣分或失去生命 | 更有压力 | 合作气氛变成互相责备 | 不采用；原色笺可立即重试 |

作品的挑战来自两人必须同时关注自己的轴、有限时间里避免越过目标，以及在不同输入设备上保持节奏一致。它不是专业校色工具，也不以辨色能力给玩家排名。

## 3. 色彩模型与回退边界

[W3C CSS Color 4](https://www.w3.org/TR/css-color-4/) 说明：HSL 的色相角并不感知均匀；Oklab 比 CIE Lab 更接近感知均匀，OkLCh 则把颜色表示为明度 `L`、彩度 `C` 与色相角 `H`。因此首版把规则空间定义为固定彩度下的离散 OkLCh 坐标：

```text
hueIndex       = 0 .. 11   // 每格 30°
lightnessIndex = 0 .. 8    // 48% .. 80%，每格 4%
chroma         = 0.12
```

规则层只比较两个整数索引，不比较截图、CSS 字符串或浮点色差。渲染层优先输出 `oklch()`；若浏览器不支持，则用相同色相和映射明度的 HSL 近似回退。回退只改变观感，不改变目标坐标、方向提示、倒计时或结果。

这套坐标是游戏参数，不表示显示器已校准，也不能保证两块屏幕看起来完全一致。首版不实现 W3C 的色域映射算法、不复制规范示例代码，也不声称达到专业测量级 ΔE。

## 4. 冻结玩法骨架

### 4.1 五张色笺

每张色笺固定保存：

```text
id, title, note,
target: { hueIndex, lightnessIndex },
start:  { hueIndex, lightnessIndex },
durationMs: 24000
```

五组起点必须同时满足：两条轴都未命中；色相最短距离至少 3 格；明度距离至少 2 格；不依赖随机数、日期、时区、屏幕尺寸或上一轮状态。

### 4.2 阶段

```text
ready → countdown → playing → round-result → countdown
                                         ↘ complete
```

- `ready`：解释分工并允许开始；
- `countdown`：3、2、1，只展示目标与键位，不接受调色；
- `playing`：以整数 `100ms` tick 扣减 24 秒，接受两条独立轴动作；
- `round-result`：成功则盖章并进入下一张；超时则保留当前/目标对照，可重试同一张且不扣分；
- `complete`：展示五张色笺、共同用步数和合作结语，可重新开始整套。

### 4.3 输入

- 玩家 1：`A / D`，色相逆时针 / 顺时针转一格；
- 玩家 2：`J / L`，颜色更深 / 更亮一格；
- 触屏：四个真实 `<button>`，分别写清玩家、方向和作用；
- `keydown.repeat` 不产生动作；只有 `playing` 阶段的游戏键阻止默认行为；
- 色相在 12 格循环，明度在 0 与 8 处钳制；越界动作不增加有效步数；
- 两位玩家写入不同轴，因此同一旧状态下交换动作顺序必须得到相同结果。

### 4.4 非颜色反馈

[WCAG Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color) 要求颜色不能成为传达信息的唯一视觉手段。每条轴同时提供当前游标与目标缺口、方向文字、还差几格、命中形状/对勾和文字。阶段、超时和完成消息放进持久 `role="status"`，但不逐 tick 宣读倒计时或颜色值。

按钮建议至少 `52 × 52 CSS px`，高于 [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) 的 `24 × 24 CSS px` 最低门槛。控制区用 Pointer Events，并在 CSS 里预先声明 `touch-action`；[Pointer Events](https://www.w3.org/TR/pointerevents/) 说明手势开始后才改变该属性不会影响当前手势。

## 5. 确定性状态与计时

```text
phase: ready | countdown | playing | round-result | complete
roundIndex: 0 .. 4
hueIndex: 0 .. 11
lightnessIndex: 0 .. 8
remainingTicks: integer
countdownTicks: integer
attempts: integer[5]
moves: { hue: integer, lightness: integer }
completed: { id, moves, attempts }[]
outcome: null | success | timeout
revision: integer
```

reducer 不读取 `Date.now()`、`performance.now()`、`Math.random()`、DOM、CSS 或屏幕尺寸。驱动层使用 `requestAnimationFrame + accumulator` 把真实时间转换为整数 `100ms` tick；页面隐藏、失焦或单帧停顿超过约 `500ms` 时自动暂停驱动并清空 accumulator，不补扣离开期间的时间。

成功条件只有：

```text
hueIndex === target.hueIndex
&& lightnessIndex === target.lightnessIndex
```

两轴命中后只生成一个成功事件；后续键盘、Pointer 或 tick 必须保持 `round-result` 不变，避免双重盖章或跳轮。

## 6. 固定来源与许可证审计

以下来源只用于比较玩法、组件边界和许可证风险。最终运行时采用原创代码、原创视觉与本地资源，不直接引入任何一项。

### 6.1 `horushe93/colorfle`

- 固定提交：[`9f7b45e530489bf2459f68356b79b357ee49e54c`](https://github.com/horushe93/colorfle/tree/9f7b45e530489bf2459f68356b79b357ee49e54c)；
- 许可：[CC BY-NC 4.0](https://github.com/horushe93/colorfle/blob/9f7b45e530489bf2459f68356b79b357ee49e54c/LICENSE.md)；
- 研究价值：目标色、有限尝试、混色反馈；
- 风险：README 同时称完整游戏为 proprietary，`package.json` 又声明 ISC，元数据互相冲突；
- 边界：不复制算法、代码、文案、题面、配比、界面或素材，只对照“目标色 + 操作 + 反馈”的抽象回路。

### 6.2 `jsskrh/color-matching-game`

- 固定提交：[`ad9bcebc86a8fe6388686858601a04f4a88b08ed`](https://github.com/jsskrh/color-matching-game/tree/ad9bcebc86a8fe6388686858601a04f4a88b08ed)；
- 许可：[MIT](https://github.com/jsskrh/color-matching-game/blob/ad9bcebc86a8fe6388686858601a04f4a88b08ed/LICENSE)，作者 Jesse Akorah；
- 研究价值：明确目标值、文字反馈与 A 级直开；
- 边界：不复制 DOM、CSS、随机题目、颜色数据或代码。

### 6.3 `melloware/Coloris`

- 固定提交：[`c677d8cd2123bc1e24099bb81468934d5a05172f`](https://github.com/melloware/Coloris/tree/c677d8cd2123bc1e24099bb81468934d5a05172f)；
- 许可：[MIT](https://github.com/melloware/Coloris/blob/c677d8cd2123bc1e24099bb81468934d5a05172f/LICENSE)，Copyright © 2021 Mohammed Bassit；
- 研究价值：原生 ES6 取色器、色板、多格式和可访问组件；
- 边界：通用取色器会让单人获得全部通道，也远超首版需求；不引入库、源码、CSS、主题或依赖。

### 6.4 `kartikchorasiya/ColorPredictionGame`

- 固定提交：[`eb34ac1dc7dc27fdb9d3bf529e988bf6fcac4deb`](https://github.com/kartikchorasiya/ColorPredictionGame/tree/eb34ac1dc7dc27fdb9d3bf529e988bf6fcac4deb)；
- 许可：该固定提交根目录只有三个 HTML/CSS/JS 文件，没有 `LICENSE` 或 README 授权；
- 研究价值：单 HTML 色彩识别游戏是 A 级直开对照；
- 边界：无许可证不等于可自由复制，源码、布局、命名、颜色与交互全部不使用。

### 6.5 许可证结论

- `Colorfle` 的非商业限制、proprietary 表述和元数据冲突，使它不能成为代码来源；
- 没有许可证的仓库只能作事实性链接与机制背景，不能复制；
- 即便 MIT 项目允许复制，也必须保留许可，而且组件代码会破坏零依赖和双人分工；
- 本作品只研究抽象玩法、状态不变量和可访问性风险，采用独立表达与原创实现。

## 7. 原创零复制边界

允许借鉴公开色彩概念、“观察目标—调整—反馈”的抽象回路，以及通用键盘、Pointer、离散刻度和倒计时工程思想。

必须原创：作品名、五张色笺与中文文案；全部 HTML/CSS/JS、配置、状态机、测试与颜色回退；双人分轴、固定题目、起点、24 秒、失败重试和完成仪式；生成式概念与生产资产。不得复制参考仓库的函数、常量、色板、组件结构、截图、字体、音频或图像。

## 8. 核心测试向量

| 编号 | 输入/旧状态 | 预期 |
| --- | --- | --- |
| T01 | `ready → start` | 进入 3 秒 countdown，载入第 0 张固定起点 |
| T02 | countdown 中派发四种动作 | 状态不变 |
| T03 | 色相 11，顺时针一步 | 循环到 0 |
| T04 | 色相 0，逆时针一步 | 循环到 11 |
| T05 | 明度 0，再变深 | 保持 0，不增加有效步数 |
| T06 | 明度 8，再变亮 | 保持 8，不增加有效步数 |
| T07 | 同一旧状态 hue→lightness、lightness→hue | 最终状态逐字段相同 |
| T08 | `event.repeat=true` | 不派发动作 |
| T09 | 只有一条轴命中 | 不成功，另一条轴仍有文字方向与距离 |
| T10 | 最后一个合法动作使两轴命中 | 只进入一次 round-result/success |
| T11 | success 后继续动作和 tick | 状态不变 |
| T12 | 最后一个 tick 归零且未命中 | round-result/timeout，不写 completed |
| T13 | timeout 后 retry | 同一题回原始起点，attempts + 1 |
| T14 | 成功后 next | 下一题固定起点、完整 24 秒、前题记录保留 |
| T15 | 第五题成功 | 进入 complete，completed 恰好 5 条 |
| T16 | restart | 回到 ready，题序不变，统计清零 |
| T17 | `10 × 10ms` 与 `1 × 100ms` accumulator 分片 | 都推进一个 tick |
| T18 | 页面隐藏 800ms | 不补扣 8 tick |
| T19 | resize 320→1504 | 逻辑状态哈希不变 |
| T20 | 相同初态和动作/tick 日志重放两次 | 最终状态与 completed 完全相同 |
| T21 | 浏览器不支持 `oklch()` | 使用 HSL 回退，规则和反馈不变 |
| T22 | reduced motion | 只关闭液面/盖章动画，计时与判定不变 |
| T23 | 纯 file 打开 | 无 fetch、模块 MIME/CORS、CDN 或外部请求问题 |

## 9. 浏览器 Gate

共同 Gate：真正通过 `file:///.../index.html` 打开，并以 localhost 再验证统一门户；console/page error 0、外部请求 0；真实完成、超时、重试、第五张完成和重开；键盘与四按钮进入同一 action API；色彩状态有文字、刻度/形状和颜色三重表达；hidden/blur 不偷扣时间；装饰资产失败时 CSS 与文本仍能完成玩法。

- `320 × 700`：无横向溢出；目标、当前色、刻度、倒计时和四个至少 48px 按钮不重叠；两个 `pointerId` 可分别操作两组按钮。
- `390 × 844`：关键游戏区尽量一屏；按钮至少 52px；玩家标签不只靠颜色；长标题和个位倒计时不挤压主色笺。
- `1504 × 1046`：主色笺、目标色、色相环和明度尺保持一个焦点，不扩成卡片墙；完整五张；程序化复现 T07、T10、T12、T17、T20；截取 ready、playing、timeout、complete 四态与概念对照。

## 10. 借鉴声明结论

作品 README 与 `ATTRIBUTION.md` 必须明确：

1. W3C 资料只用于确认色彩术语、非颜色反馈、状态消息、点击目标与 Pointer 行为，不复制规范示例代码；
2. 四个仓库只用于比较目标色玩法、A 级直开、取色组件与许可证边界，没有复制、修改、链接或引入其代码、算法、CSS、依赖、题面、图像、字体或文案；
3. `ColorPredictionGame` 没有许可证，`Colorfle` 带非商业限制且存在元数据冲突，因此尤其不能成为代码来源；
4. 双人分轴、12 × 9 离散坐标、五张固定色笺、24 秒、失败无惩罚重试、中文文案、状态机与测试均由本仓库原创；
5. ImageGen 概念与生产资产单独记录用途、日期、提示词边界和无图回退。

## 11. 建议实现顺序

1. 规格冻结题目、两轴索引、倒计时、失败重试、阶段 DOM、颜色回退与 reducer API；
2. 生成桌面进行态、手机进行态、桌面完成态和必要的无字生产资产；
3. 子任务先实现配置、纯逻辑、格式化反馈与测试，独立提交；
4. 子任务实现语义 DOM、键盘/Pointer、计时驱动、README 与借鉴声明，独立提交；
5. 主流程接入目录，完成 file/localhost、三档响应式、五张和失败重试验证；
6. 每个真实 bug 写入 `bugs/`，离散感知坐标与可访问反馈写入 `learn/`，分别提交。
