# 调研来源漂移：失效仓库仍标为高置信度，重分发仓库被当作一手来源

## 状态

已修复，2026-07-17。

## 复现条件

1. 打开 `docs/10-surprise-research.md` 或 `docs/60-local-first-second-pass-research.md` 中的 `HadeedJalani/happybirthday-asnah`；
2. GitHub Repository API 返回 404，`git ls-remote` 返回 Repository not found，但文档仍把它标为 MIT、中/高置信度候选；
3. 打开多处 `nivaboaz/CoupleCards` 借鉴声明，文档把它当作一手项目；其提交历史与 `michaelsboost/CoupleCards` 在 `94ac422` 前完全一致，LICENSE 版权行仍为 `Copyright (c) 2025 Michael Schwartz`。

## 原因

初次调研记录了当时可访问的仓库链接，却没有为所有正式候选固定 commit、原作者与许可证文件。后续上游删除仓库或把 fork/重分发改成独立仓库后，普通链接仍看似是一个项目名，文档没有自动显露来源已经漂移。

## 解决方案

- 将失效生日仓库移入“证据失效与撤回记录”，不再作为许可明确候选；
- 用固定的 `randillasith/birthday-bliss@d1e5348` 承接同类能力，并明确远程字体和缺失相册文件；
- 将 CoupleCards 的规范来源统一为 `michaelsboost/CoupleCards@94ac422`，链接固定 `LICENSE.md` 并写出 Michael Schwartz；
- 合并合作调研中的重复 CoupleCards 行，重分发仓库只作为发现线索，不再独立计数。

## 回归验证

- [x] 全仓库不再把 `nivaboaz/CoupleCards` 写入借鉴声明或候选表
- [x] `happybirthday-asnah` 只存在于撤回记录和本问题记录
- [x] CoupleCards 的固定 commit、MIT 文件和版权作者可从 GitHub 官方 API 重新取得
- [x] 替代生日候选的固定 commit、MIT 文件和入口资源边界已核对
- [x] 仓库文档链接检查与 `git diff --check` 通过

## 相关提交

- 见本次调研来源维护提交。
