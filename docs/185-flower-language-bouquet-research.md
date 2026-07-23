# S13“花语配方”定向调研：把花语，系成一束

调研日期：2026-07-21

来源维护复核：[232-flower-language-bouquet-source-refresh.md](./232-flower-language-bouquet-source-refresh.md)

对应创意：`docs/40-idea-backlog.md` 的 S13“花语配方”

建议目录：`experiences/surprises/flower-language-bouquet/`

建议启动等级：A（双击 `index.html`，无安装、服务、权限或公网）

## 1. 结论

S13 可以做，而且适合成为仓库第一件“选择直接塑造成品、完成后可显式保存”的单人惊喜。

推荐作品名为“把花语，系成一束”：收礼者面对同一组六种花材，依次选出三种不同的花。第一枝成为主花，第二枝成为陪花，第三枝成为点缀；选择顺序同时决定花束构图和三段私人花语的表达顺序。三枝齐备后先进入预览，用户仍可逐枝撤回；只有主动点击“系好这束花”，才展开称呼、完整留言与署名，并准备一个可见、可重试的 SVG 保存链接。

本作不做配方谜题，也不判失败。六选三且顺序有意义，共有 `6 × 5 × 4 = 120` 个合法结果，每一个都必须成功。

进入实现的五项条件均成立：

1. 主分类唯一：一人准备花语与留言，另一人挑花并收下成品；
2. A 级可行：原生 DOM、SVG、Blob 与经典脚本足够，无需服务端、依赖或网络；
3. 30 秒内可理解：选三枝、看组合、系成花束；
4. 去掉照片、字体、音频和随机后，选择、构图、花语与成品仍成立；
5. 最小版本只有一个入口、一种有序选择机制、一个预览和一个结果页。

## 2. 与现有作品的机制差异

| 已有作品 | 已覆盖机制 | S13 必须保持的差异 |
| --- | --- | --- |
| `future-cookie-notes` | 三项全部收集后按固定语义顺序合成 | S13 只从六项中选三项；选择顺序本身决定主花、陪花、点缀与文案顺序 |
| `future-ticket` | 三个固定类别各选一项，再形成完整计划 | S13 没有类别墙，三次都从同一公开花池选择，且不能重复 |
| `seven-day-garden` | 花朵主题、有限库存、正确组合与后缀可解性 | S13 无资源压力、唯一解、失败、重试或双人合作，所有合法选择都成功 |
| `cloud-recipe` | 按正确范围接齐配方，错误会失败 | “配方”只表示创作组合，不表示命中答案；没有坏花束 |
| S09 夸夸老虎机调研 | 三段词语组合与随机揭晓 | S13 完全由用户选择，不使用随机、Jackpot、转轴或库存 |
| `instant-photo` | 在内存创建图片相关对象 URL | S13 明确提供用户可见的独立 SVG 文件链接，并冻结 URL 生命周期与移动端降级 |

花朵题材不是差异。只有“同池三次有序选择 → 构图与花语同源 → 可撤回预览 → 主动系束 → 显式 SVG 成品”同时成立，才算实现 S13。

## 3. 方案比较

### 3.1 三个固定类别各选一项

例如分别从“主花 / 陪花 / 叶材”三个 radio group 选一项。

**排除为主线。** 它最容易实现，却与 `future-ticket` 的三个类别选择过于接近；顺序也失去由用户塑造的意义。

### 3.2 同一花池选三种，按 catalog 顺序合成

可用 checkbox 完成，但点击先后不改变成品。

**排除。** 如果视觉和文案都重新按 catalog 排序，用户的选择过程对结果结构影响过小，也会与普通商品筛选器相似。

### 3.3 同一花池依次选三种不同花

第一枝、第二枝、第三枝分别进入固定的主花、陪花、点缀槽。页面持续显示真实有序列表，并提供“撤回上一枝”。

**采用。** 规则有限、确定、无失败；顺序同时驱动构图和花语，120 个结果可完整枚举测试。

### 3.4 自由拖放插花

**首版排除。** 拖放需要额外处理替代入口、触屏滚动、键盘排序、命中区和取消语义；它不是表达花语所必需。若以后添加，只能作为装饰增强，底层仍派相同 action。

### 3.5 随机花束或花语测验

**排除。** 不使用 `Math.random()`、日期、人格评分或所谓关系分析；准备者写好的话不能由随机数决定，也不能把某个选择判成“不合适”。

## 4. 冻结的产品主线

### 4.1 六种固定花材

逻辑 ID、顺序与绘制种类固定为：

```text
rose / tulip / daisy / sunflower / lisianthus / gypsophila
```

可见名称、准备者为它写的私人花语可在 `config.js` 修改。花语必须在 UI 和 README 中称为“我们给它的花语”或“这束花里的意思”，不能声称是植物学事实、统一文化标准或权威花语词典结论。

花型、路径、色板、slot、比例和规则不是配置输入；它们由代码白名单固定。这样配置不能注入任意 SVG path、markup、URL、事件或 style。

