# vinyl-secret 来源与借鉴声明

## 当前交付范围

本阶段只包含：

- `config.js`：三条默认秘密轨道的本地明文配置；
- `logic.js`：12 个离散沟槽、四级距离信号、有序三轨状态机与阶段公开投影；
- `logic.test.js`：纯逻辑、配置原子回退和秘密 Gate 测试；
- 项目级 CommonJS 测试边界。

本阶段没有 UI、音频播放器、图片、封面、字体、纹理、图标或其他媒体资产，也不会调用浏览器媒体 API。

## 原创内容

以下内容为本仓库为 `vinyl-secret` 独立实现：

- `config.js` 与 `logic.js` 的全部代码；
- 默认三条线索、三段正文、最终标题、正文与落款；
- 12 圈、三轨有序解锁、四级文字信号和显式 `DROP_NEEDLE` 协议；
- token 化 `SETTLE_TRACK`、原子配置回退和阶段公开投影测试。

默认三个 `audioSrc` 均为 `null`，仓库没有附带歌曲、录音或测试音频。

## 标准与史料边界

研究与规格使用以下一手资料确认产品语义和未来浏览器边界：

- [Library of Congress: The Gramophone](https://www.loc.gov/collections/emile-berliner/articles-and-essays/gramophone/)：只用于唱针、沟槽与唱片标签的历史事实；
- [WHATWG HTML: Media elements](https://html.spec.whatwg.org/multipage/media.html)：只用于后续 UI 阶段的媒体播放行为边界；本阶段未实现媒体调用；
- [W3C WAI-ARIA APG: Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)：只用于后续 range 控件的输入语义；本阶段没有 DOM；
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)：只用于后续 UI 阶段的键盘、拖动替代、目标尺寸和状态消息验收边界；
- [WebKit: Auto-Play Policy Changes for macOS](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/) 与 [Chrome for Developers: Autoplay policy](https://developer.chrome.com/blog/autoplay)：只用于后续可选本地音频的用户激活与播放失败边界；本阶段没有音频元素或播放调用；
- [U.S. Copyright Office: Circular 56](https://www.copyright.gov/circs/circ56.pdf)：只用于区分底层音乐作品与具体录音的权利边界。

没有从这些资料复制代码、界面、文案、图形、音频或其他素材。

## 开源借鉴

本阶段没有查看、选择、下载、vendoring 或复制任何第三方开源项目实现，因此没有第三方 commit、tag、许可证正文或 NOTICE 需要随代码归档。

代码仅遵循本仓库已有的 UMD / CommonJS 双导出与纯 reducer 项目约定；这是仓库内部工程一致性，不是外部开源借鉴。

若后续阶段实际参考第三方开源实现，必须在提交前补充：

```text
仓库 URL
固定 commit 或 tag
许可证与版权人
实际借鉴内容
明确未借鉴内容
代码或素材的修改与归档位置
```

## 用户自备音频

未来准备者如填写 `./assets/private-audio/*.mp3|wav|ogg`，该路径只是本地元数据。准备者仍需自行确认：

- 底层作曲与歌词权利；
- 具体录音和表演权利；
- 录音中其他参与者的同意；
- 把整个作品目录交给他人时允许的分发范围。

音频许可不会自动覆盖封面、照片、字体或纹理；这些资产需要分别核查和声明。
