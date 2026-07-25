# Memory Merge Board visual design proposal

- 日期：2026-07-25
- 候选 ID：`memory-merge-board`
- 对外名称：把小事，合成我们的故事
- 分类：`co-op`
- 等级目标：A
- 依据：
  - `docs/322-memory-merge-board-research.md`
  - `docs/323-memory-merge-board-brainstorm.md`
  - `docs/324-memory-merge-board-spec.md`
  - `docs/325-memory-merge-board-plan.md`
- 阶段：**仅供用户确认的视觉提案**
- 生产实现：**尚未授权**

## 1. 结论先行

本提案把 `memory-merge-board` 定义为一张两个人共同整理的冷色剪贴簿，而不是
数字合并棋盘或游戏 dashboard。

核心视觉选择是：

1. 4×3 共享拼板始终是唯一主焦点。
2. 桌面使用“共享页 + 开放操作轨”，移动端使用连续单列纸页。
3. 角色以左右页边书签表达，不使用头像、账号或玩家分数。
4. 候选是两张公开长纸签，来向落点是棋盘边缘的空纸槽。
5. 章节以横向书签进入“共同相册”，不表现为数字升级。
6. 每个 reducer phase 只突出当前合法动作，不把所有控制同时做成活跃 dashboard。
7. 使用冷雾蓝、深墨蓝与四个原创主题色，明确避开参考项目的奶油/棕色数字盘。

这两张图片只是用户确认构图、气质与信息层级的概念规格：

- 不得作为生产页面截图嵌入；
- 不得把图内文字当成产品数据；
- 未来按钮、标签、状态、符号和棋盘必须用 code-native HTML/CSS/JavaScript
  与原创 SVG 实现；
- 只有用户明确确认后，才能开始生产 UI。

## 2. 概念图清单与完整性

| 视图 | 文件 | 原始尺寸 | SHA-256 | 目的 |
|---|---|---:|---|---|
| 桌面 choose phase，active v2 | [`desktop-choose-concept-v2.png`](./assets/memory-merge-board/desktop-choose-concept-v2.png) | 1586×992 PNG RGB | `d165a490544710574e3e5f8b7cd060a8a050042c58ec6c36517e8b001ec7dd06` | 确认桌面主拼板、共同相册、双角色、两张公开候选与只读来向摘要的层级 |
| 390px 移动 place phase | [`mobile-place-concept.png`](./assets/memory-merge-board/mobile-place-concept.png) | 853×1844 PNG RGB | `5c35f7c91e02b1accbfa6a0518a089511ca3d4740a422d19c73baea19ec02f3e` | 确认单列重排、右侧来向落点、候选选中态、禁用方向控制与触控尺度 |

首轮桌面图
[`desktop-choose-concept.png`](./assets/memory-merge-board/desktop-choose-concept.png)
（1586×992，SHA-256
`d9702f7c66c9a328caeb37586b2ef5ad2c27b08a48c30c1026cf8c1995a2d960`）
因为在 `choose` phase 同时画出了可操作方向十字而被 **superseded**。它只保留为
生成审计证据，不得用于用户批准、生产实现或 fidelity 对照。

移动图是 390 CSS px 手机视口的构图提案，不声称图片像素恰好为浏览器的
390×844 截图。生产验收必须另外在真实 390×844 与 spec 要求的 320×800
视口取浏览器截图。

两张 active 图均通过内置 `imagegen` 生成，并使用 `view_image` 的 `original`
模式逐张检查。它们没有采用外部品牌、上游截图、上游视觉素材或第三方字体。

## 3. 完整设计方向

### 3.1 主题范式

主题名：**冷雾蓝共同剪贴簿**。

它不是复古日记，也不是儿童手账。纸张、缝线和书签只提供亲密、可触摸的语义，
整体仍保持现代、克制、清晰：

- 纸面接近冷白，不使用奶油白；
- 外部桌面为冷雾蓝，不使用棕色木桌；
- 只有一本主剪贴簿，不铺满浮动卡片；
- 装饰叶片、纸纹和缝线控制在低对比层；
- 不使用爱心雨、情侣头像、婚姻符号或关系等级；
- 不使用霓虹、玻璃拟态、渐变光晕和游戏 HUD。

### 3.2 容器模型

允许的容器：

- 一张主纸页；
- 开放棋盘槽；
- 横向相册书签轨；
- 左右角色书签；
- 两张候选纸签；
- 方向十字；
- 章节分享底部纸页；
- 结果页展开的相册带。

