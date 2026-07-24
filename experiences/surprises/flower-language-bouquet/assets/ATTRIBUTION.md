# Flower Language Bouquet 借鉴、授权与生成资产声明

## 独立实现与运行边界

`flower-language-bouquet` 的状态机、120 种有序三花排列、scene slot、SVG primitive registry、组合句、导出模型与测试均由本仓库独立实现。

下列项目和标准只用于研究机制或校准浏览器合同，不是 dependency、devDependency、vendor 或运行时 script。本项目没有复制其源码、API、类名、算法、参数、布局表、随机系统、serializer、UA sniff、fallback、测试、示例、素材、图片、品牌或构建产物。

六段默认花语、标题、组合句和留言是私人表达，不是植物学事实、统一文化结论或权威花语数据库内容。本地运行也不代表 `config.js` 已加密。

## 六个机制参考项目

| 来源 | 固定版本 | 许可证载体与 SHA-256 | 权利主体 | 仅研究的抽象 |
| --- | --- | --- | --- | --- |
| [599316527/emoji-bouquet-generator](https://github.com/599316527/emoji-bouquet-generator) | [`8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9`](https://github.com/599316527/emoji-bouquet-generator/commit/8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9) | [MIT `LICENSE`](https://github.com/599316527/emoji-bouquet-generator/blob/8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9/LICENSE)；`55684ceab9d8a0488e2a5290af7d7932b7299f8f88c4ae78019154de7b9bf062` | Copyright (c) 2016 Kyle He | 有限元素用固定位置形成可预期花束；输入与呈现分离 |
| [Platane/Procedural-Flower](https://github.com/Platane/Procedural-Flower) | [`d857fbe846d5899cd5cf8ea6a47d37e6030f53c0`](https://github.com/Platane/Procedural-Flower/commit/d857fbe846d5899cd5cf8ea6a47d37e6030f53c0) | [MIT 形式 `LICENSE`](https://github.com/Platane/Procedural-Flower/blob/d857fbe846d5899cd5cf8ea6a47d37e6030f53c0/LICENSE)；`72979b450c3b3aaa54fb434254841d1ea8462a4bbc427ad2ae9f312be718dad6` | Copyright (c) 2012 Arthur Brongniart | 花可拆为局部部件；有限动画到达最终形态后停止 |
| [svgdotjs/svg.js](https://github.com/svgdotjs/svg.js) | [`6f58d4b2aa10e2d7ed6e38ff84caeb04b210af4e`](https://github.com/svgdotjs/svg.js/commit/6f58d4b2aa10e2d7ed6e38ff84caeb04b210af4e) | [MIT 形式 `LICENSE.txt`](https://github.com/svgdotjs/svg.js/blob/6f58d4b2aa10e2d7ed6e38ff84caeb04b210af4e/LICENSE.txt)；`455113977c98c54dad8598e092b99aad6be0ed8c5c4a0722154acf4b21df4730` | Copyright (c) 2012–2018 Wout Fierens | group、局部坐标与同一 scene 的页面/独立 SVG 双投影 |
| [fabricjs/fabric.js](https://github.com/fabricjs/fabric.js) | [`723838fcbb9feaa87c8840082640de2ed82383da`](https://github.com/fabricjs/fabric.js/commit/723838fcbb9feaa87c8840082640de2ed82383da) | [MIT `LICENSE`](https://github.com/fabricjs/fabric.js/blob/723838fcbb9feaa87c8840082640de2ed82383da/LICENSE)；`eda412692b7398293a049ecf913319da26eb8f7fe27f10709821dd187b517e0b` | 2008–2015 Printio（Juriy Zaytsev、Maxim Chernyak）；2016–present Andrea Bogazzi、Shachar Nen 与 contributors | 权威配方、scene model、页面渲染与导出副作用分层 |
| [d3/d3-hierarchy](https://github.com/d3/d3-hierarchy) | [`c4ae7066d5a52e8aeaab24b3f7113e25c38183f2`](https://github.com/d3/d3-hierarchy/commit/c4ae7066d5a52e8aeaab24b3f7113e25c38183f2) | [ISC `LICENSE`](https://github.com/d3/d3-hierarchy/blob/c4ae7066d5a52e8aeaab24b3f7113e25c38183f2/LICENSE)；`e008c5e25a6be382593089c29bfabbc553c6378eee02895aec46ce396cc404ee` | Copyright 2010–2021 Mike Bostock | 仅比较自动 packing；正式方案明确采用三个原创固定 slot |
| [eligrey/FileSaver.js](https://github.com/eligrey/FileSaver.js) | [`cea522bc41bfadc364837293d0c4dc585a65ac46`](https://github.com/eligrey/FileSaver.js/commit/cea522bc41bfadc364837293d0c4dc585a65ac46) | [MIT `LICENSE.md`](https://github.com/eligrey/FileSaver.js/blob/cea522bc41bfadc364837293d0c4dc585a65ac46/LICENSE.md)；`2d1d7a93b46e4274355ac2904428707c4ee47ee8c6029fa394ebf405648d3f63` | Copyright © 2016 Eli Grey | 保存必须由用户触发；Safari/iOS 可能退化为预览或新页面 |

特别说明：项目直接使用原生 SVG DOM 和 `<a download>`。没有引入 Vue、Webpack、Canvas 花朵库、SVG.js、Fabric.js、D3 或 FileSaver.js，也没有复制位置表、花瓣/生长/packing 算法、序列化器或保存兼容代码。页面不能仅凭触发下载就声称文件已经成功落盘。

## 五个标准仓库

标准只用于平台合同与可访问性校准，不复制其正文、IDL、算法、示例、图片或测试，也不声称本项目因此获得合规认证。

| 标准来源 | 固定版本 | 许可证载体与 SHA-256 | 校准用途 |
| --- | --- | --- | --- |
| [WHATWG HTML](https://github.com/whatwg/html) | [`24c5e48bf66ea61bc199ec6338c81258275ba9c6`](https://github.com/whatwg/html/commit/24c5e48bf66ea61bc199ec6338c81258275ba9c6) | [文档 CC BY 4.0 / 代码 BSD 3-Clause](https://github.com/whatwg/html/blob/24c5e48bf66ea61bc199ec6338c81258275ba9c6/LICENSE)；`85dc6f5ccb57a6fe8c33d158f9fc8fc7ee5655a5d3db2cdd131c6a3d0f48a864`；Copyright © WHATWG（Apple、Google、Mozilla、Microsoft） | 原生按钮/链接、下载意图与建议文件名 |
| [W3C File API](https://github.com/w3c/FileAPI) | [`cd1d1da9a5375af0622af4b36e76c6e6bd9d130b`](https://github.com/w3c/FileAPI/commit/cd1d1da9a5375af0622af4b36e76c6e6bd9d130b) | [W3C Software and Document License](https://github.com/w3c/FileAPI/blob/cd1d1da9a5375af0622af4b36e76c6e6bd9d130b/LICENSE.md)；`6eabf929228fcdce39d1aff9a837175928c4a19eafc4517b72d5781db9ece661`；仓库贡献者 | Blob 与对象 URL 的创建/撤销生命周期 |
| [W3C SVG 2](https://github.com/w3c/svgwg) | [`8b521081b0c65490c9b80633be68871f7bf441fa`](https://github.com/w3c/svgwg/commit/8b521081b0c65490c9b80633be68871f7bf441fa) | [W3C Document License](https://github.com/w3c/svgwg/blob/8b521081b0c65490c9b80633be68871f7bf441fa/LICENSE.md)；`6bb0235e84e19f807f271b54459eb494742a421e1c5c36a1de702c151ecb15f3`；仓库贡献者 | standalone SVG、viewBox、基本图形、分组与文本 |
| [W3C WCAG](https://github.com/w3c/wcag) | [`07123b871c103268375880980fd715b2b26b2ff0`](https://github.com/w3c/wcag/commit/07123b871c103268375880980fd715b2b26b2ff0) | [W3C Document License](https://github.com/w3c/wcag/blob/07123b871c103268375880980fd715b2b26b2ff0/LICENSE.md)；`7a3ad7d36b8855bc301276279769da4aff648ea5d7b92f3f023c0823ee948764`；仓库贡献者 | 键盘、状态消息、拖动替代、焦点与 reflow |
| [CSSWG Drafts](https://github.com/w3c/csswg-drafts) | [`c7573530343759ace8e46438a1fa2c44515b5554`](https://github.com/w3c/csswg-drafts/commit/c7573530343759ace8e46438a1fa2c44515b5554) | [W3C Software and Document License](https://github.com/w3c/csswg-drafts/blob/c7573530343759ace8e46438a1fa2c44515b5554/LICENSE.md)；`232da9c6c2b9f7e19e5d85cc7cf43760d80b7c4174406ac6404fa2c1b51d531b`；仓库贡献者 | 响应式、减少动态效果与强制色 |

## 明确排除

- 无许可证或权属不明的花卉 SVG、图标、照片、贴纸、字体与音效；
- 商业花店图、商品构图、贺卡文案、社交帖子与花语数据库；
- 远程资源、运行时图片、外部字体、随机、评分、账号、云端画廊、URL 分享、自动下载、自动分享或自动写剪贴板；
- 配置中的 markup、path、href、style、`foreignObject`、script、事件属性或远程资源进入导出 SVG；
- PNG、PDF、打印、EXIF、定位、商品价格、库存、购物车与推荐。

## ImageGen 设计过程资产

完整 prompt、有限权利说明与处理链见 [`docs/assets/flower-language-bouquet/GENERATION.md`](../../../../docs/assets/flower-language-bouquet/GENERATION.md)。

- 工具：OpenAI 内置 `image_gen`
- 具体模型/版本：工具调用结果未暴露，不作猜测
- 生成日期：2026-07-21
- 偏好：Codex / 2K / 项目级
- 第三方图片、开源截图、商业素材、角色、品牌、照片与第三方字体输入：无
- 后处理：无编辑、裁切、重采样、压缩或去背景；从生成目录逐字节复制到文档目录

| # | 文档文件 | 尺寸 | 输入引用链 | SHA-256 |
| ---: | --- | ---: | --- | --- |
| 1 | `desktop-intro-concept.png` | 1586×992 | 无 | `4bc0b4520ba15c9f23ab700748da4777fca2d39a47c2256e6d24e4222842d9a8` |
| 2 | `desktop-arranging-concept.png` | 1586×992 | #1 | `377d511f2d9c804b81c4ffba02f553aa9604657adaf4347409e3f65a364248d7` |
| 3 | `mobile-preview-concept.png` | 852×1846 | #2 | `54b8a9de1dc75833b86e3e4a9c064306fe3fe306699052eb24063e1ade3375c1` |
| 4 | `desktop-complete-concept.png` | 1586×992 | #2 | `3938b32548973d4d0c2d438ec7c606b6c711569342070e985fd188c5ca77ac75` |
| 5 | `desktop-intro-v2-concept.png` | 1586×992 | #1 | `a6bf31ec1cae116f60d0a30527d228433caf327b3cd8aa6b34ddd850d9b9041d` |
| 6 | `desktop-arranging-v2-concept.png` | 1586×992 | #2、#5 | `e547fc44f46ea846ab25276f7cc500dc6dab8aced8f301f319426ea4ba4ac4b0` |
| 7 | `mobile-preview-v2-draft.png` | 852×1847 | #3、#6 | `550b9417981367521f69e6924feba3d6b1c47f11f1117e5f36b71bba4eea2cc8` |
| 8 | `mobile-preview-v2-concept.png` | 852×1846 | #7 | `72d015cf45a25620798905ecf9288fb607a62ac727eaa8bce2d6fce19c9296e2` |
| 9 | `desktop-complete-v2-concept.png` | 1586×992 | #4、#6 | `5b3c2532c74b29242029a0dedab95329ed556f1f95a8de719df4fb42eff28aab` |
| 10 | `mobile-export-error-v2-concept.png` | 852×1846 | #9、#8 | `c770f6a7ca373797ee5d76ee4ca01c1a9e9876a0828dd14bd906ff1960145d0e` |

十张图片只在 `docs/` 中用于设计评审和后续 fidelity 对比，不由生产目录读取、fetch、preload 或作为 CSS background。它们不是花语、状态机、scene、SVG primitive 或导出代码的来源；当前视觉提案仍等待用户确认。

如果未来把任一生成图转为运行时资产，必须新增运行时文件 SHA、处理链、失败降级与权利审计，并同步更新作品 README 和本声明，不能沿用 docs-only 结论。
