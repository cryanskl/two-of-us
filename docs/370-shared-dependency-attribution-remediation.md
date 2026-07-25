# 共享依赖借鉴声明修复记录

- 日期：2026-07-25
- 基线：`1169d67b1cee3dc6f5bd1a57b54867c06114d059`
- 分支：`codex/fix-shared-dependency-attribution`
- 范围：Socket.IO 4.8.1、node-qrcode 1.5.4、Pannellum 2.5.7 的真实依赖声明

## 1. 结论

本轮关闭了
[`bugs/2026-07-25-shared-dependency-attribution-link-drift.md`](../bugs/2026-07-25-shared-dependency-attribution-link-drift.md)
记录的 P1 问题：

- 三个根直接依赖均固定到 npm 发布对应的不可漂移 commit；
- 源码 URL 与许可证 URL 使用同一 revision；
- 声明补齐许可证名称、版权主体、实际使用与未复制边界；
- 共享运行时覆盖 Socket.IO、node-qrcode 和它实际暴露的 Pannellum；
- 6 个已安装 Socket.IO 消费者全部覆盖；
- Pannellum 的唯一消费者“全景回忆”覆盖；
- 尚未安装的 `our-place-guess` 保留“后续 UI”边界，但其计划使用的 Socket.IO
  证据也已固定，避免接入时继续复制浮动声明。

本轮没有升级依赖、修改 lockfile、复制上游代码或许可证正文，也没有修复无关研究
来源的浮动链接。

## 2. 上游固定证据

2026-07-25 使用 npm 官方 registry、上游 Git tags、固定 GitHub 页面与许可证正文
现场复核：

| 依赖 | npm/tag 对应提交 | 固定源码 | 固定许可证与版权 |
| --- | --- | --- | --- |
| Socket.IO 4.8.1 | `socket.io@4.8.1` → `91e1c8b3584054db6072046404a24e79a17c1367` | [packages/socket.io](https://github.com/socketio/socket.io/tree/91e1c8b3584054db6072046404a24e79a17c1367/packages/socket.io) | [MIT LICENSE](https://github.com/socketio/socket.io/blob/91e1c8b3584054db6072046404a24e79a17c1367/packages/socket.io/LICENSE)；Copyright (c) 2014-present Guillermo Rauch and Socket.IO contributors |
| node-qrcode 1.5.4 | `v1.5.4` peel / npm `gitHead` → `3848ed2c17de5bcdead487417dbf14c5dd017f8d` | [node-qrcode](https://github.com/soldair/node-qrcode/tree/3848ed2c17de5bcdead487417dbf14c5dd017f8d) | [MIT `license`](https://github.com/soldair/node-qrcode/blob/3848ed2c17de5bcdead487417dbf14c5dd017f8d/license)；Copyright (c) 2012 Ryan Day |
| Pannellum 2.5.7 | `2.5.7` → `a5e2f25d960270b6cdd6136d2c18c21f745bba0e` | [Pannellum](https://github.com/mpetroff/pannellum/tree/a5e2f25d960270b6cdd6136d2c18c21f745bba0e) | [MIT `COPYING`](https://github.com/mpetroff/pannellum/blob/a5e2f25d960270b6cdd6136d2c18c21f745bba0e/COPYING)；Copyright (c) 2011-2026 Matthew Petroff |

以上 6 个固定页面均返回 HTTP 200；版权行与固定许可证正文、本地 npm 包许可证一致。
Socket.IO 原声明使用的 `tree/4.8.1` 与 `blob/4.8.1/LICENSE` 返回 404，原因是 monorepo
发布 tag 实际名为 `socket.io@4.8.1`。

## 3. 真实使用边界

### Socket.IO

`shared/runtime/server.js` 导入并实例化 Socket.IO 服务端，同时由依赖提供浏览器
客户端 bundle。6 个 installed HTML 入口实际加载 `/socket.io/socket.io.js`：

- `together-lock`
- `lan-pictionary`
- `compatibility-quiz`
- `lan-connect-four`
- `sealed-rps`
- `heart-sprint`

作品只调用共享运行时封装的连接、房间、广播、acknowledgment、定向消息或密封轮次
能力。仓库没有把 Socket.IO 包源码、示例、文档、视觉或素材另行 vendoring 到作品
目录；这不等于“零第三方代码”，npm 安装的服务端与客户端 bundle 是实际依赖。

### node-qrcode

只有 `shared/runtime/server.js` 直接调用 `QRCode.toDataURL()`，生成本地局域网入口
二维码；作品入口不直接导入 qrcode，因此只在共享运行时集中声明。仓库没有复制其
示例源码、文档、视觉或素材。

### Pannellum

共享运行时从 npm 包 `build/` 目录映射两个固定白名单资源，只有
`panorama-memory` 加载并调用它们。项目不公开整个 `node_modules`，也不复制上游
源码、示例配置、示例全景、文档文案或视觉素材。

离线或发布包如果包含上述 npm 包或其构建产物，必须同时保留对应许可证与版权声明。

## 4. 文件覆盖

| 文件 | 修复内容 |
| --- | --- |
| `shared/runtime/README.md` | 三个实际根依赖的统一固定证据和使用边界 |
| `experiences/surprises/panorama-memory/README.md` | Pannellum 固定 commit、COPYING、版权 |
| `experiences/co-op/together-lock/README.md` | Socket.IO 固定证据与分发边界 |
| `experiences/co-op/lan-pictionary/README.md` | Socket.IO 固定证据 |
| `experiences/co-op/compatibility-quiz/README.md` | Socket.IO 固定证据 |
| `experiences/versus/lan-connect-four/README.md` | Socket.IO 固定证据、实际 API 与分发边界 |
| `experiences/versus/sealed-rps/README.md` | Socket.IO 固定证据 |
| `experiences/versus/heart-sprint/README.md` | 修复两个 404 URL，补完整版权与分发边界 |
| `experiences/co-op/our-place-guess/ATTRIBUTION.md` | 固定计划使用的 Socket.IO 证据，不改变 core-only 状态 |

## 5. 回归策略

新增 `scripts/dependency-attribution.test.mjs`：

1. 将三个声明版本与根 `package.json` 精确版本对齐；
2. 从 installed catalog 的 HTML 自动发现 `/socket.io/socket.io.js` 消费者，并要求
   与 6 个受控 README 一一对应；
3. 检查每份真实依赖声明都含固定源码 URL、同 revision 许可证 URL、完整版权主体、
   项目自己的实际使用和未复制边界；
4. 从 `shared/runtime/server.js` 确认 node-qrcode 实际导入；
5. 从 `panorama-memory/index.html` 确认 Pannellum 固定白名单 JS/CSS 实际加载。

红测提交 `61ada43` 在修复前为 1 pass / 2 fail，首先指出共享运行时缺
Socket.IO/node-qrcode 固定源码 URL。文档修复提交 `a21d05b` 后为 3/3 通过。

## 6. 验收

最终全仓测试、repository verify、固定网络链接、本地 Markdown 链接和
`git diff --check 1169d67..HEAD` 的结果将在本分支完成后追加。

## 7. 借鉴与来源声明

本文只使用第 2 节列出的三个上游固定仓库、许可证文件和 npm 包元数据核对依赖
身份。没有复制或改写上游代码、示例、文档正文、视觉或素材；测试和修复记录均为
针对本仓库实际依赖图的独立实现。
