# “心愿烟火”固定来源维护复核

- 复核日期：2026-07-24
- 对应候选：[183-wish-fireworks-research.md](./183-wish-fireworks-research.md)
- 对应规格：[184-wish-fireworks-spec.md](./184-wish-fireworks-spec.md)
- 复核范围：5 个固定一手来源的公开状态、默认分支 HEAD、固定 commit、
  许可证文件与当前标准校准
- 本轮行为：只读取官方仓库与 W3C 页面；未下载、复制、翻译、改写或引入第三方
  源码、测试、图片、字体、音频、配置或其他素材

## 1. 结论

`wish-fireworks` 的五项固定来源在 2026-07-24 仍可达，仓库均公开、未归档、
未禁用。五个默认分支 HEAD 仍精确等于 2026-07-21 调研固定的 commit，当前
许可证文件与固定版本的 SHA-256 也逐项相同。

因此，原调研的许可证判断与“只借鉴抽象机制、生产代码独立重写”边界保持有效，
不需要新增运行依赖，也不需要改变 A 级本地实现结论。

W3C 两个仓库在 GitHub API 的 `license.spdx_id` 中返回 `NOASSERTION`。这不表示
没有许可证：`pointerevents/LICENSE.md` 明确指定 W3C Software and Document
License，`wcag/LICENSE.md` 明确指定 W3C Document License。法律边界继续以仓库
许可证文件和 W3C 官方页面为准，不以平台的 SPDX 自动识别结果代替。

## 2. 可重放核验结果

