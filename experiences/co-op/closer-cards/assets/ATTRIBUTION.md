# 借鉴与来源声明

## 原创实现与开源边界

本作品只参考 [`michaelsboost/CoupleCards` 固定 commit `94ac422`](https://github.com/michaelsboost/CoupleCards/tree/94ac422ba393d5aa8c709527dab6f1f6e4156cc1) 的“本地抽取谈话提示”通用机制，并用 [`qiaeru/couplecards` 固定 commit `c3e4d1e`](https://github.com/qiaeru/couplecards/tree/c3e4d1ef15651caa72b261677e65dc9beda8bd13) 比较重型产品边界。调研没有读取、复制、改写或运行两者源码、题库与素材；本目录是零代码、零题目、零第三方视觉素材借用的原创实现。详细许可证与功能边界见上级 [`README.md`](../README.md)。

## OpenAI ImageGen

| 本地文件 | 生成日期 | 用途 | 来源与处理 |
| --- | --- | --- | --- |
| `midnight-paper.png` | 2026-07-18 | 运行页深靛蓝纸纤维背景 | OpenAI ImageGen 按本仓库规格生成的无字、无人物、无品牌资产；未包含第三方图片、商标或开源项目素材 |
| `docs/assets/closer-cards/concept-desktop.png` | 2026-07-18 | 1504×1046 桌面构图基准 | OpenAI ImageGen 生成，仅作设计证据，运行页不加载 |
| `docs/assets/closer-cards/concept-mobile.png` | 2026-07-18 | 853×1844 手机构图基准 | OpenAI ImageGen 生成，仅作设计证据，运行页不加载 |

HTML、CSS、题卡文字、按钮、席位、进度、红线、焦点和状态全部由代码原生渲染，没有从概念图裁切 UI。

若以后加入第三方字体、图标、图片、声音、题库或源码，必须先核验许可证，再在这里记录作者、固定版本、许可证、本地文件、修改内容和用途。
