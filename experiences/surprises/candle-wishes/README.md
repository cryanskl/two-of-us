# Candle Wishes

一个为对象准备的本地惊喜：根据五条回忆线索，按正确顺序点亮五支蜡烛，再收下一组愿望和最后的话。

## 直接打开

双击本目录的 `index.html` 即可。作品使用相对路径加载本地 CSS 和三个经典脚本，不需要启动服务、安装依赖或连接网络。

流程固定为：

1. 点击“开始点亮”。
2. 阅读当前线索，从五支蜡烛中选择对应的一支。
3. 选错不会扣除任何内容；选对后才显示这一盏对应的愿望。
4. 五支全部点亮后，点击“收下这些愿望”。
5. 最后的话只会在此时出现；点击“再看一次”可从头开始。

## 写成你们自己的版本

用纯文本编辑器打开 `config.js`，只修改称呼、最终标题、最终留言、署名，以及五支蜡烛的 `label`、`cue` 和 `wish` 文本。保留字段名、五项数量和每项 `id` 的基本格式；配置不合法时，页面会整份回退到安全默认内容。

五支蜡烛的路线顺序由 `config.js` 中的数组顺序决定，画面上的固定展示顺序与路线顺序不同。页面只会显示当前线索和已经点亮的愿望，不会提前把未来内容写入 DOM。

## 本地、隐私与无障碍

- 运行时零第三方依赖，不使用模块、网络请求、存储、麦克风、摄像头、音频、Canvas、WebGL 或 Worker。
- 页面不会上传或另存内容；但本地打开不代表 `config.js` 已加密，能读取文件的人仍能看到其中的文字。
- 所有操作都使用原生按钮，支持键盘 Tab/Shift+Tab、Enter、Space 与触摸。
- 点亮状态同时使用文字和禁用状态表达，不依赖颜色或火焰动画。
- 支持 `prefers-reduced-motion` 和系统强制颜色模式。
- JavaScript 不可用或初始化失败时，只显示公开文案与安全提示。

## 自测

在仓库根目录运行：

```bash
node --test experiences/surprises/candle-wishes/logic.test.js \
  experiences/surprises/candle-wishes/ui-contract.test.js \
  experiences/surprises/candle-wishes/documentation.test.js
```

## 借鉴与来源声明

本作品的状态机、五段默认文案、固定展示排列、DOM、CSS 纸艺蛋糕、火焰降级、交互适配和测试均为独立实现。没有复制、修改、链接或 vendoring 下列项目的代码，也没有使用其图片、SVG、音频、字体、截图、文案、配色或商业外观。

### ololx/birthday-cake

- 固定来源：[ololx/birthday-cake@d51cd5c73c3171d6b769b5da1b9072beca691ce6](https://github.com/ololx/birthday-cake/tree/d51cd5c73c3171d6b769b5da1b9072beca691ce6)
- 许可证：Unlicense，许可证文本将软件奉献至公有领域
- 初始作者：Alexander A. Kropotin
- `LICENSE` SHA-256：`6b0382b16279f26ff69014300541967a356a666eb0b91b422f6862f6b7dad17e`
- 仅借鉴：单个 HTML 可以本地打开、蜡烛可以逐支点击的能力概念。
- 未复制：源代码、CSS 蛋糕、参数设计、动画、文案、截图和视觉风格。

### VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle

- 固定来源：[VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle@3d364f985b2d96057f30d3fc67c5ee71ec37556f](https://github.com/VIDAKHOSHPEY22/Birthday-Cake-Blow-Candle/tree/3d364f985b2d96057f30d3fc67c5ee71ec37556f)
- 许可证：MIT
- 版权所有：Copyright (c) 2025 Vida Khoshpey
- `LICENCE` SHA-256：`0f294f61515a3d1116feca7a014c6b9e1e4bbe4e0044425157cdca51e166f38b`
- 仅作对照：确认麦克风吹蜡烛、图片、音频、Canvas 和外部 Lottie 会增加权限及资源依赖，所以本作品明确排除。
- 未复制：代码、图片、音频、Canvas 蜡烛、Lottie、文案和视觉风格。

### elixpo/wish.elixpo

- 固定来源：[elixpo/wish.elixpo@bf6ec8cae8c756203e059940d42089504ae43ec8](https://github.com/elixpo/wish.elixpo/tree/bf6ec8cae8c756203e059940d42089504ae43ec8)，旧路径为 `Circuit-Overtime/Birthday`
- 许可证：MIT
- 版权所有：Copyright (c) 2024 Ayushman Bhattacharya
- `LICENSE` SHA-256：`5e9a87b81ca59f8f1e350c673ba55cc59cca9264582c7cca763cdaba3d159f1c`
- 仅作对照：核对个性化贺卡、蜡烛、最终私信，以及云端、访问码和麦克风方案的边界。
- 未复制：Next.js、Cloudflare D1、数据库、访问码、麦克风、素材、样式和任何实现。

MDN `getUserMedia()`、W3C Pointer Events 和 WCAG 页面只用于校准权限、输入方式与可访问性边界，不是代码、素材或运行依赖。完整声明另见 `ATTRIBUTION.md`。
