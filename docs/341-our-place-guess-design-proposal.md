# Our Place Guess visual design proposal

- 日期：2026-07-25
- 工作 ID：`our-place-guess`
- 对外名称：`你记得，我们在哪里`
- 分类：`co-op`
- 能力等级：C，本机服务 + 同一可信局域网两台设备
- 前置：
  - `docs/330-our-place-guess-research.md`
  - `docs/331-our-place-guess-brainstorm.md`
  - `docs/332-our-place-guess-spec.md`
  - `docs/333-our-place-guess-plan.md`
- 阶段：**仅供用户确认的视觉提案**
- 生产 UI：**尚未授权**

## 1. 结论先行

本提案选择 **夜行纸图** 作为原创视觉方向：

- 一张深墨色纸地图是唯一主焦点；
- 雾蓝海面、灰绿陆地、旧金经纬网形成低亮度夜行气氛；
- 两位玩家与真正地点使用三种珐琅形状 pin；
- 当前回忆以一张暖纸批注呈现，不做旅行网站或地理 dashboard；
- guessing 只出现自己的圆形 pin；
- revealed 才出现对方菱形 pin、真正地点星形 pin、两条连线和共同结果；
- 不做护照、登机牌、在线地图瓦片、霓虹、玻璃拟态、bento 或指标卡。

本阶段只有概念图与设计合同：

- 不新增 `index.html`、`styles.css`、`app.js` 或启动器；
- 不修改 catalog、共享 runtime、依赖、Board 或任何 README；
- 概念 PNG 不得进入生产运行路径；
- 所有地图、pin、连线、文字、按钮和结果必须在未来用 code-native
  HTML/CSS/JavaScript/SVG 实现；
- 必须用户确认 active 图片 hash 后，才能开始生产 UI。

## 2. Active 概念图

| 视图 | 文件 | 原始尺寸 | SHA-256 | 主合同 |
|---|---|---:|---|---|
| 桌面 guessing | [`desktop-guessing-concept.png`](./assets/our-place-guess/desktop-guessing-concept.png) | 1586×992 PNG RGB | `e7e37b09b9d61aca54186459fd5f9f187088820871353d75438a3598b88f6b5d` | 只有自己的圆形 pin、线索、地图控制和密封动作 |
| 桌面 revealed | [`desktop-revealed-concept.png`](./assets/our-place-guess/desktop-revealed-concept.png) | 1586×992 PNG RGB | `b87b861ba2eabc8f4e2be4cb1b49947253534abd0c575226e565444d02488076` | 三枚不同形状 pin、两条连线、同权重个人距离、共同结果与 host 下一轮动作 |
| 390px 移动 guessing | [`mobile-guessing-concept.png`](./assets/our-place-guess/mobile-guessing-concept.png) | 853×1844 PNG RGB | `fcdf0d191cbce9df7906fe75f2b5ab2b43e237de82a4151465525deea68b51ee` | 单列地图、48px 控件、微调与无目标的密封动作 |
| 390px 移动 revealed | [`mobile-revealed-concept.png`](./assets/our-place-guess/mobile-revealed-concept.png) | 853×1844 PNG RGB | `b2967d3935241788c9f46e14582cb9d04ba9aed97a36079987e4135ad5edd15e` | 矩形等距圆柱地图、共同结果、复盘纸页与 guest 等待状态 |

四张图均由内置 `imagegen` 生成，没有输入参考图片，并已使用 `view_image` 的
`original` 模式逐张检查。

853×1844 是生成图片原始像素，不是浏览器 390×844 截图。用户确认后，生产
验收必须另外在真实 390×844 和 320px 视口取浏览器证据。

## 3. 核心视觉语法

### 3.1 一张地图，而不是 dashboard

页面只允许五类主表面：

1. 顶部单行房间/回合书眉；
2. 当前回忆暖纸批注；
3. 一张矩形世界纸图；
4. 一条连续控制或结果带；
5. revealed 的单张复盘纸页。

不允许：

- 多个指标卡；
- bento 网格；
- 浮动统计面板；
- 玻璃侧栏；
- 排行榜；
- 头像墙；
- 聊天窗；
- 营销 hero；
- 每个字段各包一张卡。

### 3.2 阶段色彩

guessing 的色彩数量有意受限：

- 自己：珊瑚圆形；
- 地图：深墨、雾蓝、灰绿与旧金；
- 不出现青色菱形和淡金星形。

revealed 才引入：

- 自己：`●` 珊瑚；
- 对方：`◆` 青蓝；
- 真正地点：`★` 淡金；
- 两条旧金连线；
- 暖纸结果批注。

这不是“把目标设为透明”。guessing 的 target 和对方坐标必须不存在。

### 3.3 情绪层级

revealed 的主情绪标题是共同档位，例如：

```text
方向一直在
```

两人的公里数同字号、同权重、按冻结成员顺序显示，不按距离排序。不得出现：

- 更近；
- 更远的人；
- 赢；
- 输；
- 第一名；
- 拖后腿；
- 默契分；
- 关系等级；
- 奖牌；
- 个人颜色的好/坏语义。

## 4. Design tokens

### 4.1 颜色

| Token | 值 | 用途 |
|---|---|---|
| `--night` | `#0B1826` | 页面背景 |
| `--atlas-sea` | `#102838` | 地图海面 |
| `--land` | `#AFC3BC` | 物理陆地 |
| `--gold` | `#C69A53` | 经纬网、边线、次级文字 |
| `--paper` | `#F2E8D5` | 线索与复盘纸页 |
| `--paper-ink` | `#17303A` | 暖纸上的正文 |
| `--self` | `#EF786B` | 自己的圆形 pin |
| `--partner` | `#5CBFC1` | 对方的菱形 pin，仅 revealed |
| `--target` | `#F2CE78` | 真正地点星形 pin，仅 revealed |
| `--focus` | `#FFF2B8` | 深色地图上的焦点环 |
| `--danger` | `#E2A3A0` | 连接/文件错误，不用于输赢 |
| `--disabled` | `#75838A` | 提交后或不可用控制 |

