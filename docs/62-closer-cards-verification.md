# 「靠近一点」验收记录

> 验收日期：2026-07-18；规格提交：`c1a9bcd`；功能提交：`d33f18d`。

## 1. 结论

「靠近一点」已作为第 24 个无第三方运行依赖的 A 级作品接入门户。真实 `file://` 入口完成了卡背、翻卡、双席回答、三个公开阶段换卡、六张共同完成、重开、奇数处理次数首发复位、响应式、reduced motion、控制台和本地资源验收。

运行页不接收答案，没有输入框、录音、存储、账户或联网代码；卡背 accessibility snapshot 与 DOM 只包含“问题尚未显示”，当前题目在翻卡后才进入页面。24 条问题、状态机和视觉均为本仓库原创，开源边界见作品 [`README.md`](../experiences/co-op/closer-cards/README.md) 与 [`assets/ATTRIBUTION.md`](../experiences/co-op/closer-cards/assets/ATTRIBUTION.md)。

## 2. 自动检查

| 检查 | 结果 |
| --- | --- |
| `node --test experiences/co-op/closer-cards/logic.test.js` | 12 / 12 通过 |
| `npm test` | 390 / 390 通过 |
| `npm run verify` | 32 个作品入口、1 个能力声明通过 |
| `git diff --check` | 通过 |

定向测试覆盖：

- 24 张原创问题、三个主题各 8 张、唯一 ID 和长度 Gate；
- 整份配置回退、名字清洗、深冻结和本机开场策略；
- 24 张唯一计划、前六三主题覆盖、同主题最多二连；
- intro → card-back → first-speaking → second-speaking → settle → complete；
- 三个公开阶段的中性换卡、六张完成、牌库耗尽与畸形状态恢复；
- 奇数次完成/跳过后重开仍恢复配置首发席。

目录 Gate 额外确认：经典脚本可直接 `file://` 加载；无远程 URL、模块脚本、输入控件、存储/网络/媒体 API、`Math.random`、CSS gradient 或 `innerHTML`；问题文本不预埋在 HTML 或 `app.js`；借鉴声明与本地生成式资产齐全。

## 3. 浏览器方法与环境

- 首选应用内浏览器与 Chrome 扩展通道均按技能要求尝试；当前运行时报告无可用浏览器，且故障文档查找到了不同插件版本目录，详见 [`bugs/2026-07-18-browser-plugin-version-drift.md`](../bugs/2026-07-18-browser-plugin-version-drift.md)；
- 回退方法：`playwright-cli` headed Chromium；CLI 初始 `open file://` 被协议白名单拦截后，在同一受控页面用 `page.goto(file://...)` 真实导航；
- 入口：`file:///Users/zenith/Desktop/two-of-us/experiences/co-op/closer-cards/index.html`；
- 桌面原生概念尺寸：1504×1046；
- 手机验证尺寸：390×844；
- 窄屏 Gate：320×760。

浏览器请求面板只有以下六个本地资源，均为 200：`index.html`、`styles.css`、`config.js`、`logic.js`、`app.js`、`assets/midnight-paper.png`。控制台 0 error / 0 warning。

## 4. 实玩路径

| 路径 | 证据与结果 |
| --- | --- |
| intro → card-back | 进度从 `0 / 6` 到 `1 / 6`；snapshot 只有“等两个人都准备好”，没有当前题目 |
| 翻卡 → 第一席 | 主题、问题和“A 席先说”同时出现；主按钮为“我说完了” |
| 第一席 → 第二席 | 席位状态和主按钮切换，问题保持不变 |
| 第二席 → settle | 双方都显示“都已说完”，主按钮变为“收好这张” |
| first-speaking 换卡 | 不增加完成数，下一张首发换席 |
| second-speaking 换卡 | 不增加完成数，下一张首发换席 |
| settle 换卡 | 未收好的卡不计完成，下一张首发换席 |
| 完成六张 | 六点全部完成，显示“六张话，都被认真接住了”，只保留“再聊六张” |
| 先换三张再完成六张后重开 | 修复前错误变成 B 席首发；修复后重新开始明确显示“A 席先说” |
| 门户直开 | 根门户显示第 32 个体验“靠近一点”，链接解析为本地 `file://` 入口 |

## 5. 隐私与阶段 DOM

