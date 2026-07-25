# Bug：Twin Orbit 把滚动 Pointer Events URL 标成 Level 3 Recommendation

- 状态：`fixed`
- 日期：2026-07-25
- 影响作品：`twin-orbit` 调研、来源审计与项目归属声明
- 发现版本 / commit：`e539ca3991b20afa2139c495e5969ad6bbe41218`

## 复现

打开 `docs/307-twin-orbit-attribution-dependency-audit.md` 的标准表。基线使用：

```text
https://www.w3.org/TR/pointerevents/
W3C Recommendation；当前页面为 Level 3
```

2026-07-25 直接访问该通用 URL，实际落点已经是 Pointer Events Level 4，
W3C Working Draft 01 July 2026；页面另列 Latest Recommendation 为 Level 3。

## 预期

若审计要声明 Level 3 Recommendation，应使用固定层级 URL
`https://www.w3.org/TR/pointerevents3/`。该页面明确标注
`W3C Recommendation 30 June 2026`。

## 影响

- 来源标签和实际页面成熟度不一致；
- 后续审计可能把 Working Draft 误当 Recommendation；
- 通用滚动链接不能稳定证明实现采用的规范层级。

这不影响当前纯逻辑运行时，也没有引入第三方代码或资产。

## 修复

- research、来源审计和项目 `ATTRIBUTION.md` 全部固定 Level 3 URL；
- 补齐 W3C/WHATWG 文档的版权、许可证与零复制边界；
- 明确只保留链接和用途，不复制正文、IDL、示例、表格、图表或测试。

## 验证

- Pointer Events 通用 URL：Level 4 Working Draft，2026-07-01；
- Pointer Events Level 3 固定 URL：W3C Recommendation，2026-06-30；
- UI Events code、WCAG、WHATWG HTML 和对应许可证页面均使用一手来源复核；
- 仓库检索不再把 Pointer Events 通用 URL 标成 Level 3 Recommendation。