颜色从不单独承载含义。三类 pin 还必须同时使用形状、文字、描边和 AX 名称。

### 4.2 字体

不新增或下载字体。

| 层级 | 系统字体建议 | 桌面 | 移动 |
|---|---|---:|---:|
| 页面标题 | `Songti SC`, `STSong`, `Noto Serif CJK SC`, serif | 30–36px | 26–30px |
| 共同档位 | 同一衬线系统栈 | 36–44px | 34–40px |
| 阶段/线索标题 | 系统无衬线中文栈 | 20–24px | 20–24px |
| 地图控制 | 系统无衬线中文栈 | 16px | 16–18px |
| 正文/状态 | 系统无衬线中文栈 | 15–17px | 不低于 16px |

生产 UI 不从图片取字形。所有按钮显式设置字号、字重与行高。

### 4.3 间距与几何

- 基础间距：4、8、12、16、24、32、48px；
- 桌面边距：24–32px；
- 移动边距：16px，320px 时 12px；
- 触控目标：至少 48×48 CSS px；
- 地图焦点环：3px，外移 3px；
- 纸页圆角：0–6px，保持裁纸感；
- 地图框：矩形，等距圆柱，不使用球面、透视或弯曲投影；
- 阴影：只允许纸图与暖纸各一层低对比阴影；
- 连接线：1.5–2px，自己与对方使用不同虚实样式；
- 不使用大胶囊、发光描边或玻璃模糊。

### 4.4 图标

所有未来图标为原创 SVG 或语义按钮：

| 图标 | 语义 | 要求 |
|---|---|---|
| `●` | 自己的落点 | 圆形、珊瑚、文字“你” |
| `◆` | 对方落点 | 菱形、青蓝、文字“对方” |
| `★` | 真正地点 | 星形、淡金、文字“真正地点”，仅 revealed |
| `+ / −` | 放大/缩小 | SVG + 可见文字/可访问名称 |
| 四方向箭头 | pin 微调 | 2px 圆端描边，不用纯文本 glyph |
| 重置视图 | 视口归位 | 环形箭头，不暗示清除 pin |
| 密封印 | 提交 | 无星、无目标隐喻的双圆环 |

guessing 的密封按钮不得使用星形，因为星形专属于真正地点。

## 5. 页面与角色合同

### 5.1 Lobby

双方都可见：

- 连接状态；
- 创建或加入房间；
- 五位房间码；
- 两位成员状态；
- `两个人已到齐`；
- 隐私说明；
- 当前 host 标识。

第三人收到容量错误后返回大厅，不看到题包或游戏状态。

### 5.2 Host-only pack setup

只有当前 host 的 DOM 可以创建：

- `使用虚构示例题包`；
- `<input type="file" accept="application/json,.json">`；
- `从本机选择私人 JSON`；
- 校验成功/错误；
- 安全题包标题；
- 卡片数量；
- `本局按顺序使用前四张，其余 N 张忽略`；
- `开始四段回忆`。

不得出现：

- 绝对路径；
- 完整 JSON；
- target 列表；
- 卡片经纬度；
- 未来卡片内容；
- localStorage/历史题包；
- 最近使用文件；
- 上传/保存/同步按钮。

host 更换、成员变化、断开、离房或刷新后：

- File Picker `.value = ""`；
- 原始文本引用丢弃；
- pack、activeCards 和安全摘要清除；
- 新 host 必须重新选择题包。

### 5.3 Guest pack waiting

guest 只看到：

- `房主题包尚未准备`；
- 或 `房主题包已准备`；
- `等待房主开始`。

guest 不创建：

- File Picker；
- 文件名；
- pack title；
- card count；
- 忽略数量；
- 完整卡组；
- target；
- revealNote。

这不是 CSS 隐藏同一个 host DOM；guest 必须使用不同 view model。

## 6. Phase 互斥合同

| Phase | 主要信息 | 可操作 | 必须不存在 |
|---|---|---|---|
| `guessing/unplaced` | 当前公开线索、空地图 | 地图放置、缩放、平移 | target、对方 pin/坐标、revealNote、未来卡 |
| `guessing/placed` | 当前公开线索、自己的可编辑 pin/粗略坐标 | 重放、拖动、微调、密封 | target、对方 pin/坐标、距离、结果 |
| `guessing/submitted` | 自己已密封、等待对方 | 只允许视口查看；同 payload ack 丢失时由协议重试 | 修改 pin、目标、对方坐标 |
| `revealed` | 当前 target、两人 pin/距离、共同距离、档位、复盘 | host 可下一轮；guest 只等待 | pin 编辑、密封、未来卡/目标 |
| `finished` | 四轮共同摘要 | host 可重开 | 当前地图编辑、个人排名、历史保存 |
| `idle/reset` | 房间或重新准备 | host pack setup | 旧 pin、旧结果、旧私人题包 |

### 6.1 Guessing secret gate

guessing 时，target 不得出现在：

- 文字节点；
- `hidden` 或 `aria-hidden` DOM；
- `data-*` 属性；
- SVG 元素；
- SVG metadata；
- CSS 变量；
- 透明层；
- comment；
- URL；
- guest message；
- console；
- Network payload；
- AX tree。

只有自己的一枚圆形 pin 可以存在。对方提交前后都不显示对方坐标，直到
`room:sealed-result` 与经验证的 host state 共同推进。

### 6.2 Submitted monotonicity

点击 `密封这枚落点` 后：

- pin 冻结；
- 拖动、地图点击改点、方向键和微调按钮禁用；
- UI 明确显示 `本轮已经密封，不能修改`；
- 相同规范 payload 可为丢失 ack 幂等重发；
- 不同坐标的重复提交不可覆盖；
- result 早于 ack 时只向 revealed 前进，不回退等待；
- 没有“取消密封”或“改答案”。

### 6.3 Revealed cooperative hierarchy

revealed 必须按以下顺序读：

