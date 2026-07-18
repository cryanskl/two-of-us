# “慢一点，也和你一起”定向调研

- 日期：2026-07-18
- 创意来源：第二轮候选 C05“同步呼吸星”
- 目标等级：A，经典脚本、相对路径、`file://` 直开
- 工作 ID：`same-pace-star`
- 结论：进入实现；采用“接光四拍、六颗星轮换领拍”的原创节奏合作玩法

## 1. 为什么不能只做同步长按

C05 原始设想是“两人按住各自按键控制光圈呼吸，连续同频充满星球”。如果规则只检查两边是否同时长按，它会成为现有 C 级作品“同心解锁”的单机简化版：两人从开始一直压住按键即可完成，没有交接、修正或新的合作判断。

本作因此保留“慢节奏、共同点亮星球”的情绪价值，但把可验证的合作改成四个连续边沿：一边先收起星光，另一边接住，然后双方依次放开。静态压键不能通关，每个人在每颗星里都必须完成一次按下和一次松开。

### 1.1 四种产品方案比较

| 方案 | 核心体验 | 结论 |
| --- | --- | --- |
| 双方同时长按蓄满 | 同时开始并持续保持 | 拒绝；与“同心解锁”重叠，也容易被一人持续压住两键替代 |
| 双轨相位调频 | 按住加速、松开减速，把两条波形调到同相 | 暂缓；运动是主要信息，降动效和读屏等价路径复杂，首局解释成本偏高 |
| 左右密语窗口 | 双方按各自符号提示行动 | 暂缓；同屏没有真正秘密，双信息区会挤压移动首屏 |
| 接光四拍 | 领拍按下 → 接拍按下 → 领拍松开 → 接拍松开 | 采用；动作离散、职责轮换、长按无效，适合键盘与双 Pointer |

## 2. 冻结的产品边界

- 两人共用一台设备；左边使用 `A`，右边使用 `L`，移动端使用左右两个真实按钮。
- 一局点亮六颗星，领拍顺序固定为左、右、左、右、左、右，双方各领拍三次。
- 每颗星依次完成“领拍按住、另一边接住、领拍松开、另一边松开”四步。
- 每一步都有准备段和 600ms 接光窗口；过早、过晚、席位错误或提前松手都让当前星重新开始。
- 失败不扣除已经点亮的星，不记录谁犯错，不给分数、连击、星级、倒计时排名或赢家。
- 失败后若仍有活动输入，必须双方完全松开才能重试；旧按键或触点不能穿透下一次尝试。
- 光圈只提供节拍氛围；四格轨、动作文字、左右席状态和六星进度共同表达规则。
- 首版没有音频、振动、随机题库、持久化、账号、网络、共享层改动或第三方运行依赖。
- 作品文案允许称“节拍”“舒展”“收起”“接住”，不把真实吸气、呼气、憋气作为输入要求。

推荐可见说明：

> 两边轮流把星光收起、交给对方，再一起放开。光圈只是节拍提示，不需要配合真实呼吸。

安全短句：

> 不用憋气或刻意调整呼吸；如果感到不适，请停下来。

## 3. 节拍与状态机可行性

首版采用固定整数 tick，浏览器时间只负责换算，不直接决定业务结果：

```text
TICK_MS = 50
STEP_TICKS = 24             // 每步 1.2 秒
ACTION_WINDOW_START = 8     // 400ms 开窗
ACTION_WINDOW_END = 19      // 950ms 仍接受，共 600ms
MISS_TICK = 20              // 1000ms 未完成即失败
MAX_FRAME_GAP_MS = 500
MEASURE_COUNT = 6
LEADERS = [left, right, left, right, left, right]
```

一次正常流程约 28.8 秒，第四步的有效松开可立即点亮当前星，不必等待装饰动画结束。`requestAnimationFrame` 只把经过时间转换成整数 tick；reducer 不读取 DOM、`Date.now()`、`performance.now()`、CSS 动画、音频或随机数。

每个输入都携带物理 `inputId`。`RELEASE` 只能清除完全匹配的活动输入，迟到的旧 `pointerup` 不能释放后来的新触点。`TICK { ticks }` 逐个消费 miss 与 step boundary，保证一个 50ms tick 和十个 5ms 帧分片得到相同结果。

推荐阶段：

```text
intro → ready → playing
playing → release-gate → ready       // 失败后仍有输入
playing → measure-complete → ready   // 前五颗成功
playing → complete                   // 第六颗成功
playing/release-gate → paused → ready
任意阶段 → restart → intro
```

本地同屏无法证明屏幕前一定有两个人，也无法防止一名熟练玩家操作两个键或修改本地 JavaScript。本作只承诺防止机械穿透：持续压住双键、缺少松开、重复 `keydown`、旧 Pointer 释放和后台补跑都不能完成一颗星，不作安全级“反作弊”宣传。

