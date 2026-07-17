# 为你引航

「为你引航」是一款本地优先的双人非对称合作体验。灯塔玩家转动光束、发现航标并照亮港口；小船玩家操舵和推进，借着灯光绕过暗礁，低速靠港。两套控制互不替代，三段夜航全部完成后才算一起回家。

## 启动

本作品为 A 级体验，不需要安装依赖、启动服务器或连接网络。

1. 打开本目录中的 `index.html`；
2. 点击“点亮海面”；
3. 两名玩家在同一台设备上使用键盘或两组触控按钮开始领航。

macOS 也可以在仓库根目录执行：

```sh
open experiences/co-op/lighthouse-passage/index.html
```

## 操作

| 角色 | 键盘 | 触屏 | 职责 |
| --- | --- | --- | --- |
| 灯塔 | `A` / `D` | 逆时针 / 顺时针旋转按钮 | 转动光束，显露暗礁，发现航标，并在靠港时持续照亮港口 |
| 小船 | `↑` 推进、`↓` 减速或倒车、`←` / `→` 操舵 | 四向船舵 | 控制船的位置、速度和朝向，绕过暗礁并稳定靠港 |

- “暂停”会冻结游戏并清空当前输入；恢复后不会继续执行旧按键。
- “重来”从第一幕重新开始。
- “玩法”打开当前规则和控制说明。
- 页面失焦或切到后台时会自动暂停，避免无人操作时继续航行。

## 规则

游戏包含三幕原创夜航路线：

1. **第一束光**：学习用光束显露暗礁、发现航标并低速靠港；
2. **雾中转弯**：灯塔提前扫描，小船沿 S 形路线延迟转向；
3. **一起入港**：连续换向穿过窄门，最后共同完成反向微调。

核心规则如下：

- 光束扫过暗礁后，暗礁只会显露一段时间；
- 必要航标被光束照到后会永久记为已发现；
- 检查点必须先被灯塔发现，再由小船进入，才能成为新的安全出生点；
- 小船碰到暗礁或越过海图边界时，回到最近检查点；已发现的航标和灯塔扫描进度保留；
- 完成一幕必须同时满足：必要航标全部发现、港口正在受光、小船进入港区、速度足够低、船头方向正确，并稳定保持约 `0.6s`；
- 只开船不照路、只照路不开船、未找齐航标或高速掠过港口都不能完成。

## A 级与隐私边界

- `index.html` 只加载同目录的经典脚本、样式和两张本地图片，可直接通过 `file://` 运行；
- 不使用 ES Module、`fetch`、XHR、WebSocket、CDN、远程字体、Service Worker、`localStorage`、IndexedDB 或 Cache API；
- 不收集姓名、按键、航线、碰撞次数、设备信息或游戏历史，也不向外部服务发送数据；
- 作品没有账号、联网房间、排行榜、统计或遥测；
- 两名玩家围在同一块屏幕前，物理上都能看到完整页面。本作品提供的是**控制职责和信息呈现的角色分工**，不声称密码学意义、设备级或隐私意义上的秘密隔离。

## 实现说明

- 规则世界固定为 `960 × 540`，灯塔、船、光束、暗礁、航标、检查点和港口都在统一世界坐标中计算；
- `levels.js` 保存三幕冻结几何并校验关卡 schema；
- `logic.js` 使用固定 `1 / 120s` 时间步处理灯塔角速度、小船惯性、光束命中、碰撞、检查点和靠港 Gate；
- `app.js` 负责 Canvas 投影、图集裁切、输入集合、动画帧 accumulator、暂停生命周期和无障碍文本；
- `levels.js` 与 `logic.js` 使用经典脚本全局工厂，既能被浏览器直接加载，也能被 Node 测试导入；
- 光束可见性是规则状态的派生结果，Canvas 只渲染结果，不能从像素、透明度或动画反推规则；
- 第一版不抽取通用物理引擎，也不引入第三方运行依赖。

## 生成资产说明

本作品的概念图和运行资产均由本项目于 2026-07-17 使用 OpenAI 内置图像生成工具生成，不是从下方调研项目复制或改写的素材：

- [桌面概念图](../../../docs/assets/lighthouse-passage/desktop-concept.png)；
- [移动概念图](../../../docs/assets/lighthouse-passage/mobile-concept.png)；
- [4 × 3 图集源稿](../../../docs/assets/lighthouse-passage/sprite-atlas-source.png)；
- [生产背景](./assets/playfield-background.png)；
- [生产图集](./assets/sprite-atlas.png)。

图集源稿使用技能自带的 `remove_chroma_key.py` 和一次性 `uv run --with pillow` 去除洋红背景并转换为 RGBA。Pillow 只参与开发期图像处理，不是仓库安装依赖或作品运行依赖。Canvas 运行时从本地图集裁切灯塔、小船、暗礁、航标、港口、检查点、浪花、雾和完成火花；动态光束由标准 Canvas 2D API 绘制。

## 借鉴与来源声明

下表区分浏览器标准 API、技术比较、架构比较、已排除代码和已排除素材。除 WHATWG 定义的浏览器标准 API 外，下列项目的代码、运行时和素材均未进入本作品。

