# A 级“一起，把家搬进来”定向调研

- 日期：2026-07-19
- 创意来源：创意池 C07“一起搬沙发”
- 目标等级：A，经典脚本、相对路径、`file://` 直开
- 工作 ID：`moving-home-together`
- 冻结标题：`一起，把家搬进来`
- 结论：进入实现；采用“两人各控沙发一端，以离散八向意图共同平移/旋转，通过门厅转角并在客厅一起放稳”的原创合作玩法

## 1. 先辨认题目：这里的 couch 是家具，不是泛称本地多人

全网搜索中大量 “couch co-op” 指同一台设备上的本地多人，并不表示玩家在搬沙发。可核验的精确“双方各控家具一端、穿过狭窄转角”开源 HTML 项目没有找到；不能把题材相近的赛车、平台游戏或商业搬家游戏误写成代码来源。

这反而明确了实现边界：C07 不引入或改造一个现成搬家游戏，而是独立设计规则、关卡、整数运动学、碰撞层、视觉、文案和测试。开源调研只用于核验凸形状碰撞、固定步进、双人同屏输入和浏览器生命周期。

## 2. Brainstorm：四种产品方案

| 方案 | 核心体验 | 结论 |
| --- | --- | --- |
| 两个角色分别抓取家具 | 两人先走到握点，再由完整物理约束搬运 | 暂缓；首版会把角色碰撞、抓取、质量、关节和相机都引入，远超 C07 的核心问题 |
| 两端自由拖拽 | 两根手指直接拖左右端点，沙发跟随 | 拒绝；单人可用两指包办，且 Pointer 坐标直接决定姿态，碰撞/约束容易产生跳变 |
| 网格搬运棋 | 每回合各选一个方向，合并后移动或旋转一格 | 可行但不采用；确定性最好，却失去同时沟通与“转角”的实时手感 |
| 双端八向连续控制 | 左端 WASD/左触控盘，右端方向键/右触控盘；同向平移、差分旋转 | 采用；双方职责持续存在，运动学足够小，可用整数状态、固定 tick 和 OBB/AABB 碰撞独立实现 |

首版的产品命题不是“模拟真实搬家”，而是：

> 同一个转角，两个人看见的方向可能不同。先一起给方向，再慢慢把家放稳。

## 3. 冻结的玩法边界

- 两人共用一台设备；左端使用 WASD，右端使用方向键，移动端使用两个并排的八向触控盘。
- 每侧公开意图只有 `x/y ∈ {-1, 0, 1}`；两侧都非零时才计算候选动作，单侧不能独自移动沙发。
- 两端意图近似同向时主要产生平移；两端沿沙发法线形成差分时产生旋转；混合意图可同时产生小幅平移和一个角度格转动。
- 沙发是唯一动态旋转矩形；墙、门框和固定家具是静态轴对齐矩形。没有重力、质量、冲量、弹性、摩擦、角色身体或可破坏物。
- 候选姿态侵入任一障碍时，本 tick 停在上一个安全姿态，只显示中性提示；不弹开、不扣分、不计失败、不归因某一边。
- 固定路线包含入口、窄门和一个直角转弯；没有随机关卡。地图是否可达必须由生产动作重放或搜索证明。
- 完成条件为沙发四角全部进入目标地毯、角度满足放置方向，并且两边都松手连续保持 12 tick；只让中心进入或高速擦过都不算完成。
- Escape、窗口失焦、页面隐藏或长帧会清空全部输入并暂停；恢复不补算后台时间。
- 首版不联网、不保存、不录音、不播放音频，不使用账号、传感器、第三方字体、CDN、第三方运行库或共享层改动。

推荐开场说明：

> 左边握住左端，右边握住右端。一起给方向，沙发才会动；同向往前，错开一点就能转弯。

## 4. 为什么选择确定性运动学，而不是完整物理引擎

首版只有一个动态 OBB（oriented bounding box）与若干静态 AABB。需要回答的规则问题只有三类：

1. 双方意图如何合成中心平移和角度变化；
2. 候选姿态是否与墙体重叠；
3. 沙发是否完整进入目标并放稳。

完整引擎还会引入接触流形、冲量、质量、摩擦、休眠、连续碰撞和求解迭代。它们对本作不是玩法，却会扩大 vendor、许可证、调参和跨版本确定性成本。因此首版使用独立运动学 reducer：

```text
leftIntent + rightIntent
  → 计算整数平移与 -1/0/+1 角度格
  → 拆成固定次序的微步候选姿态
  → 每个候选通过 OBB/AABB 分离轴 Gate 才接受
  → 投影公开位置、朝向、碰撞提示与终点保持
```

`requestAnimationFrame` 只累积时间并派发整数 tick；权威状态不读取 DOM、像素布局、真实时钟、随机数或 CSS 动画。

## 5. 整数状态与 OBB/AABB Gate

建议权威状态只保存：

```text
tick
centerX, centerY
angleIndex                 // 离散角度表索引
leftIntentX/Y
rightIntentX/Y
routeStage                 // 入口 / 窄门 / 客厅
collisionSerial
insideGoalTicks
phase                      // intro / playing / paused / complete
```

