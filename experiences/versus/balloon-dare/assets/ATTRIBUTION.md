# 气球胆量局视觉资产来源

本目录的运行时图片由 OpenAI ImageGen 在 2026-07-17 根据 [`docs/36-balloon-dare-spec.md`](../../../../docs/36-balloon-dare-spec.md) 生成，没有复制或改写第三方开源项目、商业素材、图库、字体或品牌资产。

| 文件 | 用途 | 生成与处理 |
| --- | --- | --- |
| `balloon.png` | 完整气球，青绿方通过同一资产的确定性色相变换展示 | ImageGen 生成珊瑚气球，内置 helper 去除纯绿色背景 |
| `pump-gauge.png` | 打气筒、软管与 0–8 机械压力表 | ImageGen 生成，内置 helper 去除纯绿色背景；动态读数仍由 HTML/CSS 提供 |
| `balloon-burst.png` | 爆点结果的碎片状态 | ImageGen 生成，内置 helper 去除纯绿色背景 |

设计概念保存在 [`docs/assets/balloon-dare/concept.png`](../../../../docs/assets/balloon-dare/concept.png)，只作构图、色板与控件层级的设计基准，不是运行依赖。

生成提示的共同约束：夜间嘉年华、复古编辑式丝网印刷、珊瑚/青绿/奶油/黄铜色板、深紫描边、无人物、无品牌、无水印；运行资产使用纯绿色色键，之后以 `remove_chroma_key.py` 生成透明 PNG。
