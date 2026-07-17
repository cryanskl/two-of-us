# 借鉴与来源声明

## 原创实现

本目录的运行时代码、六码本映射、四轮合作规则、中文文案、HTML、CSS、Web Audio 合成音和测试均由本仓库为「默契电报码」原创实现，没有复制、改写或引入第三方开源项目、题库、图片、字体、音乐或音效。

## 视觉概念

视觉概念稿由 OpenAI ImageGen 在 2026-07-17 根据 [`docs/41-telegraph-codebook-spec.md`](../../../../docs/41-telegraph-codebook-spec.md) 生成，保存在 [`docs/assets/telegraph-codebook/concept.png`](../../../../docs/assets/telegraph-codebook/concept.png)。它只用于确定深夜电台构图、黄铜/汽油蓝色板、双电键关系和响应式层级，运行页不会加载该图片。

## 通用知识

- 短 / 长脉冲编码来自电报与摩斯式编码的通用思想；本作品自定义六码本，不宣称遵循国际摩斯电码；
- 回合顺序采用公开常见的 Fisher–Yates 洗牌，并使用浏览器 `crypto.getRandomValues` 与拒绝采样生成无偏索引；
- 声音由浏览器 Web Audio API 即时合成，不包含录音样本。

目前没有需要列出的第三方许可证。若以后加入开源代码、字体、纹理、图片或音效，必须先核验许可，再在此记录作者、原链接、固定 commit / 版本、许可证、本地文件、修改内容与用途。
