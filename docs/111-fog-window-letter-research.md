# A 级“在雾上，写给你”定向调研

- 日期：2026-07-19
- 创意来源：创意池 S03“雾窗手写”
- 目标等级：A，经典脚本、相对路径、`file://` 直开
- 工作 ID：`fog-window-letter`
- 冻结标题：`在雾上，写给你`
- 结论：进入规格；采用“先在雾面自由写画，再沿自己的原笔迹擦亮窗景，最后揭晓一封本地信”的原创单人惊喜

## 1. 先解决与刮刮卡重复的问题

仓库已有“爱的刮刮卡”：接收者擦掉固定涂层，达到约 55% 面积便完整揭晓。若 S03 也只把灰白遮罩擦成透明，无论换成玻璃、水滴还是模糊背景，本质仍是同一面积 Gate，不能形成值得长期维护的新样板。

全网可核验的雾窗实验主要验证两件事：触摸轨迹可以成为遮罩，以及清晰/模糊两层可通过 alpha mask 切换。它们没有替本仓库回答“接收者为什么要写”“写下的内容如何成为规则”“怎样避免按面积刮开”的产品问题。

因此 S03 的独立命题是：

> 不是把别人准备好的涂层刮掉，而是先留下自己的笔迹，再亲手沿着它把窗外的信点亮。

第一遍轨迹定义“要擦亮的路径”，第二遍轨迹证明接收者重新走过自己的字或符号。完成度来自原笔迹锚点命中，不来自整窗透明像素比例。

## 2. Brainstorm：四种产品方案

| 方案 | 核心体验 | 结论 |
| --- | --- | --- |
| 全窗面积擦除 | 擦掉雾层，超过阈值揭晓照片或信 | 拒绝；与“爱的刮刮卡”只有材质差异 |
| 自由写画后立即揭晓 | 在雾上写任意内容，松手后信出现 | 可行但不采用；动作没有完成目标，点一下也可能结束 |
| 临摹预设爱心或字母 | 沿准备者给的轮廓描一遍，达到相似度揭晓 | 暂缓；需要形状识别或模板容差，也削弱接收者自己的表达 |
| 写下，再重走自己的笔迹 | 第一遍自由画；第二遍只需命中自己留下的锚点 | 采用；轨迹既是私人表达也是规则，确定性、离线和可访问降级都可控 |

首版不是手写识别器，也不判断画得“像不像”。它只验证接收者是否留下了具有一定长度和展开范围的笔迹，并在第二阶段重新经过足够多的原笔迹锚点。

## 3. 冻结的体验边界

### 3.1 核心流程

1. `intro`：看见完整雾窗、简短说明和“开始写”按钮，信件正文尚不进入可访问树；
2. `writing`：用单指、鼠标或笔在雾面自由写 1–8 笔，可清空重写；
3. `ready`：笔迹达到长度、展开范围和点数 Gate 后，“写好了”可用；
4. `tracing`：原笔迹变成细微露珠引导，接收者沿它再走一遍；命中的锚点逐段擦亮窗外；
5. `complete`：达到冻结命中比例后整窗雾气淡去，信件、落款和“再写一次”出现；
6. 等价入口：“不方便手写，直接打开”从 intro/writing/tracing 都能进入同一 complete，不降低内容完整性。

### 3.2 明确不做

- 不识别汉字、字母、爱心、签名或身份；
- 不评分笔迹美丑、速度、压力、相似度或完成时间；
- 不上传、不导出、不复制到剪贴板、不保存 Canvas、轨迹或完成进度；
- 不读取照片、相机、麦克风、陀螺仪、定位或设备身份；
- 不使用 WebGL、Three.js、第三方绘图库、CDN、远程字体或联网分析；
- 不把私人正文预绘进位图；正文始终来自本地配置并作为安全文本节点显示；
- 不加入成就、分数、排行榜、失败次数、广告式分享或社交上传。

## 4. 为什么采用“原笔迹锚点”，不做像素面积或形状识别

### 4.1 面积 Gate 的问题

像素透明比例适合刮刮卡，因为玩法目标就是移除覆盖层；它不适合雾窗手写：