### 5.1 角度与微步

- 使用固定离散方向表；表中的 `sin/cos` 为定标整数，运行期间不让浮点角度成为权威状态。
- 每个 tick 平移不超过一个小步、旋转不超过一个 `angleIndex`；组合动作拆成固定微步，逐个接受。
- 碰撞后保留最后安全姿态，不计算最短推出向量，避免角落抖动、吸附和顺序差异。
- 长帧不追算无限 tick；超过冻结阈值直接暂停并清空 accumulator。

### 5.2 四轴分离

旋转矩形与轴对齐矩形只需检查：

```text
worldX, worldY, sofaLocalX, sofaLocalY
```

在任一轴上，只要两者投影区间存在冻结的安全间距，就没有碰撞；四条轴都无法分离才视为重叠。边界语义必须在规格中固定，不能在生产与测试间混用 `<`、`<=` 或临时 epsilon。

为防止旋转扫过门框角：

- 位移与角度格足够小；
- 每个 tick 使用固定数量微步；
- 可先以包围 AABB 做 broad phase，再执行四轴 Gate；
- 每个已接受姿态必须再次证明与全部障碍无正重叠。

## 6. 输入、生命周期与无障碍

- 键盘使用物理 `KeyboardEvent.code`：左侧 `KeyW/KeyA/KeyS/KeyD`，右侧 `ArrowUp/Left/Down/Right`；只在玩法激活且命中控制键时阻止默认行为。
- `keydown repeat` 只保留 held 状态，不叠加额外动作；`keyup` 按原始 code 精确释放，即使修饰键状态已经变化。
- 每个触控盘只接受自己的 `pointerId`，不筛掉 `isPrimary === false`；两根手指可同时控制两端。
- `pointerup`、`pointercancel`、`lostpointercapture` 与 document 级释放汇聚到幂等清理；迟到事件不能释放新指针。
- 两个触控盘使用原生可聚焦控件与至少 120px 可操作区域，只有它们设置 `touch-action:none`；暂停、重开等辅助目标至少 48×48px，这是仓库内部标准，不冒充 WCAG 强制值。
- 沙发方向、门口、目标区、当前路线段、碰撞和“为何不动”都有 DOM 文本；不把画面颜色或微小 SVG 字形作为唯一信息。
- `aria-live` 只报告开始、路线段变化、碰撞节流提示、暂停和完成，不逐 tick 播报坐标。
- reduced motion 关闭摇屏、庆祝漂移和非必要过渡，不改变 tick、碰撞或终局；forced colors 下墙、沙发、目标和焦点仍由系统色、图案、文字与轮廓区分。

## 7. 固定版本开源调研与零复制边界

