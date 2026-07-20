# 雾里，跟着你走

「雾里，跟着你走」是一款本地单设备双人合作游戏。每轮由领航员独自看完整地图 7 秒；地图折好并从页面移除后，驾驶员只看脚边 `5×5` 的雾窗，听领航员口述方向，一格一格走到灯下。四段雾路固定交换角色，让两个人各领航两次、驾驶两次。

## 启动

作品为 A 级本地体验，无需安装依赖或启动服务器。

1. 双击本目录中的 `index.html`；
2. 点击“开始第一段雾路”；
3. 领航员独自看图，准备好后点击“我记住了，折好地图”；
4. 驾驶员接过设备，点击“我只看脚边，出发”。

macOS 也可在仓库根目录运行：

```sh
open experiences/co-op/fog-navigation/index.html
```

页面通过 `file://` 直接运行。请保留 `index.html`、`styles.css`、`config.js`、`levels.js`、`logic.js`、`app.js` 与 `assets/` 的相对位置。

## 玩法与操作

- 看图的人不碰方向，走路的人不看全图；领航员用地标和转弯口述路线。
- 完整地图会显示安全路线、两枚地标、终点和雾陷阱；7 秒结束、手动折图、页面进入后台或窗口失焦都会立即遮盖。
- 驾驶员只看当前位置周围固定 `5×5`。陷阱在雾窗里和普通路相同，终点与地标只有进入窗口后才出现。
- 驾驶阶段可使用方向键，或点击四个原生方向按钮；一次输入只走一格，键盘长按不会连走。
- 撞墙时位置不变；进入雾陷阱后不扣分，只需重新看同一张图 7 秒。
- 四轮固定为 A 领航、B 领航、A 领航、B 领航；重试不会交换角色。

## 本地配置

准备者可以只修改 [`config.js`](./config.js) 中的双方称呼与 `composeCompletionNote(summary)`。默认配置无需修改即可完整游玩。

双方称呼会清理空白并限制到 12 个 Unicode code point。完成策略只收到冻结、隔离的四轮摘要，并应返回不超过 120 个 code point 的纯文本；空白、超长、非字符串、抛错或尝试修改摘要都会回退到安全默认结语。配置不能修改地图、角色顺序、7 秒看图时间、陷阱或完成条件。

## A 级、本地与隐私边界

- 加载顺序固定为经典脚本 `config.js → levels.js → logic.js → app.js`；不使用 ES Module、构建步骤或 npm 运行依赖。
- 不使用 `fetch`、XHR、WebSocket、Worker、Service Worker、远程字体、CDN、账户、服务端、统计或分享。
- 不使用本地/会话存储、IndexedDB、Cookie、随机数、音频、振动、媒体或传感器；刷新即重置。
- 完整地图只在 `briefing` 阶段构造；进入遮盖前，阶段容器通过 `replaceChildren()` 真实移除地图节点。它不会以 `hidden` DOM、模板、属性、CSS 变量或可读替代文本留在驾驶页面。
- 驾驶页面只投影规则层给出的 25 个局部格；不会读取完整 rows、安全路径、陷阱位置、关键分叉或世界坐标。雾陷阱在公开 view 与 DOM 中都只是普通路。
- 关卡数据仍随经典脚本保存在本地文件中，因此熟悉源码的人可以主动查看。本作品保护的是正常面对面交接时的阶段信息，不是防开发者工具的安全容器，也不承诺竞技防作弊。
- 背景加载失败时，代码原生的地图格、符号、文字、状态和按钮仍可完成全部四轮。

详细依据见[定向调研](../../../docs/146-fog-navigation-research.md)、[产品与实现规格](../../../docs/147-fog-navigation-spec.md)、[视觉设计](../../../docs/148-fog-navigation-design.md)与[实施计划](../../../docs/149-fog-navigation-plan.md)。

## 生成资产说明

运行背景 [`assets/fog-table-background.png`](./assets/fog-table-background.png) 是本项目于 2026-07-20 使用 OpenAI 内置 ImageGen 生成并接受的无字源稿 [`docs/assets/fog-navigation/fog-table-background-source.png`](../../../docs/assets/fog-navigation/fog-table-background-source.png) 的逐字节副本。生成输入只有本项目编写的文字提示，没有输入第三方图片、商业游戏截图或开源项目资产。

背景只提供深夜木桌、边缘松枝和提灯氛围，不包含地图、文字、图标、路线、分数或控件。三张概念图只用于冻结构图、材质、色彩和信息层级，不进入运行页面；概念中的错误文字、地图、地标与虚构成绩没有被复制。[`assets/favicon.svg`](./assets/favicon.svg) 是本项目独立绘制的原创提灯与雾线图形。

## 借鉴与来源声明

开发前固定研究了：

1. [rot.js v2.2.1](https://github.com/ondras/rot.js/tree/46782e248c2db9d379a5e4f13bb8323f18dff04b)：annotated tag object `55f487ca0384c9a10d19a705504c83def21654a1`，解引用 commit `46782e248c2db9d379a5e4f13bb8323f18dff04b`；BSD-3-Clause；Copyright 2012-now Ondrej Zara。只研究网格、路径和 field-of-view 应当分层这一抽象边界。
2. [TwoPlayerGames](https://github.com/tridpt/TwoPlayerGames/tree/542c57a778bbf843eb2cb121e99d0b050d8c866e)：commit `542c57a778bbf843eb2cb121e99d0b050d8c866e`；MIT；Copyright 2026 tridpt。只研究双人合作迷宫需要明确分工与共同目标这一一般问题。
3. [Amazeing v1.4.1](https://github.com/Ijee/Amazeing/tree/10daea21682eb3a868a03043452c8254178b8504)：tag 与 commit 均为 `10daea21682eb3a868a03043452c8254178b8504`；MIT；Copyright 2021 Thorsten Schulz。只研究生成、遍历和测试需要分层，以及可用路径证明验收固定地图。

[wblachut/fog-of-war commit `1e2c17c`](https://github.com/wblachut/fog-of-war/tree/1e2c17c332307b0f112895114b9dadc0db2b948f) 仅作排除来源：核验时未找到许可证，README 明示使用 Heroes of Might & Magic III 主题与第三方游戏资产。本作品没有复制或使用其源码、素材、页面结构、样式、文案、Canvas 实现或依赖。

本作品没有复制、改写、翻译、移植、打包或依赖上述项目的源码、API、算法实现、关卡、地图、参数、测试、文章、文档原句、DOM、CSS、页面、图片、图标、音频、字体、构建产物或其他素材。情侣语义、四张地图、危险与地标、规则模型、BFS 与局部投影实现、状态机、测试、中文文案、HTML、CSS、JavaScript、SVG 和生成背景均由本仓库独立完成。即便相应许可证允许一定范围的复制，本作品仍执行零复制策略。

固定版本、许可证、权利主体、ImageGen 资产和逐项零复制边界也独立记录在 [`ATTRIBUTION.md`](./ATTRIBUTION.md)。