1. `一起揭晓`；
2. 地图上的 `● 你`、`◆ 对方`、`★ 真正地点`；
3. 两个同权重个人距离；
4. `共同距离`；
5. 共同档位；
6. 准备者的当前卡 revealNote；
7. `你刚才先想起的是哪一幕？`；
8. host 下一轮动作或 guest 等待状态。

`共同距离 = max(distanceA, distanceB)`，不得通过视觉暗示另一个人失败。

## 7. Copy whitelist

概念图只决定层级。生产实现只能使用规格、真实状态和本白名单。

### 7.1 标题与房间

- `你记得，我们在哪里`
- `两个人已到齐`
- `第 1 段，共 4 段`（数字由真实状态生成）
- `房主题包尚未准备`
- `房主题包已准备`
- `等待房主开始`

### 7.2 Host-only pack

- `使用虚构示例题包`
- `从本机选择私人 JSON`
- `本局按顺序使用前四张，其余 N 张忽略`
- `开始四段回忆`
- `重新选择文件`

### 7.3 Guessing

- 当前卡真实 `title`
- 当前卡真实 `clue`
- 当前卡可选 `era`
- `先把第一感觉留在地图上`
- `● 你的落点`
- `当前落点：北纬/南纬 N.N° · 东经/西经 N.N°`
- `缩小`
- `放大`
- `重置视图`
- `上`
- `右`
- `下`
- `左`
- `密封这枚落点`
- `提交后本轮不能修改`
- `本轮已经密封，不能修改`
- `等待对方留下第一感觉`
- `对方已密封`
- `先各自落点，揭晓后再聊`

### 7.4 Revealed

- `一起揭晓`
- `● 你 · N km`
- `◆ 对方 · N km`
- `★ 真正地点`
- `共同距离 · N km`
- 四个真实共同档位之一；
- 当前卡真实 `revealNote`；
- `你刚才先想起的是哪一幕？`
- `较远的一枚决定共同距离，不比较输赢`
- `下一段回忆`
- `等待房主开启下一段`
- `Made with Natural Earth`

### 7.5 明确禁止

- `赢家`
- `输家`
- `第一名`
- `得分`
- `排行榜`
- `默契率`
- `拖后腿`
- `你更准`
- `对方更准`
- `GPS`
- `定位到我`
- `搜索地点`
- `上传题包`
- `保存题包`
- 国家名、城市名、地址与国旗。

## 8. Desktop composition

### 8.1 Guessing

- 顶部是一条书眉，不是导航 dashboard；
- 暖纸线索横跨上方；
- 地图占约 70%；
- 自己的 pin 是地图唯一 marker；
- 当前坐标、缩放、重置与微调在一条开放底轨；
- 密封是唯一主按钮；
- 不渲染 target 星、对方菱形、距离与结果；
- host File Picker 不随游戏进入回合页。

### 8.2 Revealed

- 地图占约 65%；
- 右侧只有一张复盘纸页；
- 三枚 pin 及两条线进入地图；
- 个人距离与共同距离位于一条连续横带；
- host 的 `下一段回忆` 是唯一主动作；
- 访客桌面版同位置改为不可交互的等待文案；
- 地图缩放/重置可保留为次级操作，不允许改 pin。

## 9. Responsive contract

### 9.1 320–599px

- 单列自然文档流；
- 12–16px 页面边距；
- 地图宽度不超过可用视口；
- 不允许页面水平滚动；
- 线索纸、地图、控制、结果带、复盘纸依次排列；
- 缩放按钮三等分；
- 微调按钮使用可理解的十字排列；
- 每个按钮至少 48×48px；
- 密封按钮全宽但不固定在遮挡地图的 viewport 底部；
- revealed 结果带允许换行，但不拆成统计卡；
- 页面允许纵向滚动；
- 390×844 可完成整轮；
- 320px 仍保持完整按钮文字。

### 9.2 600–959px

- 地图优先占满上方；
- 控制带在地图下方；
- revealed 的复盘纸可与结果带并排或随后排列；
- DOM 顺序仍按线索 → 地图 → 控制/结果 → 复盘。

### 9.3 960px 以上

- 最大内容宽度约 1440px；
- guessing 地图约 70%；
- revealed 地图约 65%，复盘纸约 35%；
- 不让地图无限放大；
- 1280×800 第一视口显示当前核心动作；
- 桌面文字不压缩到移动字号。

### 9.4 200% zoom

- 按窄屏单列合同重排；
- 无双向滚动；
- 地图获得自身缩放/平移，不用页面横滚；
- 结果带换行；
- 复盘纸自然增高；
- 焦点环不被 `overflow` 裁切。

## 10. Keyboard contract

- Tab 可依次到地图、缩放、重置、微调、密封与下一阶段；
- Enter/Space 激活原生按钮；
- 地图获得焦点后，方向键移动自己的未提交 pin；
- 普通方向键每次 `0.5°`；
- Shift + 方向键每次 `0.1°`；
- input、file input、button 或可编辑元素中的方向键不被全局劫持；
- 未放置 pin 时，方向键按规格选择确定的起始点或给出说明，不能静默失败；
- submitted/revealed 后方向键不改 pin；
- 阶段切换焦点移到新阶段标题；
- Escape 不取消密封、不清局、不离房；
- map 的 AX 名称包含当前自己的粗略坐标与编辑状态。

## 11. Touch and pointer contract

- 地图第一次 tap 放置 pin；
- 未密封前再次 tap 移动 pin；
- pin 可 pointer drag；
- active map 才设置 `touch-action: none`；
- 页面其他区域保持纵向滚动；
- 使用 pointer capture；
- `pointerup`、`pointercancel` 和 `lostpointercapture` 都释放；
- 提交后不再建立拖动；
- 无 hover 才能看见的关键信息；
- 所有按钮和 marker 操作目标至少 48×48px；
- 双指缩放不是首版必需；
- 拖动有四向按钮与键盘等价路径。

## 12. Motion and reduced motion

允许的动效：

