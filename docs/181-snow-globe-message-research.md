# S11“雪球摇一摇”定向调研：雪停以后，是你

调研日期：2026-07-21

来源维护复核：[`233-snow-globe-message-source-refresh.md`](./233-snow-globe-message-source-refresh.md)

对应创意：`docs/40-idea-backlog.md` 的 S11“雪球摇一摇”

推荐目录：`experiences/surprises/snow-globe-message/`

推荐启动等级：A（直接双击 `index.html`，无安装、服务、权限或公网）

## 1. 结论

S11 可以做，而且不应被实现成另一张“左右摇九次”的拍立得，也不应成为一套不可重放的粒子物理沙盒。

推荐冻结为一个有限的单人惊喜：收礼者把雪球从中性位置分别带向上、右、下、左，任意顺序收齐四阵风；随后主动按下“让雪落下”。雪花只做一次短暂落定，组成准备者配置的 9×11 点阵图案，最后才出现昵称与整段私信。

作品名与完成后才出现的默认私密标题冻结为：

> 雪停以后，是你

页面在完成前只使用固定公开 H1：

> 等雪停下

两者必须分开：`雪停以后，是你` 是作品名和默认 `finalTitle`，只有 complete 阶段才能进入 DOM；公开 H1 不复用任何私密配置。

核心句：

> 把四阵风收进雪球里。等雪慢慢落下，会有一句话留在里面。

它的规则增量不是“摇得越快越好”，而是：

- 四方向是一个有限集合，顺序自由、每个只收一次；
- 拖动和四个原生方向按钮派发同一个 `ADD_WIND`；
- 四阵风齐后仍要一次明确确认，避免最后一次拖动误触发私密内容；
- settling 只负责表现，结果、点阵和私信早已由状态锁定；
- 私密 DOM 只在完成后创建，不提前藏在透明层、ARIA 或离屏文字 Canvas。

## 2. 与现有作品的边界

| 作品 | 已覆盖机制 | S11 必须保持的差异 |
| --- | --- | --- |
| `scratch-surprise` | Canvas 覆盖面积达到门槛后揭晓 | 不擦除、不计算覆盖率 |
| `fog-window-letter` | 第一遍自由书写，第二遍按原锚点描回 | 不画线、不保存或复走轨迹 |
| `instant-photo` | 左右交替九次，分层显影 | 不要求交替、不累计摇动次数、不逐层显影 |
| `hand-crank-music-box` | 顺时针转够八圈，逐音展开 | 不计算圈数、角度旅行或旋转方向 |
| `starlight-keepsake-search` | 自由移动并在隐藏目标上驻留 | 不搜索空间、不靠 dwell 命中秘密热点 |
| S12“心愿烟火” | 未来候选：蓄力、爆炸、逐字/逐像素形成 | S11 无蓄力、无爆炸，只在一次 settling 后整体落定 |

“雪花移动”本身只是主题。只有“四方向有限收集 → 主动落定 → 点阵成形 → 私信 Gate”同时成立，才算实现 S11。

## 3. 方案比较

### 3.1 方案 A：真的摇手机

优点是题面直观，缺点是不能作为 A 级基线：

- Device Orientation and Motion 是 powerful feature；现代规范要求安全上下文、明确权限和用户激活；
- `devicemotion` 依赖 accelerometer 与 gyroscope 权限，不同浏览器支持和授权流程不一致；
- `file://` 是否被具体浏览器、WebView 或系统视为可用安全上下文不能作为交付保证；
- 设备动作会引入传感器监听、隐私提示、误触与无障碍替代路径；
- 桌面电脑、固定支架、运动障碍用户本就无法完成真实摇晃。

**结论：首版完全排除。** 页面不注册 `devicemotion/deviceorientation`，不出现权限按钮，也不诱导用户摇手机。未来若做增强，只能默认关闭、有明确开关、拒绝后无损回退，并升级为另一个经过验证的交付等级。

### 3.2 方案 B：自由粒子物理沙盒

让每片雪拥有速度、碰撞、摩擦和真实堆积，视觉上丰富，但会让结果依赖帧率、采样率、浮点积分和设备性能；粒子是否恰好排成字也难以测试。它还会把主要工作量消耗在“像不像物理”，而不是惊喜节奏。

