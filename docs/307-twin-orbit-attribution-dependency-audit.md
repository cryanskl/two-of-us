# `twin-orbit` 借鉴、依赖、版权与名称审计

- 日期：2026-07-25
- 对应调研：[`305-twin-orbit-research.md`](./305-twin-orbit-research.md)
- 对应规格：[`306-twin-orbit-spec.md`](./306-twin-orbit-spec.md)
- 当前范围：brainstorm / spec；无生产代码、UI、资产或 catalog 条目

## 1. 审计结论

当前结论：

- **第三方运行依赖：0**
- **第三方开发依赖：0 个项目级新增**
- **第三方代码或资产：0**
- **外部开源项目直接借鉴：0**
- **内部机制边界参考：1 个**，即本仓库 `orbit-star-race`
- **内部去重对照：8 个以上**，不构成实现复用
- **外部标准文档：4 类**，只用于平台与无障碍边界
- **当前精确名称冲突证据：1 个 Apple 官方在架条目**
- **历史检索记录：1 个 Playgama 条目，当前已 hidden/redirect**

因此可以继续按 A 级、经典脚本、零运行依赖的方向设计。实施阶段不得把本结论
理解为预先授权复制内部项目代码，也不得把“尚未引入第三方内容”误写成永久的
版权或商标清白保证。

## 2. 四类来源必须分开

| 类型 | 本轮实例 | 实际用途 | 是否运行依赖 | 是否复制 |
| --- | --- | --- | --- | --- |
| 内部机制参考 | `orbit-star-race` | 对照“半径状态选择角速度”并主动做差异化 | 否 | 否 |
| 内部去重审计 | `capsule-docking`、`kaleidoscope-names` 等 | 证明分类和交互边界不重复 | 否 | 否 |
| 外部标准 | W3C / WHATWG / WAI | 校准键位、Pointer、可见性、动画帧与无障碍 | 否 | 否 |
| 当前名称冲突 | Apple iTunes Lookup API / App Store | 证明英文名不宜公开使用 | 否 | 否 |
| 历史检索记录 | Playgama 同名 URL | 记录首轮发现；当前已 hidden/redirect | 否 | 否 |

只有未来真正复制、修改、链接、vendoring、打包或分发的第三方代码/资产，才进入
文件级许可证、版权通知、NOTICE 和再分发义务审计。

## 3. 内部机制参考声明

### 3.1 实际借鉴

本方案从仓库内部
[`orbit-star-race`](../experiences/versus/orbit-star-race/README.md) 参考了一个
高层抽象：

> 玩家改变离散半径状态，从而选择不同角速度。

这个抽象已在
[`73-orbit-star-race-research.md`](./73-orbit-star-race-research.md) 中与轨道题材、
三轨速度和对抗规则一起出现。本项目只保留“状态选择速度”这一层，并改造成：

- 同向而不是反向；
- 两档 held/released 而不是三轨升降；
- 30Hz 整数 +2/+3 而不是连续弧度速度；
- 固定五关而不是 seed 星流；
- 双门同 tick 合作而不是共享目标竞争；
- 无比分、赢家、捕获 epsilon 或加赛。

### 3.2 明确不复制

实施阶段不得复制或轻改 `orbit-star-race` 的：

- `logic.js` / `app.js` / CSS / HTML / 测试；
- 常量、角速度表、轨道半径、120Hz 更新或 cooldown；
- seed、随机目标、preview、claim、比分和加赛结构；
- 卫星、星体、背景、精灵图、配色、版式或中文文案；
- NASA 表述、四个外部仓库的具体研究文字或许可证表；
- 文件布局之外的专有 API、DTO、函数名或错误语义。

若未来决定复用内部源文件中的实际代码，必须：

1. 先做 file-level diff；
2. 标出原文件和原 commit；
3. 重新判断其上游来源是否因实际复用变成直接来源；
4. 在项目 `ATTRIBUTION.md` 写清复用与修改范围；
5. 保留适用版权与许可证通知。

当前规格要求独立重写，不走这条路径。

## 4. 内部去重来源不是借鉴

本轮还读取：