核验日期：2026-07-19。以下来源只用于研究通用机制和工程边界，不进入运行依赖。

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [SAT.js](https://github.com/jriecken/sat-js/tree/20e612681d1f9eabc9ea34dc98c4d27f985ffec6) | tag `0.9.0`，commit `20e612681d1f9eabc9ea34dc98c4d27f985ffec6`；MIT；Copyright 2012–2015 Jim Riecken | 凸多边形、AABB 与分离轴投影的技术对照 | `Vector/Polygon/Response` API、源码、函数、最短重叠响应、示例和测试 |
| [Box2D](https://github.com/erincatto/box2d/tree/8c661469c9507d3ad6fbd2fea3f1aa71669c2fe3) | tag `v3.1.1`，commit `8c661469c9507d3ad6fbd2fea3f1aa71669c2fe3`；MIT；Copyright 2022 Erin Catto | 凸形状、固定步、连续碰撞和完整刚体引擎边界 | C/C++、接触流形、裁剪、求解器、samples、图表与参数 |
| [dyn4j](https://github.com/dyn4j/dyn4j/tree/058bf6d982a0fb89b54050f929f6ea9dae53b714) | tag `6.0.0`，commit `058bf6d982a0fb89b54050f929f6ea9dae53b714`；BSD-3-Clause；Copyright 2010–2026 William Bittle | Transform、本地/世界坐标、凸形状与静态物体的工程对照 | Java 源码、类/API、算法实现、测试、示例；不以作者或贡献者名义背书 |
| [p2.js](https://github.com/schteppe/p2.js/tree/d83c483f912362fd6e57c74b0634ea3f1f3e0c82) | tag `v0.7.1`，commit `d83c483f912362fd6e57c74b0634ea3f1f3e0c82`；MIT；Copyright 2015 p2.js authors | 固定 time step、Box/Convex 碰撞与渲染插值分层 | 引擎、World/Body API、Float32 状态、demos、示例和分发文件 |
| [js_thrustvector](https://github.com/pemmyz/js_thrustvector/tree/4d140761ba1af8f4448bc6bd4785b63fc8928c5c) | commit `4d140761ba1af8f4448bc6bd4785b63fc8928c5c`；MIT；Copyright 2025 pemmyz | 两位玩家共同影响一个载荷的抽象合作问题 | 飞船、炸弹、夹取、洞穴、路径、参数、源码、截图、音频与视觉 |
| [TwoPlayerGames](https://github.com/tridpt/TwoPlayerGames/tree/542c57a778bbf843eb2cb121e99d0b050d8c866e) | commit `542c57a778bbf843eb2cb121e99d0b050d8c866e`；MIT；Copyright 2026 tridpt | 同机双控制组、纯客户端游戏注册与确定性测试思路 | 76 个游戏、共享壳、服务端、账号、音频、素材、样式、规则与源码 |

平台行为参考固定版本的 [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74)、[W3C UI Events code](https://github.com/w3c/uievents-code/tree/b201684d1de0af90bc403814bbdee6aa96647130)、[WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d)、[W3C WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) 与 [CSSWG Drafts](https://github.com/w3c/csswg-drafts/tree/c7573530343759ace8e46438a1fa2c44515b5554)。只研究 Pointer 生命周期、物理键位、动画帧、目标尺寸、降动效和 forced colors；不复制规范文字、IDL、示例、图表或站点视觉。

即使许可证允许复制，C07 仍选择零复制，以保持实现来源、视觉身份与许可证义务清晰。若未来引入任何实质代码，必须另立变更、保存许可证并重新审查素材与分发边界。

## 8. 明确排除与误匹配

| 来源 | 排除原因 |
| --- | --- |
| [evanw/rapt](https://github.com/evanw/rapt/tree/88573a51e4e4f96b0369b3748552ec71354aa813) | 双人 HTML5 物理平台游戏，但固定仓库无许可证；不得复制 JavaScript、碰撞、关卡、敌人、编辑器、图形或文本 |
| [ethanuser/Cooperate](https://github.com/ethanuser/Cooperate/tree/a0031c6c097c7d84ddbe96af1ae6d17e9fbec127) | 无许可证，README 还说明背景音乐来自商业游戏；代码、MP3、视觉、关卡与规则均不可复制 |
| [combat_couch_racing](https://github.com/Touff-97/combat_couch_racing/tree/90b0c6471716e08566f03395aeef679cccce8c9d) | MIT 明确，但 “couch co-op” 是本地多人赛车，不是协作搬家具；题材与机制不匹配，不进入复用链 |
| HELLCOUCH | 以实体沙发作为 Arduino/Unity 控制器，不是浏览器搬运玩法；没有作为本作代码或素材来源 |
| 《Moving Out》《Heave Ho》《Get Packed》 | 商业作品只说明合作搬运是常见题材；不使用名称、人物、沙发造型、关卡、UI、截图、音效或音乐 |

公开源码不等于获准复制；代码许可证也不能自动覆盖字体、音乐、贴图、截图和品牌。权利不清的资产一律不进入本作。

## 9. 必须通过的可验证 Gate

1. **双人必要性**：任一侧意图始终为零时，任何日志都不能改变安全姿态或完成；双方同向能平移，法线差分能双向旋转。
2. **确定性**：同一输入日志深相等；30/60/144Hz 渲染分片不改变整数终态；长帧与隐藏页面不补跑。
3. **SAT 边界**：覆盖 0°、90°、斜角、边相切、角相切、安全间距、薄墙、窄门与旋转扫过墙角。
4. **不穿透**：每个已接受微步与全部障碍均无正重叠；碰撞后停在上一安全姿态。
5. **可达性**：固定地图必须保存一段只用生产动作的原创 golden replay，或由量化状态搜索证明可进入目标并共同松手保持 12 tick。
6. **终点完整性**：中心进入但四角越界、角度错误、仍有输入或保持不足都不能完成。
7. **输入生命周期**：两指同时、交换顺序、第三指、拖出、pointercancel、lost capture、窗口失焦、隐藏恢复、键盘 repeat 与迟到 release 均不残留输入。
8. **重置**：从碰撞、暂停、完成和隐藏路径重开后，状态与首次加载深相等。
9. **响应式与非颜色信息**：320×700、390×844 与桌面均看到场景、两组控制和暂停；墙、沙发、目标、方向与碰撞不只靠颜色区分。
10. **离线与权利**：`file://` 无网络请求、模块 MIME、CDN、远程字体/音频；源码与资产扫描不含排除项目内容，借鉴声明可追溯。

## 10. Go / No-Go

**Go。** C07 能形成仓库尚未覆盖的“两个连续意图共同决定一个长刚体的平移与旋转、以凸碰撞穿过狭窄转角、最后共同放稳”合作样板。它适合 A 级经典脚本，不需要新增运行依赖。

进入规格前必须冻结：离散角度表、输入合成公式、微步顺序、接触边界、原创地图矩形、目标完整包含与共同松手优先级，以及 golden replay 的公开动作格式。

## 11. 借鉴声明摘要

“一起，把家搬进来”的玩法、关卡、界面、代码、文案与素材均为独立原创实现。研究阶段只参考固定版本项目中的分离轴定理、凸形状变换、固定步进和同机双控制组等公开技术思想。

本作不会复制或移植 SAT.js、Box2D、dyn4j、p2.js、js_thrustvector、TwoPlayerGames 及排除项目的源码、API、算法实现、测试、示例、参数、关卡、图形、字体、音乐、截图、页面结构或文案；也不会使用商业搬家游戏的名称、角色、造型和关卡表达。
