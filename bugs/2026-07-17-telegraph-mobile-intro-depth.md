# Bug：默契电报码 390px intro 主动作落到过深位置

- 状态：`fixed`
- 日期：2026-07-17
- 影响作品：默契电报码
- 发现版本 / commit：`bc8fbeb` 后的实现阶段，修复包含于 `7b86b15`

## 环境

- 操作系统：macOS
- 浏览器：Playwright CLI headed Chromium
- 启动等级与入口：A 级，`experiences/co-op/telegraph-codebook/index.html`
- 复现视口：390×844、320×760

## 复现步骤

1. 以 390×844 打开 intro；
2. 不滚动，检查六码本、仪表、双键与“开始守台”的顺序；
3. 读取页面 `scrollHeight`。

## 预期结果

intro 的唯一任务是共同记住六码本并开始；码本和主动作应在首屏可达。

## 实际结果

首版把尚不可用的表盘、三拍灯和两枚 116px 高电键全部插在码本与主动作之间，390px 的 `scrollHeight` 达 1282px，主动作必须深滚动才能看到。

## 根因

机械地把桌面完整仪表按顺序堆成移动单列，没有按阶段任务做信息密度预算。

## 解决方案

- 在 station 上派生 `data-phase`；
- 650px 以下仅在 intro 隐藏尚不可用的 radio、pulse-strip 与 keys；
- senderHandoff 后完整仪表恢复，发送阶段两枚大键仍各 116px 高。

## 回归验证

- [x] 390×844：`scrollWidth = 390`、`scrollHeight = 844`
- [x] 320×760：`scrollWidth = 320`、`scrollHeight = 764`
- [x] 320px sending：可见按钮高度 116 / 116 / 52 / 52px
- [x] 桌面 1503×1046 构图不变
- [x] 码本内容、状态机与交接隐私不变

## 相关提交

- `7b86b15`：阶段化移动 intro 与完整作品实现