- `capsule-docking`：用于排除“两个席位分工控制一个共享刚体”；
- `kaleidoscope-names`：用于排除“单人相位校准后揭晓”；
- `four-hands-harmony`：用于排除“直接按键同步窗”；
- `together-zipper`：用于排除“每窗每席提交一次事件”；
- `same-pace-star`：用于排除“轮流领拍的四阶段按住/松开”；
- `steady-together`：用于排除“共享平衡对象”；
- `moving-home-together`：用于排除“双端合成一个物体运动”；
- `tethered-heart`：用于排除“受约束双角色与共享载荷”。

这些项目的代码、规则、常量、UI、资产、文案和上游来源都没有进入
`twin-orbit`。审计它们是为了证明边界，不是对它们进行二次创作。

## 5. 外部开源项目审计

### 5.1 当前没有直接外部开源来源

本轮没有：

- 搜索、打开或下载外部 GitHub 轨道游戏源码；
- clone、vendor、npm install 或复制代码片段；
- 复制物理公式实现、碰撞算法、状态机、测试或关卡；
- 引用第三方图片、字体、图标、音频、纹理、截图或 UI；
- 使用带许可证的模板、Canvas demo、SVG 或 shader。

因此当前不存在可合理虚构的外部开源 commit、许可证、版权人或 NOTICE。正式
`ATTRIBUTION.md` 应明确写“没有直接外部开源实现来源”，而不是为了显得完整去
填入并未实际使用的项目。

### 5.2 `orbit-star-race` 的上游不自动传递

`orbit-star-race` 的调研曾比较 NASA 资料与四个开源项目：

- `markbrown/keplersballs`
- `gianlucatruda/orbital`
- `sciencemanx/Gravity-Wells`
- `XDream-Dev/battle-spaceship-game`

本轮没有直接打开或使用它们的实现，也不采用真实轨道公式、引力、三轨速度表、
3D/WebGL、同机飞船对战或相应素材。它们不是本项目的直接来源、依赖或再分发
内容。

如果后续实现直接采用 NASA 的物理关系或上述项目的具体表达，必须回到 research
固定一手来源和版本；不能仅复制 `orbit-star-race` 的二手摘要。

## 6. 标准文档及其状态

| 一手来源 | 2026-07-25 状态 | 本项目只用于 | 不复制 |
| --- | --- | --- | --- |
| [UI Events KeyboardEvent code Values](https://www.w3.org/TR/uievents-code/) | W3C Recommendation，2025-04-22 | `KeyF` / `KeyJ` 物理键位 | 规范正文、IDL、示例、表格 |
| [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/) | W3C Recommendation，2026-06-30 | pointerId、capture、cancel、lostcapture | 算法文字、IDL、测试、图表 |
| [WHATWG HTML：Page visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility) | Living Standard | visibilityState / visibilitychange | 规范算法、示例和站点表达 |
| [WHATWG HTML：Animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames) | Living Standard | RAF timestamp 与渲染/规则分层 | 示例代码与规范文字 |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) 与 WAI Understanding | W3C Recommendation，2024-12-12 再发布 | 键盘、焦点、状态、目标尺寸、降动效 | 正文、示例、图表、站点视觉 |

标准不是运行依赖、游戏代码、素材或视觉来源。项目不宣称通过 W3C 合规认证；
48px 触控目标、暂停策略和 live-region 节流是仓库自己的验收门槛。

### 6.1 版权、许可证与零复制

2026-07-25 复核确认：

- UI Events KeyboardEvent code Values 为 W3C Recommendation
  （2025-04-22），页面版权为 © 2025 W3C；
- Pointer Events Level 3 为 W3C Recommendation（2026-06-30），页面版权为
  © 2026 W3C；
- WCAG 2.2 为 W3C Recommendation（2024-12-12），页面版权为
  © 2020–2024 W3C；
