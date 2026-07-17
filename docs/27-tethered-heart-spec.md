# 「同心牵引」产品与实现规格

> 状态：已实现并验收
> 日期：2026-07-17  
> 目标等级：A（直接双击 `index.html`）  
> 主分类：双人合作  
> 设备：单设备同屏，键盘或双人多点触控

## 1. Brainstorm 结论

仓库已经有热座创作、网格机关和局域网双设备合作，但还没有连续运动、柔性约束与共享载荷。下一款合作体验选择创意池 C01“牵线越障”，命名为「同心牵引」：珊瑚与青色玩家分别控制一枚线轴，两条丝带始终牵着同一颗布艺心，在针脚与软垫之间把它送进刺绣绷。

这不是两个人各自到终点，而是两个人持续改变同一个对象。任一玩家拖得过快、走位相反或让吊坠碰到危险针脚，都会影响共同结果；只有两人把载荷、线长和速度一起稳定下来才能完成。

本轮不加入音乐、随机地图、生命值、排行榜、存档、联网、手柄、夹取/放下、燃料或通用关卡编辑器。最小版本只保留一个核心：**两端牵引一个有惯性的共享吊坠穿过三幕原创障碍**。

## 2. 玩家体验

### 2.1 首局流程

1. 打开页面看到两枚线轴、两条丝带、共享吊坠与右侧刺绣绷；
2. 点击“开始牵引”；
3. 珊瑚玩家用 `W/A/S/D`，青色玩家用方向键；移动端使用两组四向方向盘；
4. 两人绕开软垫和危险针脚，把吊坠送进刺绣绷；
5. 吊坠进入绷框且两条线同时回到安全张力，保持约 0.45 秒完成本幕；
6. 三幕完成后显示“这一针，我们一起穿过了”，可重新游玩。

### 2.2 合作必要性

- 两枚线轴分别受两套输入控制，任一套输入都不能代替另一套；
- 吊坠同时受两条弹性丝带牵引，单边拖拽会形成偏转和高张力；
- 终点要求吊坠在绷框内、两枚线轴靠近收束区且两条线张力安全；
- 至少一幕的可完成输入轨迹必须包含两名玩家在同一时间步向不同方向移动。

## 3. 状态与阶段

```text
ready
  └─ start → playing
playing
  ├─ pause / blur / hidden → paused
  ├─ hazard → playing（回到本幕检查点）
  ├─ stable goal → level-complete
  └─ final stable goal → game-complete
paused
  └─ resume → playing
level-complete
  └─ next → playing
game-complete
  └─ replay → playing（第一幕）
```

纯规则状态至少包含：

```text
phase, levelIndex, elapsed, stepCount, resetCount,
anchors[2] = { position, velocity },
payload = { position, velocity },
goalHold, checkpoint, pauseReason
```

渲染帧时间、Canvas 上下文、DOM 节点、图片对象、按键集合和 `requestAnimationFrame` 句柄不能进入规则状态。

## 4. 世界与三幕

逻辑世界固定为 `960 × 540`，所有关卡、碰撞和输入都使用该坐标系；Canvas 只负责按 CSS 像素缩放并按 DPR 绘制。

| 幕 | 名称 | 主要教学 | 障碍构图 |
| --- | --- | --- | --- |
| 1 | 穿过针脚 | 同向牵引与安全张力 | 一上一下两块宽软垫形成缓和 S 弯 |
| 2 | 绕过别针 | 一人先引导、另一人跟进 | 中央软垫与两处危险三角针脚形成上下选择 |
| 3 | 收好这一针 | 同时反向微调与稳定收束 | 三块错位软垫形成窄门，终点前需降低速度 |

矩形软垫是实体障碍；三角针脚是危险区。线轴和吊坠都不能穿过软垫，只有吊坠触碰危险针脚才回到最近检查点。检查点只保存本幕固定的安全状态，不写入浏览器存储。

## 5. 确定性运动模型

### 5.1 固定时间步

- 规则步长固定为 `1 / 120s`；
- 浏览器 accumulator 每帧最多接收 `0.1s`，防止后台恢复产生巨型跳步；
- 单帧最多执行 12 个规则子步，多余积压丢弃并保持可玩；
- 逻辑测试直接调用相同步进函数，不依赖真实时钟。

### 5.2 输入与阻尼

每名玩家的输入是规范化二维向量 `{ x, y }`。对角线长度必须归一化，避免斜向速度更快。线轴采用速度积分、线性阻尼和最大速度；松开后会短距离滑行，但不会像冰面持续漂移。

