# 标准状态与项目 Gate：不要把更严格的自定值写成规范原文

适用范围：本地互动 HTML 在研究、规格和借鉴声明中引用 W3C、WHATWG、NASA
或其他持续维护的一手技术资料。

## 核心结论

固定开源代码 commit 与固定 Web 标准不是同一件事：

- 代码仓库可以用 commit 和许可证 SHA-256 冻结；
- 标准页面还带有 Recommendation、Working Draft、Discontinued Draft、
  Living Standard 等状态；
- 页面 URL 仍可达，不代表它仍是现行规范；
- 项目选择比标准最低值更严格是好事，但必须明确写成项目 Gate。

## 复核顺序

每次来源维护至少分四层：

1. **来源身份**：官方组织、官方仓库或正式出版记录；
2. **可重放版本**：代码 commit、许可证文件与内容哈希；
3. **当前状态**：是否归档/禁用，标准处于何种发布轨道；
4. **项目主张**：哪些是来源事实，哪些是独立设计或主动提高的门槛。

四层不能互相替代。GitHub 的 `license.spdx_id=NOASSERTION` 不等于没有许可证，
应继续读取根许可证文件；W3C 页面 HTTP 200 也不等于 Recommendation，应读取
Status of This Document。

## 两类常见误写

### 1. 终止草案仍被当作现行标准

Page Visibility Level 2 仍能访问，也仍包含 `visibilityState` 与
`visibilitychange` 的历史说明，但页面明确标为 Discontinued Draft，并要求
后续技术工作改看 HTML Living Standard。

正确写法是：

- 把 W3C Level 2 标为历史来源；
- 把 WHATWG HTML 的 Page visibility 作为现行行为依据；
- 不因来源迁移改变已经验证过的产品暂停/恢复目标。

### 2. 项目自定尺寸被写成 WCAG AA 数值

WCAG 2.2 SC 2.5.8 的 AA 最低目标尺寸是 24×24 CSS px，并带例外；44×44
CSS px 对应 SC 2.5.5 的 AAA 增强项。项目可以要求玩法键至少 44×44px、
主动作至少 48px，但应写成“不依赖例外的项目体验 Gate”，不能声称它就是
WCAG AA 原文。

## 科学资料的事实边界

使用 NASA 等技术论文时，应把“原文列出了哪些状态量”与“产品如何控制这些
状态”分开。论文分别列出相对位置、相对速度、相对姿态与相对姿态率，不自动
支持“最终接近必须同时控制”这类更强产品叙述。

安全做法是：

- 精确到表格编号或需求编号核对事实；
- 只提炼类别，不复制图表、参数、算法或安全结论；
- 明确作品不是训练软件；
- 独立设计玩法 Gate、数值和交互。

## 可复用验收清单

- 官方 URL 可达，但仍继续读取文档状态；
- 代码 HEAD、固定 commit 与许可证哈希分别记录；
- 自动 SPDX 与一手许可证不一致时，以一手文件为准并解释差异；
- Recommendation、Draft、Discontinued 与 Living Standard 不混写；
- 标准最低值、增强项与项目自定值分层；
- 科学资料的事实类别不扩大为控制、安全或性能主张；
- 借鉴声明明确“借什么”和“没有复制什么”；
- 标准或来源状态修正后，检查是否真的影响实现，而不是机械改代码。

## 本仓库证据

- 来源维护：
  `docs/228-capsule-docking-source-refresh.md`
- 调研修正：
  `docs/176-capsule-docking-research.md`
- 工具链记录：
  `bugs/2026-07-24-capsule-nasa-pdf-toolchain.md`

本文只沉淀来源校准方法，没有引入第三方代码、素材或运行依赖。
