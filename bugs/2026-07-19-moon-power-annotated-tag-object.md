# 月面配电调研：annotated tag 对象被误写成源码提交

- 状态：`fixed`
- 日期：2026-07-19
- 影响作品：月面，保持有光（调研与规格）
- 发现版本 / commit：`6e37960`

## 环境

- 操作系统：macOS
- 工具：Git `ls-remote`、GitHub 原始文件与 API
- 启动等级与入口：A 级作品的前置来源核验

## 复现步骤

1. 执行 `git ls-remote https://github.com/tburrows13/PowerOverload.git refs/tags/v2.1.6`；
2. 得到 `94d188c1233331e1136894e1d5e867684e91197c`；
3. 执行同一命令并匹配 `refs/tags/v2.1.6*`；
4. 发现 `refs/tags/v2.1.6^{}` 实际为 `8d618116d7491c9a289bbbf886c340a197f38303`。

## 预期结果

来源声明应区分 annotated tag object 与被标记的源码 commit，并把固定 tree 链接指向解引用 commit。

## 实际结果

首个调研提交把 `94d188c...` 称为“打包提交”，把 `8d61811...` 称为独立工作树 commit。链接仍指向正确源码，但文字错误暗示 tag 与源码来自两个提交。

## 根因

只读取普通 `refs/tags/v2.1.6`，没有同时读取 `refs/tags/v2.1.6^{}`。annotated tag 的普通 ref 指向标签对象，而不是被标记的 commit。

## 解决方案

- 调研改为同时记录 tag object `94d188c...` 与解引用 commit `8d61811...`；
- 明确 HEAD 和 `v2.1.6^{}` 都解析到 `8d61811...`；
- 规格同步采用相同术语；
- 后续固定 Git tag 时统一查询 `refs/tags/<tag>*`，轻量 tag 则只会返回一条 ref。

## 回归验证

- [x] `git ls-remote ... 'refs/tags/v2.1.6*'` 同时显示 tag object 与 `^{}` commit
- [x] 固定 tree URL 使用 `8d618116...`
- [x] `LICENCE.txt` 与 `info.json` 均从同一解引用 commit 读取
- [x] 调研与规格不再把 `94d188c...` 称为源码/打包 commit
- [x] `git diff --check` 通过

## 相关提交

- 首次误写：`6e37960`
- 修复：本文所在提交
