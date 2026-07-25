# 窄屏隐藏双方状态投影

日期：2026-07-26
项目：`ricochet-tank-duel`

## 现象

生产样式在 `max-width: 480px` 下把 `.player-status` 设置为 `display: none`。
320–480 px 页面仍有 Canvas、比分和事件带，但双方朝向、粗粒度位置、在途数、
冷却和来弹提示不再可见。

## 影响

这破坏了已确认设计中的 Canvas 外文本投影合同，也让窄屏用户比桌面用户少一层
不依赖颜色和图形的状态信息。DOM 虽然仍存在，但 `display: none` 同时会把内容
移出可访问性树，不能视为可用降级。

## 根因

为了让移动首屏更短，响应式实现把整个状态轨当成可删除的次要装饰，而没有区分
“压缩布局”和“删除语义状态”。

## 修复

- 加入失败契约，禁止 480 px 媒体查询隐藏 `.player-status`；
- 保留双方完整字段；
- 在窄屏只缩小间距、内边距和字号，让既有双列回流继续生效。

## 回归

```bash
node --test experiences/versus/ricochet-tank-duel/tests/ui-contract.test.js
```

结果：8 / 8 通过。
