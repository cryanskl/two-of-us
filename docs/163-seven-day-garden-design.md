# “把七天，养成一朵花”视觉设计与资产冻结

- 日期：2026-07-21
- 状态：已冻结，待实现
- 对应调研：[`161-seven-day-garden-research.md`](./161-seven-day-garden-research.md)
- 对应规格：[`162-seven-day-garden-spec.md`](./162-seven-day-garden-spec.md)
- 视觉方法：OpenAI 内置 ImageGen 纯文字生成桌面照料、移动交接、桌面完成三态概念和三张生产资产

## 1. 冻结结论

视觉方向是 **清晨窗边的双人植物手账**：一盆植物始终占据主视觉，两只公开工具篮在两侧等权，七张叶形纸签把进度变成一圈逐渐完整的标本记录。整体亲密、安静、可触摸，像两个人一起完成一件小型家务仪式，不做数据看板、儿童农场、婚礼请柬、花店电商或移动游戏胜利页。

核心层级固定为“植物 → 当日花签与两个照料位 → 当前席工具 → 两篮库存 → 七日计划”。数量只作为纸签角标；不能让库存矩阵比植物更醒目。公开交接继续显示花、花签、两篮和第一张卡，不画遮屏或隐私帘。

生成图片只承担光线、纸张、陶盆与叶片质感。七日表、库存、席位、已选卡、失败原因、按钮、焦点、完成摘要和 CSS 备用植物都必须由真实 DOM/CSS 表达。

## 2. ImageGen 概念与生产源稿

### 2.1 文件台账

| 文件 | 尺寸 | SHA-256 | 用途 |
| --- | ---: | --- | --- |
| [`assets/seven-day-garden/desktop-care-concept.png`](./assets/seven-day-garden/desktop-care-concept.png) | 1586×992 | `dcad83697c9c5ac749cf5aac86031ca40fb11151cdbdb277444fc38088dd639f` | 桌面照料概念；不进入运行时 |
| [`assets/seven-day-garden/mobile-handoff-concept.png`](./assets/seven-day-garden/mobile-handoff-concept.png) | 941×1672 | `b94a723c1d8e221f2ff023a76b3740aa58291dc60d7e53ce6ceaadf3db2dba17` | 移动公开交接概念；不进入运行时 |
| [`assets/seven-day-garden/desktop-complete-concept.png`](./assets/seven-day-garden/desktop-complete-concept.png) | 1568×1003 | `b563bb65fdc8900b4f701d334c3dd3e5e17d9ee5ac741c809d118eee4a9eba25` | 桌面完成纪念概念；不进入运行时 |
| [`assets/seven-day-garden/garden-table-background-source.png`](./assets/seven-day-garden/garden-table-background-source.png) | 1586×992 | `382cfbce3a0618a3de25ae3197cbb9b4462dffaa9273672bb725d87c02eee0c7` | 窗边空桌生产背景源稿 |
| [`assets/seven-day-garden/plant-states-chroma-source.png`](./assets/seven-day-garden/plant-states-chroma-source.png) | 1774×887 | `dc9440ce9074dfaca9c100f51934c9b6fb8af5c41cc74e94c889cea556a0e73d` | 八阶段同盆植物洋红底源稿 |
| [`assets/seven-day-garden/completion-keepsake-source.png`](./assets/seven-day-garden/completion-keepsake-source.png) | 1568×1003 | `3a0f2aa921936bcb08cd95b1e7430c568bd457382b0d133004123484ca35b146` | 七叶标本手账完成背景源稿 |

运行时目标：

