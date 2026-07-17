# A 级「拍立得显影」惊喜体验规格

## 1. Brainstorm 结论

本批实现一款准备者预先放好单张照片与四段文字、收礼者打开后亲手让它显影的本地惊喜。页面先显示一台即时相机；按下快门后相纸从出片口推出，但画面仍灰白模糊；收礼者用鼠标或手指把相纸左右交替摇过阈值，也可用方向键交替输入。九次有效摇动逐层增加清晰度，完成后才出现标题、印记、照片说明和最终一句话。

| 方案 | 价值 | 风险与成本 | 本批决定 |
| --- | --- | --- | --- |
| 打开即展示完整照片与文案 | 最简单 | 没有参与和揭晓节奏 | 不采用 |
| 让收礼者现场上传照片 | 通用 | 变成工具，不是准备好的惊喜 | 不采用 |
| 准备者在 `config.js` 预置单张照片 | 交付边界清楚、可直接赠送 | 需要安全路径与失败回退 | 采用 |
| 读取设备摇一摇传感器 | 手机自然 | 权限、浏览器和误触差异大 | 首版不做 |
| 指针任意移动累计距离 | 操作简单 | 高频事件和小抖动可瞬间刷满 | 不采用 |
| 左右越过阈值且方向交替才计一次 | 鼠标、触屏、键盘规则统一 | 要给出明确方向反馈 | 采用 |
| 多张照片做成相册 | 内容丰富 | 机制、配置、预加载和结果页膨胀 | 首版严格单张 |
| 显影完成后下载或保存 | 有纪念品感 | 引入文件权限与移动端差异 | 不做 |

作品名为「拍立得显影」，目录 ID 为 `instant-photo`，主分类为单人惊喜，等级 A。它补齐“准备好的私人媒介 → 物理手势投入 → 分层视觉揭晓 → 最终文案”的互动模型，不新增运行依赖。

## 2. 受众、唯一任务与语气

- **准备者**：把一张有意义的本地照片复制到 `assets/`，再编辑五行配置；
- **收礼者**：按下快门，左右交替摇动相纸直到照片和话语完整显现；
- **唯一任务**：让相纸九次有效越过左右阈值；
- **单次时长**：约 30–60 秒；
- **语气**：温柔、轻快、像共同等一张照片慢慢出现；不使用“永远”“命中注定”等过度承诺；
- **首局理解目标**：10 秒内知道“按快门，然后左右摇照片”。

## 3. 严格最小范围

只实现：

- 单张本地预置照片；
- intro 快门、出片动画和 developing 状态；
- 鼠标/触屏横向拖拽、方向键替代；
- 九次交替有效摇动与 0–100% 显影进度；
- 影像灰白、模糊、低饱和到完整清晰的连续变化；
- 完成后创建四段私人文案；
- 图片加载失败时回退到内置示例；
- 重新显影；
- `prefers-reduced-motion` 与键盘焦点。

明确不做文件选择器、相册、多图轮播、拍摄摄像头、设备运动传感器、滤镜编辑、裁切、下载、打印、分享、二维码、账号、存储、联网或后台预加载服务。

## 4. 配置与个性化

### 4.1 配置结构

`config.js` 暴露经典脚本全局 `window.INSTANT_PHOTO_CONFIG`：

```js
{
  photo: "./assets/demo-bicycles.png",
  title: "那天，风刚刚好",
  stamp: "海边 · 某个慢下来的傍晚",
  caption: "两辆车停在海边，像在等我们把步调放慢。",
  finalNote: "下一张，换我们一起出现在画面里。"
}
```

这五行是准备者唯一需要修改的内容。README 必须说明：把自己的 JPG / PNG / WebP / AVIF 放进 `assets/`，再只改相对路径；不要提交不适合公开的私人照片。

### 4.2 校验

- `photo` 为 1–160 个字符，仅接受当前目录下的安全相对路径；
- 拒绝 `http:`、`https:`、协议相对 URL、绝对路径、反斜杠、查询参数、fragment、`data:` 与任意 `..` 路径段；
- 扩展名只接受 `.jpg / .jpeg / .png / .webp / .avif`，大小写不敏感；
- `title` 1–24 字符，`stamp` 1–32，`caption` 1–70，`finalNote` 1–80；
- 全部字符串 trim 后校验，HTML 标签仅作普通文本，以 `textContent` 写入；
- 任一字段不合法则整份回退到冻结的默认配置，不混合半份用户配置；
- 用户照片加载失败时只把 `photo` 回退为内置示例，保留已经通过校验的私人文案；内置示例也失败则显示可操作错误，不伪装完成。

## 5. 状态机与摇动规则

```text
intro
  └─ CAPTURE → ejecting(ejectToken + 1)

ejecting
  └─ FINISH_EJECT(current token) → developing

developing
  └─ SHAKE(left|right)
       ├─ direction = lastDirection → no-op
       ├─ acceptedShakes < 8 → developing(count + 1)
       └─ acceptedShakes = 8 → complete(count = 9)

complete
  └─ RESTART → intro
```

