# 借鉴与来源声明

本文件区分游戏代码、地图数据、运行依赖和未来视觉资产。当前 core 阶段只包含地图数据派生与非视觉逻辑，不包含生产 UI。

## Natural Earth 地图数据

- 项目：[Natural Earth Vector](https://github.com/nvkelso/natural-earth-vector)
- 固定版本：`v5.1.2`
- 固定 commit：[`f1890d9f152c896d250a77557a5751a93d494776`](https://github.com/nvkelso/natural-earth-vector/tree/f1890d9f152c896d250a77557a5751a93d494776)
- 固定输入：[`geojson/ne_110m_land.geojson`](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/f1890d9f152c896d250a77557a5751a93d494776/geojson/ne_110m_land.geojson)
- 权利状态：[Natural Earth Terms of Use](https://www.naturalearthdata.com/about/terms-of-use/) 声明网站上的 Natural Earth 栅格与矢量地图数据为 public domain
- 原始输入 SHA-256：`9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`
- 派生输出：`assets/ne-110m-land.min.geojson`
- 派生输出 SHA-256：`54f84f3d2eac224a46f10010c4a1a8446331a35711ccced0e1905e13e574f148`
- 派生脚本：`tools/vendor-map.mjs`

实际使用仅限 1:110m 物理陆地 Polygon / MultiPolygon。派生脚本验证固定输入哈希，删除名称、属性和旧式 CRS，并把坐标确定性规范到六位小数。运行页面只读取仓库内的派生文件，不联网请求 Natural Earth 或 GitHub。

Made with Natural Earth.

本作不使用 Natural Earth 的行政边界、国家、城市、标签、道路、栅格图、网页视觉或第三方地图截图。该小比例尺数据经过概化，不用于导航、精确测量或主权判断。

## Posio 概念调研

- 项目：[abrenaut/posio](https://github.com/abrenaut/posio)
- 固定 commit：[`00262568749fa841994f4c7d6d9a8c75115955d7`](https://github.com/abrenaut/posio/tree/00262568749fa841994f4c7d6d9a8c75115955d7)
- 许可证：[MIT](https://github.com/abrenaut/posio/blob/00262568749fa841994f4c7d6d9a8c75115955d7/LICENSE.txt)
- 权利主体：Copyright (c) 2024 Arthur Brenaut

只研究“多人在地图落点、揭晓目标后计算距离、同步回合”这一抽象问题。本作没有复制、改写、翻译、移植、打包或依赖 Posio 的 Python、Django、Channels、Redis、HTMX、Leaflet、数据库模型、协议、模板、测试、UI、地图风格、配色、图标、题库、文案、截图、演示数据或其他素材。

## Socket.IO 与仓库内部经验

- [Socket.IO 4.8.1](https://github.com/socketio/socket.io/tree/91e1c8b3584054db6072046404a24e79a17c1367/packages/socket.io) 是仓库现有统一运行依赖；固定版本采用 [MIT LICENSE](https://github.com/socketio/socket.io/blob/91e1c8b3584054db6072046404a24e79a17c1367/packages/socket.io/LICENSE)，`Copyright (c) 2014-present Guillermo Rauch and Socket.IO contributors`。后续 UI 只调用仓库已有的房间、定向消息与密封提交协议，不复制或改写 Socket.IO 示例代码、文档、视觉或素材。
- 本仓库 `compatibility-quiz`、`sealed-rps`、`lan-pictionary`、`lan-connect-four`、`panorama-memory` 与 `fog-navigation` 只提供内部的密封结果、主机权威、成员变化清局、本地文件隐私和阶段秘密经验。本项目的题包、地图数学、距离、状态机和协议门控会独立实现。

## 本项目原创部分

本项目的游戏规则、题包 schema、虚构示例、距离与共同档位、状态机、协议校验、测试和文字均由本仓库独立编写。私人题包属于准备者，不随仓库分发。

当前 core 阶段没有引入第三方图片、图标、字体、音频、视频、地图截图或 UI 资产。未来生产 UI 若增加原创或生成视觉，必须在此文件追加真实来源，不能沿用本段冒充已完成声明。
