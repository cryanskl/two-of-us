# 单人惊喜类：开源项目与互动机制调研

> 调研快照：2026-07-15。结论来自原仓库、许可证文件与入口源码核验；未把任何第三方源码直接复制进本仓库。

## 结论先行

最适合 `two-of-us` 的惊喜页不是功能最多的模板，而是：

- 有单一 `config.js` 或少量明确的定制位置；
- 图片、音频、字体和脚本都能放在作品自己的目录；
- 首次点击既启动体验，也合法触发音乐；
- 不用前端密码伪装真正的隐私保护；
- 有明确许可证，且素材来源可单独说明。

建议首批按以下顺序实现或评估引入：

1. 拆信封告白；
2. 情侣回忆问答；
3. 接爱心解锁；
4. 情侣照片配对；
5. 刮刮卡揭晓；
6. 约会转盘；
7. 吹/点蜡烛生日惊喜；
8. 拍立得回忆墙；
9. 点击烟花；
10. 新版可配置爱情树。

## 第一梯队：优先评估的 12 个项目

| 项目 | 可借鉴的体验 | 当前本地化现状 | 许可证 | 改造成本 |
| --- | --- | --- | --- | --- |
| [love-letter-website](https://github.com/qzydustin/love-letter-website) | 爱情树、飘心、打字情书、恋爱计时、本地音乐 | 双击可用：无第三方依赖，集中 `config.js` | [MIT](https://github.com/qzydustin/love-letter-website/blob/main/LICENSE) | 低 |
| [love-pages-by-Bonn](https://github.com/AndreaBonn/love-pages-by-Bonn) | Yes/No 问答、逃跑按钮、照片留言和彩纸 | 双击可用：零 CDN、分析和 Web Font | [MIT](https://github.com/AndreaBonn/love-pages-by-Bonn/blob/main/LICENSE) | 低 |
| [do-you-wanna-be-my-gf](https://github.com/javimelezzio/do-you-wanna-be-my-gf) | 拆信封、翻卡片、Yes 扩屏、打开情书 | 双击可用：纯 HTML/CSS/JS | [MIT](https://github.com/javimelezzio/do-you-wanna-be-my-gf/blob/main/LICENSE) | 低 |
| [Valentines-Day-Quiz](https://github.com/ViktorHadzhiyanev/Valentines-Day-Quiz) | “你有多了解我/我们”回忆测验，答对庆祝 | 需本地化：把 canvas-confetti 保存到作品目录 | [MIT](https://github.com/ViktorHadzhiyanev/Valentines-Day-Quiz/blob/main/LICENSE) | 低 |
| [ValantineGift](https://github.com/benfooster/ValantineGift) | 接住掉落爱心，爱意槽满后解锁问题 | 需本地化：补音乐并保存字体 | [MIT](https://github.com/benfooster/ValantineGift/blob/main/LICENSE) | 低/中 |
| [happybirthday-asnah](https://github.com/HadeedJalani/happybirthday-asnah) | 火漆信封、情书、吹蜡烛、烟花气球、留言 | 点击后备可双击；麦克风模式需 B 级本地服务 | [MIT](https://github.com/HadeedJalani/happybirthday-asnah/blob/main/LICENSE) | 中 |
| [canvas-scratch-card](https://github.com/5SSS/canvas-scratch-card) | 刮开礼物、约会地点、照片或一句话 | 需打包：组件改成浏览器发布包后可达 A 级 | [MIT](https://github.com/5SSS/canvas-scratch-card/blob/master/LICENSE) | 中 |
| [Vanilla-JavaScript-Memory-Card-Game](https://github.com/ahmedknasr-dev/Vanilla-JavaScript-Memory-Card-Game) | 用情侣照片做翻牌配对，完成后揭晓 | 双击可用：纯原生、零外链 | [MIT](https://github.com/ahmedknasr-dev/Vanilla-JavaScript-Memory-Card-Game/blob/main/LICENSE) | 低/中 |
| [spin-wheel](https://github.com/CrazyTim/spin-wheel) | “今晚吃什么”“约会去哪”“爱的奖励”转盘 | 双击可用：已有 IIFE 发布包，零运行时依赖 | [MIT](https://github.com/CrazyTim/spin-wheel/blob/main/LICENSE.md) | 低 |
| [js-fireworks](https://github.com/PixxxeL/js-fireworks) | 自动烟花背景与告白结尾庆祝 | 双击可用：单 Canvas 脚本 | [MIT](https://github.com/PixxxeL/js-fireworks/blob/master/LICENSE) | 低 |
| [js-growing-tree](https://github.com/w3labkr/js-growing-tree) | 用名字或纪念日作种子，生成确定性成长树 | 双击可用：Canvas、零依赖 | [MIT](https://github.com/w3labkr/js-growing-tree/blob/master/LICENSE) | 低 |
| [LoveDiary-Timeline](https://github.com/MoLeft/LoveDiary-Timeline) | 密码入口、恋爱秒表、照片时间线与选择互动 | 需本地服务和资源本地化，可改成 B 级 | [MIT](https://github.com/MoLeft/LoveDiary-Timeline/blob/main/LICENSE) | 中 |

### 推荐判断

- **直接进入原型评估**：`love-pages-by-Bonn`、`do-you-wanna-be-my-gf`、照片配对、`spin-wheel`；
- **只提取组件**：刮刮卡、烟花、成长树；
- **重写数据层**：回忆问答、时间线和拍立得画廊，统一改用本地 `config.js`；
- **不要重复引入第二套旧 LoveTree**：先把现有 LoveTree 保留为历史版，再单独设计可配置的现代版。

## 第二梯队：许可明确的候选

| 项目 | 互动机制 | 当前障碍 | 许可证 | 成本 |
| --- | --- | --- | --- | --- |
| [Ask-out-your-Valentine](https://github.com/CodeKageHQ/Ask-out-your-Valentine) | 连点 No 换 GIF/台词并放大 Yes，最终心形彩纸 | Tailwind 与 confetti 走 CDN | [MIT](https://github.com/CodeKageHQ/Ask-out-your-Valentine/blob/main/LICENSE) | 低 |
| [Will-you-be-my-Valentine-](https://github.com/ivysone/Will-you-be-my-Valentine-) | 极简 Yes/No，No 换台词、Yes 变大 | GIF 与版本检查远程 | [MIT](https://github.com/ivysone/Will-you-be-my-Valentine-/blob/main/LICENSE) | 低 |
| [valentines_blossoming_flower](https://github.com/junayed-hasan/valentines_blossoming_flower) | 问答后进入夜间花朵绽放场景 | GIF 与字体远程 | [MIT](https://github.com/junayed-hasan/valentines_blossoming_flower/blob/main/LICENSE) | 中 |
| [valentine2026](https://github.com/ianjiteshan/valentine2026) | 三段问题、逃跑按钮、爱意计、最终庆祝 | 音乐与字体远程；已有 `config.js` | [MIT](https://github.com/ianjiteshan/valentine2026/blob/main/LICENSE) | 低 |
| [love-website-generator](https://github.com/Himanshuyadav23/love-website-generator) | 隐藏情话、回忆卡、亲吻计数和彩蛋 | 音乐、字体、纹理远程 | [MIT](https://github.com/Himanshuyadav23/love-website-generator/blob/main/LICENSE) | 低 |
| [Romantic-Proposal / major-p](https://github.com/major-p/Romantic-Proposal) | No 按鼠标位置逃跑，Yes 后原生彩纸 | 无明显运行障碍 | [MIT](https://github.com/major-p/Romantic-Proposal/blob/main/LICENSE) | 低 |
| [Romantic-Proposal / aniketmondal1210](https://github.com/aniketmondal1210/Romantic-Proposal) | 浮动爱心和逐字告白 | 功能较简单，适合组件参考 | [MIT](https://github.com/aniketmondal1210/Romantic-Proposal/blob/main/LICENSE) | 低 |
| [Valentines-Day / XMoose25X](https://github.com/XMoose25X/Valentines-Day) | CSS 蜜蜂、落心、URL 参数收件人与留言 | Google Font 远程；URL 会暴露文案 | [MIT](https://github.com/XMoose25X/Valentines-Day/blob/main/LICENSE) | 低 |
| [LoveLetterEffect](https://github.com/notpoiu/LoveLetterEffect) | 点击跳动爱心后展开 Markdown 情书 | `fetch` 文本，多项 CDN | [MIT](https://github.com/notpoiu/LoveLetterEffect/blob/main/LICENSE.md) | 中 |
| [ValentineWish](https://github.com/SandeepVashishtha/ValentineWish) | 分镜名字、照片、气球爱心，可重播 | `fetch` JSON、Babel 与 GSAP CDN | [Apache-2.0](https://github.com/SandeepVashishtha/ValentineWish/blob/main/LICENSE) | 中 |
| [Happy-Birthday / Harmann60](https://github.com/Harmann60/Happy-Birthday) | 生日主视觉、关系故事、照片/视频画廊 | 多项 UI 库和字体使用 CDN | [MIT](https://github.com/Harmann60/Happy-Birthday/blob/main/LICENSE) | 中 |
| [birthday-bliss](https://github.com/randillasith/birthday-bliss) | 倒计时、心跳、轮播、吹/点蜡烛、星夜祝愿 | 麦克风不能直接 `file://`；字体远程 | [MIT](https://github.com/randillasith/birthday-bliss/blob/main/LICENSE) | 中 |
| [Happy-Birthday / codertheashish](https://github.com/codertheashish/Happy-Birthday) | 开灯、气球、拉幕、逐段留言、回忆画廊 | 字体远程；注意 BSL 条款 | [BSL-1.0](https://github.com/codertheashish/Happy-Birthday/blob/main/LICENSE) | 低/中 |
| [love-anniversary](https://github.com/co-star/love-anniversary) | 经典爱心树、打字情书和恋爱计时 | 引用的 `love.mp3` 缺失 | [MIT](https://github.com/co-star/love-anniversary/blob/master/LICENSE) | 中 |
| [loveTimeline](https://github.com/yanhaijing/loveTimeline) | 爱心花园开场、计时、年份时间线和照片 | 失效分享脚本与较老布局 | [MIT](https://github.com/yanhaijing/loveTimeline/blob/gh-pages/LICENSE) | 中 |
| [polaroid-gallery](https://github.com/rymbau/polaroid-gallery) | 拍立得散落、聚焦、翻面看故事、前后导航 | XHR 读 `data.json` | [MIT](https://github.com/rymbau/polaroid-gallery/blob/master/LICENSE) | 低/中 |
| [headbreaker](https://github.com/flbulgarelli/headbreaker) | 用两人合照生成不规则拼图 | 需准备浏览器 bundle | [ISC](https://github.com/flbulgarelli/headbreaker/blob/master/LICENSE) | 中 |
| [wheelofdestiny](https://github.com/robgithub/wheelofdestiny) | 极简 Canvas 约会/任务/奖励转盘 | 示例可直接开，视觉较旧 | [MIT](https://github.com/robgithub/wheelofdestiny/blob/master/LICENSE) | 低 |
| [js-fireworks / calebephrem](https://github.com/calebephrem/js-fireworks) | 点击位置生成烟花 | 无明显运行障碍 | [MIT](https://github.com/calebephrem/js-fireworks/blob/main/LICENSE) | 低 |
| [fireworks-simulator](https://github.com/troyxun/fireworks-simulator) | 多烟花、声音、暂停、速度设置 | 字体、reset CSS 和部分音效远程 | [MIT](https://github.com/troyxun/fireworks-simulator/blob/main/LICENSE) | 中/高 |
| [floating.js](https://github.com/Haroenv/floating.js) | 给页面加入浮动爱心、花、文字或 emoji | ES Module，需构建或下载发布版 | [Apache-2.0](https://github.com/Haroenv/floating.js/blob/gh-pages/LICENSE) | 低 |
| [interactive-rose](https://github.com/ktortolini/interactive-rose) | 鼠标生成变化的数字玫瑰 | p5.js CDN、绝对资源路径 | [MIT](https://github.com/ktortolini/interactive-rose/blob/main/LICENSE) | 中 |
| [flowers](https://github.com/willlllllllllllllllllllllllllllllllliam/flowers) | 花朵/爱心生成艺术，文字影响动画 | p5.js CDN、`loadStrings` 本地文本 | [MIT](https://github.com/willlllllllllllllllllllllllllllllllliam/flowers/blob/main/LICENSE) | 中 |
| [anniversaryGift](https://github.com/softnchewy/anniversaryGift) | 密码、对话和关卡解锁的 Three.js 纪念游戏 | 旧 Webpack/node-sass 与远程素材 | [MIT](https://github.com/softnchewy/anniversaryGift/blob/master/LICENSE) | 高 |
| [Valentines-day-fun](https://github.com/chromaglow/Valentines-day-fun) | 日期解锁、首次/再次访问台词、NFC 触发 | Apps Script、ntfy、远程 URL | [MIT](https://github.com/chromaglow/Valentines-day-fun/blob/main/LICENSE) | 高，只借鉴状态机 |

## 无许可证：只借鉴创意

下列项目根目录没有正式许可证，不复制代码或素材：

- [celebration-template](https://github.com/Molo-luwa/celebration-template)：用单一 `data.js` 配置名字、留言、图片、密码、主题和浮动 emoji；
- [birthday-site](https://github.com/geniusinsanity/birthday-site)：3D 相册书、小游戏、烟花、主题切换和多语言；
- [foryoumylove.github.io](https://github.com/zayennn/foryoumylove.github.io)：密码入口、情书、歌单、便签和花朵画廊；
- [Love-Quest](https://github.com/SinghalAyushh/Love-Quest)：地图式五关小游戏，最终解锁情书和环形照片墙。

## 适合 A 级惊喜页的统一结构

```text
surprise-name/
├── index.html
├── config.js          # 名字、日期、文案、主题和功能开关
├── assets/
│   ├── images/
│   ├── audio/
│   └── fonts/
├── vendor/            # 第三方浏览器发布包及其许可证
├── README.md
└── LICENSES.md
```

A 级页面不要在运行时 `fetch()` 本地 JSON/Markdown；数据量不大时直接放在 `config.js`。B 级可以通过 localhost 读取本地数据，这不会造成上传。前端密码只是一道仪式感入口，查看源码仍能看到文案和资源，不能当作隐私保护。
