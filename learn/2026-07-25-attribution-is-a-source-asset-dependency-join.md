# 借鉴声明不是一段文案，而是四张清单的连接

## 结论

“README 有借鉴声明”只能证明文件里有一段文字，不能证明项目可复制、可打包或可
再分发。可靠审计应把四张清单连接起来：

1. **研究来源集**：research 中真正参与方案判断的论文、标准、开源项目与淘汰项；
2. **实际依赖集**：lockfile、vendor、能力包与运行时加载的代码/模型；
3. **运行资产集**：图片、字体、录音、地图、关卡、题库和用户自备内容；
4. **权利证据集**：固定 revision、许可证载体、版权/权利主体、notice 与生成台账。

只有每个实际节点都能连接到适用证据，且每个声明节点的 usage 与现实一致，才能说
来源闭环。

## 为什么要分层

- 软件许可证不自动授权仓库里的歌曲、照片、字体或题库。
- 只研究机制且零复制，和直接链接 npm/WASM 依赖的义务不同。
- 固定 commit 只解决证据漂移，不会给“无许可证代码”创造授权。
- lockfile 固定安装版本，但不替代面向人的版权与许可证声明。
- “本地使用”描述数据路径，不描述复制与再分发权利。
- 生成图片也需要工具、日期、输入链、文件哈希和是否进入生产的台账。

## 可复用审计顺序

1. 从 catalog 得到真实 installed 集合，不用目录数量代替。
2. 枚举每个入口的 HTML/CSS/JS 引用、运行媒体与 README/ATTRIBUTION。
3. 从 package/lockfile、能力包和 vendor 反查真实第三方依赖。
4. 将 research URL 集与最终声明 URL 集对比；对被淘汰来源显式写
   `excluded`，不要静默删除。
5. 按 `code | dependency | image | font | audio | map | question_bank |
   standard | research` 分类。
6. 对 `copied | modified | linked` 检查许可证正文、版权和 notice；
   对 `researched | excluded` 检查固定证据、实际借鉴和未复制范围。
7. 用文件哈希和本地引用关系检查孤立资产、未声明副本与文档台账。
8. 最后再让自动化报告“完整”；标题存在只能作为最弱的格式检查。

## 本仓实例

- `love-tree` 的 README 已诚实披露风险，但运行目录仍分发无统一许可证的迁移代码
  和商业录音，因此状态必须是公开分发阻断。
- `i-heard-you` 的入口声明字段较少，但它明确委托到
  `speech-whisper-base`，能力包保存引擎、模型、工具链的固定 revision、许可证正文、
  哈希和构建记录，因此可以沿委托关系闭环。
- `our-place-guess` 的 Natural Earth 地图数据固定 commit、public-domain 条款、
  派生脚本和输出哈希一致，是“地图数据”与软件依赖分开归因的正例。
- Socket.IO、node-qrcode 和 Pannellum 均被 lockfile 精确固定，但共享/入口声明仍
  需要同一 revision 的仓库与许可证链接，说明版本闭包和权利闭包不是同一件事。

## 自动化最小模型

机器校验不必理解自然语言全文，但至少应能验证：

```text
project -> local file/dependency/asset
local item -> source kind + usage
external source -> immutable revision
revision -> license carrier + rights holder
usage -> borrowed + not_copied + redistribution obligations
```

这样新增项目、替换媒体或升级依赖时，Gate 能指出具体断开的边，而不是只判断某个
标题是否存在。
