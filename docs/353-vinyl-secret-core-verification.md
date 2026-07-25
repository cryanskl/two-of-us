# vinyl-secret 非视觉核心复核

- 日期：2026-07-25
- 分支：`codex/exp-vinyl-secret-core-audit`
- 审计基线：`b039503a852cbbe86f6fe24f606a516fdbd3323d`
- 原核心提交：`687d2d9`、`bd1844a`、`241dcdd`、`9a03de5`
- 原设计提交：`0f778fe`
- 本轮修复：`9d84e95`、`5aa910e`
- 范围：research / brainstorm / spec / plan / design proposal、概念资产、
  config、纯领域逻辑、测试与来源声明
- 浏览器：N/A；当前没有生产 HTML、app、CSS、媒体元素或 `file://` 入口

## 1. 结论

本轮发现并修复两个真实缺口：

1. 被撤销的 Proxy 作为 `tracks` 时，`Array.isArray()` 会逃出配置快照的异常
   边界，破坏 `sanitizeConfig()` 的整份原子回退；
2. `ATTRIBUTION.md` 漏列冻结规格要求的 WCAG 2.2 和计划要求的 Chrome/WebKit
   autoplay 一手边界，来源清单不完整。

两项分别独立提交，并有回归测试与 bug 记录：

- [`bugs/vinyl-secret-revoked-track-array.md`](../bugs/vinyl-secret-revoked-track-array.md)
- [`bugs/vinyl-secret-attribution-source-coverage.md`](../bugs/vinyl-secret-attribution-source-coverage.md)
- [`learn/proxy-brand-checks-need-try-boundaries.md`](../learn/proxy-brand-checks-need-try-boundaries.md)

除此之外，没有发现需要修改三轨规则、秘密投影、默认配置、token 状态机、概念
资产或依赖边界的真实缺口。当前非视觉核心可供后续 UI 阶段使用，但**仍不是可玩
作品**，不得加入 catalog 或标记 installed。

## 2. 默认无音频合同

默认 `config.js` 与 `logic.DEFAULT_CONFIG` 均满足：

```text
tracks.length = 3
targetGroove = 3 / 7 / 11
audioSrc = null / null / null
audio files = 0
media API calls = 0
```

当前生产目录没有：

- `<audio>`、`HTMLAudioElement`、`new Audio()` 或 Web Audio；
- MP3、WAV、OGG、封面、字体、纹理、favicon 或其他媒体资产；
- `fetch`、XHR、Beacon、storage、录音、麦克风、timer、DOM 或网络调用。

三轨默认静音路线仍完整通过：

```text
intro
→ START
→ MOVE 3 / DROP_NEEDLE / SETTLE_TRACK
→ NEXT
→ MOVE 7 / DROP_NEEDLE / SETTLE_TRACK
→ NEXT
→ MOVE 11 / DROP_NEEDLE / SETTLE_TRACK
→ complete
```

三次 `playing` view 的 `audioSrc` 都是 `null`；完成只取决于
`foundTrackIds` 成为三轨 ID 的完整有序前缀，不依赖音频、动画或媒体事件。

## 3. 秘密 phase 隐私

使用含唯一 clue、note、audio 和 final sentinel 的合法配置复核公开投影：

| phase | 允许公开 | 明确不公开 |
| --- | --- | --- |
| `intro` | 固定标题、说明、开始动作 | 所有配置秘密 |
| `seeking` | 当前 clue、cursor、派生 signal | target、note、audio、未来 clue、final |
| `playing` | 当前 clue/note、当前可选 audio、pending token | target、未来轨道、final |
| `track-result` | 当前 clue/note、found 数 | 当前 audio、未来轨道、final |
| `complete` | recipient、final、三条已找到 note | 所有 target 和 audio path |

`getViewModel()` 每阶段使用精确 key 集并递归冻结；NEXT 后上一轨 note 不再存在于
seeking view，track-result 明确把 `audioSrc` 投影为 `null`，complete 不含任一
音频路径或目标圈。

这里验证的是**纯 view model Gate**。DOM/ARIA/data/style/media `src/currentSrc`
的 presence/absence 仍需生产 UI 完成后用浏览器 sentinel Oracle 证明，本阶段不能
把逻辑隐私冒充 DOM 隐私。

## 4. 状态机与确定性

- 12×12 共 144 组信号组合全部由整数绝对距离决定；
- 信号固定为 `quiet / warm / near / clear`，不读取音频；
- 错误落针只增加 notice，不推进轨道；
- 正确落针先进入 `playing`，不会提前追加 found；
- 只有精确 pending token 能结算；四种 settle reason 得到深相等状态；
- restart 保留 `lastToken`，新局 token 单调增加，旧回调不能污染；
- complete 除 RESTART 外封闭；
- action/state/config 均使用精确普通对象、data descriptor 和安全整数边界；
- sparse、数组子类、symbol、accessor、异常 Proxy 与已撤销 Proxy 都会安全拒绝
  或按配置合同原子回退。

