# 这一圈，和你同时到：无 JavaScript 时主动作成为无响应假按钮

- 状态：`fixed`
- 日期：2026-07-25
- 环境：Chrome，localhost 生产文件，禁用 JavaScript

## 复现

1. 在浏览器中禁用 JavaScript；
2. 打开 `experiences/co-op/twin-orbit/index.html`；
3. 点击“开始第一圈”。

实际结果：按钮可见且处于可用状态，但点击没有任何响应。

预期结果：`noscript` 提示正常显示，所有依赖 JavaScript 的操作都不可用，不向用户承诺无法发生的交互。

## 根因

双人按住控件在静态 HTML 中默认带有 `disabled`，主阶段按钮却依赖
`app.js` 首次渲染后才管理状态。脚本未执行时，静态按钮保留了可操作外观，
但没有事件处理器。

## 修复

- `#phase-action` 在静态 HTML 中默认 `disabled`；
- JavaScript 成功初始化后，渲染器只在当前 public phase 存在合法动作时启用；
- UI 契约同时锁定静态默认值和运行时启用条件。

## 回归

- `node --test experiences/co-op/twin-orbit/*.test.js` 通过；
- Chrome 禁用 JavaScript 后，`noscript` 可见，主动作与双人控制均为 disabled；
- Chrome 启用 JavaScript 后，intro 主动作由首次渲染正常启用。
