# 爱心投石器：Canvas 或动画帧异常会卡住揭晓流程

- 状态：`fixed`
- 日期：2026-07-24
- 影响作品：`heart-catapult`
- 发现版本 / commit：`04d903f` 提交前候选

## 环境

- 操作系统：macOS
- 浏览器与版本：Chrome MCP 当前连接版本
- 启动等级与入口：A；`experiences/versus/heart-catapult/index.html`

## 复现步骤

1. 进入任一玩家的飞行揭晓阶段；
2. 让 `requestAnimationFrame`、`cancelAnimationFrame` 或 Canvas 绘制抛出异常；
3. 观察飞行结算和“跳过动画”操作。

## 预期结果

展示 API 失败时立即降级为文字结果，并且与正常播放、降动效和手动跳过共用同一
次结算路径；不能重复计分，也不能让流程停留在半揭晓状态。

## 实际结果

候选实现直接调用动画帧和绘图 API。任一调用抛错都可能中断回调，使当前飞行既
没有完成，也无法可靠取消；较晚到达的旧回调还可能二次执行。

## 根因

实现把不可靠的浏览器展示 API 当成了必成功依赖，并且取消动画只依赖浏览器句柄，
没有用业务侧的 `settled` 标记拒绝迟到回调。

## 解决方案

- 用安全调度器包装申请与取消动画帧；
- 用安全绘制入口捕获 Canvas 异常并切换到 DOM 文字结果；
- 每次播放持有单调的 `settled` 标记，所有回调先验证播放身份与结算状态；
- 正常结束、跳过、降动效和异常降级最终只调用同一个结算入口。

## 回归验证

- [x] `node --check experiences/versus/heart-catapult/app.js`
- [x] 19/19 项定向逻辑测试通过
- [x] 1849/1849 项全仓测试通过
- [x] Chrome 完成双段飞行、跳过和联合结算流程
- [x] 最终只读复审确认无剩余 P0/P1/P2

## 相关提交

- `04d903f feat: add heart catapult interaction`
