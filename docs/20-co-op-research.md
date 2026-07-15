# 双人合作类：开源项目与玩法调研

> 调研快照：2026-07-15。这里的“合作”包括同屏实时协作、轮流沟通、一起创作和共同完成关系练习。

## 最适合先做的合作玩法

| 优先级 | 作品方向 | 为什么适合 | 推荐实现 |
| --- | --- | --- | --- |
| P0 | 同机你画我猜 | 用户已明确想要；规则熟悉，Canvas 原型小 | 单设备轮流：看词 → 遮挡 → 绘画 → 对方输入答案 |
| P0 | 情侣卡牌 / 深度对话 | 无复杂物理，手机和桌面都适合 | 问题写入本地 JS，轮流抽卡，支持跳过 |
| P0 | 双人机关迷宫 | 能体现“必须一起”的价值 | WASD + 方向键，互相压机关开门 |
| P0 | 拆弹搭档 | 沟通本身就是玩法 | 单机分阶段遮挡，炸弹面板与规则手册分开 |
| P1 | 个人照片拼图 | 定制感强，双方可一起完成 | 本地图片，Canvas/DOM 拖拽拼片 |
| P1 | 双飞船搬炸弹 | 小而有物理趣味，现有 MIT 参考 | 同键盘，两人保持绳索张力 |
| P1 | 情侣厨房 | 分工天然有趣 | 原生 Canvas 小关卡；需要双设备时使用最小本地服务，不引入公网服务 |
| P1 | 双人屋顶平台 | 适合同屏短关卡 | 两套按键，双方都到终点才完成 |

## 你画我猜：本地版应怎样设计

网上多数 Pictionary 项目依赖 Node、Socket.IO、Firebase 或双设备房间。为了先验证核心规则，可以从 A 级热座版开始：

1. A 点击“准备”后看到题目；
2. A 点击“开始画”，题目立刻遮挡；
3. B 观察画布并在同一设备输入答案；
4. 答对或时间结束后显示结果；
5. A/B 交换，累计共同连胜或个人分数。

