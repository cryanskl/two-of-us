# “把秘密藏进这一圈”视觉设计提案

## 0. 文档状态

- 稳定工作 ID：`vinyl-secret`
- 主分类：单人惊喜
- 准备关系：准备者预先编辑本地 `config.js`，接收者随后单人体验
- 启动等级目标：A，真实 `file://` 直接打开
- 当前阶段：视觉提案，等待用户确认
- 当前安装状态：未安装
- 生产状态：已有 `config.js`、`logic.js`、`logic.test.js`、项目级
  `package.json` 与 `ATTRIBUTION.md`；没有生产 HTML/CSS/app
- 本阶段只新增：
  - `docs/320-vinyl-secret-design-proposal.md`
  - `docs/assets/vinyl-secret-desktop-seeking-concept.png`
  - `docs/assets/vinyl-secret-mobile-complete-concept.png`
- 最终验收编号：保留 `321`，本阶段不得占用

本阶段明确不做：

- 不写或修改生产 `index.html`、`styles.css`、`app.js`、README 或 favicon；
- 不修改现有核心、测试或 `ATTRIBUTION.md`；
- 不修改 catalog、Board、根 README、分类 README、门户或共享索引；
- 不创建或提交音频、封面、字体、纹理或其他运行资产；
- 不标记 installed；
- 不把概念 PNG 当成运行时界面、唱片素材或状态 Oracle；
- 不在用户确认前开始生产。

## 1. 冻结产品关系

这不是两个人同时使用页面，也不是音乐播放器。

真实流程是：

```text
准备者
  → 在本地 config.js 写三条 clue / note / targetGroove
  → 可选填写三条受限的本地 audioSrc
  → 写 recipient / final copy
  → 把完整目录交给接收者

接收者
  → 单人打开 index.html
  → 读当前 clue
  → 在 12 圈间移动唱针
  → 读四级文字信号
  → 主动“落下唱针”
  → 依序找到 3 轨
  → 打开最终封套
```

两者是异步关系：

- 准备者不需要同时在线；
- 页面没有准备者席位；
- 页面没有双人轮流、共同操控或在线同步；
- `recipientName`、notes、final copy 表达关系，不代表实时玩家；
- `config.js` 与自备音频都是本地明文，不是加密。

## 2. 产品真值

### 2.1 唯一玩法

```text
12 个固定沟槽
+ 3 个按配置顺序出现的目标
+ 4 级整数距离信号
+ 原生 range 与逐圈按钮
+ 显式 DROP_NEEDLE
+ 可选但不参与规则的本地音频
+ 默认静音仍完整的文字结局
```

每轨的目标只有一个整数：

```text
cursorGroove ∈ [1, 12]
targetGroove ∈ [1, 12]
```

信号由绝对距离唯一决定：

| 距离 | code | 权威文字 |
| ---: | --- | --- |
| `0` | `clear` | 清晰 |
| `1` | `near` | 靠近 |
| `2..3` | `warm` | 微响 |
| `>= 4` | `quiet` | 寂静 |

信号不读取、分析或播放音频。

### 2.2 唯一完成条件

```text
foundTrackIds
=== 配置 tracks[].id 的完整有序前缀
且长度 === 3
```

以下都不能参与完成条件：

- `play()` 成功；
- 音频时长或 `ended`；
- 音量；
- 动画；
- CSS；
- 唱片是否视觉旋转；
- 浏览器是否支持某个编码格式。

### 2.3 明确不是

- 不是流媒体或本地媒体库；
- 不是播放列表；
- 不是专辑封面浏览器；
- 不是 DJ 转盘或刮碟模拟器；
- 不是猜歌、歌词或波形游戏；
- 不是上传、录音或麦克风工具；
- 不是连续真实唱槽或转速模拟；
- 不是静态告白海报。

## 3. 核心逻辑证据

本提案开始前运行：

```bash
node --check experiences/surprises/vinyl-secret/config.js
node --check experiences/surprises/vinyl-secret/logic.js
node --check experiences/surprises/vinyl-secret/logic.test.js
node --test experiences/surprises/vinyl-secret/logic.test.js
```

结果：

```text
37 tests
37 pass
0 fail
```

测试已经证明：

- 默认三个 `audioSrc` 全为 `null`；
- 三轨目标是 `3 / 7 / 11`；
- 12×12 全部信号组合正确；
- 三轨必须按顺序命中；
- 错误落针不推进；
- 正确落针先进入 `playing`，不提前计入 found；
- 只有精确 token 可以结算；
- restart 保持 token 单调，旧回调不能污染新局；
- intro / seeking / playing / track-result / complete 的公开字段受限；
- 最终公开 notes/final，但不公开 target 或 audio path；
- 相对音频路径拒绝 `..`、协议、query、fragment、额外目录与错误扩展名。

视觉稿不能覆盖或改写这些证据。

## 4. 阶段与 presence / absence

### 4.1 Intro

必须存在：

- 固定标题；
- 固定说明；
- “开始寻声”；
- 封闭封套的公共视觉。

必须不存在：

- clue；
- note；
- target；
- audio path；
- recipient；
- final eyebrow/title/message/signature；
- 未来轨道槽位；
- 播放、停止或下一轨控件。

### 4.2 Seeking

必须存在：

- `第 N / 3 轨`；
- 当前轨唯一 clue；
- 唱片、12 圈、唱臂；
- 原生 range；
- “向外一圈 / 向内一圈”；
- 当前圈文字；
- 四级信号文字与仪表；
- “落下唱针”；
- 礼貌状态区。

必须不存在：

