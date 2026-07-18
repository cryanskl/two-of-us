# A 级“把夜晚照成我们”定向调研

- 日期：2026-07-19
- 创意来源：创意池 S08“星光探照”
- 目标等级：A，经典脚本、相对路径、`file://` 直开
- 工作 ID：`starlight-keepsake-search`
- 冻结标题：`把夜晚照成我们`
- 结论：进入规格；采用“移动一束光，在暗处连续停留并记住五件小物，全部找到后让整幅夜景与信件亮起”的原创单人惊喜

## 1. 先证明它不是星码、灯塔或雾窗换皮

仓库已经有三种与“光”接近的机制：

- “星码解锁”根据私人提示点击正确星星，权威规则是答案选择与三星 Gate；
- “为你引航”由一人转动灯塔光束短暂显露暗礁，另一人驾驶小船，权威规则是双角色运动、碰撞与靠港；
- “在雾上，写给你”先记录自由笔迹，再按原轨迹锚点描回，权威规则是双遍同轨迹。

如果 S08 只是让一个圆形遮罩跟随鼠标，移到某处立即显示图片，它只新增视觉效果，不新增可复用玩法。独立命题必须同时成立：

1. 光只是临时看见；
2. 光心连续停在某件小物上，才把它永久记住；
3. 已记住的小物在黑暗中保留暖色轮廓与一句短句；
4. 五件都被记住后，整个场景一次点亮并打开完整信件。

因此它不是“找对一个答案”，不是“拿光给另一名玩家导航”，也不是“擦掉一层遮罩”。它是一段没有失败和计时排名的空间探索：接收者决定先照哪里，而规则只验证是否真正停下来看看。

## 2. Brainstorm：四种产品方案

| 方案 | 核心体验 | 结论 |
| --- | --- | --- |
| 圆形光圈即时显图 | 光圈经过哪里就临时看见哪里，移开恢复黑暗 | 拒绝；只有滤镜，没有进度、结果或新规则 |
| 点击隐藏物寻宝 | 看到目标后点击，找齐进入完成 | 可行但不采用；容易退化成像素猎物，触屏精度和图片内容主导难度 |
| 光圈停留发现 | 光心进入目标区并连续停留，进度满后永久记住 | 采用；慢下来是规则，Pointer/键盘、确定性与非像素判定都可统一 |
| 按固定顺序照亮回忆 | 必须按准备者指定顺序找到五件小物 | 暂缓；会把自由探索变成密码题，与“星码解锁”重叠 |

首版没有倒计时、失误、提示消耗、分数或最佳路线。离开目标只让当前停留进度归零，不扣除已经发现的小物。

## 3. 冻结的体验边界

### 3.1 核心流程

1. `intro`：看见昏暗场景、短说明、“提起灯”与“直接点亮”按钮；秘密正文和五件小物的文字尚不在 DOM；
2. `searching`：Pointer、触笔或方向键移动光心；外圈临时显露场景，内圈进入目标捕获区后开始停留；
3. `focusing`：光心仍在同一未发现目标内，整数进度逐步增长；移出、暂停或换目标时当前进度清零；
4. `searching`：达到停留阈值后目标永久加入 `foundIds`，创建它的名称与短句 DOM，随后继续自由寻找；
5. `complete`：第五件被发现的同一 tick 进入完成态，整幅场景点亮，创建完整信件、落款和“再照一次”；
6. 等价入口：“不方便寻找，直接点亮”从 intro/searching/paused 都能创建同一完整信件，不要求精确 Pointer。

`focusing` 是派生视图，不必成为独立 phase；权威状态用 `focusTargetId + focusTicks` 表达，减少不可达阶段组合。

### 3.2 明确不做

- 不读取图片像素、alpha、颜色、对象识别或图像相似度；
- 不随机生成目标位置，不让目标被装饰遮住，也不把命中区放在图片外；
- 不用点击速度、完成时间、提示次数或发现顺序评分；
- 不上传、不保存、不导出、不截图、不复制到剪贴板、不分享结果；
- 不读取照片、相机、麦克风、陀螺仪、定位、设备身份或环境光传感器；
- 不加入 WebGL、shader、PixiJS、Phaser、Konva、第三方字体、CDN、分析服务或联网 API；
- 不在完成前把隐藏名称、短句、信件正文和落款预置为 `hidden` DOM；
- 不加入题库编辑器、自动提示、成就、排行榜、音频或振动。

