# “这一场雨，我们一起接”验收记录

- 日期：2026-07-21
- 作品：`experiences/co-op/cloud-recipe/`
- 等级：A（经典脚本、纯本地资源、零第三方运行依赖、零网络、零存储、零随机）
- 对应调研：[151-cloud-recipe-research.md](./151-cloud-recipe-research.md)
- 对应规格：[152-cloud-recipe-spec.md](./152-cloud-recipe-spec.md)
- 视觉冻结：[153-cloud-recipe-design.md](./153-cloud-recipe-design.md)
- 分步计划：[154-cloud-recipe-plan.md](./154-cloud-recipe-plan.md)

## 1. 结论

作品已完成为单设备同屏双人合作游戏：左席只移动云朵左边界，右席只移动右边界；两人共同把七道接雨区间调到唯一正确宽度，在三瓶固定配方中接住九组彩滴并避开邻接灰滴。

真实 Chrome 通过统一本地服务完成全部九波，覆盖触控按钮、两套键盘、污染重试、边界相遇顺序、三瓶汇总、重开、阶段焦点、桌面和两档窄屏。Chrome 控制层的 URL 安全策略禁止自动导航 `file://`，因此没有绕过限制冒充双击通过；A 级直开由经典相对脚本、纯本地资源与目录 Gate 证明，保留一次人工双击 Gate。

## 2. 实现简报

- `config.js`：两席称呼与只接收隔离冻结摘要的完成结语；
- `logic.js`：七道、三色、三配方、九波、邻接灰滴、28 区间穷举、七阶段 reducer、固定 tick、公开 view 与输入分类；
- `logic.test.js`：24 项配置、唯一解、合作必要性、边界、生命周期、hostile 输入与重放测试；
- `index.html` / `styles.css` / `app.js`：经典脚本、真实阶段 DOM、七列舞台、四个原生按钮、RAF、焦点回退、响应式、reduced-motion 与 forced-colors；
- 三张 PNG：ImageGen 原创文字提示源稿的逐字节运行副本，只承担背景、云带材质和完成插画；
- `README.md` / `ATTRIBUTION.md`：直开、控制、离线隐私、固定 MIT 来源、版权主体与零复制声明。

## 3. 自动检查

最终执行：

```sh
node --check experiences/co-op/cloud-recipe/app.js
node --test experiences/co-op/cloud-recipe/logic.test.js
node --test shared/runtime/catalog.test.js
npm run verify
npm test
cmp docs/assets/cloud-recipe/weather-kitchen-background-source.png experiences/co-op/cloud-recipe/assets/weather-kitchen-background.png
cmp docs/assets/cloud-recipe/cloud-ribbon-source.png experiences/co-op/cloud-recipe/assets/cloud-ribbon.png
cmp docs/assets/cloud-recipe/weather-bottles-source.png experiences/co-op/cloud-recipe/assets/weather-ingredients.png
git diff --check
```

结果：

- 作品逻辑：24 / 24 通过；
- 目录与静态 Gate：82 / 82 通过；
- 全仓：1369 / 1369 通过，0 失败；
- `verify`：52 个作品入口、1 个能力声明通过；
- 三张运行资产与文档源稿逐字节一致；
- `git diff --check`：通过。

资产 SHA-256：

| 资产 | SHA-256 |
| --- | --- |
| `weather-kitchen-background.png` | `7e7c2e17c3df7f717e99381c9dcfc978ae0e0b8e60a95e84d6db1884ada629cc` |
| `cloud-ribbon.png` | `544ab0fb696212aaaca571e7b0af175b473585e1b774e3926136c6c6d6982be9` |
| `weather-ingredients.png` | `8ab36af24644d4bd0b815cb1e1c60890b3507a7be121ac9b22e9c3d129488c45` |

九波均对全部 28 个合法闭区间穷举，且只有配置目标成功；固定任一席为默认边界时，另一席都不能走完整条九波路线。

## 4. Chrome 生产路径

通过 `http://localhost:4173/experiences/co-op/cloud-recipe/index.html` 加载同一套生产文件：

1. 首屏确认双席职责、规则、云朵与开始动作；
2. 第一味用屏幕按钮把默认第 3–5 道调到第 2–4 道，验证触控路径；
3. 其余波次使用 `A/D` 与方向键，依次完成三瓶九味；
4. 最后一味先让左席连续右移，第三次因左右边界相遇被合法钳制，最终第 5–7 道接到灰滴；
5. 重试后改为右席先让位、左席再推进，成功到达第 6–7 道，验证动作顺序确实构成合作；
6. 完成页显示晨光露 3 次、晚霞糖露 3 次、星夜汽水 4 次，共 10 次，并输出配置结语；
7. 桌面完成页无坏图，`scrollHeight === innerHeight === 906`；
8. “再调一次”回到 exact intro，重新进入落雨后焦点落到 `A 向左`，不再掉到 `BODY`。

