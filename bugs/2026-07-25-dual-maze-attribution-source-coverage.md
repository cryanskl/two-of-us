# dual-maze-race 借鉴声明来源覆盖不完整

## 状态

- 发现日期：2026-07-25
- 影响范围：`ATTRIBUTION.md` 与 P8 来源 Gate
- 当前处理：已补齐调研实际使用的全部来源与未复制边界

## 现象

`docs/283-dual-maze-race-research.md` 实际列出 14 个 URL，并另有一个没有 URL 的
Moore BFS 文献；旧 `ATTRIBUTION.md` 只有 Tarjan 和 Marsaglia 两个 URL。

缺少的来源包括：

- UI Events 与 KeyboardEvent code；
- Pointer Events；
- High Resolution Time；
- Page Visibility 与 Animation Frames；
- Media Queries 的 reduced motion；
- WCAG Keyboard、Target Size、Focus Visible、Status Messages；
- Microsoft keyboard ghosting；
- Moore 文献的稳定在线书目记录。

这与 `docs/286-dual-maze-race-plan.md` 要求“调研论文、规范和硬件说明的固定 URL”
不一致，也让“实际借鉴了什么、没有复制什么”无法逐项追溯。

## 修复

- 为 Moore 文献补 CiNii 稳定书目链接；
- 将研究中的全部浏览器、无障碍和硬件来源写入 `ATTRIBUTION.md`；
- 每项注明用途、未复制范围和当前仅属未来 UI Gate 的边界；
- 明确 2026-07-25 复核日期；
- 明确没有阅读或引入第三方开源实现，因此 fixed commit/tag 与再分发软件许可证
  不适用，不能伪造版本化来源。

修复后的研究与借鉴声明 URL 集合均为 15 项，差集为空。
