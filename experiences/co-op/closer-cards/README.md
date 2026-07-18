# 靠近一点

两个人在同一台设备前，轮流翻开并回答六张谈话卡。每张卡由一席先说、另一席再说；没有倒计时、评分或输赢，任何时候都可以中性地换一张。

## 怎么打开

这是 A 级体验。直接双击本目录的 `index.html` 即可开始，不需要安装依赖、启动服务或连接公网；也可以从 Two of Us 根门户进入。

## 怎么玩

1. 点击“开始靠近”，第一张先保持卡背；
2. 两个人都准备好后翻开问题；
3. 卡面指定的一席先回答，点击“我说完了”后换另一席；
4. 双方都说完后收好这张，下一张换另一席先说；
5. 不想回答时随时点“换一张”，不扣分，也不需要解释；
6. 认真聊完六张即共同完成。

## 本地优先与隐私

- 公网依赖与第三方运行依赖：无；
- 不使用输入框、麦克风、摄像头、文件读取、账号或远程服务；
- 回答只在现实中说出，页面不接收、不显示，也不保存答案；
- 卡背阶段的 DOM 不包含当前问题，翻卡后才渲染题目；
- 卡序、完成与跳过记录只存在于当前页面内存；刷新即清空；
- 不使用 `fetch`、XHR、WebSocket、localStorage、sessionStorage、IndexedDB、Cache API、Service Worker、统计或遥测。

## 个性化

可以在 `config.js` 修改两席名字和首发席。`chooseOpeningCard` 是一个预留的本机策略函数：保留 `null` 会平衡随机；返回 `logic.js` 中某张合法卡的 ID，可以让那张卡成为开场。策略异常或返回非法值会安全回退。

## 借鉴与来源声明

| 项目 | 原作者与来源 | 借鉴类型 | 本作品实际使用 | 许可证 | 本仓库的处理 |
| --- | --- | --- | --- | --- | --- |
| CoupleCards | [Michael Schwartz / michaelsboost/CoupleCards @ `94ac422`](https://github.com/michaelsboost/CoupleCards/tree/94ac422ba393d5aa8c709527dab6f1f6e4156cc1) | 玩法机制 | 仅参考“本地抽取谈话提示”这一通用机制 | [MIT，Copyright 2025 Michael Schwartz](https://github.com/michaelsboost/CoupleCards/blob/94ac422ba393d5aa8c709527dab6f1f6e4156cc1/LICENSE.md) | 没有读取、复制、改写或运行其源码、题库与素材 |
| couplecards | [Qiaeru / qiaeru/couplecards @ `c3e4d1e`](https://github.com/qiaeru/couplecards/tree/c3e4d1ef15651caa72b261677e65dc9beda8bd13) | 产品边界比较 | 只比较账户、历史、PWA 与后端等重型能力 | MIT，Copyright 2026 Qiaeru | 本作不采用账户、后端、历史、禁卡、遥测或 Service Worker |

### 独立实现说明

除上表明确列出的通用机制与边界比较外，六张仪式、双人轮流、无惩罚跳过、三主题平衡洗牌、24 条中文问题、状态机、HTML、CSS、JavaScript 和测试均为本仓库独立实现。零代码、零题目、零视觉素材借用。`nivaboaz/CoupleCards` 只作为发现原始项目的线索，不作为独立来源计数。

视觉概念和无字午夜纸纹由 OpenAI ImageGen 于 2026-07-18 根据 [`docs/61-closer-cards-spec.md`](../../../docs/61-closer-cards-spec.md) 生成。概念图只作设计基准，不进入运行页；运行页仅加载本作品的 `assets/midnight-paper.png`，其来源记录在 `assets/ATTRIBUTION.md`。

## 文件

- `config.js`：两席名字、首发与可选开场卡策略；
- `logic.js`：原创题库、平衡计划与纯状态机；
- `logic.test.js`：规则、隐私边界与畸形输入回归；
- `app.js`：安全随机、阶段 DOM、焦点和页面编排；
- `styles.css`：编辑式沙龙、桌面/手机布局和 reduced motion；
- `assets/ATTRIBUTION.md`：生成式运行资产与未复制边界；
- `index.html`：A 级直接入口。

完整浏览器与保真验收将在 [`docs/62-closer-cards-verification.md`](../../../docs/62-closer-cards-verification.md) 记录。