- 未提交 pin 的短距离落下；
- revealed 两条连接线同时出现；
- revealed 后视口 fit 三点；
- 阶段纸页的轻微淡入。

禁止：

- pin 连续弹跳；
- 星光粒子；
- 地图自动漂移；
- 倒计时；
- 视差；
- 闪烁；
- 胜利烟花。

`prefers-reduced-motion: reduce`：

- pin 直接到最终位置；
- 连线直接出现；
- fit 视口即时完成；
- 纸页不位移；
- reducer 与协议状态不依赖动画事件；
- 状态仍由文本和形状完整表达。

## 13. Forced colors and non-color information

- `● 你`、`◆ 对方`、`★ 真正地点`始终显示文字；
- forced colors 使用系统 Canvas、CanvasText、ButtonBorder、Highlight；
- pin 使用不同 path，不只换 fill；
- 两条连接线使用实线/虚线区分；
- focus 使用系统 Highlight；
- 地图陆地与海面至少通过边界线区分；
- `aria-live="polite"` 只播报连接、提交、对方已提交、揭晓和终局；
- 拖动每一帧不播报。

## 14. Privacy contract

### 14.1 Private pack

- 只在 host 页面显示 File Picker；
- 文件先检查 `File.size` 再 `File.text()`；
- 原始文本解析后立即丢弃引用；
- 文件只驻留 host 标签页内存；
- 不上传 Node；
- 不广播完整 pack；
- 不写 localStorage、sessionStorage、IndexedDB、Cookie 或文件；
- 不显示绝对路径；
- 不 console 输出 pack；
- 不把文件对象挂到全局；
- reset、host change、member change、disconnect、leave、refresh 全部清除；
- 浏览器/操作系统最近文件记录不属于本作可清除范围。

### 14.2 Room and sealed point

- 两人的落点会发送给房主电脑上的本机 Node 裁判；
- 收齐后才发给两位玩家；
- 不是端到端加密；
- 只用于可信设备和局域网；
- 房间码不是密码；
- 不承诺防开发者工具、窥屏或房主记住答案；
- 不提供公网、账号、分享链接或历史记录。

### 14.3 Runtime assets

- 生产页只读取本地派生 Natural Earth land；
- 不访问 GitHub、Natural Earth 网站、在线瓦片、CDN 或字体；
- 四张概念 PNG 只在 `docs/assets`，生产页面不得加载；
- 不申请 GPS、相机、麦克风、剪贴板或通知权限。

## 15. Map and data contract

生产地图必须：

- 使用 `experiences/co-op/our-place-guess/assets/ne-110m-land.min.geojson`；
- 来源为 Natural Earth v5.1.2；
- 固定 commit `f1890d9f152c896d250a77557a5751a93d494776`；
- 派生输出 SHA-256
  `54f84f3d2eac224a46f10010c4a1a8446331a35711ccced0e1905e13e574f148`；
- 只绘制物理陆地；
- 不绘制行政边界、国家、城市、道路或标签；
- 使用冻结的等距圆柱投影；
- marker 由 reducer state 的真实经纬度投影；
- 连线由真实 marker 与 target 计算；
- 距离由 haversine 计算，不用像素距离；
- 结果 fit 使用真实三个点；
- `Made with Natural Earth` 用 code-native 文本排版。

## 16. Generation hallucination ledger

以下全部是概念占位或生成幻觉，不能成为生产数据或 copy 来源。

### 16.1 四张 active 图共有

| 图中内容 | 判定 | 生产合同 |
|---|---|---|
| 世界陆地轮廓 | Image Gen 近似，不是固定 Natural Earth 派生资产 | 从本地 `ne-110m-land.min.geojson` 实时 SVG 渲染 |
| 经纬网与数值排版 | 构图占位，刻度不保证与 spec 完全一致 | 由冻结投影和 code-native SVG/CSS 生成 |
| 纸纹、地图压纹 | 概念质感 | 用 CSS 低对比纹理或原创资产，不裁切 PNG |
| `Made with Natural Earth` 的位置、字号和字形 | 概念排版 | 使用真实 DOM 文本与生产 attribution |
| 示例题面“借来的蓝色雨伞”、线索与“春末” | 虚构示例占位 | 从当前 reducer `card` 实时渲染，不硬编码截图文案 |
| 暖纸信件文案 | 当前示例 `revealNote` 占位 | 仅 revealed 从当前真实卡片渲染 |

### 16.2 Guessing 图

| 图中内容 | 判定 | 生产合同 |
|---|---|---|
| `北纬 34.6° · 东经 12.3°` | 概念坐标，不是 target，也不保证与图中 pin 像素严格对应 | 从自己的当前 point 实时格式化 |
| 圆形 pin 的具体地图位置 | 构图占位 | 从自己的 reducer state 投影 |
| 桌面密封按钮的叶片蜡印 | 生成装饰，不是冻结 icon | 使用无星双圆环原创 SVG |
| 桌面小号提示可能存在字形误差 | 生成文字不可作为产品 copy | 使用 copy whitelist 的 code-native 文字 |
| 移动图的经纬度标签与陆地细节 | 生成地理近似 | 由本地几何和投影生成 |

guessing 的 active 图经单点修正后没有星形 target icon。任何未来实现若在
guessing DOM 中出现 target 星、对方菱形、对方坐标或结果，即使是透明/隐藏，
都属于 hard fail。

### 16.3 Revealed 图