- 当前 note；
- 当前 audio path；
- 未来 clue/note/audio；
- final 内容；
- note 或 final 的空槽、锁、模糊轮廓；
- 播放器、播放列表或封面占位。

### 4.3 Playing

必须存在：

- 当前 seeking 信息；
- 刚命中轨的 note；
- token 化短暂结算视觉；
- 默认无音频时：
  `这一轨没有附声音，文字已经展开。`；
- 只有实际音频进入 playing/loading 时才出现“停止声音”。

必须不存在：

- 未来轨道内容；
- final 内容；
- NEXT；
- 播放进度、seek、音量、loop 或 track metadata。

### 4.4 Track result

必须存在：

- 当前 clue；
- 当前已找到 note；
- found 进度；
- “继续听下一面”。

必须不存在：

- `audioSrc`；
- 停止声音之外的播放器结构；
- 下一轨 clue/note；
- final 内容；
- range 与落针控件。

### 4.5 Complete

必须存在：

- `recipientName`；
- `finalEyebrow`；
- `finalTitle`；
- 三条已找到 notes，严格按配置顺序；
- `finalMessage`；
- `signature`；
- “重新开始”；
- 打开的代码原生封套。

必须不存在：

- target；
- audio path；
- seeking range；
- 信号；
- “落下唱针”；
- “继续听下一面”；
- 上传、分享或远程封面。

### 4.6 销毁合同

退出阶段时，失去所有权的节点必须销毁：

```text
public view 不投影
→ DOM 不创建
→ ARIA / data-* / style 不保留
→ audio src/currentSrc 清空
```

不能用：

```text
display:none
visibility:hidden
opacity:0
blur
空卡位
锁图标
问号
分页点
```

来替代 absence。

## 5. 视觉方向：私人压片工作台

### 5.1 核心感觉

希望接收者感到：

- 这是为一个人提前压好的一张私人唱片；
- 唱臂位置是可以亲手校准的离散事实；
- 文字比声音更可靠，声音只是可选礼物；
- 命中后是“内页展开”，不是播放器开始工作；
- 终局像打开一张私人小批量封套，而非浏览专辑。

### 5.2 色彩

| token | 值 | 用途 |
| --- | --- | --- |
| `--ink` | `#0E0D0C` | 唱片、最深背景 |
| `--tea` | `#211914` | 工作台背景 |
| `--paper` | `#F1E7D4` | 封套与终局内页 |
| `--oxblood` | `#7A2430` | 主要动作与唱头 |
| `--brass` | `#C7A45A` | 当前圈、刻度、细边 |
| `--warm-gray` | `#9A9185` | 次级文字与标签 |
| `--paper-ink` | `#241C18` | 纸面正文 |
| `--focus` | `#F5D986` | 高对比焦点外圈 |

生产不得从图片像素自动取色；这些 token 是人工冻结的近似值。

### 5.3 字体

只使用冻结规格的系统栈：

```css
font-family:
  ui-serif, "Songti SC", "Noto Serif CJK SC", Georgia, serif;

font-family:
  ui-sans-serif, system-ui, -apple-system, "PingFang SC", sans-serif;
```

- 情绪标题、clue、note、final 用 serif 栈；
- 按钮、进度、range、signal、状态用 sans 栈；
- 不下载字体；
- 不把生成图字体截图进生产。

### 5.4 容器模型

桌面保持规格的三段语义：

```text
收起的封套标题区
| 唱片工作台
| 当前内页 / clue / signal
```

交互控件可在唱片下方横跨工作台，但不能发展成仪表盘卡片网格。

移动端顺序：

```text
公共标题
→ 当前进度
→ 唱片 / 唱臂
→ 当前 clue 或已打开封套
→ 当前动作
```

## 6. 入选概念资产

### 6.1 Desktop seeking

- 项目路径：
  `docs/assets/vinyl-secret-desktop-seeking-concept.png`
- ImageGen 源：
  `/Users/zenith/.codex/generated_images/019f97bc-7f53-75f0-b78a-713c7ee25a39/call_SKHkeYG5xgJeP6fDsHcePSuz.png`
- 原生尺寸：`1537 × 1023`
- alpha：无
- SHA-256：
  `c0f16b83610f550de7dc143ef4012933f263adc1b15d86efe649b2fa11025d82`
- 生成方式：内建 `image_gen`
- 候选位置：desktop 第 2 稿
- 状态职责：`seeking`

采用理由：

- 大唱片、唱臂、离散 groove range 是唯一视觉中心；
- 12 圈、当前圈、步进按钮与主动落针可被理解；
- clue 和四级 signal 同时可读；
- 没有播放、上传、列表、封面或 DJ chrome；
- 没有提前画出 note/final 槽位；
- 材质可以用 HTML/CSS 近似重建。

### 6.2 Mobile complete

- 项目路径：
  `docs/assets/vinyl-secret-mobile-complete-concept.png`
- ImageGen 源：
  `/Users/zenith/.codex/generated_images/019f97bc-7f53-75f0-b78a-713c7ee25a39/call_eD6COkvL1mMPw1fFg5nmhi2W.png`
- 原生尺寸：`853 × 1844`
- alpha：无
- SHA-256：
  `8d2e7e260bf823c7efb52cc892749df50189be59705240b0fbd98e51c771d53f`
- 生成方式：内建 `image_gen`
- 输入引用：上一张入选 desktop，仅作风格/组件引用
- 状态职责：`complete`

采用理由：

- 标题、完成进度、唱片、打开封套、三条 notes、final 与 restart
  形成完整结局；
- 没有 seeking 控件；
- 默认无音频，因此没有播放器或停止按钮；
- 封套是最终内容容器，不是假专辑封面；
- restart 让画面保持交互终态，而非静态海报。

