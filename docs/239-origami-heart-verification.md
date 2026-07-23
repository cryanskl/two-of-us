# “沿着折痕，折到你心里”验收记录

## 结论

S16“折纸心机关”已经实现并正式收录为 A 级单人惊喜“沿着折痕，折到你心里”。

生产路径为零第三方运行时、零第三方素材、零远程资源；用户无需安装依赖。五道折痕可以通过 Pointer 拖动、原生按钮或键盘完成，最后必须主动翻面才创建私人短笺 DOM。

仓库当前验收口径为 56 个已安装作品，其中 48 个 A 级直开、8 个非 A 启动器。

## 独立提交

| 部分 | commit |
| --- | --- |
| brainstorm 与定向调研 | `ba924f2` |
| 许可证历史推断修正 | `51932bb` |
| 可执行规格 | `fd0d8e7` |
| 视觉系统冻结 | `ac2ef27` |
| 实施与目录计划 | `facff4a`、`d11d85e` |
| 配置、纯逻辑与 22 项测试 | `68d7cfa` |
| HTML/CSS/UI、归因、favicon 与浏览器 bug 记录 | `ad7ab9e` |
| catalog、门户、分类、统计与静态合同 | `4848c1f` |
| 可复用拖拽知识沉淀 | `0e73736` |

## 自动化证据

### 纯逻辑

执行：

```bash
node --check experiences/surprises/origami-heart/config.js
node --check experiences/surprises/origami-heart/logic.js
node --check experiences/surprises/origami-heart/logic.test.js
node --test experiences/surprises/origami-heart/logic.test.js
```

结果：22 / 22 通过。

覆盖：

- 浏览器经典全局、真实 CommonJS `require()` 与冻结 API；
- 四字段配置的 NFC/空白规范化、码点上限、整份回退与引用隔离；
- hostile schema、getter、Proxy 与 descriptor 单次观察；
- 五种方向投影、0–1 截断、0.72 提交阈值与非法数值；
- intro → folding 1–5 → turning → complete 的严格前缀；
- 错阶段、错 fold ID、畸形状态与同引用 no-op；
- JSON 往返与确定重放；
- complete 前 public view 结构性不含私人配置；
- 逻辑层无 DOM、网络、存储、时钟、随机与危险 sink。

### Catalog 与 A 级文件合同

执行：

```bash
node --test shared/runtime/catalog.test.js scripts/experience-contracts.test.mjs
npm run verify
```

结果：

- 定向合同 159 / 159 通过；
- 递归 A 级文件依赖合同确认 HTML、CSS、脚本和 favicon 全部是仓库内相对资源；
- 经典脚本顺序固定为 `config.js → logic.js → app.js`；
- 生产文件无远程 URL、网络/存储 API、模块脚本、共享运行时依赖或危险 HTML sink；
- catalog 与离线门户 fallback 都包含同一 `origami-heart` 元数据；
- 仓库验收通过：56 个作品入口、48 个 A 级直开、8 个非 A 启动器、1 个能力声明。

### 全仓回归

执行：

```bash
npm test
```

结果：1770 / 1770 通过，0 fail、0 skipped。

## Chrome 实机证据

统一运行时地址：

```text
http://127.0.0.1:4173/
```

作品地址：

```text
http://127.0.0.1:4173/experiences/surprises/origami-heart/index.html
```

已完成：

1. 初始页只显示公开标题、说明、五折进度和“开始折”。
2. 逐次按下五个“折好这一步”，每次只推进当前 fold ID。
3. 第五折后停在 turning；“翻到背面”之前 `.final-note` 数量为 0，默认短笺不在页面文本中。
4. 主动翻面后才显示称呼、标题、留言、署名与“再折一次”。
5. 重开后 phase 回到 intro、最终短笺节点删除、开始按钮恢复。
6. 第一折真实向上拖动超过阈值后只推进到 `left-in`，没有被兼容 click 重复推进。
7. 修复后纸张可访问名称只有一个句号。
8. 修复后重开按钮计算样式为深莓红文字与边框，完成页截图中文字清晰。
9. 320 CSS px 下 header、机关面板、完成短笺和进度列表的关键内容矩形都位于视口内；拖动不是唯一完成路径。
10. 门户显示“56 个体验”，折纸心卡片包含惊喜/A 级/已安装、玩家和设备信息；点击卡片准确进入作品地址。
11. 页面控制台 warning/error 为 0。
12. 浏览器验收后本地服务退出，TCP 4173 已释放。

### `file://` 自动化边界

浏览器控制层的 URL 安全策略拒绝自动导航到 `file://`，因此本记录不声称用自动化浏览器实机走过文件协议页面，也没有用 shell 打开、CDP 或其他浏览器绕过。

A 级直开由递归文件合同取证：入口是经典脚本、所有引用均为相对本地路径、资源全部存在、无网络依赖，README 提供直接双击方式。localhost 实机使用的是同一份未构建、未改写的 HTML/CSS/JS 文件树。

## 浏览器发现并修复的问题

- [纸张 ARIA 名称重复句号](../bugs/2026-07-24-origami-heart-aria-punctuation.md)
- [完成页重开按钮文字对比不足](../bugs/2026-07-24-origami-heart-restart-contrast.md)

两项均在修复后重新加载页面复验。

## 来源与许可

生产代码、五步仪式、文案和视觉均为独立原创。正式调研来源只用于抽象可行性：

- `joumorisu/CSS-Origami` 固定 `2b25ed2f7e7162eb3234fda1093617f4f7134c03`，MIT；
- `dmotz/oriDomi` 固定 `f90830504d6843dfdf5b72d873c01cd716538485`，MIT。

许可证哈希、版权主体、排除候选与零复制边界见作品的 [ATTRIBUTION.md](../experiences/surprises/origami-heart/ATTRIBUTION.md)。

## 可复用沉淀

- [拖拽只做预览：离散提交、等价入口与兼容 click](../learn/2026-07-24-drag-preview-and-discrete-commit.md)
- [阶段门控的渐进惊喜：让状态拥有文案与焦点](../learn/2026-07-17-stage-gated-progressive-surprise.md)
- [UMD 双出口不等于真实双模块](../learn/2026-07-21-umd-and-node-module-boundaries.md)

## 已知边界

- complete 前的 DOM 隐私不是加密；能查看 `config.js`、源码或 JavaScript 内存的人仍可读取本地短笺。
- 五步是为网页设计的原创仪式，不是传统折纸教程，也不声称能折成真实纸模。
- 2D 是正式基线；3D transform 只增强拖动表现，不参与完成规则。