| 源稿 | 处理 | 运行时目标 | SHA-256 |
| --- | --- | --- | --- |
| `garden-table-background-source.png` | 逐字节复制 | `experiences/co-op/seven-day-garden/assets/garden-table-background.png` | `382cfbce3a0618a3de25ae3197cbb9b4462dffaa9273672bb725d87c02eee0c7` |
| `plant-states-chroma-source.png` | border 自动取色、soft matte、阈值 12/220、despill | `experiences/co-op/seven-day-garden/assets/plant-states.png` | `75409d8bb8d9b9f2a07409e6f228ce6fec324e6d913c77a215c4309f2a9c2316` |
| `completion-keepsake-source.png` | 逐字节复制 | `experiences/co-op/seven-day-garden/assets/completion-keepsake.png` | `3a0f2aa921936bcb08cd95b1e7430c568bd457382b0d133004123484ca35b146` |

六张源/概念和三张运行时图均已用 `view_image(detail="original")` 检查。透明图集为 RGBA，四角 alpha 全为 0，alpha 范围 0–255，可见包围盒 `(23,260)–(1750,671)`；1257439 个全透明像素和 11198 个半透明边缘像素。

### 2.2 生成输入声明

- 工具：OpenAI 内置 ImageGen；
- 日期：2026-07-21；
- 输入：纯文字 prompt；
- 第三方参考图片：无；
- 开源截图、代码截图、商业素材与角色：无；
- 概念分别限定桌面照料、9:16 公开交接、桌面完成三态；
- 背景明确要求中央与两侧留白，不含植物、篮子、工具、卡牌、UI、人物或文字；
- 植物图集明确同盆、同视角、同基线的八阶段横排和纯 `#ff00ff` 底；
- 完成背景明确正好七片叶印、中央与底部留白、无植物与可用文字；
- 生产图未借用任何开源仓库资产。

最终 prompt 采用 `ui-mockup` 与 `stylized-concept/background-extraction` 模板，完整约束已保留在本任务的 ImageGen 调用记录中；执行路径为内置工具，不是 CLI fallback。

## 3. 概念审校与舍弃项

接受：

- 植物占至少四成视觉注意力；
- 两篮面积、亮度和边框等权；
- 七片叶签形成柔和弧线或 4+3 网格；
- 陶土、苔绿、纸张和少量黄铜的材料关系；
- 当日花签与两张照料卡贴近植物；
- complete 用七份手账记录包围成熟花，而不是奖杯；
- 移动端按“进度 → 植物 → 花签/选择 → 两篮 → 主动作”纵向展开。

实现必须舍弃：

1. 概念中的抽象伪文字和不可验证图标；生产使用真实中文 DOM；
2. 桌面概念把所有卡直接画进场景；生产只加载空背景，卡与篮全部用语义 DOM；
3. 移动概念底部按钮像金属铭牌且过于厚重；生产使用纸签式原生按钮并保持 56px 触控高度；
4. 移动概念中的植物已开花；真实 handoff 植物严格来自 `plantStage`；
5. complete 概念有八张标本卡；生产必须恰好七条 completedDays，并由 DOM 生成；
6. 生产完成背景中的七片叶印只作装饰，不能代替可访问的七日日志；
7. 图集八格不作为图片 map 或 canvas；CSS 用 `object-position/background-position` 显示单格，旁边有文本状态；
8. 图片加载失败时不得同时残留破图标和空舞台；`error` 后显式切到 CSS 植物；
9. 背景宽屏左侧窗帘在窄屏可以裁掉，不能为了保留装饰压缩内容；
10. 不复制概念的细碎工具和花材，避免装饰被误认成可操作元素。

## 4. 设计令牌

```css
:root {
  --paper-50: #fffaf0;
  --paper-100: #f4ead7;
  --paper-250: #ddceb3;
  --ink-950: #2f2924;
  --ink-700: #5c5148;
  --moss-900: #243f35;
  --moss-750: #355c49;
  --sage-550: #78906f;
  --sage-250: #b9c7a8;
  --terra-700: #9b4f3f;
  --terra-500: #bd6d54;
  --sun-600: #a9792b;
  --sun-350: #d2aa61;
  --soil-850: #4a3528;
  --success: #365f4b;
  --danger: #8a3e35;
  --focus: #172f28;
  --shadow-paper: 0 18px 50px rgb(70 48 27 / 18%);
  --shadow-plant: 0 24px 44px rgb(42 32 23 / 24%);
  --radius-small: 8px;
  --radius-medium: 16px;
  --radius-large: 28px;
  --content-max: 1180px;
}
```