### 6.3 原图检查

已用 `view_image(detail="original")` 检查：

1. desktop 源图；
2. desktop 项目副本；
3. mobile 源图；
4. mobile 项目副本；
5. desktop 淘汰稿源图。

源图与项目副本的 SHA-256 分别一致。

## 7. 淘汰稿台账

### Desktop 第 1 稿

- 仅保留在 ImageGen 默认目录，不复制进项目：
  `/Users/zenith/.codex/generated_images/019f97bc-7f53-75f0-b78a-713c7ee25a39/call_ZeLmqh9OBFuRF1zABcISY2Q8.png`
- 原生尺寸：`1536 × 1024`
- alpha：无
- SHA-256：
  `5f586dd2290a5817998387423d199964ade686a49114ec851c8c4ee8f0d48aaf`
- 结论：淘汰

淘汰原因：

1. 擅自增加整列规则与鼓励文案；
2. 把冻结信号改写成“远离 / 稍远 / 靠近 / 正好”；
3. 额外文案扩大 seeking 的公开面；
4. 视觉好看不能抵消 copy 与状态真值错误。

修订只做：

- 删除左侧额外文案列；
- 锁定可见 copy；
- 恢复 `寂静 / 微响 / 靠近 / 清晰`；
- 保持材质与交互构图。

候选统计：

```text
desktop: 2 candidates / 1 accepted / 1 rejected
mobile: 1 candidate / 1 accepted / 0 rejected
```

未来若用户要求迭代，不覆盖现有入选 PNG，使用 `-v2` 文件名。

## 8. 精确 ImageGen prompts

### 8.1 Desktop 第 1 稿 prompt

```text
Use case: ui-mockup
Asset type: complete desktop web-app concept screenshot for a future local-first HTML experience
Primary request: Design the full desktop SEEKING phase for the Chinese interactive surprise “把秘密藏进这一圈”. This is an asynchronous surprise: a preparer configured clues beforehand and one recipient is now using the page alone. The recipient moves a stylus across exactly 12 discrete vinyl grooves, reads a four-level text signal, and explicitly drops the needle. It is a deterministic local puzzle, not a music player, DJ deck, streaming app, or static poster.
Scene/backdrop: a quiet private pressing workbench, deep tea-brown and near-black matte background with restrained pool-of-light, no photographed room, no photographic album art.
Composition/framing: landscape desktop screenshot around 1504×1000. Use an open three-part composition, not a card grid: a slim paper sleeve/introduction rail at left, one dominant vinyl-and-tonearm work surface in the center, and a restrained current-clue/control rail at right or below depending on legibility. The entire app screen must be visible.
Exact phase and visible content: phase is exactly seeking, track 1 of 3, cursor at groove 2 of 12, signal “靠近”. Show the public title “把秘密藏进这一圈”, progress “第 1 / 3 轨”, current public clue “先从外圈找起，那里像我们第一次把话说慢。”, a large code-native-looking black vinyl disc with exactly 12 clearly distinguishable concentric groove rings, a warm-gray center label with no logo, a brass-and-oxblood tonearm visibly pointing to groove 2, a real native-looking horizontal range from 1 to 12 with output “第 2 圈，共 12 圈”, two separate controls “向外一圈” and “向内一圈”, a four-segment signal meter plus authoritative text “靠近”, and one clear primary button “落下唱针”. Controls should look implementable as real HTML buttons and input range, with visible focus treatment and at least 48px target proportions.
Privacy truth: ABSOLUTELY DO NOT show, hint at, blur, mask, lock, silhouette, reserve slots for, or preview any secret note, future clue, audio path, final eyebrow, final title, final message, signature, recipient name, found-track text, or final sleeve contents. Do not show a cover image placeholder. No audio control exists in seeking.
Visual system: refined editorial craft, private small-run pressing studio without copying any real record label or album. Deep tea brown #211914, near-black #0E0D0C, paper ivory #F1E7D4, oxblood #7A2430, muted brass #C7A45A, warm gray #9A9185. Restrained CSS-like paper grain and concentric linework, not scanned textures. System-serif personality for emotional copy and system sans for controls. Low-to-medium density, generous spacing, crisp readable Chinese.
Motion cues: the disc may visually suggest stillness while seeking; no continuous-spin visual streaks. Tonearm placement should read as the current discrete groove, not freeform scratching.
Implementation handoff: practical HTML/CSS implementation; all UI text, controls, vinyl, grooves, tonearm, sleeve, signal meter, and focus states will be rebuilt code-native. This screenshot is visual reference only.
Avoid: audio waveform, equalizer, timeline, seek bar for music playback, play/pause, playlist, track metadata, album cover art, upload, file picker, microphone, record button, volume, streaming service chrome, DJ knobs, BPM, speed control, turntable brand, record-label logo, trademark, QR code, navigation, settings, share/export, account, badges, fake metrics, AI icon, prompt box, chat, gallery, hearts, watermark, extra text, decorative pills, nested cards, neon, excessive glow.
```

### 8.2 Desktop 针对性修订 prompt

