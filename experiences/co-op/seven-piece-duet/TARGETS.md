# Seven-piece Duet 目标生成记录

## 来源边界

四个目标均由本目录的 `geometry.js` 七片模板和
`tools/generate-targets.mjs` 在本地确定性枚举得到。生成过程没有读取网络题面、
图片、第三方七巧板坐标、仓库外 silhouette 或开源项目源码。七片坐标是依照
`README.md` 所述面积合同独立构造；上游项目只用于许可证、交互与验证思路调研，
具体借鉴边界见 `ATTRIBUTION.md`。

## 生成算法

运行：

```bash
node experiences/co-op/seven-piece-duet/tools/generate-targets.mjs --summary
node experiences/co-op/seven-piece-duet/tools/generate-targets.mjs --emit
node experiences/co-op/seven-piece-duet/tools/generate-targets.mjs --check
```

工具版本为 `VERSION = 1` 的整数几何合同，固定参数如下：

- 无 seed、PRNG、时间或浮点几何；
- piece 顺序固定为 `large-a`、`large-b`、`medium`、`small-a`、
  `small-b`、`square`、`parallelogram`；
- 固定 `large-a` 的原点姿态，其他片按 `flipped`、`quarterTurns`、
  `tx=-4..5`、`ty=-4..5` 的稳定顺序枚举；
- 每次新增片必须共享一条完整原子边，且四分之一格 coverage 不得发生正面积重叠；
- partial state 用 coverage 序列去重；完整形要求 32 个 coverage cells、单一边界环、
  fine/bold 跨组接边和唯一 D4 外轮廓指纹；
- 收集前 3000 个合格且不同轮廓的候选；用固定整数排序规则选择紧凑、横向、
  翻面和高边界复杂度四类，不做人工坐标回填。
- `tools/exact-cover.mjs` 为每个目标枚举全部合法 placement row；列由 7 个
  piece-ID 和 32 个四分之一格 coverage cell 组成，按“可选 row 最少、固定列序、
  固定 pose 序”执行确定性 Algorithm X；
- 四形都必须至少有一个 exact cover，冻结标准解的七个 pose 必须逐一存在于 row
  集并覆盖全部 target；`echo` 删除所有 `parallelogram.flipped === true` row
  后必须为 UNSAT。

当前 `--emit` 字节流的 SHA-256 为：

```text
c41d1e8e73a1caf3d994d9b9b8b81e0287d4838d8d2986caad7e3ed21766506a
```

连续两次运行必须得到相同 SHA-256；`--check` 还会逐字段比较
`targets.js` 的公开目标并执行 exact-cover 验证。

## 固定结果

| ID | 标题 | board（含一格边距） | outline fingerprint SHA-256 | 标准解 flip |
| --- | --- | --- | --- | --- |
| `embrace` | 相拥 | `-4,-3..3,3` | `3ca434abd35c8de4247878dac2559ce79ee00d8839407b310a82256be87b6153` | 否 |
| `side-by-side` | 并肩 | `-5,-3..4,3` | `a3389beee15e58e08441768308acf9803ec779a820938e94d4b849cb8eeb406a` | 是 |
| `echo` | 回响 | `-4,-3..3,3` | `b2b4185d282a0739a3426f8454d139f1e519d45facebce459753e4547c1275a5` | 是 |
| `interlock` | 相扣 | `-4,-3..3,3` | `4b1c8655745dfd69010102644a261f5593f2fe312c12466c225feebe2dc85a1c` | 否 |

表中 hash 是完整 outline fingerprint 的短展示凭据；权威字符串和 16 个原子
triangle keys 由 `targets.js` 公开。四个标准解都恰好使用七片、覆盖 16 个原子
三角形、无正面积重叠、不是简单正方形，且 fine/bold 两组存在完整边接触。
`echo` 不只是标准解使用平行四边形翻面：确定性 exact-cover 验证器在移除所有
翻面 row 后返回 UNSAT，因此“要求翻面”是当前离散半格规则下的可执行合同。

## 人工内容审计

审计基于脚本生成的整数轮廓和 bounding box，不使用搜索引擎反向查图：

- 四形是抽象的紧凑、横向、回声和咬合关系，不命名为人物、船、动物、商标或
  其他常见网络七巧板题面；
- 排除了简单正方形复原；
- 未把仓库高频的心形、星形、迷宫、家具或照片拼图当作候选输入；
- 与 `photo-swap-puzzle` 的图片切片、`moving-home-together` 的协作搬运、
  `dual-maze-race` 的分屏迷宫、`tethered-heart` 的双点拉伸机制不同；
- `side-by-side` 和 `echo` 都在标准解中展示平行四边形 flip，但角色选择规则和
  D4 指纹不同。

独立生成只能证明来源链、枚举和筛选可复现，不能证明世界上不存在偶然相似。
若未来发现与知名角色、标志或常见题面高度相似，应把完整 fingerprint 加入固定
denylist，再由同一枚举顺序选择下一候选，并把变化作为独立提交记录。
