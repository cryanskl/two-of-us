# 借鉴与来源声明

核验日期：2026-07-18。

## 机制与工程参考

| 项目 | 固定版本与许可证 | 本作仅研究 | 未复制或引入 |
| --- | --- | --- | --- |
| [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js/tree/589edde7f895ee0cd2b8068133c74e7c4d521046) | commit `589edde7f895ee0cd2b8068133c74e7c4d521046`；MIT；Copyright © 2014–2025 Yotam Mann | 音频时间轴与规则时间轴分离、短音生命周期 | 源码、Transport/Synth/Sampler API、调度示例、旋律、测试音频、依赖 |
| [mdn/webaudio-examples](https://github.com/mdn/webaudio-examples/tree/733def1c41939a7bb2ec4dc1be3603e3ae70af51) | commit `733def1c41939a7bb2ec4dc1be3603e3ae70af51`；CC0 1.0；MDN contributors | AudioContext 用户激活与渐进增强 | 示例源码、step sequencer、WAV/MP3/OGG 与页面视觉 |
| [yuxshao/ptcollab](https://github.com/yuxshao/ptcollab/tree/8b40faa043f1e7734e7f560c0c181160c85f979e) | commit `8b40faa043f1e7734e7f560c0c181160c85f979e`；MIT；Copyright © 2020 Yu Xuan Shao | 声部分工、统一事件时间线 | Qt/C++、协议、轨道编辑器、图标、pxtone 乐器、示例曲、声音包 |
| [drahoslove/pianco](https://github.com/drahoslove/pianco/tree/2cb08afe19bc6583e281773d283033bde60e7d51) | commit `2cb08afe19bc6583e281773d283033bde60e7d51`；MIT；Copyright © 2022 Drahoslav Bednář | 玩家身份反馈、note 事件模型 | 前后端代码、WebSocket 协议、钢琴 UI、和弦命名、Salamander 采样、Bravura 字体、截图、曲目 |

这些项目都不是运行依赖。本作只复用仓库内部经典脚本 [`shared/audio/tone-player.js`](../../../shared/audio/tone-player.js)，由浏览器原生 OscillatorNode 实时生成短音；没有音频文件、采样、SoundFont、MIDI、远程请求或第三方包。

## OpenAI ImageGen 资产

- 生成方式：OpenAI 内置 ImageGen，`stylized-concept`；
- 生成日期：2026-07-18；
- 第三方输入：无；
- 运行资产：[`assets/harmony-table.webp`](./assets/harmony-table.webp)；
- 原始概念：仓库 [`design/four-hands-harmony/`](../../../design/four-hands-harmony/) 下的桌面进行、移动进行和桌面完成概念，仅作为本项目内部视觉规格，不在运行页面中加载。

最终生产背景提示词：

```text
Use case: stylized-concept. Production 1504x1046 responsive web background.
Bright morning conservatory, pale ash desk, matte ivory wall, soft leaf shadows,
restrained brass/glass props only at far edges, muted mint fabric left and apricot
fabric right. Center 70% empty, low contrast and crop-safe. Background only: no UI,
panels, cards, controls, keyboard, piano keys, sheet music, notation, symbols, hearts,
text, letters, numbers, logo, watermark, hands or people.
```

背景图片只提供晨光环境与边缘材质，不包含 UI、文字、符号、琴键、人物或第三方素材。页面的谱带、和弦印记、琴键、状态、焦点和文案均由原生 HTML/CSS/JavaScript 生成。

## 完整零复制声明

五个离散双音事件、音高计划、200ms 会合窗、300ms 保持与双松手 Gate、不可变状态机、经典脚本接线、阶段 DOM、视觉系统、中文文案、无障碍策略和测试均为本仓库独立创作。

没有复制、翻译、改写或打包上述参考项目的代码、算法表达、网络协议、数据格式、键盘 UI、页面结构、示例旋律、曲谱、MIDI、采样、声音包、字体、图标、截图或其他视觉素材。
