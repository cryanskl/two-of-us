# 双光点归巢

一个 A 级、同一设备双人实时合作迷宫。珊瑚玩家与青色玩家分别控制一枚光点：一人踩住压力板，另一人穿过对应门，最后两人同时站到各自光门完成关卡。

## 启动

直接双击本目录的 `index.html`。无需安装、服务器、账号或网络，也没有第三方运行依赖。

## 操作与规则

- 珊瑚玩家：`W / A / S / D`；
- 青色玩家：键盘方向键；
- 触屏时使用底部两组并排方向盘，每按一次移动一格；
- 任一玩家站在 A 或 B 压力板上，对应的 A 或 B 门会打开；
- 门上的玩家不会被突然关闭的门夹住，走出门格后门才会按压力板状态恢复；
- 两个人分别站到珊瑚与青色光门才完成本关；第四关完成后可以重新游玩；
- 可以主动暂停或重来本关；窗口失焦或页面隐藏时也会自动暂停。

## 本地与隐私边界

本作品使用经典相对脚本、原生 DOM 和一张本地透明 PNG 图集，可通过 `file://` 直接运行。它不使用 ES Modules、`fetch`、XHR、WebSocket、CDN、远程字体、统计、Service Worker、localStorage、IndexedDB 或 Cache API，也不会收集、保存或上传按键、关卡进度与设备信息。

## 标签

`双人合作` · `A 级` · `单设备同屏` · `键盘/触屏` · `机关迷宫` · `公网依赖：无`

## 实现说明

四张 12×8 地图由本仓库原创设计并通过纯逻辑 BFS 测试验证可解。关卡使用字符网格描述；门、压力板和共同胜利都从两名玩家当前位置派生，不依赖动画完成回调。页面视觉只从本地 4×3 图集中选择玩家、压板、门、出口、地面和墙的投影，规则层不加载图片，因此视觉替换不会改变碰撞与可解性。

玩家使用颜色与形状双重区分：珊瑚光点是圆缺口，青色光点是菱形。`prefers-reduced-motion` 下会移除位移和发光动画，但全部状态、输入和完成条件保持可用。

## 借鉴与来源声明

本作品借鉴的是通用的“双角色分别控制、站在压力板上保持门开启、两个人抵达各自出口”的机关组合。玩法调研参考了 [tridpt/TwoPlayerGames](https://github.com/tridpt/TwoPlayerGames/tree/542c57a778bbf843eb2cb121e99d0b050d8c866e) 中的 [`mazecoop.js`](https://github.com/tridpt/TwoPlayerGames/blob/542c57a778bbf843eb2cb121e99d0b050d8c866e/js/games/mazecoop.js)：固定版本为 commit [`542c57a778bbf843eb2cb121e99d0b050d8c866e`](https://github.com/tridpt/TwoPlayerGames/commit/542c57a778bbf843eb2cb121e99d0b050d8c866e)，上游 [`LICENSE`](https://github.com/tridpt/TwoPlayerGames/blob/542c57a778bbf843eb2cb121e99d0b050d8c866e/LICENSE) 为 MIT License，版权标注为 `Copyright (c) 2026 tridpt`。来源和许可证于 2026-07-17 按上述 commit 复核。

这是**机制借鉴、自行重写**，不是对上游实现的移植、翻译或改写。本目录没有复制、改写、打包或依赖上游源码、关卡字符串、地图坐标、常量、DOM、CSS、文案、表情符号、存储逻辑或素材。本仓库自行定义了四张地图、状态机、BFS 测试、输入模型、页面结构、中文文案与全部代码。

桌面概念、移动概念和生产图集由本项目在 2026-07-17 使用 OpenAI 内置图像生成工具创建；运行页面只包含去除生成用绿色背景后的本地图集。生成图不包含第三方角色、商标或可识别 IP。

由于没有引入或修改上游代码，本目录当前不附加上游源码副本。若未来直接引入或修改该项目的任何代码，必须保留 MIT 许可证全文与版权通知，并同步更新本声明和仓库第三方清单。

详细规则、视觉边界与验收标准见 [`docs/25-twin-light-maze-spec.md`](../../../docs/25-twin-light-maze-spec.md)；自动检查、Chrome 四关实玩与响应式证据见 [`docs/26-twin-light-maze-verification.md`](../../../docs/26-twin-light-maze-verification.md)。
