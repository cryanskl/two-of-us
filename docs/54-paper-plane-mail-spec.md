# A 级「纸飞机投递」规格

## 1. 定位与 brainstorm

- 创意池：S06「纸飞机投递」；
- 产品名：纸飞机投递；
- ID：`paper-plane-mail`；
- 主分类：单人惊喜；
- 启动等级：A；
- 设备：收件人在一台电脑或手机上操作；
- 公网依赖：无；
- 账号、服务、长期存储：无；
- 首版核心：调节仰角与力度，放飞一架纸飞机；飞入邮箱后才允许打开准备者写好的信。

它补充当前惊喜类缺少的“先完成一个可学习的物理小动作，再获得内容”的样板。首版不加入随机风、多个关卡、计时排名、排行榜、音频、照片、成就、编辑器或联网分享。失败可以无限重试，不惩罚、不扣分。

### 1.1 30 秒体验闭环

```text
开始投递
→ 调仰角与力度
→ 放飞
→ 未命中：给方向性提示并重试
→ 命中：显示已送达
→ 收件人主动打开
→ 才创建并显示最终信件
```

“飞到”与“打开”分成两个 Gate：命中邮箱证明小游戏完成，主动打开保留惊喜节奏。刷新页面从头开始，本次尝试次数不持久化。

## 2. 调研与原创边界

2026-07-18 复核：

- [MDN `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) 明确动画回调频率随显示器刷新率变化，后台标签通常暂停，因此规则推进不能按“每帧固定移动多少像素”实现；
- [MDN `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) 用于识别用户减少非必要运动的偏好；本作可立即演算到结果，而不让可达性依赖飞行动画；
- `happy32x/PaperPlaneGame@177cc4e296981bcb67c151fd3a2e7db748652e4d` 的 GitHub 元数据标记 MPL-2.0；
- `luckyadamsdev/Paper-Pilots@4855322ef485d11ec550190555b64ef51225121e` 的仓库未声明源码许可证，发布页只单独标注一个纸飞机模型的 CC BY 4.0。

后两个项目仅检查仓库元数据、许可证状态和固定 commit，没有读取、运行、复制、改写或打包源码与素材。一个是键盘障碍飞行，一个是 3D 多人空战，都不提供本作的“调角度/力度投递私人信件”结构。

本作自行定义状态机、数值、关卡、碰撞、SVG、文案和视觉；不引入 Paper.js、Matter.js 或 Phaser。完整声明见 `experiences/surprises/paper-plane-mail/assets/ATTRIBUTION.md`。

## 3. 确定性飞行模型

### 3.1 世界与目标

SVG / 规则共享同一逻辑坐标：

```text
世界：1000 × 620
起点：(90, 430)
地面：y = 530
邮箱开口：x = 835..925，y = 330..420
有效仰角：12°..38°，整数
有效力度：0..100，整数
固定步长：1 / 120 秒
重力：85 world-unit / s²
```

力度映射为初速度：

```text
speed = 245 + 155 × power / 100
vx = speed × cos(angle)
vy = -speed × sin(angle)
```

屏幕 y 向下，所以重力增加 `vy`。每一步使用解析位移：

```text
x'  = x + vx × dt
y'  = y + vy × dt + 0.5 × gravity × dt²
vy' = vy + gravity × dt
```

不加入随机风、空气阻力或设备相关系数；画面上的“微风”是邮务视觉，不修改规则。默认 `20° / 70` 在约 2.24 秒时以 `y≈372.6` 穿过邮箱开口，是规格保证的稳定解。

### 3.2 连续碰撞

不能只检查每一步末端是否落在邮箱内。规则用上一位置到下一位置的线段与邮箱 AABB 做连续相交，防止低帧率或高速度越过窄目标。

每步结算顺序：

1. 新线段与邮箱开口相交：`arrived`；
2. 触地且还未到邮箱：`missReason = "short"`；
3. 到达邮箱横向区域但低于开口：`"low"`；
4. 越过邮箱右侧、碰到上界或飞出世界：`"high"`；
5. 否则保持 `flying`。

命中优先于边界失败。终局后所有 `step()` 返回同一引用，过期动画帧不能二次结算。

### 3.3 预览不是答案

瞄准态只显示前 0.85 秒的稀疏预测点，帮助理解角度与力度方向，但不画到邮箱。预测调用与真实规则相同的纯函数，不维护第二份物理常量。

## 4. 权威状态与纯逻辑 API

```js
{
  phase: "intro" | "aiming" | "flying" | "missed" | "arrived" | "revealed",
  angle: 20,
  power: 70,
  attemptNumber: 1,
  plane: { x, y, vx, vy, rotation },
  elapsed: 0,
  missReason: null | "short" | "low" | "high",
  lastOutcome: null | { attemptNumber, angle, power, reason },
  revision: 0
}
```