权威状态字段：

```text
phase: intro | ejecting | developing | complete
acceptedShakes: integer 0..9
lastDirection: null | left | right
ejectToken: non-negative integer
```

纯逻辑约束：

- `CAPTURE` 只从 intro 生效并增加 token；
- `FINISH_EJECT` 只接受当前 ejectToken，过期 animation/timeout 回调无效；
- `SHAKE` 只在 developing 接受 `left / right`；第一次任一方向有效，之后必须与上次方向不同；
- 第九次有效输入唯一进入 complete；
- progress 派生为 `Math.round(acceptedShakes / 9 * 100)`，不单独存储；
- 非法阶段、未知方向、连续同向输入保持同一状态引用；
- 畸形状态回到冻结的初始状态；所有返回状态冻结，不修改调用方对象。

浏览器拖拽规则：

- `pointerdown` 记录相纸中心与 pointerId，并调用 `setPointerCapture`；
- 水平位移超过 `+48px` 进入 right zone，低于 `-48px` 进入 left zone；每次进入 zone 最多派发一次；
- 必须跨到相反 zone 才能产生下一次有效摇动；松手后相纸回中，但 reducer 仍保留 lastDirection；
- 卡片视觉位移限制在 `[-76px, +76px]`，旋转限制在约 `[-4deg, +4deg]`；
- `pointercancel / lostpointercapture / blur / visibilitychange` 都结束拖拽并回中，不增加进度；
- 键盘 ArrowLeft / ArrowRight 使用同一 reducer，忽略 `event.repeat`。

## 6. 分层显影与内容边界

### 6.1 显影视觉

`progress` 只驱动派生样式：

- 图像 opacity 从约 0.18 到 1；
- grayscale 从 1 降到 0；
- blur 从 5px 降到 0；
- saturation 从 0.55 升到 1；
- 奶白 developing veil opacity 从约 0.82 降到 0；
- 每次有效摇动只更新 CSS 变量和进度文案，不重新加载图片。

这些变化不能只靠颜色：同时显示百分比、九个进度孔和“还差 N 次”。`prefers-reduced-motion` 下取消卡片回弹、出片位移和旋转，但每次方向输入仍立即更新清晰度与文字。

### 6.2 私人文案 DOM 边界

这不是加密：照片路径和文案存在本地 `config.js`，查看源码的人可以读取。产品只保证正常视觉流程和辅助技术不会提前播报结尾：

- 静态 HTML 不硬编码默认私人标题、印记、说明或 finalNote；
- intro / ejecting / developing DOM 不创建四段私人文案节点，也不放入 hidden、`aria-label`、title、data 属性或 CSS 变量；
- complete 才以 `textContent` 创建 title、stamp、caption、finalNote；
- developing 中照片已经进入 DOM 并逐步可见，README 如实说明它不是安全保密；
- 不把配置、图片路径、显影结果或拖拽轨迹写入 console、URL、网络或存储。

## 7. 图片生命周期与错误处理

- 页面启动后用内存 `Image` 预加载已校验的配置路径，不创建 object URL；
- 点击快门时若配置图片已成功，直接绑定；仍在加载则允许出片，图片完成后继续当前显影进度；
- 配置图片 `error` 时加载 `./assets/demo-bicycles.png`；
- 回退成功时只显示中性说明“准备的照片暂时没有装好，先用示例继续”，不泄露原路径；
- 两次都失败时相纸显示错误态、“检查 assets 中的照片路径”和“重新检查”按钮；错误态不允许显影或完成；
- 重开复用同一已加载 Image，不重复请求；卸载无需释放 Blob，因为只使用相对资源。

## 8. 视觉系统

视觉概念：[浅蓝即时相机与摇动相纸](assets/instant-photo/concept.png)，原生尺寸 `1504×1046`。配套运行资产：珊瑚红即时相机 `camera.png` 与海边双车示例 `demo-bicycles.png`。相机资产四角实测约 `#c4d9e1`，页面背景锁到同一色域；不在图片上增加颜色蒙层。

### 8.1 方向

**1980 年代即时相机 + 轻编辑感产品摄影**。背景是真浅粉蓝，主相机为珊瑚红，相纸为暖奶油白，按钮与细节为黄油黄，文字为深海军蓝。与已有纸质车票、深夜电台、游乐园气球视觉区分。

固定令牌：

| 角色 | 值 |
| --- | --- |
| 真浅蓝背景 | `#c4d9e1` |
| 深海军蓝 | `#102d55` |
| 珊瑚红 | `#ed6555` |
| 相纸奶油白 | `#f7f0e2` |
| 黄油黄 | `#efc94c` |
| 次级蓝灰 | `#5f7887` |
| 硬阴影 | `#102d55`，低透明度 |

