# 「心动拔河」验收记录

验收日期：2026-07-17。验收对象为 A 级同屏实时对抗作品 `experiences/versus/ribbon-tug/`。

## 1. 自动检查

| 检查 | 结果 |
| --- | --- |
| 作品逻辑与目录定向测试 | 23 / 23 通过，其中作品纯逻辑 17 / 17 |
| 仓库全量 `npm test` | 123 / 123 通过 |
| `npm run verify` | 通过；14 个作品入口、相对资源与借鉴声明完整 |
| 全仓库 JavaScript `node --check` | 通过 |
| `git diff --check` | 通过 |

纯逻辑覆盖初始态、倒计时、同帧净脉冲、60Hz/120Hz 等价回中、追赶步不重复施力、左右胜局、三局两胜、暂停/恢复、畸形输入与 A/L repeat/held 分类。

## 2. A 级直开边界

入口只使用相对 `styles.css`、`logic.js`、`app.js`，脚本均为经典脚本；作品源码不含 ES Modules、`fetch`、XHR、WebSocket、CDN、远程字体、Service Worker、localStorage、IndexedDB 或 Cache API。HTML、样式、逻辑和控制器均在作品目录内，根 verifier 能从入口解析到全部本地文件，因此作品不依赖 setup/start 或统一运行时。

本轮 Chrome 控制接口的 URL 安全策略拒绝访问 `file://`，并禁止通过其他浏览器接口绕过；因此不能把“自动浏览器实际打开 file URL”列为通过项。真实交互与视觉改在仓库现有 `http://localhost:4173` 静态服务上验证，A 级直开能力由经典脚本、相对资源、禁用网络 API 扫描和目录完整性共同证明。这个限制属于验收工具边界，不改变作品代码或启动等级。

## 3. Chrome 真实交互

使用 Chrome 扩展控制真实页面完成以下流程：

1. 点击“开始比赛”，2.4 秒倒计时后进入 `playing`；
2. 连续按 A 键完成左侧胜局，meter 到 `-100`，比分变为 `1 : 0`；
3. 使用右侧触控按钮完成第二局，比分变为 `1 : 1`；
4. 连续按 L 键完成决胜局，右侧以 `2 : 1` 进入 `match-end`；
5. 点击“重新比赛”后位置、比分和局号回到初始态；
6. 在 meter 为 `-33` 时主动暂停，等待 900ms 后仍为 `-33`；继续时先进入 1.2 秒保护倒计时；
7. reduced-motion 下两个交互 transition 计算时长均为 `0.00001s`，一次左侧触控仍把 meter 推到 `-6`；
8. 游戏页与门户控制台均无 warning 或 error。

Chrome 抽象层创建的另一标签没有让被控页进入 `hidden`，CDP 版本也不提供 `Emulation.setPageVisibilityOverride`，所以无法在这套控制协议中制造真实 `visibilitychange(hidden)`。该路径仍由 `pauseMatch()` 纯逻辑测试和控制器的 `visibilitychange`/`blur` 清理代码覆盖，但不把它误写成已完成的实机标签切换验证。

## 4. 响应式与坐标

| 视口 | 结果 |
| --- | --- |
| 1269×830 桌面 | `innerWidth = scrollWidth`；完整标题、比分、双场地、织带和控制区都在首屏内 |
| 390×844 触屏 | `innerWidth = scrollWidth = 390`；两个拉力按钮各 179×100px；整页高度 844px；无按钮裁切 |
| 320×700 窄屏 | `innerWidth = scrollWidth = 320`；两个拉力按钮各 147×92px；无按钮裁切；页面可纵向滚动至 817px |

首轮桌面截图发现规则已经胜出时，织带结与终点针仍有约 42px 偏差。修复后左、右胜局在桌面、390px 与 320px 的中心差均为 `0px`。详细根因与方案见 [`bugs/2026-07-17-ribbon-tug-finish-marker-drift.md`](../bugs/2026-07-17-ribbon-tug-finish-marker-drift.md)。

## 5. 视觉忠实度

最终页面按 [`21-ribbon-tug-spec.md`](./21-ribbon-tug-spec.md) 逐项核对：

1. **色彩**：钴蓝左场、杏橙右场、薄荷背景、奶油黄状态板和布料白织带与令牌一致；
2. **排版**：粗黑中文标题只出现一次，比分与键位使用等宽字体，层级不复用既有暖纸衬线界面；
3. **空间语义**：移动端仍保留横向两名玩家和同一条织带，没有改成上下两张卡片；
4. **视觉签名**：缝线织带、布结与裁缝针式终点承担唯一装饰重点；
5. **状态反馈**：倒计时、拉动、暂停、局胜和赛果共用同一开放赛场，不新增弹窗、奖杯或粒子；
6. **控制层级**：A/L 大按钮分居两端，开始/暂停居中；禁用态、焦点、按压态和文字提示不只依赖颜色；
7. **减少动态效果**：动效被压缩后位置、胜负与全部操作仍保持完整。

可见文案与规格一致。实现只增加返回体验库和两行本地/公平说明，帮助直开用户退出与理解长按规则；没有昵称、难度、排行榜、设置、分享或关系评价。不存在需要保留的实质视觉偏差。

## 6. 截图与资源

桌面 idle、桌面左右胜局、390×844 idle/胜局和 320×700 窄屏均使用 Chrome 页面截图能力捕获，并在会话中逐张查看；截图不作为运行资产提交。临时 CDP 设备指标和 reduced-motion 模拟在结束前恢复，验收标签页已关闭。

页面 DOM 资源为本机 `styles.css`、`logic.js`、`app.js`。资源树中的 `chrome-extension://.../cursor-chat.png` 由验收扩展注入，不属于作品依赖；作品没有公网请求。

## 7. 借鉴与沉淀

作品 README 已固定 [TwoPlayerGames `542c57a`](https://github.com/tridpt/TwoPlayerGames/tree/542c57a778bbf843eb2cb121e99d0b050d8c866e) 与 MIT LICENSE，并明确声明只借鉴 A/L 拔河、回中和多局机制，没有复制上游代码、Canvas、常量、DOM、CSS、翻译、音效或素材。

本轮可复用的“规范化规则坐标只映射到一套 CSS 旅行范围”经验已记录在 [`learn/2026-07-17-normalized-game-coordinate-mapping.md`](../learn/2026-07-17-normalized-game-coordinate-mapping.md)。