逻辑不读取时间、随机、CSS、媒体或 DOM，因此相同 state/action/config 得到相同
冻结结果。

## 5. 机制去重

`vinyl-secret` 的机制核心仍是“一维 12 档校准 + 四级距离文字信号 + 显式落针
提交 + 三轨按序逐步公开”，与已安装作品边界清楚：

| 对照作品 | 已有核心 | `vinyl-secret` 的差异 |
| --- | --- | --- |
| `hand-crank-music-box` | 连续手摇、齿进度、合成音色 | 不累计旋转或逐齿作曲；只在离散圈位主动落针判定 |
| `starlight-keepsake-search` | 二维移动并在目标上连续驻留 | 一维 range，无二维热点、dwell 或自由坐标 |
| `moon-phase-secret` | 三轴事实校准与提交 | 单一沟槽索引和距离信号，不判断日期知识 |
| `star-code-unlock` | 从图形集合点选私人密码 | 不点秘密热点；目标藏在连续编号的一维沟槽 |
| `echo-arena` / `four-hands-harmony` / `rhythm-relay` | 双人记忆、同步或节奏 | 单人异步接收惊喜；声音不参与规则、评分或时序 |

生产目录静态检索没有其他作品的角色、规则、默认文案或资产引用；UMD/CommonJS
双出口与纯 reducer 是仓库内部工程约定，不是外部开源借鉴。

## 6. 来源、版权与零复制

2026-07-25 重新核对以下一手来源：

- [Library of Congress: The Gramophone](https://www.loc.gov/collections/emile-berliner/articles-and-essays/gramophone/)
- [WHATWG HTML: Media elements](https://html.spec.whatwg.org/multipage/media.html)
- [W3C APG: Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WebKit autoplay policy](https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/)
- [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay)
- [U.S. Copyright Office: Circular 56](https://www.copyright.gov/circs/circ56.pdf)

WHATWG、W3C 与美国版权局原始地址可直接读取；Library of Congress 详情页对本次
命令行直连返回 403，但其官方 collection 索引与当前搜索结果仍明确列出该详情页。
这属于站点自动访问策略，不是项目运行 bug，也没有因此复制或缓存其内容。

本项目没有查看、选择、下载、vendoring 或复制任何第三方开源仓库实现，所以没有
第三方 commit、tag、许可证正文或 NOTICE 需要随当前代码归档。`ATTRIBUTION.md`
明确记录：

- 标准与史料只用于事实、浏览器和可访问性边界；
- 没有复制其代码、界面、文案、图形、音频或素材；
- 当前代码、三轨规则和默认文案为本仓库独立实现；
- 用户自备音频需分别确认词曲权、录音/表演权、参与者同意与分发范围；
- 音频许可不自动覆盖封面、照片、字体或纹理；
- 若未来参考开源项目，必须先记录固定 commit/tag、许可证、版权人和借用范围。

## 7. 设计资产边界

已用原尺寸检查两张现有概念图，SHA-256 与设计台账一致：

| 概念 | 尺寸 | SHA-256 |
| --- | --- | --- |
| desktop seeking | `1537×1023` | `c0f16b83610f550de7dc143ef4012933f263adc1b15d86efe649b2fa11025d82` |
| mobile complete | `853×1844` | `8d2e7e260bf823c7efb52cc892749df50189be59705240b0fbd98e51c771d53f` |

两张 PNG 只存在于 `docs/assets/`，生产目录没有引用；它们不作为槽数、文案、
phase、隐私或可访问性 Oracle。本轮没有调用 ImageGen、没有创建或修改生产
视觉，也没有修改 launcher、catalog、Board、shared、README 或根依赖。

设计提案仍标记“等待用户确认”；本审计不改变其接受状态。

## 8. 验证结果

定向：

```text
node --check config.js / logic.js / logic.test.js
node --test experiences/surprises/vinyl-secret/logic.test.js
tests 38
pass 38
fail 0
```

统一依赖：

```text
npm ci
added 55 packages
audited 56 packages
found 0 vulnerabilities
```

全仓：

```text
npm test
tests 2273
pass 2273
fail 0
```

仓库合同：

```text
npm run verify
仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。
```

`git diff --check` 通过。入口数保持 58，因为本项目尚未 installed。

## 9. 尚未通过的 Gate

- 用户对 `docs/320` 视觉提案的明确确认；
- 生产 `index.html`、`styles.css`、`app.js`、README 与 favicon；
- 一个无 src 的原生 audio、用户激活内播放、generation 与媒体清理；
- DOM/ARIA/data/style/src 的秘密 presence/absence；
- 鼠标、触摸、键盘、逐圈按钮、焦点与 live region；
- 320/390/768/1280/1440/1504、低高度横屏、200%/400%；
- reduced motion、forced colors、CSS/JS/favicon/audio 故障降级；
- Chrome 与 Safari 的真实 `file://` 静音通关和可选音频软失败；
- README、catalog、门户、分类索引、Board 与 installed 集成。

这些 Gate 不能由非视觉核心测试或概念 PNG 替代。
