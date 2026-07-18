# A 级「月相密语」定向调研

> 调研日期：2026-07-18。目标是为创意池 S05「月相密语」确定一个可双击、无公网依赖、可个性化且不冒充专业天文历书的实现边界。

## 1. 选题结论

下一件作品采用：

- 作品名：**把月亮拨回那一天**；
- 目录 ID：`moon-phase-secret`；
- 主分类：单人准备 / 接收者解锁的惊喜；
- 启动等级：A，完整仓库内直接双击 `index.html`；
- 核心动作：校准月份、日期和八档月相，三项同时对齐才展开留言；
- 首版边界：一个入口、一个校准台、一个结果页；不做账户、日历编辑器、联网星历、长期记录或分享服务。

它补足当前惊喜类中的一个产品缺口：不是单纯点击揭晓，也不是靠反应或物理挑战，而是让一段共同记忆变成可触摸、可推理的“日期仪器”。准备者只需在 `config.js` 写入特殊日期、三条私人线索和最终留言。

## 2. 天文事实与精度边界

NASA 将月相按顺序分为八档：新月、蛾眉月、上弦月、盈凸月、满月、亏凸月、下弦月、残月；周期约 29.5 天。NASA 技术出版物给出的平均朔望月为 29.53059 天。

本作使用以下离线近似：

```text
epoch = 2000-01-06 18:15 UTC（新月）
lunation = positiveModulo((selectedUtcNoon - epoch) / 86400000, 29.53059)
phase = round(lunation / 29.53059 × 8) mod 8
```

2000-01-06 18:15 UTC 的新月时刻来自 NASA RP 1349 月相表；USNO 的在线数据服务用于抽样核对，不进入运行时。选择日期统一构造成 UTC 正午，避免本地夏令时或午夜时区换日改变日差。

这不是观测级星历：平均周期不能表达轨道摄动，八档取整在相位边界附近可能与精确时刻相差一档。产品文案只说“这一天在本作中的月相”，README 明确它是纪念日谜题近似，不用于观测、宗教历法、潮汐或航海判断。

一手来源：

