# 借鉴与素材声明

“三枚以后，都是我们”的三段约定、无序收集、主动合成、三阶段状态机、中文文案、界面、测试和生产素材均为独立原创。运行时没有复制、改写、翻译、移植、打包或依赖下列项目的源码、签语、图片、字体、动画、布局、Figma 设计或构建产物。

## 开源研究来源

- [`dam450/fortune-cookie`](https://github.com/dam450/fortune-cookie/tree/f378d26989b929d23160efc9b9adfa282f191c39)，固定 commit `f378d26989b929d23160efc9b9adfa282f191c39`，[MIT 许可证全文](https://github.com/dam450/fortune-cookie/blob/f378d26989b929d23160efc9b9adfa282f191c39/license.md)，Copyright (c) 2022 Evandro Damaso。只研究单按钮揭晓流程与键盘承诺差距，零代码、零素材复制。
- [`devMatheus20/fortune-cookie`](https://github.com/devMatheus20/fortune-cookie/tree/867fb314a3f40835c9d7d82828b91da4b3426471)，固定 commit `867fb314a3f40835c9d7d82828b91da4b3426471`，[MIT 许可证全文](https://github.com/devMatheus20/fortune-cookie/blob/867fb314a3f40835c9d7d82828b91da4b3426471/LICENSE.md)，Copyright (c) 2022 Matheus Santos。只研究单屏信息层级与依赖边界，零代码、零素材复制。
- [`reggi/fortune-cookie`](https://github.com/reggi/fortune-cookie/tree/70e9f73e9132663998af66da971f06e67ad13c88)，固定 commit `70e9f73e9132663998af66da971f06e67ad13c88`。根 `LICENSE` 为 MIT、同版本 `package.json` 声明 ISC，且文本来源不足，因此只作为许可元数据不一致的排除案例，未引入任何内容。

## 平台规范

- [WHATWG HTML](https://github.com/whatwg/html/tree/56674fb3ac40279141a202e5d19b84f30d99854d)，commit `56674fb3ac40279141a202e5d19b84f30d99854d`：仅用于经典脚本、原生按钮、标题和焦点行为。
- [WCAG](https://github.com/w3c/wcag/tree/07123b871c103268375880980fd715b2b26b2ff0)，commit `07123b871c103268375880980fd715b2b26b2ff0`：仅用于键盘等价、状态消息、焦点、非颜色信息与降低动效。
- [CSSWG Drafts](https://github.com/w3c/csswg-drafts/tree/c7573530343759ace8e46438a1fa2c44515b5554)，commit `c7573530343759ace8e46438a1fa2c44515b5554`：仅用于响应式、`prefers-reduced-motion` 和强制颜色行为。

规范只用于确认平台行为，没有复制其文字、示例、IDL 或站点视觉。

## ImageGen 生产链

全部五张图均由 OpenAI ImageGen 以纯文本提示全新生成，没有参考图、真实人物照片、候选项目图片或第三方品牌。

- collecting 概念图：完整 16:10 桌面界面，中间一枚已开、两侧未开，用于冻结三列和焦点层级；输出 `1586×992`。
- ready 概念图：完整移动界面，三签齐套且合成按钮可见，用于冻结移动阅读节奏；输出 `852×1846`。生成文字漏字被拒绝，生产文字来自代码。
- finale 概念图：完整 16:10 长信界面，用于冻结邀请、边注、结语与重开层级；输出 `1586×992`。生成署名误字被拒绝。
- 背景源图：俯拍 16:10 深墨蓝茶桌，中央 75% 留白，无 UI、文字、签语、饼干或标识；用 `ffmpeg -i production-background-source.png -q:v 2 night-tea-table.jpg` 转为生产 JPEG。
- 图集源图：严格 3×1 的 closed / cracked / open，同角度同材质，纯 `#ff00ff` 色键，无文字、阴影、碎屑或额外物体；用 `ffmpeg -vf "chromakey=0xFF00FF:0.085:0.06,format=rgba" -frames:v 1` 去背。

生产图集为 `2172×724` RGBA。alpha 统计：全透明 `1,166,392`、部分透明 `3,970`、全不透明 `402,166`，范围 `0..255`。

| 文件 | SHA-256 |
| --- | --- |
| `concept-collecting-desktop.png` | `1abe19b20521f06f89f2694172eb17e41252f5dfd726b78849b5efa00e908fbe` |
| `concept-ready-mobile.png` | `723ce5512bea9bb69f7f0fe76fc137d6cb476178abdae798cfadfc045b6bac8d` |
| `concept-finale-desktop.png` | `42e2988cef21abf387ff33011acf264f0dc05627459901ef825feb159df631ad` |
| `production-background-source.png` | `cbb754ebf2aeee130a2fb7747912e8e5f01023b79672a4783e4273c409f52788` |
| `future-cookie-atlas-chroma-source.png` | `6899fc0669c92e679e16d6f590af670b261c369e6edfe211720f7b15d76ee723` |
| `night-tea-table.jpg` | `b0b28bc39afbc2d0001f34f0718cc6b4b693f32f31d0772edecfd68f244879ea` |
| `future-cookie-atlas.png` | `c763b6ef888320af449589359680ab3d575fe58fdfe18905e464cd164b8fc8ce` |

若未来实质引入任何代码、签语或素材，必须另立变更并保留对应许可证与版权声明。