| 来源 | 默认分支 | 2026-07-24 HEAD | 公开状态 | GitHub SPDX | 固定/当前许可证 SHA-256 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| [Fireworks.js](https://github.com/crashmax-dev/fireworks-js) | `master` | `8f01eeaef422c1f0880e94ce99040025a1b74d7e` | 未归档、未禁用 | `MIT` | `90ee54acbb98a0f58ef428b972bc5641877b6c56315bd6983396a5682db5d937` | HEAD 与固定 commit 相同；MIT 文本未漂移 |
| [W3C Pointer Events](https://github.com/w3c/pointerevents) | `gh-pages` | `238e8273305bb2e3c76f9f0bb289fb127c3dff74` | 未归档、未禁用 | `NOASSERTION` | `232da9c6c2b9f7e19e5d85cc7cf43760d80b7c4174406ac6404fa2c1b51d531b` | HEAD 与固定 commit 相同；仓库明确采用 W3C Software and Document License |
| [canvas-text-particle](https://github.com/dango0812/canvas-text-particle) | `master` | `9ee144a548aad85275318b30891c71dcf6e10f7b` | 未归档、未禁用 | `ISC` | `2a9fec8f93f07847a22029d5c423e33e0839da09d516664e5f0608346c03a122` | HEAD 与固定 commit 相同；ISC 文本未漂移 |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | `master` | `20eebad51dde793070c373d594099a7ed8d96e22` | 未归档、未禁用 | `ISC` | `fd44477c30a832a1dee9ef0b6cfb34677fbe5ef58c0cf655d27c646f11bb2f7a` | HEAD 与固定 commit 相同；ISC 文本未漂移 |
| [W3C WCAG](https://github.com/w3c/wcag) | `main` | `07123b871c103268375880980fd715b2b26b2ff0` | 未归档、未禁用 | `NOASSERTION` | `7a3ad7d36b8855bc301276279769da4aff648ea5d7b92f3f023c0823ee948764` | HEAD 与固定 commit 相同；仓库明确采用 W3C Document License |

表中的许可证 SHA-256 同时对固定 commit 与当前 HEAD 的原始许可证内容计算；
二者逐项相同。它证明本次复核时文本没有漂移，不把摘要本身当成许可证替代品。

复核命令形状如下：

```bash
curl -fsSL "https://api.github.com/repos/<owner>/<repo>"
git ls-remote "https://github.com/<owner>/<repo>.git" "refs/heads/<branch>"
curl -fsSL "https://raw.githubusercontent.com/<owner>/<repo>/<commit>/<license>" \
  | shasum -a 256
```

## 3. 许可证与版权逐项复核

### 3.1 Fireworks.js

- 固定许可证：
  [MIT](https://github.com/crashmax-dev/fireworks-js/blob/8f01eeaef422c1f0880e94ce99040025a1b74d7e/LICENSE)
- 版权主体保持为 `Copyright (c) 2021-2023 Vitalij Ryndin`。
- 当前仓库仍把上升、爆炸、控制器与清理放在同一烟火库中，也仍包含随机参数、
  gravity、friction、flickering 与 sound 等实现方向。
- 本作继续只借鉴表现职责可拆分这一抽象，不复制源码、API、参数、公式、默认值、
  框架封装、视觉或素材；尤其继续排除 flickering。

### 3.2 W3C Pointer Events

- 固定许可证：
  [W3C Software and Document License](https://github.com/w3c/pointerevents/blob/238e8273305bb2e3c76f9f0bb289fb127c3dff74/LICENSE.md)。
- [Pointer Events Level 3](https://www.w3.org/TR/pointerevents3/) 已于
  2026-06-30 成为 W3C Recommendation；其事件目录仍明确包含
  `pointerdown`、`pointerup`、`pointercancel`、`gotpointercapture` 和
  `lostpointercapture`。
- 这支持规格现有的“按下建立候选、抬起/取消/丢失 capture 收束、原生 click
  唯一提交”生命周期，但不构成复制规范算法或示例。
- Level 3 同时包含 raw、coalesced、predicted events 等能力；它们仍不进入首版，
  也不扩大到 pressure、tilt 或设备指纹相关字段。

### 3.3 canvas-text-particle

- 固定许可证：
  [ISC](https://github.com/dango0812/canvas-text-particle/blob/9ee144a548aad85275318b30891c71dcf6e10f7b/LICENSE)。
- 版权主体保持为 `Copyright (c) 2026, dango0812`。
- 本作继续只借鉴“稳定粒子 ID 朝静态目标点归位”的职责分层。
- 固定 9×9 ASCII 点阵、目标坐标、整数表现帧与状态机均独立设计；不读取字体
  像素，不使用其离屏文字 Canvas、采样、排斥/回归公式、API、默认字体或演示。

### 3.4 canvas-confetti

- 固定许可证：
  [ISC](https://github.com/catdad/canvas-confetti/blob/20eebad51dde793070c373d594099a7ed8d96e22/LICENSE)。
- 版权主体保持为 `Copyright (c) 2020, Kiril Vatev`。
- 当前上游 README 仍把 `disableForReducedMotion` 与 `reset()` 作为公开能力。
- 本作只借鉴“减少动态时仍完成同一逻辑结果”和“集中清理表现资源”的原则，
  不复制其 Promise/Worker 协调、粒子物理、位图缓存、形状、颜色、参数、示例或
  Canvas 源码，也不把 canvas-confetti 加入依赖。

### 3.5 W3C WCAG

- 固定许可证：
  [W3C Document License](https://github.com/w3c/wcag/blob/07123b871c103268375880980fd715b2b26b2ff0/LICENSE.md)。
- W3C 当前 Understanding 页面仍分别说明：
  - [SC 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)：
    pointer 功能需要可比较的键盘路径；
  - [SC 2.3.1 Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)：
    应避免闪烁，或保持在阈值内；
  - [SC 2.3.3 Animation from Interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)：
    非必要交互动效应能被关闭，页面列出 `prefers-reduced-motion` 技术；
  - [SC 2.5.2 Pointer Cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html)：
    继续支持以 up-event 完成、取消或撤销 pointer 操作的设计方向。
- Understanding 页面是会更新的解释资料，不替代固定规范版本；本作不复制正文、
  技术示例、测试或图片，也不把这些设计选择宣称为 WCAG 合规认证。

## 4. 对实现边界的影响

本次没有发现需要改变原规格的许可证或维护风险。生产实现继续遵守：

1. 不新增 Fireworks.js、canvas-text-particle、canvas-confetti 或其他烟火运行依赖；
2. 点阵、target、量化、表现帧、state、reducer、token 与输入适配独立实现；
3. 不复制第三方源码、测试、API、参数、公式、默认配置、DOM、CSS、配色、字体、
   图片、音频、品牌或演示素材；
4. Pointer Events 与 WCAG 只校准输入、安全和无障碍边界，不作为代码来源；
5. 若未来实际复制或修改第三方内容，立即停止“独立重写”结论，重新做文件级许可
   审计，并随分发保留适用许可证、版权通知、修改说明与素材来源。

## 5. 下一次复核触发条件

出现以下任一情况时，不等待定期维护日期，立即重新复核：

- 需要引入任何参考库、代码片段、测试、公式、素材或构建产物；
- 固定仓库被归档、转移、删除或许可证文件变化；
- Pointer Events/WCAG 的实现依赖从当前冻结子集扩大；
- 视觉概念或生产资产使用第三方截图、字体、图标、音频、图片或烟火品牌；
- A 级边界改变，需要模块、服务、网络、权限或外部资产。