所有公开状态及嵌套对象递归冻结，不共享调用方对象。

纯逻辑 API：

- `createInitialState(config?)`：整份校验本地配置，创建 intro；
- `start(state)`：仅 intro 进入 aiming；
- `setAim(state, { angle, power })`：仅 aiming 生效，取整并钳制；
- `launch(state)`：只从 aiming 计算初速度并进入 flying；
- `step(state)`：只推进一个固定步长，结算 arrived / missed；
- `retry(state)`：只从 missed 生效，保留上次瞄准，尝试数加一；
- `reveal(state)`：只从 arrived 进入 revealed；
- `restart(state)`：只从 revealed 回到全新 intro；
- `previewTrajectory(state)`：只返回有限、冻结的预览点；
- `resolveHint(policy, context)`：调用可选本地提示策略，异常或非法结果回退默认提示；
- `isFlightState(value)`：畸形状态不进入规则分支。

合法状态的非法操作返回同一引用；畸形状态通过公开动作安全回初始状态，不抛异常。

## 5. 本地配置与用户可参与逻辑

`config.js` 提供：

```js
{
  recipientName,
  senderName,
  letterTitle,
  letterLines,
  signOff,
  hintForMiss(context)
}
```

私人字段采用“整份通过或整份回退”，避免准备者只改了一半后混入默认收件人或默认信件。字符串去首尾空白并限制长度，`letterLines` 为 1–4 段；sanitize 后深冻结副本。

`hintForMiss({ attemptNumber, missReason, angle, power })` 是准备者唯一可写的行为函数，适合在 5–10 行内决定提示风格：

- 方向型：短了就加力度，高了就压角度；
- 逐步型：前两次只给诗意提示，第三次直接给 `20° / 70`；
- 零挫败型：第一次失败就给稳定解。

上下文是冻结副本；函数抛错、修改上下文、返回空串或超过 100 字时，运行时使用默认提示。配置只在本机执行，不上传、不保存。

## 6. 阶段 DOM 与惊喜边界

- intro：只渲染开场说明与“开始投递”；
- aiming / flying：渲染控制、封闭信封和当前飞行图；
- missed：渲染本次结果、提示和“重新折一架”；
- arrived：只显示“已送达”和“打开这封信”，信件正文仍不在 DOM；
- revealed：才创建标题、正文、落款和“再寄一次”。

配置明文仍存在本机 `config.js`，所以这是阶段化界面隐私，不是密码学保密。README 必须诚实说明这一点。

渲染使用 `replaceChildren()`，不把未到阶段的信件预埋后 CSS 隐藏。live region 只播报当前操作、失败方向、送达或揭晓，不提前读出正文。

## 7. 动画循环与 reduced motion

正常模式：

- `requestAnimationFrame(timestamp)` 只提供经过时间；
- accumulator 最多接受 0.25 秒，防止后台恢复后一次跨越整个世界；
- 每次循环反复调用固定 `step()`，渲染只插值/投影权威状态；
- phase 离开 flying 或 revision 变化后，旧回调立即失效。

`prefers-reduced-motion: reduce`：点击放飞后在同一用户动作内循环纯 `step()` 直到 arrived / missed，再一次性渲染结果；不播放横跨屏幕的运动。瞄准、命中判定、尝试数和信件 Gate 完全相同。

## 8. 输入、焦点与反馈

### 8.1 原生控制

- 仰角：`input[type=range]`，12–38，step 1；两侧各有 − / +；
- 力度：`input[type=range]`，0–100，step 1；两侧各有 − / +；
- 键盘：range 使用原生方向键、Home / End，按钮使用 Enter / Space；
- 触屏：range 轨道至少 48px 高，± 与主操作至少 56px；
- 飞行中所有瞄准控件 disabled，避免视觉数值与权威初速度漂移。

intro 聚焦“开始投递”；aiming 聚焦仰角；missed 聚焦“重新折一架”；arrived 聚焦“打开这封信”；revealed 聚焦“再寄一次”。retry 后聚焦首次需要调整的 range。

### 8.2 文本反馈

- waiting：`等待起飞`；
- flying：`飞行中 · 第 N 次投递`；
- short / low / high：说明是提前落地、擦到下沿或飞过上方；
- arrived：`已送达 · 信还封着`；
- revealed：只显示准备者配置的信件，不自动滚动或播放音频。

飞行 SVG 是纯展示图，使用 `role="img"`、`title` 和动态 `desc`；交互全部是外部原生表单控件，不在 SVG 内伪造按钮。

## 9. 视觉规格