- 粗笔刷随设备尺寸和 DPR 改变，会让相同字迹得到不同面积；
- 用户涂满一角比认真写一个符号更容易达标；
- 完成判定无法解释“为什么要再沿自己的字走一遍”；
- `getImageData()` 高频采样增加主线程成本，也让规则依赖渲染像素。

### 4.2 形状识别的问题

首版没有“正确答案”。引入模板匹配、机器学习或手写识别，会产生容差、语言、残障输入、误判和隐私问题，也会把轻 HTML 变成模型或大库项目。

### 4.3 锚点模型

第一遍保存归一化整数点；相邻点距离达到冻结阈值才接纳。每条被接纳的点自然成为第二遍的候选锚点，过近点可按固定步长抽稀。第二遍每个点只需命中半径内尚未点亮的锚点：

```text
第一遍 Pointer 点
  → 映射到 0..1000 × 0..620 整数窗格
  → 最小间距去重、单笔/总量上限
  → 长度 + bounding box + 点数 Gate
  → 冻结 trace anchors

第二遍 Pointer 点
  → 同一整数窗格
  → 标记半径内未命中的 anchor
  → unique hit / total anchors
  → 达到冻结比例后 complete
```

规则层不读取 Canvas alpha、DPR、CSS 像素、真实时钟或图片内容。Canvas 只把公开状态投影成雾、笔迹、露珠和清晰路径。

## 5. 建议的确定性状态

规格阶段需要冻结具体阈值，但权威状态建议只包含：

```text
phase                    // intro / writing / ready / tracing / complete
strokes[]                // 每笔为归一化整数点数组
activeStrokeId
activePointerId
acceptedPointCount
drawLength
bounds
anchors[]                // 冻结的第一遍锚点
hitAnchorIds[]
traceStrokeCount
completionReason         // traced / direct
announcementSerial
```

长度使用纯整数近似距离，例如 `max(dx,dy) + floor(min(dx,dy)/2)`；它比 Manhattan 更接近斜线长度，又不把浮点误差、平方根或 Canvas 像素带入权威状态。

必须设定硬上限：最多 8 笔、每笔最多 160 个接纳点、总点数最多 480；达到上限后结束当前笔并给出中性提示，不继续增长内存。

## 6. 输入、尺寸变化与生命周期

- 只允许一个 active pointer；第二根手指不能接管、拼接或结束当前笔，也不能导致页面缩放。
- `pointerdown` 建立包含单调 generation 的会话；`pointermove` 只接收相同 pointerId 与 generation。
- 支持 `getCoalescedEvents()` 时按事件顺序消费，但它只是输入质量增强；不支持时主事件仍能完整游玩。
- `pointerup` 完成当前笔；`pointercancel`、`lostpointercapture`、窗口失焦与页面隐藏只安全结束当前笔，不凭空添加终点。
- Canvas 使用 DPR 缩放，但 Pointer 先按 CSS rect 映射到统一整数窗格。resize/orientationchange 后从状态重绘，不能恢复雾层、丢失笔迹或改变命中比例。
- `touch-action:none` 只作用于雾窗交互面；按钮与页面仍保留正常滚动和缩放语义。
- Escape 在 writing/ready/tracing 打开中性暂停纸签并结束 active pointer；恢复不伪造新笔迹。
- 页面隐藏时不运行持续动画；作品没有计时 Gate，因此恢复后无需补算任何时间。

## 7. 无障碍与秘密内容边界

- Canvas 是视觉投影，不作为唯一操作入口；“直接打开”提供完整等价结果。
- 雾窗有清晰可访问名称、阶段说明和非颜色进度文本，例如“已经重新走过 18 / 24 个露珠点”。
- ready 只在笔迹 Gate 达成后启用，但旁边说明缺少的是长度、横向展开还是纵向展开；不评价内容或美观。
- complete 前不创建信件正文 DOM；`hidden`、透明度或屏外定位都不能作为秘密隔离。
- complete 后创建正文、落款和重开入口，并把焦点移到完成标题；live region 只报告阶段变化，不随每个 Pointer 点刷屏。
- forced colors 下雾、清晰区域、原笔迹、命中锚点和焦点分别使用系统色、虚实线与文字区分。
- reduced motion 下关闭雾气漂移、水滴滑落和整窗淡出；轨迹、命中和完成规则不变。
- 默认文案必须完整；本地 `config.js` 可替换称呼、引导、正文与落款，但不解释 HTML。