## 4. 规则模型：光心、捕获圈与连续停留

逻辑世界固定为 `1000 × 620` 整数坐标。Pointer 先从 CSS rect 映射进该世界；键盘也只通过公开移动 action 改变同一个整数光心。

每件目标只保存固定 `id / x / y / captureRadius`。图片只是背景，不拥有点击热区。命中条件使用平方距离，避免平方根与 Canvas 参与：

```text
dx = lightX - targetX
dy = lightY - targetY
inside = dx*dx + dy*dy <= captureRadius*captureRadius
```

建议规格冻结：

```text
WORLD_WIDTH = 1000
WORLD_HEIGHT = 620
TARGET_COUNT = 5
TICK_MS = 50
FOCUS_TICKS = 14              // 连续 700ms
POINTER_CORE_RADIUS = 46      // 视觉外光圈可更大，但规则只用捕获圈
KEYBOARD_STEP = 28
MAX_TICKS_PER_ACTION = 20
MAX_FRAME_GAP_MS = 250
```

`SET_LIGHT {x,y,source}` 只更新位置并重新选择唯一目标；`TICK {ticks}` 才累计停留。若两个捕获圈重叠，地图校验直接拒绝，不靠数组顺序裁决。发现是单调集合：同一目标再次经过不会重复增加数量或播报。

第五件目标在达到第 14 tick 的同一步直接完成，不等待 CSS 动画、图片加载、真实时钟或下一帧。相同 `SET_LIGHT/TICK` 日志在 30/60/144Hz 帧分片下必须得到相同 `foundIds`、发现顺序与完成原因。

## 5. 为什么不用像素命中、随机摆放或通用游戏引擎

### 5.1 不读像素

`getImageData()` 会让规则依赖图片裁切、色彩、DPR、浏览器滤镜和资源是否成功解码。更换情侣自己的照片后，透明度或颜色阈值也会漂移。固定坐标目标把“画面是什么”和“规则在哪里”分开，背景失败时仍可用 CSS 场景和目标轮廓完成。

### 5.2 不随机摆放

随机位置会让目标落在画面无意义处、彼此重叠或进入移动端裁切边缘。首版的惊喜来自准备者选择的五件小物与短句，不来自每局换位置；固定地图也便于截图、可访问说明和 golden replay。

### 5.3 不引入引擎

PixiJS、PixiJS Filters、Konva 与 Phaser 都有 MIT 许可证，也都能合法承担遮罩、滤镜、分层场景、交互或光照。首版只有一张本地背景、五个圆形目标、一个光心和有限状态，原生 Canvas 2D 足够。引擎会增加 vendor、构建/版本、WebGL/Canvas 分支和许可清单，却不会改善核心停留规则。

## 6. 输入与生命周期

- Pointer 不需要按住：`pointermove` 或触摸拖动可移动光心；触屏从 `pointerdown` 开始，只有同一 pointerId 与 generation 能继续/结束该会话；
- 鼠标 hover 可搜索，但只在页面处于 active searching 时累计；鼠标离开舞台立即清当前 focus；
- 方向键以固定整数步移动同一个光心；按键 `repeat` 不直接推进时间，停留只由固定 tick 驱动；
- 第二根手指不能抢占现有触点，也不能结束新 generation；`pointercancel`、`lostpointercapture`、blur、hidden 与 Escape 清 active pointer、focus 和累计 tick；
- `requestAnimationFrame` 只把经过时间换成有限整数 tick；超过 250ms 的帧不补算后台时间，而是暂停；
- resize/orientationchange 只重建 DPR Canvas 并从状态重绘，不改变世界坐标、发现集合、顺序或停留进度；
- 背景加载成功或失败都不能派发业务 action；加载只影响视觉投影。

## 7. 无障碍、秘密与隐私边界

