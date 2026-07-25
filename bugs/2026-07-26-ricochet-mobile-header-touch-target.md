# 移动端顶栏按钮低于 44px

日期：2026-07-26
项目：`ricochet-tank-duel`

## 复现

独立 Chrome/CDP Session 在 390×844 与 320×568 视口测量全部可见按钮，
最小高度均为 40px。对应元素是顶栏“暂停”和“规则”按钮。

源码可直接定位到：

```css
@media (max-width: 480px) {
  .header-actions button {
    min-height: 40px;
  }
}
```

## 影响

这覆盖了全局 `button { min-height: 44px; }`，违反 README、设计提案和 UI 契约中
所有操作按钮至少 44×44 CSS px 的触控目标合同。按钮虽然可点击，但窄屏用户得到
更小的命中区域。

## 根因

为了压缩移动顶栏高度，局部媒体查询把语义操作的最小高度从 44px 下调到 40px，
而静态测试只检查了全局 token，没有检查窄屏覆盖规则。

## 修复

- 先加入失败契约，禁止 480 px 媒体查询把顶栏按钮高度降到 44px 以下；
- 把局部 `min-height` 恢复为 44px；
- 保留较紧的水平 padding 和字号，不牺牲触控目标。

## 验证

项目测试与 `git diff --check` 已通过。独立 Chrome/CDP Session 需要在最新 HEAD
重新测量 390×844 和 320×568，确认最小可见按钮高度恢复到至少 44px 后才能关闭
浏览器 Gate。
