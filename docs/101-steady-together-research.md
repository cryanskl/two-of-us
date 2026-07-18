# A 级“稳稳地，和你一起向前”定向调研

- 日期：2026-07-18
- 创意来源：第二轮候选 C06“双人天平”
- 目标等级：A，经典脚本、相对路径、`file://` 直开
- 工作 ID：`steady-together`
- 结论：进入实现；采用“两人托住移动天平，让滚珠稳定穿过三段坡路”的原创合作玩法

## 1. 先证明这是双人合作，而不是双键演示

C06 原始设想是“两人抬升跷跷板两端，把滚珠维持目标区并运到终点”。如果只让左右按键改变横梁角度，玩家可以同时压住双键等到结束；如果只做自由物理沙盒，又没有明确的共同目标与可验证终局。

本作把“托稳”和“向前”绑定：两端的平均支撑力达到门槛，且滚珠位于中央目标区、速度足够低、横梁倾角安全时，小车才沿路线前进。路线依次施加左偏、右偏和回正三段坡势，双方必须持续观察并调整差值；单边、静止、持续双按都不能完成。

### 1.1 四种产品方案比较

| 方案 | 核心体验 | 结论 |
| --- | --- | --- |
| 同时长按托起滚珠 | 两边共同压住直到进度满 | 拒绝；静态输入即可穿透，没有修正与交接 |
| 把稳才前进 | 滚珠稳定在中央时，小车穿过三段相反坡势 | 采用；合作条件可见、职责会随坡势自然交换，也最贴近原始“维持并运送” |
| 一来一回交到你手里 | 双方把滚珠轮流送到对侧接取区 | 暂缓；角色更固定，连续共同支撑感较弱 |
| 双端升降桥 | 调整两端高度，让滚珠跨越缺口和机关 | 暂缓；首版会引入不必要的二维碰撞与关卡编辑，且接近已有路径解谜 |

## 2. 冻结的产品边界

- 两人共用一台设备；左边使用 `A`，右边使用 `L`，移动端使用左右两个真实按钮。
- 按住会抬高对应一端，松开会让该端平缓回落；单侧最大支撑不能达到小车前进门槛。
- 路线固定分为左偏、右偏、回正三段，并设两个检查点；坡势是路线进度的纯函数，不使用随机数。
- 只有“平均支撑足够、滚珠在中央目标区、滚珠速度低、横梁倾角安全”同时成立时才向终点前进。
- 路线进度不倒退；滚珠越过边缘后回到最近检查点，并要求双方完全松开后再开始。
- 完成终点后仍需保持约 600ms 的安全终态；只碰到终点、滚珠仍高速或横梁过斜都不算完成。
- 不给分、不计失败次数、不排名、不评判默契，不指出由哪一边造成失稳。
- 首版没有音频、振动、随机关卡、持久化、账号、网络、传感器权限、第三方运行库或共享层改动。

推荐首屏说明：

> 左边托住左端，右边托住右端。把滚珠稳在中央，小车才会向前；坡势改变时，一起把它接回来。

## 3. 确定性动力学可行性

首版不模拟完整二维刚体。横梁和滚珠只保留与玩法有关的一维整数状态：

```text
双方输入 → 各端升力趋近目标值
升力差 + 当前坡势 → 横梁倾角趋近目标值
横梁倾角 → 滚珠加速度
滚珠加速度 - 阻尼 → 滚珠速度与位置
支撑、位置、速度、倾角共同满足 → 路线进度增加
```

推荐使用 `TICK_MS = 20` 的固定整数 tick。`requestAnimationFrame` 只把经过时间累积成 tick；reducer 不读取 DOM、帧率、真实时钟、随机数或 CSS 动画。位置、速度、升力和倾角使用定标整数，避免浮点漂移进入公开规则。

建议阶段：

```text
intro → ready → playing
playing → release-gate → ready        // 掉落或暂停后仍有输入
playing → checkpoint → playing        // 只作短暂可见反馈
playing → final-hold → complete       // 终点复合条件持续成立
playing/release-gate → paused → ready
任意阶段 → restart → intro
```

浏览器若失焦、页面隐藏或单帧间隔超过 500ms，应清空输入和累计时间并暂停；恢复后从最近检查点的确定状态开始，不补算后台时间。

## 4. 为什么首版不统一物理依赖

