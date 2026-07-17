# 「为你引航」产品、视觉与实现规格

> 状态：已实现并验收
> 日期：2026-07-17
> 目标等级：A（直接双击 `index.html`）
> 主分类：双人合作
> 设备：单设备同屏，键盘或双人多点触控

实现验收见 [`31-lighthouse-passage-verification.md`](./31-lighthouse-passage-verification.md)。

## 1. Brainstorm 结论

仓库已经有热座创作、联合网格、局域网秘密问答和连续柔性牵引，但还没有“一个人掌握信息与通航许可，另一个人控制运动”的非对称合作。下一款采用创意池 C03“灯塔与小船”，作品名定为「为你引航」：灯塔玩家转动光束，显露暗礁、发现航标并点亮港口；小船玩家操舵、推进和减速，把船安全送回家。

同屏意味着两个人物理上都能看到整张页面，所以本作品不宣称密码学意义上的秘密隔离。合作来自两套互不替代的控制通道与规则 Gate：灯塔输入不能改变船，小船输入不能改变光；即使船手记住暗礁，未发现全部必要航标或港口当前没有受光也不能过关。

本轮不加入随机风浪、燃料、生命值、计时排名、音乐、联网、存档、角色皮肤、关卡编辑器或 AI。最小版本只保留一个核心：**一个人持续照路，一个人驾驶有惯性的船，通过三段原创夜航路线共同靠港**。

## 2. 玩家体验

### 2.1 首局流程

1. 页面显示灯塔、暗海、小船、隐藏暗礁、未点亮航标与右侧港口；
2. 点击“点亮海面”；
3. 灯塔玩家用 `A / D` 转动光束，小船玩家用方向键操舵、推进和减速；
4. 光束扫过暗礁时，暗礁在短时间内显露；扫过必要航标时，航标永久记为已发现；
5. 检查点航标必须先被灯光发现，再由船进入，才成为新的安全出生点；
6. 找齐航标后，灯塔持续照亮港口，小船低速、对准入口并稳定停泊约 `0.6s` 完成本幕；
7. 三幕完成后显示“灯光一直在，船也回来了”，可重新领航。

### 2.2 合作必要性

- 灯塔只接收旋转输入，负责显露、发现和最终通航许可；
- 小船只接收油门与舵输入，负责真实位置、速度和航向；
- 中性灯塔输入无法发现全部航标或持续照港；
- 中性小船输入无法进入检查点或港口；
- 第二幕的确定性可解轨迹必须包含灯塔回扫时小船继续向另一方向转弯的同一步双人输入；
- 完成条件同时依赖灯塔当前角度与小船位置、速度、朝向，不能由任一玩家单独伪造。

## 3. 状态与阶段

```text
ready
  └─ start → playing
playing
  ├─ pause / blur / hidden → paused
  ├─ reef / boundary → playing（回到最近检查点）
  ├─ stable harbor → level-complete
  └─ final stable harbor → game-complete
paused
  └─ resume → playing
level-complete
  └─ next → playing
game-complete
  └─ replay → playing（第一幕）
```

纯规则状态至少包含：

```text
phase, levelIndex, elapsed, stepCount, resetCount, pauseReason,
lighthouse = { angle, angularVelocity },
boat = { position, velocity, heading, rudder },
revealedUntil[reef], beaconsFound[beacon], checkpointIndex, goalHold
```

Canvas、DOM、图片对象、输入集合、渲染帧时间、accumulator、粒子和动画进度不得进入规则状态。

## 4. 世界与三幕

逻辑世界固定为 `960 × 540`。所有坐标、光束、碰撞、检查点和完成条件都使用该坐标系；Canvas 只按 CSS 尺寸与 DPR 投影。

| 幕 | 名称 | 主要教学 | 原创路线 |
| --- | --- | --- | --- |
| 1 | 第一束光 | 显露暗礁、发现航标、低速靠港 | 左下出发，宽缓弯道，一个必要航标和一个检查点 |
| 2 | 雾中转弯 | 灯塔提前扫描，小船延迟转向 | 左上到右下，两枚航标与三组礁石形成 S 路线 |
| 3 | 一起入港 | 连续换向与最终同步保持 | 三对错位礁石形成窄门，三枚航标后反向微调入港 |

关卡 schema：

```js
{
  id, title, hint,
  lighthouse: { position, initialAngle, beamRange, beamHalfAngle },
  boatStart: { position, heading },
  reefs: [{ id, x, y, radius }],
  beacons: [{ id, x, y, radius, required, checkpoint }],
  checkpoints: [{ position, heading }],
  harbor: { x, y, radius, heading, headingTolerance, lightTarget }
}
```

校验要求：

