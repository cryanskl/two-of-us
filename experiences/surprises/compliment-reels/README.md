# 每一格，都是喜欢你的理由

一台给对象准备的本地夸夸印刷机。每次拉动会把“我看见的你”“发亮的样子”
和“留给我的感觉”印成一句完整夸奖；每轮最多六次，一定会遇到一次特别同频，
然后展开准备者写下的私人结语。

## 打开方式

直接双击本目录的 `index.html`，浏览器会以 `file://` 打开，不需要安装、构建、
登录或启动服务器。页面使用经典相对脚本，零第三方运行依赖，也不会发起网络
请求、写入本地存储、读取剪贴板或申请权限。

如需开发调试，也可以在仓库根目录启动任意静态文件服务器，再访问：

```text
/experiences/surprises/compliment-reels/index.html
```

本地服务器只用于调试，不是正常游玩的前置条件。

## 怎么玩

1. 页面打开后，本轮六步顺序已经一次性排好；
2. 点击或用键盘触发唯一的珊瑚色把手；
3. 三段纸卷停稳后，完整夸奖会印在连续纸上，并加入本轮历史；
4. 第 3–6 次之间会出现唯一一次“特别同频”，同时展开私人结语；
5. 点击“再夸一局”会清空本轮公开结果并立即准备新一轮。

如果浏览器无法提供安全随机源，页面会明确显示
“本机随机不可用，本轮使用固定惊喜顺序”，仍可离线完成体验。

## 自定义

准备者可以编辑 `config.js`：

- `recipient`：对方的称呼，1–12 个 Unicode 字素；
- `sender`：自己的署名，1–12 个 Unicode 字素，不能与对方称呼相同；
- `columns`：三列各六条短句；保持现有 ID、顺序和字段结构，只修改 `text`；
- `composeJackpotNote(summary)`：返回 1–120 字素的纯文本私人结语。

任意字段、ID、长度、标点或列内唯一性不符合合同，会整份回退到安全默认内容，
不会把一部分自定义内容与一部分默认内容混在一起。结语函数只在准备新一轮时调用
一次；不要返回 HTML、Promise，或在其中执行网络、存储和权限操作。

## 本地与隐私边界

- 随机计划、已揭晓历史和私人结语只保存在当前页面内存；
- 刷新或关闭页面即清空，不保存进度；
- spinning 阶段只保留已经公开的上一句，不把当前 stop 或未来 stop 写入 DOM；
- 私人结语只在特别同频真正落定后创建；
- docs 中的概念 PNG 不会被生产页面加载；机身、纸卷、把手和星形全部由
  HTML/CSS/code-native 文本构造；
- `assets/favicon.svg` 是本仓库为此体验绘制的简单几何图标，不来自第三方素材。

## 测试

在仓库根目录运行：

```bash
node --check experiences/surprises/compliment-reels/config.js
node --check experiences/surprises/compliment-reels/logic.js
node --check experiences/surprises/compliment-reels/app.js
node --test experiences/surprises/compliment-reels/logic.test.js \
  experiences/surprises/compliment-reels/ui-contract.test.js
```

## 借鉴与来源声明

本体验的规则、状态机、文案、HTML、CSS、JavaScript、图标和测试均在本仓库独立
实现。开发前研究了下列开源项目的抽象机制；它们不是 dependency、vendored
文件或运行时脚本。本作未复制、翻译或改写其源码、API、随机算法、缓动公式、
默认参数、测试、DOM、CSS、文案、图片、音频、字体、Logo、品牌和 trade dress。

### nuxy/slot-machine-gen

- 固定 commit：
  `56c9017e839583dcb8fcb5cc88b08b30ed63f66a`
- 许可证：MIT
- 版权：`Copyright (c) 2020-2025 Marc S. Brooks (https://mbrooks.info)`
- 只借鉴：独立 reel、结果预选、错峰停止、全部停止后统一返回的职责分层；
- 未采用：源码/API、3D 圆柱参数、权重、偏置、赔率、payline、图片和音频。

来源：[`nuxy/slot-machine-gen`](https://github.com/nuxy/slot-machine-gen/tree/56c9017e839583dcb8fcb5cc88b08b30ed63f66a)

### davidbau/seedrandom

- 固定 commit：
  `4460ad325a0a15273a211e509f03ae0beb99511a`
- 许可证：README `LICENSE (MIT)`；仓库没有独立 LICENSE
- 版权：`Copyright 2019 David Bau.`
- 只借鉴：把随机源局部封装、让测试结果可固定重现的抽象边界；
- 未采用：ARC4/Alea/xor PRNG、熵收集、状态序列化、测试向量和全局
  `Math.random` 修改。

来源：[`davidbau/seedrandom`](https://github.com/davidbau/seedrandom/tree/4460ad325a0a15273a211e509f03ae0beb99511a)

### tweenjs/tween.js

- 固定 commit：
  `20079e65f77bb2b8e52cc9d7dbed044b86e537d3`
- 许可证：MIT
- 版权：`Copyright (c) 2010-2012 Tween.js authors.`；easing equations
  `Copyright (c) 2001 Robert Penner http://robertpenner.com/easing/`
- 只借鉴：起终点、持续时间、错峰停止、完成回调与规则分层；
- 未采用：Tween/Group/Easing 源码/API、Penner 缓动公式、参数、示例和测试。

来源：[`tweenjs/tween.js`](https://github.com/tweenjs/tween.js/tree/20079e65f77bb2b8e52cc9d7dbed044b86e537d3)

### catdad/canvas-confetti

- 固定 commit：
  `20eebad51dde793070c373d594099a7ed8d96e22`
- 许可证：ISC
- 版权：`Copyright (c) 2020, Kiril Vatev`
- 只借鉴：表现与规则结果分离、动画清理和 reduced-motion 原则；
- 未采用：粒子物理、worker、Canvas、位图缓存、Promise 协调、默认参数和配色。

来源：[`catdad/canvas-confetti`](https://github.com/catdad/canvas-confetti/tree/20eebad51dde793070c373d594099a7ed8d96e22)

完整许可证载体、内容哈希、排除来源与边界见同目录 `ATTRIBUTION.md`。
