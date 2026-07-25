# A 级“把秘密藏进这一圈”调研

- 日期：2026-07-25
- 工作 ID：`vinyl-secret`
- 创意来源：[`40-idea-backlog.md`](./40-idea-backlog.md) 的 S14“黑胶寻声”
- 目标目录：`experiences/surprises/vinyl-secret/`
- 目标等级：A，单人接收惊喜，经典脚本与相对资源，`file://` 直接打开
- 本文状态：调研结论；不创建生产目录、不修改 catalog

## 1. 先给结论

这个候选可以做成真正的 A 级本地作品，但不能把“成功播放一首本地歌”设为通关条件。冻结方向是：

> 接收者拖动唱臂在 12 圈沟槽间寻轨，依据“寂静 / 微响 / 靠近 / 清晰”四级文字信号主动落针；命中三段按顺序出现的秘密沟槽后，逐段揭开内页短句，最后打开一张代码原生唱片封套。每次命中可以播放一段准备者自行提供、权利清楚的本地音频；没有音频、音频损坏、格式不支持或播放被浏览器拒绝时，文字与完成流程完全不变。

首版应使用一个原生 `HTMLAudioElement`，不使用 Web Audio、不使用共享 `tone-player`、不增加根依赖。默认仓库不附带歌曲或录音，三个音频字段均为 `null`；因此刚克隆的作品本身就是完整、安静、可通关的惊喜。

## 2. 为什么它仍然算“黑胶寻声”

美国国会图书馆对早期圆盘留声机的说明指出，圆盘的沟槽壁承载声音振动，沟槽会把落入其中的唱针连同唱臂带过唱片表面；圆盘中央则留有标题、表演者与编号等标签空间。这里可借鉴的是三层物理语义：

1. 唱针必须先移动到某圈，再“落下”；
2. 不同径向位置对应不同沟槽；
3. 中央标签和外部封套可承载揭晓信息。

本作不模拟真实转速、连续声槽、针压、左右声道、机械磨损或精确唱臂几何。`12` 是游戏档位，不宣称现实黑胶只有 12 圈；“信号强弱”也是寻轨反馈，不是声学测量。

一手资料：

