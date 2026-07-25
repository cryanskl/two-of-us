# Candle Wishes：无 JavaScript 时暴露不可用控件

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`candle-wishes`
- 发现版本 / commit：`e61892eea4adde55ad32ac41a7b4d554e4ae6442`

## 环境

- 操作系统：macOS
- 浏览器：受控 Chrome
- 启动方式：localhost 静态服务，关闭 JavaScript
- 视口：`320 × 568`

## 复现步骤

1. 打开 `experiences/surprises/candle-wishes/index.html`。
2. 关闭页面 JavaScript 并重新加载。
3. 检查可见内容和无障碍树。

## 预期结果

只显示公开标题、固定说明、固定隐私说明和“请开启 JavaScript 后再点亮这五支蜡烛。”提示。

## 实际结果

页面还显示了空舞台、初始进度和无法工作的“开始点亮”按钮；无障碍树也暴露了这些节点。

## 根因

动态区域直接以可见 HTML 初始状态输出，应用脚本只负责后续填充内容，没有先为无脚本场景提供隐藏基线。

## 解决方案

- 为舞台、进度、主按钮和 live region 增加初始 `hidden`；
- JavaScript 成功取得公开视图后再显式显示舞台、进度和 live region；
- 保留主按钮原有的阶段可见性控制；
- 准备失败分支显式显示可操作的重试状态。

实现与测试均为本项目原创，没有复制或改编第三方代码、视觉或素材。

## 回归验证

- [x] 先新增合同测试并观察到失败
- [x] 定向 UI 合同测试通过
- [x] `node --check` 通过
- [x] Chrome 无 JavaScript 页面只暴露四项公开内容
- [x] Chrome 正常 JavaScript 首屏仍显示舞台、进度和主按钮
- [x] `320 × 568` 无横向溢出

## 相关提交

- 本次无脚本基线修复提交（见包含本记录的 Git 提交）