| 图中内容 | 判定 | 生产合同 |
|---|---|---|
| `184 km`、`126 km`、`共同距离 184 km` | 纯概念占位 | 从当前两份 sealed point 与 target 用 haversine 实时计算 |
| 三枚 pin 的具体地理位置 | 与示例公里数明显不一致的生成幻觉 | 从真实 reducer result 投影，绝不照抄 |
| 两条连线 | 不是实际大圆或真实坐标证明 | 由真实 marker/target code-native 绘制 |
| `方向一直在` | 只在真实 `jointDistance <= 200 km` 时成立 | 用 `tierForDistance` 实时选择 |
| 桌面纸页上的当前信件 | 示例当前卡占位 | 从当前 revealNote 渲染，不暴露未来卡 |
| 桌面地图的放大/缩小/fit 图标 | 概念图标，部分可读性未冻结 | 用带名称的原创 SVG 原生按钮 |
| 移动图首次生成的弯曲地图 | 已否决的投影幻觉 | active 图已修正为矩形；生产严格等距圆柱 |
| 移动图原始复盘纸上的罗盘星章 | 已删除的多余装饰 | active 图无此装饰 |
| 等待状态的沙漏 | 只表达等待，不表示倒计时 | 可用静态状态图标；不得产生计时语义 |

特别禁止：

- 照抄图中 34.6/12.3；
- 照抄 184/126 km；
- 照抄三枚 pin 的像素位置；
- 照抄连接线；
- 把图片中的假地理位置当示例 target；
- 把 `Made with Natural Earth` 截成图片；
- 把四张 PNG 当地图或 UI 背景。

## 17. Open-source and visual independence

### 17.1 Natural Earth

- v5.1.2；
- commit `f1890d9f152c896d250a77557a5751a93d494776`；
- `ne_110m_land.geojson`；
- public domain；
- 生产使用仓库内确定性派生资产；
- 概念图中的世界轮廓不是 Natural Earth 资产，不进入运行时。

### 17.2 Posio

- `abrenaut/posio`；
- commit `00262568749fa841994f4c7d6d9a8c75115955d7`；
- MIT；
- Copyright (c) 2024 Arthur Brenaut；
- 只研究多人地图落点、揭晓目标、计算距离和同步回合这一抽象问题。

本视觉不复制 Posio 的：

- UI；
- 布局；
- 地图样式；
- 配色；
- 图标；
- 文案；
- 题库；
- 截图；
- Django/Redis/Leaflet 技术栈。

### 17.3 Generated concept

四张 active 图由内置 `imagegen` 独立生成，没有输入参考图。它们是 review-only
概念规格，不是第三方生产资产。用户确认后，生产 SVG/CSS/DOM 仍需独立实现。

## 18. Future fidelity ledger

当前没有生产 UI，render evidence 全部待实现。概念图本身不能代替浏览器证据。

| 比较点 | 概念证据 | 生产目标 | 未来证据 | 状态 |
|---|---|---|---|---|
| 容器模型 | 一张地图、单条带、单张纸 | 无 dashboard/bento/card sea | screenshot | 待实现 |
| 桌面 guessing 重心 | 地图约 70% | 地图是唯一主焦点 | 1280×800 screenshot | 待实现 |
| 桌面 revealed 重心 | 地图约 65% + 一张复盘纸 | 不堆统计卡 | screenshot | 待实现 |
| 移动重排 | 单列自然流 | 390/320 无横向滚动 | viewport metrics | 待实现 |
| Guessing secret | 一枚圆形 pin | DOM/消息/AX 无 target/对方点 | DOM + Network audit | 待实现 |
| Revealed markers | 圆、菱形、星 | shape/text/outline/color 四重编码 | screenshot + AX | 待实现 |
| Pin 数据 | 概念占位 | reducer point 实时投影 | state + SVG attrs | 待实现 |
| 距离 | 184/126 为占位 | haversine 实时计算 | logic state + DOM | 待实现 |
| 共同结果 | max 视觉层级 | jointDistance = max(A,B) | reducer + DOM | 待实现 |
| 个人同权 | 同字号横带 | 不排序、不奖牌 | copy/style audit | 待实现 |
| Host pack | active gameplay 图不出现 | 只在 host view 创建 File Picker | 双端 DOM diff | 待实现 |
| Guest privacy | 无文件相关 UI | 无文件名/pack/target | guest DOM/Network | 待实现 |
| Submitted lock | 密封按钮明确后果 | 提交后不可改 | interaction trace | 待实现 |
| Map source | 生成轮廓只作构图 | 本地固定 Natural Earth asset | Network + source hash | 待实现 |
| Projection | active 移动 reveal 为矩形 | 等距圆柱 | SVG geometry | 待实现 |
| Copy | 生成文字只作层级 | 白名单 + reducer state | above-fold diff | 待实现 |
| 触控 | 大号控制 | 全部 ≥48×48px | bounding boxes | 待实现 |
| 键盘 | 十字微调 | 0.5° / Shift 0.1° | keyboard trace | 待实现 |
| Focus | 地图和按钮可见环 | 不裁切、阶段合理 | keyboard screenshot | 待实现 |
| Reduced motion | 静态终态可理解 | 无必要位移动画 | media emulation | 待实现 |
| Forced colors | 三种形状 | 系统色仍可辨 | forced-colors screenshot | 待实现 |
| Attribution | 概念排版 | code-native `Made with Natural Earth` | DOM + screenshot | 待实现 |
| Network | 无第三方视觉 | 仅本机 host/Socket.IO/local files | request log | 待实现 |

## 19. Future browser acceptance

用户确认后，生产阶段至少需要：

1. host/guest 两个浏览器上下文；
2. 1280×800 desktop guessing；
3. 1280×800 desktop revealed；
4. 390×844 mobile guessing；
5. 390×844 mobile revealed；
6. 320px reflow；
7. 200% zoom；
8. keyboard-only round；
9. pointer/touch round；
10. reduced motion；
11. forced colors；
12. Network origin audit；
13. guest DOM/AX/console secret audit；
14. host-only File Picker diff；
15. accepted concept 与最新 browser screenshot 同次 `view_image`；
16. 完成本 fidelity ledger 的每一项。

## 20. Exact generation prompts

### 20.1 Desktop guessing

