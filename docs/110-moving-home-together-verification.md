# “一起，把家搬进来”验收记录

- 日期：2026-07-19
- 作品：[`../experiences/co-op/moving-home-together/`](../experiences/co-op/moving-home-together/)
- 等级：A，本地经典脚本，无新增安装依赖、账号、网络、存储或音频
- 玩法：两人各控制沙发一端，用八向意图共同平移和转弯，穿过固定 S 形门厅后一起松手放稳

## 1. 结论

功能、生产动作可达性、确定性、本地边界、键盘与双 Pointer、响应式实玩、目录接入、来源声明和基础视觉实现通过验收；主任务没有可保存的最新浏览器截图，因此不宣称完成像素级视觉验收。

- 129 项逻辑测试覆盖 256 格整数角度、双端八向合成、固定微步、OBB/AABB 四轴 Gate、六障碍、路线阶段、目标四角、双松手、生命周期、外部状态和确定性重放；
- golden replay 只含 150 条公开生产 action，在 tick 634 以 `(820, 160, 0)`、`routeStage = 2`、`collisionSerial = 0` 和 12 tick 松手保持完成；
- 经典脚本、相对资源、无联网/存储/传感器/媒体 API、无运行时三角函数、双 Pointer generation、120px 主盘和 48px 辅助入口由目录 Gate 固定；
- 前端实施子任务在真实 Chrome `file://` 中完成 1280×800、390×844 和 320×700 实玩，无横向溢出，场景、状态、暂停与双盘核心均可见；
- 主任务的内置浏览器安全策略拒绝 `file://` 导航，并明确禁止用 localhost、底层命令或另一浏览器表面绕过，因此本轮没有新增可复核截图；
- 目录现有 43 个作品入口、1 个能力声明，其中 35 个是无第三方运行依赖的独立 A 级样板；
- README 与 ATTRIBUTION 固定六个机制参考、五份平台规范、许可证/权利主体、ImageGen 无第三方输入和完整原创零复制声明；
- 两个提交前问题已修复并记录：伪造姿态越出世界、移动端主动作缩到 44px。

截图受限是当前自动化证据能力限制，不是已复现产品缺陷。概念、生产背景、源码与实施子任务的浏览器实玩证据均保留，但没有浏览器截图文件可供像素 diff。

## 2. 自动检查

| 检查 | 结果 |
| --- | --- |
| `node --check` 三个生产 JavaScript | PASS |
| `node --test experiences/co-op/moving-home-together/logic.test.js` | 129 / 129 PASS |
| `node --test shared/runtime/catalog.test.js` | 63 / 63 PASS |
| `npm test` | 831 / 831 PASS |
| `npm run verify` | 43 个作品入口、1 个能力声明 PASS |
| `git diff --check` | PASS |

目录 Gate 额外固定：

- HTML 不使用 module 或远程 `src/href`，运行源码不含 fetch/XHR/WebSocket、Worker、浏览器存储、相机、传感器、音频、`Math.random` 或共享运行时引用；
- 生产逻辑包含冻结的 256 项整数角度表，不在运行时调用 `Math.sin` 或 `Math.cos`；
- `requestAnimationFrame` 只驱动固定 tick，超过 250ms 的长帧会清输入并暂停，不补算后台时间；
- `pointerup`、`pointercancel`、`lostpointercapture` 和 document 释放按精确 pointerId 与单调 generation 汇聚；
- 两个控制盘使用 `touch-action:none` 且最小 120×120px，辅助入口至少 48px；
- reduced motion、forced colors 和背景缺失均有代码级降级；规则地图、墙、目标、沙发和文字不依赖位图。

## 3. 运动学、碰撞与可达性

### 3.1 权威状态

权威层只保存整数中心坐标、`0..255` 角度索引、双方按物理 inputId 排序的输入、路线阶段、目标保持 tick、碰撞序号和生命周期状态。双方都存在非零合成意图时才移动：同向分量产生平移，端点差分产生旋转；每 tick 先平移微步，再旋转微步，任一步碰撞都保留最后安全姿态。

沙发是 220×76 的 OBB；六个生产障碍为固定 AABB。碰撞使用沙发局部轴和世界 X/Y 四个分离轴，闭边界保留 2 单位间隙。目标必须同时满足：

