# “把星光，一笔一笔交给你”视觉设计与资产冻结

- 日期：2026-07-21
- 状态：已冻结，待实现
- 对应调研：[`166-constellation-relay-research.md`](./166-constellation-relay-research.md)
- 对应规格：[`167-constellation-relay-spec.md`](./167-constellation-relay-spec.md)
- 视觉方法：OpenAI 内置 ImageGen 纯文字生成桌面接线、移动交接、桌面完成三态概念和两张生产资产

## 1. 冻结结论

视觉方向是 **观测站夜班接线板**：哑光暗梅和石墨面板承载一张大尺寸接线棋盘，瓷白插孔是唯一主交互目标，安全橙与薄荷导线表达两席轮流施工。亲密感来自“把同一根线头交给对方”，而不是爱心、婚礼符号或浪漫插画。

核心层级固定为“接线棋盘 → 当前轮值与主动作 → 已接进度 → 有序日志”。桌面可把轮值和日志置于窄侧栏；移动端按“标题/进度 → 唯一主动作 → 完整棋盘 → 日志”展开。棋盘不因 handoff 消失，也不使用遮屏制造假隐私。

生产图片只承担材质与终局氛围。9 个星点、10 根目标线、已接线、当前线头、席位、进度、错误、日志、按钮和焦点均由 HTML/CSS/SVG 表达。

## 2. ImageGen 文件台账

### 2.1 概念与源稿

| 文件 | 尺寸 | SHA-256 | 用途 |
| --- | ---: | --- | --- |
| [`assets/constellation-relay/desktop-choosing-concept.png`](./assets/constellation-relay/desktop-choosing-concept.png) | 1504×1046 | `5da8ea0efc94d769674632452db3a5e10f37b9fd1073cb289c4793760c444986` | 桌面接线中概念；不进入运行时 |
| [`assets/constellation-relay/mobile-handoff-concept.png`](./assets/constellation-relay/mobile-handoff-concept.png) | 853×1844 | `cfe60d1c923a5a91d1318a27943c3e748b36b4b3e7df3374f3d670d5651d7f88` | 移动公开交接概念；不进入运行时 |
| [`assets/constellation-relay/desktop-complete-concept.png`](./assets/constellation-relay/desktop-complete-concept.png) | 1503×1046 | `a750fd2f0299cb92d1b388cf762103c24d6aeddd914c8321b2f2215a110e3478` | 桌面共同完成概念；不进入运行时 |
| [`assets/constellation-relay/observatory-console-background-source.png`](./assets/constellation-relay/observatory-console-background-source.png) | 1586×992 | `077022eef9197b4ea1aa6fed89775b6aa3cb16c1943f7f83859095953a95da63` | 低对比观测台背景源稿 |
| [`assets/constellation-relay/completion-keepsake-source.png`](./assets/constellation-relay/completion-keepsake-source.png) | 1448×1086 | `55802680a4ab40a33e2ce52e6dba730e8c89e5e43b2d8998d30a8a189ffbb64b` | 严格 9 点 10 线终局纪念源稿 |

### 2.2 运行时资产

| 源稿 | 处理 | 运行时目标 | SHA-256 |
| --- | --- | --- | --- |
| `observatory-console-background-source.png` | 逐字节复制 | `experiences/co-op/constellation-relay/assets/observatory-console-background.png` | `077022eef9197b4ea1aa6fed89775b6aa3cb16c1943f7f83859095953a95da63` |
| `completion-keepsake-source.png` | 逐字节复制 | `experiences/co-op/constellation-relay/assets/completion-keepsake.png` | `55802680a4ab40a33e2ce52e6dba730e8c89e5e43b2d8998d30a8a189ffbb64b` |

五张源/概念和两张运行时副本均已用 `view_image(detail="original")` 检查。运行时图为 RGB PNG，无透明通道；页面必须在图片失败时切换到纯色/纹理 CSS，而不是暴露破图图标。

### 2.3 生成输入声明

- 工具：OpenAI 内置 ImageGen；日期：2026-07-21；输入仅为纯文字；
- 第三方参考图片、开源截图、商业素材、字体、角色与照片：无；
- 概念分别限定 1504×1046 接线中、390×844 handoff 和 1504×1046 complete；
- 背景要求中央 75% 安静，不含星点、线路、插孔、UI、文字或答案；
- 终局图要求西翼四边环、尾线、中桥、东翼四边环，严格 9 点 10 线；
- 两张生产图没有借用参考仓库资产。

完整 prompt 已保留在本任务的 ImageGen 调用记录中。关键提示分别为：完整桌面夜班接线台、真正移动化的公开交接页、安静的 5/5 完成页、中央留白的石墨背景，以及 9 点 10 线双翼星鸢终局纪念。执行使用内置工具，不是 CLI fallback。

## 3. 三态审校