```text
Edit the immediately previous desktop UI concept as a targeted correction while preserving its premium private-pressing visual world, deep tea-brown/black palette, paper ivory, oxblood and brass materials, large vinyl, tonearm, and practical code-native-looking controls.

Change only the information architecture and exact UI text:
1. REMOVE the entire tall left paper/rules column and every invented sentence inside it. Replace that area by open breathing space and let the title sit quietly at the upper left of the main workbench. Do not add any replacement instructions, rules, descriptions, eyebrow, badges, or decorative copy.
2. Keep exactly these visible text items and no others: “把秘密藏进这一圈”, “第 1 / 3 轨”, “先从外圈找起，那里像我们第一次把话说慢。”, “第 2 圈，共 12 圈”, “寂静”, “微响”, “靠近”, “清晰”, the current authoritative signal “靠近”, “向外一圈”, “向内一圈”, and “落下唱针”. Numeric groove labels 1 through 12 may appear as scale labels.
3. Correct the four signal-meter labels to exactly “寂静 / 微响 / 靠近 / 清晰”, left to right, with the third segment selected and the large signal text “靠近”. Do not use “远离”, “稍远”, or “正好”.
4. Retain exactly 12 distinguishable concentric groove rings, cursor groove 2, one tonearm pointing to groove 2, a real native-looking 1–12 range, the two step buttons, and the drop button.
5. This is SEEKING only. Do not show or imply any secret note, future clue, audio path/control, final copy, recipient, found-track result, sleeve contents, cover placeholder, upload, playlist, playback timeline, waveform, DJ control, logo, trademark, navigation, share/export, or watermark.
6. Keep the entire desktop application visible at approximately 1504×1000, airy and implementable in HTML/CSS. No card grid and no static-poster treatment. This remains a visual reference only; all runtime UI will be rebuilt code-native.
```

执行参数：

```text
referenced_image_paths: omitted
num_last_images_to_include: 1
```

上一张 desktop 第 1 稿是 edit/reference context。

### 8.3 Mobile complete prompt

```text
Use case: ui-mockup
Asset type: complete mobile web-app concept screenshot for a future local-first HTML experience
Input image: the immediately previous corrected desktop SEEKING concept is a STYLE AND COMPONENT REFERENCE ONLY. Preserve its deep tea-brown/near-black private-pressing world, paper ivory, oxblood, muted brass, refined system-serif/system-sans hierarchy, groove/tonearm craft, thin borders, button family, and restrained materials. Do not inherit its seeking phase, current clue, range, signal, or drop controls.
Primary request: Design the full mobile COMPLETE phase for the Chinese interactive surprise “把秘密藏进这一圈”. The single recipient has found all three ordered grooves and the final code-native sleeve is now open. Default configuration has no audio, so this phase contains no player or audio controls. It must remain an interactive web-app end state through a clear restart action, not a static poster.
Composition/framing: true narrow portrait phone viewport around 390×844 with safe-area padding and no horizontal overflow. Show the complete vertical document naturally: compact public title at top; a smaller completed vinyl disc and resting tonearm as continuity; then one visibly opened paper-ivory sleeve/inner-note surface that carries the final private content; one full-width primary restart button at the bottom. Keep text readable and leave enough space for every required item; do not crop the bottom action.
Exact visible content and order: “把秘密藏进这一圈”; progress “第 3 / 3 轨”; recipient “给你”; eyebrow “SIDE US · PRIVATE PRESSING”; final title “这一张，想一直和你听下去”; exactly these three found notes in order: “我最想重播的，不是哪一首歌，是第一次和你聊到忘记时间。” / “后来我才发现，最安静的日子也会因为你有了旋律。” / “唱片会转到尽头，但我还想和你一起听很多个以后。”; final message “谢谢你把三段声音都找到。没有播放出来的部分，也已经被我们一起走过的日子填满。”; signature “留给愿意把针落在这里的你”; one button “重新开始”. Small numeric labels 01 / 02 / 03 may distinguish the three notes. No other visible copy.
State truth: this is complete only. Remove the clue, groove range, outward/inward buttons, signal meter, drop button, next button, and all seeking/playing controls. No audio button because all default audioSrc values are null. Do not show an audio failure warning in complete.
Visual system: premium but intimate small-run pressing studio, no real record label or album imitation. Deep tea brown #211914, near-black #0E0D0C, paper ivory #F1E7D4, oxblood #7A2430, muted brass #C7A45A, warm gray #9A9185. Code-native-looking concentric grooves, simple label with no logo, paper fold/seam language, no raster cover art. Calm vertical rhythm, generous margins, readable Chinese, touch targets at least 48px proportions.
Implementation handoff: practical semantic HTML/CSS; all UI text, open sleeve, vinyl, tonearm, note rows, and button will be rebuilt code-native. This screenshot is visual reference only.
Avoid: play/pause, stop, playlist, playback timeline, waveform, equalizer, volume, upload, file picker, microphone, remote cover art, album grid, music metadata, lyrics, DJ controls, speed/BPM, record-label logo, trademark, QR code, navigation, settings, share/export, account, badges, fake metrics, AI icon, prompt box, chat, gallery, hearts, watermark, extra text, decorative pills, card grid, neon, excessive glow.
```

执行参数：

```text
referenced_image_paths: omitted
num_last_images_to_include: 1
```

入选 desktop 只提供风格与组件，不传递 phase 真值。

## 9. 生成幻觉台账

