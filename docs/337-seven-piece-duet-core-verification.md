# Seven-piece Duet 非视觉核心验收

- 日期：2026-07-25
- 分支：`codex/exp-seven-piece-duet-core`
- 基线：`5917f23bd1fab2dcae494348cbd8da489a25d596`
- 结论：**Conditional Go（仅非视觉核心）**

## 交付边界

本轮只交付 `experiences/co-op/seven-piece-duet/` 的非视觉核心：

- `geometry.js`：严格整数半格、四分之一 coverage、精确变换与轮廓 D4 指纹；
- `targets.js`、`tools/generate-targets.mjs`、`tools/exact-cover.mjs`：
  四个本地确定生成目标及 exact-cover 证明；
- `logic.js`：四局席位、双 draft、精确提交、完成与严格 replay；
- 三组 Node 测试、`README.md`、`TARGETS.md`、`ATTRIBUTION.md`；
- `bugs/2026-07-25-seven-piece-echo-flip-proof-gap.md`。

本轮没有创建 `index.html`、`styles.css`、`app.js` 或 favicon，没有修改 catalog、
根/分类 README、`shared/` 或依赖，也没有执行浏览器验收。目录尚未安装为可点开作品。

## 几何与目标证据

- 七片原子三角形数为 `4,4,2,1,1,2,2`，fine/bold coverage 各 8 个原子；
- 集合运算使用四分之一格 coverage，能识别 triangle key 不同但正面积重叠的情形；
- outline fingerprint 消去内部边，同轮廓不同对角剖分得到相同 D4 指纹；
- 3000 个候选按固定 piece、orientation、translation 顺序枚举，无 seed、随机数、
  网络题面、图片或外部坐标输入；
- `--emit` payload SHA-256：
  `c41d1e8e73a1caf3d994d9b9b8b81e0287d4838d8d2986caad7e3ed21766506a`；
- 四目标 outline fingerprint 互异，均为 16 个原子 / 32 个 coverage cells、
  单边界环、跨组完整边接触和非简单正方形；
- exact-cover placement row 数：

| target | rows | 冻结解在 row 集 | 至少一解 |
| --- | ---: | --- | --- |
| `embrace` | 128 | 是 | 是 |
| `side-by-side` | 109 | 是 | 是 |
| `echo` | 130 | 是 | 是 |
| `interlock` | 108 | 是 | 是 |

`echo` 移除所有 `parallelogram.flipped === true` rows 后为 UNSAT，因而“要求翻面”
不是只对标准解的描述。

## Reducer 证据

- 初态、公开 view、targets、pieces、drafts、notice 和 action 均断引用并递归冻结；
- action 使用 exact own-data schema 和 revision；旧 revision、accessor、污染原型及
  reflection trap 均 fail closed；
- A/B 只能选择自己的片，同席最多一 draft，两席可并行持有 draft；
- COMMIT 依 `invalid-action → wrong-owner → out-of-bounds → overlap` 合同判定，
  overlap conflict 按固定 piece ID 顺序；
- RESTART_MATCH 清空 gameplay，但 revision 与 noticeSerial 单调增加，避免旧 action
  与新会话 revision 再次碰撞；
- 四个冻结标准解通过公开 action 完成 `AB → BA → AB → BA` 四局；
- JSON 克隆 action log 可严格 replay 到同一 `match-complete` 状态，包含 no-op 的
  日志会被拒绝。

## 自动验收

```text
node --test geometry.test.js targets.test.js logic.test.js
34/34 passed

node tools/generate-targets.mjs --check
目标生成检查通过：4 形，候选 3000，SHA-256 c41d1e8...

npm test
2188/2188 passed

npm run verify
仓库验收通过：58 个作品入口（50 个 A 级直开、8 个非 A 启动器）、
1 个能力声明、资源与借鉴声明完整。

git diff --check
passed
```

## 来源与许可证

借鉴声明固定在项目 `ATTRIBUTION.md`：

- `shgalus/tangram`：MIT，固定 commit，仅调研 SVG/Pointer 分层；
- `vjaros/BlockPuzzleSolver`：MIT，固定 commit，仅调研验证器职责；
- W3C Pointer Events 与 WCAG 2.2：规范概念参考；
- 七片坐标、四目标、生成器、exact-cover、reducer、测试和文案均为本项目独立实现，
  未复制上游源码、题面、坐标、图片、音频或视觉素材。

## 风险与下一步

核心达到进入独立视觉方案的条件，但仍是 Conditional Go：

- 没有页面、输入适配、`file://`、响应式、辅助功能或浏览器证据；
- 未加入 catalog，不能宣称 A 级安装或点开即玩；
- 视觉阶段必须继续使用当前整数规则和 public view，不能用像素碰撞替代核心判定。