```text
Use case: ui-mockup
Asset type: complete desktop primary gameplay concept, review-only visual specification for a local-LAN two-person cooperative HTML game
Primary request: Design a full 1440×900 desktop GUESSING phase for the Chinese game “你记得，我们在哪里”. Both players see one shared fictional memory clue, but this screen shows only the current user's own editable guess. The target and the other player's coordinates must not exist anywhere in the interface.
Scene/backdrop: one large flat midnight paper atlas on a deep ink-blue table, subtle paper fibers and embossed latitude/longitude rules. No browser chrome, no photo, no external brand.
Subject: a dominant low-detail world land silhouette map without country borders, city labels, roads, tiles, flags or political boundaries. Exactly ONE visible coral circular pin labeled as the user's own guess. No star, no diamond, no hidden target marker, no second pin, no result lines, no distance-to-target and no opponent coordinate. Above the map, a restrained margin note shows the current clue. Beside or below the map, a compact open control strip shows current own coordinates, zoom minus/plus/reset, four direction micro-adjust buttons and one primary seal button. A thin top line contains title, room status and round progress; it is not a dashboard.
Style/medium: senior product designer UI mockup, distinctive nocturne paper map, editorial and intimate, flat ink and enamel details, practical HTML/CSS/SVG implementation, low-to-medium density, generous breathing space, no nested cards.
Composition/framing: full viewport landscape. Map is about 70% of the surface. Clue is a single margin-note band, controls are one open footer rail. No sidebar full of panels. All important content is visible without scrolling.
Lighting/mood: quiet night journey, calm and trusting, matte rather than glowing.
Color palette: deep ink #0B1826, atlas sea #102838, land sage #AFC3BC, old gold grid #C69A53, warm paper #F2E8D5, coral own pin #EF786B, cyan only reserved for future opponent state, pale gold reserved for future target. High contrast, flat colors, no neon.
Materials/textures: matte paper, fine engraved lines, small enamel pin, one wax-pencil annotation stroke; subtle shadow only beneath the atlas.
Text (verbatim, Chinese; render only this whitelist and no other visible words): “你记得，我们在哪里” “两个人已到齐” “第 1 段，共 4 段” “借来的蓝色雨伞” “雨停以后，我们沿着一条很长的河慢慢走回去。” “春末” “先把第一感觉留在地图上” “● 你的落点” “当前落点：北纬 34.6° · 东经 12.3°” “缩小” “放大” “重置视图” “上” “右” “下” “左” “密封这枚落点” “提交后本轮不能修改” “先各自落点，揭晓后再聊”
Interaction clarity: the map is focusable; the own circular pin is editable; the primary seal button is obvious but not oversized. Zoom and four micro-adjust buttons are at least 48 CSS px. Show one visible focus ring around the map. Buttons are code-native in future.
Privacy contract: this is not the host pack setup. Do not show file picker, file name, pack title, card list, target, target coordinates, reveal note, future cards, opponent pin, opponent coordinates, result, distance, winner, score or rank. Do not hide forbidden information behind blur, opacity, folds, metadata or decorative layers; it must be absent.
Constraints: concept image only; future map uses local Natural Earth physical land geometry and all UI text/controls/pins are code-native. The generated geography is composition-only and must not be reused as map data. No online map tiles, map provider logo, search field, GPS/location button, country/city labels, political borders, compass rose decoration, passport, boarding pass, dashboard, bento, card grid, glassmorphism, glow, gradients, neon, fake metrics, avatars, chat, microphone, save/history, watermark, or extra copy.
```

### 20.2 Desktop revealed

```text
Use case: ui-mockup
Asset type: complete desktop revealed-state concept, review-only visual specification for the same local-LAN two-person cooperative HTML game
Primary request: Design a full 1440×900 desktop REVEALED phase for “你记得，我们在哪里”, matching the nocturne paper-atlas system. Both sealed guesses are now revealed together with the true target. This is a cooperative reflection, never a winner screen.
Scene/backdrop: one large flat midnight paper atlas on a deep ink-blue table, subtle paper fibers and old-gold latitude/longitude rules. No browser chrome, no external brand.
Subject: dominant low-detail world physical land silhouette without political borders or labels. Show exactly three distinct code-native-style markers: coral circle “● 你”, cyan diamond “◆ 对方”, pale-gold star “★ 真正地点”. Draw two restrained lines from the two player markers to the star. To the right or below the map, one open result ribbon shows each person's distance and a larger shared result based on the worse distance. A single warm-paper reflection note contains the reveal note and one replay question. A thin top line shows title, room status and round progress. This is the host view, so exactly one primary “下一段回忆” action is present.
Style/medium: polished senior product designer UI mockup, distinctive nocturne paper map, editorial and intimate, matte ink, enamel pins and pencil lines, practical HTML/CSS/SVG implementation, no nested cards.
Composition/framing: full landscape viewport. Map remains about 65% of the surface and is still the focal point. The result ribbon is one continuous band, not three statistic cards. Reflection note is one quiet margin sheet. All important content visible without scrolling.
Lighting/mood: warm reveal after a quiet night journey, reflective and encouraging, no celebration confetti and no glow.
Color palette: deep ink #0B1826, atlas sea #102838, land sage #AFC3BC, old gold grid #C69A53, warm paper #F2E8D5, coral own pin #EF786B, cyan opponent pin #5CBFC1, pale gold target #F2CE78. High contrast, flat colors.
Materials/textures: matte paper, fine engraved lines, enamel markers, pencil connection lines, restrained soft shadow.
Text (verbatim, Chinese; render only this whitelist and no other visible words): “你记得，我们在哪里” “两个人已到齐” “第 1 段，共 4 段” “借来的蓝色雨伞” “一起揭晓” “● 你 · 184 km” “◆ 对方 · 126 km” “★ 真正地点” “共同距离 · 184 km” “方向一直在” “这封明信片记住的是雨后，不是一座城市。” “你刚才先想起的是哪一幕？” “下一段回忆” “较远的一枚决定共同距离，不比较输赢” “Made with Natural Earth”
Information hierarchy: the shared tier phrase “方向一直在” is the emotional headline. Individual distances have equal visual weight and are never sorted. Shared distance is clearly max(184,126), with no medal, rank, winner, loser or score. The reflection question follows the result rather than competing with the map.
Interaction clarity: all pins use shape, label, border and color. The primary next-round button is at least 48 CSS px. Zoom/reset controls may be present as small secondary code-native controls but no guessing/editing controls remain.
Privacy contract: show only the current revealed card. No future cards, no private pack file name/path, no card list, no host File Picker, no full pack, no history and no sharing link.
Constraints: concept image only; future map uses local Natural Earth physical land geometry and all UI text/controls/pins/lines are code-native. Generated geography is composition-only. No online map tiles, provider logo, search, GPS, country/city labels, political borders, flags, passport, boarding pass, dashboard, bento, statistic cards, glassmorphism, glow, gradients, neon, fake metrics, avatar, chat, save/history, confetti, heart particles, watermark or extra copy. Do not imitate Posio UI.
```