禁止的容器：

- 多层嵌套圆角卡片；
- bento 网格；
- 指标卡；
- 侧栏 dashboard；
- Score/Best 盒子；
- 模态框套模态框；
- 每一个提示都包独立卡片。

### 3.3 首屏重心

桌面首屏按约 65/35 分配：

- 65%：共同相册、角色书签、4×3 拼板；
- 35%：当前阶段标题、两张公开候选、方向控制、隐私短句。

右侧不是固定 dashboard，而是与主纸页同一桌面上的开放操作轨。进入 `share`
时，这条操作轨被同尺寸分享纸页替换；进入 `place` 时，候选缩为已选摘要，主强调
转移到棋盘来向边缘。

移动端不保留左右栏：

1. 标题与共同相册；
2. 双角色书签；
3. 4×3 拼板；
4. 当前阶段说明；
5. 候选或分享；
6. 方向控制或落点说明；
7. 隐私短句。

## 4. 视觉 token

### 4.1 颜色

| Token | 值 | 用途 |
|---|---|---|
| `--paper-desk` | `#EAF1F3` | 页面外部冷雾蓝底 |
| `--paper` | `#FCFDFC` | 主纸页，锁定为冷白 |
| `--ink` | `#18313A` | 主文字、细线与图标 |
| `--ink-muted` | `#526A72` | 次级说明 |
| `--line` | `#A9BDC3` | 纸槽、分隔与禁用边界 |
| `--focus` | `#245DFF` | 高对比焦点环 |
| `--place` | `#6D7FC2` | 地点主题，蓝紫 |
| `--taste` | `#56A69E` | 味道主题，海沫绿 |
| `--sound` | `#E66F65` | 声音主题，珊瑚红 |
| `--care` | `#C89245` | 照顾主题，赭金 |
| `--disabled` | `#D7E1E4` | 非当前 phase 控件 |
| `--error` | `#A33E45` | 友好错误文本，不用于责备 |

颜色不是主题的唯一编码。四主题还必须分别拥有：

- 地点：路标/路径符号 + 双线折角边；
- 味道：杯与蒸汽符号 + 波浪缝线；
- 声音：声纹/音符符号 + 短划缝线；
- 照顾：缝补/双手符号 + 交叉针脚。

### 4.2 字体

不新增字体依赖，不使用网络字体。

| 层级 | 建议系统栈 | 桌面 | 移动 | 说明 |
|---|---|---:|---:|---|
| 页面标题 | `Songti SC`, `STSong`, `Noto Serif CJK SC`, serif | 36–44px | 26–30px | 适量书卷感，字重 600 |
| 视图/阶段标题 | 系统无衬线中文栈 | 22–26px | 20–22px | 字重 650 |
| 棋盘主标签 | 系统无衬线中文栈 | 16–18px | 15–16px | 不低于 15px |
| 控件文字 | 系统无衬线中文栈 | 16px | 16px | 显式设置，不继承浏览器默认 |
| 说明/状态 | 系统无衬线中文栈 | 14–16px | 16px | 移动端不缩小隐私和状态文字 |

中文标点、阶段中点和空格必须来自真实 DOM copy，不从概念图取字形。

### 4.3 间距与几何

- 基础间距：4、8、12、16、24、32、48px；
- 页面安全边距：桌面 32–48px，移动 16px，320px 下 12px；
- 触控目标：最小 44×44px；
- 焦点外扩：3px，额外 2px offset；
- 主纸页圆角：0–8px，避免大胶囊；
- 候选纸签圆角：4–8px；
- 棋盘槽之间：8–12px；
- 阴影：仅主纸页一层低对比阴影；
- 边线：1–2px，缝线可以虚线，但不能让文字低对比；
- 棋盘保持 4 列 × 3 行，不变成 4×4；
- 格子可接近方形，但整体主板不锁定 500px 正方形。

### 4.4 图标

所有生产图标为原创内联 SVG 或 CSS 线条，不使用生成图裁切：

| 图标 | 语义 | 风格 |
|---|---|---|
| 四方向箭头 | 滑动方向 | 2px 圆端描边，`currentColor` |
| 来向箭头 | 可补页边缘 | 粗于普通方向箭头，指向棋盘内 |
| 路标/路径 | 地点 | 线性、双折角 |
| 杯与蒸汽 | 味道 | 线性、波浪 |
| 声纹 | 声音 | 线性、短划 |
| 缝线/双手 | 照顾 | 线性、交叉针脚 |
| 书签 | 角色/章节 | 扁平纸签，不使用用户头像 |

