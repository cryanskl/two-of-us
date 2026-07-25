# 七片同心（非视觉核心）

`seven-piece-duet` 是一款规划中的 A 级同屏双人合作拼形体验。A、B 两席各自控制一组几何片，在同一个公开轮廓中共同完成精确覆盖；四局会交换三片组与四片组。

当前目录只实现、测试以下非视觉核心：

- 整数原子三角形几何；
- 四个本仓库独立生成的固定目标；
- 席位权限、草稿、提交、换局和完整重放 reducer；
- 目标来源链与借鉴声明。

当前没有 `index.html`、样式或浏览器输入适配器，尚不能点开游玩，也没有加入 catalog。界面、Pointer、键盘、响应式、`file://` 和浏览器验收需等待独立视觉方案及后续实现。

## 运行核心检查

在仓库根目录执行：

```bash
node experiences/co-op/seven-piece-duet/geometry.test.js
node experiences/co-op/seven-piece-duet/tools/generate-targets.mjs --check
node --test experiences/co-op/seven-piece-duet/targets.test.js
node experiences/co-op/seven-piece-duet/logic.test.js
```

目标生成器和测试只使用 Node 标准库，不需要项目私有安装步骤。未来运行页面的合同仍是零运行依赖、零网络、零存储和零权限。

## 席位边界

“归属”表示 reducer 验证 A 席 action 不能移动 B 席片，B 席 action 不能移动 A 席片。它不是自然人身份认证；同一设备无法阻止一个人主动使用另一席控件。

## 借鉴与原创

本项目只参考传统七片拼形的抽象机制，并自行实现整数几何、片模板、目标生成、状态机、测试、文案和未来视觉。固定来源、许可证、版权主体以及明确未复制范围见 [`ATTRIBUTION.md`](./ATTRIBUTION.md)。

四个固定目标均由本仓库生成器产生；固定候选、标准解、D4 指纹、翻面
exact-cover 证明和人工内容审计记录在 [`TARGETS.md`](./TARGETS.md)。