### 20.3 Mobile guessing

```text
Use case: ui-mockup
Asset type: complete 390 CSS px mobile guessing-state concept, review-only responsive visual specification for the same local-LAN cooperative HTML game
Primary request: Design a full portrait mobile GUESSING phase at a 390×844 viewport for “你记得，我们在哪里”, matching the nocturne paper-atlas system. Show only this player's own editable guess. The true target and the other player's coordinates must be completely absent.
Scene/backdrop: a vertical midnight paper atlas on deep ink blue, matte paper fibers, old-gold latitude/longitude rules, no browser chrome.
Subject: compact top title and round progress; one warm-paper clue strip; one large low-detail world physical land silhouette map without borders, labels, roads or tiles; exactly ONE coral circular pin for the current user's guess. Beneath it, a compact own-coordinate line, zoom/reset row, four direction micro-adjust control and one full-width primary seal action. Keep normal page scrolling outside the active map.
Style/medium: polished mobile UI mockup by a senior product designer, distinctive night paper map, intimate editorial tone, flat ink and enamel detail, practical HTML/CSS/SVG implementation, no card stack.
Composition/framing: represent a 390×844 viewport in portrait. Single-column flow with safe 16px gutters. The map is the main focal point and all primary controls fit without horizontal scrolling. Do not shrink controls below touch size.
Lighting/mood: quiet, trusting and reflective, matte rather than glowing.
Color palette: deep ink #0B1826, atlas sea #102838, land sage #AFC3BC, old gold grid #C69A53, warm paper #F2E8D5, coral own pin #EF786B. Cyan and pale-gold markers are reserved and must not appear in guessing. High contrast, flat colors.
Materials/textures: matte paper, fine engraved lines, one small enamel pin, restrained shadow.
Text (verbatim, Chinese; render only this whitelist and no other visible words): “你记得，我们在哪里” “第 1 段，共 4 段” “借来的蓝色雨伞” “雨停以后，我们沿着一条很长的河慢慢走回去。” “春末” “先把第一感觉留在地图上” “● 你的落点” “当前落点：北纬 34.6° · 东经 12.3°” “缩小” “放大” “重置” “上” “右” “下” “左” “密封这枚落点” “提交后本轮不能修改”
Interaction clarity: map has a visible focus outline; own pin can be tapped or dragged before submission. Zoom/reset, direction micro-adjust and seal are code-native future buttons, each at least 48 CSS px. The seal action is primary. No hover dependency.
Privacy contract: this is a guest-compatible round screen, never host pack setup. No File Picker, pack file name, pack title, card list, private JSON, target, star, target coordinates, target distance, opponent pin, opponent coordinates, result, reveal note, future card, winner, score or rank. Forbidden information must be absent, not blurred or hidden.
Responsive/accessibility: minimum 16px body copy, no horizontal overflow, visible focus ring, map coordinate readable by assistive text, map touch-action only within active surface, normal vertical page scrolling elsewhere.
Constraints: concept image only; future map uses local Natural Earth physical land geometry and all text/controls/pins are code-native. Generated geography is composition-only. No online map tiles, provider logo, location/GPS button, search, labels, political borders, flags, compass rose, passport, boarding pass, dashboard, bento, nested cards, glassmorphism, glow, gradients, neon, avatar, chat, save/history, watermark or extra copy.
```

### 20.4 Mobile revealed

```text
Use case: ui-mockup
Asset type: complete 390 CSS px mobile revealed-state concept, review-only responsive visual specification for the same local-LAN cooperative HTML game
Primary request: Design a full portrait mobile REVEALED phase at 390×844 for “你记得，我们在哪里”, matching the nocturne paper-atlas system. Both guesses and the true target are visible together. This is a guest view: the next round is controlled by the host, so do not show an actionable next button.
Scene/backdrop: vertical midnight paper atlas on deep ink blue with matte paper fibers and old-gold latitude/longitude rules, no browser chrome.
Subject: compact top title and round progress; a large low-detail world physical land silhouette map without borders or labels; exactly three distinct markers on the map: coral circle for self, cyan diamond for partner, pale-gold star for true target, with two thin lines to the star. Below the map, one continuous result ribbon lists both equal-weight distances and the shared distance. Then one warm-paper reflection note shows the joint tier phrase, reveal note and reflection question. End with a small non-interactive waiting status for the host.
Style/medium: polished senior product designer mobile UI mockup, distinctive night paper map, intimate editorial tone, matte ink and enamel markers, practical HTML/CSS/SVG implementation, no dashboard or card stack.
Composition/framing: represent a 390×844 portrait viewport with single-column document flow and 16px gutters. Map remains primary. The result ribbon may wrap but must not become separate statistic cards. Full content may extend vertically as a realistic scroll surface, with no horizontal overflow.
Lighting/mood: warm reveal, shared remembrance, supportive and quiet, no celebration effects.
Color palette: deep ink #0B1826, atlas sea #102838, land sage #AFC3BC, old gold grid #C69A53, warm paper #F2E8D5, coral self #EF786B, cyan partner #5CBFC1, pale gold target #F2CE78. High contrast and flat colors.
Materials/textures: matte paper, engraved lines, enamel pins, pencil connection lines, restrained shadow.
Text (verbatim, Chinese; render only this whitelist and no other visible words): “你记得，我们在哪里” “第 1 段，共 4 段” “借来的蓝色雨伞” “一起揭晓” “● 你 · 184 km” “◆ 对方 · 126 km” “★ 真正地点” “共同距离 · 184 km” “方向一直在” “这封明信片记住的是雨后，不是一座城市。” “你刚才先想起的是哪一幕？” “较远的一枚决定共同距离，不比较输赢” “等待房主开启下一段” “Made with Natural Earth”
Information hierarchy: “方向一直在” is the emotional headline. Self and partner distances have equal visual weight and are never ordered as better/worse. Shared distance is visibly max(184,126). No winner, loser, score, medal, rank or relationship rating.
Interaction/accessibility: markers differ by shape, text, outline and color. Result view has zoom/reset as optional secondary controls only; no pin editing, micro-adjust or seal controls. Waiting host status is clearly non-interactive. All text minimum 16px and page can scroll vertically.
Privacy contract: show only the current revealed card and current round result. No future cards, no private pack, no host File Picker, no file name/path, no full pack, no history, no share link.
Constraints: concept image only; future map uses local Natural Earth physical land geometry and all text/controls/pins/lines are code-native. Generated geography and marker locations are composition-only; distances must be recomputed from real coordinates in production. No online map tiles, provider logo, search, GPS, political boundaries, country/city labels, flags, passport, boarding pass, dashboard, bento, statistic cards, glassmorphism, glow, gradients, neon, fake metrics, avatars, chat, save/history, confetti, watermark or extra copy. Do not imitate Posio UI.
```