**结论：排除。** 权威逻辑不保存粒子位置、速度、重力或碰撞；风暴与落雪都是可取消的表现层。

### 3.3 方案 C：左右交替计数

把雪球来回拖八次即可触发，成本低，但它与 `instant-photo` 的九次左右交替显影只有题材差异。

**结论：排除。** 四方向只看集合是否齐全，不看左右交替、速度、总次数或连击。

### 3.4 方案 D：四阵风与主动落雪

用户可以拖动整只雪球经过四个方向，也可以逐个点击上/右/下/左按钮。每个方向只收一次；全部收齐后，独立按钮“让雪落下”才进入 settling。

**结论：采用。** 它有限、无失败、可重放、可点击替代拖动，也给“风暴”和“静止”留下清楚的情绪转折。

## 4. 首版产品范围

首版只做：

1. 一只可拖动的桌面雪球；
2. 上、右、下、左四阵风，任意顺序各收一次；
3. 四个原生方向按钮作为完整等价入口；
4. 一个主动“让雪落下”Gate；
5. 一次短 settling；
6. 一个可配置 9×11 点阵图案；
7. 完成后才创建的昵称、标题、私信与署名；
8. 重新开始、降动效、forced-colors、Canvas 失败降级与本地隐私说明。

首版明确不做：

- 设备动作/方向传感器与权限请求；
- 速度、力度、摇动次数、连击、分数、计时、失败或随机奖励；
- 真实雪花物理、碰撞、刚体、WebGL、Worker 或第三方运行依赖；
- 任意字体转粒子、运行时文字采样、自动生成中文点阵；
- 音频、振动、摄像头、麦克风、定位、剪贴板、下载或分享；
- 多图案选择、编辑器、历史、账号、存储或联网。

## 5. 四阵风输入模型

方向 ID 与公开顺序固定为：

```text
up → right → down → left
```

顺序只用于 DOM、测试与摘要；收集顺序由用户决定。

### 5.1 Pointer 拖动

浏览器层只保留当前 pointer 会话：`pointerId / generation / anchor / latest / latched`，不保留完整轨迹。

- 仅一个活动 pointer；第二指忽略；
- `pointerdown` 在雪球交互面建立 anchor 并调用 `setPointerCapture`；
- 位移以交互面短边归一化，不使用固定设备像素；
- 越过 outer 阈值时按主轴归类为一个方向；对角线平局必须由规格冻结固定优先级；
- 进入 outer 后先 latch，只有回到 inner 中性区才允许同一会话再收下一阵风；
- 同方向重复仍保持 latch，但 reducer 为同引用 no-op；
- `pointerup/pointercancel/lostpointercapture/window blur/pagehide` 都只清会话，不补方向、不丢已经收集的方向；
- `touch-action:none` 只覆盖雪球交互面，页面其他区域仍可滚动。

方向分类与 inner/outer hysteresis 必须是 `logic.js` 的纯 helper；app 只做坐标归一化和事件生命周期。浏览器 action log 只记录最终离散方向，不记录原始坐标或轨迹。

### 5.2 非拖动入口

四个持久原生 `<button type="button">` 分别派发同一个 `ADD_WIND { direction }`：

- 鼠标 click、单指 tap、Enter、Space、语音点击和开关设备都能完成；
- 已收集按钮保留在 DOM，可用 `aria-pressed=true` 与文字“已收好”表示状态；
- 重复激活不增加进度、不播放第二次 live；
- 每个目标至少 48×48px，不把 hover、双击、长按或压力当规则。

W3C WCAG 2.5.7 明确：拖动功能要有无需拖动的单指针替代，只有键盘入口并不足够。因此四个方向按钮不是可选增强，而是验收 Gate。

## 6. 点阵结果与配置边界

首版不把字体轮廓采样成粒子。默认图案直接使用 9 行 × 11 列的字符网格：

```text
.###...###.
#####.#####
###########
###########
.#########.
..#######..
...#####...
....###....
.....#.....
```

该默认心形精确含 63 个 `#`。每个 `#` 按 row-major 获得稳定 particle ID 与归一化 target；`.` 不产生目标。

推荐配置：

