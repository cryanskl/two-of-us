# 心愿烟火：ImageGen 把阶段结构误画成槽位、轮播与持久控件

- 日期：2026-07-24
- 状态：fixed
- 范围：`docs/assets/wish-fireworks/` 视觉候选，不影响生产运行时

## 复现

按冻结的十五态简报生成完整页面时，四张首稿出现可重复识别的合同漂移：

1. W4 把已经公开的 `我` 放进卡槽，并把正在形成的点阵画成统一满方格；
2. W6 把焦点放在图案说明而非结果标题，完成态仍显示发射保证，并增加植物枝条；
3. W9 横屏完成态增加三个轮播/分页点；
4. W11 把固定说明开头的 `按住蓄光，` 省略。

首稿文件分别为：

- `call_AfL4Ip6Kkc2nIpH3jf3oAX6s.png`
- `call_VvmLmF3AQyDSFrQlXjsn40fK.png`
- `call_0hhODZeEpV6IscNNC26TpFfb.png`
- `call_3a8A4QgYpxC0iKoCdoffLNEs.png`

它们未复制到仓库。

## 根因

生成模型把常见设计模式当成了业务真值：

- 三次揭晓被解释成“三槽位”；
- 横屏两栏被解释成 carousel；
- 相邻状态的持久控制被带入 complete；
- 语义相近的说明被当成可自由缩写文案；
- 点阵字被当成“看起来像字”而非离散 9×9 数据。

风格引用只能传递颜色、材质和构图，不能传递 phase、节点基数、文案、焦点或
公开权限。

## 修复

- 为 W4 明确“公开前缀只有 `我`、无卡槽”，并逐行提供当前 9×9 表现矩阵；
- 为 W6 明确完整五节点、唯一结果焦点、发射控制整体移除和禁止额外装饰；
- 为 W9 定向删除分页点并禁止 carousel 语汇；
- 为 W11 重发完整冻结说明；
- 对最终 15 张逐张执行 `view_image(detail="original")`；
- 把所有概念限定为 docs-only，生产状态仍由 reducer/public view 和 code-native
  DOM 生成。

## 回归验证

- 最终 15 张均已原尺寸查看；
- `docs/assets/wish-fireworks/GENERATION.md` 记录每张尺寸、字节、SHA-256、
  最终 prompt 和淘汰原因；
- W4 只公开 `我`，W6 无发射控制，W9 无分页点，W11 固定说明完整；
- 生成点阵和中文字形明确不作为生产 Oracle。

## 复用结论

逐步公开玩法必须为每帧写 presence/absence oracle：不仅列“现在有什么”，也要列
“未来节点必须不存在”。重复控件、模式标签、分页点和占位槽都应进入负面 Gate。

详见
[生成式 UI 概念是视觉证据，不是状态 Oracle](../learn/2026-07-24-generated-ui-concepts-are-not-state-oracles.md)
与
[逐步公开视觉必须验证不存在](../learn/2026-07-24-prefix-private-visual-concepts.md)。
