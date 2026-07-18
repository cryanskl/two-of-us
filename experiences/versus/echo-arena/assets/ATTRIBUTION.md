# 借鉴与来源声明

## 玩法机制

本作使用“观察灯光/声音序列并按原顺序复现，序列逐步变长”的通用记忆机制。规则核验来源：

- [Hasbro Simon 官方说明](https://instructions.hasbro.com/en-us/instruction/simon-game)。

没有使用 Simon 名称、商标、圆形四色象限外观、产品文案、声音、素材或实现。双人交替追加、三局两胜、交接 Gate、共同封顶、中文文案和模拟排练台视觉均为本仓库原创。

## 开源项目元数据复核

只检查下列仓库的仓库元数据、许可证和固定 commit，没有读取、运行、复制、改写或打包其源代码与素材：

- [alguerocode/simon-game @ `fb006ba2e99abf26157957a1e0081ee5f36ae606`](https://github.com/alguerocode/simon-game/tree/fb006ba2e99abf26157957a1e0081ee5f36ae606)，Apache-2.0；
- [arjuncvinod/Simon-Game @ `a7cf23b1f03b544d5a13b574aab0ee0c2f70aba1`](https://github.com/arjuncvinod/Simon-Game/tree/a7cf23b1f03b544d5a13b574aab0ee0c2f70aba1)，MIT。

因此当前运行目录不包含来自上述项目的代码、图片、字体、音频或其他需要再分发的文件。

**借用结论：零代码、零素材借用。** 上述链接只作为机制与许可证调研记录。

## 浏览器音频依据

[MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)用于确认 AudioContext 的用户手势与声音控制边界。本作不复制示例代码；共享 tone player 为仓库原创实现。

## 生成资产

- `rehearsal-desk.png`：OpenAI ImageGen 生成的无字胡桃木排练桌背景；
- `docs/assets/echo-arena/concept-desktop.png`：OpenAI ImageGen 生成的 1504×1046 桌面设计概念；
- `docs/assets/echo-arena/concept-mobile.png`：OpenAI ImageGen 生成的 853×1844 移动设计概念。

生成图只提供原创环境材质和设计方向。运行时标题、按钮、音键、比分、序列、焦点和状态全部由 HTML/CSS/JavaScript 原生生成。

## 音频与字体

- 不包含录音、采样、歌曲或商业音乐；四个短音由 Web Audio OscillatorNode 实时合成；
- 不包含第三方字体文件，只使用本机系统字体回退；
- 不发起远程字体、图片、脚本或音频请求。
