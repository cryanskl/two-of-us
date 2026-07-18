# 这一拍，刚好和你：README 只跳转详版声明，未独立满足来源 Gate

- 状态：`fixed`
- 日期：2026-07-18
- 影响作品：这一拍，刚好和你
- 发现版本 / commit：`2d36851 feat: add four hands harmony experience`

## 环境

- 操作系统：任意
- 检查方式：对照 `docs/92-four-hands-harmony-spec.md` 第 13 节
- 启动等级与入口：A 级作品目录的文档审计

## 复现步骤

1. 单独打开作品 `README.md`。
2. 检查四个参考项目的 fixed commit、许可证与权利主体。
3. 检查 ImageGen 最终提示词、生成方式、保存路径和无第三方输入声明。

## 预期结果

README 与 ATTRIBUTION 各自包含规格冻结的完整来源信息和零复制边界。

## 实际结果

ATTRIBUTION 完整，但旧 README 只有项目名、抽象机制和到详版的链接；README 本身缺少 fixed commit、权利主体及 ImageGen 最终提示词，因此触发规格的 No-Go。

## 根因

实现时把“README 与 ATTRIBUTION 必须包含”误读为“两个文件合计包含”，用跳转链接替代了 README 的独立审计能力。

## 解决方案

在 README 同步四个固定来源的 commit、许可证、权利主体、仅研究机制和未复制清单；同时原样加入 ImageGen 生成方式、路径、无第三方输入与最终生产提示词，并保留 ATTRIBUTION 作为详版。

## 回归验证

- [x] catalog 借鉴声明 Gate 57 / 57 通过
- [x] 全仓测试 536 / 536，统一验收确认 40 个作品入口
- [x] README 与 ATTRIBUTION 的四个 fixed commit 逐项一致

## 相关提交

- `2787a39 docs: complete four hands attribution gate`
