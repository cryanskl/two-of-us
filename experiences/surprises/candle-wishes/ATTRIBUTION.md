# Candle Wishes 借鉴与授权声明

## 独立实现范围

`candle-wishes` 是本仓库独立编写的本地 JavaScript 状态机。作品只有机制层面的参考与方案对照，零第三方运行依赖；没有复制、修改、链接或 vendoring 下列候选项目的代码。

状态机、默认五段文案、固定展示排列、DOM 结构、CSS/SVG 表现与测试均为独立设计。没有使用候选项目的图片、SVG、音频、生日歌、Lottie、字体、截图、文案、配色或商业外观。开源许可证只适用于相应项目的授权内容，不自动覆盖第三方素材、品牌或本项目实现。

## 正式参考与对照

### ololx/birthday-cake

- 仓库：https://github.com/ololx/birthday-cake
- 固定版本：`d51cd5c73c3171d6b769b5da1b9072beca691ce6`
- 许可证：Unlicense；许可证文本将软件奉献至公有领域
- 初始作者：Alexander A. Kropotin
- `LICENSE` SHA-256：`6b0382b16279f26ff69014300541967a356a666eb0b91b422f6862f6b7dad17e`
- 仅借鉴：单个 HTML 可本地打开、蜡烛可以逐支点击的能力概念。
- 未使用：源代码、CSS 蛋糕、参数设计、动画、文案、截图及视觉风格。

### VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle

- 仓库：https://github.com/VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle
- 固定版本：`3d364f985b2d96057f30d3fc67c5ee71ec37556f`
- 许可证：MIT
- 版权所有：Copyright (c) 2025 Vida Khoshpey
- `LICENCE` SHA-256：`0f294f61515a3d1116feca7a014c6b9e1e4bbe4e0044425157cdca51e166f38b`
- 对照用途：确认麦克风吹蜡烛与庆祝效果会增加权限、环境和资源依赖，因此首版明确排除。
- 未使用：代码、图片、音频、Canvas 蜡烛、外部 Lottie confetti、文案及视觉风格。

### elixpo/wish.elixpo

- 仓库：https://github.com/elixpo/wish.elixpo
- 旧路径：`Circuit-Overtime/Birthday`
- 固定版本：`bf6ec8cae8c756203e059940d42089504ae43ec8`
- 许可证：MIT
- 版权所有：Copyright (c) 2024 Ayushman Bhattacharya
- `LICENSE` SHA-256：`5e9a87b81ca59f8f1e350c673ba55cc59cca9264582c7cca763cdaba3d159f1c`
- 对照用途：核对个性化贺卡、蜡烛、最终私信以及云端/麦克风方案的边界。
- 未使用：Next.js、Cloudflare D1、数据库、访问码、麦克风、素材、样式及全部实现。

## 标准参考

MDN `getUserMedia()`、W3C Pointer Events 与 WCAG 页面仅用于校准权限、输入方式和可访问性边界，不是代码、素材或运行依赖。生产逻辑不访问麦克风、摄像头或其他传感器。

## 本地隐私说明

本地打开不等于配置内容经过加密。准备者写入 `config.js` 的称呼、线索、愿望和留言仍可由能够读取本地文件的人查看。

## 生成资产

无运行时生成资产。

调研阶段的 ImageGen 概念图只保存在 `docs/assets/candle-wishes/`，仅用于视觉讨论；它们未进入生产运行目录，也不是状态机、默认文案、排列、DOM、CSS/SVG 或测试的来源。