- [Library of Congress: The Gramophone](https://www.loc.gov/collections/emile-berliner/articles-and-essays/gramophone/)
- [Library of Congress: A Recorded Sound Timeline](https://www.loc.gov/programs/national-recording-preservation-plan/tools-and-resources/historical-background/timeline/)

## 3. 与仓库现有作品的机制边界

| 现有作品 | 权威机制 | `vinyl-secret` 必须保持的差异 |
| --- | --- | --- |
| `hand-crank-music-box` | 持续顺时针手摇；每 32 齿推进音符与纸景线性进度；原创振荡器音色 | 不累计旋转、不逐齿作曲；在 12 个离散径向位置寻找目标，只有主动“落针”才判定 |
| `starlight-keepsake-search` | 在二维地图自由移动光心，并在五个固定空间目标上连续停留 | 不做二维寻物、不使用 dwell；只有一维范围控件与一次按钮确认 |
| `moon-phase-secret` | 调月、日、月相三轴并提交三项事实答案 | 不校准日期或知识答案；每轨只有距离信号，没有三项并列正确性 |
| `star-code-unlock` | 按私人线索选择正确星星 | 不在一组图形中点击秘密热点；目标藏在一维沟槽索引中 |
| `echo-arena` / `four-hands-harmony` / `rhythm-relay` | 双人记忆、同步或节奏挑战，声音参与规则 | 单人惊喜、无计分、无节拍判定；音频永不参与规则 |
| `i-heard-you` | 本地录音与语音转写能力路线 | 不请求麦克风、不录音、不转写、不上传 |

因此，首局身份不是“换皮寻物”，而是一个可穷举但有线索的 **一维校准 + 主动提交** 小谜题。四级信号可以让接收者逐圈缩小范围，错误落针没有惩罚。

## 4. `file://`、相对音频与播放策略

### 4.1 相对路径能解析，不等于一定能播放

WHATWG HTML Standard 规定：没有 `<base href>` 时，文档基准 URL 回退到文档自己的 URL。因而从
`file:///…/vinyl-secret/index.html` 打开时，`./assets/private-audio/one.mp3` 会按当前目录解析。

但 A 级合同只能承诺：

- 页面、经典脚本、CSS 与默认无音频路线可直接打开；
- 相对音频路径不会依赖 HTTP 服务；
- 浏览器仍可能因文件不存在、资源不可读、编解码不支持或播放策略而拒绝播放。

一手资料：

- [WHATWG HTML: Document base URLs](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#document-base-urls)
- [WHATWG HTML: Media elements](https://html.spec.whatwg.org/multipage/media.html)

### 4.2 不自动播放

播放只发生在用户明确点击“落下唱针”的同一事件处理栈内，并且只在本次落针已经命中时：

1. reducer 同步返回新状态；
2. app 从刚解锁的公开投影取得可选 `audioSrc`；
3. 更新同一个 `<audio preload="none">` 的 `src`；
4. 立即调用 `play()`，并处理返回 Promise 的成功与失败。

WHATWG 允许用户代理只在页面具有瞬时用户激活时播放媒体；不允许播放时 `play()` 会以 `NotAllowedError` 拒绝，不支持资源时可用 `NotSupportedError` 拒绝。WebKit 也建议假设音频需要点击，并建议顺序播放多个资源时复用同一个媒体元素。Chrome 的策略同样把点击或轻触视为有声播放的重要许可条件。

本作不依赖仍处于 Working Draft 的 `navigator.getAutoplayPolicy()`；它只以 `play()` Promise 和媒体事件作为事实来源。

一手资料：

- [WHATWG HTML: `HTMLMediaElement.play()`](https://html.spec.whatwg.org/multipage/media.html#dom-media-play)
- [W3C: Autoplay Policy Detection Working Draft](https://www.w3.org/TR/autoplay-detection/)
- [WebKit: Auto-Play Policy Changes for macOS](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)
- [Chrome for Developers: Autoplay policy in Chrome](https://developer.chrome.com/blog/autoplay)

### 4.3 音频失败必须是软失败

`play()` 被拒绝、`error` 事件、超时、切后台或页面卸载时：

- 立即停止等待，显示“这段声音没有播放，文字已经为你留下”；
- 不回滚已找到轨道，不阻塞 `NEXT`，不改变完成条件；
- `pause()` 后移除 `src` 并 `load()`，释放资源；
- 不自动重试，不在下一次点击偷播上一次音频；
- 提供“停止声音”按钮；不需要等待音频结束才能继续。

播放状态是 app 层瞬态，不能写入权威游戏状态；逻辑层只知道“第几轨已解锁”。

## 5. 无音频路线与隐私

默认配置的三轨 `audioSrc` 都是 `null`。每条轨道都必须同时拥有：

- 一条寻轨线索；
- 一段命中后揭开的文字；
- 可选的本地音频相对路径。

因此无音频时仍有完整节奏：读线索 → 调唱针 → 落针 → 展开内页 → 下一轨 → 打开封套。

隐私边界：

- 不使用 `fetch`、XHR、Beacon、CDN、远程字体、分析、存储、录音、麦克风或文件选择器；
- 默认不读取用户目录；仅当准备者手工填写相对路径时才尝试加载作品目录内的那个文件；
- 未解锁轨道的正文和音频路径不得进入公开 view model、DOM、ARIA、`data-*` 或 CSS 变量；
- 但 `config.js` 本质是本地明文，查看源文件的人仍能读到秘密；README 必须明确这不是加密或访问控制；
- `file://` 下不建立跨页面持久状态，刷新即重置。

## 6. 输入与可访问性

唱臂控制采用原生：

```html
<input type="range" min="1" max="12" step="1">
```

CSS 唱臂只镜像它的值，不自造 slider 角色。WAI-ARIA APG 的 slider 模式约定方向键逐步调整、Home/End 到端点；若数值本身不够友好，应提供可理解的 `aria-valuetext`。原生 range 已承载基础键盘行为，app 只同步“第 7 圈，共 12 圈”一类文本。

冻结要求：

- 鼠标、触摸、笔可拖 range；方向键逐圈；Home/End 到外圈/内圈；
- 另有两个至少 `48 × 48 CSS px` 的“向外一圈 / 向内一圈”按钮，避免拖动成为唯一方式；
- “落下唱针”“继续听下一面”“停止声音”“重新开始”都是原生按钮；
- 四级信号同时用文字和视觉表现，不只靠颜色或音量；
- 拖动不触发 live region；只有开始、错误落针、正确解锁、音频失败与完成才用礼貌状态播报；
- `prefers-reduced-motion: reduce` 时唱片不旋转、唱臂不补间、封套立即展开，规则与时序 token 不变；
- 强制颜色模式仍能看见焦点、唱臂位置、按钮和当前信号；
- 窄屏纵向重排，不要求横向滚动。

相关一手规范：

- [W3C WAI-ARIA APG: Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)：2.3.3 交互动画、2.5.7 拖动替代、2.5.8 目标尺寸、4.1.3 状态消息

## 7. 资产、版权与借鉴声明

### 7.1 音乐与录音不是同一份权利

美国版权局明确区分：

- musical work：作曲与歌词；
- sound recording：某一次被固定下来的表演与制作录音。

准备者即使自行翻唱，也不自动取得底层词曲的全部使用权；下载或购买一份音频也不等于取得复制、改编或分发许可。若作品要提交到仓库或对外分发，必须同时确认所需的词曲权与录音权，或使用明确覆盖该用途的许可。私人语音也要取得录音中其他人的同意。

一手资料：

- [U.S. Copyright Office: Circular 56, Sound Recordings](https://www.copyright.gov/circs/circ56.pdf)
- [U.S. Copyright Office: Musical Compositions and Sound Recordings](https://www.copyright.gov/register/pa-sr.html)

### 7.2 封面、字体和纹理逐项独立

- 唱片封面、插画、照片、唱片标签和纹理属于独立视觉素材，不能因为音频获准就一并复用；
- 字体软件与字形许可另行核查；首版只用系统字体栈；
- 首版封套、标签、沟槽、纸张颗粒全部用自写 HTML/CSS 生成，不临摹具体专辑封面、唱片公司 logo 或商标式标签；
- 若以后加入图片、生成纹理或字体文件，`ATTRIBUTION.md` 必须记录作者/权利主体、来源 URL、固定版本或生成方式、许可、修改和用途。

一手资料：

- [U.S. Copyright Office: Copyright Basics, Circular 1](https://copyright.gov/circs/circ01.pdf)
- [U.S. Copyright Office: Visual Art & Copyright](https://www.copyright.gov/engage/docs/visual_art.pdf)

### 7.3 开源借鉴声明

本调研没有选用或审阅任何第三方开源仓库，不复制第三方代码、CSS、文案、封面、纹理或音频，因此没有需要固定 commit/tag/license 的代码借鉴项。实现依据只有公开 Web 标准、浏览器厂商政策、博物馆/图书馆史料和版权机构资料。

未来若开发阶段引入开源参考，必须在写代码前冻结：

```text
项目与仓库 URL
精确 commit 或 tag
许可证与权利主体
借了什么（机制、算法、代码、素材）
没有借什么
修改与归档位置
```

不能只写“灵感来自某项目”，也不能用仓库主页 `main` 代替固定版本。

## 8. 风险判断

| 风险 | 概率 / 影响 | 处理 |
| --- | --- | --- |
| 有声 autoplay 被拒 | 高 / 中 | 只在命中落针的 click 中调用 `play()`；catch；文字路线不受影响 |
| 本地音频缺失或格式不支持 | 中 / 中 | 默认 `null`；`error` 软失败；验收至少测 MP3 与不存在文件 |
| 用户误以为买了歌即可提交 | 中 / 高 | README 与 ATTRIBUTION 分开列词曲权、录音权、素材权 |
| 变成音乐盒换皮 | 中 / 高 | 禁止连续转动、齿轮进度和逐音作曲；冻结 12 档寻轨 + 落针 |
| 变成星光寻物换皮 | 中 / 高 | 一维 slider、无二维坐标、无 dwell、一次显式提交 |
| 声音泄露私人信息 | 中 / 高 | 默认不附音频；未解锁不公开路径；强调 config 非加密 |
| 动画眩晕 | 低 / 中 | reduced-motion 完全停转，立即过渡 |
| range 对部分触屏辅助技术不友好 | 中 / 中 | 原生 range + 两个逐圈按钮 + 落针按钮；真机辅助技术验收 |

## 9. 调研 Gate

进入规格阶段前，以下决策视为冻结：

1. 分类唯一：单人准备、另一人接收的惊喜；
2. A 级 `file://`，零服务、零公网、零新根依赖；
3. 核心机制：12 圈一维寻轨 + 四级文字信号 + 主动落针；
4. 三轨按顺序解锁，错误无惩罚；
5. 默认无音频仍完整；音频不参与正确性、推进或完成；
6. 只复用一个原生 `<audio preload="none">`，不使用 Web Audio；
7. 默认视觉全部代码原生，系统字体，无第三方运行资产；
8. 不使用开源项目参考；若后来新增，必须固定版本与许可并写借鉴边界；
9. 不增加分享、存储、上传、录音、歌词同步、波形编辑、转速模拟、计分或倒计时。