### 4.2 三次有序选择

- arranging 从六张原生 button 花材卡中选择；
- 只能追加尚未选择的 ID；重复项、第四枝和错阶段动作精确 no-op；
- 长度 1/2/3 分别标为“主花 / 陪花 / 点缀”；
- 有序 `<ol>` 始终显示当前前缀，不只靠花束位置或颜色说明顺序；
- 只提供“撤回上一枝”，不做任意删除、拖排或交换；
- 第三枝追加后原子进入 preview，不自动完成；
- preview 可撤回第三枝，也可主动点击“系好这束花”；
- complete 才显示最终私人标题、留言、署名和保存区；
- 重新开始只在 complete 出现。

### 4.3 固定花语组合

组合规则属于逻辑层，不接受配置函数：

```text
这束花先用「{name0}」说“{meaning0}”，
再让「{name1}」接住“{meaning1}”，
最后由「{name2}」把“{meaning2}”留给以后。
```

实现可在不改变语义和顺序的前提下调整标点与换行。配置只提供纯文本 name/meaning，不提供 composer、模板、HTML 或代码。这样 action log 可 JSON 往返，120 种排列都能稳定成句。

## 5. 权威状态与动作草案

权威 state：

```js
{
  version: 1,
  phase: "intro" | "arranging" | "preview" | "complete",
  content,
  selectedIds,
  revision
}
```

不变量：

| phase | content | selectedIds |
| --- | --- | --- |
| intro | null | `[]` |
| arranging | 合法 content | 长度 `0..2` 的任意合法有序选择 |
| preview | 合法 content | 长度精确 3 |
| complete | 合法 content | 长度精确 3 |

`selectedIds` 必须是当前 realm dense 原生数组；每项是六个固定 primitive ID 之一，所有项两两不同。数组顺序任意、永不排序，并且就是权威选择顺序；不存在一条要求匹配的 catalog “前缀”。state 不保存组合文案、SVG、DOM node、Blob、object URL、保存点击、浏览器能力、时间戳或导出结果。

`createInitialState()` 每次返回一个新引用、属性顺序固定、递归冻结的精确值：

```js
{
  version: 1,
  phase: "intro",
  content: null,
  selectedIds: [],
  revision: 0
}
```

动作 exact schema：

```js
{ type: "START", content }
{ type: "ADD_FLOWER", flowerId }
{ type: "UNDO_LAST" }
{ type: "TIE_BOUQUET" }
{ type: "RESTART" }
```

事务：

- START：仅 intro；嵌入严格验证后的 content，进入 arranging；
- ADD_FLOWER：仅 arranging；追加合法且未出现的 ID；第三项使 phase 变为 preview；
- UNDO_LAST：arranging 非空或 preview；弹出最后一项并进入 arranging；
- TIE_BOUQUET：仅 preview；selectedIds 不变，进入 complete；
- RESTART：仅 complete；回 intro，content=null、selectedIds=[]，但 revision 延续递增而不归零；
- 合法 state 上的非法/错阶段/重复 action 返回调用方原 state 引用；
- 非法 state 不读取 action，返回新的递归冻结 canonical 初态；
- 每个有效动作精确 `revision += 1` 并返回新的递归冻结、断引用 state；无效动作不增加 revision。

所有 type、version、revision 与关联标量都先验证 primitive 类型；revision 只能是 `0..M` 的 primitive safe integer，不做 coercion，不接受 boxed primitive、NaN、Infinity、负数、小数或自定义 valueOf。

## 6. Revision headroom

设 `M = Number.MAX_SAFE_INTEGER`。合法 state 至少保留一条完成当前花束的前进路径：

| phase | 已选数 | 最大 revision |
| --- | ---: | ---: |
| intro | 0 | `M−5` |
| arranging | 0 | `M−4` |
| arranging | 1 | `M−3` |
| arranging | 2 | `M−2` |
| preview | 3 | `M−1` |
| complete | 3 | `M` |

最晚完整路径：

```text
intro M−5
START       → arranging/0 M−4
ADD 0       → arranging/1 M−3
ADD 1       → arranging/2 M−2
ADD 2       → preview/3    M−1
TIE         → complete/3   M
```

撤回会增加剩余动作数，因此只在以下条件允许：

```text
arranging/1 UNDO: revision <= M−5
arranging/2 UNDO: revision <= M−4
preview/3   UNDO: revision <= M−3
complete RESTART: revision <= M−6
```

headroom 不足时只禁用撤回或重开；当前合法花束仍可沿前进路径完成。

## 7. 配置与 hostile snapshot

建议配置：

```js
{
  recipient,
  sender,
  finalTitle,
  finalNote,
  flowers: [
    { id: "rose", name, meaning },
    { id: "tulip", name, meaning },
    { id: "daisy", name, meaning },
    { id: "sunflower", name, meaning },
    { id: "lisianthus", name, meaning },
    { id: "gypsophila", name, meaning }
  ]
}
```

