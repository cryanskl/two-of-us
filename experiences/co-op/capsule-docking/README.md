# 转一点，推一点，刚好回家

一款本地同机双人近距离对接游戏。姿态席用 `A / D` 只管转，推进席用
`J / L` 只管主推与反推；两个人把同一艘舱体的位置、线速度、船头角差、角速度、
松手状态和路径安全一起放进窗口，并稳定保持 30 个 60Hz 规则 tick。

## 打开与游玩

直接双击本目录的 `index.html`。不需要安装依赖、构建、启动服务器、登录或联网，
也不读取摄像头、麦克风、陀螺仪与本地存储。

1. 点击“开始对接”，一起查看当前航段初态；
2. 姿态席按住 `A / D` 调整船头，推进席按住 `J / L` 推进或反推；
3. 两席松手后，让六条条件连续安全 30 格；
4. 碰壳或飘出安全区时只重试当前航段；完成三段后得到共同记录与赠言。

四个屏幕按钮也支持鼠标、触笔和双指触控。`Escape`、窗口失焦、页面隐藏或离开
页面会清空输入并把当前航段安全重置到说明页，不增加尝试次数。

## 本地与信任边界

页面不联网、不上传称呼、按键、轨迹或完成记录，也不做分析、广告、远程字体、
排行榜或云存档。记录只存在于当前页面内存，刷新即消失。

同机页面可以把两套权限硬拆开，但无法证明屏幕前一定是两个人；一个人也可以操作
四个键。本作依赖参与者之间的信任，不使用账号、摄像头或行为识别来判断关系或
身份。它使用归一化辅助物理，不是航天训练、轨道仿真或真实操作建议。

## 个性化

编辑 `config.js` 可以修改两个席位称呼和完成后的赠言：

```js
seats: ["你", "TA"],
composeCompletionNote(summary) {
  return `${summary.seats[0]}和${summary.seats[1]}，转一点，推一点，终于把这一程稳稳接回家。`;
}
```

称呼只用于本页显示，不会保存或发送。`composeCompletionNote` 只在最终完成态调用；
它不能改变物理、键位、航段或 Gate。

## 测试

在仓库根目录运行：

```bash
node --check experiences/co-op/capsule-docking/app.js
node --test experiences/co-op/capsule-docking/logic.test.js
node --test experiences/co-op/capsule-docking/ui.test.js
npm test
npm run verify
```

## 借鉴与来源声明

本作的双席权限、三航段、数值、整数积分、微步碰撞、六项 Gate、状态机、代码、
测试、中文文案、HTML、CSS 与 SVG 均为独立实现；视觉采用原创的“纸质近地轨道
训练台”，没有把概念 PNG、第三方图片、品牌素材或真实航天器素材放进运行页面。
下列项目只用于研究通用机制，不是依赖，也没有复制、改写、翻译、链接或打包其
源码、API、算法表达、常量、测试、界面、品牌或素材：

- [Farama Gymnasium 固定 commit](https://github.com/Farama-Foundation/Gymnasium/tree/20b453de30ef725a538e235fcdec909f30c95783)，
  commit `20b453de30ef725a538e235fcdec909f30c95783`，MIT，
  Copyright (c) 2016 OpenAI；Copyright (c) 2022 Farama Foundation。
  只研究位置、线速度、角度和角速度等状态类别分层；未引入 Lunar Lander、
  Python、Box2D、Pygame、力学公式、参数、奖励、终止、图形或粒子。
- [schteppe/p2.js 固定 commit](https://github.com/schteppe/p2.js/tree/2beb2750f42d29014e289cb803b7269d5b0edaad)，
  commit `2beb2750f42d29014e289cb803b7269d5b0edaad`，MIT，
  Copyright (c) 2016 p2.js authors。只研究固定 dt、accumulator、最大子步与
  规则/渲染分离；未引入 `World.step/internalStep`、对象结构、求解器、碰撞管线、
  插值、构建、测试或示例。
- [jriecken/SAT.js 固定 commit](https://github.com/jriecken/sat-js/tree/20e612681d1f9eabc9ea34dc98c4d27f985ffec6)，
  commit `20e612681d1f9eabc9ea34dc98c4d27f985ffec6`，MIT，
  Copyright (C) 2012 - 2015 by Jim Riecken。只研究粗排除、精确碰撞与安全判定
  分层；未引入 Vector、SAT、Response、ObjectPool、分离轴实现、优化、测试或示例。
- [Phaser 固定 commit](https://github.com/phaserjs/phaser/tree/41be1e462bc600064e498cba370bfa8c5c055a22)，
  commit `41be1e462bc600064e498cba370bfa8c5c055a22`，MIT，
  Copyright (c) 2026 Richard Davey, Phaser Studio Inc.。只研究按下/抬起、
  repeat 过滤、失焦复位和监听器清理职责；未引入 KeyboardPlugin、Key、KeyMap、
  插件体系、EventEmitter、事件名、类型、测试、品牌或演示素材。

NASA NTRS 的 Orion RPOD 论文只用于理解近距/对接会观察相对位置、相对速度、
相对姿态和相对姿态率四类公开状态；没有复制论文、图表、参数、导航/控制算法或
安全结论。固定许可证链接、许可证 SHA-256、版权和更细的零复制边界见
[`ATTRIBUTION.md`](./ATTRIBUTION.md)。