```js
window.SNOW_GLOBE_MESSAGE_CONFIG = {
  recipient: "你",
  sender: "我",
  patternRows: [/* 9 条、每条 11 个 . 或 # */],
  patternLabel: "一颗由雪花拼成的心",
  finalTitle: "雪停以后，是你",
  finalNote: "风停下来的时候，我还是最想把这句话留给你。"
};
```

规格阶段应冻结：

- 精确 9×11、仅 ASCII `.` / `#`；
- active cell 建议 `16..72`，既可辨认又限制粒子量；
- 称呼、标题、说明、私信与署名的 Unicode code point 范围和控制字符边界；
- 配置非法时整份回默认，不做字段混搭；
- pattern、目标点和文本均先快照、断开引用、递归冻结；
- 不用系统字体、`fillText/getImageData` 或字体加载结果生成规则数据。

这样准备者仍能手工改出首字母、月亮、星星或两人符号，而不同系统字体不会改变粒子数、目标和测试答案。

## 7. 权威状态与动作草案

推荐阶段：

```text
intro → gathering → armed → settling → complete
```

最小 state：

```js
{
  version,
  phase,
  content,
  winds,
  settleToken,
  revision
}
```

- `content`：清洗后的称呼、图案与最终文本快照；
- `winds`：按固定方向顺序保存的四个 boolean，不保存用户轨迹或收集时间；
- `settleToken`：仅 settling 非 null，防止旧动画完成新会话；
- `revision`：安全整数并为完整事务预留 headroom。

动作草案：

- `START { content }`：仅 intro 接受，进入 gathering；
- `ADD_WIND { direction }`：仅 gathering 接受；首次方向置 true，第四个方向使 phase=armed；重复方向同引用 no-op；
- `BEGIN_SETTLE`：仅 armed 接受，创建 token 并进入 settling；此时点阵结果锁定，但最终文本仍不进入 public view；
- `COMPLETE_SETTLE { settleToken }`：仅匹配当前 token 接受，进入 complete；动画结束、timeout、hidden、pagehide、blur 与 reduced-motion 全部捕获当前 token 并统一派该动作，不存在无 token 的生命周期旁路；
- `RESTART`：仅 complete 接受，回 intro 并保持 revision/token 单调；app 在同一次 click 内重新 START。

所有 action/state/config 使用 exact own-data schema；拒绝 extra key、symbol、accessor、custom prototype、稀疏数组与 hostile Proxy trap。合法 state 上非法动作返回原引用，非法 state 返回全新安全初态。

## 8. Public view 与泄密 Gate

页面必须只消费 public view。建议字段：

```js
{
  phase,
  windControls,
  collectedCount,
  missingLabels,
  canAddWind,
  canBeginSettle,
  isSettling,
  settleToken,
  visibleTargets,
  patternLabel,
  recipient,
  sender,
  finalTitle,
  finalNote,
  revision
}
```

阶段遮蔽：

- intro/gathering/armed：`visibleTargets / patternLabel / recipient / sender / finalTitle / finalNote` 全部 null；
- settling：只公开稳定 target 点，允许雪花开始组成图案；`recipient / sender / patternLabel / finalTitle / finalNote` 仍全部为 null；
- complete：公开点阵说明与完整 DOM 文本。

正常页面在 complete 前不得把私密字符串写入：

- DOM 文本、hidden 节点、template；
- `aria-label/description/live`；
- class/id/data/title/style 属性；
- Canvas `fillText` 或离屏 Canvas；
- console、storage、URL、网络或 clipboard。

`config.js` 仍是本地磁盘明文；会查看源文件的人可以读到内容，这不是密码学保密。承诺只限定正常页面流程不提前呈现、不上传、不额外持久化。

## 9. 表现层与生命周期

Canvas 只画无语义雪点，`aria-hidden=true`。规则和结果都由真实 DOM 文本表达。

- gathering：收集方向时只做短促、非闪烁的局部雪旋；不运行永久 RAF；
- armed：静止显示四方向已齐，不自动推进；
- settling：用一个 token 化完成器协调 WAAPI/RAF、timeout、visibility 与 reduced-motion；每条路径都捕获启动时的 settleToken，先到路径清理其余资源并派唯一 `COMPLETE_SETTLE { settleToken }`；
- complete：Canvas 或 CSS 网格显示最终点阵，DOM 创建昵称与私信；
- restart：先清 listener/timer/Animation/RAF，再派新状态；旧 token 回调为 no-op。

