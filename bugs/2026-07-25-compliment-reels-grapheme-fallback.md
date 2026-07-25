# Compliment Reels 无 Segmenter 时错误按码点限制字素

- 状态：已修复并完成定向回归
- 日期：2026-07-25
- 影响作品：`compliment-reels`
- 发现基线：`44b5edc0457ac3b18fc069e52d06e54b9bc630c8`

## 环境

- Node.js：v22.22.3
- 隔离运行环境：经典脚本 VM，显式提供 `Intl: {}`
- 启动等级：A 级、本地 `file://`、零第三方运行依赖

## 复现

1. 在没有 `Intl.Segmenter` 的经典脚本环境加载 `config.js` 与 `logic.js`；
2. 把 `recipient` 设为恰好 12 个 `👩‍❤️‍👩` 字素，其余配置保持合法；
3. 调用 `sanitizeConfig(candidate)`。

## 预期与实际

- 预期：12 个字素恰好位于称呼上限，应保留配置；
- 实际：旧回退把每个 emoji ZWJ 序列拆成多个码点，错误判为超长，并把整份配置
  原子回退到默认值 `"你"`。

同一缺口也会误判 Unicode Mark、Hangul Jamo、emoji modifier、旗帜和最多 120 字素的
自定义结语。

## 根因

原生路径用 `Intl.Segmenter` 按字素计数，但兼容路径只跳过代理对，实际按 Unicode
码点计数。码点边界不等于用户可见的 grapheme cluster 边界。

## 解决方案

保持 `Intl.Segmenter` 优先；无该 API 时使用仓库内已沉淀的确定性无依赖策略，处理
Unicode Mark、Hangul L/V/T、emoji modifier、成对区域指示符，以及仅限
Extended Pictographic 的 ZWJ 序列。没有新增运行时依赖，也没有复制第三方代码。

仓库已有通用说明：
`learn/2026-07-21-grapheme-fallback-without-segmenter.md`，因此本次不重复新增 learn。

## 回归验证

- [x] 先提交失败用例 `b13fab9`，在原实现稳定得到 23 通过、1 失败；
- [x] 修复提交 `cb2ebcb` 后定向测试 24 / 24；
- [x] 12 / 13 边界覆盖 Unicode Mark、Hangul、emoji modifier、emoji ZWJ 与旗帜；
- [x] 自定义结语 120 / 121 字素边界在无 Segmenter VM 中通过；
- [x] 全仓 `npm test` 2271 / 2271，`npm run verify` 通过。
