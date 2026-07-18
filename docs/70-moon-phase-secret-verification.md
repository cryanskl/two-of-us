# A 级「把月亮拨回那一天」验收记录

> 验收日期：2026-07-18。实现规格见 [`67-moon-phase-secret-spec.md`](./67-moon-phase-secret-spec.md)，视觉基准见 [`68-moon-phase-secret-design.md`](./68-moon-phase-secret-design.md)。

## 1. 结论

「把月亮拨回那一天」已作为第 34 个作品、26 个 A 级作品接入门户。完整作品目录可单独复制，双击 `index.html` 即可从 `file://` 完成开场、错误/部分核对、三轴解锁和重开；运行时无共享脚本、第三方包、公网、存储、媒体权限或 Service Worker。

准备者可直接编辑 `config.js` 的日期、三条线索和最终留言，也可在 5–10 行 `composeClues(context)` 中贡献私人线索策略。配置是本机明文与舞台式揭晓，不是加密保险箱。

## 2. 自动 Gate

环境：Node `v22.22.3`，Chromium `150.0.7871.125`。

| Gate | 结果 |
| --- | --- |
| 月相定向逻辑 | 15 / 15 通过 |
| 全仓 `npm test` | 423 / 423 通过 |
| `npm run verify` | 34 个作品入口、1 个能力声明通过 |
| `node --check app.js / logic.js` | 通过 |
| `git diff --check` | 通过 |
| 日期时区 | UTC、Honolulu、Kuala Lumpur、New York 四个独立 Node 进程一致 |
| 天文抽样 | 2000-01-06/14/21/28 → 新月/上弦/月圆/下弦四档稳定 |
| 源码边界 | 无远程/协议 URL、模块脚本、fetch/XHR/WebSocket、存储、Cookie、媒体权限与 Service Worker |

## 3. 真实浏览器流程

### `file://` 直开

Chromium 从绝对 `file:///Users/zenith/Desktop/two-of-us/experiences/surprises/moon-phase-secret/index.html` 打开：

- intro 的最终留言节点为 0，`body.textContent`、`aria-*`、`data-*` 和 style 属性均不含最终标题/正文；
- 点击开始后焦点进入月份圆环，三条线索才创建；
- `ArrowLeft` 从 1 月环绕到 12 月，`Home` 回到 1 月；
- 初始错误核对显示三项“还没对齐”，只把月份拨到 5 月后只显示月序对齐；
- 5 月、20 日、盈凸月同时对齐后，`.final-message` 恰为 1、所有调节禁用、焦点进入最终标题；
- 重开后 stage 回 intro，留言与线索节点归零、live region 清空、焦点回主动作；
- 1504×1046 的 intro 和 unlocked 均满足 `scrollWidth === innerWidth`、`scrollHeight === innerHeight`；
- 正常路径控制台 0 error / 0 warning。

### 鼠标、键盘与真实 touch

- 鼠标沿月份圆环顺时针约 60°，月份推进；沿月相圆环约 60°，月相推进一档；
- 先点日期按钮、再点圆环、再按方向键，焦点正确回到圆环并继续推进；
- Chromium DevTools `Input.dispatchTouchEvent` 在 390×844 真实发送 touchStart/move/end：月份 1→2、月相新月→蛾眉月，两个手势前后 `scrollY` 都为 0；
- 两个圆环计算样式 `touch-action: none`，非 primary、第二指针、非左键、blur、页面隐藏和取消路径均有适配守卫。

## 4. 响应式与降级

| 视口 / 场景 | 结果 |
| --- | --- |
| 1504×1046 intro | 完整标题、封闭月面、读数、主动作；无滚动 |
| 1504×1046 unlocked | 三线索、最终留言、重开与完整仪器同屏；无滚动 |
| 390×844 intro | 开始按钮 y=239–301，完整月盘 y=327–693；最小目标 48px，无横向溢出 |
| 390×844 unlocked | 完整页面宽 390px，最终留言恰一份，可自然纵向阅读 |
| 320×760 intro | 开始按钮 y=222–284，完整月盘 y=306–606；最小目标 48px，无横向溢出 |
| 月面请求失败 | `image-failed` 生效，CSS 月面仍可见且开始按钮可用 |
| reduced motion | 媒体查询命中，校准仪与按钮过渡计算为 `.01ms` |
| localhost 正常路径 | HTML/CSS/JS/PNG/SVG 共 7 个本地请求全部 200；0 error / 0 warning |

运行证据：

- [桌面解锁态 1504×1046](./assets/moon-phase-secret/render-desktop-unlocked.png)；
- [手机开场态 390×844](./assets/moon-phase-secret/render-mobile-intro.png)；
- [手机解锁完整页 390×1402](./assets/moon-phase-secret/render-mobile-unlocked.png)。

## 5. 概念保真账本

| 维度 | 对照结果 |
| --- | --- |
| 桌面构图 | 保留约 34/66 的左文案、右大型圆形仪器；intro 与终局均压入原生 1504×1046 |
| 手机构图 | 保留标题、月盘、三轴读数、线索、动作的单列系统；intro 为首屏可执行而把开始按钮提前 |
| 色彩 | 保留午夜蓝、冷银、钴蓝当前态与朱红主动作 |
| 仪器层级 | 保留十二月外环、八相内环、中央月面、机械日窗与底部组合读数 |
| 交互尺寸 | 三轴 ± 与返回均至少 48px，圆环额外支持 Pointer、touch、方向键和 Home |
| 文案 | 标题、引导、三条线索和核对动作保持代码原生；不复制概念图的伪字形 |
| 数据正确性 | 运行时生成严格 1–12 月与八相，纠正概念图重复月份、错序和非权威月相图 |
| 材质 | 有意减少概念的写实高光金属，改用离线 CSS 细描边和本地月面纹理 |
| 状态表现 | 中央月面随当前相位变化；新月主动变暗，解锁才全亮，不固定复制概念满月 |

概念与实现的首屏文案差异：运行版使用规格中的“跟着三条线索”，概念图的 AI 字形与错误刻度不作为数据；手机 intro 唯一有意顺序偏差是把“开始校准”放在月盘之前，解决 390×844 首屏无可执行动作。

## 6. 已修复问题

- 合法四字段 target 被三字段日期 schema 拒绝，所有 reducer 回 intro；
- 角度量化保留 `-0`；
- 静态协议正则误报 CSS `rows:`；
- Pointer 后圆环没有恢复键盘焦点；
- sr-only 静态定位留下 17px 桌面滚动；
- 成功态重复反馈把第三条裁出桌面首屏；
- 手机 intro 的唯一开始动作落在首屏下方；
- localhost 自动 favicon 请求产生 404；
- 调整与重开后 live region 保留上一轮播报。

每个问题的复现、根因和回归结果已记录在 [`bugs/`](../bugs/README.md)。

## 7. 来源与借鉴边界

天文事实与近似参数参考 NASA Moon Phases、NASA RP 1349 和 NASA/TP–2008–214170；USNO 只用于开发期抽样。调研对照 `mourner/suncalc@bbc91f6`（BSD-2-Clause），不 vendoring、不执行，也没有复制其源码、模型、界面或素材。运行月面由 OpenAI ImageGen 生成，favicon 为仓库代码原生 SVG；完整声明见作品 [`README.md`](../experiences/surprises/moon-phase-secret/README.md) 和 [`assets/ATTRIBUTION.md`](../experiences/surprises/moon-phase-secret/assets/ATTRIBUTION.md)。
