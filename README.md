# Two of Us

一个给情侣、夫妻和伴侣准备的本地优先互动体验集合：可以是送给对方的惊喜，也可以是两个人合作或对抗的小游戏。

## 立即体验

双击仓库根目录的 [`index.html`](./index.html)，即可进入当前已收录的 [Love Tree](./experiences/surprises/love-tree/index.html)。它属于 A 级：纯静态页面，不需要安装依赖或启动服务器。

> 浏览器通常会限制自动播放音乐。如果页面没有声音，请先点击页面中央的爱心，再检查浏览器的音频权限。

## 作品分类

| 分类 | 目录 | 用途 | 当前状态 |
| --- | --- | --- | --- |
| 单人惊喜 | [`experiences/surprises/`](./experiences/surprises/) | 一个人准备，另一人打开体验 | 已收录 Love Tree |
| 双人合作 | [`experiences/co-op/`](./experiences/co-op/) | 两个人共同完成目标 | 等待实现 |
| 双人对抗 | [`experiences/versus/`](./experiences/versus/) | 两个人比较分数或争夺胜负 | 等待实现 |

## 文档

- [文档总览](./docs/README.md)
- [仓库分类与内容收录规范](./docs/01-classification-spec.md)
- [全网调研方法与判定口径](./docs/02-research-method.md)
- [单人惊喜类调研](./docs/10-surprise-research.md)
- [双人合作类调研](./docs/20-co-op-research.md)
- [双人对抗类调研](./docs/30-versus-research.md)
- [创意池与实现路线](./docs/40-idea-backlog.md)
- [第三方引入与许可证指南](./docs/50-license-and-import-guide.md)

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
├── index.html                  # 兼容入口，当前直达 Love Tree
├── experiences/
│   ├── surprises/             # 单人惊喜
│   ├── co-op/                 # 双人合作
│   └── versus/                # 双人对抗
├── docs/                       # 分类规范、调研和实现路线
└── archive/                    # 原始压缩包与历史配置
```

## 隐私与版权提醒

当前仓库是公开仓库。Love Tree 含有私人文案、纪念日期和一首商业录音；在继续公开分发前，请确认这些内容适合公开，并自行处理音乐授权。仓库暂未声明统一许可证，不能据此推定其中所有素材都允许再分发。
