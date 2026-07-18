# “这一拍，刚好和你”定向调研

- 日期：2026-07-18
- 创意来源：第二轮候选 C04“四手小钢琴”
- 目标等级：A，经典脚本、相对路径、`file://` 直开
- 结论：进入实现；采用“双人各负责一个声部、目标始终可见、同窗合成和声”的原创玩法

## 1. 为什么现在做 C04

现有合作作品已经覆盖序列记忆、编码译码、实时传菜、正交调色和互补信息推理，但还没有“双方必须在同一个短时间窗内共同完成一个音乐事件”的样板。

C04 原先因与“节拍接力”“回声擂台”“把这首转给你”存在音乐交互重叠而暂缓。本次重新定义差异：不考记忆、不追逐移动节拍、不分先后输赢，也不让一人独奏完整旋律；每一拍都由低音席和高音席各完成一个可见目标，只有两次输入在同一窗口相遇，和声才成立。

### 1.1 四种产品方案比较

| 方案 | 核心体验 | 结论 |
| --- | --- | --- |
| 看完序列后共同复现 | 记忆、轮流或同时敲击 | 拒绝；与“节拍接力”“回声擂台”重叠 |
| 自由双人钢琴 | 任意演奏、没有共同目标 | 拒绝；缺少可完成的情侣仪式 |
| 移动谱面节奏游戏 | 追拍、判定 perfect/good/miss | 拒绝；压力和计分会削弱合作感，也放大设备时序差异 |
| 可见双声部共同和声 | 每人一音、短窗会合、短按住确认 | 采用；共同目标明确，声音关闭后仍能完整游玩 |

## 2. 冻结的玩法边界

- 两人共用一台设备，低音席使用 `A/S/D/F`，高音席使用 `J/K/L/;`；移动端使用两组真实按钮。
- 每一小节只要求每席一个音，总并发按键最多两个，降低键盘 ghosting 和触控拥挤。
- 目标音与实体键始终可见，不要求背谱。
- 两次正确按下相差不超过 4 个整数 tick（50ms/tick，即 200ms）时建立和声；建立后共同保持 6 tick（300ms）完成该小节。
- 完成后必须双方都松开，才进入下一小节，长按不能跨小节偷跑。
- 首版使用 5 个原创双声部合拍点，不加载知名旋律、MIDI、曲谱、采样、SoundFont 或远程资源。
- 没有分数、星级、赢家、连击和失败次数；错误只给中性校准提示。
- 声音只是等价反馈之一。静音、AudioContext 被阻止或播放失败时，视觉、文字和进度仍可完成全部流程。

建议首版原创乐句：

| 小节 | 低声部 | 高声部 | 实体键 |
| --- | --- | --- | --- |
| 1 | C3 | E5 | `A + L` |
| 2 | G3 | D5 | `D + K` |
| 3 | A3 | C5 | `F + J` |
| 4 | F3 | D5 | `S + K` |
| 5 | C3 | G5 | `A + ;` |

## 3. 浏览器与输入约束

### 3.1 Web Audio

