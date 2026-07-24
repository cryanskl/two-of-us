# 创意池 V08“爱心投石器”定向调研：把这一颗，绕回来送到你那边

- 调研日期：2026-07-24
- 对应创意：[`40-idea-backlog.md`](./40-idea-backlog.md) 的创意池 V08“爱心投石器”
- 稳定工作 ID：`heart-catapult`
- 暂定体验名：`这一颗，绕回来找你`
- 建议目录：`experiences/versus/heart-catapult/`
- 建议启动等级：A（双击 `index.html`，无安装、服务、权限或公网）
- 本轮范围：候选审计、全网调研、机制取舍、来源与许可证复核；不创建生产目录

## 1. 结论

V08 可以在仓库内独立实现，而且适合成为新的双人对抗样板。它不能只把现有
“纸飞机投递”的邮箱换成城堡，也不应扩成带移动、武器、风向和可破坏地形的坦克
游戏。

推荐进入 brainstorm 的版本是：

- 左右两座完全镜像的固定城堡；
- 每轮两人依次接管同一设备，秘密调整离散角度与整数力度并锁定；
- 两人都锁定后，两颗爱心按当轮顺序依次播放；
- 每颗爱心允许在软垫地面反弹一次，直接命中与反弹命中都只计一次；
- 第二次落地、飞出边界或超过固定 tick 上限均判未命中；
- 两颗都播放完才联合结算本轮得分；
- 先累计 3 次命中且领先的一方获胜；
- 若双方同轮一起达到 3 次，则继续延长轮，直到完整一轮后一方领先；
- 每轮交替谁先瞄准、谁先播放；播放先后不参与胜负裁决。

核心闭环是：

```text
公开比分与固定镜像场地
          ↓
双方依次秘密锁定角度和力度
          ↓
两颗爱心依次播放，各自最多反弹一次
          ↓
完整轮联合计分，再判断领先或延长
```

“秘密瞄准”避免第二位玩家直接照抄第一位参数；“完整轮结算”避免动画播放顺序
制造先手优势；“一次反弹 + tick 上限”让线路可读又不会无限飞行。

## 2. 候选与相邻作品审计

| 对象 | 相邻能力 | 本作必须保持的差异 |
| --- | --- | --- |
| `paper-plane-mail` | 角度、力度、固定步抛体、连续线段命中 | 它是单人投递与揭信；本作是镜像热座对抗、秘密双份输入、反弹和完整轮联合结算 |
| 创意池 V13“像素坦克折射战” | 弹体、反射、双方城堡/载具题材 | V13 是实时移动与双键盘战斗；本作没有移动、武器、爆炸、地图破坏或同时输入 |
| `sealed-rps` / `garden-resource-duel` | 单设备交接、秘密输入、公开联合结算 | 本作秘密的是连续参数档位，结果由确定性弹道生成，不使用牌面克制或库存 |

本仓库还有两套不同来源的 `Vxx` 编号：

- [`30-versus-research.md`](./30-versus-research.md) 的 V08 是外部候选 Hex；
- [`40-idea-backlog.md`](./40-idea-backlog.md) 的 V08 才是原创创意池“爱心投石器”。

后续目录、测试、catalog 与借鉴声明一律使用稳定 ID `heart-catapult`。文档如保留
编号，只写“**创意池 V08**”。

## 3. 五项进入条件

| 问题 | 结论 |
| --- | --- |
| 主分类是否唯一 | 是；双方争取唯一胜负，主分类为“双人对抗” |
| 最合适的本地等级 | A；经典脚本、原生控件、Canvas/DOM 和本机内存即可 |
| 首局 30 秒能否理解 | 能；“各自偷偷调角度和力度，爱心可落地反弹一次；完整轮后先命中 3 次且领先者赢” |
| 去掉音乐和图片是否成立 | 成立；场地、城堡和爱心均可用原创 Canvas/DOM/CSS 绘制 |
| 最小版本能否收敛 | 能；固定场地、两项输入、单次反弹、一个联合结算和一个结果页 |

首版不需要账号、网络、服务、存储、摄像头、麦克风、拖拽、倒计时、外部字体、
远程图片、音频、AI、排行榜、物理引擎或商业游戏素材。

## 4. 规则候选审计

