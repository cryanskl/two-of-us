# A 级「一层一层」规格

> 创意池：S20 套娃礼盒 · 主分类：单人惊喜 · 启动等级：A · 状态：待实现

## 1. Brainstorm 结论

「一层一层」是一份由一人准备、另一人独自打开的本地惊喜。体验者连续拆开四层逐渐变小的礼盒；每层使用不同输入方式，并在完成后收到一句只属于这一层的留言，最后打开盒心的完整心意。

它补的是仓库目前缺少的“多种手势逐层靠近核心”模型：

- 不复用刮刮卡的连续 Canvas 擦除；
- 不复用未来车票的盲选组合；
- 不复用拍立得的交替甩动显影；
- 不复用拆信封的纯内容翻页；
- 不需要照片、音乐、账号、网络、存储或设备权限。

第一版只做一个入口、四层盒子、四种输入、一条最终留言和完整重开。不增加礼盒编辑器、导出图片、自动播放、音效包或长期保存。

## 2. 30 秒规则

开场只说明一句：`每拆开一层，就离我想说的话近一点。`

四层固定顺序：

1. **解丝带**：分别解开左、右两条丝带，顺序不限；
2. **揭包装**：依次揭开四个纸角，顺序不限；
3. **拉抽屉**：拖动原生 range，把抽屉拉到 80% 以上；
4. **敲盒盖**：轻敲三次，第三次完成。

每层完成后进入独立 note Gate，显示准备者写的本层留言。只有激活 `继续拆下一层` 才能进入下一层；第四层按钮为 `打开盒心`，之后进入最终惊喜。刷新页面从头开始。

## 3. 状态与权威边界

### 3.1 状态

```js
{
  phase: "intro" | "layer" | "note" | "complete",
  layerIndex: 0..3,
  ribbon: { left: boolean, right: boolean },
  peeledCorners: [boolean, boolean, boolean, boolean],
  drawerProgress: 0..100,
  knocks: 0..3,
  revision: non-negative safe integer
}
```

状态及嵌套对象全部冻结。合法操作返回新状态，错误阶段、重复操作和非法参数保持原引用；畸形状态安全回到初始状态。

### 3.2 Gate

- `start`：仅 intro → layer 0；
- `releaseRibbon(side)`：仅 layer 0；左右都完成才进入 note；
- `peelCorner(index)`：仅 layer 1；四角都完成才进入 note；
- `setDrawerProgress(value)`：仅 layer 2；整数钳制到 0–100，达到 80 进入 note；
- `knock()`：仅 layer 3；第三次进入 note；
- `continueOpening()`：note 0–2 进入下一层并清空该层输入；note 3 唯一进入 complete；
- `restart()`：仅 complete 回 intro，并递增 revision。

动画不决定规则。丝带位移、纸角翻折、抽屉移动和盒盖震动只呈现 reducer 已接受的状态，不通过 `animationend` 加进度。

## 4. 可编辑配置

`config.js` 暴露：

```js
{
  recipient,
  sender,
  introNote,
  layerMessages: [four strings],
  finalTitle,
  finalMessage,
  invitation,
  acceptText
}
```

规则层提供整份 `sanitizeConfig`：字段缺失、不是字符串、超长或层数不是 4 时整份回退默认值。所有输入 trim 后复制并冻结，页面不使用 `innerHTML`。

准备者只需修改 8–10 行文字即可完成个性化；默认示例本身可完整运行。私人内容是本地明文，不上传也不构成密码学隐藏。

## 5. 输入、焦点与可访问性

- 丝带和纸角使用真实 button，支持鼠标、触控、Enter 与 Space；
- 抽屉使用原生 `input[type=range]`，方向键、触控拖动和鼠标均可；
- 敲击使用真实 button，实时显示还需几次；
- 每层进入时聚焦第一个未完成操作；note、complete 聚焦唯一主按钮；
- 已完成输入 disabled，并同时用文字、形状和颜色表示；
- `aria-live` 只播报动作完成、层留言和终局，不提前读出下一层或最终惊喜；
- `prefers-reduced-motion` 取消盒体弹跳、纸角翻转和大幅位移，不改变 reducer。

## 6. 视觉规格

### 6.1 概念

