# 横纵分析 PDF 脚本在 macOS 缺少 libgobject

## 环境与复现

- 日期：2026-07-15
- 系统：macOS
- 入口：`hv-analysis/scripts/md_to_pdf.py`
- 已安装 Python 包：`weasyprint`、`markdown`

运行 Markdown → PDF 脚本时，HTML 可以生成，但导入 WeasyPrint 阶段抛出：`cannot load library 'libgobject-2.0-0'`。

## 根因

WeasyPrint 的 Python 包还依赖 Pango、GObject 等系统动态库。仅用 pip 安装 Python 层依赖不会自动为当前 macOS 环境补齐这些库。

## 解决方案

本次不改变研究报告源文件，改用工作区自带的 ReportLab 与系统 `Arial Unicode.ttf` 渲染 PDF；继续用 Poppler 把 PDF 转成 PNG 目检，并用 pypdf/pdfplumber 检查页数和文本。

若以后固定采用 WeasyPrint，应在安装说明中显式加入系统库安装与版本检查，而不是只写 `pip install weasyprint`。

## 验证

- 最终 PDF 共 12 页、约 410 KB；
- Poppler 成功渲染全部 12 页，抽查封面、正文、候选表与来源页无乱码、截断或表头反色；
- pypdf 与 pdfplumber 均识别 12 页，文本中可检索“76 个开源候选”、Socket.IO、WebRTC 与 Transformers.js；
- Markdown 源文件继续作为唯一内容源，PDF 只是派生产物。