若 Canvas 初始化、绘制或尺寸计算失败，四个按钮和 reducer 仍能推进；BEGIN_SETTLE 走受 token 保护的 microtask，complete 用 CSS 点阵与 DOM 文本完成，不白屏。

## 10. 无障碍与降级

- 四个方向按钮构成拖动的完整单指针替代；
- 进度使用真实文本：`已收好 2 / 4 阵风；还差上、左`；
- live region 只播报首次方向、armed 和 complete，不在 pointermove/动画帧刷新；
- armed 后不抢焦点；“让雪落下”进入正常 Tab 顺序；
- 仅当前台可见且窗口仍有焦点时，首次有效 complete 才一次性把焦点移到 `tabindex=-1` 的结果标题；hidden/pagehide/blur 收尾不聚焦，返回后不补移；live 只说“雪已经停下，留言已展开”，避免整封信重复朗读；
- 方向按钮可使用 `aria-pressed`，雪球本身不伪装成 slider、joystick 或自造 role；
- forced-colors 使用系统色、真实 border、文字方向和 `✓/已收好`，不依赖透明度、阴影、渐变或颜色；
- `prefers-reduced-motion: reduce` 不播放风暴、摇屏、抛物、缩放、粒子漂移或淡入；BEGIN_SETTLE 后用 microtask 完成同一结果；
- 无 JS 时只显示静态说明，不伪造图案已形成或私信已解锁。

W3C WCAG 2.3.3 要求可禁用非必要的交互触发动画；2.5.4 要求设备动作不能成为唯一入口。首版直接不注册传感器，比“先请求再回退”更符合本地直开和最小权限原则。

## 11. 响应式 Gate

至少验证：

| 视口 | 重点 |
| --- | --- |
| 1504×1046 | 标题、雪球、四方向、阶段动作与说明同屏；无横纵滚 |
| 1280×800 | 雪球、四方向与“让雪落下”同屏；无横向滚 |
| 768×1024 | 雪球居中，2×2 按钮和完整状态文本可见 |
| 390×844 | 雪球约 280–320px，按钮 2×2 且每个≥48px |
| 320×568 | 雪球约 240–264px；允许纵滚，零横溢 |
| 844×390 | 雪球约 210px，控制放侧边或下方，不锁方向 |

另做 200% 文本与约 320 CSS px 的 400% zoom；检查 safe-area、长私信换行、焦点环、按钮中心命中、Canvas 失败、reduced-motion、forced-colors、零公网请求和零 console 错误。

## 12. 固定开源参考与借鉴边界

以下来源只用于研究通用机制；首版不把它们作为运行依赖，不复制源码、API、算法表达、参数、测试、UI、文案、字体、图片或音频。

### 12.1 tsParticles