冻结边界：

- flower 数量、顺序和六个 ID 精确固定；
- recipient/sender 清洗后各 `1..12` Unicode code point 且不同；
- name `1..8`，六项互不相同；meaning `2..32`；
- finalTitle `2..40`；finalNote `1..160`，最多三行；
- 拒绝 lone surrogate、C0/C1、U+2028/U+2029；除 finalNote 的 LF 外拒绝换行；
- 文本 trim 后再计 code point；不把字符串写入 id/class/path/href/style/filename；
- 任一字段非法时整份回退默认配置，不做字段混搭；
- 默认配置也必须通过相同内部 validator；
- `createStartAction(rawConfig)` 是 app 创建 START 的唯一入口；reducer 只严格验证 action content，不做默认回退；
- 默认私人花语、标题与留言全部为本仓库原创，不从花语词典、商品页、贺卡或社交帖子抓取。

所有公开 object/array 输入共用 descriptor snapshot：

1. 捕获 `Reflect.getPrototypeOf/ownKeys/getOwnPropertyDescriptor` 与 `Array.isArray` intrinsic；
2. object/array 必须是当前 realm 普通原型；array 必须 dense，精确索引和普通 length；
3. 只接受合同列出的 string own data keys，拒绝 symbol、extra、accessor、custom/null prototype、array subclass 与自定义 iterator/map；
4. 只读取 descriptor.value，不执行 getter、spread、iterator、Array method、toJSON、valueOf 或输入对象方法；
5. 任一 Proxy trap 抛错即 fail closed；
6. 复制到新普通数据后再验证，不冻结、修改或复用调用方输入；
7. 合法 content/state/view 递归冻结、JSON-safe 且断引用。

## 8. Public view 与秘密 Gate

正常页面只消费 `getPublicView(state)`：

- intro：只公开题名、规则与 START 能力；不挂载 config；
- arranging：公开六种 flower 的 name/meaning、已选有序前缀、角色和可撤回能力；
- preview：额外公开三枝组合句与完整花束几何；recipient/sender/finalTitle/finalNote 仍为 null；
- complete：才公开 recipient、sender、finalTitle、finalNote、完整结果和 export model 能力；
- view 不公开 raw config、未清洗输入、action log、revision headroom 细节、SVG path 数据、Blob、URL 或保存历史。

intro 之后六种花名和私人花语是题面，必须全部可读，不能为了“隐私”妨碍选择。真正延迟的是收件人称呼、最终标题、附言和署名。

未到阶段的私人字段不得进入 hidden/template、ARIA、attribute、class/id/data/title/style、CSS content、SVG、Canvas、Blob、URL/history、storage、clipboard、console 或网络。`config.js` 和 reducer state 仍是本地磁盘/内存明文，不是密码学加密。

隐私 sentinel 必须为花名/花语、recipient/sender/finalTitle/finalNote 分别使用互不包含字符串，并扫描 DOM、序列化 SVG、Blob 文本、href、console、URL、storage 与 network。

## 9. 确定性花束几何

页面与导出共同消费只含已公开数据的纯 scene model，但不共享 DOM 节点。

建议冻结 `1000 × 1200` viewBox 和三个顺序槽：

| 角色 | 花头中心 | scale | rotation | 茎束口 |
| --- | --- | ---: | ---: | --- |
| 主花 | `(500, 330)` | `1000/1000` | `0°` | `(500, 850)` |
| 陪花 | `(345, 430)` | `820/1000` | `−12°` | `(500, 850)` |
| 点缀 | `(655, 465)` | `720/1000` | `14°` | `(500, 850)` |

六种花型各自使用有限、原创的 circle/ellipse/path/line 组合；花头、花茎、叶片和丝带是独立 group。布局不用随机、运行时 packing、碰撞求解、字体采样、图片识别或 Canvas 反推。

不同选择顺序必须产生不同的 scene model；同一配置、selectedIds 与版本必须字节等价。花型、名称与花语的对应关系通过 DOM legend 和有序结果列表表达，不能只靠颜色。

页面 inline SVG 只作视觉，`aria-hidden=true`；花材、顺序、组合句和最终留言由相邻真实 DOM 完整表达。forced-colors 下即使隐藏 SVG，流程和结果仍完整。

## 10. SVG 保存合同

SVG 是首版唯一保证的保存格式；PNG、PDF、系统分享、复制剪贴板和自动截图均不进入首版。

### 10.1 保存不是业务动作

- reducer 没有 EXPORT/SAVE action；
- 只有 complete public view 可派生 export model；
- 导出构造、点击、浏览器接管或失败都不改变 state/revision/action log；
- 固定文件名 `flower-language-bouquet.svg`，不把称呼、留言、时间或 flower ID 写入文件名；
- 不自动下载、不自动打开新窗、不写 storage、不调用 share/clipboard。

app 维护独立、短命且不进入 reducer 的 export controller：