### 桌面 choosing

接受：大棋盘、瓷白插孔、橙/薄荷实线、低对比公共轮廓、窄侧栏、单一当前动作和机械铭牌质感。

舍弃：概念中的真实时钟、天气、设置、清空日志、帮助、快捷座位切换、观测站照片和多余底栏。这些都不属于规格。

### 移动 handoff

接受：进度靠前、交接卡先于棋盘、按钮显著且单一、棋盘完整不裁、日志在后、螺丝/压板形成触觉层次。

舍弃：概念只有 8 个插孔且线路拓扑不准确；生产必须严格使用冻结 9 点 10 边。概念中的伪文案、英文副标题和“座号”也不进入实现。

### 桌面 complete

接受：共同瓷白发光轮廓、橙/薄荷微型端帽仍保留两席贡献、5/5 摘要、十行日志、一个重开动作、无礼花奖杯。

舍弃：概念中的星图拓扑不准确、导航 WEST/EAST、英文翻译和宽三栏硬切。生产终局以规则 DOM/SVG 为真，纪念图只作辅助氛围。

## 4. 设计令牌

```css
:root {
  --plum-1000: #100c11;
  --plum-950: #171218;
  --plum-900: #201920;
  --graphite-900: #252429;
  --graphite-750: #3b3940;
  --ivory-100: #f5ead5;
  --ivory-250: #d9cbb5;
  --ivory-500: #a99b88;
  --porcelain: #eee7d9;
  --orange-500: #e88535;
  --orange-700: #b9581d;
  --mint-400: #8bc8a8;
  --mint-700: #4c8f73;
  --danger: #ef9a76;
  --focus: #fff2c9;
  --panel-border: rgb(238 231 217 / 18%);
  --panel-shadow: 0 18px 50px rgb(0 0 0 / 42%);
  --socket-shadow: 0 4px 10px rgb(0 0 0 / 45%);
  --radius-small: 8px;
  --radius-medium: 14px;
  --radius-large: 22px;
  --content-max: 1440px;
}
```

字体全部使用本机回退：

- 标题与正文：`Avenir Next Condensed`, `Arial Narrow`, `PingFang SC`, `Microsoft YaHei`, sans-serif；
- 技术标记与数字：`SFMono-Regular`, `Menlo`, `Consolas`, monospace；
- 不加载远程字体，不使用大衬线营销标题、渐变字或描边字；
- 正文至少 16px，辅助文字至少 13px，按钮至少 16px。

两席双编码：

| 席位 | 主色 | 非颜色编码 |
| --- | --- | --- |
| A | 安全橙 | 实心圆端帽、`A` 标记 |
| B | 薄荷绿 | 双环端帽、`B` 标记 |
| 共同完成 | 瓷白 | 两端保留橙/薄荷小套环、文字 5/5 |

## 5. 页面骨架

```text
body.constellation-relay
└── main.app-shell
    ├── header.app-header
    │   ├── eyebrow + h1 + rule
    │   └── progress + seat-shift
    └── section.workbench
        ├── section.board-panel
        │   ├── svg.wire-layer
        │   └── div.star-controls > 9 button
        └── aside.control-rail
            ├── section.phase-panel
            ├── section.seat-legend
            └── ol.connection-log
```

- 桌面棋盘占 workbench 主列，侧栏宽度不超过 320px；
- 1280×800 可收起非当前日志详情，但不能隐藏当前动作；
- 720px 以下变单列，phase-panel 提到棋盘之前，日志放棋盘之后；
- button 永远位于 SVG 之上且保持 44px 命中，不用透明 SVG hit area；
- handoff 公开保留线路和进度；jammed 只改变结果区，不摇晃整张棋盘。

## 6. 棋盘与插孔

- 棋盘 `aspect-ratio: 1`，内部统一 `viewBox 0 0 1000 1000`；
- 公共目标边是 1–2px 低对比短虚线，不能比已接线路更亮；
- 已接线为 8–12px，带暗底槽与席位色芯，端点有非颜色编码；
- 当前线头只在 current button 外加 3px 瓷白/席位双色环，不画持续脉冲；
- 插孔主体可用 CSS 多层圆、边框和 box-shadow，不生成九张图片；
- 点名用靠近按钮的真实文本；320px 下可缩短可见名，但 aria-label 保留完整名；
- ghost 线最多一根，40–55% 透明度，Escape 或失焦后移除；
- complete 线路转瓷白，原席位端帽仍可辨；运行时纪念图置于结果区，不能盖住棋盘。

## 7. 阶段表现