字体：

- 标题：`Iowan Old Style`, `Songti SC`, `STSong`, serif；
- 正文：`Avenir Next`, `PingFang SC`, `Microsoft YaHei`, sans-serif；
- 数量与快捷键：`ui-monospace`, `SFMono-Regular`, monospace；
- 不加载远程字体；正文至少 16px，辅助文字至少 13px，按钮至少 16px；
- 标题不用渐变字、描边字、全大写或超大营销字。

工具语义：

| 工具 | 色彩 | 形状/文字 |
| --- | --- | --- |
| 浇水 | 深苔绿 | 水滴 + “浇水” + W |
| 补光 | 暖黄铜 | 八射太阳 + “补光” + S |
| 修剪 | 陶土红 | 剪口双线 + “修剪” + P |

任何状态都同时有图形和完整文字。forced-colors 可以覆盖色彩，但原生边框、文字、图标轮廓和焦点环必须保留。

## 5. 页面骨架与阶段

```text
body.seven-day-garden
└── main.app-shell
    ├── header.app-header
    │   ├── eyebrow + h1 + subtitle
    │   └── ol.week-ribbon（七片叶签）
    ├── section#stage.stage-shell（phase-owned DOM）
    │   ├── plant-scene
    │   ├── care-note / result-note
    │   └── basket-grid
    ├── nav.utility-links
    └── p#live-status.sr-only[role=status]
```

- body 使用窗边背景图与 `--paper-100` 双重回退；
- app-shell 宽 `min(1180px, calc(100% - 32px))`；
- 主舞台用约 94% 不透明纸面，保证背景纹理不穿过正文；
- week-ribbon 始终在 header，当前日带黄铜夹点和 `aria-current="step"`；
- 每次阶段切换真实重建 stage，旧工具按钮离开可访问树；
- `first-pick` 与 `second-pick` 共用 choosing 视觉，标题与 active seat 不同；
- `day-result` 与 `jammed` 共用日结布局，结果色、图标和动作不同。

## 6. 植物与图集映射

`plantStage` 取 0–7，严格等于 completedDays 数。图集八格宽度按 12.5% 映射：

```text
0 土壤 → 1 萌芽 → 2 两叶 → 3 四叶 → 4 成株 → 5 花苞 → 6 初绽 → 7 开花
```

- 图集作为无替代文本的装饰层；相邻可见文字说“已养成 N / 7 天”；
- 生产可用固定 `aspect-ratio: 2 / 1` 视窗裁切一格，不从像素推导规则；
- 每日 accepted 后只播放一次 180–240ms 的轻微上移/淡入；
- reduced motion 立即切换格位；
- CSS 兜底植物由盆、茎、最多七片叶/花组成，受相同 `data-stage` 控制；
- 图片成功加载时隐藏兜底的装饰枝叶但保留可见状态文字；失败时反转。

## 7. 七日纸签与工具篮

- week-ribbon 是 `<ol>`，每张 `<li>` 是叶形纸签，不是按钮；
- 桌面为 7 列弧形错落，600px 以下变成 4+3 网格；
- complete 用 `<ol class="pressed-log">` 展示七条 accepted 记录；
- 两篮各为 `<article>`，标题是席位名，工具为三行/三卡；
- choosing 仅 active basket 的工具变为 button；另一篮同结构只读；
- 数量徽记靠近工具名，不单独画资源条；
- 第一张 commitment 在 handoff 保留于花签两个照料位之一，第二格写“等你接手”。

## 8. 结果与完成态

jammed：

- 植物保持旧 stage，不摇晃、不枯萎；
- 两张尝试卡放在花签旁并标“已归还”；
- pair-mismatch 用断开的纸签边，future-stranded 用未闭合的后续叶环；
- 原因使用完整冻结文案，不标某一方为错；
- 主动作“重新商量今天”。