### 5.3 双丝带约束

每条丝带连接一个线轴与吊坠：

- 低于自然长度时只保持轻微视觉弧度，不产生推力；
- 超过自然长度后产生与伸长量成比例的拉力；
- 超过最大长度时用有限次位置投影把线轴和吊坠拉回合法距离；
- 张力是 `(当前长度 - 自然长度) / (最大长度 - 自然长度)` 的截断值，仅作规则状态派生，不从像素或动画读取。

第一版自行实现上述小型模型，不引入 Matter.js 或其他运行依赖。碰撞采用圆与轴对齐矩形/世界边界的确定性投影；三角危险区使用点到三角形的几何判定。

### 5.4 终点

完成本幕需连续满足：

- 吊坠中心位于绷框完成半径；
- 两枚线轴都进入终点收束半平面；
- 两条丝带张力均不超过安全阈值；
- 吊坠速度低于收束阈值；
- 条件累计保持 `0.45s`。

任一条件失效立即把 `goalHold` 清零，避免高速掠过终点或单人把吊坠甩进去误判完成。

## 6. 输入与暂停

### 6.1 键盘

- 珊瑚线轴：`W/A/S/D`；
- 青色线轴：`ArrowUp/ArrowLeft/ArrowDown/ArrowRight`；
- 游戏进行时阻止这些键滚动页面；输入集合按键按下加入、抬起移除；
- `blur`、`visibilitychange`、暂停、重开和过关全部清空输入，禁止粘键。

### 6.2 触屏

- 两组四向按钮分别支持独立 `pointerId`，允许两人同时长按；
- `pointerdown` 后捕获指针；`pointerup`、`pointercancel`、`lostpointercapture` 都必须释放对应方向；
- 390px 宽并排显示，单个目标不小于 `52 × 52px`；320px 可纵向排列，不能为保持并排而缩小目标；
- 触屏与键盘输入合并，但同一玩家相反方向同时按下时该轴归零。

## 7. 视觉规格

### 7.1 冻结概念

- 桌面：[`docs/assets/tethered-heart/desktop-concept.png`](./assets/tethered-heart/desktop-concept.png)，原生 `1586 × 992`；
- 移动：[`docs/assets/tethered-heart/mobile-concept.png`](./assets/tethered-heart/mobile-concept.png)，原生 `853 × 1844`；
- 图集源稿：[`docs/assets/tethered-heart/sprite-atlas-source.png`](./assets/tethered-heart/sprite-atlas-source.png)，`4 × 2` 绿色背景；
- 生产背景：`experiences/co-op/tethered-heart/assets/playfield-background.png`；
- 生产图集：`experiences/co-op/tethered-heart/assets/sprite-atlas.png`，RGBA，运行时只读本地文件。

概念与资产均由本项目于 2026-07-17 使用 OpenAI 内置图像生成工具生成。图集用技能自带去色工具与临时 `uv run --with pillow` 转换；Pillow 不是仓库安装或作品运行依赖。已存在的工具链问题与处理方式见 [`bugs/2026-07-17-imagegen-chroma-toolchain.md`](../bugs/2026-07-17-imagegen-chroma-toolchain.md)。

### 7.2 设计系统

- 背景：深桑葚布面 `#21101f`，不是黑色或霓虹紫；
- 主文字：暖羊皮纸 `#f2dfb6`；次文字：灰金 `#bfae90`；
- 玩家：珊瑚 `#e86f61`、氧化青 `#3aa5a0`；
- 边框与强调：旧黄铜 `#b78a46`；危险：暗朱红 `#b84d48`；
- 标题：系统宋体栈；控制、状态和按钮：系统无衬线；键位：等宽字体；
- 单一大画布 + 开放底部操作轨，不使用卡片网格、徽章、统计面板或额外导航；
- 动效只服务于线张力、碰撞回弹、检查点和完成反馈；`prefers-reduced-motion` 下移除装饰晃动与脉冲，但保留位置更新。

### 7.3 图集布局

`4 × 2` 图集按行：

| 珊瑚线轴 | 青色线轴 | 双拼吊坠 | 刺绣绷 |
| --- | --- | --- | --- |
| 矩形软垫 | 三角针脚 | 检查点 | 金线火花 |

Canvas 通过 `drawImage` 的源矩形取图，不把图集拆成八个重复文件。丝带本身由 Canvas 路径绘制，因为它必须逐步响应动态端点与张力；这是规则投影，不是用代码替代固定美术资产。

