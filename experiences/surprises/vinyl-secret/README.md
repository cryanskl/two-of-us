# 把秘密藏进这一圈

一个为对象准备的单人本地惊喜：接收者根据线索移动唱针，在 12 圈唱片
沟槽中依次找到三段文字，最后打开只属于两个人的唱片封套。

## 点开即用

直接双击本目录的 `index.html`。地址栏显示 `file://` 是正常现象；页面无需
安装依赖、无需启动服务、无需联网。Chrome、Safari、Edge、Firefox 的现代
桌面版本均可运行。

玩法只有四步：

1. 按“开始寻声”读取当前线索；
2. 拖动原生滑杆，或用方向键、向内/向外按钮逐圈移动；
3. 根据信号“寂静 / 微响 / 靠近 / 清晰”判断位置，再按“落下唱针”；
4. 依次找到三轨，打开最终封套。

默认无音频，全部流程和结局仅靠文字即可完成。

## 改成你们的版本

用文本编辑器打开 `config.js`，只修改顶部配置对象中的收件人、三条线索、
三段正文、目标沟槽和最终留言。目标沟槽必须是 1 到 12 之间互不相同的
整数；三轨会严格按数组顺序出现。

如需加入自己的录音：

1. 在本目录下自行创建 `assets/private-audio/`；
2. 放入你有权使用的 `.mp3`、`.wav` 或 `.ogg`；
3. 把对应轨道的 `audioSrc: null` 改成形如
   `audioSrc: "./assets/private-audio/your-voice.mp3"` 的相对路径。

请保持 `./assets/private-audio/文件名.扩展名` 这一层结构。默认无音频，
音频加载失败也不会阻止文字揭晓或最终完成。

## 隐私与交付

`config.js` 和自备音频都是本地明文，不是加密。拿到完整目录、备份、压缩包
或设备访问权的人都可能直接读取内容；浏览器开发者工具也能查看当前已经加载
的文件。因此只应把目录交给可信任的接收者，不要把真实秘密推送到公开仓库。

页面不联网、不上传、不录音、不调用麦克风、不写 Cookie 或浏览器存储。接收者
打开前，静态 HTML 只有公共标题；具体线索、正文与最终留言按阶段创建并在离开
阶段时销毁，但这属于界面揭晓控制，不属于加密。

## 自备素材与权利

仓库不附带歌曲、录音、照片、专辑封面、第三方字体或纹理。加入歌曲或语音前，
请确认底层作品的词曲权、所使用具体录音的录音权与表演权，并取得录音中其他
参与者的明确同意。照片、封面、字体和纹理的许可需要分别核查；拥有一首歌的
播放权不等于拥有这些素材的复制或分发权。

## 借鉴与来源声明

本项目没有参考或复制第三方开源项目的代码、界面、图形或素材，因此无第三方
开源 commit、tag、许可证或 NOTICE 需要归档；运行时 CSS 唱片、纸张、封面
和 favicon 均为本仓库原创代码绘制，没有复制外部设计。

产品语义和浏览器边界只借鉴一手资料：

- [Library of Congress: The Gramophone](https://www.loc.gov/collections/emile-berliner/articles-and-essays/gramophone/)
- [WHATWG HTML: Media elements](https://html.spec.whatwg.org/multipage/media.html)
- [W3C WAI-ARIA APG: Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WebKit: Auto-Play Policy Changes for macOS](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)
- [Chrome for Developers: Autoplay policy](https://developer.chrome.com/blog/autoplay)
- [U.S. Copyright Office: Circular 56](https://www.copyright.gov/circs/circ56.pdf)

完整边界与生成式视觉概念说明见 `ATTRIBUTION.md`。