W3C Web Audio 允许浏览器在页面取得用户激活前阻止 AudioContext 进入 `running`。因此只能在用户真实点击“开始合奏”或“继续合奏”时创建/恢复声音；初始化失败不得阻塞玩法。[W3C Web Audio API 1.1](https://www.w3.org/TR/webaudio-1.1/) 与 [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) 都支持这一渐进增强边界。

规则时钟与音频时钟必须分开：

- reducer 使用 50ms 整数 tick 判定会合窗口和保持时长；
- AudioContext 只在小节完成后播放两个短音，不参与规则推进；
- `requestAnimationFrame` 只把经过时间换算成整数 tick；
- 单元测试不创建真实 AudioContext。

现有 [`shared/audio/tone-player.js`](../shared/audio/tone-player.js) 已支持一次完成事件中连续调用两次 `playTone()`，形成重叠短音，并在不可用时返回 `false`。首版无需修改共享播放器，也不把声音生命周期绑定到 `keyup`。

### 3.2 键盘与 Pointer

Microsoft 对键盘 ghosting 的解释指出，硬件未报告的组合无法由浏览器补回。因此首版坚持每席每拍最多一音，并提供等价触控按钮。[Microsoft Anti-Ghosting](https://blogs.microsoft.com/ai/anti-ghosting-keyboard-applied-research-at-work/)

- 使用布局无关的 `KeyboardEvent.code`；忽略 `event.repeat` 和带修饰键的输入。[W3C UI Events KeyboardEvent code](https://www.w3.org/TR/uievents-code/)
- 键盘和 Pointer 都归一成 `{ voice, noteId, inputId }`，判定层不读取 DOM。
- Pointer 以 `pointerId` 区分输入，不过滤 `isPrimary`；支持两个触点同时占据不同声部。
- `pointercancel`、`lostpointercapture`、`blur`、`visibilitychange` 和 Escape 都清空活动输入并暂停。
- 返回前台不自动继续，避免旧按键或旧触点在后台积累进度。

## 4. 可访问性 Gate

依据 [WCAG 2.2](https://www.w3.org/TR/WCAG22/)：

- 每个音键使用真实 `<button>`，项目内部目标尺寸不低于 48×48px；WCAG 2.2 AA 的最低目标是 24×24px。[Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
- 两席不只靠颜色区分，还同时显示“低音席/高音席”、音名、键位与不同轮廓。[Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)
- 成功、错误、暂停、声音失败均有文字反馈；声音不是唯一信息。
- live region 只播报阶段变化和需要行动的反馈，不在每个 tick 重复播报。
- `prefers-reduced-motion: reduce` 下删除弹跳、缩放脉冲和粒子，只保留静态进度、边框与文字状态。[Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions)
- `forced-colors` 下保留可见边框、焦点和按下状态。

## 5. 开源来源与许可证核验

以下固定提交于 2026-07-18 核验。它们只用于理解通用机制和划定禁区，不进入运行依赖。

| 项目 | 固定提交与许可 | 仅研究的机制 | 明确不复制/不引入 |
| --- | --- | --- | --- |
| [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js/tree/589edde7f895ee0cd2b8068133c74e7c4d521046) | `589edde7f895ee0cd2b8068133c74e7c4d521046`；MIT；Copyright © 2014–2025 Yotam Mann | 音频时间轴与视觉时间轴分离、短音生命周期 | 源码、Transport/Synth/Sampler API、示例调度、旋律、测试音频和依赖 |
| [mdn/webaudio-examples](https://github.com/mdn/webaudio-examples/tree/733def1c41939a7bb2ec4dc1be3603e3ae70af51) | `733def1c41939a7bb2ec4dc1be3603e3ae70af51`；CC0 1.0；MDN contributors | AudioContext 启动/暂停和渐进增强 | 示例源码、step sequencer、WAV/MP3/OGG 与页面视觉 |
| [yuxshao/ptcollab](https://github.com/yuxshao/ptcollab/tree/8b40faa043f1e7734e7f560c0c181160c85f979e) | `8b40faa043f1e7734e7f560c0c181160c85f979e`；MIT；Copyright © 2020 Yu Xuan Shao | 声部分工、统一事件时间线 | Qt/C++、协议、轨道编辑器、图标、pxtone 乐器、示例曲和声音包 |
| [drahoslove/pianco](https://github.com/drahoslove/pianco/tree/2cb08afe19bc6583e281773d283033bde60e7d51) | `2cb08afe19bc6583e281773d283033bde60e7d51`；MIT；Copyright © 2022 Drahoslav Bednář | 玩家身份反馈、note 事件模型 | 前后端代码、WebSocket 协议、钢琴 UI、和弦命名、Salamander 采样、Bravura 字体、截图与曲目 |

Tone.js 还有 `standardized-audio-context`、`tslib` 等运行依赖；pianco 需要 webpack、WebSocket、JWT 与采样资源；ptcollab 是 Qt/C++ 桌面软件。它们都不符合本作品“复制整个目录也能 `file://` 打开”的 A 级目标。

## 6. 风险矩阵

| 风险 | 影响 | 首版控制 |
| --- | --- | --- |
| 自动播放被阻止 | 没声音或初始化失败 | 用户手势后恢复；失败转无声，不阻塞规则 |
| 键盘 ghosting | 一席按键未上报 | 每席一音、最多两键并发、触控等价入口 |
| 帧率/异步声音影响判定 | 同一输入在设备间结果不同 | reducer 整数 tick；声音不进入状态机 |
| 长按跨小节 | 一次输入连续完成多段 | 完成后双方松开 Gate |
| 失焦造成卡键 | 进度自动增长或长鸣 | blur/hidden/cancel 清空并暂停；短音自动停止 |
| 多点触控被主指针过滤 | 手机无法双人同时按 | 不读取 `isPrimary`；按 `pointerId` 管理 |
| 声音/颜色成为唯一提示 | 无声或高对比模式不可玩 | 音名、键位、声部、形状、文字与进度冗余 |
| 既有旋律或采样版权 | 不能安全再分发 | 原创五小节；OscillatorNode 实时合成；零音频文件 |

## 7. Go / No-Go

**Go。** C04 能在现有仓库中形成新的“同步共同完成”合作样板，并且不需要新增 npm 包、音频文件、字体、网络服务或共享层改动。实现前需要冻结状态机、配置和阶段 DOM；视觉上应强调“两条声部在中央合拢”，而不是复刻传统钢琴键盘或节奏游戏轨道。

## 8. 机制研究与借鉴声明

“这一拍，刚好和你”是本仓库独立实现的本地双人合奏体验。研究阶段查阅了 W3C Web Audio 与无障碍标准，并比较了 Tone.js、MDN Web Audio Examples、ptcollab 与 pianco 的机制和工程边界。

本作品只参考 Web Audio 用户激活、时间轴分离、声部分工、统一音符事件和输入清理等通用工程思想。没有复制、改写、打包或依赖上述项目的源代码、数据格式、网络协议、示例旋律、MIDI、曲谱、钢琴采样、音效、字体、图标、截图、页面结构或视觉素材。

短曲、音高计划、合奏规则、状态机、HTML、CSS、JavaScript、中文文案、测试与后续界面均为独立创作；运行声音由浏览器原生 OscillatorNode 实时合成，不加载第三方音频文件或远程资源。
