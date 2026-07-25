# 借鉴与来源声明

## 独立实现声明

本作的四符解码玩法、题包配平规则、状态机、计分、32 张虚构片名卡、中文
标签与测试均由本仓库独立设计和编写。实现没有参考、复制、修改、链接或打包
任何第三方猜电影游戏、开源项目、题库、剧情简介、台词、海报、剧照、Logo、
字体、音频、视频或厂商 Emoji 图像。

本目录没有第三方运行时依赖、第三方代码或第三方资产，因此没有需要随作品
再分发的第三方许可证正文、版权声明或 notice。

## Unicode 字符与厂商图像边界

题面只保存少量 Unicode 字符序列，并由本机系统字体渲染。项目没有复制
Unicode 或 CLDR 数据文件、注释、字体和图表，也没有保存 Apple、Google、
Microsoft、Samsung 等厂商的 Emoji PNG、SVG、截图或导出字形。

中文标签、内部概念词、虚构片名、干扰项和解释均为项目原创文本，不是 CLDR
注释的翻译或摘录。

## 仅用于标准与权利边界校准的一手资料

- [Unicode Emoji Images and Rights](https://unicode.org/emoji/images.html)
  用于区分字符编码与平台厂商拥有的彩色字形图像。
- [Unicode Technical Standard #51, Revision 29](https://www.unicode.org/reports/tr51/tr51-29.html)
  用于理解 Emoji 字符与序列的标准边界；本项目没有复制标准的数据文件。
- [Unicode Emoji & Pictographs FAQ](https://www.unicode.org/faq/emoji_dingbats.html)
  用于核对编码字符、字形呈现和平台互操作边界。
- [Unicode Licensing Policy](https://www.unicode.org/policies/licensing_policy.html)
  用于确认未来若引入 Unicode 数据文件时需要单独履行许可义务。
- [U.S. Copyright Office Circular 33](https://www.copyright.gov/circs/circ33.pdf)
  与 [Standard Application Help: Author](https://www.copyright.gov/eco/help-author.html)
  用于区分短标题、作者性与可登记表达。
- [Motion Pictures](https://www.copyright.gov/registration/motion-pictures/)
  与 [Circular 45](https://copyright.gov/circs/circ45.pdf)
  用于核对影视作品及其具体表达的保护边界。
- [USPTO Title of a Single Creative Work](https://www.uspto.gov/trademarks/laws/title-single-work-refusal-and-how-overcome-refusal)
  用于核对单一作品标题的商标审查边界。
- [USPTO Likelihood of Confusion](https://www.uspto.gov/trademarks/search/likelihood-confusion)
  用于校准名称近似与品牌混淆检查。
- [WCAG 2.2 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content)
  与 [Technique H86](https://www.w3.org/WAI/WCAG22/Techniques/html/H86)
  用于确认 Emoji 需要等价文本。
- [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria/)
  用于核对生产 UI 中可访问名称和隐藏语义的实现边界。

这些资料不是运行依赖、题库来源或可复制的视觉素材；本实现没有复制其中的
示例代码。

## 后续变更规则

如果后续参考任何开源实现，必须先固定仓库 commit 或 tag URL，核对 LICENSE、
版权人和资产的独立许可证，并记录实际借鉴内容与未复制范围。若引入代码或
资产，还必须保留许可证要求的正文、版权与 notice。