- 路线已单调推进到阶段 2；
- 沙发四角完整进入 `[690,90,950,230]`；
- 角度接近水平索引 0 或 128；
- 两侧没有任何真实 held input；
- 连续保持 12 tick。

### 3.2 Golden replay

150 条日志只调用公开 `START`、`SET_INPUT`、`RELEASE_INPUT` 与 `TICK`，没有传送、内部状态赋值、关闭碰撞或测试专用动作。展开后的结果固定为：

```text
phase: complete
tick: 634
pose: [820, 160, 0]
routeStage: 2
collisionSerial: 0
insideGoalTicks: 12
completionTick: 634
```

测试在每个被接受姿态后重新检查世界边界和六个障碍，并断言路线阶段只会按门厅 → 转角 → 客厅单调推进。同一动作日志重放深相等，30/60/144Hz 等价分片导出相同整数状态。

## 4. 输入与生命周期实玩

| 路径 | 验收结果 |
| --- | --- |
| 键盘 | 左侧 WASD、右侧方向键按物理 `code` 映射；单侧输入不移动，双方可各自合成八向意图 |
| 双 Pointer | 两个 pointerId 可分别占左右盘；Chrome 实玩以 pointer 11/12 同向控制，使中心 x 从 190 移到 202 |
| 中心死区 | 左指进入 18% 死区只释放左端方向，右端会话仍保留；移出死区可继续同一会话 |
| 精确释放 | pointerup/cancel/lost capture 按 pointerId 和 generation 幂等释放，旧会话不清新输入 |
| 暂停 | Escape、blur、hidden 和长帧清空输入；继续后不补算后台 tick |
| 完成 | 双方真实 heldInputs 全空才累计 12 tick；方向合力抵消但仍按住不会误结算 |
| 文本 | 等待左/右、碰撞、路线、暂停和完成均有非颜色文字，不按 tick 刷屏 |

## 5. 响应式与视觉 fidelity

### 5.1 图像证据

本轮以原始分辨率重新检查：

- [`../design/moving-home-together/concept-desktop-playing.png`](../design/moving-home-together/concept-desktop-playing.png)，1568×1003；
- [`../design/moving-home-together/concept-mobile-playing.png`](../design/moving-home-together/concept-mobile-playing.png)，853×1844；
- [`../design/moving-home-together/concept-desktop-complete.png`](../design/moving-home-together/concept-desktop-complete.png)，1568×1003；
- [`../experiences/co-op/moving-home-together/assets/moving-day-paper.jpg`](../experiences/co-op/moving-home-together/assets/moving-day-paper.jpg)，1568×1003。

生产背景是无字、低细节、中心留白的亚麻象牙纸，只有边角灰蓝/陶土纸片、缝线和黄铜针，没有地图、沙发、控件、人物、品牌或水印。所有规则对象由本地 SVG/HTML/CSS 生成。

实施子任务在同一轮比较了概念与 Chrome `file://` 实现，并根据实图修复标题重叠和短屏地图预算；临时截图在子任务结束时已清理。主任务后来被浏览器安全策略阻止重新导航，所以下表结合该轮真实浏览器报告与本轮源码/概念复核，不是可下载的像素 diff。

| 对照项 | 结果 | 证据与偏离 |
| --- | --- | --- |
| 桌面层级 | PASS | 1280×800 保留标题、主地图、固定状态签和等权双盘；没有侧栏、分数或统计 HUD |
| S 形地图 | PASS / INTENTIONAL | 六个冻结直角 AABB 由 SVG 绘制；不复制概念的弧形墙和家居装饰，以生产碰撞为真源 |
| 沙发主焦点 | PASS | 陶土红三段坐垫、两端握点和朝向箭头随 220×76 OBB 同步变换 |
| 目标地毯 | PASS / INTENTIONAL | sage 缝边、完整四角 Gate 和沙发轮廓保留；省略可能遮挡闭边界的流苏 |
| 对等双盘 | PASS | 左灰蓝、右陶土、同尺寸、120px 最小盘面；L/R、键位、线型和方向文字提供非颜色冗余 |
| Pointer 状态 | PASS / INTENTIONAL | 整盘拖动而非八个独立按钮；加入中心死区和会话文字，符合真实输入合同 |
| 移动 390×844 | PASS | 无横向溢出，场景、状态、暂停和两盘核心均在首屏；标题重叠已在实图比较后修复 |
| 窄屏 320×700 | PASS | 同一 1000:680 地图缩放，双盘仍并排且至少 120px；短屏地图高度经实图收紧 |
| 完成态 | CODE + LOGIC PASS / SCREENSHOT LIMITED | reducer 可真实到达完成，DOM 使用“家放稳了”和“再搬一次”；没有保存终局浏览器截图 |
| 降级 | CODE PASS / SCREENSHOT LIMITED | forced colors、reduced motion、背景缺失均实现；因主浏览器限制，没有媒体查询截图 |