- 所有坐标、半径、角度和范围必须是有限值并位于世界内；
- reef 与 beacon ID 在本幕内唯一；
- 出生点、检查点和港口不能位于暗礁内；
- 每个检查点航标必须映射到一个检查点状态；
- 光束范围必须能覆盖全部必要航标和港口灯牌；
- 关卡与所有嵌套对象递归深冻结。

## 5. 确定性规则模型

### 5.1 固定时间步

- 规则步长为 `1 / 120s`；
- 浏览器每帧最多接收 `0.1s`；
- 单帧最多执行 12 个规则子步，丢弃额外积压；
- `stepGame(state, input)` 每次只推进一个固定步，不接收任意 `dt`；
- 测试使用同一生产 reducer，不依赖真实时钟或 Canvas。

### 5.2 灯塔

- `turn` 输入截断到 `[-1, 1]`；
- 使用角加速度、角阻尼和最大角速度；
- 角度始终规范化为 `[-π, π)`；
- 松手后短暂滑行并快速停稳；
- 灯塔位置固定，不能通过输入改变船或关卡对象。

### 5.3 小船

- `throttle` 与 `steer` 分别截断到 `[-1, 1]`；
- 推进力只沿船头方向作用，水阻确定性衰减速度；
- 速度有固定上限；
- rudder 平滑靠近输入，松开后回中；
- 转向率随航速变化，低速保留弱转向，避免检查点卡死；
- 不加入随机波浪、噪声或帧率相关扰动；
- 单步位移小于最小暗礁半径，圆形船体不会跨步穿隧。

### 5.4 光束、显露与发现

光束是有限半径扇形。目标圆命中需同时满足：

```text
distance <= beamRange + targetRadius
angleDifference <= beamHalfAngle + asin(min(1, targetRadius / distance))
```

命中暗礁时：

```js
revealedUntil[index] = elapsed + 2.2;
```

命中必要航标时将对应 `beaconsFound[index]` 设为 `true`。检查点航标必须满足“已经被灯光发现 + 小船进入航标半径”才更新 `checkpointIndex`。

`deriveVisibility(state)` 只从规则状态派生：

```js
{ reefs: boolean[], beacons: boolean[], harborLit: boolean }
```

渲染层不得重新判断角度或自行延长显露时间。

### 5.5 危险与检查点

船体圆与任一暗礁圆相交，或船心越过带船体半径的世界边界时：

- `resetCount += 1`；
- 船回到最近检查点的位置和朝向；
- 速度、rudder 与 `goalHold` 清零；
- 灯塔角度、航标发现和暗礁显露计时保留；
- phase 仍为 `playing`。

保留灯塔刚完成的扫描，能避免一次触礁同时否定两名玩家的全部进展；检查点仍决定船从哪里重新出发。

### 5.6 靠港 Gate

完成本幕必须连续满足：

```text
全部 required beacon 已发现
AND 港口灯牌当前位于光束内
AND 小船中心位于 harbor.radius 内
AND 小船速度 <= 16 px/s
AND 船头与 harbor.heading 的最短角差 <= 16°
```

条件累计保持 `0.6s` 才完成；任一条件失效立即清零 `goalHold`。高速掠过、只照港口、只找齐航标、船进港但朝向错误、船停稳后灯塔移开都不能过关。

## 6. 输入、暂停与可访问性

### 6.1 键盘

- 灯塔：`A / D` 逆时针/顺时针旋转；
- 小船：`ArrowUp` 推进、`ArrowDown` 减速/倒车、`ArrowLeft / ArrowRight` 操舵；
- playing 时阻止这些键滚动页面；
- `blur`、`visibilitychange`、暂停、重开、过关和重玩全部清空输入；
- 同一通道相反方向同时按下时结果归零。

### 6.2 触屏

- 灯塔两枚旋转按钮与小船四向舵分别支持独立 `pointerId`；
- `pointerdown` 后捕获，`pointerup`、`pointercancel`、`lostpointercapture` 都释放；
- 390px 保持两组控制并排，灯塔按钮不小于 64px，小船按钮不小于 52px；
- 320px 改为纵向，不为强行并排而缩小触控目标；
- 长按按钮使用 `aria-pressed` 表达当前输入状态。

### 6.3 无障碍与 reduced motion

- Canvas 提供幕名、灯塔角度、船坐标/航向、已发现航标和当前显露暗礁的文本替代；
- 只播报首次发现航标、检查点、触礁、暂停、完成，不逐帧播报；
- 暗礁除明暗外增加高对比泡沫边缘，港口使用双灯与轮廓，不只依赖颜色；
- `prefers-reduced-motion` 下关闭雾漂移、港灯呼吸、浪花脉冲和光束补间；规则位置、即时显露、碰撞与完成仍正常。