## 8. 准备者可参与的 5–10 行业务策略

后续 `config.js` 预留 `composeFogWindowLetter(view)`：准备者可以根据 `strokeCount`、`drawingShape`（wide / tall / balanced）和 `completionReason` 组合一段只属于两人的完成句。函数获得冻结、只读的安全摘要，不接触原始笔迹点；返回空值、抛错、修改上下文或返回超长内容时安全回退到完整默认句。

这不是要求才能运行的 TODO。默认实现会完整返回：

> 你刚才写下的每一笔，都让窗外更亮了一点。想说的话没有被风吹走，它一直在这里等你。

让准备者只看“几笔、横/竖/均衡、直接或手写完成”而不读取原始轨迹，是表达自由与最小数据暴露之间的边界。

## 9. 固定版本开源调研与零复制边界

核验日期：2026-07-19。下列项目只用于研究通用机制和实现边界，均不进入运行依赖。

| 来源 | 固定版本、许可证与权利主体 | 仅研究 | 明确未复制或引入 |
| --- | --- | --- | --- |
| [Signature Pad](https://github.com/szimek/signature_pad/tree/b392d1d417a7a2fa21a7f659eb76fddcc2be3fdb) | tag `v5.1.3`，commit `b392d1d417a7a2fa21a7f659eb76fddcc2be3fdb`；MIT；Copyright 2018 Szymon Nowak | Canvas 手写、桌面/移动输入、DPR、resize 后重绘和点组边界 | 贝塞尔插值、速度滤波、类/API、事件、源码、demo、参数、导出与素材 |
| [perfect-freehand](https://github.com/steveruizok/perfect-freehand/tree/f56f097e0e211fffa1601b93883e4d9f9dccf122) | tag `v1.2.3`，commit `f56f097e0e211fffa1601b93883e4d9f9dccf122`；MIT；Copyright 2021 Stephen Ruiz Ltd | 输入点、压力和可渲染笔迹轮廓的技术边界 | `getStroke`、样条/轮廓算法、API、源码、options、示例、GIF 与默认参数 |
| [Fabric.js](https://github.com/fabricjs/fabric.js/tree/723838fcbb9feaa87c8840082640de2ed82383da) | commit `723838fcbb9feaa87c8840082640de2ed82383da`；MIT；Copyright 2008–2015 Printio、2016–present Fabric.js contributors | 完整 Canvas 对象、笔刷、导入导出能力的依赖上限 | 库、对象模型、brush、filters、序列化、控制器、demo、素材与构建产物 |
| [Paper.js](https://github.com/paperjs/paper.js/tree/c1d88390d2c86901db152827fe778c3e39cfb073) | tag `v0.12.18`，commit `c1d88390d2c86901db152827fe778c3e39cfb073`；MIT；Copyright 2011–2020 Jürg Lehni & Jonathan Puckey | 路径、向量图形与完整 scene graph 的依赖上限 | PaperScript、Path API、平滑/简化算法、源码、构建、示例与素材 |

这些库都能合法引入，但首版只需要单指点序列、整数 Gate 和 Canvas 投影。自行实现更容易维持 A 级直开、零 vendor、可审查规则和稳定 attribution；“不引入”不是许可证否定，而是依赖成本与玩法范围判断。

平台行为参考固定版本的 [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74)、[W3C UI Events code](https://github.com/w3c/uievents-code/tree/b201684d1de0af90bc403814bbdee6aa96647130)、[WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d)、[Page Visibility](https://github.com/w3c/page-visibility/tree/8ca533c744e655b8340b5713d1bd5ea97b202b13)、[W3C WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) 与 [CSSWG Drafts](https://github.com/w3c/csswg-drafts/tree/c7573530343759ace8e46438a1fa2c44515b5554)。只研究 pointerId/capture/coalesced events、物理键、Canvas、页面生命周期、等价入口、降动效和 forced colors；不复制规范文字、IDL、示例或站点视觉。

## 10. 明确排除与权利不清来源

| 来源 | 排除原因 |
| --- | --- |
| [sebnozzi/minimicro-foggywindow](https://github.com/sebnozzi/minimicro-foggywindow/tree/1821f892ec828c57ef28a95d4fd18190bc198d60) | 精确题材示例，但固定仓库没有许可证；不得复制 Mini Micro 源码、遮罩实现、图片、文案、参数或页面 |
| [negi141/pittura-demo](https://github.com/negi141/pittura-demo/tree/a9227e689eb1b1060f2f7b6b4a19b579b1e942d1) | 雾窗触摸实验，固定仓库没有许可证；相关 Qiita 文章只用于理解“清晰/模糊双层 + alpha mask”公开概念，不复制 Three.js 代码、图片、GIF、页面或文案 |
| 各类 CodePen / Gist 雾面示例 | 结果页常缺少独立代码与素材许可证，且可能引用远程纹理；不进入代码、素材或参数复用链 |
| 商业签名、手写便签与社交涂鸦产品 | 只说明自由书写是常见交互；不复制品牌、界面、图标、字体、笔刷、动画、提示语或分享流程 |

公开可访问不等于允许复制；项目代码许可证也不会自动覆盖 demo 图片、字体和用户内容。S03 的运行图片必须由本仓库自行生成或由准备者本地提供且确认权利。

## 11. 必须通过的可验证 Gate

1. **不是刮刮卡换皮**：完成只由原笔迹 unique anchor 命中比例决定；透明面积、整窗涂抹和背景像素不能推进规则。
2. **笔迹有效性**：点击、极短线、单轴窄线、空笔、重复同点和越界点不能进入 ready；合法宽/高/均衡笔迹都可进入。
3. **确定性**：相同整数点日志深相等；DPR、CSS 尺寸、resize 与 30/60/144Hz 渲染不改变规则摘要。
4. **命中唯一性**：同一 anchor 重复经过只计一次；半径闭边界、相邻锚点、跨笔与最后一个锚点语义冻结。
5. **资源上限**：8 笔、单笔 160 点、总计 480 点硬上限；恶意或高频 Pointer 流不会无限增长。
6. **输入生命周期**：第二指、旧 generation、pointercancel、lost capture、blur、hidden、Escape、resize 与迟到 pointerup 不拼接或释放新会话。
7. **阶段与秘密**：complete 前正文不在 DOM；直接打开与手写完成创建同一完整信件并正确聚焦。
8. **可访问等价**：不用 Pointer 也能直接打开；进度、缺失 Gate、完成和重开都有文字与键盘路径。
9. **响应式**：1280×800、390×844 与 320×700 无横向溢出；首屏看到雾窗、阶段说明和当前主动作。
10. **离线与隐私**：`file://` 无 module、网络、存储、导出、剪贴板、媒体、传感器或远程字体；刷新后不保留轨迹。
11. **降级**：生产背景缺失时仍有 CSS 窗景、雾面和完整信；Canvas 不可用时直接打开入口仍可完成。
12. **权利**：README 与 ATTRIBUTION 固定来源、许可证、未复制范围、排除项目和 ImageGen 输入声明。

## 12. Go / No-Go

**Go。** “在雾上，写给你”能补齐仓库尚未覆盖的“自由笔迹成为下一阶段规则”的惊喜样板，又保持 A 级直开、零存储和零第三方运行依赖。

进入规格前必须冻结：整数窗格、点接纳距离、有效笔迹 Gate、anchor 抽稀、命中半径与比例、阶段 action、资源上限、pointer generation、Canvas/DOM 分工、直接打开等价路径和 `composeFogWindowLetter(view)` 的安全摘要。

## 13. 借鉴声明摘要

“在雾上，写给你”的双遍同轨迹玩法、状态、整数 Gate、页面、文案、视觉和测试将由本仓库独立原创。调研只参考固定版本项目中 Canvas 手写、点序列、DPR/resize、完整绘图库边界与平台生命周期等公开技术思想。

本作不会复制或移植 Signature Pad、perfect-freehand、Fabric.js、Paper.js 及排除项目的源码、API、算法实现、参数、测试、示例、图片、GIF、字体、页面结构、文案或视觉；这些项目都不是运行依赖。未来若引入实质代码或素材，必须另立变更、保存许可证与权利声明，并重新执行离线、隐私和浏览器验收。