| 方向 | 优点 | 风险 | 结论 |
| --- | --- | --- | --- |
| 公开轮流瞄准 | 最容易实现 | 后手可以直接镜像或照抄前手参数 | 排除 |
| 第一颗到 3 分立即结束 | 节奏快 | 播放顺序成为无意义的先手优势 | 排除 |
| 随机风向与地形 | 每局变化大 | 破坏镜像公平，首局解释和测试面过重 | 排除 |
| 秘密瞄准 + 完整轮 + 单次反弹 | 保留读人、线路规划和公平回应权 | 需要严格的公开投影与确定性模拟 | **采用** |

不采用多面墙、斜面、多次反弹或通用刚体。首版只需要爱心圆形包围体、对方城堡
矩形目标、水平地面和世界边界。

## 5. 建议冻结的确定性物理边界

### 5.1 单一局部坐标系

两位玩家都在“发射者位于左侧、目标位于右侧”的同一逻辑坐标系模拟。右席实际
播放时只做：

```text
renderX = WORLD_WIDTH - logicalX
```

规则层不维护两份方向相反的物理代码。相同角度与力度必须得到镜像轨迹和相同结果。

### 5.2 离散输入与定点数

- 角度使用有限档位，例如 `20°..70°`、每 `5°` 一档；
- 正余弦使用写入逻辑常量的冻结 Q12 整数查表；
- 力度使用有限整数档；
- 位置、速度、重力、碰撞参数和反弹衰减均用整数或固定有理数；
- 生产运行时不调用 `Math.sin`、`Math.cos`、随机数或真实时间裁决命中；
- 每个中间乘积都必须证明低于 `Number.MAX_SAFE_INTEGER`。

动画可以按真实经过时间选择已经生成的 frame，但不能反向改变规则结果。

### 5.3 每 tick 的唯一事件

```text
1. 从当前状态计算本 tick 的候选运动线段；
2. 分别求城堡、地面和世界出口的最早接触参数 t；
3. 只接受 [0, 1] 内的精确有理参数，用交叉乘比较，不转浮点；
4. 最小 t 的事件先处理；只有 t 完全相等时，优先级才是城堡、地面、出界；
5. 城堡事件：立即 hit；
6. 第一次地面事件：落到精确接触点，按固定有理衰减反射竖直速度，并结束本 tick；
7. 第二次地面事件或世界出口：miss；
8. 无事件：提交线段终点；达到 MAX_TICKS 后 miss。
```

城堡接触使用“爱心圆心线段对按半径扩张后的目标 AABB”；地面接触使用圆心对
`GROUND_Y - HEART_RADIUS` 的穿越。候选 `t = numerator / denominator` 必须规范化
符号，并用安全整数交叉乘比较；全部分子、分母和乘积都纳入 headroom 证明。

连续线段检测用于避免高速弹体一步跨过窄目标。第一次触地不继续消费本 tick 的
剩余线段，下一 tick 从接触点和反射后的速度继续。这样不会出现“同一线段先触地、
后穿过城堡，却因为代码先查城堡而误判命中”，也不会让不同实现自行选择剩余时间
处理方式。触地点必须落在冻结的整数舍入规则上，不能先让圆穿入地面，再用“最近边”
猜测碰撞法线。

### 5.4 穷举 Gate

规格与逻辑测试必须穷举：

```text
2 个席位 × 全部角度档 × 全部力度档
```

并证明：

- 至少存在连续相邻的直接命中组合；
- 至少存在连续相邻的反弹命中组合；
- 存在力度不足、越界、第二次落地或超时等稳定 miss；
- 两席镜像结果、终点类型、bounceCount 和 frame 数一致；
- 没有只能靠单个参数点命中的“像素级答案”；
- 所有轨迹在 `MAX_TICKS` 内终止。

具体档位和世界常量留给 spec 用真实枚举结果冻结，research 不提前伪造数值。

## 6. 热座隐私与信任边界

秘密输入不是把节点 `display:none`：

- 第一位锁定后，其角度、力度、预测线和控件必须退出公开 view 与 DOM；
- 第二位瞄准时，文本、属性、ARIA、`dataset`、live region、console 和 Canvas 都
  不得出现第一份 sealed aim；
- 两人都锁定后先进入中性“准备放飞”页；
- 播放第一发时，不得提前暴露第二发的角度、力度或轨迹；
- 两发都结束前，比分仍保持上一完整轮结果；
- `blur`、页面隐藏、`pagehide` 和 Escape 立即遮屏并丢弃未锁定草稿；
- 已锁定参数只保存在内存中的权威状态，不写 URL、storage 或网络。

它只承诺正常共同使用流程中不提前渲染秘密，不能抵御设备所有者主动打开开发者
工具、断点或读取 JavaScript 内存。README 必须明确这条信任边界，不使用“加密”
“防作弊”或“绝对保密”等表述。

