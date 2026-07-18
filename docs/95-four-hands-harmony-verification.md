# “这一拍，刚好和你”验收记录

- 日期：2026-07-18
- 作品：[`../experiences/co-op/four-hands-harmony/`](../experiences/co-op/four-hands-harmony/)
- 等级：A，本地经典脚本，无新增安装依赖、账号、存储或公网请求
- 玩法：低音席与高音席在 200ms 内按下公开目标，共同保持 300ms，双方松开后进入下一节，五节组成原创短句

## 1. 结论

作品实现、规则、目录、仓库、localhost 生命周期、三档响应式、触控尺寸、视觉忠实度与来源声明均通过验收：

- 五个原创双音事件、4 tick 会合窗、6 tick 保持和双松手 Gate 由 66 项 reducer 测试覆盖；
- 八个 code-native 键、重复 keydown、旧 RELEASE、双 pointerId、cancel/lost capture、blur/hidden/stalled 均投影到同一状态机；
- 1504×1046 与 390×844 页面测量无横向或纵向溢出，320×700 无横向溢出且仅有允许的 6px 纵向滚动；
- 390/320 的返回、声音、暂停均为 48px，琴键分别约 92px 与 83px；
- Escape 进入独立 paused DOM，继续后焦点回到当前低音目标，声音开关 `true → false → true`，控制台日志为空；
- 目录现有 40 个作品入口，其中 A 级 32 个、合作类 15 个；
- README 与 ATTRIBUTION 各自保留四个 fixed commit、许可证、权利主体、ImageGen 最终提示词和完整零复制边界。

本轮有两项明确的浏览器控制限制，不冒充已独立实测：

1. 当前内置浏览器策略拒绝 `file://` 导航，并明确禁止换浏览器或用底层命令绕过。A 级直开边界由经典脚本、相对路径、无远程资源和仓库静态 Gate 覆盖；真实 OS 双击未在本轮自动化中观察。
2. 当前控制接口只能发送完整按键，不能分开发送持续 300ms 的 `keyDown/keyUp`；组合键尝试没有形成保持。因此根任务没有独立走完五节浏览器终局，完整规则链由 66 项 reducer 测试证明，完成态只使用已接受概念作设计证据。

这两项是证据能力限制，不是已复现的产品 bug；音频延迟 Promise 竞态和五节焦点链在对应 bug 记录中继续保留为未完成专项浏览器项。

## 2. 自动检查

| 检查 | 结果 |
| --- | --- |
| `node --check` 三个生产 JavaScript | PASS |
| `node --test experiences/co-op/four-hands-harmony/logic.test.js` | 66 / 66 PASS |
| `node --test shared/runtime/catalog.test.js` | 57 / 57 PASS |
| `npm test` | 536 / 536 PASS |
| `npm run verify` | 40 个作品入口、1 个能力声明 PASS |
| `git diff --check` | PASS |

目录 Gate 额外固定：

- 经典脚本、无 module、无远程 `src/href`、无 fetch/XHR/WebSocket/Worker/浏览器存储；
- 唯一向上运行引用为 `shared/audio/tone-player.js`，缺失时 app 内静音播放器接管；
- 无 `Math.random`、音频文件、采样、字体或第三方运行包；
- `requestAnimationFrame` 只累计 50ms 整数 tick，规则不读取音频时钟；
- Pointer cancel/lost capture、visibilitychange、结构化 DOM、无 `innerHTML`；
- 48px 触控目标、`touch-action:none` 仅用于琴键、forced colors 与 reduced motion；
- README 和 ATTRIBUTION 的四个 fixed commit、权利主体、ImageGen 与零复制声明。

## 3. localhost 浏览器验收

环境：macOS、Codex 内置 Chromium、本地运行时 `http://localhost:4173/`。

### 3.1 开场与进行态

点击“开始合奏”后：

- 谱带第 1 节“靠近”成为当前；
- 低音目标为 A/C3，高音目标为 L/E5；
- activeElement 为“左边的你，低音席 A，C3，目标键”；
- 两席八键、中央目标、保持进度、暂停和隐私说明全部存在；
- 页面没有 warning 或 error。

组合按键自动化尝试只产生完整按下/松开，页面仍停在第 1 节，证明当前接口不能表达持续保持；没有把该结果写成玩法失败。

### 3.2 生命周期与声音

| 路径 | 浏览器证据 |
| --- | --- |
| Escape 暂停 | DOM 只保留“琴键已经松开”“回来后从这一小节继续”和“继续合奏”；live status 同步 |
| 继续 | 回到第 1 / 5 节，activeElement 恢复到低音 A/C3 目标 |
| 声音关闭 | `aria-checked=false`，文案“声音：关” |
| 声音重开 | `aria-checked=true`，文案“声音：开” |
| 控制台 | 全程 `[]` |

共享音频只是反馈层。完成事实由 reducer 的 `completed[]` 维护；app 以完成长度差消费音频，并用 `audioGeneration` 阻止旧播放器 Promise 回写当前状态。

## 4. 响应式几何与证据

| 视口 | DOM / 计算样式结果 |
| --- | --- |
| 1504×1046 | viewport 与 scroll 均为 1504×1046，无滚动；开局焦点在 A/C3；控制台为空 |
| 390×844 | viewport 与 scroll 均为 390×844；返回/声音/暂停 48px；琴键最小约 91.9px；首屏完整 |
| 320×700 | scroll 320×706，无横向溢出；返回/声音/暂停 48px；琴键最小 83px；允许 6px 纵向滚动 |

保存的真实浏览器证据：

- [桌面进行态 JPEG](./assets/four-hands-harmony/desktop-playing.jpg)
- [390px 移动进行态 JPEG](./assets/four-hands-harmony/mobile-playing-390.jpg)

