# 纸上球局

同一台设备上的双人纸上足球：每次从当前球点向八个相邻方向画一条线，落到旧点或边界就继续走；把球送入对方球门，或让对方在借力后无路可走，即可赢下一局。

## 直接打开

双击 [`index.html`](./index.html) 即可。作品是 A 级经典脚本页面，不需要安装依赖、启动服务、账号或网络。

鼠标/触屏可以点击棋盘上的高亮落点；键盘使用：

```text
Q W E    ↖ ↑ ↗
A   D    ←   →
Z X C    ↙ ↓ ↘
```

右侧或棋盘下方也有同样的八方向触控按钮。

## 本地定制

编辑 [`config.js`](./config.js) 可以修改双方名字、第一局开球者，以及下一局的开球策略。

默认策略交替开球：

```js
chooseNextStarter({ previousStarter }) {
  return previousStarter === "red" ? "blue" : "red";
}
```

如果希望上一局输家开球，可以使用：

```js
chooseNextStarter({ winner }) {
  return winner === "red" ? "blue" : "red";
}
```

策略只接受 `"red"` 或 `"blue"`；抛错或返回其他值会安全回退为交替。配置只在当前本机页面执行，不上传、不保存。

## 规则边界

- 固定 8×10 方格、上下 2×1 球门；
- 同一条无向线段不能重复，外边线不能沿线行走；
- 旧点与边界的判断发生在本次新线加入之前；
- 红方固定进攻上方球门，蓝方固定进攻下方球门；乌龙球计给对方；
- 借力后没有出口，当前玩家输；
- 每局结束可以保留会话胜局再踢一场，也可以清空胜局；刷新页面会从头开始。

## 隐私与依赖

- 不发起网络请求；
- 不使用 localStorage、cookie、IndexedDB 或服务 Worker；
- 不收集名字、轨迹或胜局；
- 背景、SVG 球场、脚本和样式全部随目录本地提供；
- 没有第三方运行时依赖。

## 借鉴与来源声明

玩法使用传统 Paper Soccer / Paper Football 的通用规则；规则核验来源、两个只做元数据复核的 MIT 仓库、固定 commit 和零代码借用边界，见 [`assets/ATTRIBUTION.md`](./assets/ATTRIBUTION.md)。

JavaScript 状态机、SVG 渲染、视觉布局、中文文案与测试均为本仓库原创。无字桌毡背景和设计概念由 OpenAI ImageGen 生成；运行 UI 不从概念图裁切。
