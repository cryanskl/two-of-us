# ATTRIBUTION · 把两边，拉成我们

本文件区分“只用于研究的一般机制”和“实际随作品分发的原创资产”。运行时没有第三方代码、库、字体、声音、谱面、图像、SVG、远程资源或服务依赖。

## 机制研究来源

### ChloeLiang/rhythm-game

- 固定来源：<https://github.com/ChloeLiang/rhythm-game/tree/4995fbf1573f0dbdfac00bfe99c18523b610f24d>
- commit：`4995fbf1573f0dbdfac00bfe99c18523b610f24d`
- 许可证：MIT
- 权利主体：`Copyright (c) 2018 Liang Xin, Chloe`
- 只研究：固定事件表、输入时刻与目标时刻的绝对差、抑制长按重复触发这一类一般机制。
- 未使用：源码、谱面、参数、页面、样式和全部媒体。该仓库使用的音乐来自第三方作品/改编，其 MIT 仓库许可证不能证明音乐权利；本作不含任何音乐或音频。

### straker/kontra

- 固定来源：<https://github.com/straker/kontra/tree/a449fcdf3b1060c35a7cfd0e897e31c0a0e36a48>
- commit：`a449fcdf3b1060c35a7cfd0e897e31c0a0e36a48`
- 许可证：MIT
- 权利主体：`Copyright (c) 2015 Steven Lambert`
- 只研究：以 `KeyboardEvent.code` 区分输入，以及失焦时清理临时按键状态这一类一般生命周期原则。
- 未使用：游戏引擎、模块结构、API、实现代码、测试、示例或资源。

### Pixofield/keyshapejs

- 固定来源：<https://github.com/Pixofield/keyshapejs/tree/40feae4081352485ea014117b22e08a14f268ee9>
- commit：`40feae4081352485ea014117b22e08a14f268ee9`
- 许可证：MIT
- 权利主体：`Copyright (c) 2018-2021 Pixofield Ltd.`
- 只研究：状态驱动的路径进度，以及隐藏文档会节流动画帧的生命周期边界。
- 未使用：库代码、导出动画数据、SVG、示例、时间线实现或视觉。

上述 MIT 项目允许一定范围的复用，但本作选择零复制，因此它们的许可证文本不作为运行分发物打包。如果未来实际复制任一代码片段，必须另立变更并随分发保留对应版权和完整 MIT 许可证。

## 排除候选：111116/webosu

- 固定来源：<https://github.com/111116/webosu/tree/b4c0ba419a6ba33d5b2e35d1d977b656befcac25>
- commit：`b4c0ba419a6ba33d5b2e35d1d977b656befcac25`
- 程序主体：MIT，`Copyright (c) 2015 Drew DeVault`
- 混合许可边界：仓库 `hitsounds/` 另为 CC BY-NC 4.0。
- 结论：只在调研阶段核验其音频时钟方向；由于本作不需要音频且混合许可媒体与轻量离线目标不匹配，没有采用其代码、架构、音频、谱面、图片或其他素材。

## OpenAI ImageGen 原创生产资产

三张运行图片由 OpenAI 内置 ImageGen 于 2026-07-21 根据本项目纯文字提示生成。没有上传或引用第三方图片、开源项目截图、商业游戏素材、人物或品牌标识。

| 运行文件 | 文档源稿 | SHA-256 | 内容边界 |
| --- | --- | --- | --- |
| `assets/tailor-table-background.png` | `docs/assets/together-zipper/tailor-table-background-source.png` | `f35353786be7d5fadc0506fa6e1fc479eeba1c579f4f20c36caf016f8c1fa9d6` | 无字午夜裁缝桌背景；不含拉链、UI、人物或答案 |
| `assets/brass-zipper-pull.png` | `docs/assets/together-zipper/brass-zipper-pull-source.png` | `958d148ca8613db1455cbb8c9f5cd606359ad75ebd443adc7411cbcf23e6b9a5` | 深靛实底上的黄铜拉链位置章；纯装饰，不是按钮 |
| `assets/completed-keepsake.png` | `docs/assets/together-zipper/completed-keepsake-source.png` | `641ece5a37d7a6387ea76a0d0d735c96043592444b7b67f0eed53bd211fec02a` | 合拢织物与抽象双色针脚纪念物；无人物、文字或奖杯 |

运行图片由已冻结源稿逐字节复制，没有裁切、重编码、抠图或改色。概念板 `together-zipper-concept.png` 只留在文档目录，不随体验运行。

## 独立实现与零复制声明

“把两边，拉成我们”的 4 / 5 / 6 三段、15 齿路线、固定 tick、闭时间窗、同步阈值、七阶段 reducer、双席权限、输入去重、文案、DOM、CSS 和测试由本仓库独立设计与实现。没有复制、改写、翻译、移植、打包或依赖上述项目的源码、API、参数、谱面、测试、页面、样式、SVG、图片、字体、音乐、音效或文案。