```js
{
  generation,
  phase: "idle" | "unsupported" | "preparing" | "ready" | "error",
  objectUrl
}
```

- 非 complete 固定 idle；
- complete 首次 render 原子进入 preparing，并只为当时的 frozen export model 尝试一次同步构造；
- 缺少 Blob、XMLSerializer、`URL.createObjectURL/revokeObjectURL` 等必要 API 时进入 unsupported，显示永久性说明，不给虚假重试；
- 构造/序列化/URL 异常进入 error，显示原生“重新准备保存文件”button；
- retry 只 generation++、清旧 URL 并重建 controller，不派 reducer action、不改 state/revision；
- 成功进入 ready，显示真实保存 link；旧 generation 的迟到结果不得覆盖当前 controller；
- RESTART 先 revoke 当前 URL，再把 controller 回 idle。

### 10.2 安全 standalone SVG

app 只用 `createElementNS`、`textContent`、白名单属性与 `XMLSerializer` 构造新 SVG tree：

- 根固定 xmlns、width、height、viewBox 与版本；
- 几何只来自内部白名单，不接受配置 path/markup/href/style；
- 可见最终标题、三种花名、组合句、finalNote 与 sender 可进入导出，因为 complete 已公开，保存链接需明确写“保存含留言的 SVG”；
- 不包含未选花材、完整 catalog、内部 ID、raw config、选择历史、revision、时间、调试数据或隐藏 sentinel；
- 不含 script、foreignObject、事件属性、external href、远程/本地图片、外部字体、CSS URL、动画或网络引用；
- 系统字体只作 SVG text fallback，花束几何不依赖字体；
- Blob MIME 固定为 `image/svg+xml;charset=utf-8`。

SVG 文本不用 foreignObject，也不依赖浏览器自动换行。`wrapSvgText` 在清洗后的 Unicode code point 序列上工作：保留原 LF 为硬换行，其余每 22 code point 形成一个新行，顺序不变、不 trim、不省略、不加 ellipsis；合法 surrogate pair 不拆开。每行创建独立 `<tspan x="80" dy="32">`，文本只经 `textContent` 写入。

固定 export viewBox 调整为 `0 0 1000 1800`：花束几何占 `y=80..820`，文本区占 `y=900..1720`。最大配置的上限冻结为：finalTitle 最多 2 行；三段“角色/花名/花语”合计最多 9 行；finalNote 最多 10 行；sender 最多 1 行；连同块间距总计不得超过文本区。任何块超过行数、最后 baseline 越过 1720、文本节点构造失败或序列化后缺字段，都使 controller 进入 error；绝不裁切、隐藏、缩小为不可读、ellipsis 或生成残缺文件。

浏览器 Gate 必须重新打开最大配置 SVG，在实际渲染中确认每个 sentinel 可见且位于 viewBox 内；只在 XML 中搜索到字符串不足以证明排版成功。

### 10.3 Object URL 生命周期

- complete render 同步创建一个 Blob 与一个 object URL，并把 URL 给真实可见 `<a download>`；
- 用户必须再次真实激活链接，不能异步 `.click()` 模拟；
- 不在 click 后立即 revoke，因为浏览器可能尚未读取；
- 新 export generation 或 RESTART 时撤销旧 URL；真正 unload 时由 File API 的文档清理步骤移除本环境 URL，app 不在 `pagehide` 与下载/预览导航竞争；清理幂等；
- generation token 防止旧异步回调覆盖新结果；首版 SVG 同步，但合同为未来增强保留边界；
- Blob、URL、序列化异常时在 polite status 写“暂时没准备好文件，花束仍在这里”，同时显示 retry button；state 不变。unsupported 只显示能力说明，不反复承诺重试。

HTML 的 `download` 值只是作者建议，实际文件名、下载、预览或系统文件流程由浏览器决定。页面没有可靠的“文件已经写入磁盘”事件，因此激活后只能说“已交给浏览器处理”；Safari/iOS 若打开预览，用户可通过系统菜单保存，不能宣称“一键保存到相册”。

## 11. 输入、键盘与焦点

