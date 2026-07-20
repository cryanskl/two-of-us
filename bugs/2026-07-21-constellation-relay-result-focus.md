# 星座接线员：第十根接通后焦点仍停在星点

- 状态：`fixed`
- 日期：2026-07-21
- 影响作品：把星光，一笔一笔交给你
- 发现版本 / commit：前端首次实现，提交前只读复审发现

## 环境

- 文件：`experiences/co-op/constellation-relay/app.js`
- 阶段：`choosing → constellation-result`
- 输入：键盘或 click/tap

## 复现步骤

1. 完成合法路线前九根；
2. 提交第十根连接；
3. reducer 进入 `constellation-result`；
4. 检查 `document.activeElement`。

## 预期结果

焦点移到 `#constellation-result-title`，让所有输入方式立即感知“十根星线全部接通”。

## 实际结果

所有 CONNECT 都请求聚焦目标星；第十根也把焦点留在东翼枢纽。只有再次点击 FINISH 后才进入完成标题。

## 根因

焦点请求在 dispatch 前按动作类型决定，没有根据 reducer 返回的阶段区分“普通成功”和“终局成功”。

## 解决方案

dispatch 更新 view 后解析焦点：CONNECT 若进入 `constellation-result`，改为 phase title；普通成功继续聚焦新线头，失败保持原星点。

## 回归验证

- [x] 第 1–9 根成功仍随新线头
- [x] 第 10 根成功聚焦结果标题
- [x] FINISH 后聚焦 complete 标题
- [x] 失败不移动星点焦点

## 相关提交

- 前端修复：`81c3428`