可参考 [Arp-G/pictionary](https://github.com/Arp-G/pictionary) 的 MIT 项目结构和 [simple-pict-frontend](https://github.com/thealice/simple-pict-frontend) 的 MIT Canvas 交互，但不应照搬不可替代的公网后端。为了让它更像合作游戏，可以采用“双方共同挑战十题”的共享连胜，而不是互相争分；随后再做 C 级局域网版，让一台设备画、另一台设备猜。

## 许可明确、值得评估的合作项目

| # | 候选与玩法 | 设备模式 | 当前技术形态 / 本地目标 | 许可证 / 来源 | 成本 |
| --- | --- | --- | --- | --- | --- |
| C01 | 双人推箱子：一人压机关，另一人推箱 | 同键盘，同时 | 纯客户端但依赖共享游戏壳；整理发布包后目标 A | MIT · [boxpush.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/boxpush.js) | 中 |
| C02 | 双人机关迷宫：压板、拉杆与各自出口 | 同键盘，同时 | 纯客户端、共享游戏壳；整理发布包后目标 A | MIT · [mazecoop.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/mazecoop.js) | 中 |
| C03 | 拆弹搭档：工程师看炸弹，专家读规则 | 单机轮流；双设备更佳 | 单机目标 A；局域网双设备目标 C | MIT · [defusebomb.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/defusebomb.js) | 中 |
| C04 | 双人塔防：共享金币、布塔、空袭和基地 | 同屏鼠标/键盘 | 客户端逻辑复杂、依赖共享壳；目标 A/B | MIT · [coopdefense.js](https://github.com/tridpt/TwoPlayerGames/blob/main/js/games/coopdefense.js) | 中/高 |
| C05 | 双飞船搬炸弹：两人夹住炸弹穿越洞穴 | 同键盘/手柄，同时 | Canvas + 原生 JS；目标 A | MIT · [js_thrustvector](https://github.com/pemmyz/js_thrustvector) | 低/中 |
| C06 | 双人屋顶平台：收集月亮、躲机器人 | 同键盘 | 纯 HTML/CSS/JS；目标 A | MIT · [game-pjmask](https://github.com/kai-linux/game-pjmask) | 低 |
| C07 | Space Huggers：2–4 人横版射击守复活点 | 同屏手柄 | 静态自研引擎；目标 A | GPL-3.0 · [SpaceHuggers](https://github.com/KilledByAPixel/SpaceHuggers) | 中 |
| C08 | Battle City 双坦克：一起守基地打敌军 | 同键盘 | Canvas；移除排行榜 API 后目标 A | `package.json` 为 ISC，无独立 LICENSE · [battle-city](https://github.com/don-kihotik/battle-city) | 中，先问授权/重写 |
| C09 | Tetrus：双人 P2P 合作消除方块 | 双设备 | WebRTC + WebSocket + Go；重做本地主机后目标 C | MIT · [tetrus](https://github.com/frustra/tetrus) | 高 |
| C10 | p5.party 合作谜题 | 双设备 | 当前依赖 p5.party 公网状态服务；需本地替代后目标 C | MIT · [p5.party_Co-Op_Puzzle](https://github.com/Yaoc105/p5.party_Co-Op_Puzzle) | 高 |
| C11 | Void Harvest：双人合作构筑并清怪 | 同机 | Three.js + Webpack；提供发布包与启动器后目标 B | MIT · [void-harvest-game](https://github.com/VictorZakharov/void-harvest-game) | 高 |
| C12 | 情侣问题卡：抽卡、跳过、展开话题 | 单设备轮流 | 已有 dist 与本地库；目标 A | MIT · [nivaboaz/CoupleCards](https://github.com/nivaboaz/CoupleCards) | 低/中 |
| C13 | 关系卡牌：认识彼此、讨论和共同回忆 | 单设备轮流 | 前端项目，核对素材并精简后目标 A/B | MIT · [michaelsboost/CoupleCards](https://github.com/michaelsboost/CoupleCards) | 中 |
| C14 | What We Carry：讨论家务与心理负担是谁承担 | 单设备共同填写 | 单文件 HTML、本地、无追踪；目标 A | MIT · [what-we-carry](https://github.com/PButters/what-we-carry) | 低 |
| C15 | 个人照片拼图：选择自己的照片一起拼 | 同屏鼠标/触屏 | HTML5 PWA，核对发布包后目标 A/B | MPL · [grrd01/Puzzle](https://github.com/grrd01/Puzzle) | 中 |
| C16 | 图像拼图组件：把照片直接转成拼片 | 同屏鼠标 | 旧 WebKit 方案，兼容性重测后目标 A | MPL-2.0 · [jqJigsawPuzzle](https://github.com/jfmdev/jqJigsawPuzzle) | 中 |

`C01–C04` 来自 [tridpt/TwoPlayerGames](https://github.com/tridpt/TwoPlayerGames)。该 MIT 仓库当前有 76 个游戏脚本；同机与 AI 玩法是纯客户端，Node/WebSocket 服务跨设备房间时可改造为 C 级本地主机层。单个游戏脚本依赖 `GameRegistry`、Canvas 上下文和共享 CSS，评估时应先跑整个客户端壳，不能把一个 JS 文件孤立复制后宣称可用。

## 许可不完整：只借鉴机制

| 候选 | 可借鉴之处 | 当前运行形态 | 原因 |
| --- | --- | --- | --- |
| [hawkerheroes](https://github.com/tthmok/hawkerheroes) | 双人厨房分工、做菜、端菜与冲刺 | Phaser 已本地化，可按 A 级运行 | 无源码许可证 |
| [safe-space](https://github.com/ebellbog/safe-space) | 两名卫星拦截陨石、共同守地球 | 旧 jQuery/本地库，可按 A 级运行 | 无许可证 |
| [panama-canal-game](https://github.com/BronzyPlum6390/panama-canal-game) | 压板、摇柄、双拉绳的平台解谜 | 经典脚本，可按 A 级运行 | 无许可证 |
| [Warren_Wars](https://github.com/RedMeatBoy/Warren_Wars) | 共享钱包、救倒地队友、生存波次 | ES Modules，适合 B 级启动 | 无许可证 |
| [2-Player-Co-op-Game](https://github.com/Ravi-Varman-S/2-Player-Co-op-Game) | 两角色分别控制、一起到目标 | Canvas 单脚本，可按 A 级运行 | 无许可证 |
| [Yellow and Blue](https://js13kgames.com/2022/games/yellow-and-blue) | 分离角色、躲危险、解机关后重逢 | 原版偏联机，改同键盘可达 A 级 | 仅 `package.json` 声明 MIT，无独立 LICENSE |
| [Back 2 Back](https://js13kgames.com/2019/games/back-2-back) | 两架战机背靠背防守 | 13KB 静态，可按 A 级运行 | README 明确无许可证 |
| [beambouncer](https://github.com/jamesbmayr/beambouncer) | 红蓝玩家分别挡对应光束 | Node + WebSocket；改本地主机后可达 C 级 | 无独立 LICENSE |
| [mismatched](https://github.com/yrus98/mismatched) | 两人合作绘画/匹配图画 | Node 服务端；改本地主机后可达 C 级 | 无许可证 |

## 合作类实现共性

### 同屏实时

- P1 用 `WASD`，P2 用方向键；
- 不要让浏览器滚动拦截方向键；
- 必须允许暂停与重新查看按键；
- 两人都到达目标才过关，避免一人包办。

### 单设备轮流与隐藏信息

统一使用交接遮挡流程：

```text
轮到 A → 点击“我准备好了” → 展示私密内容 →
点击“隐藏并交给 B” → B 点击准备 → 继续游戏
```

题目、炸弹规则、私密选择和答案都不应在遮挡页的 DOM 中直接露出；至少等用户确认后再渲染。

### 双设备

双设备同步通常需要本地服务、WebRTC 或 WebSocket，属于 C 级正式目标。优先把“启动主机 → 展示二维码 → 同一局域网加入”封装成稳定底座；公网房间只在确有异地游玩需求时作为可选增强。