本次真实浏览器制造并验证了 contamination；missed、双侧漏接、污染优先级与重试复位由生产 reducer 的逻辑测试覆盖。

## 5. 响应式与可访问性

| 视口 / 阶段 | 实测结果 |
| --- | --- |
| 1728×906 intro / complete | 主舞台、插画、账页和导航完整处于首屏；无纵向溢出；完成图 `badImages = []` |
| 390×844 falling | 页面 `390×844`，无横向/纵向溢出；四个按钮均为 `78×56px`；舞台在上、双席控制在下 |
| 390×844 complete | 页面 `390×844`，三瓶插画、摘要、结语、重开和目录链接完整可见 |
| 320×568 falling | `scrollWidth = 320`，无横向溢出；页面允许纵向滚动到 744px；四按钮均为 `62×52px` |

- 原生 button、heading、progressbar、list、dl 和 live status 都进入可访问树；
- 配方介绍进入计时阶段后，焦点落到首个未禁用边界按钮；结果阶段落到标题；
- 控件不只靠颜色：彩滴、灰滴、左右席和成功/污染均有文字、纹样或可读名称；
- `prefers-reduced-motion` 只关闭表现动画，规则 tick 不变；forced-colors 保留系统边框与文本；
- 本轮 Chrome 没有仿真 200% 文本缩放、forced-colors、reduced-motion、后台失焦和三图阻断，这些保留为人工设备 Gate。

## 6. 视觉对照

桌面首屏保持天气调饮台、玻璃器皿、纸质面板、象牙云带和蓝/金/玫瑰三色；完成页以三瓶天气和右侧手写账页收束。390px 将完成插画与账页垂直堆叠，320px 压缩装饰和间距但不缩小核心触控目标。

七道、落物、把手、状态、按钮和总结都由 DOM/CSS/规则层生成；三张图片不保存答案。概念图中的生成文字与虚构控件没有进入生产页面。最终 QA 截图只用于 Chrome 会话内目视检查，没有作为运行资产提交。

## 7. 借鉴、bugs 与 learn

`ATTRIBUTION.md` 固定三项 MIT 机制研究来源：Catching-the-objects `65e8fa08…`、Basketcatcher `67b56217…`、js_thrustvector `0b530074…`，逐项记录 commit、许可证、版权主体、只研究范围和未复制范围。本作品没有复制或打包其源码、算法实现、关卡、界面、素材、音频、字体或文案。

本轮记录并解决原生 KeyboardEvent 读取、最大 revision 重开、统一测试发现、来源声明标题契约和阶段焦点丢失；ImageGen 伪透明属于既有资产 bug 的再次复现。详见 [`bugs/README.md`](../bugs/README.md)。

可复用方法见[双边界唯一接取区间：邻接负样本、操作顺序与合作必要性](../learn/2026-07-21-two-boundary-unique-catch-interval.md)。

## 8. 独立提交

| 完成部分 | commit |
| --- | --- |
| 定向调研 | `6b5a439` |
| 可执行规格 | `d69c238` |
| 视觉与 ImageGen 源稿 | `6d46ee2` |
| 重复资产 bug | `b5c5acd` |
| 实施计划 | `c16222a` |
| 逻辑、配置与 24 项测试 | `1c04b39` |
| 前端、生产资产与来源声明 | `37d5fad` |
| 来源标题契约修复 | `e67604c` |
| catalog 与目录 Gate | `2330809` |
| Chrome 焦点修复 | `9827d40` |
| learn 沉淀 | `5bf6776` |
| 本验收记录与状态索引 | 本次提交 |

## 9. 发布判断

作品达到唯一解、合作必要性、固定九波、双输入、重试、汇总、A 级静态边界、统一门户、真实 Chrome 完整生产路径、三档响应式、触控尺寸、视觉对照、固定来源、bugs/learn 和独立提交的当前发布标准。

保留的人工 Gate 是：真实 `file://` 双击、200% 文本缩放、forced-colors、reduced-motion、后台失焦恢复和三张图片阻断。它们是设备/自动化能力边界，不影响当前代码与目录 Gate 的通过结论，也没有被写成已实测。完成本作不等于长期目标完成；后续继续选择下一个未实现候选。