- 雾暗画面不是唯一信息源：页面显示“已找到 n / 5”，已发现小物以真实 DOM 列表呈现；
- 方向键能完整移动光心，`Home` 可回到中心；“直接点亮”提供不依赖视觉搜索和精细运动的完整等价结果；
- 当前进入捕获圈时，状态文字只说“这里有一点微光，停一下”；发现后才创建名称与短句，不提前播报秘密；
- complete 前不创建完整信件、落款、重开按钮或未发现目标文字；complete 后聚焦完成标题；
- `aria-live` 只播报开始、进入/离开目标、每件发现、暂停和完成，不随 50ms tick 刷屏；
- forced colors 下用系统色、实线捕获圈、编号和文字表示光心/已发现；reduced motion 下关闭星尘、光晕呼吸和整场淡亮；
- Canvas context 不可用时停用搜索面，保留“直接点亮”；背景图片不可用时保留 CSS 夜色、五个规则目标和完整完成信；
- 页面不保存搜索路径、发现顺序或文案；刷新和重开回到初始状态。静态 `config.js` 中的明文只是渐进揭晓，不是加密。

## 8. 准备者可参与的 5–10 行业务策略

后续 `config.js` 预留 `composeStarlightLetter(view)`。它只收到冻结摘要：发现数量、发现顺序中的安全 label、最后发现的 label、完成方式和默认正文；不接触坐标、Pointer ID、generation 或原始移动路径。

准备者可以在 5–10 行里决定：最后找到某件特别物品时是否换一句结尾，或按发现顺序组合一句只属于两人的话。返回空白、非字符串、超长内容、抛错或试图修改摘要时，逻辑层回退到完整默认正文。默认实现无需修改即可从 intro 玩到 complete。

## 9. 固定版本开源调研与零复制边界