不使用纯文字箭头字符代替 SVG；辅助文字仍需明确说出方向。

## 5. phase 可见性合同

视觉实现必须服从 reducer，而不是根据概念图自由组合。

| Phase | 主焦点 | 可见且可用 | 可见但禁用/收起 | 不出现 |
|---|---|---|---|---|
| `slide` | 方向选择 | 四方向按钮、棋盘滑动区 | 候选只作下一步预览 | 落点按钮、分享按钮 |
| `choose` | 两张公开候选 | 两张候选按钮 | 只读的本轮方向摘要 | 四方向按钮、落点按钮、分享按钮 |
| `place` | 来向边缘空位 | 合法落点按钮、已选候选摘要 | 四方向按钮明确禁用 | 未选候选的再次选择、分享按钮 |
| `share` | 当前章节提示 | `说好了，继续`、`这题先留白` | 棋盘可作为静态背景，不可交互 | 候选、落点、方向交互 |
| `won` | 共同相册 | 重开、换页、回到开始 | 棋盘只读 | 分数、排名、个人贡献 |
| `lost` | 友好恢复 | 重开、提示、换页 | 棋盘只读 | 责备文案、倒计时 |

### 5.1 桌面概念状态

桌面图以 `choose` 为主：

- 第一张候选有清晰焦点环；
- 两张候选都公开；
- 不出现方向十字或任意方向按钮；
- `本轮已向左整理` 是不可聚焦、不可点击的只读历史；
- 主棋盘与相册仍可读，但不抢候选焦点；
- 页面底部只保留一条隐私短句。

### 5.2 移动概念状态

移动图以 `place` 为主：

- `地点 · 碎片` 为已选摘要；
- 右侧来向边缘有两个空位；
- 第一个空位具有清晰焦点环；
- 方向十字为禁用态；
- 不提供额外“确认放置”按钮，点击合法空位即提交。

### 5.3 章节分享态

分享态不再额外生成概念图，因为其结构完全由同一 token 系统确定：

- 桌面：右侧操作轨替换为一张单一分享纸页；
- 移动：棋盘之后插入一张自然流式纸页，不使用遮住全屏的固定 modal；
- 标题为对应主题的 `地点 · 章节` 等；
- 一条原创分享提示；
- 两个同权重按钮：
  - `说好了，继续`
  - `这题先留白`
- 留白无灰化、警告或损失提示；
- 两个按钮派发同一个规则动作；
- 背后棋盘不可交互；
- 关闭不靠点击遮罩，避免误跳过。

## 6. 可见 copy 白名单

图片文字存在生成误差，生产实现只能使用这里及 spec 中冻结的文案。

### 6.1 全局

- `把小事，合成我们的故事`
- `共同相册`
- `这一页`
- `只说给身边的人听。这个页面不会录音、保存或上传你们的回答。`
- `页面不会记录`

### 6.2 角色

- `左边的人 · 整理者`
- `右边的人 · 补页者`
- `左边的人 · 补页者`
- `右边的人 · 整理者`

### 6.3 主题与阶段

- `地点`
- `味道`
- `声音`
- `照顾`
- `碎片`
- `片段`
- `故事`
- `章节`

组合格式固定为 `主题 · 阶段`，例如 `地点 · 碎片`。

### 6.4 当前动作

- `选择方向`
- `上`
- `右`
- `下`
- `左`
- `选下一张线索`
- `本轮已向上整理`
- `本轮已向右整理`
- `本轮已向下整理`
- `本轮已向左整理`
- `从右边补进来`
- `从左边补进来`
- `从上边补进来`
- `从下边补进来`
- `选择一个亮起的位置`

### 6.5 分享与结果

- `说好了，继续`
- `这题先留白`
- `再整理这一页`
- `换一页`
- `回到开始`
- `这一页暂时排不下了。你们可以从开头再整理一次。`
- `从本关开头再来`
- `看看第一步提示`

### 6.6 明确禁止

- `2048`
- `Score`
- `Best`
- `最高分`
- `默契分`
- `灵魂伴侣指数`
- `连击`
- `倒计时`
- `玩家一`
- `玩家二`
- 任何数字价值、排名、随机概率、保存或上传状态。

## 7. 响应式合同

### 7.1 320–599px