### 20.5 Mobile guessing star-removal edit

```text
Use case: precise-object-edit
Asset type: review-only mobile guessing concept correction
Primary request: Change only the primary seal button at the bottom of the supplied mobile GUESSING screen. Remove the circular STAR seal icon entirely. Replace it with a simple non-star closed-ring wax-seal mark made of two concentric circles and one short horizontal seam; no star, diamond, target, compass, location marker, lock, medal or letter inside. Keep the exact button text “密封这枚落点” and “提交后本轮不能修改”. The button must still read as a sealing action, not as the true target.
Invariants: preserve the title, round, clue, exactly one coral own pin, rectangular world map, coordinate labels, zoom/reset buttons, four direction controls, colors, typography, spacing, paper textures and full portrait composition unchanged. Do not add any new visible text or marker.
Privacy: guessing must contain no pale-gold star anywhere and no target/opponent/result information.
Avoid: no star shape, no target metaphor, no compass rose, no extra icon, no new copy, no watermark.
```

### 20.6 Mobile revealed projection edit

```text
Use case: precise-object-edit
Asset type: review-only mobile revealed concept correction
Primary request: Change only the map projection and one decorative stamp in the supplied mobile REVEALED screen. Replace the curved/bowed world map frame and curved graticule with a strictly rectangular equirectangular map: straight horizontal latitude lines, straight vertical longitude lines, rectangular boundary, full world from -180° to 180° and -80° to 80°. Keep the same approximate map height and all three markers plus their two connection lines inside the rectangular map. Remove the compass/star stamp from the warm reflection note; leave that area plain paper.
Invariants: preserve title, round, clue title, “一起揭晓”, exactly three marker shapes and colors, continuous result ribbon, all distances, shared tier, reveal note, reflection question, host waiting status, Made with Natural Earth line, nocturne paper palette, typography, spacing and full portrait composition. Do not add new text or controls.
Important: marker positions and displayed distances remain concept-only; do not try to infer real geography. The visual map must nevertheless use the frozen rectangular equirectangular container model.
Avoid: no curved projection, globe, perspective map, compass rose, decorative star outside the actual target marker, political boundaries, labels, tiles, watermark or new copy.
```

### 20.7 Desktop revealed compass-removal edit

```text
Use case: precise-object-edit
Asset type: review-only desktop revealed concept correction
Primary request: Remove only the decorative compass rose in the lower-left corner of the supplied desktop REVEALED screen. Keep the text “Made with Natural Earth” in the same lower-left area, aligned cleanly without any icon. Do not alter the map, markers, lines, result ribbon, note, controls, button, copy, colors, texture, spacing or full composition.
Avoid: no compass rose, navigation icon, extra star, new decoration, new text or watermark.
```

## 21. User confirmation Gate

在用户明确确认之前，本提案保持 review-only。

请确认是否以以下四个 active hash 对应的 **夜行纸图** 方向作为生产视觉基线：

- desktop guessing：
  `e7e37b09b9d61aca54186459fd5f9f187088820871353d75438a3598b88f6b5d`
- desktop revealed：
  `b87b861ba2eabc8f4e2be4cb1b49947253534abd0c575226e565444d02488076`
- mobile guessing：
  `fcdf0d191cbce9df7906fe75f2b5ab2b43e237de82a4151465525deea68b51ee`
- mobile revealed：
  `b2967d3935241788c9f46e14582cb9d04ba9aed97a36079987e4135ad5edd15e`

确认的是：

- 深墨纸地图、旧金经纬网与暖纸批注；
- 一张地图而非 dashboard；
- guessing 只有自己的一枚圆形 pin；
- revealed 才出现圆/菱形/星与共同结果；
- 两人距离同权重、共同距离为主；
- 桌面展开、移动单列；
- host-only File Picker；
- 48px 控件、键盘/触控等价路径；
- code-native 地图、pin、连线、文字与结果。

确认不包括：

- 图片中的 34.6/12.3；
- 184/126 km；
- 三枚 pin 的像素位置；
- 连接线；
- 生成的世界轮廓；
- 示例题面与信件文案；
- `Made with Natural Earth` 的具体图片排版；
- 任何 Image Gen 文字字形或地理细节。

如不确认，请优先指出一个要调整的维度：

- 色温；
- 地图占比；
- 纸张质感；
- 三枚 pin；
- 结果横带；
- 复盘纸页；
- 移动端密度；
- host/guest 状态层级。

**必须用户确认后才可生产实现。**
