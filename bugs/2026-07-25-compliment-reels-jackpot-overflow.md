# Compliment Reels 桌面终局纵向溢出

- 日期：2026-07-25
- 状态：已修复
- 影响：1504×1046 jackpot
- 回归测试 commit：`5fff557`
- 修复 commit：`af0c72a`

## 现象

1504×1046 Chrome 中，五条历史的 jackpot 页面出现
`scrollHeight=1072 > clientHeight=1046`，底部“再夸一局”把手被截去一部分。
六条历史是更严格的最坏情况。

## 根因

jackpot 继续使用 ready 的 48px 顶部留白、14px 行间距和较宽历史行距；终局新增
信笺与历史后，这些垂直节奏累计超过冻结视口。

## 修复

只在 `min-width: 901px` 且 `max-height: 1100px` 的桌面终局：

- 把页面 padding 收紧为 `24px 0 12px`；
- 把栅格间距收紧为 8px；
- 把题名上限收为 64px；
- 收紧保证文字与历史行距。

移动端媒体查询和纵向滚动不受影响。最终用真实随机跑到第六次 jackpot，
1504×1046 实测 `scrollHeight=clientHeight=1046`、`scrollWidth=clientWidth=1504`。