- 单列自然文档流；
- 12–16px 页面边距；
- 棋盘宽度为可用视口宽度，不设置造成横向滚动的最小宽度；
- 4 列不改变；
- 角色书签可并排，文字空间不足时各占一行，但 DOM 顺序保持左、右；
- 两张候选优先并排；在 320px 或 400% 缩放下改为纵向；
- 四方向使用 3×3 十字，不把中心做成第五个可点击动作；
- 合法落点直接覆盖空棋盘槽的按钮语义，不再在棋盘外增加一排小按钮；
- 页面允许纵向滚动；
- 关键文字不使用固定高度裁切。

### 7.2 600–959px

- 共同相册横跨顶部；
- 棋盘与动作区允许两列；
- DOM 阅读顺序仍为相册 → 角色 → 棋盘 → 当前动作；
- 不用 CSS `order` 把视觉顺序与键盘顺序拆开。

### 7.3 960px 以上

- 最大内容宽度约 1180–1280px；
- 共享页与动作轨约 65/35；
- 棋盘不会无限放大；
- 1440×900 第一视口必须看到完整棋盘、当前动作和隐私短句。

### 7.4 400% 缩放

- 按 320 CSS px 重排标准处理；
- 不出现双向滚动；
- 相册轨允许换行；
- 分享纸页随文档流增长；
- 焦点环不被纸页 `overflow` 裁剪；
- 所有操作仍有可见文字，不依赖仅图标。

## 8. 键盘、触控与焦点合同

### 8.1 键盘

- `slide` phase 才响应 `ArrowUp/Right/Down/Left`；
- 方向键在 button、input、textarea、select 或 editable 内不被全局劫持；
- 忽略 `event.repeat`；
- 实际处理时才 `preventDefault()`；
- Tab 进入当前 phase 的第一个合法动作；
- Enter/Space 使用原生 button 语义；
- `choose` 焦点落在第一张候选；
- `place` 焦点落在第一个合法边缘空位；
- `share` 焦点先到标题，再 Tab 到两个按钮；
- `won/lost` 焦点到结果标题。

### 8.2 触控与指针

- 棋盘手势区最小主轴位移 28 CSS px；
- 对角手势使用绝对位移更大的主轴；
- 一次只跟踪一个 `pointerId`；
- 第二个指针、`pointercancel`、页面隐藏或窗口失焦取消临时手势；
- 页面全局不得 `touch-action: none`；
- 滑动始终有四个单击方向按钮替代；
- 候选和落点最小 44×44px；
- 选择落点不要求拖动纸签；
- 合法落点必须同时使用位置、边线和文字/可访问名称，不只使用颜色。

### 8.3 焦点

- 默认焦点环：`3px solid #245DFF`，`outline-offset: 2px`；
- 在四主题色上都必须保持对比；
- 禁用方向控件不可聚焦；
- 当前合法落点使用实线焦点环，其他空格仍保持普通虚线纸槽；
- 状态公告使用单一 `aria-live="polite"`，不抢焦点。

## 9. 动效与 reduced-motion

允许的两类主动画：

1. 线索沿纸槽滑动，并以缝线收束表现合并。
2. 左右角色书签在完整补页后交换强调。

章节形成时，纸签沿短路径进入共同相册。禁止粒子、闪屏、连续弹跳和大幅视差。

建议时间：

- 滑动：180–220ms；
- 合并边线收束：140–180ms；
- 章节入册：240–300ms；
- 角色强调交换：180ms；
- 超时兜底：不超过最长视觉序列 + 100ms。

`prefers-reduced-motion: reduce`：

- 不做位置插值；
- 直接渲染 reducer 最终状态；
- 用 120ms 内的边线/文字强调代替；
- 页面隐藏时立即终止装饰动画；
- 动画完成事件不得再次修改规则状态。

## 10. 隐私合同

视觉不得暗示数据会保存。

- 无姓名输入；
- 无头像；
- 无自由文本；
- 无照片；
- 无麦克风；
- 无上传；
- 无保存按钮；
- 无云状态；
- 无账号；
- 无历史记录；
- 无分享题完成率。

分享提示只供身边的人口头交流。`说好了，继续` 与 `这题先留白` 的规则结果完全
相同，页面不记录用户点了哪个。

生产页面不得加载本提案 PNG，也不得发出外部请求。概念图只存在 `docs/assets`，
不进入体验运行路径。

## 11. 开源与视觉独立性