| 项目 | 原作者与固定来源 | 借鉴类型 | 本作品实际使用 | 许可证 | 本仓库的处理 |
| --- | --- | --- | --- | --- | --- |
| WHATWG HTML Canvas 2D | [WHATWG HTML `410fd5d09f64ac21c13264f652749b706d1d73d0`](https://github.com/whatwg/html/tree/410fd5d09f64ac21c13264f652749b706d1d73d0)，Copyright © WHATWG（Apple、Google、Mozilla、Microsoft） | 浏览器标准 API | 使用浏览器原生 `save / translate / rotate / clip / restore` 绘制动态光束 | [规范文本 CC BY 4.0；纳入源码的部分 BSD-3-Clause](https://github.com/whatwg/html/blob/410fd5d09f64ac21c13264f652749b706d1d73d0/LICENSE) | 直接调用浏览器标准 API；未复制规范文本、示例代码或素材，也没有新增运行依赖 |
| Matter.js | [liabru/matter-js `0.20.0` / `8a67787735585f02c4b46eabf7b9fcc1c7c321da`](https://github.com/liabru/matter-js/tree/8a67787735585f02c4b46eabf7b9fcc1c7c321da)，Liam Brummitt and contributors | 技术比较 | 仅比较空气阻尼、施力、扭矩和角速度概念 | [MIT](https://github.com/liabru/matter-js/blob/8a67787735585f02c4b46eabf7b9fcc1c7c321da/LICENSE) | 不引入 Matter.js，不复制积分、碰撞代码、示例或素材；船舵与惯性模型自行实现 |
| rot.js | [ondras/rot.js `2.2.1` / `46782e248c2db9d379a5e4f13bb8323f18dff04b`](https://github.com/ondras/rot.js/tree/46782e248c2db9d379a5e4f13bb8323f18dff04b)，Copyright © 2012-now(), Ondrej Zara | 技术比较 | 仅比较“范围与遮挡产生可见性”的纯函数边界 | [BSD-3-Clause](https://github.com/ondras/rot.js/blob/46782e248c2db9d379a5e4f13bb8323f18dff04b/license.txt) | 不引入 rot.js，不移植格网阴影投射算法、演示或素材；本作自行实现圆形目标的有限扇形命中 |
| boardgame.io | [boardgameio/boardgame.io `0.50.2` / `2945c30e536517cf819e000f33d9d08bacaac297`](https://github.com/boardgameio/boardgame.io/tree/2945c30e536517cf819e000f33d9d08bacaac297)，Copyright © 2017 The boardgame.io Authors | 架构比较 | 仅比较从权威状态按角色投影视图的结构 | [MIT](https://github.com/boardgameio/boardgame.io/blob/2945c30e536517cf819e000f33d9d08bacaac297/LICENSE) | 不引入 boardgame.io、Redux、Socket.IO、Koa 或其示例；同屏只描述角色分工，不声称秘密隔离 |
| trylock/visibility | [trylock/visibility `71eb5c00692713abd870113f3efc943322486d8e`](https://github.com/trylock/visibility/tree/71eb5c00692713abd870113f3efc943322486d8e)，Copyright © 2017 trylock | 技术比较 | 仅比较角度排序与射线可见性问题 | [MIT](https://github.com/trylock/visibility/blob/71eb5c00692713abd870113f3efc943322486d8e/LICENSE) | 不引入或复制其 C++ 实现、测试或示例；本作采用更小的圆形目标扇形命中函数 |
| seaworthy 代码 | [mwa/seaworthy `70866deff34d5e895c14852b39a6aa8ec7d9b6ac`](https://github.com/mwa/seaworthy/tree/70866deff34d5e895c14852b39a6aa8ec7d9b6ac)，Copyright © 2020 Mathias Walker | 排除项：航行项目比较 | 未使用 | [代码 MIT](https://github.com/mwa/seaworthy/blob/70866deff34d5e895c14852b39a6aa8ec7d9b6ac/LICENSE.txt) | 未复制其航行模型、Godot 代码、Kenney 素材、音效或其他资产 |
| seaworthy 音乐 | `sidebyside`，panu，Copyright © 2020；由 [seaworthy README](https://github.com/mwa/seaworthy/blob/70866deff34d5e895c14852b39a6aa8ec7d9b6ac/README.md#music) 单独声明 | 排除项：第三方音乐 | 未使用 | CC BY-NC 3.0 | 非商业限制不适合作为本仓库可广泛复用的运行素材；未下载、复制、改编或分发该音乐 |

### 独立实现说明

本作品的情侣语义、三幕关卡、状态机、固定步规则、灯塔与船控制、光束命中、碰撞、检查点、靠港 Gate、中文文案、DOM、CSS、Canvas 绘制和生成视觉资产均在本仓库内独立完成。上表中 Matter.js、rot.js、boardgame.io 与 trylock/visibility 仅用于开发前的技术比较，没有引入、复制、翻译或改写其源码；seaworthy 的代码与素材均被明确排除。

自动检查、Chrome 交互、响应式尺寸和视觉对照见[验收记录](../../../docs/31-lighthouse-passage-verification.md)。
