# 借鉴与来源声明

> 审计日期：2026-07-18。下列项目、产品页面和标准仅用于研究机制、工程边界与必须避开的表达；运行时没有引入任何第三方代码、规则、字体、图片、音频或依赖。

## 机制对照

### `tridpt/TwoPlayerGames`

- 固定提交：[`542c57a778bbf843eb2cb121e99d0b050d8c866e`](https://github.com/tridpt/TwoPlayerGames/tree/542c57a778bbf843eb2cb121e99d0b050d8c866e)
- 许可：[MIT](https://github.com/tridpt/TwoPlayerGames/blob/542c57a778bbf843eb2cb121e99d0b050d8c866e/LICENSE)，Copyright © 2026 tridpt
- 研究用途：只确认「执行者看对象、专家看规则、依靠口述行动」的角色分离机制。
- 未采用：`defusebomb.js`、Canvas/CSS、声音、随机工具、WebSocket、游戏壳、炸弹、电线、序列信息、失败次数、规则、常量、术语、界面和素材均未复制、改写或引入。

### `keeptalkinggame/ktanemodkit`

- 固定提交：[`e379d86e12d1d6409c228b84ca9a74deffa15c99`](https://github.com/keeptalkinggame/ktanemodkit/tree/e379d86e12d1d6409c228b84ca9a74deffa15c99)
- 许可：[Keep Talking and Nobody Explodes ModKit License](https://github.com/keeptalkinggame/ktanemodkit/blob/e379d86e12d1d6409c228b84ca9a74deffa15c99/LICENSE)，Copyright © 2016 keeptalkinggame
- 限制：许可证要求软件只用于为该游戏制作模组，不能用于本仓库的独立作品。
- 未采用：本作品零使用 ModKit 的源文件、手册模板、字体、图片、纹理、jQuery、版式或示例模块。

### Steel Crate Games 官方资料

- [官方玩法说明](https://www.bombmanual.com/how-to-play-psvr.html)：只用于确认其产品结构是执行者与规则专家分离。
- [官方手册](https://bombmanual.com/web/index.html)：只用于识别并避开其规则、题目、手册版式、术语、模块和视觉表达。
- 页面没有授予本仓库复制内容或商标的许可；本作品不嵌入、改写或仿制其页面。

## W3C 标准依据

- [WCAG 2.2 — Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color)：分支用编号、纹理文字、节点数、符号名和信号档位冗余表达。
- [WCAG 2.2 — Orientation](https://www.w3.org/WAI/WCAG22/Understanding/orientation)：页面不锁定设备方向，窄屏取消面对面旋转。
- [WCAG 2.2 — Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order)：CSS 视觉旋转不改变 DOM 与 Tab 顺序。
- [WCAG 2.2 — Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)：准备和分支按钮保持至少 48 CSS px 热区。
- [WCAG 2.2 — Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)：选错、暂停、接通和进度使用持久 live status，倒计时不逐秒宣读。

上述规范只作为可访问性依据，没有复制规范示例代码。

## ImageGen 原创资产

- 生成日期：2026-07-18；
- 文件：`assets/signal-dust.webp`，1536×1024，无字星尘纸桌背景；
- 工具：OpenAI ImageGen；
- 最终提示词边界：深蓝手工纸纹，边缘稀疏星尘、轨道和黄铜细线，中央 70% 低对比；无字、无数字、无 UI、无卡片、无对象、无人、无 Logo、无炸弹、电线或危险符号；
- 用途：只承担页面底层氛围；规则、身份、分支、节点、符号、按钮、答案和状态全部由原生 HTML/CSS/JavaScript 生成；
- 降级：图片缺失时保留纯深蓝、径向与线性 CSS 背景，完整玩法不受影响。

`assets/favicon.svg` 是本仓库原创矢量图标，用两端信号节点和一条接通轨迹表达合作修复；没有使用第三方图标、emoji 或字体。

## 完整零复制声明

本作品只采用「双方掌握互补信息并通过口述完成条件推理」这一通用合作机制，以及有限时间、角色交换、键盘、Pointer 和状态机等通用工程思想。全部代码、规则 DSL、十二张题卡、星路属性、优先规则、术语、作品名、中文文案、状态机、测试、原生图形和视觉均由本仓库独立创作；没有从上述来源复制、改写或引入代码、规则表、题卡、模块名称、术语、字体、手册版式、视觉、声音、图像或其他素材。