- [NASA Science：Moon Phases](https://science.nasa.gov/moon/moon-phases/)；
- [NASA RP 1349：Phases of the Moon 1995–2014](https://eclipse.gsfc.nasa.gov/TYPE/moonphase.html)；
- [NASA/TP–2008–214170：平均朔望月 29.53059 天](https://ntrs.nasa.gov/api/citations/20080040150/downloads/20080040150.pdf)；
- [USNO：Dates of Primary Phases of the Moon](https://aa.usno.navy.mil/data/MoonPhases)；
- [USNO 月相 API 文档](https://aa.usno.navy.mil/data/api.html)。

## 3. 交互候选比较

| 方案 | 优点 | 风险 | 结论 |
| --- | --- | --- | --- |
| 原生日期输入 + 自动月相 | 实现最小、可访问性成熟 | 退化为表单，缺少“拨回那一天”的仪式感 | 不采用 |
| 365 格单圆盘 | 一次旋转同时确定日期 | 精细操作困难，手机上不可读，键盘步数过多 | 不采用 |
| 月份环 + 日期弧 + 月相环 | 每个量纲清楚，可分别拖动/按键，容易给中性反馈 | 状态与焦点管理较多 | 采用 |
| 联网 USNO 查询 | 精度高 | 破坏 A 级离线与隐私承诺，接口失败会阻断惊喜 | 只用于调研抽查 |
| 引入完整天文库 | 可扩展到位置、月升月落 | 首版没有真实需求，增加许可与发布面 | 暂不引入 |

提交校准后只公开三项“已对齐 / 还差一点”，不显示目标数字。这样既避免盲猜没有反馈，也不会把纪念日直接写到界面；最终内容仍只在成功阶段创建 DOM。三项布尔反馈本身会形成可反复尝试的猜测 oracle，因此这里只提供舞台式揭晓，不承诺密码学保密。

## 4. Pointer 与键盘边界

月份和月相环允许 Pointer 圆周拖动。W3C Pointer Events 的 pointer capture 适合这类自定义旋钮：指针离开圆环后仍把后续事件交给原控件，直到释放或取消。

实现边界：

- 只接受 `isPrimary` 的单指/主指针；
- 鼠标只接受左键，交互圆环声明 `touch-action: none`，避免原生滚动与旋转手势争抢；
- `pointerdown` 后 capture，`pointerup`、`pointercancel`、`lostpointercapture` 都清理会话；
- 相邻角度差规范化到 `[-π, π]`，避免跨越边界时跳转整圈；
- 每个圆环仍是原生 `<button>` 组或带明确按钮替代，不伪造没有完整键盘契约的 ARIA slider；
- `ArrowLeft` / `ArrowRight` 逐档，Home 回到第一档；日期使用独立 ± 按钮，触控高度至少 48px。

来源：[W3C Pointer Events](https://www.w3.org/TR/pointerevents/)。

## 5. 开源候选核验

调研对照了 [`mourner/suncalc`](https://github.com/mourner/suncalc)：2026-07-18 核验的固定 commit 为 `bbc91f689ede3ff7173011947d435b3fb6c0485d`，项目采用 BSD-2-Clause 许可证，可计算月亮照明比例、相位与位置。

首版**不复制、不 vendoring、不运行 SunCalc 代码**，原因不是许可证不允许，而是作品只需要一个稳定、明确标注为近似的八档谜题映射。直接引入完整库会把位置、月升月落等未使用能力带进发布面。

固定证据：

- [SunCalc 固定 commit](https://github.com/mourner/suncalc/tree/bbc91f689ede3ff7173011947d435b3fb6c0485d)；
- [该 commit 的 LICENSE](https://github.com/mourner/suncalc/blob/bbc91f689ede3ff7173011947d435b3fb6c0485d/LICENSE)。

## 6. 借鉴声明结论

需要在作品 README 与 `assets/ATTRIBUTION.md` 明确：

1. 八相名称、周期和基准新月事实来自 NASA/USNO 天文资料；
2. SunCalc 仅作为“完整天文库为何不应进入首版”的对照，没有复制其源码、数据模型、界面或素材；
3. 本作基于上述公开事实采用通用八分桶近似；日期状态机、拖拽量化、中文线索、视觉与测试为本仓库实现；
4. 若视觉概念或运行纹理由 OpenAI ImageGen 生成，记录日期、用途、提示词边界和文件清单；
5. 私人日期与留言由使用者自行填写，不应提交真实隐私到公开仓库。

月相图形表达为便于解谜的符号化八相，不模拟南北半球、观测方位或月面真实姿态。

## 7. 风险与验证 Gate

| 风险 | Gate |
| --- | --- |
| DST / 时区导致日期偏一天 | 所有算法输入用 `Date.UTC(year, month - 1, day, 12)`；跨时区测试结果相同 |
| 非法日期如 2 月 31 日 | 月份变化时按配置年份的当月天数钳制；配置整份回退 |
| 相位边界误称精确 | UI/README 使用“离线近似”，测试只验证确定性和抽样，不声称历书一致 |
| 拖拽跨 `±π` 跳格 | 纯函数规范化角度差并覆盖边界测试 |
| 最终留言提前泄露 | intro/calibrating 阶段 DOM、snapshot 与 HTML 均无最终文本 |
| 单指拖出圆盘后会话丢失 | pointer capture + cancel/lost 清理，真实圆周拖拽验收 |
| 图片缺失阻断作品 | 中央月面提供 CSS 回退，不把规则写进像素资产 |
| 直接复制目录丢共享依赖 | 首版不依赖共享 JS；作品目录自身可完整无声运行 |

## 8. 建议实现顺序

1. 规格固定状态机、八相数学与配置 schema；
2. 生成完整桌面/手机概念与一张无字月面资产；
3. 先写纯逻辑和测试，再写 DOM/Pointer 适配；
4. 接入 catalog、门户与仓库 Gate；
5. 验证完整解锁、错误校准、反向拖动、键盘、缺图、reduced motion、390px 与 320px；
6. 每个真实 bug 写入 `bugs/`，通用“日期规范化 / 相位量化 / 阶段 DOM”知识写入 `learn/`。