玩法只按现有
[`ATTRIBUTION.md`](../experiences/co-op/memory-merge-board/ATTRIBUTION.md)
声明，参考
[`gabrielecirulli/2048` 固定 commit
`478b6ec346e3787f589e4af751378d06ded4cbbc`](https://github.com/gabrielecirulli/2048/tree/478b6ec346e3787f589e4af751378d06ded4cbbc)
中的抽象整盘滑动、相同条件一次合并、无效移动不推进与阻塞结束规则。

本视觉提案没有参考或复制上游：

- 4×4 布局；
- 数字与数值色阶；
- Score/Best；
- 固定方形棋盘；
- 奶油/棕色配色；
- Clear Sans 风格；
- CSS、图标、截图、字体或其他资产。

两张概念图由内置 `imagegen` 根据本项目 spec 独立生成，没有使用任何输入参考图。
未来生产 SVG、CSS、DOM 和动效也必须独立实现。

## 12. 生成幻觉清单

本节是实施禁区，不是待复制清单。

### 12.1 Active 桌面 v2

| 图中现象 | 判定 | 生产处理 |
|---|---|---|
| 角色书签顶部出现人物轮廓 | 模型擅自加入，且接近头像语义 | 删除；角色只用抽象左右书签 |
| 棋盘 12 格全部填满 | 构图填充，不是合法 seed | 使用求解器冻结的真实关卡状态 |
| 相册轨只有图标，没有 `地点 · 章节` 文字 | 漏字 | code-native 同时显示主题符号与文字 |
| 纸签中的具体房屋、桥、蛋糕、吉他等 | 只可参考线性图标气质 | 按四主题定义重新画原创 SVG，不逐图照抄 |
| 标题旁装饰叶片 | 可选装饰，不是功能 | 仅在不挤压 320px/400% 时保留，`aria-hidden` |
| 隐私句缺少 spec 中“录音、保存或上传”的完整表述 | 概念图缩写 | 使用 copy 白名单的完整隐私承诺 |

### 12.2 Superseded 桌面 v1

v1 在 `choose` phase 同时出现：

- `选下一张线索`；
- 两张可选候选；
- `选择方向`；
- 四方向十字；
- 左页外侧的大方向箭头。

这是硬 phase 幻觉。真实流程是 organizer 完成 `slide` 后，
`incomingDirection` 已被冻结，replenisher 只能 `choose`，不能重新选择方向。
v2 已删除整组方向按钮和外侧箭头，只保留不可交互的
`本轮已向左整理`。生产 copy/控件白名单禁止在 `choose` phase 同时出现候选动作
和方向动作。

### 12.3 移动图

| 图中现象 | 判定 | 生产处理 |
|---|---|---|
| 线索写成“雨天、清晨、热饮、梧桐树下”等 | 严重生成幻觉，不在 copy 白名单 | 只显示 `主题 · 阶段` |
| 两个角色书签有“人物/铅笔”符号 | 非必要且可能被理解为身份资料 | 删除，改为纯书签和角色文字 |
| 相册轨是多张空白纸签 | 仅为构图占位 | 只按 reducer 的已归档主题渲染 |
| 中心方向区出现 `×` | 模型对禁用态的自造符号 | 使用原生 disabled 样式与文字说明，不加第五个动作 |
| 图片像素为 853×1844，不是 390×844 | 概念画幅而非浏览器截图 | 生产浏览器按真实 390×844 取证 |
| “从右边补进来”沿边竖排 | 可读但实现成本和重排风险高 | 生产默认横排阶段说明，箭头负责位置 |
| 仅两个右边缘格为空 | 可作为 place phase 构图 | 使用真实 reducer 状态，不固定此 seed |
| 候选出现圆形勾选标记 | 状态语义合理但图标未冻结 | 生产以边框、`aria-pressed` 与文字共同表达，勾选为可选 |

## 13. 未来实现清单

用户确认后，生产实现应按以下顺序：

1. 把 active v2 桌面图与移动图的确认 hash 记录为 active spec。
2. 先实现桌面 `choose` 与移动 `place` 的 code-native 骨架。
3. 再补 `slide`、`share`、`won`、`lost` 状态。
4. 所有可见文字对 copy 白名单做静态 diff。
5. 所有符号重新绘制原创 SVG，不裁切概念图。
6. 在 Browser/IAB 中直接打开 worktree 的 `file://` 页面。
7. 分别截取 1440×900、390×844、320×800 与 400% zoom。
8. 用 `view_image` 同时检查确认概念与最新浏览器截图。
9. 完成下面的 fidelity ledger。
10. 修复完所有可修复偏差后，才做 A 级浏览器 Gate。

## 14. Future fidelity ledger

当前没有生产 UI，因此 `render evidence` 均为待验证。不得把概念图本身当作浏览器
证据。

| 比较点 | 概念证据 | 生产目标 | 未来 render evidence | 当前状态 |
|---|---|---|---|---|
| 主焦点 | 桌面 65% 为 4×3 共享页 | 首屏棋盘最大、动作轨次之 | 1440×900 screenshot | 待实现 |
| 棋盘规格 | 两图均为 3 行 × 4 列 | DOM 正好 12 格 | DOM snapshot + screenshot | 待实现 |
| 容器模型 | 开放纸页、轨、书签 | 无卡片海/嵌套 dashboard | screenshot + computed styles | 待实现 |
| 角色 | 左右边缘书签 | 无头像、无账号 | copy diff + screenshot | 待实现 |
| 候选 | 正好两张公开纸签 | choose phase 正好两个 button | DOM count + screenshot | 待实现 |
| 来向落点 | 移动图右边缘两个亮位 | 只渲染 reducer 合法边缘 | reducer state + screenshot | 待实现 |
| phase 互斥 | 桌面 choose 仅候选可操作；移动 place 仅落点可操作 | choose 不渲染四方向按钮；place 的方向只读/禁用 | interaction trace | 待实现 |
| 色彩 | 冷雾蓝、冷白、深墨与四色 | token 色值一致 | computed CSS + screenshot | 待实现 |
| 字体 | 标题衬线、控件无衬线 | 系统字体，无网络请求 | computed fonts + network log | 待实现 |
| copy | 概念只给层级参考 | 仅使用白名单，修复全部图像幻觉 | above-fold copy diff | 待实现 |
| 图标 | 单线符号与缝线 | 原创 SVG，不裁图 | source audit + screenshot | 待实现 |
| 触控 | 移动落点和候选较大 | 全部 ≥44×44px | bounding boxes | 待实现 |
| 响应式 | 移动单列自然流 | 390/320 无横向滚动 | viewport metrics | 待实现 |
| 400% | 概念未直接证明 | 核心流程重排可操作 | zoom screenshot | 待实现 |
| 焦点 | 首候选/首落点蓝色外环 | `:focus-visible` 不裁切 | keyboard screenshot | 待实现 |
| reduced motion | 概念为静态终态 | 无位移动画、状态仍可理解 | emulation + screenshot | 待实现 |
| 隐私 | 页面底部无保存语义 | 零输入、零存储、零权限 | source scan + browser log | 待实现 |
| 视觉独立 | 无数字、分数、棕色盘 | 不出现上游布局/资产 | source audit + screenshot | 待实现 |

## 15. Above-the-fold copy diff 规则

未来桌面 `choose` 截图首屏只允许出现：

- 页面标题；
- `共同相册` 与真实已归档主题；
- 两个角色；
- 棋盘真实主题/阶段；
- `选下一张线索`；
- 两张真实候选；
- 禁用方向摘要或 `选择方向`；
- 隐私短句；
- 当前 live 状态的可视等价说明。

未来移动 `place` 截图首屏只允许出现：

- 页面标题；
- `共同相册` 与真实已归档主题；
- 两个角色；
- 棋盘真实主题/阶段；
- 来向边缘说明；
- 已选候选摘要；
- 合法落点说明；
- 禁用方向摘要；
- 隐私短句。

生成图中的“雨天”“清晨”等词不得以“图里已经有”为理由进入 DOM。

## 16. 精确生成提示词

### 16.1 桌面

```text
Use case: ui-mockup
Asset type: full desktop primary gameplay screen concept, review-only visual specification for a local offline two-person cooperative HTML game
Primary request: Design a complete 1440×900 desktop interface for a Chinese game named “把小事，合成我们的故事”. Two people jointly organize memories on one shared scrapbook page. Show the choose phase: the left seat is the organizer, the right seat is the supplementer, and the supplementer chooses one of two public next clues after a valid slide.
Scene/backdrop: a cool mist-blue paper desk with one open scrapbook as the dominant surface, subtle stitched binding and fine paper grain; no photographic objects and no external brand.
Subject: a clearly readable 3-row × 4-column shared scrapbook board occupying the left-center, exactly 12 slots. Slots contain nonnumeric memory slips using original simple line symbols plus Chinese theme/stage labels; mix place, taste, sound, care themes and fragment, moment, story stages. Completed chapter bookmarks form one thin horizontal “共同相册” rail above the board. Two seat-role bookmarks sit at opposite page edges. On the right, an open action rail (not a floating dashboard card) shows exactly two public candidate paper strips, then a compact four-direction control arranged as a tactile compass. A subtle board-edge entry cue indicates the incoming edge, but no active placement targets in this choose phase.
Style/medium: polished senior product designer UI mockup, clean editorial scrapbook, restrained contemporary Chinese typography, warm relationship tone without childish hearts, implementation-friendly HTML/CSS shapes and simple original inline-SVG-like icons. Low-to-medium density, generous whitespace, one clear focal board.
Composition/framing: full browser viewport, landscape, no browser chrome. Asymmetric open-book composition: 65% shared board, 35% action rail. Avoid nested cards; use rules, rails, paper bands, edge bookmarks and open whitespace. All important content fully visible without scrolling.
Lighting/mood: calm daylight, intimate and collaborative, no glow.
Color palette: cool mist blue #EAF1F3 background, white paper #FCFDFC, deep ink #18313A text, coral #E66F65, seafoam #56A69E, periwinkle #6D7FC2, muted ochre #C89245. High contrast. Absolutely avoid beige/cream-and-brown 2048 palette.
Materials/textures: fine paper grain, thin navy stitch lines, lightly deckled paper strip edges; very restrained soft shadow only beneath the open scrapbook.
Text (verbatim, Chinese; render only this whitelist and no other visible words): “把小事，合成我们的故事” “共同相册” “地点 · 章节” “左边的人 · 整理者” “右边的人 · 补页者” “这一页” “地点 · 碎片” “味道 · 片段” “声音 · 故事” “照顾 · 碎片” “选下一张线索” “地点 · 碎片” “声音 · 碎片” “选择方向” “上” “右” “下” “左” “只说给身边的人听，页面不会记录”
Interaction clarity: exactly two public candidates are visibly selectable; exactly four direction controls exist; candidate selection is the primary action. Theme must never be color-only: each uses distinct line symbol and border texture. Direction controls and candidates look at least 44 CSS px. A clear visible focus ring appears around the first candidate.
Constraints: concept image only; future interactive text and controls must be code-native. No score, no timer, no ranking, no numeric tile values, no random-generation language, no microphone, no text input, no upload, no save, no network status. No 2048 name, no 4×4 grid, no large square number tiles, no brown board, no score/best boxes. No card grid, bento layout, dashboard chrome, neon, glassmorphism, gradients, decorative badges, fake metrics, avatars, photos, heart confetti, watermark, or logo. Do not invent extra copy. Make the Chinese text large and readable.
```

### 16.2 移动

```text
Use case: ui-mockup
Asset type: full 390 CSS px mobile primary gameplay screen concept, review-only responsive visual specification for the same local offline two-person cooperative HTML game
Primary request: Design a complete portrait mobile interface at a 390×844 viewport for the Chinese game “把小事，合成我们的故事”, matching a cool blue editorial scrapbook system. Show the place phase immediately after the supplementer chose the “地点 · 碎片” candidate and the previous organizer slid left. The right seat is now placing the clue from the right incoming edge.
Scene/backdrop: a cool mist-blue paper page, one vertically stacked scrapbook surface with fine stitched rules, no browser chrome, no photos and no external brand.
Subject: at top, compact title and a thin “共同相册” chapter-bookmark rail; beneath it, two clear edge bookmarks for roles. Center a readable shared 3-row × 4-column board, exactly 12 slots, with several nonnumeric memory slips and at least two truly empty slots on the RIGHTMOST column. The empty right-edge slots must be emphasized as large reachable placement targets with a simple inward arrow from the right. Beneath the board, show exactly two public candidate paper strips in one compact row; “地点 · 碎片” is selected and “声音 · 碎片” is visibly unselected. Then show a compact four-direction control with exactly Up, Right, Down, Left, visually disabled because this is the place phase. The primary bottom action is choosing one of the highlighted right-edge slots, not a separate submit button.
Style/medium: polished senior product designer mobile UI mockup, clean editorial scrapbook, restrained contemporary Chinese typography, intimate but not childish, implementation-friendly HTML/CSS shapes and original inline-SVG-like icons, generous but mobile-efficient spacing.
Composition/framing: full 390×844 screen represented in a portrait image, single-column document flow, no horizontal scrolling. Keep the full board, candidate row and four-direction control readable within the viewport. Avoid stacking every section inside rounded cards; use open paper, stitch dividers, slim bands and edge bookmarks.
Lighting/mood: calm daylight, collaborative, no glow.
Color palette: cool mist blue #EAF1F3 background, white paper #FCFDFC, deep ink #18313A text, coral #E66F65, seafoam #56A69E, periwinkle #6D7FC2, muted ochre #C89245. High contrast. Absolutely avoid beige/cream-and-brown 2048 palette.
Materials/textures: fine paper grain, thin navy stitch lines, lightly deckled paper strip edges, almost-flat shadow.
Text (verbatim, Chinese; render only this whitelist and no other visible words): “把小事，合成我们的故事” “共同相册” “地点 · 章节” “左边的人 · 整理者” “右边的人 · 补页者” “从右边补进来” “选择一个亮起的位置” “地点 · 碎片” “声音 · 碎片” “上” “右” “下” “左” “页面不会记录”
Interaction clarity: the two available right-edge placement targets are each at least 44 CSS px and visibly focusable; the first has a high-contrast focus ring. Theme identity uses symbol, Chinese label and distinct stitched border, never color alone. Direction controls remain visible for learnability but clearly disabled during placement.
Responsive and accessibility cues: minimum 16 px body copy, no clipped Chinese text, no horizontal overflow, safe 16 px side gutters, visible focus ring, buttons sized for touch, content can continue vertically if browser chrome reduces height.
Constraints: concept image only; future interactive text and controls must be code-native. No score, timer, ranking, numeric tile values, random-generation language, microphone, text input, upload, save, network status. No 2048 name, no 4×4 grid, no large square number tiles, no brown board, no score/best boxes. No card sea, bento, dashboard chrome, neon, glassmorphism, gradients, badges, fake metrics, avatars, photos, hearts, confetti, watermark, or logo. Do not invent extra copy. Make all Chinese text large and readable.
```

### 16.3 桌面单点修正

```text
Use case: precise-object-edit
Asset type: review-only desktop UI concept correction
Primary request: Change only the phase semantics in the supplied desktop concept. This screen is the CHOOSE phase after the organizer already slid left. Remove the entire “选择方向” heading, all four direction buttons, the compass center, and the large stray arrow protruding from the left edge of the scrapbook. In the space below the two public candidates, add one small, clearly non-interactive stitched paper status strip with a simple left-arrow line icon and the exact Chinese text “本轮已向左整理”. It must look like read-only history, not a button. Keep “选下一张线索” and exactly the two candidate strips as the only visually actionable controls; preserve the bright focus ring on the first candidate.
Invariants: keep the full landscape composition, title, open scrapbook, 3×4 board, 12 tile slots, common album rail, two role bookmarks, two candidate strips, cool mist-blue/white/deep-ink/coral/seafoam/periwinkle/ochre palette, paper and stitch materials, typography mood, spacing, and privacy line unchanged. Do not alter or add board tiles. Do not add any other controls, copy, badge, metric, card, icon cluster, or decoration.
Text constraint: the only newly introduced text is exactly “本轮已向左整理”. Do not invent extra text.
Avoid: no active direction chooser, no arrows that look clickable except the small icon inside the read-only status strip, no submit button, no 2048 visual, no score, no timer, no watermark.
```

## 17. 用户确认 Gate

在用户明确回答之前，本提案保持 review-only：

> 是否确认以
> `desktop-choose-concept-v2.png`
> (`d165a490544710574e3e5f8b7cd060a8a050042c58ec6c36517e8b001ec7dd06`)
> 与
> `mobile-place-concept.png`
> (`5c35f7c91e02b1accbfa6a0518a089511ca3d4740a422d19c73baea19ec02f3e`)
> 的“冷雾蓝共同剪贴簿”方向，作为 `memory-merge-board` 的生产视觉基线？

确认时只确认以下设计原则，不确认生成幻觉：

- 共享拼板为唯一主焦点；
- 桌面开放操作轨、移动单列纸页；
- 冷雾蓝/冷白/深墨与四色主题；
- 书签、纸槽和细缝线的视觉语言；
- phase 互斥和 code-native copy；
- 无数字、分数、计时、保存与账号；
- 不复制 2048 视觉。

如果不确认，请优先指出要调整的一个维度：

- 色温；
- 纸张质感；
- 桌面 65/35 布局；
- 移动端密度；
- 角色书签；
- 方向十字；
- 候选纸签；
- 章节分享纸页。

**必须用户确认后才可生产实现。**
