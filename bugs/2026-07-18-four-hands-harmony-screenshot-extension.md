# 这一拍，刚好和你：浏览器截图字节为 JPEG 却保存成 PNG 扩展名

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：这一拍，刚好和你的浏览器验收证据
- 发现版本 / commit：`552d35f test: capture four hands responsive evidence`

## 环境

- 操作系统：macOS
- 工具：Codex in-app browser screenshot API、系统 `file`
- 启动等级与入口：localhost 浏览器验收

## 复现步骤

1. 调用浏览器 `tab.screenshot()` 获取二进制字节。
2. 以 `.png` 文件名保存。
3. 运行 `file docs/assets/four-hands-harmony/*.png`。

## 预期结果

文件扩展名与实际图片 magic bytes 一致。

## 实际结果

两张截图都被 `file` 识别为 JFIF JPEG；`.png` 扩展名可能让文档渲染器或后续压缩工具选择错误解码路径。

## 根因

保存时根据预期截图格式命名，没有在提交前核验浏览器后端返回的实际编码。

## 解决方案

不重编码原始截图，只将两张证据图重命名为 `.jpg`；后续验收文档引用新路径，并把 `file` 检查列入证据 Gate。

## 回归验证

- [x] `file` 确认两张 `.jpg` 均为 JPEG/JFIF
- [x] 分辨率保持桌面 1504×892、移动 390×844
- [x] Git 识别为 100% rename，字节内容未改变

## 相关提交

- 待本次修复提交后补充
