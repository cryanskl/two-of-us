# 今晚，点三束光

一个完全离线的三束烟火惊喜：每次点燃都会留下一个字，第三束落定后才揭开写给
对方的话。运行时只有仓库内的 HTML、CSS 和经典 JavaScript，不需要安装依赖、
构建、联网、账号或浏览器权限。

## 打开与游玩

直接双击本目录的 `index.html` 即可开始；也可以从仓库入口进入。

1. 点“开始点光”。
2. 选择烟火高度。
3. 按住“按住蓄光”后松开发射，或点“直接点燃”；无需蓄满，每一束都会成功。
4. 三束落定后阅读信笺；点“再看一次”可从头重放。

键盘可以用 `Tab` 移动焦点，用 `Enter` 或空格激活按钮；触屏可直接点按或按住。
系统启用 `prefers-reduced-motion` 时会跳过烟火运动，但仍完成相同的三束结果。
浏览器不支持 Canvas 时会改用 CSS 点阵，核心文案和流程不受影响；未启用
JavaScript 时页面会保留说明和明确提示。

## 写成你们自己的

打开 `config.js` 可修改：

- `recipient`：收信人称呼；
- `sender`：署名；
- `patternLabel`、`finalTitle`、`finalNote`：最后信笺的文字；
- `glyphs`：三束烟火留下的字与点阵。

每个点阵必须正好有 9 行，每行正好 9 个字符；`#` 表示亮点，`.` 表示空位。
三个 `id` 必须互不相同，`label` 应是适合直接展示的简短文字。配置不合法时，
页面不会泄露半成品内容，只显示“重新准备”供修正文件后重试。

## 隐私与离线边界

页面不上传、不另存。所有称呼、署名和惊喜文字都以明文写在本地 `config.js`
中，因此分享整个文件夹前应先检查内容；页面不会把它们写入
`localStorage`、`sessionStorage`、IndexedDB 或服务端。

运行时不加载图片、字体、音频、远程脚本或 CDN，也不请求通知、定位、摄像头、
麦克风等权限。项目没有 npm 运行依赖，双击打开与本地 HTTP 预览使用同一套文件。

## 借鉴与来源声明

本项目是独立设计和实现，只借鉴下列固定来源的抽象职责或无障碍边界，明确未复制
源码、测试、公式、API、参数、默认配置、文案、视觉或素材，也没有把它们作为
运行依赖：

| 来源 | 固定版本与许可证 | 本项目借鉴的边界 |
| --- | --- | --- |
| [Fireworks.js](https://github.com/crashmax-dev/fireworks-js/tree/8f01eeaef422c1f0880e94ce99040025a1b74d7e) | `8f01eeaef422c1f0880e94ce99040025a1b74d7e`；MIT；Copyright (c) 2021-2023 Vitalij Ryndin | 上升、爆炸、控制器与清理可拆成表现职责 |
| [W3C Pointer Events](https://github.com/w3c/pointerevents/tree/238e8273305bb2e3c76f9f0bb289fb127c3dff74) | `238e8273305bb2e3c76f9f0bb289fb127c3dff74`；W3C Software and Document License | pointer 按下、抬起、取消与 capture 生命周期边界 |
| [canvas-text-particle](https://github.com/dango0812/canvas-text-particle/tree/9ee144a548aad85275318b30891c71dcf6e10f7b) | `9ee144a548aad85275318b30891c71dcf6e10f7b`；ISC；Copyright (c) 2026, dango0812 | 稳定粒子朝静态目标点归位的职责分层 |
| [canvas-confetti](https://github.com/catdad/canvas-confetti/tree/20eebad51dde793070c373d594099a7ed8d96e22) | `20eebad51dde793070c373d594099a7ed8d96e22`；ISC；Copyright (c) 2020, Kiril Vatev | 减少动态时保持同一结果，以及集中清理表现资源 |
| [W3C WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0) | `07123b871c103268375880980fd715b2b26b2ff0`；W3C Document License | 键盘、闪烁、交互动效和 Pointer Cancellation 的设计边界 |

完整的许可证哈希、版权主体、排除项和复核证据见
[`assets/ATTRIBUTION.md`](./assets/ATTRIBUTION.md)。若未来实际引入第三方内容，
应重新做文件级许可审计并保留适用许可证、版权通知与修改说明。

生成资产：无。`docs/assets/wish-fireworks/` 下的概念图只用于设计评审，生产页面
不加载、裁切或复制其中像素。