## 7. 可访问性、本地启动与生命周期

- 角度与力度使用原生 `input[type=range]`，并提供减/加按钮和文字当前值；
- 锁定与继续使用原生按钮，最终动作发生在 click/键盘激活而不是 pointerdown；
- 不要求拖拽自定义投石器手柄；
- 当前玩家、比分、轮次、输入值、结果和主动作必须存在于真实 DOM；
- Canvas 只画场地和轨迹，并提供等价 fallback 说明；
- 不只靠左右位置、红蓝色或动画表达玩家、命中和轮次；
- 支持 Tab、Shift+Tab、Enter、Space 与 range 方向键；
- `prefers-reduced-motion: reduce` 直接显示相同规则产生的关键帧/终点，不改变结果；
- 强制颜色模式保留系统文字、边框、比分和控制；
- 页面失焦、隐藏、恢复或改变帧率都不得自动锁定、发射、计分或换轮。

A 级结构使用相对路径经典脚本和本地 CSS/图形；不使用 ES modules、`fetch()`、
CDN、Service Worker 或跨源资源。`file:` origin 的行为存在实现差异，不能只凭
标准推断“可直开”，最终必须真实导航到 `file:///.../index.html` 验收。

## 8. 固定开源来源与许可证

这些项目只作为机制研究证据，不成为生产依赖。

### 8.1 `tridpt/TwoPlayerGames`