## 7. 冻结视觉规格

### 7.1 概念与生产资产

- 桌面概念：[`docs/assets/lighthouse-passage/desktop-concept.png`](./assets/lighthouse-passage/desktop-concept.png)，`1586 × 992`；
- 移动概念：[`docs/assets/lighthouse-passage/mobile-concept.png`](./assets/lighthouse-passage/mobile-concept.png)，`853 × 1844`；
- 图集源稿：[`docs/assets/lighthouse-passage/sprite-atlas-source.png`](./assets/lighthouse-passage/sprite-atlas-source.png)，`4 × 3` 洋红背景；
- 生产背景：`experiences/co-op/lighthouse-passage/assets/playfield-background.png`；
- 生产图集：`experiences/co-op/lighthouse-passage/assets/sprite-atlas.png`，RGBA。

以上概念和资产由本项目于 2026-07-17 使用 OpenAI 内置图像生成工具创建。图集通过技能自带 `remove_chroma_key.py` 与临时 `uv run --with pillow` 去除洋红背景；Pillow 不是仓库安装或作品运行依赖。

### 7.2 设计系统

- 世界：午夜靛蓝海图，不是紫色夜空或黑色仪表盘；
- 主文字：羊皮纸金 `#ead6aa`；次文字：灰金 `#b9a67e`；
- 灯光：暖灯金 `#f5d477`；小船：朱红 `#a9422e`；控制面：深海绿 `#173b3a`；
- 边框：旧黄铜 `#9d7637`；危险礁石：蓝黑 `#1e2929` 配白色泡沫边；
- 标题使用系统宋体栈，控制和状态使用系统无衬线，键位使用等宽字体；
- 桌面为安静顶栏、单一宽海图与底部开放领航台，不增加卡片网格、导航或眉题；
- 移动端依次为标题/幕数、完整 16:9 海图、主动作、航标状态、非对称双控制与三枚工具按钮；
- 光束由 Canvas 按规则角度绘制，因为它是动态状态投影；灯塔、船、礁石、航标、港口、检查点、浪花、雾和完成火花来自本地图集。

### 7.3 首屏文案锁

首屏只允许以下可见文本；阶段文案按同一位置替换：

```text
为你引航
第 1 幕 / 3 · 第一束光
你照亮前路，我把船开回家。
点亮海面
灯塔
A / D 旋转光束
航标 0 / 1
小船
方向键 操舵
暂停
重来
玩法
```

后续主动作只使用“继续领航”“下一段海程”“重新领航”。禁止添加英文眉题、A 级标签、隐私徽章、得分、计时、距离、风速、额外导航或解释卡。

### 7.4 图集布局

`4 × 3` 顺序：

| 灯塔 | 小船 | 暗礁 | 未亮航标 |
| --- | --- | --- | --- |
| 已亮航标 | 港口 | 检查点水纹 | 碰撞浪花 |
| 船尾水纹 | 雾块 A | 雾块 B | 完成信号光 |

Canvas 用固定源矩形取图。船体旋转以图集中心为原点；礁石、航标和港口的碰撞圆来自关卡数据，不从透明像素反推规则。

## 8. 文件与实现计划

```text
experiences/co-op/lighthouse-passage/
├── index.html
├── styles.css
├── levels.js
├── logic.js
├── logic.test.js
├── app.js
├── README.md
└── assets/
    ├── playfield-background.png
    └── sprite-atlas.png
```

实施顺序：

1. `levels.js`：三幕原创几何、schema、深冻结；
2. `logic.js`：固定步、灯塔、小船、光束、显露、检查点、碰撞和完成 Gate；
3. `logic.test.js`：规则不变量、角色必要性与三幕生产 reducer 可解轨迹；
4. `index.html / styles.css`：按冻结概念实现完整 DOM、响应式控制和对话框；
5. `app.js`：Canvas 图集、输入、accumulator、可访问文本和暂停生命周期；
6. catalog、根 portal fallback、分类 README、文档索引和目录测试接入；
7. 自动检查、Chrome 三幕实玩、桌面/移动视觉比对；
8. 每个复现缺陷写入 `bugs/`，稳定结论写入 `learn/`，完成后独立提交。

第一版仍在作品目录内保留固定步和向量实现。虽然“同心牵引”也使用 `1/120s`，但两款运动模型与碰撞语义不同；等验收后只提取已经证明一致的浏览器 accumulator 或输入清理协议，不提前制造通用物理引擎。

## 9. 借鉴与来源边界

本作品的情侣语义、玩法组合、关卡、状态机、控制、文案和视觉由本仓库自行设计。开发前进行了以下技术比较，全部固定版本并按“只借机制、不引运行时”处理：

