# 把月亮拨回那一天

一个无第三方运行依赖的 A 级单人惊喜页。体验者根据三条私人线索，校准月份、日期和八档离线近似月相；三项同时对齐后，页面才把结尾留言创建到 DOM 中。

## 直接打开

双击本目录的 `index.html` 即可使用。页面支持 `file://`，不需要联网、安装依赖或启动服务器；鼠标、触摸、触控笔和键盘都能完成校准。

## 准备自己的版本

编辑 `config.js`：

- `targetDate`：纪念日，格式为 `YYYY-MM-DD`；
- `recipientName`、`finalTitle`、`finalMessage`：解锁后出现的本地留言；
- `clues`：恰好三条、不直接泄露答案的线索；
- `composeClues(context)`：可选的 5–10 行私人线索策略。返回三条有效线索时覆盖 `clues`，返回 `null` 或抛错时安全使用基础线索。

示例配置是演示内容。你的日期、线索和留言会以本机明文保存在 `config.js`，不是加密，也不会由页面上传；把整个目录发给别人时，对方可以查看这些文本。

## 规则与边界

- 月相按固定 UTC 基准和平均朔望月换算成八档，适合纪念日谜题，不是精密天文、观测或航海工具；
- 开场阶段不创建线索节点，校准前不创建结尾留言节点；
- 图片加载失败时退回 CSS 月面，核心规则和结尾仍可完成；
- 配置不合法时整份回退到内置演示配置，避免出现“答案来自一份配置、文案来自另一份配置”的混合状态。

## 本地验证

在仓库根目录运行：

```bash
node --test experiences/surprises/moon-phase-secret/logic.test.js
npm test
npm run verify
```

## 借鉴与来源声明

- [NASA Science：Moon Phases](https://science.nasa.gov/moon/moon-phases/)：八相顺序与约 29.5 天周期；
- [NASA RP 1349](https://eclipse.gsfc.nasa.gov/TYPE/moonphase.html)：2000-01-06 18:15 UTC 新月基准；
- [NASA/TP–2008–214170](https://ntrs.nasa.gov/api/citations/20080040150/downloads/20080040150.pdf)：平均朔望月 29.53059 天；
- [USNO Moon Phases](https://aa.usno.navy.mil/data/MoonPhases)：调研时用于抽样核对；
- 调研对照了 BSD 许可的 [`mourner/suncalc@bbc91f6`](https://github.com/mourner/suncalc/tree/bbc91f689ede3ff7173011947d435b3fb6c0485d)，但本作没有复制、改写、运行或打包其源码，仅据此确认无需为八档谜题引入完整天文库；
- `assets/moon-surface.png` 由 Codex 内置 OpenAI ImageGen 生成，完整提示词摘要与回退说明见 `assets/ATTRIBUTION.md`。

日期状态机、八相近似、角度量化、配置策略、中文文案、DOM、CSS 与测试均为本仓库原创实现。