UI 不使用 CSS 渐变、玻璃拟态、光晕或爱心装饰。照片本身可以保留自然光线变化。

### 8.2 构图与组件

- 桌面首屏：安静顶栏；左上超大标题；左下/中央相机；相纸从相机上方伸出并成为最大交互物；右侧为摇动说明、方向轨与进度；
- 移动端：导航/HUD → 标题 → 相纸 → 方向说明/进度 → 相机局部 → 隐私说明；保证相纸宽度足够拖拽；
- 标题用粗窄几何中文黑体回退，正文用人文无衬线，百分比与进度用等宽字体；
- 相纸由 HTML/CSS 原生边框、阴影和 caption 区构成，照片资产只填充画面窗口；
- 相机是生成式 PNG 背景资产；相纸叠在其出片口，不把相纸或按钮烘焙进相机图；
- 左右方向使用成对生产级 SVG 箭头，不能用纯文本箭头代替；
- 九个进度孔为真实状态，不是装饰性指标；
- 主动作仅 intro 的“按下快门”和 complete 的“再显影一次”。

## 9. 首屏与阶段文案锁

允许出现在 intro/developing 首屏的固定文案：

- `← Two of Us`
- `拍立得显影`
- `有些画面，要慢慢才看得清。`
- `等待快门` / `显影 {progress}%`
- `按下快门`
- `左右摇动这张照片`
- `每次越过中线，影像会更清楚一点。`
- `还差 {N} 次`
- `也可以用键盘 ← → 键`
- `照片只从本地读取 · 不联网 · 不保存`

complete 才允许配置中的 title、stamp、caption、finalNote 与 `再显影一次`。不添加 eyebrow、badge、进度百分比以外的假指标、上传控件、编辑工具栏或第二 CTA。

## 10. 文件结构与接口

```text
experiences/surprises/instant-photo/
├── index.html
├── styles.css
├── config.js
├── logic.js
├── app.js
├── logic.test.js
├── README.md
└── assets/
    ├── camera.png
    ├── demo-bicycles.png
    └── ATTRIBUTION.md
```

`logic.js` 使用 IIFE 暴露 `window.INSTANT_PHOTO_LOGIC`，并可由 Node 加载。最小接口：

```text
DEFAULT_CONFIG
SHAKES_REQUIRED
sanitizeConfig(input)
createInitialState()
capture(state)
finishEject(state, token)
shake(state, direction)
restart(state)
getProgress(state)
```

浏览器层负责图片预加载/回退、DOM 派生、pointer zone、键盘、出片动画、SVG 图标和焦点；纯逻辑不读取 DOM、图片、时钟或指针坐标。

## 11. 本地优先与借鉴声明

- 不使用 fetch、XHR、WebSocket、CDN、远程字体、localStorage、sessionStorage、IndexedDB、Cache API、Service Worker、账号、统计或遥测；
- 双击 `index.html` 即可运行，刷新清空显影进度；
- 不请求相册、文件、摄像头、设备运动、位置、剪贴板或通知权限；
- 玩法、配置校验、交替摇动规则、状态机、DOM、CSS、SVG、中文文案和测试均为仓库原创；
- 视觉概念、相机和默认双车照片由 OpenAI ImageGen 生成，没有复制开源项目或品牌产品；
- 只借鉴即时相纸显影这一通用现实过程和 Pointer Events 浏览器标准，不参考或复制特定开源实现；
- `assets/ATTRIBUTION.md` 记录生成日期、用途、修改和未复制边界。后续替换私人照片时由准备者自行确认公开/赠送权限。

## 12. 验收 Gate 与提交边界

### 自动 Gate

- 配置覆盖安全相对路径、扩展名、长度、全量回退与深冻结；
- reducer 覆盖 token、同向 no-op、九次交替、完成、重开、畸形输入与冻结；
- 静态 Gate 覆盖 A 级入口、无 Module/远程/网络/存储/权限 API；
- HTML 不硬编码默认私人四段文案；
- `npm test` 与 `npm run verify` 全绿。

### 浏览器 Gate

- 完成快门 → 出片 → 九次交替 → 四段文案揭晓 → 重开；
- 鼠标拖拽、触屏等价 pointer、方向键均验证；
- 同向重复、未越阈值、pointercancel 不增加进度；
- 图片成功、配置图片失败回退、双失败错误态至少自动/手工覆盖；
- complete 前 DOM 不包含私人四段文案；
- Browser/IAB 优先，必要时记录 Playwright fallback；
- 1504×1046 概念原生尺寸、390×844、320×760 无横向溢出；
- reduced-motion 下可完整操作；网络面板无外部请求。

### 独立提交

1. 本规格、视觉概念、相机/示例照片资产与来源声明；
2. 配置、纯逻辑、运行页、catalog、门户与自动测试；
3. 浏览器验收、bug、学习沉淀与必要修复。
