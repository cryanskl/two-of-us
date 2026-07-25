# vinyl-secret 来源声明漏列冻结的一手边界

- 日期：2026-07-25
- 项目：`vinyl-secret`
- 影响范围：`ATTRIBUTION.md` 的一手来源清单
- 状态：已修复

## 复现与影响

对照 `269-vinyl-secret-spec.md` 第 15 节与 `270-vinyl-secret-plan.md` 第 6.4 节，
原 `ATTRIBUTION.md` 已列 Library of Congress、WHATWG、ARIA APG 和美国版权局，
但漏列：

- W3C WCAG 2.2；
- WebKit 与 Chrome 的 autoplay / 用户激活政策页。

这不会改变当前非视觉核心运行，但会让后续 UI、可选本地音频和可访问性边界缺少
完整的一手来源路由，也与冻结的交付清单不一致。

## 根因

核心阶段写声明时只保留了四条代表性来源，没有把研究、规格与计划中已经冻结的
浏览器厂商和 WCAG 条目逐项回填，也没有静态测试防止来源清单缩减。

## 修复

- 在 `ATTRIBUTION.md` 补充 WCAG 2.2、WebKit 与 Chrome 官方页面；
- 明确三者只约束未来 UI / 可选音频，不表示当前核心已经实现或通过浏览器验收；
- 保持“无第三方开源仓库参考、零复制、默认无音频”声明不变。

## 回归

`logic.test.js` 新增来源合同测试，锁定七个一手 URL、零开源复制声明和默认
`audioSrc:null` 声明。项目测试 38/38 通过。
