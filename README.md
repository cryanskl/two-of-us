# Two of Us

一个给情侣、夫妻和伴侣准备的本地优先互动体验集合：可以是送给对方的惊喜，也可以是两个人合作或对抗的小游戏。

## 立即体验

双击仓库根目录的 [`index.html`](./index.html)，即可从门户打开当前 6 个 A 级作品；它们都是纯静态页面，不需要安装依赖或启动服务器。门户还会展示“同心解锁”“隔屏画猜”“连心四子棋”和“密封猜拳”四个 C 级作品，启动本地服务后即可双设备游玩。

如果要启用局域网二维码和后续 C 级双设备房间：

1. 首次双击 macOS 的 `setup.command` 或 Windows 的 `setup.bat`；
2. 以后双击 `start.command` 或 `start.bat`，门户会自动在浏览器打开；
3. 同一 Wi-Fi 的另一台设备扫描门户二维码加入。

> 浏览器通常会限制自动播放音乐。如果页面没有声音，请先点击页面中央的爱心，再检查浏览器的音频权限。

## 作品分类

| 分类 | 目录 | 用途 | 当前状态 |
| --- | --- | --- | --- |
| 单人惊喜 | [`experiences/surprises/`](./experiences/surprises/) | 一个人准备，另一人打开体验 | Love Tree、慢慢打开的信、爱的刮刮卡、今晚做什么 |
| 双人合作 | [`experiences/co-op/`](./experiences/co-op/) | 两个人共同完成目标 | 同机你画我猜、同心解锁、隔屏画猜 |
| 双人对抗 | [`experiences/versus/`](./experiences/versus/) | 两个人比较分数或争夺胜负 | 反应力对决、连心四子棋、密封猜拳 |

## 文档

- [文档总览](./docs/README.md)
- [仓库分类与内容收录规范](./docs/01-classification-spec.md)
- [全网调研方法与判定口径](./docs/02-research-method.md)
- [第二轮本地优先调研规格](./docs/03-local-first-research-spec.md)
- [持续建设与统一运行规格](./docs/04-implementation-program-spec.md)
- [借鉴与来源声明规范](./docs/05-reference-and-attribution-spec.md)
- [C 级首款作品规格：同心解锁](./docs/06-together-lock-spec.md)
- [C 级局域网你画我猜规格](./docs/07-lan-pictionary-spec.md)
- [A 级爱的刮刮卡规格](./docs/08-scratch-surprise-spec.md)
- [C 级连心四子棋规格](./docs/09-lan-connect-four-spec.md)
- [A 级约会转盘规格](./docs/11-date-wheel-spec.md)
- [C 级密封猜拳规格](./docs/12-sealed-rps-spec.md)
- [单人惊喜类调研](./docs/10-surprise-research.md)
- [双人合作类调研](./docs/20-co-op-research.md)
- [双人对抗类调研](./docs/30-versus-research.md)
- [创意池与实现路线](./docs/40-idea-backlog.md)
- [第三方引入与许可证指南](./docs/50-license-and-import-guide.md)
- [第二轮本地优先全量调研](./docs/60-local-first-second-pass-research.md)
- [Bug 与解决方案](./bugs/README.md)
- [可复用学习笔记](./learn/README.md)

## 仓库原则

- 默认在本地运行，不要求账号，也不上传私人内容；
- 按 A–D 四级说明启动方式，不再把“必须双击 HTML”作为唯一门槛；
- 每个作品保留独立资源，方便整个目录复制和赠送；
- 双设备玩法优先使用同一局域网；只有异地游玩才考虑公网服务；
- 不默认加入远程统计、云数据库或不可替代的外部 API；
- 第三方项目先确认许可证，再决定是否复制源码；
- 私人照片、聊天、纪念日和商业音乐不应无意提交到公开仓库。

## 本地启动等级

| 等级 | 使用方式 | 适合内容 |
| --- | --- | --- |
| A | 双击 `index.html` | 轻量惊喜页、同屏或轮流小游戏 |
| B | 双击启动器，由它启动本地服务并打开浏览器 | ES Modules、`fetch()`、WebAssembly 等浏览器项目 |
| C | 一台设备启动本地房间，另一台设备通过同一局域网加入 | 手机双设备协作或对抗 |
| D | 安装或携带本地运行时、模型、大型资源后启动 | 本地 AI、语音、3D 和重资源体验 |

四级都属于仓库目标。作品还需单独标注公网依赖；默认应为“无”，异地联机可以是可选增强。

## 目录结构

```text
two-of-us/
├── index.html                  # A 级直开 / B-C 级服务共用门户
├── setup.command / setup.bat   # 首次统一安装
├── start.command / start.bat   # 此后双击启动本地服务
├── experiences/
│   ├── surprises/             # 单人惊喜
│   ├── co-op/                 # 双人合作
│   └── versus/                # 双人对抗
├── shared/runtime/             # 本地门户、房间协议、二维码
├── bugs/                       # 已复现问题与解决方案
├── learn/                      # 可复用的实现经验
├── docs/                       # 分类规范、调研和实现路线
└── archive/                    # 原始压缩包与历史配置
```

## 隐私与版权提醒

当前仓库是公开仓库。Love Tree 含有私人文案、纪念日期和一首商业录音；在继续公开分发前，请确认这些内容适合公开，并自行处理音乐授权。仓库暂未声明统一许可证，不能据此推定其中所有素材都允许再分发。
