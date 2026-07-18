# 这一拍，刚好和你

两个人共用一台设备：左边负责低音 `A / S / D / F`，右边负责高音 `J / K / L / ;`。找到当前公开目标，在 200ms 内一起按下并保持 300ms；五个和弦全部完成后，会留下你们共同合成的一小段话。

## 启动

双击 [`index.html`](./index.html) 即可。作品是 A 级经典脚本页面，不需要安装依赖、启动服务、账号或网络。

声音由浏览器原生 OscillatorNode 即时生成，不包含音频文件。声音关闭、AudioContext 不可用或共享播放器缺失时，目标、保持进度和完整流程仍可通过视觉与文字完成。

## 操作

- 低音席：键盘 `A / S / D / F`，或点击/触摸左侧四键；
- 高音席：键盘 `J / K / L / ;`，或点击/触摸右侧四键；
- 两个触点可以同时按住不同声部；
- 双方都松开后才进入下一节；
- Escape、窗口失焦或页面隐藏会安全暂停，不会自动继续。

## 个性化

打开 [`config.js`](./config.js) 可修改两席称呼、开场和最终赠予文案。`composeHarmonyMessage(view)` 保留了一个可直接运行的学习 TODO；不修改它也能完整完成体验。

## 隐私与本地边界

作品不录音、不访问麦克风、不联网、不写入浏览器存储，也不保存本局。刷新页面即回到开场。

## 借鉴与来源声明

核验日期：2026-07-18。

| 项目 | 固定版本、许可证与权利主体 | 本作只研究的抽象机制 |
| --- | --- | --- |
| [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js/tree/589edde7f895ee0cd2b8068133c74e7c4d521046) | commit `589edde7f895ee0cd2b8068133c74e7c4d521046`；MIT；Copyright © 2014–2025 Yotam Mann | 音频时间轴与规则时间轴分离、短音生命周期 |
| [mdn/webaudio-examples](https://github.com/mdn/webaudio-examples/tree/733def1c41939a7bb2ec4dc1be3603e3ae70af51) | commit `733def1c41939a7bb2ec4dc1be3603e3ae70af51`；CC0 1.0；MDN contributors | AudioContext 用户激活与渐进增强 |
| [yuxshao/ptcollab](https://github.com/yuxshao/ptcollab/tree/8b40faa043f1e7734e7f560c0c181160c85f979e) | commit `8b40faa043f1e7734e7f560c0c181160c85f979e`；MIT；Copyright © 2020 Yu Xuan Shao | 声部分工、统一事件时间线 |
| [drahoslove/pianco](https://github.com/drahoslove/pianco/tree/2cb08afe19bc6583e281773d283033bde60e7d51) | commit `2cb08afe19bc6583e281773d283033bde60e7d51`；MIT；Copyright © 2022 Drahoslav Bednář | 玩家身份反馈、note 事件模型 |

这些项目都不是运行依赖。正式版本没有复制、翻译、改写、打包或依赖它们的源码、算法表达、网络协议、钢琴/键盘 UI、示例曲、MIDI、采样、声音包、字体、图标、截图或页面结构。五节乐句、200ms 会合与 300ms 保持规则、状态机、HTML、CSS、JavaScript、中文文案和测试均为本仓库独立创作。

### OpenAI ImageGen 资产

- 生成方式：OpenAI 内置 ImageGen，`stylized-concept`；
- 生成日期：2026-07-18；
- 第三方输入：无；
- 运行资产：[`assets/harmony-table.webp`](./assets/harmony-table.webp)；
- 原始概念：仓库 [`design/four-hands-harmony/`](../../../design/four-hands-harmony/) 下三张内部视觉规格图，不在运行页面加载。

最终生产背景提示词：

```text
Use case: stylized-concept. Production 1504x1046 responsive web background.
Bright morning conservatory, pale ash desk, matte ivory wall, soft leaf shadows,
restrained brass/glass props only at far edges, muted mint fabric left and apricot
fabric right. Center 70% empty, low contrast and crop-safe. Background only: no UI,
panels, cards, controls, keyboard, piano keys, sheet music, notation, symbols, hearts,
text, letters, numbers, logo, watermark, hands or people.
```

运行声音只复用仓库内部 [`shared/audio/tone-player.js`](../../../shared/audio/tone-player.js)，由原生 OscillatorNode 实时生成；零音频文件、零采样、零远程请求。完整逐项边界见 [`ATTRIBUTION.md`](./ATTRIBUTION.md)。