| 项目 | 概念现象 | 生产真值 |
| --- | --- | --- |
| 12 grooves | 圆盘线条接近但肉眼不可可靠计数 | 生产创建 exact 12 个 code-native ring 节点 |
| Groove labels | 图片把 1–12 分散写在圆盘与 range | range 是唯一位置源；圆盘刻度仅 `aria-hidden` |
| Tonearm | 图片是近似机械几何 | 生产只做 `cursorGroove` 的确定映射，不宣称真实唱臂物理 |
| Signal labels | 第 2 稿已显示四项 | 生产只能来自冻结 `SIGNAL_LABELS` |
| Signal meter | 图中第 3 段点亮 | 生产必须同时有 `靠近` 文字，不靠颜色 |
| Slider | 图像不能证明原生 range | 生产必须是 `input[type=range] min=1 max=12 step=1` |
| Buttons | 图像不能证明 button/focus/disabled | 生产使用原生 button，真实量测至少 48×48 CSS px |
| Desktop copy | 生成中文可能有字形/标点偏差 | 生产从 public view/config 文本节点渲染，禁止 OCR |
| Mobile notes | 生成图有换行和潜在字形误差 | 三条 notes 从 sanitized config 严格按序创建 |
| Mobile viewport | 原图 `853×1844` | 生产真实测 `390×844` 与 `320×568` |
| Mobile height | complete 需要纵向滚动 | restart 必须可达；不为首屏硬缩正文 |
| Open sleeve | 图像像真实纸品 | 生产用 CSS border/fold/seam，不裁图、不贴纹理 |
| Center label | 图中为空白 | 生产保持无 logo、无品牌、无封面 |
| Audio absence | 图中没有播放器 | 不能证明 `audioSrc === null`；由 view/DOM/media 检查证明 |
| Privacy | seeking 图中看不到 note/final | 不能证明 DOM/ARIA/data/style 不存在，需 sentinel absence 测试 |
| State | 图看起来像 seeking/complete | phase 真值只来自 reducer/public view |
| Motion | 静态图无法证明旋转策略 | 生产按 phase/reduced-motion 浏览器检查 |
| Forced colors | 色稿不能代表系统色 | 必须真实 forced-colors 检查 |
| No CSS | 图依赖视觉材质 | 关闭 CSS 后仍按文本和原生控件通关 |
| No JS | 图不能证明降级 | no-JS 只显示诚实说明和公共标题，不能泄露或伪造通关 |

优先级：

```text
spec / reducer / public view
  > DOM presence + absence + media lifecycle
  > user-approved design system
  > ImageGen pixels
```

## 10. Code-native 重建

### 10.1 PNG 边界

两张 PNG：

- 只保留在 `docs/assets/`；
- 不被生产 HTML 引用；
- 不裁切成按钮、封套、唱片、纹理或背景；
- 不从图中 OCR 文案；
- 不从图中估算 groove、状态、target 或信号；
- 不携带运行时版权或加载依赖。

这是对 ImageGen “中央资产”默认建议的有意偏离：

- 冻结规格明确要求唱片、唱臂、封套、沟槽与纸张质感全部代码原生；
- 零第三方运行资产是 A 级静态闭包的一部分；
- 因此 ImageGen 只承担视觉概念，不生产运行资产。

### 10.2 唱片

建议 DOM：

```html
<div class="record" aria-hidden="true">
  <span class="groove" data-groove="1"></span>
  …
  <span class="groove" data-groove="12"></span>
  <span class="record-label"></span>
  <span class="spindle"></span>
</div>
```

每圈使用绝对定位的圆形 border，按整数序号计算 inset：

```text
outer radius = 48%
inner label radius = 18%
step = (48% - 18%) / 11
radius(n) = outer - (n - 1) × step
```

当前圈：

- 只由公开 `cursorGroove` 设置 `data-current`；
- 使用 2px brass border + forced-colors outline；
- 不改变逻辑；
- 不让 ring 本身可点击，避免产生第二位置源。

### 10.3 唱臂

CSS 唱臂由三个元素组成：

```text
pivot
arm
stylus head
```

确定映射：

```text
ratio = (cursorGroove - 1) / 11
angle = 24deg + ratio × 28deg
```

数值是未来实现基线，可在浏览器测量时只做视觉校正；但映射必须：

- 单调；
- 12 个离散位置；
- 不读 pointer 坐标；
- 不承担输入；
- 不模拟抓盘或刮碟。

### 10.4 控件

唯一位置控件：

```html
<input
  type="range"
  min="1"
  max="12"
  step="1"
>
```

同步：

```text
aria-valuetext = 第 N 圈，共 12 圈
```

两个替代按钮：

```text
向外一圈 → max(1, current - 1)
向内一圈 → min(12, current + 1)
```

边界按钮 disabled，但仍保持清晰标签。

### 10.5 信号

DOM：

```text
signal label
+ 4 个 aria-hidden segment
+ 权威 signal text
```

不能用：

- 音量；
- 静电声；
- 波形；
- 动画频率；
- 单一颜色。

建议非色彩形状：

| signal | 点亮段数 | 轮廓 |
| --- | ---: | --- |
| 寂静 | 1 | 短横 |
| 微响 | 2 | 双横 |
| 靠近 | 3 | 三横 |
| 清晰 | 4 | 完整框 |

文字始终存在。

### 10.6 封套

封套只用：

- 语义 section/article；
- border；
- `::before` / `::after` 折线；
- 轻量 CSS gradient；
- 系统字体；
- 真实文本节点。

不使用：

- 生成 PNG；
- 扫描纸纹；
- 专辑封面；
- 品牌 label；
- 随机贴纸；
- 第三方 icon。

## 11. 动效

### 11.1 默认

```text
tonearm move: <= 180ms
hit settle visual: 420ms token timer
sleeve open: <= 420ms
```

- seeking 唱片静止；
- playing 可慢转，但不做速度控制；
- track-result 停止持续吸引注意；
- complete 封套打开后静止；
- 动画事件不推进 reducer。

