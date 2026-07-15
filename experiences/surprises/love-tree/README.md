# Love Tree

点击画面中央的爱心，树会逐渐生长并开花；随后页面以打字机效果展示情书，同时计算两个人在一起的时间。

## 使用方式

直接双击本目录的 `index.html`。页面使用本地 HTML、CSS、JavaScript 和 MP3，不需要联网或安装依赖。

## 定制位置

打开 `index.html` 后修改：

1. `<title>`：浏览器标签页标题；
2. `class="say"` 的文本：左侧情书；
3. `together.setFullYear(...)`、`setHours(...)`、`setMinutes(...)`：在一起的时间；
4. `renxi.mp3`：背景音乐，替换时保持文件名不变即可；
5. `love.js` 中的 `Come Baby`：爱心旁的小字。

`setFullYear` 的月份从 `0` 开始计数，例如 `1` 表示二月。修改前建议复制一份原文件。

## 作品标签

| 项目 | 内容 |
| --- | --- |
| 主分类 | 单人惊喜 |
| 设备 | 单设备 |
| 输入 | 鼠标或触屏 |
| 启动 | 离线 A 级，双击即开 |
| 定制 | 修改 HTML 文案、日期和音频 |
| 技术 | Canvas、jQuery、Jscex |

## 文件说明

- `index.html`：页面结构、情书、日期和动画编排；
- `renxi/`：样式、动画和旧版第三方脚本；
- `renxi.mp3`：背景音乐；
- `preview.png`：演示截图，不参与运行。

原始压缩包保存在 [`archive/source-packages/html5-love-original.rar`](../../../archive/source-packages/html5-love-original.rar)，其运行文件与本目录迁移前的展开版本完全相同，仅作历史快照。

## 已知限制

- 部分浏览器会阻止音频自动播放；
- 页面按约 `1100 × 680` 的桌面画布设计，手机小屏体验有限；
- 依赖较旧的 jQuery 与 Jscex，仅建议在可信的本地内容中运行；
- 页面内文案、日期和音乐可能涉及隐私与版权，不要未经确认公开发布。

## 来源与许可证

此仓库最初沿用 [`cryanskl/html_lovetree`](https://github.com/cryanskl/html_lovetree) 的内容。源仓库和当前仓库均未声明统一开源许可证，因此不能把“公开可见”理解为“可以任意复制和再分发”。背景音乐是商业录音，需由使用者自行确认授权。
