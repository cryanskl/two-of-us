# Attribution Gate 只检查标题导致完整性假阳性

## 发现日期

2026-07-25

## 影响

`npm run verify` 可以在以下真实缺口同时存在时通过，并由
`scripts/validate-repository.mjs` 输出“资源与借鉴声明完整”：

- `love-tree` 实际分发无统一许可证的迁移代码；
- `love-tree/renxi.mp3` 是授权未闭合的商业录音；
- 多个实际 Socket.IO/Pannellum 入口只链接浮动仓库，缺固定许可证 URL 与版权人；
- 多个研究来源只有许可证名称或 SHA，没有同一固定 revision 下的许可证载体。

这会让编排看板或后续代理把“有声明标题”误判为“来源、许可证与资产已闭环”。

## 复现

严格基线：

```text
5e76c23d01f9f2d1ee807addf210284e27309d73
```

1. 查看 `experiences/surprises/love-tree/README.md` 的来源声明，它明确写明：
   上游没有统一开源许可证、旧 jQuery/Jscex 来源链不完整、背景音乐需要授权。
2. 查看 `love-tree/index.html`，入口仍加载这些脚本并自动播放 `renxi.mp3`。
3. 运行：

```bash
npm run verify
```

4. 验证通过，且 repository validator 仍输出“资源与借鉴声明完整”。

## 根因

`scripts/validate-repository.mjs` 对 installed 项目的归因验证只确认 README 中出现
`## 借鉴与来源声明` 标题；能力包侧只确认至少有一个许可证文件。它不解析或交叉验证：

- commit/tag 是否固定、URL 是否真实可达；
- 许可证名称、固定许可证 URL、版权人是否齐全；
- 实际依赖、复制代码和运行资产是否都有对应声明；
- 音频、字体、地图、题库是否与软件许可证分层；
- “研究/排除”与“复制/修改/链接”的不同再分发义务。

测试 fixture 也只冻结标题存在，因此实现与测试共同遗漏了语义完整性。

## 建议修复

总控串行实现，不在本审计分支直接修改验证器：

1. 为每个来源建立结构化记录，至少含项目 ID、来源类型、固定 revision、
   固定许可证 URL、版权人、usage、借鉴/未复制范围、本地文件和验证日期。
2. 将记录与 `package-lock.json`、HTML/CSS/JS 引用、媒体文件、能力包许可证做闭包检查。
3. `copied|modified|linked` 缺许可载体或本地 notice 时失败；
   `researched|excluded` 缺固定证据时至少失败或明确降级。
4. 把当前成功消息改为与实际检查强度一致，直到语义 Gate 完成前不得声称“完整”。
5. 增加 `love-tree`、浮动 Socket.IO、孤立媒体和许可证 URL 缺失的失败 fixture。

## 关联审计

详见 [`docs/363-attribution-and-license-audit.md`](../docs/363-attribution-and-license-audit.md)。