| 来源 | 固定版本与许可证 | 本作借鉴/未采用边界 |
| --- | --- | --- |
| [Matter.js](https://github.com/liabru/matter-js/tree/8a67787735585f02c4b46eabf7b9fcc1c7c321da) | `0.20.0` / `8a677877`；[MIT，Liam Brummitt and contributors](https://github.com/liabru/matter-js/blob/8a67787735585f02c4b46eabf7b9fcc1c7c321da/LICENSE) | 只比较空气阻尼、力和角速度概念；不引库、不复制积分代码或示例素材 |
| [rot.js](https://github.com/ondras/rot.js/tree/46782e248c2db9d379a5e4f13bb8323f18dff04b) | `2.2.1` / `46782e2`；[BSD-3-Clause，Ondrej Zara](https://github.com/ondras/rot.js/blob/46782e248c2db9d379a5e4f13bb8323f18dff04b/license.txt) | 只比较“范围与遮挡产生可见性”的纯函数边界；不移植格网阴影投射 |
| [boardgame.io](https://github.com/boardgameio/boardgame.io/tree/2945c30e536517cf819e000f33d9d08bacaac297) | `0.50.2` / `2945c30`；[MIT，The boardgame.io Authors](https://github.com/boardgameio/boardgame.io/blob/2945c30e536517cf819e000f33d9d08bacaac297/LICENSE) | 只比较按角色投影视图的架构；同屏不声称秘密隔离，不引 Redux/Socket.IO/Koa 运行时 |
| [trylock/visibility](https://github.com/trylock/visibility/tree/71eb5c00692713abd870113f3efc943322486d8e) | `71eb5c0`；[MIT，Copyright 2017 trylock](https://github.com/trylock/visibility/blob/71eb5c00692713abd870113f3efc943322486d8e/LICENSE) | 只比较角度排序与射线可见性问题；本作使用更小的圆形目标扇形命中函数，不复制 C++ 实现 |

浏览器光束绘制直接使用标准 Canvas 2D `save / translate / rotate / clip / restore` API，不复制规范示例。调研还排除了无许可证的 lighthouse/asymmetric-puzzle 仓库，不复制其代码或表达。

`mwa/seaworthy` 代码仓库虽为 MIT，但 README 列出的音乐采用 CC BY-NC；本作没有复制其航行模型、Godot 代码、Kenney 素材、音效或音乐。这一排除项保留在规格中，用于防止未来因“代码 MIT”误判整个作品均可自由再分发。

## 10. 自动与浏览器验收

### 10.1 规则测试

- 三幕 schema、唯一 ID、出生/检查点/港口几何与深冻结；
- 非法半径、越界、重复 ID、出生落礁和光束不可达被拒绝；
- 初始状态深冻结且不共享关卡引用；
- 灯塔/船输入截断、互不串扰；
- 不同渲染帧分组下固定步结果一致；
- 角速度、角阻尼、跨 `π` 规范化正确；
- 推进、倒车、水阻、速度上限、rudder 回中和低速转向正确；
- 光束中心、擦边、范围边界和跨 `π` 命中正确；
- 暗礁显露 `2.2s`、重复照射延长、航标发现与检查点门控正确；
- 碰礁/越界回最近检查点并清理船运动，不清除灯塔发现进度；
- 靠港五项条件缺任一项都不完成，中断立即清零保持；
- 三幕都有生产 reducer 可解轨迹，且中性任一角色都无法完成；
- 暂停、恢复、重开、下一幕、最终重玩与畸形状态保持不变量。

### 10.2 A 级边界

- 只使用相对 CSS、经典脚本和两张本地运行图片；
- 无 ES module、`fetch`、XHR、WebSocket、CDN、远程字体、Service Worker 或浏览器存储；
- 根 catalog、内置 fallback、分类 README、文档索引与目录测试同步；
- `npm test`、`npm run verify`、作品 JavaScript `node --check` 与 `git diff --check` 通过。

### 10.3 Chrome

- 两套实际键盘输入完成三幕，至少一幕验证双方同一时段输入；
- 触屏灯塔与小船由不同 pointer 同时长按并正确释放；
- 暂停冻结运动，恢复、重开、玩法、下一幕和最终重玩有效；
- 1586×992、390×844 与 320×700 无横向溢出，390px 控制目标满足尺寸；
- 页面失焦/隐藏自动暂停和清空输入；
- reduced-motion 不破坏规则；
- warning/error 为 0，资源清单只有本地文件；
- 最终桌面与移动截图和冻结概念同批 `view_image`，记录文案、布局、排版、色彩、资产、容器、响应式与动效 fidelity ledger。