[Matter.js](https://github.com/liabru/matter-js/tree/8a67787735585f02c4b46eabf7b9fcc1c7c321da)、[Planck.js](https://github.com/piqnt/planck.js/tree/93dd64df0fd2e5388551b159bebc6306e7af580a) 和 [Box2D](https://github.com/erincatto/box2d/tree/56edae79f2949d86142b03450d5d60f63bcf5a6f) 都能表达圆体、横梁、约束与碰撞，但 C06 没有需要通用求解器的碰撞网络。引入完整引擎会增加本地 vendor、许可证分发、调参和跨版本确定性成本，却不会改善核心合作判断。

仓库内已有作品也存在两类不同的时间语义：连续物理作品使用约 `1/120s` 子步，节奏与离散状态作品使用整数毫秒 tick，并对长帧采用不同策略。C06 先保留独立纯 reducer；完成后只比较真正相同的 accumulator、暂停和输入清理语义，再决定是否抽取共享帮助函数，不预先制造“通用物理层”。

## 5. 输入、生命周期与无障碍 Gate

- 键盘按物理位置读取 `KeyboardEvent.code`，忽略 `repeat`、组合键、输入框和 IME 事件；`keyup` 仍按原始 code 精确释放。
- Pointer 按 `pointerId` 归属左右席位，不过滤 `isPrimary`；`pointerup`、`pointercancel`、`lostpointercapture` 和 document 级释放都必须幂等。
- 仅两个操作 pad 使用 `touch-action: none`，页面其余位置保留滚动和缩放。
- 两个 pad 在 390×844 与 320×700 进行态中仍应至少约 120px 高；仓库内所有主要目标继续高于 48×48px。
- 左右席使用文字、键位、轮廓方向和按住状态冗余表达，不能只靠玫红/青绿区分。
- 滚珠位置、坡势、检查点与“为何没有前进”都提供 DOM 文本状态；不把微小画布文字当作唯一信息。
- `prefers-reduced-motion: reduce` 只关闭粒子、晃动、背景滚动和非必要过渡，不修改物理 tick、稳定窗口或终局。
- `forced-colors` 下保留系统边框、焦点、按下态、中央目标区和滚珠轮廓。

[W3C Pointer Events Level 3](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74) 提供 Pointer ID、capture 与取消生命周期；[WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d) 和 [Page Visibility](https://github.com/w3c/page-visibility/tree/8ca533c744e655b8340b5713d1bd5ea97b202b13) 说明动画帧与隐藏页面生命周期；[WCAG 2.2](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) 用于目标尺寸、非颜色提示和降动效验收。规范只作为行为依据，不复制其文字、示例、IDL 或图表。

## 6. 固定版本开源调研与复制边界

以下来源于 2026-07-18 固定核验，只用于研究抽象机制和技术取舍，不进入运行依赖。

| 来源 | 固定版本与权利信息 | 仅研究的抽象机制 | 明确不复制/不引入 |
| --- | --- | --- | --- |
| [makenowjust-sandbox/20210411-seesaw](https://github.com/makenowjust-sandbox/20210411-seesaw/tree/70790b1c0cc57aabddd93f58ad456e473db44d2e) | `70790b1c0cc57aabddd93f58ad456e473db44d2e`；MIT；Copyright 2021 TSUYUSATO “MakeNowJust” Kitsune | 中心支点、横梁、滚珠、摩擦、落地失败与重置 | TypeScript 源码、常量、随机计分、localStorage、GIF 和视觉 |
| [cryanskl 调研候选 balance-ball-game](https://github.com/ekids9702122935/balance-ball-game/tree/8cc21a213394f0e701ca0643af3fef32562f5d91) | `8cc21a213394f0e701ca0643af3fef32562f5d91`；MIT；许可证仅标注 Copyright 2025，未列姓名 | 倾角影响滚珠、中央区域门控进度 | 源码、公式、参数、gamepad、分数、难度、粒子、磁吸和边缘辅助 |
| [Matter.js](https://github.com/liabru/matter-js/tree/8a67787735585f02c4b46eabf7b9fcc1c7c321da) | `8a67787735585f02c4b46eabf7b9fcc1c7c321da`，稳定版 0.20.0 对应 commit；MIT；Liam Brummitt and contributors | 转轴约束、圆体与横梁的技术对照 | 引擎、示例、分发文件、参数、图标和文档文字 |
| [Planck.js](https://github.com/piqnt/planck.js/tree/93dd64df0fd2e5388551b159bebc6306e7af580a) | `93dd64df0fd2e5388551b159bebc6306e7af580a`；MIT；Erin Catto、Ali Shakiba | 固定步、fixture、边界与接触事件的备选路径 | 引擎、示例、分发文件和 Box2D/Planck 实现 |
| [Box2D](https://github.com/erincatto/box2d/tree/56edae79f2949d86142b03450d5d60f63bcf5a6f) | `56edae79f2949d86142b03450d5d60f63bcf5a6f`；MIT；Copyright 2022 Erin Catto | 固定时间步和约束求解的技术对照 | C/C++ 源码、示例、图表、文档文字和运行时 |
| [Unity ML-Agents](https://github.com/Unity-Technologies/ml-agents/tree/5f2aae68223624559096479695a8d7a94296bfec) | `5f2aae68223624559096479695a8d7a94296bfec`；Apache-2.0；Copyright 2017 Unity Technologies | Balance Ball 任务的观察、动作与持续平衡目标 | Unity/ML/3D 代码、模型、场景、资源、文案和视觉 |
| [pemmyz/js_robotballgame_redux](https://github.com/pemmyz/js_robotballgame_redux/tree/3ca9f1ac5b16cb7123f8f19cf2e7362b1b019df5) | `3ca9f1ac5b16cb7123f8f19cf2e7362b1b019df5`；MIT；Copyright 2025 pemmyz | 两套键盘/触控输入共同作用于一个物理对象 | CDN Planck、机器人造型、AI、冲刺、分数、2.5D 视觉与截图 |
| [imshota1009/Nyan-Cororin](https://github.com/imshota1009/Nyan-Cororin/tree/fb9054368526d30929870aae7338b3b956235e7a) | `fb9054368526d30929870aae7338b3b956235e7a`；MIT；Copyright 2026 shota | 倾斜到加速度、阻尼、速度上限与键盘降级 | Three.js/Cannon.js CDN、传感器、角色、关卡、BGM、文案与造型 |
| [chriz-3656/tiltmaze](https://github.com/chriz-3656/tiltmaze/tree/3c959deb5743fea22e9654c69c697e4cf4dc5334) | `3c959deb5743fea22e9654c69c697e4cf4dc5334`；MIT；Copyright 2026 MISTER CHRIS | Canvas 加速度、阻尼与目标判定 | 六个关卡、迷宫、图标、音频、UI、排行榜和 API |
| [neizod/marbles](https://github.com/neizod/marbles/tree/bb8542028d1665775e46262a86d19ff5baab038a) | `bb8542028d1665775e46262a86d19ff5baab038a`；MIT；Copyright 2017 Nattawut Phetmak | 左右独立输入共同改变一个公开状态 | 完整源码、棋面、规则、GIF 和界面 |

即便上游许可证允许复制，C06 也选择零复制，以保持代码来源、视觉身份和许可证义务清晰。若未来决定引入任何实质代码，必须另立变更、保存原许可证并重新审查分发边界。

## 7. 明确排除的候选

| 来源 | 排除原因 |
| --- | --- |
| `satnamsingh2007/seesaw-game@3839f95759d141fc39142429c97f85fe6f1eb246` | 无正式 LICENSE，并混入 Matter.js、p5.js 与 PNG；不复制代码或素材 |
| `HalimRaimjanov/Ball-game-JS@9f0ed163a45eb2dc3ceb6eaa88e38bbaa7c03cda` | 无正式 LICENSE；HTML、JS、CSS 与背景图均不可复制 |
| `DipeshR23/tilt-balance-game@fb861aa2e02182b43e47947fb8248578db402d65` | 无正式 LICENSE；即使离线和倾斜机制接近，也不得复制源码、PWA 或素材 |
| `Mai-Anshhh/BalanceBall@10591353bd5f2cd9d48ab84f75bfa0c6fffaa784` | MIT 权利人写作 Bartosz Budnik，与仓库所有者不一致，且含大量二进制、音频和 Godot 构建；不进入复用链 |
| `bobbyali/algebra_seesaw@e1e888f83e8c9596e0bdb081f63efb32a5cd4642` | MIT 明确，但玩法是代数配重教学，不是合作滚珠平衡，主题不匹配 |

无许可证仓库只用于确认“跷跷板影响滚珠”是常见抽象玩法，不对其代码、样式、常量、资源或页面结构进行阅读式翻写。

## 8. 必须通过的可验证 Gate

- 一边从未输入时，任何轨迹都不能增加到终点。
- 双方从开始持续等量长按，在至少一个相反坡段会失稳，不能通关。
- 静止、仅松开或滚珠高速穿过中央时，路线不能增加。
- 同一输入日志在不同运行中得到深相等状态；帧分片不同但 tick 总数相同时结果相同。
- 左右输入和坡势镜像后，横梁、滚珠与进度轨迹镜像等价。
- 500ms 以上长帧、隐藏页面或失焦不会后台补跑，也不会留下按住状态。
- 迟到的旧 Pointer 释放不能清除后来建立的新输入。
- 掉落只回最近检查点；失败与重来均经过双方松手 Gate。
- 终点必须同时满足位置、速度、倾角和持续时间，瞬间擦过不算完成。
- 320×700、390×844 与桌面均能看到核心状态、两个操作区和暂停入口。

## 9. Go / No-Go

**Go。** “稳稳地，和你一起向前”形成仓库尚未覆盖的“连续差值修正 + 复合稳定门控 + 检查点运送”合作样板。它能以零外部依赖、固定整数状态和原生 HTML/CSS/SVG 独立实现，符合 A 级 `file://` 直开要求。

进入规格前冻结：三段坡势的确定函数、升力/倾角/滚珠的整数更新顺序、检查点与最终保持的结算优先级、掉落重置状态，以及每项 Gate 的公开可测字段。

## 10. 机制研究与借鉴声明

“稳稳地，和你一起向前”是本仓库独立实现的本地双人合作体验。研究阶段查阅了固定版本的跷跷板、滚珠、双人输入和物理引擎项目，以及 WHATWG、W3C 与 WCAG 规范。

本作品只借鉴“横梁倾角影响滚珠”“中央稳定区门控进度”“左右玩家独立输入同一共享对象”“固定步推进”“检查点重置”等通用机制。C06 的规则组合、整数状态机、动力学、HTML、CSS、JavaScript、测试、视觉、文案和后续素材均为独立创作；没有复制、改写、翻译、打包或依赖上述项目的源代码、公式、参数、关卡、素材、图标、字体、音频、截图、界面结构或文案。
