# 藏好这一味：失焦事件对象被误当成遮盖原因

- 状态：`fixed`
- 日期：2026-07-19
- 影响作品：藏好这一味
- 发现版本 / commit：前端实现的提交前候选；修复随 `6a20e15 feat: build secret recipe code` 进入

## 环境

- 操作系统：任意
- 浏览器与版本：支持 `blur` 事件的现代浏览器
- 启动等级与入口：A 级，双击 `experiences/versus/secret-recipe-code/index.html`

## 复现步骤

1. 进入配方设置阶段并填入至少一格秘密。
2. 让候选实现直接执行 `addEventListener("blur", coverForLifecycle)`。
3. 切换到别的窗口，再返回页面。

## 预期结果

窗口失焦后，页面立即派发合法的 `{ type: "COVER_SECRET", reason: "blur" }`，删除设置态的配方节点并只显示恢复动作。

## 实际结果

浏览器把 `FocusEvent` 作为首个参数传给 `coverForLifecycle`。候选实现继而把整个事件对象放入 `reason`；严格 action 校验以 `invalid cover reason` 拒绝动作，UI 的防御性捕获避免崩溃，却导致秘密没有自动盖住。

## 根因

DOM 事件监听器的调用合同与业务函数的参数合同恰好都只有一个参数，但语义不同：前者是事件对象，后者只允许 `blur / hidden / escape / manual` 字符串。直接传函数引用掩盖了这次类型错位。

## 解决方案

- 失焦监听改为 `() => coverForLifecycle("blur")`；
- 页面隐藏监听只在 `document.hidden` 时显式传入 `"hidden"`；
- reducer 继续严格拒绝事件对象、未知字符串与畸形 action，不为 UI 错误放宽合同；
- 遮盖后通过公开 view 重建整段阶段 DOM，秘密草稿节点不留在隐藏树中。

## 回归验证

- [x] 22 / 22 条逻辑测试通过，包含合法遮盖原因和畸形 action 拒绝
- [x] 真实浏览器中失焦、页面隐藏与手动恢复路径通过
- [x] covered、handoff 与 guessing 阶段 DOM 均不含秘密配方节点
- [x] 全仓测试 1185 / 1185 通过，控制台无 warning / error

## 相关提交

- `6a20e15 feat: build secret recipe code`