- W3C 技术报告各自链接其适用的
  [Software and Document License](https://www.w3.org/copyright/software-license/)
  或 [Document License](https://www.w3.org/copyright/document-license/)；
- WHATWG HTML Living Standard 的出版物版权归 WHATWG 及其 Steering Group
  成员，并按
  [WHATWG IPR Policy](https://whatwg.org/ipr-policy) 的 CC BY 4.0 条款发布。

本项目只保留来源链接、状态、用途和独立实现边界，没有复制或改写规范正文、
Web IDL、示例代码、表格、图表、测试或站点视觉，也不再分发标准正文。因此项目
目录不打包标准许可证正文；若未来复制任何标准内容，必须按对应页面实际链接的
许可证重新履行署名、版权、状态和 notice 要求。

### 6.2 已纠正的来源状态

[W3C Page Visibility Level 2](https://www.w3.org/TR/page-visibility-2/) 已于
2022-06-23 成为 discontinued draft。当前设计使用 WHATWG HTML Living
Standard 作为现行来源。发现、根因和修复见
[`bugs/2026-07-25-twin-orbit-page-visibility-source-status.md`](../bugs/2026-07-25-twin-orbit-page-visibility-source-status.md)。

本次复核还发现 Pointer Events 通用 URL 已移动到 Level 4 Working Draft，不能
继续把它标为 Level 3 Recommendation。现已固定 Level 3 URL；详见
[`bugs/2026-07-25-twin-orbit-pointer-events-source-drift.md`](../bugs/2026-07-25-twin-orbit-pointer-events-source-drift.md)。

## 7. 运行与开发依赖审计

### 7.1 预期运行文件

```text
index.html
styles.css
config.js
logic.js
fixtures.js
app.js
README.md
ATTRIBUTION.md
```

运行只依赖浏览器内建：

- 原生 DOM/CSS；
- `requestAnimationFrame`；
- Keyboard Events；
- Pointer Events；
- Page Visibility；
- 原生 `Object.freeze`、整数算术和文本 API。

### 7.2 禁止依赖

```text
node_modules
npm runtime package
CDN
remote font/image/audio/video
ES module
fetch/XHR/WebSocket/EventSource/sendBeacon
Worker/ServiceWorker/WASM
WebGL/physics engine
shared repository JavaScript
localhost/server
storage/cookie/cache
permission API
```

### 7.3 开发工具

可以使用仓库已存在的 Node、测试 runner、静态验证和浏览器自动化，但：

- 它们不进入项目运行目录；
- 不新增项目级 package 依赖；
- 测试 fixture 是本项目原创数据；
- 视觉生成工具若使用，必须记录工具、日期、提示词、第三方输入和运行资产；
- 本机工具版本不写成用户运行前置条件。

### 7.4 静态 Gate

实施后至少扫描：

```bash
rg -n \
  'type=\"module\"|import\\(|https?://|fetch\\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|serviceWorker|Worker\\(|WebAssembly' \
  experiences/co-op/twin-orbit
```

允许 README/ATTRIBUTION 中出现来源 URL；生产 HTML/CSS/JS 命中必须逐项为 0。
静态正则只作快速筛查，最终仍以 HTML parser、运行 network log 和真实
`file://` 为准。

## 8. 名称、商标与商业外观

### 8.1 当前已确认的名称冲突

2026-07-25 现场复核 Apple 官方
[iTunes Lookup API](https://itunes.apple.com/lookup?id=6779551879&country=no)，
当前结果为：

```text
resultCount=1
trackId=6779551879
trackName=Twin Orbit
releaseDate=2026-06-23
version=2.1
currentVersionReleaseDate=2026-07-16
```

官方描述明确包含双火箭、双指控制、收集/躲避、连击和排行榜。对应
[App Store 页面](https://apps.apple.com/no/app/twin-orbit/id6779551879)。

这个单一、当前、官方、同类游戏条目已经足以支持产品决定：
**不把 “Twin Orbit” 用作公开作品名。**

### 8.2 Playgama 历史记录与当前状态

首轮检索曾从 Playgama 的同名 URL 读到 Low Gear Games 的点击反转双球、躲避
陨石生存游戏描述。2026-07-25 现场复核
[该 URL](https://playgama.com/game/twin-orbit) 时，服务器当前返回：

```text
HTTP 301
location: /category/space
x-bff-redirect-mechanism: category_fallback
x-bff-redirect-reason: game_hidden
```

因此它只作为首轮检索发现过的历史记录，用于提醒不要复刻“反转双球 + 陨石
生存”的组合表达；它**不是**当前可访问、当前在架、商标存续或权利状态证据。
来源状态问题见
[`bugs/2026-07-25-twin-orbit-playgama-source-status.md`](../bugs/2026-07-25-twin-orbit-playgama-source-status.md)。

### 8.3 冻结名称策略

- `twin-orbit`：仅作仓库内部 ID、分支和当前文档定位；
- `这一圈，和你同时到`：公开页面、门户卡片、README 和截图标题；
- 不在 logo、favicon、元数据、分享文案或图像中出现 “Twin Orbit”；
- 不采用 Apple 当前条目的“双火箭、双指、收集/躲避、连击、排行榜”组合；
- 不复刻 Playgama 首轮历史记录中的“反转双球、陨石生存”组合，但不把该记录
  写成当前在架证据。

### 8.4 证据上限

本轮没有完成：

- USPTO、WIPO、CNIPA 或其他司法辖区的完整近似商标检索；
- 商品/服务类别、在先使用、域名、公司名或不正当竞争分析；
- 中文标题“这一圈，和你同时到”的法律清查；
- 律师意见。

因此只能说“Apple 官方当前有一个同类英文精确名称条目，我们主动避开；另有
一条现已 hidden/redirect 的历史检索记录”，不能说“有两个当前在架游戏”，也
不能说“中文标题已获商标清白”。若公开发行、商业化或上架，必须重新检索并按
司法辖区评估。

## 9. 版权、内容与素材边界

### 9.1 原创范围

计划独立创作：

- 五关目标角、开门 tick、目标半径和金路径 fixture；
- +2/+3 整数规则、双事件裁决、状态机和公开 DTO；
- HTML、CSS、JavaScript、测试和默认配置；
- 中文标题、规则、阶段、反馈和完成文案；
- 原生 CSS/DOM/SVG 轨道视觉；
- 如有生成资产，则使用无第三方输入的原创提示词。

### 9.2 禁止复制

- Apple 当前条目与 Playgama 历史记录所对应作品的截图、图标、logo、文案、
  玩法组合或 UI；
- NASA、航天机构、商业火箭、任务徽章、国旗和真实仪表；
- `orbit-star-race` 的代码、素材、图片和具体视觉；
- 第三方天文摄影、星图、字体、音效、音乐、图标或纹理；
- 影视、动漫、游戏角色、品牌配色或可识别商业外观。

### 9.3 生成式资产

若后续视觉阶段使用 ImageGen：

- 第三方图片输入必须为无；
- 提示词不能要求模仿在世艺术家、具体游戏或品牌；
- 概念图和运行资产分开记录；
- 运行资产必须无字、无 UI、无 logo、水印和可识别飞船；
- 页面规则、目标、星体位置、按钮和文字保持 code-native；
- 记录生成日期、用途、提示词摘要、文件和无图回退；
- 视觉相似性人工检查不能由“AI 生成”自动跳过。

## 10. 正式 `ATTRIBUTION.md` 建议文本

后续生产目录可使用以下声明骨架：

> 本作的五关双门会合、+2/+3 整数轨迹、同 tick 原子裁决、状态机、代码、测试、
> 中文文案与视觉由本仓库独立设计和编写。高层机制“半径状态选择不同角速度”
> 参考了本仓库内部 `orbit-star-race`，但没有复制、修改或打包其源码、常量、
> 三轨/反向/随机星流/比分规则、测试、界面、文案或素材。W3C、WHATWG 与 WAI
> 文档只用于校准键盘、Pointer、页面可见性、动画帧与可访问性边界，不是运行
> 依赖或代码来源。本项目没有参考或引入任何外部开源轨道游戏、物理引擎、代码、
> 素材、字体、音频或图标。

另附：

> `twin-orbit` 只作仓库内部 ID；公开标题为“这一圈，和你同时到”。本作不隶属、
> 不模仿也不使用现有 “Twin Orbit” 游戏的名称呈现、视觉、角色、素材或文案。

这个文本必须在实现结束时按实际行为复核，不能原样复制后忽略后来新增来源。

## 11. 变更触发器

出现以下任一情况必须暂停实现、回到本审计：

- 打开或采用任何外部开源轨道/节奏/物理项目；
- 复制内部项目的函数、测试、常量、CSS、素材或 DTO；
- 新增 npm 包、共享 JS、远程资源、服务器、模块或构建；
- 使用天文照片、字体、音频、图标、纹理或真实航天元素；
- 公开英文名、上架、商业化、申请域名或制作 logo；
- 生成视觉接近现有 “Twin Orbit” 游戏或其他商业作品；
- 标准状态、项目范围或 A 级启动合同发生变化。

触发后必须记录：来源 URL、固定版本、许可证、版权人、实际借鉴、未复制范围、
分发义务和对应文件；在审计更新提交之前不能继续引入。