浏览器 API 返回的字节实际为 JPEG/JFIF；最初误存 `.png`，经 magic bytes 核验后只改扩展名、未重编码。桌面文件为 1504×892 可截图内容区，DOM 视口/页面测量为 1504×1046；移动文件完整为 390×844。

## 5. Fidelity ledger

同轮使用 `view_image(original)` 对比：

- `design/four-hands-harmony/concept-desktop-playing.png` 与实际桌面进行态；
- `design/four-hands-harmony/concept-mobile-playing.png` 与实际 390px 进行态；
- `design/four-hands-harmony/concept-desktop-complete.png` 仅作冻结完成态设计证据，不冒充运行截图。

| 项目 | 结果 | 证据 |
| --- | --- | --- |
| 环境材质 | PASS | 明亮晨光、象牙墙面、浅木桌、边缘绿植/玻璃/黄铜与生产背景一致 |
| 双席身份 | PASS | 低音薄荷、高音杏色；目标键同时用颜色、描边、文字冗余表示 |
| 谱带层级 | PASS | 五节编号与名称始终公开，当前节独立标记，不要求记忆 |
| 会合核心 | PASS | 中央黄铜轮廓同时展示 A/C3 + L/E5、指令、进度条和状态文字 |
| 控件语义 | PASS | 原生 link/button/switch/progressbar，焦点可见，移动目标不低于 48px |
| 本地边界 | PASS | 页脚明确不录音、不联网、不保存；无第三方字体、图标或音频文件 |
| 移动重排 | PASS | 两席改为上下排列，仍在 844px 首屏完整可触达 |

### 有意偏离复核

- 概念图采用更长的纵向仪式空间；运行版 390×844 压缩中央留白和谱带高度，让两组四键与暂停同时进入首屏；
- 概念的心形与叶片只是设计语汇，运行版用更克制的 `+`、黄铜边框和原生 SVG，避免生成装饰成为规则符号；
- 概念里的生成中文和额外装饰没有进入产品，运行时只使用规格冻结文案；
- 桌面运行版把两席与中央会合区收进同一水平任务带，保留对称、公平和完整目标信息。

这些偏离都服务可读性、首屏触达或 code-native 语义，没有发现新的未声明可修复偏差。

## 6. 借鉴与来源声明

完整声明见 [`../experiences/co-op/four-hands-harmony/ATTRIBUTION.md`](../experiences/co-op/four-hands-harmony/ATTRIBUTION.md)。本作品只研究通用机制：

- Tone.js fixed commit `589edde7f895ee0cd2b8068133c74e7c4d521046`，MIT，音频与规则时间轴分离；
- MDN Web Audio Examples fixed commit `733def1c41939a7bb2ec4dc1be3603e3ae70af51`，CC0 1.0，用户激活与渐进增强；
- ptcollab fixed commit `8b40faa043f1e7734e7f560c0c181160c85f979e`，MIT，声部分工与统一事件线；
- pianco fixed commit `2cb08afe19bc6583e281773d283033bde60e7d51`，MIT，玩家身份与 note 事件模型。

没有复制、翻译、改写或打包这些项目的代码、协议、钢琴 UI、示例曲、MIDI、采样、声音包、字体、图标、截图或页面结构。五节乐句、规则、状态机、页面、中文文案与测试均为本仓库独立创作。

`harmony-table.webp` 由 OpenAI ImageGen 生成，无第三方输入；页面声音由原生 OscillatorNode 即时合成，零音频文件、零采样、零远程请求。

## 7. Bugs 与 Learn

本批记录并处理：

- [FFmpeg 缺 WebP 编码器](../bugs/2026-07-18-four-hands-harmony-webp-encoder-unavailable.md)
- [SVG 命名空间被离线 Gate 误报](../bugs/2026-07-18-four-hands-harmony-svg-namespace-gate.md)
- [音频准备竞态](../bugs/2026-07-18-four-hands-harmony-audio-readiness-race.md)
- [measure-complete 键盘焦点断链](../bugs/2026-07-18-four-hands-harmony-measure-focus-loss.md)
- [移动触控目标被压到 44px](../bugs/2026-07-18-four-hands-harmony-mobile-touch-targets.md)
- [README 借鉴声明 Gate 不完整](../bugs/2026-07-18-four-hands-harmony-readme-attribution-gate.md)
- [截图扩展名与 magic bytes 不一致](../bugs/2026-07-18-four-hands-harmony-screenshot-extension.md)

本批沉淀：

- [同步合作与可选音频：整数完成记录、差值消费和 generation 守卫](../learn/2026-07-18-coop-completion-delta-audio-generation.md)
- [共同按住交互：物理 inputId、双松手 Gate 与焦点连续性](../learn/2026-07-18-physical-input-release-gate-focus.md)

## 8. 独立提交链

```text
8f720c5 docs: research four hands harmony
e90b2a0 docs: specify four hands harmony
85903b0 docs: plan four hands harmony
0718366 bug: record four hands WebP fallback
d09a4d0 design: define four hands harmony visuals
6d16d66 feat: add four hands harmony state engine
2d36851 feat: add four hands harmony experience
3589307 feat: catalog four hands harmony
b6d05f8 bug: document SVG namespace gate exception
da2a2a1 fix: guard four hands audio readiness
108d866 fix: preserve four hands keyboard focus
9ac3ebb fix: restore four hands touch targets
2787a39 docs: complete four hands attribution gate
552d35f test: capture four hands responsive evidence
4823c29 bug: correct four hands screenshot extensions
bbcebe4 docs: link four hands bug fixes
dcadb46 learn: document completion delta audio guard
41b761c learn: document physical input release gates
```

验收报告与索引另作一个提交，继续遵守“一部分完成一次提交”。