day-result：

- 植物切换到新 stage；
- 花签压入绿色叶印，显示扣除后两篮；
- 前六天“去看第 N+1 天”，第七天“留下这朵花”。

complete：

- 完成手账背景铺在舞台内，透明成熟植物叠在中央；
- 真实 DOM 七日日志围绕或位于植物下方，窄屏变纵向；
- 只显示 7 天、14 张卡、共同尝试与重新商量次数；
- composeCompletionNote 只通过 `textContent` 插入；
- 不加奖杯、星级、排名、贡献对比、礼花、爱心雨或自动音频。

## 9. 动效、焦点与响应式

动效：

- 叶签状态 140ms 淡入；植物格位 220ms ease-out；卡入照料位 160ms；
- 不用持续 RAF；不让 CSS animationend 推进 reducer；
- reduced motion 下全部取消，规则与焦点顺序不变。

焦点：

- 阶段切换后微任务聚焦 `#phase-heading`；
- 同阶段按钮状态变化保留稳定 `data-focus-key`；
- handoff 只有“我接好了”一个主动作；
- live region 只播刚发生的事，不复制标题；
- disabled 工具仍显示库存 0，但不进入 Tab 序列。

响应式：

| 视口 | Gate |
| --- | --- |
| 1728×906 | 植物、花签、两篮与主动作可在首屏完成主要操作 |
| 1280×800 | 植物至少 300px 宽，两篮各不低于 220px |
| 390×844 | 单列，植物 220–260px，三工具一行，七签 4+3 |
| 320×568 | 无横向溢出，允许纵滚，按钮至少 56px、间距至少 8px |

## 10. Fidelity ledger

| 概念锚点 | 实现要求 | 验收证据 |
| --- | --- | --- |
| 中央大植物 | stage 中植物面积与位置始终压过库存 | 桌面/390/320 截图 |
| 两只等权篮 | 桌面左右同宽，移动顺序不制造主次 | DOM 尺寸与截图 |
| 七片叶签 | 恰好 7 个真实 list item，移动 4+3 | DOM 计数与截图 |
| 当日纸签靠近植物 | 花签与两个照料位同一视觉组 | choosing/handoff 截图 |
| 公开交接 | 花、花签、两篮、首张卡都不被遮住 | handoff DOM/截图 |
| 手账材料语言 | 纸纤维、陶土、苔绿、黄铜少量点缀 | CSS token 与截图 |
| 成长有八个稳定层级 | `plantStage 0..7` 对应图集八格 | 自动测试与完整路线截图 |
| 完成是共同标本册 | 七日 DOM 日志，无奖杯/排名 | complete DOM/截图 |
| 图片非规则真相 | 阻断三图后仍可完整通关 | 浏览器降级验收 |
| 无假设备框 | 真实响应式页面，不画手机/浏览器外壳 | 390/320 截图 |

实现完成后 ledger 至少逐项提供 5 条可见证据；任何概念偏差必须记入验收文档，不能靠“风格接近”概括。

## 11. 资产与许可边界

- 三张生产图均为本轮纯文字 ImageGen 原创生成；
- 无第三方图片输入，无开源素材、字体、图标或照片复用；
- 所有运行时图片随作品目录本地加载，不请求 CDN；
- `ATTRIBUTION.md` 必须同时声明 ImageGen 生产资产与四个仅机制调研来源；
- README 必须保留精确标题 `## 借鉴与来源声明`；
- 若后续替换任何生成图，必须新增版本文件、复核 SHA/尺寸/alpha，并同步更新本设计台账。

## 12. 设计 Gate

进入代码前冻结：清晨植物手账方向、三张生产资产、植物主视觉、双篮等权、七签 4+3、公开 handoff、八阶段图集映射、配色/字体、图片降级、焦点、四档响应式和 fidelity ledger。

视觉实现不得顺带加入秘密遮屏、真实日期、天气仪表、得分、个人贡献、远程字体、音频、第三方图标库或新的图片资产。
