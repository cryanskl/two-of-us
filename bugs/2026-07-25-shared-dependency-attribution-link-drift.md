# Bug：共享依赖借鉴声明包含失效或未固定的来源链接

- 状态：`resolved`
- 日期：2026-07-25
- 影响作品：`heart-sprint` 的 Socket.IO 声明；共享运行时及所有复用 Socket.IO、node-qrcode、Pannellum 的作品
- 发现版本 / commit：`260c0bfcde8adcd1c5e119cab88f1b9e19117703`

## 环境

- 操作系统：macOS
- 浏览器与版本：不涉及；使用 HTTPS 状态探针
- 启动等级与入口：共享运行时、B / C / D 作品 README

## 复现步骤

1. 读取 `experiences/versus/heart-sprint/README.md` 的 Socket.IO 来源与许可证链接。
2. 跟随重定向请求 `https://github.com/socketio/socket.io/tree/4.8.1` 和 `https://github.com/socketio/socket.io/blob/4.8.1/LICENSE`。
3. 对照请求实际固定 tag：`https://github.com/socketio/socket.io/tree/socket.io%404.8.1` 和对应 LICENSE。
4. 检查 `shared/runtime/README.md` 以及其他复用作品的 Socket.IO、node-qrcode、Pannellum 声明是否固定到版本 tag。

## 预期结果

每份借鉴声明都应给出可访问、不可随默认分支漂移的固定来源 URL，并同时写明版本、许可证状态、实际使用内容和未复制边界。

## 实际结果

- `heart-sprint` 的两个 `4.8.1` URL 均返回 HTTP 404；Socket.IO monorepo 的真实固定 tag 是 `socket.io@4.8.1`。
- `shared/runtime/README.md` 和多份作品 README 虽写了依赖版本与借鉴边界，但链接仍指向仓库根目录，不能单独证明所述版本的源码与许可证。
- 安装后的三个直接依赖包都声明 MIT，且各自携带许可证文件；问题是仓库内声明的固定来源证据漂移，不是当前安装包缺少许可证。

## 根因

Socket.IO 的发布 tag 命名包含包名前缀，声明按普通 `4.8.1` tag 拼接，产生不存在的地址。其他声明记录了版本文本，却没有把链接固定到同一 tag。

## 解决方案

本审计分支按约束不修改共享运行时或作品 README。建议总控串行统一替换：

| 依赖 | 固定源码 | 固定许可证 |
| --- | --- | --- |
| Socket.IO 4.8.1 | `https://github.com/socketio/socket.io/tree/socket.io%404.8.1` | `https://github.com/socketio/socket.io/blob/socket.io%404.8.1/LICENSE` |
| node-qrcode 1.5.4 | `https://github.com/soldair/node-qrcode/tree/v1.5.4` | `https://github.com/soldair/node-qrcode/blob/v1.5.4/license` |
| Pannellum 2.5.7 | `https://github.com/mpetroff/pannellum/tree/2.5.7` | `https://github.com/mpetroff/pannellum/blob/2.5.7/COPYING` |

替换时保留现有“只调用公开 API / 白名单资产、未复制示例源码、文档、视觉或素材”的实际借鉴与未复制边界，不需要复制上游许可证正文到每个作品目录。

## 回归验证

- [x] 失效的 Socket.IO 两个 URL 均复现 HTTP 404
- [x] 三组建议固定源码 URL 均返回 HTTP 200
- [x] `node_modules` 中三个直接依赖均为精确版本、MIT 且携带许可证文件
- [x] 新增结构测试，自动发现 6 个 installed Socket.IO 消费者并验证三项依赖声明
- [x] 共享运行时、真实依赖入口与 `our-place-guess` 计划依赖已统一到固定 commit
- [x] `npm run verify` 通过；全仓 112 个测试文件、2304/2304 通过

## 借鉴与来源声明

本记录只核对上表三个开源依赖的固定官方仓库和许可证文件。没有复制或改写上游代码、示例、文档正文、视觉或素材；许可证状态同时以安装包 metadata 和固定版本许可证为证据。

## 相关提交

- `61ada43`：先加入失败的依赖归因结构测试
- `a21d05b`：统一固定共享运行时与真实依赖入口的来源、许可证和版权
