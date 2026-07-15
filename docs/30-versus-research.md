# 双人对抗类：开源项目与玩法调研

> 调研快照：2026-07-15。同一台设备上的同时操作或热座轮流适合 A 级；局域网双设备属于 C 级正式方向；公网房间仅在异地游玩时考虑。

## 建议首批顺序

1. **反应力对决**：代码量小，30 秒就能理解；
2. **键盘拔河**：两个人同时操作，气氛最好；
3. **记忆翻牌对抗**：兼顾触屏和情侣照片换皮；
4. **点格棋**：规则简单但比井字棋更耐玩；
5. **四子棋**：移动端与桌面都适合；
6. **Pong**：建立共享 Canvas 游戏循环的样板；
7. **Hangman 情侣暗号版**：定制成本低；
8. **囚徒困境**：有情侣话题感，但需要可靠的遮挡交接。

## `TwoPlayerGames` 中适合提取的 24 个玩法

以下均来自 MIT 仓库 [tridpt/TwoPlayerGames](https://github.com/tridpt/TwoPlayerGames)。同机模式使用纯客户端代码；达到 A 级前仍需移除 Google Fonts、PWA 注册等非核心外链。单个游戏脚本依赖仓库共享壳，不是独立 HTML。

| # | 玩法 | 交互方式 | 离线目标 | 来源 | 成本 |
| --- | --- | --- | --- | --- | --- |
| V01 | 井字棋，可换成双方头像 | 轮流点击 | A | [tictactoe.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/tictactoe.js) | 低 |
| V02 | 终极井字棋：落子决定对手下个棋盘 | 轮流点击 | A | [ultimatettt.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/ultimatettt.js) | 中 |
| V03 | 四子棋 | 轮流点击 | A | [connectfour.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/connectfour.js) | 低 |
| V04 | 黑白棋 / Reversi | 轮流点击 | A | [reversi.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/reversi.js) | 低/中 |
| V05 | 五子棋 15×15 | 轮流点击 | A | [gomoku.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/gomoku.js) | 低 |
| V06 | 点格棋：补边、闭合方格并继续行动 | 轮流点击 | A | [dotsandboxes.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/dotsandboxes.js) | 低 |
| V07 | Nim 取石子 | 轮流点击 | A | [nim.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/nim.js) | 低 |
| V08 | Hex 连边棋 | 轮流点击 | A | [hex.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/hex.js) | 低/中 |
| V09 | Mancala / 播棋 | 轮流点击 | A | [mancala.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/mancala.js) | 中 |
| V10 | 西洋跳棋 | 轮流点击 | A | [checkers.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/checkers.js) | 中 |
| V11 | 激光棋：旋转镜面击中核心 | 轮流点击 | A | [laserchess.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/laserchess.js) | 中 |
| V12 | Pentago：落子后旋转一个象限 | 轮流点击 | A | [pentago.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/pentago.js) | 中 |
| V13 | Pong | 同键盘同时操作 | A | [pong.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/pong.js) | 中 |
| V14 | 迷你台球，含物理与道具 | 轮流瞄准 | A | [poolbattle.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/poolbattle.js) | 高 |
| V15 | 弹弓对战：拉拽、风向和爆炸物 | 轮流瞄准 | A | [slingshotbattle.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/slingshotbattle.js) | 中/高 |
| V16 | 炮兵坦克：角度、力度和风向 | 轮流瞄准 | A | [artillery.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/artillery.js) | 中/高 |
| V17 | 反应力：见绿灯抢按，抢跑判输 | P1 `A`、P2 `L` | A | [reactionduel.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/reactionduel.js) | 低 |
| V18 | 键盘拔河：双方狂按把绳结拉过线 | P1 `A`、P2 `L` | A | [tugofwar.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/tugofwar.js) | 低 |
| V19 | 双人打字竞速 | 两个输入区同时输入 | A | [typingrace.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/typingrace.js) | 低/中 |
| V20 | 骗子骰：叫点和质疑 | 热座隐藏骰子 | A，需遮挡页 | [liarsdice.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/liarsdice.js) | 中 |
| V21 | Mastermind 式破解颜色密码 | 热座隐藏密码 | A，需遮挡页 | [codebreakerduel.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/codebreakerduel.js) | 中 |
| V22 | 囚徒困境：秘密选合作或背叛 | 热座秘密选择 | A，需遮挡页 | [prisonersdilemma.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/prisonersdilemma.js) | 中 |
| V23 | 双人 Blackjack，比谁接近 21 | 热座隐藏手牌 | A，需遮挡页 | [blackjackduel.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/blackjackduel.js) | 中 |
| V24 | Hangman：一人出情侣暗号，一人猜 | 热座交接 | A，需遮挡页 | [hangman.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/hangman.js) | 低/中 |

另外可参考其 [memory.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/memory.js) 做情侣照片翻牌对抗。

## 独立项目候选

这些项目不依赖上述共享壳，更适合单独评估：

| 候选 | 玩法与设备 | 当前技术形态 / 本地目标 | 许可证 | 建议 |
| --- | --- | --- | --- | --- |
| [connect-four](https://github.com/bryanbraun/connect-four) | 四子棋，单设备轮流 | 原生 HTML/CSS/JS；目标 A | MIT | P0，可作为独立棋类样板 |
| [ping-pong-game](https://github.com/ramazancetinkaya/ping-pong-game) | 双人 Pong，同键盘 | 三个主要前端文件；目标 A | MIT | P0，核对音效后评估 |
| [tanks-game](https://github.com/niccolofanton/tanks-game) | 双人坦克，反弹子弹和随机场地 | 原生 Canvas；目标 A | MIT | P1，较新的独立实现 |
| [battle-spaceship-game](https://github.com/XDream-Dev/battle-spaceship-game) | 双飞船射击，同键盘 | HTML + 本地资源；目标 A | Apache-2.0 | P1，保留 NOTICE/版权说明 |
| [DWWM_bomberman-project](https://github.com/bdebot-dev/DWWM_bomberman-project) | 双人 Bomberman | HTML/CSS/JS；目标 A | GPL-3.0 | P2，GPL 边界单独保留 |
| [siege-wars](https://github.com/raaaahman/siege-wars) | 中世纪回合战棋 | Webpack 构建；提供发布包与启动器后目标 B | MIT | P2，体量偏大 |
| [battleships](https://github.com/kubowania/battleships) | 海战棋；原版含电脑对手 | 纯 JS；改热座后目标 A | MIT | 需改成热座并加入遮挡 |
| [html-quiz](https://github.com/google/html-quiz) | 两队轮流答题、抢答和计分 | 独立 HTML/JS/CSS；目标 A | Apache-2.0 代码 + CC BY 题材 | 适合改成“关于我们”的双人问答 |
| [Games-2VS](https://github.com/bocaletto-luca/Games-2VS) | 两人对抗小游戏集合 | HTML/CSS/JS；目标 A | GPL-3.0 | 适合盘点玩法，不宜整包混入 |
| [Pong-Two-Player](https://github.com/bocaletto-luca/Pong-Two-Player) | 本地双人 Pong | A | GPL-3.0 | 可作第二实现对照 |
| [Connect-Four-Two-Player](https://github.com/bocaletto-luca/Connect-Four-Two-Player) | 本地四子棋 | A | GPL-3.0 | 优先选 MIT 独立实现 |
| [Guess-the-pair-two-player](https://github.com/bocaletto-luca/Guess-the-pair-two-player) | 两人轮流翻牌抢配对 | A | GPL-3.0 | 可参考计分节奏 |
| [hangman-two-player](https://github.com/bocaletto-luca/hangman-two-player) | 一人出词、一人猜 | A | GPL-3.0 | 可参考热座流程 |

## 适合情侣化的换皮方式

换皮不应改变核心规则，只替换内容表达：

- 棋子：双方头像、昵称首字母或两种代表色；
- Hangman：共同经历、旅行地点、口头禅和电影；
- 翻牌：同一回忆的两张相关图片，而非普通图标；
- 问答：双方分别准备题库，避免只有一个人能一直答；
- Pong/拔河：使用中性、有趣的胜负反馈，不增加羞辱性惩罚；
- 赛后：允许“再来一局”，可选保存本次比分到 `localStorage`，但默认不做长期排行榜。

## 对抗类实现 Gate

- 同时操作游戏必须处理按键按下/抬起状态，不能只监听单次 `keydown`；
- 屏蔽方向键导致的页面滚动，并提供暂停；
- 轮流游戏必须明确当前玩家；
- 隐藏信息使用交接遮挡页，不把答案长期显示在 DOM；
- 触屏游戏需给双方留下足够大的独立操作区域；
- 第一版不加 AI、公网匹配、自动刷新或账号系统；明确需要双设备时可以采用 C 级局域网房间。
