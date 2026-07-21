# 无 Segmenter 的字素回退：Unicode Mark、Hangul 与 emoji ZWJ

## 适用范围

适用于需要按“用户看到的字符”限制称呼或短文长度、优先使用 `Intl.Segmenter`，但又承诺在缺少该 API 的离线浏览器中保持确定性行为的页面。

## 关键结论

code unit、code point 和 grapheme cluster 是三个不同边界。按 code point 计数仍会把 `é`、`שְ`、`نّ`、`का`、Hangul Jamo `가` 或家庭 emoji 拆成多个“字符”。

一个实用但有限的无依赖回退至少需要：

- 用 Unicode `Mark` 属性吸收组合附加符，而不是只枚举拉丁 Combining Diacritical Marks；
- 实现 Hangul L/V/T/LV/LVT 的连接规则；
- 把变体选择符与肤色修饰符留在当前 cluster；
- 区域指示符两两组成旗帜；
- 只有 `Extended_Pictographic` emoji 序列允许经 ZWJ 继续连接。

最后一点很关键：无条件把 `ZWJ + 任意 code point` 合并，会把非 emoji `a‍b` 错算为一个字素，从而让实际超长输入越过上限。

## 反例

- 用 `string.length` 作为用户可见字符数；
- 用 `Array.from(string).length` 后声称已经按字素计数；
- 只测试 `e + combining acute` 和一个家庭 emoji；
- 实现与测试共用同一份字符白名单，导致共同窄化假设无法被发现。

## 验证矩阵

在显式禁用 `Intl.Segmenter` 的隔离环境中，对每个 cluster 分别验证上限 N 与 N+1：

| 类别 | 示例 | 关键规则 |
| --- | --- | --- |
| 拉丁 Mark | `é` | Unicode Mark |
| 希伯来/阿拉伯/天城文 | `שְ` / `نّ` / `का` | 非拉丁 Mark |
| Hangul Jamo | `가` | L + V |
| emoji modifier | `👍🏽` | modifier |
| emoji ZWJ | `👩‍❤️‍👩` | Extended Pictographic |
| 非 emoji ZWJ | `a‍b` | 必须断开为两个 cluster |
| 旗帜 | `🇲🇾` | Regional Indicator pair |

还应让独立审阅者用原生 `Intl.Segmenter` 做对照探针，避免生产实现与测试共享错误规则。

## 边界声明

这不是完整重实现 Unicode Grapheme Cluster Boundary 标准。若产品必须覆盖标准的全部版本与脚本，应固定并离线打包经过审计的分词库；小型零依赖作品则应清楚写出支持子集，并用真实目标语言扩展回归矩阵。

本仓实证：影子双人舞在无 `Intl.Segmenter` VM 中覆盖上述 12 / 13 与 120 / 121 边界，定向 27 / 27、全仓 1590 / 1590。
