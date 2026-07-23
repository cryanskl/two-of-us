# 太空舱对接来源复核：系统缺少 `pdftotext`

- 状态：`fixed`
- 日期：2026-07-24
- 影响作品：`capsule-docking` 来源维护
- 发现版本 / commit：`c8fa790`

## 环境

- 操作系统：macOS
- 浏览器与版本：不适用
- 启动等级与入口：文档复核；不涉及作品运行

## 复现步骤

1. 下载 NASA NTRS 官方 PDF 到临时目录。
2. 执行 `pdftotext -layout <pdf> -`。
3. 尝试检索表 1 的 `CV0116` 与 `CV0117`。

## 预期结果

从 PDF 提取保留基本布局的文本，独立核对相对位置、速度、姿态与姿态率四类
状态量。

## 实际结果

系统返回 `zsh: command not found: pdftotext`，无法使用系统 Poppler 路径。

## 根因

当前系统 PATH 没有安装或暴露 Poppler 的 `pdftotext`。这不是作品运行缺陷，
也不应为了单次来源复核把 Poppler 加入项目依赖。

## 解决方案

使用 Codex 工作区已提供的 Python 运行时与 `pdfplumber`，把官方 PDF 读取到
内存并提取目标页文本。提取结果在第 2 页确认：

- `CV0116` 包含 target vehicle relative position and relative velocity；
- `CV0117` 包含 target vehicle relative attitude and relative attitude rate。

没有安装系统包，没有修改仓库运行依赖，也没有把第三方 PDF 写入项目。

## 回归验证

- [x] 原始证据核对路径通过
- [x] 官方 PDF URL 可读取
- [x] `pdfplumber` 提取到 `CV0116` 与 `CV0117`
- [x] 未引入新的项目依赖

## 相关提交

- 本次 `capsule-docking` 来源维护提交