- 六张花材卡使用原生 `<button type="button">`，不是可拖 div；
- 花名、私人花语、是否已选和角色均为真实文字；状态不只靠颜色或花束位置；
- 选择后按钮节点不替换；已选项使用可见状态和事件 guard，不能因重绘丢焦；
- 同一 flower 重复激活 no-op，不重复播报错误；
- “撤回上一枝”“系好这束花”“重新开始”均为原生 button；保存是原生 link；
- START 后聚焦第一张花材卡；ADD1/2 后焦点移到下一张未选花材卡；第三枝后只聚焦 preview 标题，标题的 `aria-describedby` 指向三枝角色与组合句；
- UNDO 后焦点回被撤回的花材卡；TIE 后聚焦 `tabindex=-1` 的结果标题；RESTART 后聚焦 START；
- 每个 action 只走一个主反馈通道：ADD1/2 与 UNDO 写一次 polite status；第三次 ADD 只走 preview heading focus，不另写“已选第三枝/三枝已齐”；TIE 只走 result heading focus，结果标题的 describedby 含完整组合，不再写“花束已系好”；export error/retry 仍可写 status；
- 首次 export ready 不抢焦点、不播“成功保存”；retry 成功后 status 只写“保存文件已重新准备”，保存 link 保持正常 Tab 顺序；
- Enter/Space 与指针走同一 click path；忽略 keyboard repeat 和 pointer `click.detail>1`，去重先于 reducer；
- window blur/hidden/pagehide 清 held-key 与短命焦点工作，不补发业务 action；不得因普通 blur/hidden 或下载导航的 pagehide 撤销仍可能被读取的 export URL；
- 所有 button 与保存 link 在六档视口至少 56×56 CSS px。

所有花材卡、START、UNDO、TIE、retry、RESTART 与保存 link 必须保留 UA focus ring，或提供至少 3px 的真实 solid `outline` 与至少 3px `outline-offset`；禁止只用 color、box-shadow、transform 或动画表示焦点，禁止无等价替代的 `outline:none`。forced-colors 使用系统 `Highlight`/`CanvasText`，normal、selected、guard 和 link 状态都必须保持键盘焦点可见。

若未来增加拖放，必须保留上述全部非拖动入口。首版不添加废弃的 `aria-grabbed/aria-dropeffect`。

## 12. 动效、forced-colors 与降级

普通模式最多一次有限的插入位移和一次系带收束；不做循环飘花、持续摆动、视差、粒子、闪烁或常驻 RAF。

`prefers-reduced-motion: reduce`：

- 所有 state 与结果不变；
- SVG 立即进入目标位置；
- 禁止位移、旋转、缩放、淡入淡出和丝带收束动画；
- 焦点与 live 时序不依赖 animationend。

`forced-colors: active`：

- 页面流程以 DOM 名称、编号、角色、边框和系统色完整表达；
- SVG 可隐藏，或只用 Canvas/CanvasText/Highlight 与真实 stroke；
- 移除 gradient、filter、mix-blend-mode、shadow、background-image；
- 不用 `forced-color-adjust:none` 强保色；
- 不把导出 SVG 的彩色预览当作唯一结果。

若 SVG namespace、Blob 或 object URL 不可用，页面仍可通过 DOM 选花、预览、完成和阅读全部留言；只隐藏保存链接并给出非阻塞说明。无 JS 时只显示静态说明，不伪造花束已完成或私人留言已解锁。

## 13. 响应式 Gate

| 视口 | 重点 |
| --- | --- |
| 1504×1046 | 花材/控制与花束预览双列；题名、三槽和主动作同屏，无滚动 |
| 1280×800 | 双列紧凑，花池与 preview 不遮挡，无横向滚动 |
| 768×1024 | 单列，花束不 sticky 挡住选择；DOM/Tab 顺序与视觉顺序一致 |
| 390×844 | 花材卡两列或一列，按钮/link≥56px，保存与重开可达 |
| 320×568 | 允许纵滚、零横溢；长花语与三行留言完整换行，safe-area 不遮主动作 |
| 844×390 | 花束左、控制右或单列纵滚；不锁方向，保存区可达 |

另验 200% 文本、约 320 CSS px 的 400% zoom、最大配置、`overflow-wrap:anywhere`、reduced-motion、forced-colors、SVG/Blob/URL 构造失败、零公网请求和零 console error/warning。

真实浏览器至少包括 Chrome/Firefox/Safari desktop 的 `file://`，以及 Android Chrome、iOS Safari 的实体触屏。Safari/iOS 必须记录 download 实际表现是下载、预览还是系统文件流程；不能用 localhost 或移动仿真替代后宣称 `file://` 保存已通过。

## 14. A 级本地边界

建议文件：

```text
experiences/surprises/flower-language-bouquet/
├── index.html
├── config.js
├── logic.js
├── logic.test.js
├── app.js
├── styles.css
├── README.md
└── assets/
    └── ATTRIBUTION.md
```

- 经典脚本顺序 `config.js → logic.js → app.js`；
- 不用 ESM、dynamic import、fetch、XHR、WebSocket、Worker、Service Worker 或 server；
- 不新增根依赖，不安装下列研究项目；
- 不用 CDN、远程字体、外部图片、音频、权限、传感器、storage、cookie、分析或联网；
- 双击 index 与根门户进入均可完成主线；
- 作品目录可单独复制运行；
- SVG 花型、构图、状态机、文案和测试由本仓库原创实现。

## 15. 开源项目借鉴声明

以下项目均只用于研究机制。首版不复制其源码、API、类名、参数、公式、布局表、素材、文案、测试、构建产物或视觉；不作为依赖、vendor 或 script 引入。实现阶段的 README 与 `assets/ATTRIBUTION.md` 必须再次完整列出。