### 11.2 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  animation: none;
  transition-duration: 0.001ms;
}
```

规则侧：

- 不等待 420ms timer；
- `queueMicrotask` 派发同 token 的 `reduced-motion` 结算；
- 结果与 timer 路线深相等；
- 不旋转唱片；
- 不补间唱臂；
- 封套立即打开。

## 12. 音频不是播放器

默认：

```text
audioSrc = null
audio files = 0
audio controls = 0
```

未来有自备音频时：

- 静态 HTML 只有一个 `<audio preload="none">`；
- 无 `src`、`autoplay`、`loop`、`controls`；
- 只在命中落针 click 的同一 task 内尝试 `play()`；
- 播放成功或失败不进入 reducer；
- 不等待 `ended`；
- 不自动重试；
- 不在 NEXT 偷播上一轨；
- stop/NEXT/hidden/pagehide/restart 都 pause、移除 src、load；
- generation 与 pendingToken 同时防陈旧回调。

允许的音频 UI 只有：

```text
这一轨没有附声音，文字已经展开。
停止声音
这段声音没有播放，文字已经为你留下。
```

禁止：

- play/pause 双态播放器；
- timeline；
- progress；
- volume；
- playlist；
- metadata；
- cover；
- lyrics；
- waveform；
- equalizer；
- playback rate；
- repeat。

## 13. 键盘、触控与焦点

### 13.1 输入

| 输入 | 行为 |
| --- | --- |
| Pointer/touch/pen drag | 原生 range 改圈 |
| Arrow keys | 原生逐圈 |
| Home / End | 原生到外圈 / 内圈 |
| 向外一圈 | 按钮等价入口 |
| 向内一圈 | 按钮等价入口 |
| Enter / Space | 原生按钮 |

不写自定义 drag、pointer capture 或 Canvas hit testing。

### 13.2 目标尺寸

所有按钮和 range thumb 的可操作目标：

```text
>= 48 × 48 CSS px
```

图像看起来足够大不算证据，必须浏览器量测 bounding rect。

### 13.3 焦点

```text
START → range
SETTLE → 当前轨结果标题
NEXT → range
complete → final title
RESTART → intro title
```

- 不使用正 `tabindex`；
- 程序化标题使用临时 `tabindex="-1"`；
- 移除旧 phase 前先准备新焦点目标；
- `:focus-visible` 至少 2px，不能被 overflow 裁切；
- selected/disabled/focus 是不同状态。

### 13.4 Live region

只播报：

- started；
- miss；
- hit；
- settled；
- completed；
- 音频软失败。

MOVE 不播报，range 自己通过 value text 表达位置。

## 14. 响应式

### 14.1 Desktop 1504 / 1440 / 1280

- 最大内容宽约 `1440px`；
- 唱片为主视觉，约占 48–56vw；
- clue/signal rail 不低于 `280px`；
- 控件在唱片下方，range 不被过度拉长；
- 低高度时允许页面纵向滚动，不能裁底部动作。

### 14.2 Tablet 768×1024

- 三段改成两列；
- 唱片和 current inner note 分列或上下错位；
- controls 横跨内容宽；
- 不缩小按钮；
- clue 不压进唱片。

### 14.3 Mobile 390×844

- 全部纵向；
- 唱片 `clamp(240px, 78vw, 320px)`；
- tonearm 保持视觉但不侵入文字；
- clue/signal/control 依次排列；
- complete 可以纵向滚动；
- restart 在文档末尾可达。

### 14.4 Mobile 320×568

- 唱片降到约 `220px`；
- range 与逐圈按钮不并排硬塞；
- 逐圈按钮纵向或 2 列，各自仍 >=48px；
- serif 标题用 `clamp()`，不缩正文到不可读；
- complete 不要求一屏放完；
- 无页面级横向滚动。

### 14.5 Low-height landscape

检查：

```text
844×390
568×320
```

- 允许两列；
- 不固定 viewport 高；
- 不把 range 或 drop 固定在屏幕外；
- safe-area 和浏览器 chrome 不遮挡动作。

### 14.6 200% 文本

- clue/note/final 可自然增高；
- 唱片先缩小；
- controls 换行；
- 不截断文案；
- 不用固定高度纸面。

### 14.7 400% zoom

按约 `320 CSS px` 验证：

- 单列；
- 无横向滚动；
- range、step buttons、drop/restart 均可达；
- 三条 notes 不重叠；
- 信号文字不被仪表代替。

## 15. 系统与故障降级

### 15.1 Forced colors

- 背景使用 `Canvas` 系统色；
- 文本使用 `CanvasText`；
- button 使用 `ButtonFace / ButtonText`；
- focus 使用 `Highlight`；
- current groove 用真实 border/outline；
- signal 通过段数、边框和文字表达；
- 不依赖 box-shadow 或渐变。

这里的 `Canvas` 是 CSS 系统颜色名，不是 HTML Canvas API。

### 15.2 无 Canvas

生产根本不创建 `<canvas>`，因此：

```text
Canvas API support = 非依赖
Canvas context failure = 不适用
```

唱片、沟槽、唱臂、仪表和封套均为 HTML/CSS。

### 15.3 关闭 CSS

仍应看到：

- 标题；
- 当前阶段允许的文字；
- 原生 range；
- 原生 buttons；
- status；
- audio 软失败文字；
- 完整三轨与 restart。

规则和隐私不依赖 CSS。

### 15.4 禁用 JavaScript

状态机无法运行，因此不伪造“可通关”：

- 只保留公共标题；
- 用 `<noscript>` 诚实提示需要启用 JavaScript 才能开始；
- 不静态写入 clue/note/final/config；
- 不创建带 src 的 audio；
- 不联网；
- 不显示假 range 或假完成态。

该降级是安全且诚实，不是完整玩法替代。

### 15.5 音频缺失或不支持

- 显示固定软失败；
- note 仍公开；
- token 仍结算；
- NEXT/complete 不阻塞；
- 媒体 src 清理；
- 不产生失败结局。

## 16. 默认 copy lock

### Intro

```text
把秘密藏进这一圈
读一条线索，在十二圈沟槽间移动唱针；信号清晰时，再亲手把唱针落下。
开始寻声
```

### Seeking

```text
第 N / 3 轨
<current clue>
第 N 圈，共 12 圈
寂静 / 微响 / 靠近 / 清晰
向外一圈
向内一圈
落下唱针
```

Miss：

```text
还不是这一圈，再听听附近的信号。
```

Hit：

```text
找到了，这一轨已经为你展开。
```

### Track result

```text
<current note>
继续听下一面
```

### Complete

```text
给你
SIDE US · PRIVATE PRESSING
这一张，想一直和你听下去
<note 1>
<note 2>
<note 3>
谢谢你把三段声音都找到。没有播放出来的部分，也已经被我们一起走过的日子填满。
留给愿意把针落在这里的你
重新开始
```

不从生成图补充任何可见文案。

## 17. 隐私验收 Oracle

使用包含唯一 sentinel 的合法配置：

```text
recipientName = 收件人哨兵
track 1 clue = 第一线索哨兵
track 1 note = 第一正文哨兵
track 1 audio = ./assets/private-audio/one.mp3
…
finalMessage = 终章正文哨兵
```

逐 phase 扫描：

```text
document.documentElement.outerHTML
document.body.textContent
all attributes
aria-*
data-*
style
audio.getAttribute("src")
audio.src
audio.currentSrc
```

断言：

| Phase | 必须出现 | 必须不存在 |
| --- | --- | --- |
| intro | 公共标题/说明/start | 所有 config sentinel |
| seeking 1 | clue 1 | note/audio 1；clue/note/audio 2–3；final |
| playing 1 | clue/note/audio 1（仅有配置时） | 2–3；final；target |
| track-result 1 | clue/note 1 | audio 1；2–3；final |
| seeking 2 | clue 2 | note 1；clue/note/audio 3；final |
| complete | recipient/final/all notes | all target；all audio path |
| restart intro | 公共 intro | 所有 config sentinel |

presence 与 absence 必须同时通过。

## 18. 媒体、音乐与视觉权利

### 18.1 默认交付

- 音频文件：0；
- 封面图片：0；
- 字体文件：0；
- 扫描纹理：0；
- 第三方图标：0；
- 运行时 ImageGen 资产：0。

### 18.2 用户自备音频

准备者必须分别确认：

- 底层词曲权；
- 具体录音与表演权；
- 录音中其他参与者同意；
- 把作品目录交给接收者的分发范围。

购买或下载音频不自动授予复制和分发权；自己翻唱也不自动解决底层词曲权。

### 18.3 黑胶与商标

- “唱片、沟槽、唱针、唱臂、封套”只借鉴通用物理语义；
- 不模拟或复制特定厂牌、唱机型号、标签、专辑排版或 logo；
- 中心 label 保持无品牌；
- `SIDE US · PRIVATE PRESSING` 是本项目原创默认眉题，不表示真实厂牌；
- 不使用著名唱片配色、商标式图形或专辑封面拼贴。

### 18.4 ImageGen

- 概念图由内建 ImageGen 为本提案生成；
- 仅进入 docs；
- 不进入运行时；
- 生产代码、文案、CSS 图形与状态不能从像素复制。

## 19. 开源与借鉴声明

现有研究、核心和本次视觉提案：

- 没有查看、选择、下载、vendoring 或复制第三方开源仓库；
- 没有复制第三方代码、CSS、界面、文案、封面、纹理或音频；
- 只用一手资料确认黑胶通用物理语义、HTML 媒体行为、slider/WCAG
  边界与版权分类；
- 这些标准与史料不是运行依赖。

现有 `ATTRIBUTION.md` 已记录：

- Library of Congress；
- WHATWG HTML；
- W3C WAI-ARIA APG；
- U.S. Copyright Office；
- 本仓库原创核心与默认文案；
- 默认无音频；
- 当前无第三方开源参考。

若生产阶段改变这一事实，写代码前必须补：

```text
仓库 URL
精确 commit 或 tag
许可证与权利主体
实际借鉴内容
明确未借鉴内容
修改与归档位置
```

不能只写“灵感来自”，也不能用浮动 `main` 代替固定版本。

## 20. 已有 bug / learn 对设计的约束

### Bug：连续点音频文件名

`bugs/vinyl-secret-audio-path-dotdot.md` 已记录：

- 旧正则曾接受 `a..b.mp3`；
- 已用独立 `audioSrc.includes("..")` 拒绝；
- 设计不能暗示任意本地路径或文件选择；
- 生产 UI 不展示可编辑路径输入框。

### Learn：生成式概念不是状态 Oracle

- 概念只冻结视觉世界；
- phase、字段、基数、顺序由 reducer/view model；
- 不 OCR；
- 原图和浏览器截图必须成对审查。

### Learn：逐步公开必须验证“不存在”

- 不用锁、槽位、模糊或 placeholder；
- public view 与 DOM 都不能提前拥有未来秘密；
- 每 phase 同时验证 presence 与 absence。

### Learn：阶段拥有 DOM

- 阶段切换销毁旧节点；
- 焦点迁移是 phase 合同；
- hidden CSS 不是隐私。

### Learn：音频资源所有权

- 媒体不进入 reducer；
- hidden/pagehide 是独立清理路径；
- src 与陈旧回调要显式失效。

## 21. 浏览器验证计划

本阶段没有生产 UI，因此不伪造浏览器通过。

用户确认并完成实现后必须使用 Browser/Chrome 做：

### 21.1 默认静音路径

```text
intro
→ start
→ groove 1 miss
→ groove 3 hit
→ settle
→ next
→ groove 7 hit
→ settle
→ next
→ groove 11 hit
→ complete
→ restart
```

### 21.2 输入路径

- pointer drag；
- touch drag；
- Arrow；
- Home/End；
- outward/inward buttons；
- Enter/Space。

### 21.3 Viewports

```text
1504×1000
1440×900
1280×720
768×1024
390×844
320×568
844×390
568×320
200% text
400% zoom
```

### 21.4 系统模式

- reduced motion；
- forced colors；
- CSS blocked；
- favicon missing；
- audio missing；
- play resolve/reject/sync throw/error/ended；
- hidden；
- pagehide；
- restart with stale timer/promise。

### 21.5 Measurements

```text
innerWidth === document.documentElement.scrollWidth
all interactive rects >= 48 × 48 CSS px
range min=1 max=12 step=1
exact 12 groove markers
exact 4 signal segments
exact 3 notes in complete
0 future notes before ownership phase
0 audio src before hit
0 target values in DOM
no unexpected external network
no unexplained console error
```

### 21.6 A 级

- Chrome 真实 `file://`；
- Safari 真实 `file://`；
- 默认无音频完整通关；
- 相对经典脚本；
- 零服务器；
- 零远程资源；
- 目录独立复制后仍可运行。