## 4. 生命周期与输入约束

- 键盘使用 `KeyboardEvent.code`；忽略 `event.repeat`、组合键和已登记的同一 `inputId`。
- Pointer 按 `pointerId` 区分，不过滤 `isPrimary`；同一物理输入不能同时占据两席。
- 仅左右触控 pad 设置 `touch-action: none`，不阻止页面其余区域的滚动和缩放。
- `pointercancel`、`lostpointercapture`、document 级 `pointerup` 都按匹配 ID 释放；系统手势或设备切换不得留下卡住输入。
- `blur`、`visibilitychange`、Escape 或单帧间隔大于 500ms 时清空输入和时间余量，进入暂停。
- 恢复只回到当前星的 `ready`，不从半个节拍继续，也不补算隐藏页面期间的 tick。

[W3C Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/) 定义了独立 `pointerId`、Pointer capture 及取消生命周期；[WHATWG HTML animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames) 和 [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) 支持按经过时间而不是帧数推进。浏览器隐藏页面时会暂停或节流动画回调，因此恢复 Gate 是规则正确性的一部分，而不是视觉增强。

## 5. 无障碍与响应式 Gate

依据 [WCAG 2.2](https://www.w3.org/TR/WCAG22/)：

- 左右操作区使用真实 `<button>`，首版项目内目标尺寸不低于 56×56px。
- 左右席不只靠颜色区分，还显示席位名、`A/L` 键位、按住/松开文字、不同轮廓和方向标记。
- 四格节拍轨使用形状与文字显示“准备 / 现在动作”，颜色与光圈缩放不进入规则。
- `role="status"` 只播报步骤、共同失败、暂停和完成，不逐 tick 朗读倒数。
- `prefers-reduced-motion: reduce` 下关闭环的缩放、位置漂移和脉冲，使用四格离散高亮；规则 tick、窗口和终局不变。[Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions)
- `forced-colors` 下保留边框、焦点、按下状态和节拍格；成功不能只用填充色表示。[Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)
- 390×844 与 320×700 的进行态首屏只保留标题、六星进度、四格节拍轨、两个大 pad 和暂停；长说明只放在 intro。

读屏播报本身存在延迟，不能只凭语义标记宣称计时玩法“完整读屏可玩”。首版必须在浏览器验证键盘、双 Pointer、降动效和 VoiceOver 的实际反馈；若实时窗口仍不适合读屏，应另立非计时辅助模式规格，而不是暗改默认规则。

## 6. 健康与措辞边界

[NCCIH Relaxation Techniques](https://www.nccih.nih.gov/health/relaxation-techniques-what-you-need-to-know) 提醒，放松技巧针对具体健康问题的证据有限，也不能替代医疗照护。[NHS breathing exercises](https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/breathing-exercises-for-stress/) 强调呼吸应保持舒适、不勉强；出现不适时应停止。

因此本作被定义为“节奏合作游戏”，不是呼吸训练、健康产品或治疗工具：

- 不声称缓解焦虑、压力或失眠；
- 不声称调节神经系统、心率、血氧或真实呼吸同步；
- 不要求深呼吸、延长呼气、憋气或按固定秒数调整生理节律；
- 不用成功结果推断感情、默契程度或身体状态；
- 可随时暂停、重来或退出，不制造“坚持才有效”的暗示。

## 7. 开源与论文来源核验

以下来源于 2026-07-18 固定核验。它们只用于理解通用机制、浏览器生命周期和许可边界，不进入运行依赖。

| 来源 | 固定版本与权利信息 | 仅研究的抽象机制 | 明确不复制/不引入 |
| --- | --- | --- | --- |
| [hmillerbakewell/breathing-exercises](https://github.com/hmillerbakewell/breathing-exercises/tree/6ae2b07cead1c953ccbdcabba7a245dc6294950f) | `6ae2b07cead1c953ccbdcabba7a245dc6294950f`；MIT；Copyright 2022 Hector Miller-Bakewell | 分阶段数据、可视化阶段进度 | HTML/JS、SVG 路径、调色板、4/6 秒处方、页面文案、打包的 SVG.js |
| [kosciukus/breathe](https://github.com/kosciukus/breathe/tree/debd32208441f7ba68d34badf0aa5ab73cb66cf3) | `debd32208441f7ba68d34badf0aa5ab73cb66cf3`；MIT；Copyright 2026 kosciukus | 阶段提示分离、本地离线生命周期 | Flutter/平台代码、音频提示、预设、图标和界面 |
| [mmazzarolo/breathly-app](https://github.com/mmazzarolo/breathly-app/tree/740527679c95a6b77b8d9157c8945a060d2dcdb2) | `740527679c95a6b77b8d9157c8945a060d2dcdb2`；MPL-2.0；Matteo Mazzarolo 与 contributors | 文件级 copyleft 边界、会话状态与视觉提示分离 | 全部代码、音频、General Sans/Lora 字体、星空素材、预设、文案和 UI |
| [anxkhn/zen-clock-workshop](https://github.com/anxkhn/zen-clock-workshop/tree/f4ba61f5ea964405532fe97c4ea9a6313f150444) | `f4ba61f5ea964405532fe97c4ea9a6313f150444`；MIT；Copyright 2026 Zen Clock Contributors | 仅作反例：README 明示含故意植入 bug 和未完成功能 | 不引入任何源码、主题、存储结构、健康功能或素材 |
| [BreatheWithMe, CHI EA 2023](https://doi.org/10.1145/3544549.3585589) | 出版方版权；[TU Delft 记录](https://resolver.tudelft.nl/uuid:b27dd57a-69cb-4bf8-adee-bde1fe254b67) 未提供可复用许可 | 只参考“双通道共同呈现”的抽象研究问题；论文结果不证明生理同步 | 论文正文、图表、设备、实验流程、截图与措辞 |
| [WHATWG HTML](https://github.com/whatwg/html/tree/9377fd656f519b60524b92f09bcc9e6d937b2017) | `9377fd656f519b60524b92f09bcc9e6d937b2017`；规范 CC BY 4.0，代码片段 BSD-3-Clause | animation frame 时间戳与可见性生命周期 | 规范文字、代码片段和示例 |
| [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74) | `238e8273305bb2e3c76f9f0bb289fb127c3dff74`；W3C Software and Document License | Pointer ID、capture、cancel 与键盘等价入口 | 规范文字、IDL、代码片段和图表 |
| [WCAG 2.2](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) | `07123b871c103268375880980fd715b2b26b2ff0`；W3C Document License | 降动效、非颜色提示、状态语义 | 规范文字、示例、图表和站点视觉 |

无正式许可证的 `nfreear/breath` 和 `Zen-Focus/Zen-Focus-Web` 不进入候选，也不作为可复制来源。MPL-2.0 项目不是 MIT 风格的无条件代码池；即使文件级义务可管理，本作也没有引入它的必要，因此采用完整零复制边界。

## 8. 风险矩阵

| 风险 | 影响 | 首版控制 |
| --- | --- | --- |
| 退化为同步长按 | 与“同心解锁”重复 | 四个边沿动作、轮换领拍、长按不能跨步 |
| 动作窗口过严 | 两人反复失败，产生责备感 | 600ms 窗口；共同中性提示；浏览器实测后只通过规格变更调整 |
| 错误输入残留 | 旧键或触点推进下一轮 | 物理 inputId、release Gate、失焦清理 |
| 帧率改变规则 | 不同设备判定不一致 | 50ms 整数 tick、边界消费、分片等价测试 |
| 光圈成为唯一信息 | 降动效或低视力玩家看不懂 | 四格轨、文字、席位状态、形状与边框冗余 |
| 读屏播报赶不上窗口 | 无法独立跟随动作 | VoiceOver 实测；不虚称完整支持；辅助模式另立规格 |
| 被误解为健康练习 | 玩家勉强调整真实呼吸 | 首屏明确无需配合呼吸；无健康效果措辞；随时暂停 |
| 第三方许可污染 | 无法安全再分发 | 只研究固定来源；零复制代码、素材、处方、文案和 UI |

## 9. Go / No-Go

**Go。** “接光四拍”形成了仓库尚未覆盖的“按下与松开交接”合作样板，且不需要新增 npm 包、共享依赖、音频、字体、网络或服务。它与“同心解锁”的差异可以通过持续双按无法完成、六颗星轮换领拍和每颗四边沿测试直接验证。

进入规格前仍需冻结：step boundary 的精确结算顺序、早按/错席/提前松手的统一失败优先级、完成后 DOM 阶段，以及 600ms 窗口在双 Pointer 和 VoiceOver 下的实测验收口径。

## 10. 机制研究与借鉴声明

“慢一点，也和你一起”是本仓库独立实现的本地双人节奏合作体验。研究阶段查阅了 WHATWG、W3C、WCAG、NCCIH 与 NHS 资料，并比较了 breathing-exercises、breathe、Breathly、Zen Clock Workshop 和 BreatheWithMe 的机制与权利边界。

本作品只参考分阶段进度、双通道呈现、时间驱动渲染、独立 Pointer 生命周期、降动效和非颜色提示等通用思想。没有复制、改写、翻译、打包或依赖上述项目和论文的源代码、数据结构、处方节奏、音频、字体、图标、SVG、截图、图表、设备、实验流程、界面结构、页面文案或视觉素材。

接光四拍规则、六星领拍计划、状态机、HTML、CSS、JavaScript、中文文案、测试和后续视觉资产均为独立创作。
