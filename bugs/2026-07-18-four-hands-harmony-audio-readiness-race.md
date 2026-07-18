# 这一拍，刚好和你：音频准备竞态导致完成和弦漏播或旧状态回写

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：这一拍，刚好和你
- 发现版本 / commit：`2d36851 feat: add four hands harmony experience`

## 环境

- 操作系统：macOS
- 浏览器：Chromium 系浏览器；共享播放器 `ensureReady()` 异步返回
- 启动等级与入口：A 级，`file://` 或本地静态入口

## 复现步骤

### 完成音漏播

1. 让当前播放器的 `ensureReady()` 保持 pending。
2. 在它完成前合好第一节。
3. 再让 `ensureReady()` 返回 `true`。

### 旧状态覆盖

1. 让旧播放器的 `ensureReady()` 保持 pending。
2. 暂停并立即继续，使新播放器先返回 ready。
3. 再让旧 Promise 返回 `false`。

## 预期结果

准备期间完成的和弦在当前播放器 ready 后只补播一次；已经被释放或替换的播放器不再改变声音状态。

## 实际结果

旧实现会在尚未 ready 时先推进 `playedCompletedCount`，使完成音永久漏播；同时异步回调没有播放器身份校验，旧 Promise 可以覆盖新播放器的 ready 状态。

## 根因

`audioReady` 一个布尔值同时承担“尚在准备”和“明确失败”两种含义，且 `prepareAudio()` 直接在 `await` 后写全局状态，没有验证等待期间播放器是否已经更换。

## 解决方案

- 增加 `audioPreparing`，准备期间保留 `playedCompletedCount` 与完成数之间的待播区间；
- ready 后从该区间按完成顺序且仅一次补播，明确失败、关闭声音或释放时才标为跳过；
- 增加单调 `audioGeneration`，`prepareAudio()` 同时捕获 generation 和播放器引用，只有二者仍为当前值才写回；
- 替换或释放播放器时立即递增 generation，使旧 Promise 失效。

## 回归验证

- [x] 三份脚本语法检查通过
- [x] C04 逻辑测试 66 / 66 通过
- [x] 全仓测试 536 / 536，统一验收确认 40 个作品入口
- [ ] 浏览器延迟 ready 与旧 Promise 竞态路径通过

## 相关提交

- 待本次修复提交后补充