## 8. 页面与模块

```text
experiences/co-op/tethered-heart/
├── index.html
├── styles.css
├── levels.js              # 三幕冻结几何与 schema 校验
├── logic.js               # 纯状态、固定步、碰撞、约束与完成
├── logic.test.js
├── app.js                 # Canvas、输入、循环、DOM 与无障碍
├── README.md
└── assets/
    ├── playfield-background.png
    └── sprite-atlas.png
```

`levels.js` 与 `logic.js` 使用经典脚本工厂导出到 `globalThis`，既能被 Node 测试加载，也能通过 `file://` 执行。第一款约束游戏不提前抽象到 `shared/`；等第二款连续物理体验出现并确认接口稳定后再提取固定步工具。

## 9. 借鉴与来源边界

玩法调研参考 [pemmyz/js_thrustvector](https://github.com/pemmyz/js_thrustvector/tree/4d140761ba1af8f4448bc6bd4785b63fc8928c5c) 的抽象机制：两名玩家通过短绳共同影响一个物理载荷。固定版本为 commit [`4d140761ba1af8f4448bc6bd4785b63fc8928c5c`](https://github.com/pemmyz/js_thrustvector/commit/4d140761ba1af8f4448bc6bd4785b63fc8928c5c)，上游 [`LICENSE`](https://github.com/pemmyz/js_thrustvector/blob/4d140761ba1af8f4448bc6bd4785b63fc8928c5c/LICENSE) 为 MIT License，版权标注为 `Copyright (c) 2025 pemmyz`。来源与许可证于 2026-07-17 按该 commit 复核。

本作品是**机制借鉴、完全自行重写**。不得复制或改写上游的飞船、炸弹、夹取、燃料、生命值、Harmony/Stability、洞穴、迷雾、雷达、路径搜索、控制常量、地图、源码、DOM、CSS、文案或素材。本作品自行设计丝带线轴、始终连接的双拼吊坠、三幕几何、规则状态、碰撞、固定步长、输入协议、中文文案和全部视觉。

技术选型还比较了 [Matter.js 0.20.0](https://github.com/liabru/matter-js/tree/0.20.0) 的距离约束能力与 [MIT LICENSE](https://github.com/liabru/matter-js/blob/0.20.0/LICENSE)，但第一版不引入、不打包、不调用也不复制 Matter.js。若未来直接使用，必须进入统一 vendor manifest 并附许可证与哈希。

## 10. 自动验收

最终结果与真实浏览器证据见 [`28-tethered-heart-verification.md`](./28-tethered-heart-verification.md)。

### 10.1 规则

- 三幕 schema、几何和嵌套对象深冻结；非法定义被拒绝；
- 对角输入归一化、速度上限、阻尼和世界边界正确；
- 同一输入序列在不同渲染帧切片下产生相同最终状态；
- 两条丝带都不超过最大长度，张力派生在 `[0, 1]`；
- 圆与矩形碰撞不穿透，危险三角触碰回检查点并累计重置次数；
- 高速掠过、单线高张力、仅吊坠进绷框或仅线轴进收束区都不完成；
- 三幕各有一条确定性双人输入轨迹可完成；至少一条包含同时不同向输入；
- 暂停/恢复、重开、下一幕、最终重玩和畸形状态保持状态机不变量。

### 10.2 A 级边界

- 所有脚本、样式、背景和图集都是相对本地路径；
- 无模块脚本、`fetch`、XHR、WebSocket、CDN、远程字体、Service Worker 或浏览器存储；
- 根 catalog、内置 portal catalog、分类 README、文档索引与目录测试同步；
- `npm test`、`npm run verify`、所有作品 JavaScript `node --check` 与 `git diff --check` 通过。

### 10.3 浏览器

- 实际使用两套键盘输入完成三幕；至少一幕验证双方同时按键；
- 触屏两组方向盘可由两个不同 `pointerId` 同时按住并正确释放；
- 暂停阻止运动，恢复继续；重开、玩法对话框、下一幕和最终重玩有效；
- 1586×992、390×844 与 320×700 无横向溢出；桌面主玩法和主动作在首屏；
- 390px 的八个方向按钮均不小于 52px；
- 页面隐藏/失焦清空输入并暂停；reduced-motion 不破坏规则；
- 控制台无 warning/error，资源列表只有本地文件；
- 最终桌面/移动截图与冻结概念同批 `view_image`，记录至少文案、布局、排版、色彩、资产、容器、响应式和动效八项 fidelity ledger。
