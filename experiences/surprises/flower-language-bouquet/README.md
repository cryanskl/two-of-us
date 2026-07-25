# 把花语，系成一束

一个给对象准备的本地互动花束：从六种花里依次挑三枝，第一枝成为主花，第二枝成为陪花，第三枝成为点缀；系好后才会出现称呼、留言与署名，并可保存一份含留言的 standalone SVG。

## 直接打开

双击本目录的 `index.html` 即可使用。不需要安装 Node.js，不需要启动服务，也不需要联网。

本项目使用经典脚本和相对路径，运行时零网络、零第三方运行依赖、零远程字体、零图片依赖。浏览器必须启用 JavaScript；若浏览器禁用了本地脚本，请换用允许打开本地 HTML 的现代浏览器。

## 玩法

1. 点“开始挑花”进入花池。
2. 按顺序挑三枝花。第一枝是主花，第二枝是陪花，第三枝是点缀；每一种有序组合都能完成。
3. 选错时点“撤回上一枝”。第三枝选好后仍可撤回，也可以点“系好这束花”。
4. 完成后阅读这束花与留言；点“保存含留言的 SVG”把浏览器已经准备好的矢量文件交给浏览器处理。
5. 点“重新挑一束”回到开始页。

鼠标、触控和键盘都可使用。键盘可用 `Tab` 移动焦点，用 `Enter` 或空格激活按钮和保存链接。

## 自定义

编辑 `config.js` 中的纯文本配置即可改成自己的版本：

- `recipient`：页面完成态显示的称呼；
- `sender`：署名；
- `finalTitle`、`finalNote`：最终标题与留言；
- 六种花的 `name`、`meaning`：花名和私人表达。

这些句子是两个人之间的表达，不是权威花语，也不是植物学或跨文化结论。只填写文字；不要把 HTML、链接、脚本或 SVG 路径放入配置。

## 隐私与保存边界

- 开始前只读取公开玩法配置；称呼、最终标题、留言和署名到完成态才进入页面 DOM。
- 页面不上传、不请求网络、不使用本地存储，也不收集账号、照片、位置或使用记录。
- 本地运行不是加密。能读取这台电脑上项目文件的人，也能直接看到 `config.js` 里的文字；发送整个文件夹时也会一并发送配置。
- 导出的 SVG 包含花束、最终标题、留言、三席顺序、组合句和署名，但**不含收件人称呼**，也不含未选择花材的配置。
- “保存文件已经准备好”只说明浏览器内已生成对象 URL；激活保存链接后，浏览器可能下载、预览或交给系统文件，页面不会声称已经成功落盘。
- 浏览器不支持 Blob、XMLSerializer 或对象 URL 时，页面仍保留花束和留言，但不会伪造保存入口。

## 技术边界

`logic.js` 是纯状态机和导出模型；`app.js` 只把 public view 投影为 DOM，并用受控的 `path`、`ellipse`、`circle`、`line` 等 SVG primitive 绘制花束。导出使用独立新建的 SVG 树、元素/属性白名单、256 KiB 上限和真实 `<a download>`，不会把页面 DOM 直接序列化。

项目不用 Canvas、框架、打包器、CDN、第三方字体、拖放、分享 API、剪贴板、自动下载或持久化。

## 借鉴声明

本项目为独立实现。下列开源项目和标准只用于研究抽象机制或校准浏览器合同；固定版本用于保证调研可复核。项目**不复制**它们的源码、算法、布局表、序列化器、兼容代码、测试、图片、字体、品牌或构建产物，也没有把它们作为 dependency、devDependency、vendor 或运行时 script。

| 参考 | 固定版本 | 仅借鉴的抽象 |
| --- | --- | --- |
| [emoji-bouquet-generator](https://github.com/599316527/emoji-bouquet-generator) | `8db7a51b4b4bfc4b9a0b05df1cf5d4dda4d923c9` | 有限元素按固定位置组成可预期花束；输入与呈现分离 |
| [Procedural-Flower](https://github.com/Platane/Procedural-Flower) | `d857fbe846d5899cd5cf8ea6a47d37e6030f53c0` | 花型可拆成局部部件；有限动效停止在最终形态 |
| [SVG.js](https://github.com/svgdotjs/svg.js) | `6f58d4b2aa10e2d7ed6e38ff84caeb04b210af4e` | 分组、局部坐标与页面/导出双投影 |
| [Fabric.js](https://github.com/fabricjs/fabric.js) | `723838fcbb9feaa87c8840082640de2ed82383da` | 权威配方、scene model、页面渲染与导出副作用分层 |
| [d3-hierarchy](https://github.com/d3/d3-hierarchy) | `c4ae7066d5a52e8aeaab24b3f7113e25c38183f2` | 比较自动 packing 后，明确改用三个独立固定 slot |
| [FileSaver.js](https://github.com/eligrey/FileSaver.js) | `cea522bc41bfadc364837293d0c4dc585a65ac46` | 保存必须由用户触发，Safari/iOS 可能转为预览或新页面 |
| [WHATWG HTML](https://github.com/whatwg/html) | `24c5e48bf66ea61bc199ec6338c81258275ba9c6` | 原生按钮/链接、下载意图与建议文件名 |
| [W3C File API](https://github.com/w3c/FileAPI) | `cd1d1da9a5375af0622af4b36e76c6e6bd9d130b` | Blob 与对象 URL 生命周期 |
| [W3C SVG 2](https://github.com/w3c/svgwg) | `8b521081b0c65490c9b80633be68871f7bf441fa` | standalone SVG、viewBox、基本图形、分组与文本 |
| [W3C WCAG](https://github.com/w3c/wcag) | `07123b871c103268375880980fd715b2b26b2ff0` | 键盘、状态消息、焦点、reflow 与拖动替代 |
| [CSSWG Drafts](https://github.com/w3c/csswg-drafts) | `c7573530343759ace8e46438a1fa2c44515b5554` | 响应式、减少动态效果与强制色 |

许可证载体、权利主体、许可证文件 SHA-256 和更完整的排除项见 [`assets/ATTRIBUTION.md`](assets/ATTRIBUTION.md)。

## 设计过程资产

设计阶段使用 OpenAI 内置 `image_gen` 生成了十张概念图；工具未暴露具体模型/版本，因此不作猜测。第三方图片、开源截图、商业素材、角色、品牌、照片和第三方字体输入均为无。十张图只保存在 `docs/` 中用于设计评审和 fidelity 对比，生产页面不读取、不 fetch、不 preload，也不把它们作为 CSS background。

完整的十张文件名、尺寸、SHA-256、输入引用链、prompt、权利边界和处理记录见 [`docs/assets/flower-language-bouquet/GENERATION.md`](../../../../docs/assets/flower-language-bouquet/GENERATION.md)。本项目把它们称为“本轮生成概念”，不作排他原创或不侵权保证；生产花束仍由本仓库独立编写的 HTML、CSS 与 inline SVG primitive 实现。
