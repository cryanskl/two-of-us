# 「双人小馆」实现与验收记录

## 1. 结论

「双人小馆」已作为 A 级双人合作作品接入统一门户。两位玩家在同一设备上分工：传菜员选择订单下一样食材与滑槽，装盘员独立移动盘子；四张订单按顺序出完即共同成功，三次错接或漏接则共同暂停营业。

作品可直接双击 `index.html`，不需要安装依赖、账号、服务或公网。鼠标、触控、键盘、在途移盘、安全随机、失败/成功/重开、焦点、live region 与响应式均已验证。

本批提交：

- `93d8cc7`：brainstorm、规格、桌面/移动概念、运行资产与来源声明；
- `f18ee0a`：状态机、页面、catalog、门户、测试与响应式实现；
- 本文所在提交：浏览器截图、缺陷记录与学习沉淀。

## 2. 自动 Gate

### 2.1 作品纯逻辑

`node --test experiences/co-op/kitchen-relay/logic.test.js`：9 / 9 通过，覆盖：

- 初始冻结状态、无偏 32 位索引接受/拒绝边界；
- 四张唯一订单和每阶段恰好一个正确候选；
- 非法随机返回值、畸形计划与调用方所有权；
- 传菜循环选择、装盘边界钳制和非法阶段原引用；
- flight 锁定、单调 token、在途移盘和过期回调；
- 正确、错接、漏接、进度保留与第三次失败；
- 四单唯一成功、订单交接、重开和畸形状态回退。

### 2.2 整仓

- `npm test`：306 / 306 通过；
- `npm run verify`：26 个作品入口、1 个能力声明、资源与借鉴声明完整；
- `git diff --check`：通过；
- catalog Gate 确认 A 级入口、经典脚本、相对本地资源、无网络、无持久化、无 `Math.random`；
- 生产脚本语法与作品静态扫描通过，CSS 不含 gradient。

## 3. 真实浏览器完整实玩

先连接内置 Browser/IAB，本次环境返回 `No browser is available`，因此按前端验收规则使用 Playwright CLI 的 headed Chromium 作为 fallback；同目录静态服务为 `127.0.0.1:8767`。

一次随机完整会话实际走完：

1. 开门后焦点落到 `W 传菜`，订单与三个候选正确显示；
2. 先把错误食材接到同一滑槽，得到明确 wrong 文案与 `1 / 3`；
3. 再把正确食材发往没有盘子的滑槽，得到明确 missed 文案与 `2 / 3`；
4. 在只剩一次容错时完成后续 12 次正确接取，四张订单依次进入 order-clear，最终为 success、`4 / 4`；
5. 全流程交替使用按钮和 A / D / W / 方向键，订单交接与终局主按钮都自动聚焦；
6. 重新开始后连续三次错接，唯一进入 failed，显示 `3 / 3`，可见文案和 live region 都说明三次洒落；
7. success 与 failed 都能回到 intro，旧终局播报不会残留。

正常会话控制台 0 error / 0 warning；性能资源清单没有外部 URL。页面仅请求同源 HTML、CSS、三个脚本和两张本地 PNG。

### 3.1 `file://` 双击路径

Playwright CLI 自身阻止 `file:` 导航，这不是作品限制。为验证真实 A 级承诺，另启 headless Google Chrome 直接加载：

`file:///Users/zenith/Desktop/two-of-us/experiences/co-op/kitchen-relay/index.html`

通过 Chrome DevTools Protocol 实测：

- intro 正常加载，三个经典脚本均为相对 `file://` URL；
- `kitchen-pass.png` 完成加载，天然宽度 1536px；
- `crypto.getRandomValues` 可用；
- 点击“开门营业”后进入 service，三个候选启用，下一样正常生成；
- 焦点为 `W 传菜`，没有进入“本机随机数不可用”分支。

因此“双击作品 HTML 即可运行”由真实 Chrome `file://` 会话确认，不只由静态扫描推断。

## 4. 响应式、触控与可访问性

| 视口 | 结果 |
| --- | --- |
| 1504×1046 service | `scrollWidth = 1504`、`scrollHeight = 1046`；订单、滑槽、控制台、进度和隐私页脚全部在首屏 |
| 390×844 service | `scrollWidth = 390`、页面高 1751px；单列自然滚动，无横向溢出，按钮最小边长 54px |
| 320×760 service | `scrollWidth = 320`、页面高 1676px；最小按钮边长 54px，配方右边界 286px，页脚可滚动到达 |

补充验证：

- intro 的飞行卡既有 `hidden` 属性也计算为 `display: none`；
- 当前传菜滑槽使用 `aria-pressed`，盘子位置有文本标签，不只依赖颜色；
- correct / wrong / missed、order-clear、success、failed 都同步到可见事件条；
- 终局与交接主按钮自动聚焦，service 直接聚焦 `W 传菜`；
- `prefers-reduced-motion` 把飞行缩短为 120ms，不改变 token 或 reducer；
- 所有运行文字和状态均由 HTML/CSS/JS 原生生成，不烘焙在概念图里。