### 15.1 Emoji bouquet generator

- 仓库：[599316527/emoji-bouquet-generator](https://github.com/599316527/emoji-bouquet-generator)
- 固定版本：[commit `8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9`](https://github.com/599316527/emoji-bouquet-generator/commit/8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9)
- 许可证：[MIT](https://github.com/599316527/emoji-bouquet-generator/blob/8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9/LICENSE)
- 权利主体：Copyright (c) 2016 Kyle He
- 研究抽象：有限元素使用固定位置构成可预期花束，输入数据与呈现组件分离。
- 排除原因：项目依赖 Vue 2 与旧 Webpack 链，使用 emoji 和硬编码绝对位置；没有花语、三枝有序选择、隐私阶段、SVG 导出或 A 级独立目录。
- 零复制边界：不复制 Vue 组件、emoji picker、位置表、样式、构建配置、图片或演示页面。

### 15.2 Procedural-Flower

- 仓库：[Platane/Procedural-Flower](https://github.com/Platane/Procedural-Flower)
- 固定版本：[commit `d857fbe846d5899cd5cf8ea6a47d37e6030f53c0`](https://github.com/Platane/Procedural-Flower/commit/d857fbe846d5899cd5cf8ea6a47d37e6030f53c0)
- 许可证：[MIT](https://github.com/Platane/Procedural-Flower/blob/d857fbe846d5899cd5cf8ea6a47d37e6030f53c0/LICENSE)
- 权利主体：Copyright (c) 2012 Arthur Brongniart
- 研究抽象：花朵可拆为局部部件；有限生长应在到达最终形态后停止，不保留常驻动画。
- 排除原因：它是 Canvas 程序花生长库，另含无限生长与加载进度用途；本作不需要其随机/生长系统。
- 零复制边界：不复制源码、分支/花瓣算法、随机参数、类/API、动画周期、示例或 Canvas 布局。

### 15.3 SVG.js

- 仓库：[svgdotjs/svg.js](https://github.com/svgdotjs/svg.js)
- 固定版本：[commit `6f58d4b2aa10e2d7ed6e38ff84caeb04b210af4e`](https://github.com/svgdotjs/svg.js/commit/6f58d4b2aa10e2d7ed6e38ff84caeb04b210af4e)
- 许可证：[MIT 形式许可证](https://github.com/svgdotjs/svg.js/blob/6f58d4b2aa10e2d7ed6e38ff84caeb04b210af4e/LICENSE.txt)
- 权利主体：Copyright (c) 2012–2018 Wout Fierens
- 研究抽象：一枝花作为 group，花头/茎/叶使用局部坐标，同一纯 scene 可投影为页面与独立 SVG。
- 零复制边界：不复制 API、DOM wrapper、矩阵、clone/symbol 实现、parser、动画、ID、测试、文档示例或 logo；直接使用原生 SVG DOM。

### 15.4 Fabric.js

- 仓库：[fabricjs/fabric.js](https://github.com/fabricjs/fabric.js)
- 固定版本：[commit `723838fcbb9feaa87c8840082640de2ed82383da`](https://github.com/fabricjs/fabric.js/commit/723838fcbb9feaa87c8840082640de2ed82383da)
- 许可证：[MIT](https://github.com/fabricjs/fabric.js/blob/723838fcbb9feaa87c8840082640de2ed82383da/LICENSE)
- 权利主体：Copyright (c) 2008–2015 Printio（Juriy Zaytsev、Maxim Chernyak）；Copyright (c) 2016–present Andrea Bogazzi、Shachar Nen 与 Fabric.js contributors
- 研究抽象：权威配方、scene model、页面渲染和导出副作用必须分层。
- 零复制边界：不复制 class/API、JSON/SVG serializer、canvas/group、控制柄、布局器、默认参数、测试、示例或素材；不引入通用画布编辑器。

### 15.5 d3-hierarchy

- 仓库：[d3/d3-hierarchy](https://github.com/d3/d3-hierarchy)
- 固定版本：[commit `c4ae7066d5a52e8aeaab24b3f7113e25c38183f2`](https://github.com/d3/d3-hierarchy/commit/c4ae7066d5a52e8aeaab24b3f7113e25c38183f2)
- 许可证：[ISC](https://github.com/d3/d3-hierarchy/blob/c4ae7066d5a52e8aeaab24b3f7113e25c38183f2/LICENSE)
- 权利主体：Copyright 2010–2021 Mike Bostock
- 研究抽象：曾比较“把花头近似为圆后自动避碰/packing”的方案。
- 排除结论：本作只有三个角色槽，固定原创 slot 更稳定、可测试且无随机；不复制 front-chain、相交、包围圆、epsilon、LCG、源码或测试。

### 15.6 FileSaver.js

- 仓库：[eligrey/FileSaver.js](https://github.com/eligrey/FileSaver.js)
- 固定版本：[commit `cea522bc41bfadc364837293d0c4dc585a65ac46`](https://github.com/eligrey/FileSaver.js/commit/cea522bc41bfadc364837293d0c4dc585a65ac46)
- 许可证：[MIT](https://github.com/eligrey/FileSaver.js/blob/cea522bc41bfadc364837293d0c4dc585a65ac46/LICENSE.md)
- 权利主体：Copyright © 2016 Eli Grey
- 研究抽象：保存必须由用户主动触发；Safari/iOS 可能把保存退化为预览或新页面，页面不能承诺落盘成功。
- 零复制边界：不复制 `saveAs`、UA sniff、XHR/CORS、FileReader/data URL fallback、popup、timer、兼容表、源码或测试；首版不安装该库。

## 16. 平台规范依据

规范只用于确认平台合同，不复制其正文、IDL、算法、示例、图片或测试，也不声称获得合规认证。

### 16.1 WHATWG HTML

- 固定版本：[commit `24c5e48bf66ea61bc199ec6338c81258275ba9c6`](https://github.com/whatwg/html/commit/24c5e48bf66ea61bc199ec6338c81258275ba9c6)
- 许可证：[CC BY 4.0；代码部分 BSD 3-Clause](https://github.com/whatwg/html/blob/24c5e48bf66ea61bc199ec6338c81258275ba9c6/LICENSE)
- 权利主体：WHATWG（Apple、Google、Mozilla、Microsoft）
- 用途：原生 button/link、download 建议文件名、用户参与和 UA 下载决策。

### 16.2 W3C File API

- 固定版本：[commit `cd1d1da9a5375af0622af4b36e76c6e6bd9d130b`](https://github.com/w3c/FileAPI/commit/cd1d1da9a5375af0622af4b36e76c6e6bd9d130b)
- 许可证：[W3C Software and Document License](https://github.com/w3c/FileAPI/blob/cd1d1da9a5375af0622af4b36e76c6e6bd9d130b/LICENSE.md)
- 授权主体：仓库贡献者
- 用途：Blob、createObjectURL/revokeObjectURL 与对象 URL 生命周期。

### 16.3 W3C SVG 2

- 固定版本：[commit `8b521081b0c65490c9b80633be68871f7bf441fa`](https://github.com/w3c/svgwg/commit/8b521081b0c65490c9b80633be68871f7bf441fa)
- 许可证：[W3C Document License](https://github.com/w3c/svgwg/blob/8b521081b0c65490c9b80633be68871f7bf441fa/LICENSE.md)
- 授权主体：仓库贡献者
- 用途：standalone SVG、viewBox、基本图形、分组与文本。

### 16.4 W3C WCAG

- 固定版本：[commit `07123b871c103268375880980fd715b2b26b2ff0`](https://github.com/w3c/wcag/commit/07123b871c103268375880980fd715b2b26b2ff0)
- 许可证：[W3C Document License](https://github.com/w3c/wcag/blob/07123b871c103268375880980fd715b2b26b2ff0/LICENSE.md)
- 授权主体：仓库贡献者
- 用途：键盘、非文本等价、状态消息、拖动替代、交互动画和焦点。

### 16.5 CSSWG Drafts

- 固定版本：[commit `c7573530343759ace8e46438a1fa2c44515b5554`](https://github.com/w3c/csswg-drafts/commit/c7573530343759ace8e46438a1fa2c44515b5554)
- 许可证：[W3C Software and Document License](https://github.com/w3c/csswg-drafts/blob/c7573530343759ace8e46438a1fa2c44515b5554/LICENSE.md)
- 授权主体：仓库贡献者
- 用途：响应式、prefers-reduced-motion 与 forced-colors。

## 17. 明确排除的内容

- 无许可证或权属不明的花卉 SVG、图标、照片、贴纸、字体和音效；
- 商业花店图、商品构图、贺卡文案、社交帖子和花语数据库；
- 把地区性花语写成全球统一事实；
- 从 Emoji bouquet、Procedural-Flower、SVG.js、Fabric.js、d3 或 FileSaver.js 移植源码；
- Fabric、SVG.js、D3、FileSaver、html2canvas、drag-and-drop 库或运行时依赖；
- 外部/本地图片进入 Canvas 后导出 PNG；`file://` opaque origin 可能污染 origin-clean；
- 任意配置 markup/path/href/style、foreignObject、script、事件属性或远程资源进入 SVG；
- 自动下载、自动 share、自动 clipboard、storage、账号、云端画廊、URL 分享、打印、PDF、PNG、EXIF 或定位；
- 随机、评分、失败、付费价格、库存、购物车或商品推荐。

2026-07-21 已引入十张仅供设计评审的 ImageGen 概念/迭代图，完整文件、prompt、工具、模型暴露状态、日期、尺寸、引用/处理链、SHA-256、第三方输入和权利边界记录在 `docs/assets/flower-language-bouquet/GENERATION.md`；它们不进入运行时，因此本研究的零第三方复制与运行时零图片结论不变，但“零生成资产”结论已失效。

如果未来真正复制代码/素材，或把任一 ImageGen 图转成运行时资产，必须重新审计、保留许可证/版权通知，并更新 README、ATTRIBUTION 与生成台账；不得把 docs-only 结论沿用到生产资产。

## 18. 最小测试 Gate

### 18.1 纯逻辑

1. canonical 初态、新引用、递归冻结与 exact schema；
2. config 正常、整份回退、Unicode/control/lone surrogate、六 ID/顺序/唯一、hostile object/array/Proxy；
3. START、三次 ADD、UNDO、TIE、RESTART 的 phase/revision/headroom 全边界；
4. 重复 flower、第四枝、未知 ID、extra/symbol/accessor、错阶段动作原引用 no-op；
5. `6P3 = 120` 个 ordered result 全部可达且无重复；
6. 顺序反转产生不同组合句与 scene role，同一顺序深相等；
7. 同一 action log、JSON clone 与重放得到字节等价 complete state/view；
8. public view 在 intro/arranging/preview/complete 精确遮蔽 final sentinel；
9. export model 仅 complete 可得，只含三枝与已公开最终字段；
10. state/view/export model 断引用且不含 SVG/Blob/URL/save history。

### 18.2 浏览器

1. 六花全键盘/指针选择，顺序角色、重复 no-op、逐枝撤回、preview、TIE、RESTART；
2. 120 个排列至少由逻辑枚举，浏览器抽查同 ID/不同 ID/反序；
3. 焦点：START、ADD、第三枝 preview、UNDO、TIE、save link、RESTART；
4. ADD1/2、UNDO 走 live；第三 ADD/TIE 只走 heading focus；不重复、不逐帧播；真实 DOM 完整表达花名、花语、角色和结果；
5. reduced-motion、forced-colors、SVG 隐藏/失败仍完整完成；
6. standalone SVG 可重新打开，尺寸/三枝/文本正确，无 script/foreignObject/external href/未选花材/内部字段；
7. export controller 的 unsupported/preparing/ready/error、retry generation、Blob/URL/XMLSerializer 抛错、state 不变与旧 URL 清理；
8. 下载 link 由真实用户激活；不立即 revoke；新 export generation/RESTART 清理，真正 unload 交给平台；不说“保存成功”；
9. Chrome/Firefox/Safari desktop `file://` 与 Android/iOS 实机记录下载/预览行为；
10. 六档视口、200% text、400% zoom、最大配置、56px target、safe-area、零横溢；重新打开最大 SVG，全部 sentinel 实际可见且无裁切；
11. normal/selected/guard/forced-colors 下逐个 Tab 验证所有 card/action/retry/link 的 3px 可见 focus ring；
12. 阶段 sentinel 搜索 DOM/SVG/Blob/href/console/URL/storage/network；
13. 双击 index、根门户、零公网请求、零 storage、零 console error/warning。

## 19. Bugs、学习沉淀与提交边界

实现时如发现：

- download 被忽略、object URL 过早 revoke、Safari 只预览；
- SVG 序列化缺 xmlns、文本转义错误、外链意外进入；
- hostile config、隐私阶段、焦点或 forced-colors 回归；

必须把复现、预期、实际、根因、修复和验证写入 `/bugs`。

值得沉淀的纯数据 scene、DOM/SVG 双投影、显式导出副作用、对象 URL 生命周期、`file://` 保存限制和 SVG 注入防线写入 `/learn`。

进入实现后至少拆成：

1. 调研；
2. 规格；
3. 逻辑与 120 排列测试；
4. DOM/App 与隐私/导出；
5. 已接受概念的视觉与 SVG 几何；
6. README/ATTRIBUTION/索引；
7. 浏览器验收与 bug/learn。

每个完成部分都先检查当前分支与 worktree，再独立提交。

## 20. 进入规格前必须冻结

结论：**Go，按 A 级、零依赖、原创 SVG 实现。**

正式规格还需冻结：

1. 六种默认 name/meaning、最终标题/留言、canonical config 与 hash；
2. 全部 text code-point/控制字符/行数与 hostile snapshot exact contract；
3. canonical state/action/public view/export model 字段顺序；
4. revision 全边界与 120 排列 golden；
5. 六花原创几何 primitive、三个 slot、scene model 与 canonical hash；
6. SVG tree 白名单、22-code-point `<tspan>` 换行、最大 22 行排版 fixture、序列化字节、export controller、Blob URL generation/cleanup 和异常语义；
7. 阶段 sentinel、焦点、live、double/repeat 和生命周期；
8. forced-colors、reduced-motion、六档视口与真实 `file://` 保存矩阵；
9. README/ATTRIBUTION 中所有固定来源、许可证、版权主体、零复制与排除项。

生产视觉仍须等待统一 ImageGen 偏好和概念确认；该 Gate 不阻塞本文件冻结产品、逻辑、隐私、许可证与保存边界。
