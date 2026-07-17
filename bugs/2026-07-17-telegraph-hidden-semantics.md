# Bug：默契电报码空码本侧轨覆盖 hidden 语义

- 状态：`fixed`
- 日期：2026-07-17
- 影响作品：默契电报码
- 发现版本 / commit：`bc8fbeb` 后的实现阶段，修复包含于 `7b86b15`

## 环境

- 操作系统：macOS
- 浏览器：Playwright CLI headed Chromium
- 启动等级与入口：A 级，`experiences/co-op/telegraph-codebook/index.html`
- 复现视口：1503×1046

## 复现步骤

1. 从 intro 点击“开始守台”；
2. 读取 senderHandoff 的 accessibility snapshot；
3. 检查码本 complementary 是否仍存在。

## 预期结果

intro 之外码本从可访问树消失，且控制台占满释放后的页面宽度。

## 实际结果

CSS 用 `.codebook[hidden] { display: block }` 保留空侧轨，覆盖了浏览器对 `hidden` 的默认行为。虽然词表节点已删除，accessibility snapshot 仍出现一个空 complementary。

## 根因

把“保留桌面空白侧轨”的视觉需求直接绑在 HTML 隐藏语义上，使 CSS 与原生语义互相冲突。

## 解决方案

intro 之外保持真正的 `hidden`，并给父级添加 `codebook-closed`；由父级网格切为单列，不再覆盖隐藏语义。

## 回归验证

- [x] senderHandoff snapshot 不再出现码本 complementary
- [x] receiverHandoff DOM 不包含词表与目标
- [x] 1503×1046 控制台自动占满释放后的列，无布局塌缩
- [x] `npm test` 273 / 273 通过

## 相关提交

- `7b86b15`：语义隐藏与完整作品实现