截图：

- [1504×1046 桌面 service](assets/kitchen-relay/implementation-desktop-1504x1046.png)
- [390×844 移动 service](assets/kitchen-relay/implementation-mobile-390x844.png)

## 5. 视觉忠实度账本

概念：[1504×1046 桌面稿](assets/kitchen-relay/concept-desktop.png)、[852×1847 移动稿](assets/kitchen-relay/concept-mobile.png)。最终 QA 在同一次检查中用 `view_image` 原生查看两张概念和两张真实 Chromium 截图。

| 比较点 | 概念证据 | 实现证据与处理 |
| --- | --- | --- |
| 色板 | 番茄红、薄荷绿、奶油纸、芥末黄、深墨蓝 | 固定 CSS token 对齐；没有 CSS 渐变 |
| 桌面构图 | 左标题、右订单、中央三层传菜窗、底部双角色控制与共享进度 | 1504×1046 运行截图保持相同区域关系并完整落在首屏 |
| 传菜窗 | 复古搪瓷/金属三层滑槽，左右有编号和状态灯 | 生成 `kitchen-pass.png` 只承载无字场景；滑槽选择框、编号、灯与盘子由代码覆盖 |
| 食材表达 | 番茄、芝士、面包等手绘食材卡 | 生成 3×2 sprite sheet 提供六种食材，候选、配方和 flight 共用同一来源 |
| 订单票 | 大标题、菜名、顺序配方、下一样强调 | 生产票据按真实 reducer 渲染三格状态，当前格红框、完成格绿框 |
| 双角色控制 | 传菜员番茄红、装盘员薄荷绿，按键和滑轨分区 | 生产页保持双区独立状态，并增加共享进度中栏以避免个人记分 |
| 移动层级 | 顶栏、标题、订单、三滑槽、双控制、进度、隐私 | 390px 真实页面按同一叙事自然滚动，首屏看见订单和传菜窗起点 |
| 纸张与机械质感 | 磨损珐琅、旧纸、硬阴影、丝网印刷 | 生成本地资产配合实线/虚线、硬偏移阴影和窄体字，不依赖滤镜或外部字体 |

### 首屏文案差异

生产 service 首屏保留：`双人小馆`、`一个选对食材，一个接稳盘子。`、`今日订单`、菜名、`下一样`、双方角色、失误、一起出餐和本地隐私。桌面概念中的“本地运行 · 不联网 · 不保存”从顶栏移到固定页脚，让顶栏右侧用于真实第几单状态；移动概念也使用顶部订单数，因此语义一致。

### 有意偏差

- 概念桌面把飞行食材固定画在中央，生产截图停在 service 待发送阶段，不伪造在途状态；实际 dispatch 会出现 760ms flight；
- 概念移动稿为每条滑槽都画一个盘子，生产规则只允许一个共享盘子，避免误导为三次同时接取；
- 概念移动稿把角色控制并列在长画布中，390px 生产页改为单列，让所有按钮保持至少 54px；
- 概念订单使用四格装饰进度，真实每道配方固定三样，因此生产票只渲染三格；四张订单的共享进度单独放在控制台；
- 概念包含人物插画和更多机械装饰，生产页移除不可操作人物，给真实候选、按键、焦点描边和状态文案留出空间。

偏差均服务于真实规则、可访问性或窄屏触控；主构图、色板、传菜窗、票据、双角色分工和复古方向达到可签收忠实度。

## 6. 缺陷与沉淀

- [`hidden` 飞行卡被组件样式重新显示](../bugs/2026-07-17-kitchen-relay-hidden-flight-card.md)
- [营业态超出概念原生桌面高度](../bugs/2026-07-17-kitchen-relay-desktop-height-budget.md)
- [营业与下一单后焦点没有落到传菜操作](../bugs/2026-07-17-kitchen-relay-service-focus.md)
- [第三次洒落的普通事件覆盖失败反馈](../bugs/2026-07-17-kitchen-relay-terminal-feedback.md)
- [Token 守卫的双角色协作交接](../learn/2026-07-17-token-guarded-cooperative-handoff.md)

## 7. 借鉴与来源复核

创意来自仓库原创创意池 C17。运行代码、状态机、配方、视觉布局、文案和测试均为原创，只使用流水线传递、按序配方、分工接取和共享容错这些通用机制；没有参考、复制、改写或引入特定开源项目。

视觉概念、传菜窗和食材图集由 OpenAI ImageGen 生成；所有运行文字、票据、按钮、HUD、盘子与状态框由代码原生渲染。完整声明见作品 [`README.md`](../experiences/co-op/kitchen-relay/README.md) 与 [`assets/ATTRIBUTION.md`](../experiences/co-op/kitchen-relay/assets/ATTRIBUTION.md)。若以后参考开源项目，必须补固定 URL、commit、许可证和实际借鉴边界。