方向：午夜航空邮务台（midnight airmail dispatch desk），1950s 编辑部印刷感。

### 9.1 设计令牌

- 午夜墨蓝：`#17233c`；
- 航空信纸：`#f0e3c2`；
- 朱红：`#b4473f`；
- 邮政钴蓝：`#315c9b`；
- 黄铜：`#aa8650`；
- 石墨：`#2b2d2b`；
- 次级纸色：`#c8b990`。

使用直角、双细线、硬偏移阴影、虚线航迹和邮务条纹；不使用渐变、玻璃、霓虹、圆角卡片或远程字体。标题使用本机中文 serif，HUD 与刻度使用 monospace。

### 9.2 桌面 1504×1046

- 顶部一条导航：返回、当前第几次投递；
- 主区约 64/36：左侧横向飞行图，右侧标题、状态、两组瞄准控制、主按钮与封闭信封；
- 首屏完整看见飞行图、两组控制、主动作和本地隐私页脚；
- `night-post-desk.png` 只在边缘提供罗盘、铅笔、邮票和旧桌质感，中央不承载 UI。

### 9.3 移动 390px

顺序为导航、标题、状态、飞行图、仰角、力度、主动作、信封/信件、页脚。飞行图使用同一 1000×620 viewBox；控件自然滚动，不横向溢出，不把整页压进一个视口。

### 9.4 概念与运行资产

- [1504×1046 桌面概念](assets/paper-plane-mail/concept-desktop.png)；
- [839×1875 移动概念](assets/paper-plane-mail/concept-mobile.png)；
- `assets/night-post-desk.png`：1536×1024 无字午夜邮务桌背景；
- 纸飞机、邮箱、预测点、月亮、风标、刻度、信封、信纸、按钮和文字均由代码生成。

移动概念包含浏览器外壳，只作为真实长页密度参考；生产验收截图只截网页 viewport，不仿造地址栏或系统按钮。

## 10. 响应式与无障碍 Gate

- 1504×1046 无横向/纵向滚动，关键控制与页脚首屏可见；
- 390×844 与 320×760 无横向溢出，页脚可自然滚动到达；
- 所有 ±、开始、放飞、重试、打开和再寄按钮至少 56px；
- 两个 range 有可见 label、数值 output、min/max 和键盘原生操作；
- 状态、提示、尝试数和结果不只依赖颜色、飞机位置或动画；
- reduced motion 直接演算到结果，不播放大幅横向运动；
- 200% 页面缩放后仍可操作，信件正文不被固定高度裁切；
- revealed 前，信件正文、落款和标题不在页面 DOM。

## 11. 自动测试 Gate

至少覆盖：

1. 常量、力度映射、角度钳制与初始状态冻结；
2. 默认 `20° / 70` 确定命中，结果与帧分组无关；
3. 低角、低力度和高角分别产生稳定 missReason；
4. 连续线段与邮箱 AABB 相交，不能越过目标；
5. intro → aiming → flying → arrived → revealed → restart 唯一路径；
6. missed → retry 保留瞄准、尝试数加一，不泄漏信件；
7. 飞行中改瞄准、终局 step、非法 reveal/retry 保持原引用；
8. 配置整份回退、深冻结、调用方所有权隔离；
9. 提示策略冻结上下文，异常与非法返回安全回退；
10. catalog A 级、经典脚本、相对资源、无网络/Storage/第三方运行时。

整仓继续要求 `npm test`、`npm run verify` 与 `git diff --check` 通过。

## 12. 浏览器验收路径

1. intro 开始，确认仰角 range 获焦；
2. 用鼠标拖 range、键盘方向键和 ± 按钮分别改值；
3. 用一个确定失败组合，确认 missReason、提示、尝试数与 retry 焦点；
4. retry 后用 `20° / 70`，完整观看并命中邮箱；
5. arrived 时全文不在 DOM，激活“打开这封信”后才出现；
6. restart 后全文再次从 DOM 移除、尝试数归一；
7. 检查 1504×1046、390×844、320×760 与 200% 缩放；
8. 模拟 reduced motion，确认点击放飞立即得到同一结果；
9. 控制台 0 error / 0 warning，请求只含同源 HTML/CSS/脚本/PNG；
10. 用真实 Chrome `file://` 直开，确认配置、背景、SVG、飞行与最终揭晓不依赖服务。

## 13. 分批提交计划

1. 规格提交：本文、桌面/移动概念、无字运行背景和来源声明；
2. 功能提交：状态机、配置、页面、目录接入、自动测试和浏览器修复；
3. 验收提交：实装截图、完整报告、逐 bug 记录与跨项目学习沉淀。

每一部分完成后先运行适用 Gate，再独立提交；不把未验证实现混入规格提交。
