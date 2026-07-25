# vinyl-secret 来源与借鉴声明

## 当前交付

这是可通过 `file://` 直接打开的完整本地体验，包含三轨状态机、经典脚本
controller、响应式界面、CSS 唱片和纸张图形、本地 SVG favicon，以及默认
无音频的文字完整路线。目录不引用 CDN、远程字体、外部图片或外部运行资源。

## 原创实现

以下运行内容由本仓库为 `vinyl-secret` 独立设计和实现：

- `config.js`、`logic.js`、`app.js` 的全部代码与测试；
- 默认线索、正文、最终标题、留言与落款；
- 12 圈沟槽、四级距离信号、三轨有序解锁与显式落针交互；
- `styles.css` 中的唱片、唱臂、标签、纸张、封面与版式；
- `assets/favicon.svg` 的简化唱片图标。

运行界面没有复制外部网站、唱片封面、字体、纹理、照片、图标、音频或其他
素材；没有使用第三方素材生成运行资产。

## 生成式视觉概念

生产前的两张视觉概念图由 OpenAI 图像生成工具根据本项目文字方向生成，只作为
仓库 `docs/assets/` 下的设计沟通资料：

- `vinyl-secret-desktop-seeking-concept.png`
- `vinyl-secret-mobile-complete-concept.png`

它们不被 `index.html`、CSS 或 JavaScript 加载，不进入 `file://` 运行包。
生产界面以原生 HTML、CSS 和 JavaScript 重新实现，没有复制概念图中的位图、
品牌、字体或纹理。

## 一手资料

以下资料只用于确认历史事实、平台能力、可访问性和权利边界：

- [Library of Congress: The Gramophone](https://www.loc.gov/collections/emile-berliner/articles-and-essays/gramophone/)：唱针、沟槽与唱片标签的历史语义；
- [WHATWG HTML: Media elements](https://html.spec.whatwg.org/multipage/media.html)：单一媒体元素、`play()` 与媒体事件边界；
- [W3C WAI-ARIA APG: Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)：原生滑杆的键盘与值语义；
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)：键盘替代、目标尺寸、焦点和状态消息；
- [WebKit: Auto-Play Policy Changes for macOS](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)：Safari 用户激活与播放失败边界；
- [Chrome for Developers: Autoplay policy](https://developer.chrome.com/blog/autoplay)：Chromium 用户激活边界；
- [U.S. Copyright Office: Circular 56](https://www.copyright.gov/circs/circ56.pdf)：音乐作品与具体录音的权利区别。

没有从上述资料复制代码、界面、文案、图形、音频或其他素材。

## 第三方开源边界

本项目没有查看、选择、下载、vendoring 或复制任何第三方开源项目实现，也没有
以改写方式引入外部实现，因此无第三方开源 commit、tag、许可证正文或 NOTICE
需要随代码归档。代码只沿用本仓库内部的经典脚本、UMD / CommonJS 双导出和纯
reducer 工程约定。

如果未来确实借鉴开源实现，必须在提交前记录仓库 URL、固定 commit 或 tag、
许可证与版权人、实际借鉴内容、明确未借鉴内容，以及代码或素材的修改位置。

## 隐私与音频权利

`config.js` 与自备音频都是本地明文，不是加密；阶段 DOM 隔离只能控制界面何时
揭晓，不能阻止持有目录的人读取源文件。默认无音频，仓库不附带歌曲、录音或
测试音频；默认三个 `audioSrc` 均为 `null`。

准备者如加入歌曲或语音，必须自行确认底层作品的词曲权、所使用具体录音的
录音权与表演权，并取得录音中其他参与者的明确同意。歌曲许可不会自动覆盖
照片、专辑封面、字体或纹理，这些素材需要分别核查许可与分发范围。