### 5.2 文案差异

- 标题、暂停、路线三段、等待双方、碰撞、完成标题和“再搬一次”均使用冻结产品文案；
- 概念进行态只有短状态，生产版补充副题、键位、当前方向和非颜色等待说明，帮助真实操作；
- 完成概念正文“难的从来不是那道门，是我们愿意一起慢一点。”保留在默认配置中；生产版前置“家放稳了。”并可追加个性化落款；
- 概念图片中的书法字形不提取、不复制，运行时只用系统字体和真实 DOM 文本；
- 移动概念采用更纵深的重绘地图，生产版按冻结规格复用同一 1000:680 viewBox，以保证碰撞与视觉只有一个几何来源。

## 6. 借鉴与来源声明

完整声明见 [`../experiences/co-op/moving-home-together/ATTRIBUTION.md`](../experiences/co-op/moving-home-together/ATTRIBUTION.md)。固定参考只用于通用机制和工程边界，不是运行依赖：

- SAT.js `20e612681d1f9eabc9ea34dc98c4d27f985ffec6`、Box2D `8c661469c9507d3ad6fbd2fea3f1aa71669c2fe3`、p2.js `d83c483f912362fd6e57c74b0634ea3f1f3e0c82`、js_thrustvector `4d140761ba1af8f4448bc6bd4785b63fc8928c5c` 与 TwoPlayerGames `542c57a778bbf843eb2cb121e99d0b050d8c866e` 均为 MIT；
- dyn4j `058bf6d982a0fb89b54050f929f6ea9dae53b714` 为 BSD-3-Clause；
- Pointer Events、UI Events code、WHATWG HTML、WCAG 与 CSSWG Drafts 均固定到声明中的具体 commit；
- 无许可证、混入商业音乐、题材误匹配和商业搬家游戏均列为明确排除项。

没有复制、翻译、改写、打包或依赖上述项目与规范的代码、API、算法实现、参数、关卡、素材、字体、音频、截图、文案或视觉。玩法、六矩形地图、256 格表、整数 SAT、页面、文案和测试均为本仓库独立原创。

三张概念和生产背景由 OpenAI 内置 ImageGen 于 2026-07-19 生成，第三方图片、商业游戏截图与开源项目资产输入均为无。PNG 背景用本机已有 ffmpeg 转成 JPEG，没有增加运行或安装依赖。

## 7. Bugs 与 Learn

本批记录并闭环：

- [伪造状态允许沙发中心落到世界外](../bugs/2026-07-19-moving-home-forged-pose-outside-world.md)：外部状态增加安全整数、世界中心范围和 OBB 安全 Gate，并补 6 项测试；
- [移动端主动作被压到 44px](../bugs/2026-07-19-moving-home-mobile-primary-target-height.md)：恢复 48px，目录 Gate 同时锁定双盘 120px。

本批新增沉淀：

- [几何玩法的生产动作重放：同时证明可达、无穿透与完成 Gate](../learn/2026-07-19-production-action-replay-for-geometry.md)

浏览器 `file://` 安全策略只在本报告记录为当前自动化环境限制，不作为产品 Bug 写入 `bugs/`。

## 8. 独立提交链

```text
59633b9 docs: research moving home together
c24bc01 docs: specify moving home together
ee69ae4 docs: align moving home file contract
37b1abd docs: plan moving home together
aad781c design: define moving home visuals
d1ef93d feat: add moving home state engine
f98b9e6 feat: add moving home experience
5449000 feat: catalog moving home together
50f38eb docs: record moving home precommit bugs
45b1bd2 learn: document production action geometry replay
```

本验收报告与两份索引另作一个提交，继续遵守“一部分完成一次提交”。