localhost 自动化不能冒充 file 证据。

## 22. Fidelity ledger 模板

实现后逐项填写：

| 项目 | 概念证据 | 浏览器证据 | 处理 |
| --- | --- | --- | --- |
| Copy | 两张入选图 | DOM + screenshot | 待实现 |
| Layout | desktop 工作台 / mobile 封套 | 对应 viewport | 待实现 |
| Typography | serif emotion / sans chrome | computed style | 待实现 |
| Palette | 固定 8 token | computed CSS + screenshot | 待实现 |
| Vinyl | 12 圈与 tonearm | DOM count + screenshot | 待实现 |
| Controls | range/step/drop/restart | semantic query + rect | 待实现 |
| Privacy | seeking/complete 对照 | sentinel absence | 待实现 |
| Responsive | 1537/853 概念 | 真实 8 viewports | 待实现 |
| Motion | 概念静态 | CSS/reduced motion | 待实现 |
| Audio | 概念默认无播放器 | media lifecycle | 待实现 |
| System modes | 概念不证明 | forced colors/no CSS/no JS | 待实现 |

最终必须同时 `view_image`：

1. 用户接受的概念；
2. 最新浏览器截图。

功能测试不能替代 fidelity QA。

## 23. 用户确认项

进入生产前请明确确认：