- 固定版本：[`c96b802232d87d58408ed653dcbe43c0a68611f6`](https://github.com/tridpt/TwoPlayerGames/tree/c96b802232d87d58408ed653dcbe43c0a68611f6)
- 许可证：[根 `LICENSE`](https://github.com/tridpt/TwoPlayerGames/blob/c96b802232d87d58408ed653dcbe43c0a68611f6/LICENSE)，MIT
- 权利主体：Copyright (c) 2026 tridpt
- `LICENSE` SHA-256：
  `372d7364baa62bdf60f7587c559b2893a917aceefdf27d6b65e7ba877aa2b2b2`
- 只研究：投射玩法的瞄准、飞行、结算、换手阶段，以及显式反弹预算。

不复制其代码、参数、风向、武器、爆炸、地形破坏、共享壳、PWA、联网、i18n、
UI、文案或素材。其整体运行边界也不能作为本作 A 级 `file://` 证据。

### 8.2 `niccolofanton/tanks-game`

- 固定版本：[`e4eb4c694d9bb3671de84ce1ea29b80f8c1d8c12`](https://github.com/niccolofanton/tanks-game/tree/e4eb4c694d9bb3671de84ce1ea29b80f8c1d8c12)
- 许可证：[根 `LICENSE`](https://github.com/niccolofanton/tanks-game/blob/e4eb4c694d9bb3671de84ce1ea29b80f8c1d8c12/LICENSE)，MIT
- 权利主体：Copyright (c) 2019 Niccolò Fanton
- `LICENSE` SHA-256：
  `14b091fd78dda9255b6acde0b08b3e06497185c24c56d6c1931ebb46bbf12579`
- 只研究：边界反射和最大反弹次数的玩法轮廓。

其离散穿入后按最近边修正的碰撞只作为反例；不复制碰撞实现、随机地图、坦克移动、
贴图、视野系统、代码或素材。README 声明视野部分来自另一项目，本作不触及该许可链。

### 8.3 `liabru/matter-js`

- 固定版本：[`acb99b6f8784c809b940f1d2cf745427e088e088`](https://github.com/liabru/matter-js/tree/acb99b6f8784c809b940f1d2cf745427e088e088)
- 许可证：[根 `LICENSE`](https://github.com/liabru/matter-js/blob/acb99b6f8784c809b940f1d2cf745427e088e088/LICENSE)，MIT
- 权利主体：Copyright Liam Brummitt and contributors
- `LICENSE` SHA-256：
  `ed182087be5b26734aa6d4789743de3a97417950e8c1e3ff2e3d19c6462720d3`
- 只研究：恢复系数、静态边界、碰撞阶段和渲染/物理解耦概念。

不安装或打包 Matter.js，不复制其 API、引擎结构、求解器、示例布局、代码、常量
或测试。

### 8.4 `schteppe/p2.js`

- 固定版本：[`2beb2750f42d29014e289cb803b7269d5b0edaad`](https://github.com/schteppe/p2.js/tree/2beb2750f42d29014e289cb803b7269d5b0edaad)
- 许可证：[根 `LICENSE`](https://github.com/schteppe/p2.js/blob/2beb2750f42d29014e289cb803b7269d5b0edaad/LICENSE)，MIT
- 权利主体：Copyright (c) 2016 p2.js authors
- `LICENSE` SHA-256：
  `bf18c22aac924767ac66ef68e453f4e78f39d0e054442bc6925b09a1fcdb61b2`
- 只研究：固定步、最大子步、累计器与渲染插值分离。

GitHub 的 SPDX 展示不代替根许可证载体。不安装或打包 p2.js，不复制 API、源码、
插值、求解管线、示例或测试。

### 8.5 `jriecken/sat-js`

- 固定版本：[`20e612681d1f9eabc9ea34dc98c4d27f985ffec6`](https://github.com/jriecken/sat-js/tree/20e612681d1f9eabc9ea34dc98c4d27f985ffec6)
- 许可证：[根 `LICENSE`](https://github.com/jriecken/sat-js/blob/20e612681d1f9eabc9ea34dc98c4d27f985ffec6/LICENSE)，MIT
- 权利主体：Copyright (C) 2012–2015 Jim Riecken
- `LICENSE` SHA-256：
  `de2ab62cb212dfbfe403a2f7e8b7de9b7e74e33d12bdbe8854bf324ab00fd2a2`
- 只研究：把碰撞检测与碰撞响应分层的概念。

本作只需圆/线段与矩形目标，不引入通用 SAT；不复制其实现、类/API、对象池、
优化、测试或文档措辞。

## 9. 平台规范

- [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/)：统一指针输入、
  pointer capture、`pointercancel` 与 `lostpointercapture` 生命周期；本作优先
  使用原生 range 和按钮，避免把自定义拖拽设为唯一入口；
- [WCAG 2.2 Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation)、
  [Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)
  与 [Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)：最终动作
  在可取消的激活阶段完成，所有指针操作具备非拖拽与键盘等价入口；
- [WHATWG Canvas](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element)：
  Canvas 提供等价 fallback，关键状态与控件不只存在于像素画面；
- [WHATWG script](https://html.spec.whatwg.org/multipage/scripting.html#the-script-element)：
  生产页使用相对 URL 的外部经典脚本；
- [WHATWG URL](https://url.spec.whatwg.org/#origin) 与
  [Fetch](https://fetch.spec.whatwg.org/#fetch-scheme)：`file:` origin 和本地读取
  仍有实现边界，因此 A 级结论必须来自真实浏览器验收。

规范只用于浏览器行为与验收，不复制规范文字、IDL、示例或站点视觉。

## 10. 借鉴声明边界

生产目录必须包含独立 `ATTRIBUTION.md`，至少写明：

> 本作的热座回合、固定步模拟、碰撞、反弹、城堡判定、界面、中文文案与视觉均为
> 独立实现。开发前仅研究了 TwoPlayerGames 的投射回合拆分、tanks-game 的反弹
> 玩法轮廓、Matter.js 的恢复系数与碰撞分层、p2.js 的固定步架构，以及 SAT.js
> 的碰撞响应概念；未复制、改写、翻译、链接或打包这些项目的源码、API、参数、
> 测试、素材、品牌或界面。

固定 commit、许可证、权利主体与哈希必须保留。未来若实质引入第三方内容，必须
另立变更并保留许可证、版权和改动说明。

不参考或复刻《愤怒的小鸟》《百战天虫》等商业作品的代码、美术、声音、角色、
关卡、名称、商标或品牌表达；不采用 CodePen、Gist、教程片段或无许可证仓库。

## 11. 进入 brainstorm / spec 的硬门槛

1. 冻结秘密瞄准、完整轮联合结算、单次地面反弹与 3 次领先胜利；
2. 两席共用一套局部坐标模拟，右席只镜像渲染；
3. 有限角度、整数力度、Q12 查表和固定 tick 共同决定轨迹；
4. 生产测试穷举所有参数组合并证明直接命中、反弹命中、miss 与镜像公平；
5. 第二人瞄准和第一发播放期间，公开 DTO 与 DOM 均不泄露尚未公开参数；
6. A 级必须通过真实 `file://`，不能用 localhost 结果替代；
7. 生产目录带固定来源、许可证哈希和零复制借鉴声明；
8. 首版无风、无随机地形、无移动、无爆炸、无道具、无外部运行依赖与素材。

满足以上条件后，`heart-catapult` 可以进入可执行规格、代码原生视觉与分步计划。
