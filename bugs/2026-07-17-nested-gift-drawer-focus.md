# 一层一层：从留言进入抽屉层时焦点退回页面主体

- 状态：`fixed`
- 日期：2026-07-17
- 影响作品：一层一层键盘拆盒流程
- 发现版本 / commit：实现提交前工作区

## 环境

- macOS 26.5.2；headed Chromium；
- 用键盘完成纸角层，再激活“继续拆下一层”。

## 复现步骤

1. 完成第二层并进入留言；
2. 激活“继续拆下一层”；
3. 查询 `document.activeElement`；
4. 直接按 End 尝试拉开抽屉。

## 预期结果

第三层唯一的 range 输入获得焦点，End 能把抽屉拉到 100% 并进入留言。

## 实际结果

焦点落回 `BODY`，End 不会操作滑杆。

## 根因

“主焦点”分支只查询 `button`。第三层唯一操作是 `input[type=range]`，因此查询没有命中目标。

## 解决方案

主焦点分支统一查询 `button, input`；普通操作阶段仍优先选择未禁用按钮或输入控件。

## 回归验证

- [x] 进入第三层后 activeElement 是 aria-label 为“向右拉开抽屉”的 INPUT；
- [x] End 原生键盘操作进入第三层留言；
- [x] intro、四个 note 和 complete 的唯一按钮仍正确获焦；
- [x] 四层可以只用键盘完整拆完。

## 相关提交

- `9423371 feat: add nested gift surprise`