核验日期：2026-07-19。下列项目只用于研究实现上限和依赖边界，均不进入运行依赖。

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [PixiJS](https://github.com/pixijs/pixijs/tree/2c5818b0e75b835ba5980844136b10cbdc3982a9) | tag `v8.18.0`，commit `2c5818b0e75b835ba5980844136b10cbdc3982a9`；MIT；Copyright 2013–2023 Mathew Groves、Chad Engler | WebGL/WebGPU/Canvas 2D 渲染、mask、blend mode 与多输入能力上限 | renderer、scene graph、mask/filter API、源码、构建、demo、参数、图片和 bunny 素材 |
| [PixiJS Filters](https://github.com/pixijs/filters/tree/e9d1ca987864f121680bb0d7e9612c05b37748de) | tag `v6.1.5`，commit `e9d1ca987864f121680bb0d7e9612c05b37748de`；MIT；Copyright 2013–2025 Mathew Groves、Chad Engler | lightmap、glow、blur 与滤镜链的依赖上限 | SimpleLightmapFilter、GlowFilter、shader、options、demo、截图、源码与构建产物 |
| [Konva](https://github.com/konvajs/konva/tree/ae5bbf7181d0201466045afbbab2297c8ffa7b90) | tag `v10.3.0`，commit `ae5bbf7181d0201466045afbbab2297c8ffa7b90`；MIT；KineticJS 2011–2013 Eric Rowell，Konva 2014–present Anton Lavrenov | Canvas 分层、独立 shape、事件与缓存的完整对象模型上限 | Stage/Layer/Shape API、hit canvas、filters、事件封装、源码、测试、demo 与文档示例 |
| [Phaser](https://github.com/phaserjs/phaser/tree/7304c64effaa4a1be5b8bf02ab13143a76108a19) | tag `v4.1.0`，commit `7304c64effaa4a1be5b8bf02ab13143a76108a19`；MIT；Copyright 2026 Richard Davey、Phaser Studio Inc. | 2D lights、场景、input、ticker 与完整游戏框架依赖上限 | Light2D/lighting API、shader、scene/input/ticker、源码、模板、demo、素材与默认参数 |

这些来源证明成熟库可以实现更复杂的光照与遮罩，但不替本作定义停留发现、五件纪念物、完成信或可访问等价路径。“未引入”是范围与 A 级成本判断，不是许可证否定。

平台行为固定参考 [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74)、[WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d)、[Page Visibility](https://github.com/w3c/page-visibility/tree/8ca533c744e655b8340b5713d1bd5ea97b202b13)、[W3C WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) 与 [CSSWG Drafts](https://github.com/w3c/csswg-drafts/tree/c7573530343759ace8e46438a1fa2c44515b5554)。只研究 Canvas 2D compositing/gradient、animation frame、pointerId/capture/cancel、页面生命周期、键盘等价、降动效和 forced colors；不复制规范文字、IDL、示例或站点视觉。

## 10. 明确排除与权利不清来源

| 来源 | 排除原因 |
| --- | --- |
| [CodeMyUI “Reveal Hidden Text” Gist](https://gist.github.com/CodeMyUI/7437e28015756952119afa96a979152c) | 页面没有清晰独立许可证；不得复制实验源码、文字、动画、参数或页面结构 |
| [jaredstanley/globalCompositeOperation Gist](https://gist.github.com/jaredstanley/260b5ac5690b6280138212808aa93549) | 只是 API 列表且未见独立许可证；直接以 WHATWG 标准为能力真源，不复制 Gist |
| Reddit/CodePen/博客“flashlight effect”示例 | 常缺代码与图片许可证，或依赖远程资源；只说明该视觉题材常见，不进入实现、参数和素材链 |
| 商业找物、密室与手电游戏 | 只证明空间搜索有成熟品类；不复制关卡、物件、热区、品牌、音效、界面、提示、计分或美术 |

公开可见、能运行或带教程说明都不等于允许复制。即使代码有许可证，背景照片、图标、字体、音频、关卡和文案仍必须分别核验。

## 11. 必须通过的可验证 Gate

1. **新机制**：移动光圈只临时显露；只有同一目标连续停留达到冻结 tick 才永久发现，不能靠扫过或点击瞬间完成。
2. **非像素规则**：背景内容、图片加载、alpha、DPR、滤镜、CSS crop 和 Canvas context 不参与目标命中或完成。
3. **地图合法**：恰好五个唯一目标，坐标/半径安全，捕获圈不重叠、不越界，移动端裁切后仍可到达。
4. **连续停留**：精确第 13 tick 不发现，第 14 tick 发现；移出、换目标、暂停与失焦清零，已发现集合不回退。
5. **确定性**：相同公开 action 日志深相等；30/60/144Hz 分片、DPR 和 resize 不改变发现顺序与终局。
6. **输入生命周期**：第二指、旧 generation、cancel、lost capture、blur、hidden、Escape、迟到 up 和长帧不能推进或结束新会话。
7. **键盘与等价入口**：方向键能覆盖全地图，Home 回中心；不用搜索也能直接点亮并获得同一完整信件。
8. **阶段秘密**：未发现 label/短句和 complete 信件在相应时点前不进入 DOM；发现/重开时创建和删除准确。
9. **响应式**：1280×800、390×844 与 320×700 无横向溢出；首屏看见舞台、进度、当前主动作和本地隐私提示。
10. **资源与性能**：一张本地生产背景和一个 favicon；零第三方运行依赖；live region 不按 tick 刷屏；背景/Canvas 失败有完整直接入口。
11. **离线与隐私**：经典脚本、相对资源、无网络/存储/导出/剪贴板/媒体/传感器；刷新不保留移动路径或发现记录。
12. **权利**：README 与 ATTRIBUTION 固定版本、许可证、权利主体、仅研究范围、零复制边界、排除来源和 ImageGen 输入声明。

## 12. Go / No-Go

**Go。** “把夜晚照成我们”补齐仓库尚未覆盖的“空间搜索 + 连续停留 + 单调发现”惊喜样板；它用同一个整数光心统一鼠标、触屏和键盘，又保持 A 级直开、零存储和零第三方运行依赖。

进入规格前必须冻结：五个目标地图、捕获半径、光心初始位置、Pointer/键盘移动 action、tick 顺序、停留阈值、focus 清零优先级、发现顺序、阶段 DOM、direct 完成语义、配置摘要和 Canvas/DOM 分工。

## 13. 借鉴声明摘要

“把夜晚照成我们”的连续停留发现、五件纪念物、状态机、整数规则、页面、文案、视觉和测试将由本仓库独立原创。PixiJS、PixiJS Filters、Konva 与 Phaser 只用于比较遮罩、滤镜、分层场景、光照和完整引擎的能力上限；它们都不是运行依赖。

本作不会复制、改写、翻译、移植、打包或依赖上述项目及排除来源的源码、API、算法实现、shader、参数、测试、demo、模板、图片、字体、图标、音效、页面结构、文案或构建产物。未来若实质引入第三方代码或素材，必须另立变更、保存许可证与版权声明，并重新执行离线、隐私、性能和浏览器验收。
