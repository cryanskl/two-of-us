# “这一串，我还记得”借鉴声明

## 原创范围

本作品的旅行纪念物题材、公开升价、四轮对称先手、证明责任、计分、状态机、中文文案、界面、测试和视觉资产均为独立原创实现。

以下开源项目只用于研究序列播放、索引推进、键盘路径与结构化竞价。没有复制、改写、翻译、移植、打包或依赖它们的代码、字段、测试、规则原句、页面、颜色、声音、图片、字体、图标或题材。开源仓库的根许可证也不自动证明仓库内每个素材的权利，因此本作保持零代码、零素材复制。

## 固定研究来源

### sergiss/simon

- 固定版本：[commit `c617a162eef46b5817b7e7ed59f50ae7aefe4fab`](https://github.com/sergiss/simon/tree/c617a162eef46b5817b7e7ed59f50ae7aefe4fab)
- 许可证：MIT
- 权利主体：Copyright (c) 2021 Sergio Soriano
- 只研究：序列逐项播放后按相同索引核对，以及播放/输入阶段互斥。

### lowssy/SimonColors

- 固定版本：[commit `326c7565d40f43917243c2c54ea6b826470e2472`](https://github.com/lowssy/SimonColors/tree/326c7565d40f43917243c2c54ea6b826470e2472)
- 许可证：MIT
- 权利主体：Copyright (c) 2018 Alan Santiago
- 只研究：预生成整串、播放前缀与输入索引推进的抽象结构。

### TimPietrusky/asdf

- 固定版本：[commit `92b41bcc9b043362afcd5ed3f4196ca4d633abce`](https://github.com/TimPietrusky/asdf/tree/92b41bcc9b043362afcd5ed3f4196ca4d633abce)
- 许可证：MIT
- 权利主体：Copyright (c) 2012 Tim Pietrusky
- 只研究：键盘输入可以成为序列复现的真实主路径。

### ooki/dnd_auction_game

- 固定版本：[commit `d15bc7d93f3219db18e465afdd88cc99b04ed5d8`](https://github.com/ooki/dnd_auction_game/tree/d15bc7d93f3219db18e465afdd88cc99b04ed5d8)
- 许可证：MIT
- 权利主体：Copyright (c) 2023 Sondre Glimsdal
- 只研究：报价动作需要结构化校验，最高报价、退出和轮次日志应进入权威状态。

## 商业名称与视觉边界

[Hasbro 官方产品说明](https://instructions.hasbro.com/en-us/instruction/simon-game)只用于确认商业名称、声光序列与四色按键产品表达的边界。本作不使用相关商业名称、四色圆盘、中心控制台、官方声效、音高、灯光节奏、按钮排列、规则原句、产品图片、包装、图标或 trade dress。

CodePen、教程站、无清晰许可证仓库、商业云嵌入和应用商店截图均未进入实现来源。

## 平台规范

以下规范只用于确认浏览器行为；没有复制其规范文字、IDL、示例或站点视觉：

- [WHATWG HTML，commit `56674fb3ac40279141a202e5d19b84f30d99854d`](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d)：经典脚本、原生按钮、计时任务和焦点。
- [Page Visibility，commit `8ca533c744e655b8340b5713d1bd5ea97b202b13`](https://github.com/w3c/page-visibility/tree/8ca533c744e655b8340b5713d1bd5ea97b202b13)：页面隐藏时暂停展示并使迟到计时失效。
- [Web Cryptography，commit `851575b9f580623fbdbeca4ad411b90ecbc68776`](https://github.com/w3c/webcrypto/tree/851575b9f580623fbdbeca4ad411b90ecbc68776)：`crypto.getRandomValues()` 只生成本局 seed，不构成加密宣称。
- [WCAG，commit `07123b871c103268375880980fd715b2b26b2ff0`](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0)：键盘、非颜色信息、焦点、状态消息和时间可调。
- [CSSWG Drafts，commit `c7573530343759ace8e46438a1fa2c44515b5554`](https://github.com/w3c/csswg-drafts/tree/c7573530343759ace8e46438a1fa2c44515b5554)：响应式、减少动态与强制颜色。

## ImageGen 视觉生产链

三张概念图、生产背景和生产图集均由 OpenAI ImageGen 全新生成，没有输入第三方图片。

1. 桌面竞价概念：完整 16:10 屏幕、静默顶部栏、三段账簿、当前前 4 件、合法 5–8、暗红主动作；排除赌场、计时和商业四色圆盘。
2. 移动证明概念：完整移动屏、五个顺序槽、六件编号候选、焦点钥匙、禁用提交和主动认输；沿用墨蓝、羊皮纸和黄铜语言。
3. 桌面结算概念：3–1、四轮逐行复盘；排除奖杯、彩纸和排行榜。
4. 背景源图：俯视 16:10 墨蓝木桌，台灯和夹件只在极端边缘，中央留白；没有 UI、文字、纪念物或标识。源图转为 quality 86 JPEG，得到 `assets/auction-table.jpg`。
5. 图集源图：严格 3×2 的六件物件，纯 `#ff00ff` 背景，无文字、品牌或额外物件。使用 `remove_chroma_key.py --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill` 去背，得到 `assets/keepsake-atlas.png`。

对应文件为：

- `design/memory-bid/concept-bidding-desktop.png`：桌面竞价概念，SHA-256 `bd7587d6a95503c980b8fd655f364e9be3c3721cd6725c2674a4a27d91d8100f`。
- `design/memory-bid/concept-proof-mobile.png`：移动证明概念，SHA-256 `978d02e15f8f07858de86bae717539a15e224443d19374b25618aa3b5b13dd9b`。
- `design/memory-bid/concept-result-desktop.png`：桌面终局概念，SHA-256 `c21ece94471ef9273f7a21e8829c94ca291458575c4e819abe3d9c02a8ecbe60`。
- `design/memory-bid/production-background-source.png`：1586×992 背景源图，SHA-256 `24725c12c097bf3626e850e3eb077f5268f1e97135561e8439b32c98cff2e726`；没有裁切，转换为 quality 86 JPEG。
- `design/memory-bid/keepsake-atlas-chroma-source.png`：1536×1024 洋红底图集源图，SHA-256 `37dfe8da2112689d454df8a03bdb455a05454648c7fe41ded1db698cba92c7db`；没有裁切，按上面的 soft-matte 参数去背。

最终生产资产 SHA-256：

- `auction-table.jpg`：`204eb66cb52cee0ba2c87810df7d91e60838ab2d0e029794d906e7fe39e28531`
- `keepsake-atlas.png`：`ff8ded1e60e8b96086995619afe5ded1e8eddba650817e8462f3a3fd6493fcb8`

如果未来实质引入任何第三方代码或素材，必须另立变更，并保留对应许可证、版权声明和改动说明。