1. 是否接受“私人压片工作台”作为唯一视觉方向？
2. 是否接受深茶褐/墨黑 + 纸白 + 暗红 + brass 色系？
3. 是否接受桌面以大唱片/唱臂为中心、clue/signal 为窄 rail？
4. 是否接受 mobile complete 的打开封套结构？
5. 是否确认它是准备者异步配置、接收者单人体验，而非双人同时操作？
6. 是否确认默认完全无音频、无播放器，文字路线就是完整主路线？
7. 是否接受 seeking 前不预留 note/final/cover 槽位？
8. 是否接受所有视觉运行时 code-native，概念 PNG 只留 docs？
9. 是否接受无持续旋转、无波形、无 DJ/播放列表/上传？
10. 是否接受 320/400% 时先缩唱片、允许文档滚动，不缩小文字与按钮？
11. 是否接受 forced-colors/no CSS/no JS 的诚实降级边界？
12. 是否接受当前无第三方开源借鉴，未来新增必须先固定版本和许可？
13. 是否接受最终验收继续使用保留编号 `321`？

任一项改变：

- 先改本提案；
- 涉及规则、phase、隐私、audio 或控件时退回 spec；
- 用户重新确认；
- 再开始生产。

## 24. 用户确认后的 Gate

只有用户确认后才能：

1. 创建生产 `index.html/styles.css/app.js/README/favicon`；
2. 扩写 production `ATTRIBUTION.md`；
3. 用 code-native HTML/CSS 重建两张图；
4. 实现媒体生命周期；
5. 跑专项、仓库与浏览器验收；
6. 做 concept/browser 原图 fidelity 对比；
7. 写保留编号 `321` 的最终验收文档；
8. 由总控决定共享接入与 installed。

确认前继续保持：

```text
design proposal only
production UI absent
catalog untouched
installed false
321 reserved
```

## 25. 本阶段完成检查

- [x] 完整读取 267–270；
- [x] 完整读取 core/config/tests/ATTRIBUTION/package 边界；
- [x] 读取相关 bug 与可复用 learn；
- [x] 读取 frontend-app-builder 与 imagegen 技能及所需参考；
- [x] 核心测试 37/37；
- [x] 生成 desktop seeking；
- [x] 淘汰错误 desktop 第 1 稿；
- [x] 生成 mobile complete；
- [x] 原尺寸检查所有候选与入选副本；
- [x] 记录 source、尺寸、SHA-256、prompt、淘汰原因；
- [x] 记录生成幻觉与 code-native 重建；
- [x] 记录默认无音频、商标、音乐权与开源零复制；
- [x] 冻结 privacy presence/absence；
- [x] 冻结 keyboard/touch/focus；
- [x] 冻结 320/390/横屏/200%/400%；
- [x] 冻结 reduced-motion/forced-colors/no Canvas/no CSS/no JS；
- [x] 未写生产 HTML/CSS/JS；
- [x] 未修改共享索引；
- [x] 未标 installed；
- [x] 保留最终验收编号 321；
- [ ] 用户确认视觉提案；
- [ ] 生产实现与浏览器验收。