- 静态 HTML 和 `app.js` 不含题库代表句；题库只在 `logic.js`；
- 卡背 snapshot 的 article 名称是“第 1 张卡背，问题尚未显示”，没有隐藏题目节点、data 属性或可访问文本；
- 页面没有 `input`、`textarea`、麦克风或答案变量，回答只在现实空间里说出；
- 完成页只保留完成/跳过的卡 ID，状态中没有答案、录音或自由文本；
- 刷新创建新 intro，不使用任何持久存储恢复旧会话；
- 换卡没有扣分、失败色、原因输入或关系评价。

## 6. 响应式与可访问性

| 视口 / 能力 | 结果 |
| --- | --- |
| 1504×1046 | `scrollWidth = clientWidth`；标题、左轨、整卡、两级动作与隐私说明都在首屏 |
| 390×844 | `scrollWidth = clientWidth = 390`；页面高约 881px，可短距离自然滚动；主按钮 358×60px，换卡 120×48px |
| 320×760 | `scrollWidth = clientWidth = 320`；主按钮 288×60px，换卡 120×48px，全部动作可滚动到达 |
| reduced motion | `.prompt-card` 计算过渡时长为 `0.000001s`，规则推进不等待动画 |
| 焦点 | 每次合法阶段推进后焦点落到新的主动作；换卡保持稳定主次顺序 |
| 语义 | 原生 link/button、H1/H2、会话 rail、进度 list、当前席文字与 live region 均可在 snapshot 读取 |

## 7. 视觉概念与运行截图

- [桌面概念 1504×1046](assets/closer-cards/concept-desktop.png)；
- [手机概念 853×1844](assets/closer-cards/concept-mobile.png)；
- [桌面运行截图 1504×1046](assets/closer-cards/implementation-desktop-1504x1046.png)；
- [手机运行截图 390×844](assets/closer-cards/implementation-mobile-390x844.png)。

运行截图由 headed Chromium 直接截取 `file://` 页面；概念图只作视觉规格，运行页没有裁切或加载概念图。

## 8. 保真账本

| 比较点 | 概念证据 | 运行证据 / 处理 |
| --- | --- | --- |
| 28/72 主构图 | 左侧席位轨，右侧唯一大卡 | 保留不对称双列；中间没有题库网格或额外面板 |
| 午夜靛蓝背景 | 深靛蓝低对比纸纹 | 使用 `#171a2b` 与独立无字 `midnight-paper.png`，没有渐变或光斑 |
| 暖纸问题卡 | 小圆角、细内边、低阴影 | `#f2e9d7`、12px 圆角、双细边和低投影；尺寸与概念同级 |
| 字体层级 | 文学感 serif 标题/问题，克制 sans 控件 | 标题/问题使用本机中文 serif；状态与控制保持较小字阶，问题仍是唯一文字焦点 |
| 双席轨道 | A/B 与六个点由朱红细线联系 | 桌面竖轨、手机横轨都保持同一语义；当前席用文字、实心点和颜色三重表达 |
| 动作层级 | 朱红主按钮 + 文字换卡 | 保留单一大主动作与 48px 次动作；没有胶囊和多余图标 |
| 移动顺序 | 标题、横轨、纸卡、动作、隐私 | 390px 同顺序完整实现，卡片缩短以让按钮和隐私在 844px 附近可见 |
| 纹理与 UI 边界 | 概念卡纸有细纹 | 只生成深色背景资产；暖纸卡用代码原生纯色，避免把文字或边框烘焙进图片 |

有意偏差：概念手机图包含操作系统状态栏，运行页不伪造系统 chrome；概念图是 853×1844 输出，真实手机证据用 390×844 CSS 像素；运行版手机卡高略短，目的是保留 60px 主按钮、48px 换卡和隐私说明的真实触控预算。其余构图、色值、字阶、纸卡、轨道和动作层级达到 agency-signoff faithful。

## 9. 发现并修复的问题

- 非法配置整份回退后，UI 仍可能执行原对象的合法策略函数：统一先 `sanitizeConfig(rawConfig)`，此后状态与策略只读同一份结果；
- 奇数次处理卡后重开会继承轮换后的席位：按 `cursor` 奇偶反推出原始首发；
- 900px 左右窄桌面仍可能挤压双列：响应式切换点提前到 980px；
- 连续快速点击主按钮可能穿过多个谈话阶段：加入 650ms 主动作节流，不影响换卡；
- 应用内浏览器/Chrome 插件版本漂移：仓库不修改外部插件，以 headed Chromium 完成可复现回退验收。

对应项目 bug 与通用经验已写入 `bugs/` 和 `learn/`。
