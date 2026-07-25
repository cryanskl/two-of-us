# 视觉 variant 的尺寸必须拥有明确层叠优先级

同一节点同时拥有通用组件类与状态/页面 variant 类时，只写：

```css
.intro-stage { inline-size: min(100%, 720px); }
.bouquet-stage { inline-size: 100%; }
```

会让源码顺序决定关键尺寸。后置的通用规则即使语义更弱，也会因 specificity 相同
而覆盖 variant；静态检查通常看不出，真实浏览器才会暴露首屏动作被推出的问题。

本项目采用以下约束：

1. 通用组件先提供无状态基线；
2. 关键 variant 用组合选择器（如 `.bouquet-stage.intro-stage`）明确胜出；
3. 真实浏览器同时记录 viewport、关键 `getBoundingClientRect()` 与横向溢出；
4. 响应式改变视觉位置但不改变语义顺序时，用具名 grid area，并在每个断点显式列出
   area 顺序；不要依赖 grid 自动放置猜测。

这类验证关注的不是截图“看起来差不多”，而是主动作是否在目标首屏、触控目标是否
达到约定尺寸、信息层级是否在相同 viewport 中成立。