- [桌面 1504×1046](./assets/nested-gift/concept-desktop.png)
- [移动 852×1846](./assets/nested-gift/concept-mobile.png)

方向：深夜礼物工坊。深墨蓝纸纤维桌面是准确背景角色；奶油纸文字，朱红丝带，孔雀绿包装，芥末黄抽屉，少量灰粉点缀，旧黄铜五金。媒介是高级编辑丝网印刷、日式文具和中世纪包装的混合，不走卡通、霓虹或玻璃拟态。

### 6.2 设计系统

- 背景：`#071723` 深墨蓝，不使用 CSS gradient；
- 主文字/纸面：`#f1d7ad` / `#f6e5c7`；
- 朱红：`#9f2f22`；孔雀绿：`#234b42`；芥末：`#d79b25`；
- 边框：1–3px 实线或双线；阴影：硬偏移，不使用 glow；
- 标题：中文窄体/宋黑混合 fallback，桌面约 7rem，移动约 5rem；
- UI chrome：等宽字体，控制文字不低于 1rem；
- 按钮最小高度 56px，移动主动作不低于 64px；
- 容器：一个开放式工作台，不使用 bento 或重复卡片网格。

### 6.3 资产

运行资产 [`gift-layers.png`](../experiences/surprises/nested-gift/assets/gift-layers.png) 为 1536×1024 的严格 3×2 图集：

1. 朱红奶油花纸外盒；
2. 孔雀绿四角包装盒；
3. 芥末黄抽屉盒；
4. 墨蓝漆器小盒；
5. 奶油折叠信卡与空白信物；
6. 空墨蓝桌面。

CSS 使用 `background-size: 300% 200%` 与固定位置切换，不在运行时裁概念图。所有按钮、进度、文字、丝带/纸角完成态和 HUD 由代码渲染。

### 6.4 首屏可见文案锁

允许出现：

- `← Two of Us`
- `第 1 / 4 层`
- `一层一层`
- `每拆开一层，就离我想说的话近一点。`
- `先把两边的丝带都解开。`
- `解开左边`
- `解开右边`
- `还有 4 层`
- `本地运行 · 不联网 · 不保存`

不新增 eyebrow、标签 pill、统计卡、第二说明段或额外 CTA。

## 7. 响应式目标

- 1504×1046：intro 与 layer 1 的顶栏、标题、礼盒、两动作、四层轨与隐私全部首屏可见；
- 390×844：标题、礼盒和本层指令优先；控制与进度自然滚动，无横向溢出；
- 320×760：最小操作边长 ≥ 48px，图集不被横向裁出页面；
- note 与 complete 的唯一主动作必须在内容之后自然可达；
- 桌面、移动都不把概念图直接当页面背景。

## 8. 测试与验收

纯逻辑至少覆盖：

1. 默认配置、整份配置清洗与深冻结；
2. 四层顺序与四种 Gate；
3. 左右丝带/四角的任意顺序、重复输入与非法索引；
4. drawer 钳制、80 阈值和非整数拒绝；
5. 三次 knock、note 交接和 complete 唯一路径；
6. 非当前层操作、complete 后输入和畸形状态；
7. restart revision 与调用方配置所有权。

真实浏览器必须完成：鼠标/触控路径、键盘路径、四层全流程、最终接收、重开、焦点、live region、reduced motion、桌面/移动布局、0 error / 0 warning、无外部请求，以及真实 Chrome `file://` 双击路径。

## 9. 借鉴与来源声明

创意来自本仓库原创创意池 S20。玩法、状态机、配置、文案、DOM、CSS 与测试均自行实现，只使用套娃礼盒、拆包装、抽屉与敲击这些通用现实机制；没有参考、复制、改写或引入特定开源项目。

视觉概念和运行图集由 OpenAI ImageGen 生成。仓库不引入商业音乐、第三方字体、图标库或外部图片。若以后参考开源项目，必须补固定 URL、commit、许可证和实际借鉴边界。

## 10. 提交计划

1. `docs: specify nested gift surprise`：本文、概念、图集与来源声明；
2. `feat: add nested gift surprise`：状态机、配置、页面、catalog、门户和测试；
3. 若浏览器发现独立缺陷，按问题单独 fix commit；
4. `docs: verify nested gift experience`：截图、bug、learn 与验收记录。