- `intro`：棋盘可见完整公共轮廓，主动作“开始接线”；
- `handoff`：下一席姓名、接过观测台按钮最醒目，棋盘只读；
- `choosing`：当前线头与 seat 色明显，所有其他星可聚焦，不预先标出合法答案；
- `edge-result`：新线固定，主动作“交给下一位”；
- `jammed`：错误区使用危险色 + 断线图形 + 文案，但不指向正确星；
- `constellation-result`：完整线路与“十根星线全部接通”，主动作“留下这束星光”；
- `complete`：棋盘、5/5、配置结语、纪念图、十行日志和唯一“重新开始”。

任何阶段都不出现分数、排名、个人失误、计时、设置、提示答案、分享或音频控件。

## 8. 动效、焦点与响应式

动效只包括新线 180–240ms 轻描、插孔状态 140ms 淡入和完成光线 260ms 收束；不使用持续 RAF、闪烁、粒子、摇晃或依赖 `animationend` 的状态推进。reduced-motion 全部即时切换。

阶段切换后的焦点遵守规格：choosing 到当前线头，成功到新线头，失败不移，complete 到结果标题。`:focus-visible` 使用 3px 瓷白实线和 3px 暗色 offset；不以发光阴影代替轮廓。

| 视口 | 视觉 Gate |
| --- | --- |
| 1504×1046 | 棋盘 620–760px；标题、轮值、规则、棋盘、主动作全在首屏；无滚动 |
| 1280×800 | 棋盘 ≥520px；侧栏紧凑；无横向滚动 |
| 390×844 | 单列；棋盘 350–366px；交接动作在棋盘前；日志在后 |
| 320×568 | 内容 300–304px；棋盘 ≥296px；允许纵滚；触点仍 ≥44px |

## 9. Fidelity ledger

| 概念锚点 | 实现要求 | 验收证据 |
| --- | --- | --- |
| 大棋盘是唯一主视觉 | 桌面棋盘显著大于侧栏；移动完整占宽 | 四档截图与 DOM 尺寸 |
| 瓷白插孔 | 恰 9 个真实 button，具有瓷面/暗孔层次 | DOM 计数、截图 |
| 橙/薄荷轮值导线 | completedMoves 按 seat 双编码 | 完整路线截图、DOM data 属性 |
| 公共轮廓低对比 | 恰 10 条 target edge，不泄漏顺序 | SVG 计数、截图 |
| 当前线头可辨 | current button 同时有环、文字和 aria | choosing 截图、可访问树 |
| 单一主动作 | 每阶段只有一个可见 primary action | DOM 断言、三态截图 |
| handoff 仍公开棋盘 | 不遮线路，不伪装秘密阶段 | 移动/桌面 handoff 截图 |
| 机械哑光材料 | 暗梅、石墨、瓷白、压板和克制螺丝 | CSS token、截图 |
| complete 变共同瓷白 | 线路收束但保留两席端帽 | complete 截图 |
| 5/5 不做排行 | 两席等权摘要，无分数与失误比较 | complete DOM |
| 日志是真实有序列表 | 恰按 completedMoves 生成 10 项 | DOM 计数、屏幕阅读器检查 |
| 图片不是规则真相 | 阻断两张图仍可完成整局 | 浏览器降级验收 |

实现完成后 ledger 至少逐项提供 5 条可见证据；偏差必须记入验收文档，不能用“风格接近”概括。

## 10. Agency signoff

进入编码前确认：

- 三张完整状态概念均已生成和原尺寸审校，不是 moodboard；
- 桌面、移动、完成三态共享同一材料与层级；
- 两张生产资产已生成、归档、哈希并有 CSS 降级边界；
- 星点、连线、答案、按钮、文字和状态均保持 code-native；
- 概念中的非目标控件与错误拓扑已列入舍弃项；
- 响应式、焦点、降动效、forced-colors 和图片阻断均有 Gate；
- 设计有明确作者判断，不依赖第三方组件模板或开源界面复制。

结论：**视觉概念与生产资产通过 agency signoff，可以进入实施计划与代码。**

## 11. 资产与许可边界

- 两张生产图均为本轮纯文字 ImageGen 原创生成；
- 无第三方图片输入，无开源素材、字体、图标或照片复用；
- 所有运行时图片随作品目录本地加载，不请求 CDN；
- `ATTRIBUTION.md` 必须同时声明 ImageGen 资产与五个仅机制调研来源；
- README 必须保留精确标题 `## 借鉴与来源声明`；
- 若后续替换生成图，必须新增版本、复核 SHA/尺寸，并同步本台账。

## 12. 设计 Gate

进入代码前冻结：夜班接线台方向、两张生产资产、棋盘主视觉、9 个瓷白插孔、橙/薄荷双编码、公开 handoff、共同瓷白 complete、配色/字体、图片降级、焦点、四档响应式、fidelity ledger 与 agency signoff。

实现不得顺带加入时钟、天气、设置、帮助抽屉、日志清空、座位切换、在线功能、分数、提示、远程字体、音频、第三方图标库或新的图片资产。