- 固定版本：[commit `627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59`](https://github.com/tsparticles/tsparticles/commit/627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59)
- 许可证：[MIT](https://github.com/tsparticles/tsparticles/blob/627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59/LICENSE)
- 版权：`Copyright (c) 2020 Matteo Bruni`
- 仅借鉴：把雪花的下落、横向摆动和每粒状态视为表现层，并允许统一停止/清理。
- 不复制：snow preset 的[源码](https://github.com/tsparticles/tsparticles/tree/627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59/presets/snow/src)与 [README](https://github.com/tsparticles/tsparticles/blob/627b3fc7d1a0d0fe524e2fea5f89fa7589b18d59/presets/snow/README.md)、配置/API、默认速度/密度/形状/颜色、插件结构、示例和依赖。

### 12.2 canvas-text-particle

- 固定版本：[commit `9ee144a548aad85275318b30891c71dcf6e10f7b`](https://github.com/dango0812/canvas-text-particle/commit/9ee144a548aad85275318b30891c71dcf6e10f7b)
- 许可证：[ISC](https://github.com/dango0812/canvas-text-particle/blob/9ee144a548aad85275318b30891c71dcf6e10f7b/LICENSE)
- 版权：`Copyright (c) 2026, dango0812`
- 仅借鉴：粒子先有独立 ID，再朝一组目标点归位的抽象分层。
- 明确偏离：本作不使用离屏文字 Canvas、alpha 像素读取或字体轮廓采样，而从固定字符网格直接生成点阵。
- 不复制：[实现](https://github.com/dango0812/canvas-text-particle/blob/9ee144a548aad85275318b30891c71dcf6e10f7b/src/text-particle.ts) 的源码、采样间隔、阈值、缓动/排斥公式、字体、默认文字、配置与演示资产。

### 12.3 canvas-confetti

- 固定版本：[commit `20eebad51dde793070c373d594099a7ed8d96e22`](https://github.com/catdad/canvas-confetti/commit/20eebad51dde793070c373d594099a7ed8d96e22)
- 许可证：[ISC](https://github.com/catdad/canvas-confetti/blob/20eebad51dde793070c373d594099a7ed8d96e22/LICENSE)
- 版权：`Copyright (c) 2020, Kiril Vatev`
- 仅借鉴：尊重 `prefers-reduced-motion`，跳过表现仍完成同一个逻辑结果；动画要有清理生命周期。
- 不复制：粒子物理、Worker、Promise 协调、默认参数/配色/形状、Canvas 实现、示例与素材。

### 12.4 W3C Device Orientation and Motion

- 固定版本：[commit `70d42d5484db7fd1646e48cc17caa5ff1c9d92cb`](https://github.com/w3c/deviceorientation/commit/70d42d5484db7fd1646e48cc17caa5ff1c9d92cb)
- 许可证：固定仓库的 [LICENSE.md](https://github.com/w3c/deviceorientation/blob/70d42d5484db7fd1646e48cc17caa5ff1c9d92cb/LICENSE.md) 指向 [W3C Software and Document License 2023](https://www.w3.org/copyright/software-license-2023/)，由仓库贡献者授权；规范由 W3C Devices and Sensors WG 与 Web Applications WG 维护。
- 用途：确认 secure context、explicit permission、accelerometer/gyroscope 和指纹风险边界，从而决定首版完全不注册设备动作。
- 不复制：[规范源文件](https://github.com/w3c/deviceorientation/blob/70d42d5484db7fd1646e48cc17caa5ff1c9d92cb/index.bs) 的示例代码或措辞。

### 12.5 标准资料

- [W3C Pointer Events](https://www.w3.org/TR/pointerevents/)：pointer capture、pointercancel 与 lost capture 生命周期；
- [WCAG 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)：拖动必须有无需拖动的单指针替代；
- [WCAG 2.5.4 Motion Actuation](https://www.w3.org/WAI/WCAG22/Understanding/motion-actuation.html)：设备动作需要常规控件替代与禁用能力；
- [WCAG 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)：交互触发的非必要动画可禁用；
- [WCAG 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)：Canvas 图案不能成为唯一信息来源；
- [WCAG 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)：高倍缩放不产生二维滚动。

## 13. 排除来源与素材风险

- `alexgibson/shake.js` 固定 commit [`d232eee7a5f31e9fd37aa79aa83f1f206035ccc9`](https://github.com/alexgibson/shake.js/commit/d232eee7a5f31e9fd37aa79aa83f1f206035ccc9)：`package.json` 声称 MIT，但 [LICENSE.md](https://github.com/alexgibson/shake.js/blob/d232eee7a5f31e9fd37aa79aa83f1f206035ccc9/LICENSE.md) 在许可句中加入 `except as noted below`，下文却没有对应例外，GitHub API 因此识别为 `NOASSERTION`；且实现早于现代权限模型。不作为正式参考，不复制或依赖；
- NextParticle：商业授权，不进入当前宽松许可候选；
- CodePen/Gist 雪花或粒子文字示例：仓库级许可证、作者、字体或素材来源常不完整；
- 带远程雪花 PNG、背景照片、图标字体、商业贺卡图样或未注明来源音效的 demo：全部排除；
- 不从系统 emoji 字体导出雪花位图，不复制真实品牌雪球、礼盒、卡通角色或贺卡 trade dress；
- 生产雪点用原创 Canvas 基本几何或自绘 SVG；视觉概念和生成资产另按 ImageGen 记录提示词、日期、尺寸、格式与 SHA-256。

来源记录分两层：README 为每个固定开源项目提供来源、commit、许可证、借鉴摘要与零运行依赖声明，并同时列出 Pointer Events 与 WCAG 2.5.7、2.5.4、2.3.3、1.3.1、1.4.10 这些标准校准页；`assets/ATTRIBUTION.md` 再逐项完整展开许可证、版权主体、实际借鉴抽象和未复制范围。标准页要明确不是运行依赖、代码或素材来源。即使最终零运行依赖，也不能省略调研借鉴声明。

## 14. 测试矩阵草案

纯逻辑：

1. 默认 9×11 pattern、63 active cells、row-major target 与哈希；
2. pattern 行/列 ±1、非法字符、active 边界、extra/accessor/prototype、整份回退；
3. 四方向 24 种排列都唯一进入 armed；重复方向同引用；
4. 非法方向、错误 phase、extra key、symbol/accessor 全拒绝；
5. BEGIN_SETTLE 只在 armed；错误/旧 token 不能 complete；
6. animation/timeout/hidden/pagehide/blur/reduced-motion 全部带 token 派同一个 COMPLETE；旧 token 同引用 no-op；
7. restart 后 revision/token 单调，旧回调无法命中新局；
8. public view 逐阶段断言 recipient/sender/patternLabel/finalTitle/finalNote 遮蔽；settling 只公开 targets；
9. hostile state/action/config snapshot fail closed；revision headroom 不进入永久 settling；
10. action log 与 clone log 重放到字节等价 complete state/view。

浏览器：

1. Pointer 从中心到四方向、inner/outer 抖动、重复方向、第二指、cancel/lost capture；
2. 四按钮只靠 click/tap/Enter/Space 完整通关；与 pointer golden sequence 同 state；
3. 四阵风齐后不自动揭晓，只有“让雪落下”进入 settling；
4. 多个动画完成源、旧 token、hidden/blur/pagehide 只 complete 一次；
5. 初始 reduced 与途中切 reduced 得到同一结果，无高速雪动；
6. complete 前 DOM/ARIA/Canvas 文本/console 不含私密字符串，complete 后 DOM 唯一出现；
7. Canvas 缺失/抛错仍以 CSS 点阵和 DOM 文本完成；
8. 单一 live、焦点、aria-pressed、forced-colors、按钮≥48px；
9. 六档视口、200%/400% zoom、长文案、safe-area、零横向溢出；
10. 真实 `file://` 零公网请求、零 storage、零权限、零 console error/warning。

## 15. 风险与处置

| 风险 | 处置 |
| --- | --- |
| 退化成拍立得换皮 | 不计左右交替；四方向是 set；主动落雪独立 Gate |
| 拖动要求精细动作 | 四个持久按钮提供完整单指针替代；阈值按短边归一化并有 hysteresis |
| 粒子位置因帧率不同 | 粒子只属表现；规则状态只保存四方向、token 与静态 target |
| 中文字体导致点数漂移 | 不采样字体；直接读取 9×11 字符网格 |
| 私信提前泄露 | complete 前不创建任何私密 DOM/ARIA/Canvas text；public view 分阶段遮蔽 |
| 动画后台悬挂 | hidden/blur/pagehide 清资源，并用启动时 token 派同一个 COMPLETE；旧 token 无效 |
| Canvas 不可用 | CSS 点阵 + DOM 文本降级，逻辑不依赖 Canvas |
| 传感器权限破坏直开 | 首版完全不注册设备动作或请求权限 |
| 开源素材来源不清 | 只借鉴固定版本抽象；生产图形原创，逐项 ATTRIBUTION |

## 16. 推荐进入下一阶段

**Go。** 冻结作品名与默认私密标题“雪停以后，是你”、公开 H1“等雪停下”、目录 `snow-globe-message`、四方向集合、主动落雪 Gate、9×11 点阵、五阶段 reducer、token 化 settling、分阶段 public view、零传感器与完整借鉴声明。

后续规格已在 [182-snow-globe-message-spec.md](./182-snow-globe-message-spec.md) 冻结：配置 Unicode code point 范围、默认 pattern canonical hash、direction helper 的平局优先级、inner/outer 定点阈值、exact state/action schema、revision headroom、点阵坐标公式、public view、animation finish arbiter、焦点/live 文案、hostile fixtures 与浏览器测试脚本。视觉实现仍需等待图像偏好确认并先生成/接受概念。
