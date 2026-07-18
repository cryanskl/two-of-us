# 借鉴与来源声明

## OpenAI ImageGen 月面纹理

- 文件：`moon-surface.png`；
- 生成日期：2026-07-18；
- 工具：Codex 内置 OpenAI ImageGen；
- 用途：中央月面纹理，由 CSS 裁切成圆形并叠加相位暗面；
- 提示词摘要：无字、正交、均匀漫射光的珍珠灰月表纹理，完全铺满方形画布，不含星空、地球、航天器、标识或水印；
- 运行回退：图片失败时使用代码原生圆面与三处陨石坑，规则和留言不依赖该图片。

## 天文事实来源

- [NASA Science：Moon Phases](https://science.nasa.gov/moon/moon-phases/)：八相顺序与约 29.5 天周期；
- [NASA RP 1349](https://eclipse.gsfc.nasa.gov/TYPE/moonphase.html)：2000-01-06 18:15 UTC 新月基准；
- [NASA/TP–2008–214170](https://ntrs.nasa.gov/api/citations/20080040150/downloads/20080040150.pdf)：平均朔望月 29.53059 天；
- [USNO Moon Phases](https://aa.usno.navy.mil/data/MoonPhases)：调研和抽样核对。

这些资料用于事实与近似边界，不包含下载、描摹或再分发 NASA/USNO 图片。

## 开源对照与零复制声明

调研对照了 BSD 许可的 [`mourner/suncalc@bbc91f6`](https://github.com/mourner/suncalc/tree/bbc91f689ede3ff7173011947d435b3fb6c0485d)。本作没有复制、运行、vendoring 或改写 SunCalc 源码，也没有引入其包；只记录“完整天文库不应为八档纪念日谜题增加依赖”的技术取舍。

日期状态机、八相近似、角度量化、配置策略、中文文案、DOM、CSS 和测试均由本仓库原创。私人日期和留言由使用者自行填写，不属于仓库示例资产的来源声明范围。
