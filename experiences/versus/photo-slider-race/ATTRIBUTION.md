# “同一张，谁先拼回”借鉴与来源声明

## 独立实现声明

本项目的 3×3 滑块规则、确定性打乱、双人状态机、输入映射、公开视图合同、测试和
中文文案均在本仓库独立设计与实现。首版未复制、改写、翻译、移植、链接、打包或
依赖任何开源滑块拼图项目的代码、测试、页面、规则文本、视觉、图片、字体、图标、
声音或其他资产。

经典滑块拼图只作为公共玩法类型存在，不在本项目中对应某个被借鉴的开源仓库。
如果后续实际引入第三方内容，必须在合并前更新本文件，逐项列出固定 commit、许可
证、版权主体、借鉴或复制范围、修改内容与分发义务；届时不能继续沿用当前
“零代码、零素材复制”的结论。

## 平台与标准来源

以下一手标准与官方资料只用于说明浏览器能力、可访问性、计时与图片权利边界，不是
项目代码、规则文本或视觉素材的来源：

- [WHATWG HTML：File Upload state](https://html.spec.whatwg.org/multipage/input.html#file-upload-state-(type=file))
  用于原生文件选择和 `accept` 仅为提示的边界；
- [WHATWG HTML：ImageBitmap](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html)
  用于本地图片方向解码和显式关闭约束；
- [W3C File API](https://www.w3.org/TR/FileAPI/)
  用于 File、Blob URL 与 `revokeObjectURL` 生命周期约束；
- [CSS Images Module Level 3：image orientation](https://www.w3.org/TR/css-images-3/#the-image-orientation)
  用于方向元数据与自然尺寸的语义边界；
- [WHATWG HTML：Canvas](https://html.spec.whatwg.org/multipage/canvas.html)
  用于原创默认图、中心裁切和派生图编码能力；
- [W3C High Resolution Time Level 3](https://www.w3.org/TR/hr-time-3/)
  用于单调比赛时间戳；
- [WHATWG HTML：Page Visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility)
  用于页面隐藏时双方同时暂停；
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
  用于点击目标、焦点、缩放和非颜色反馈验收；
- [WAI-ARIA Authoring Practices：Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)
  用于评估并明确不采用会与比赛方向键冲突的复合 grid 键盘模型；
- [U.S. Copyright Office：Games](https://www.copyright.gov/register/tx-games.html)
  用于玩法思想与具体文字、美术表达的权利边界；
- [U.S. Copyright Office Circular 42：Photographs](https://copyright.gov/circs/circ42.pdf)
  用于用户照片权利提示。

没有复制上述资料的规范文字、IDL、示例代码或站点视觉。运行时使用的是浏览器原生
能力，不打包这些站点的任何内容。

## 视觉概念声明

下列两张图由总控通过 **OpenAI Image Gen** 生成，仅作为仓库内设计过程证据：

| 概念图 | SHA-256 |
| --- | --- |
| `docs/assets/photo-slider-race/desktop-active-race-concept.png` | `16e28a71764f147d6af8ce6d9618dd38847a1d2bc873445b8c0d57d27b3a9cd3` |
| `docs/assets/photo-slider-race/mobile-active-race-concept.png` | `fcf8d56f5e90b8522ccb405846b647f9a4b1dd445a840a04452bd58dd9290ca1` |

它们不作为运行时资源：生产页面没有加载、切片、OCR、复制或描摹概念 PNG。实际
标题、HUD、按钮、徽记、图块、状态和默认图均为 code-native HTML、CSS、SVG 与
Canvas。默认图只继承“深夜蓝、左下暖金、右上珊瑚、双轨、中心双星”的抽象题材和
构图关系，并由本项目独立绘制。

## 图片权利边界

内置默认图由本项目代码原创生成。用户只能选择自己拍摄、已获授权或有权使用的照片；
本地处理不会改变照片原有的权利归属。核心只保存
`kind/status/generation/errorCode` 四项非识别性来源元数据，不接收或公开文件名、
路径、URL、Blob、MIME、尺寸、EXIF、GPS 或原始文件对象。UI 只在当前页面内短暂持有
File、ImageBitmap、派生 Blob 和唯一 active Object URL，并按生命周期显式释放。
