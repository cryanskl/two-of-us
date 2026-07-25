# Kaleidoscope Names：相位公开文本偏移一格

## 复现

默认 tuning 的权威 `selected` 是 `0`，默认答案 `targetPhase` 是 `22`。首次实现
却分别显示“第 1 / 24 格”和“第 23 / 24 格”。

## 影响

公开文字与原生 range 的 `0–23` 值域不一致；规格给准备者的“钟面十一点对应
22”映射也会在页面上看起来偏移一格。几何判定没有受影响，但线索解释、可见
状态和未来读屏播报会互相矛盾。

## 根因

格式化函数把 `phaseStep` 当成数组索引并擅自加一，而本项目把它定义为可直接
配置、可公开比较的业务值，不是内部下标。

## 修复

`phaseDisplayText()` 直接显示 `phaseStep`。测试同时固定初值 `0` 与默认答案
`22` 的公开文本，避免未来再次引入 1-based 展示层。

## 回归

运行定向 `logic.test.js`、全仓 `npm test`、`npm run verify` 与
`git diff --check`。
