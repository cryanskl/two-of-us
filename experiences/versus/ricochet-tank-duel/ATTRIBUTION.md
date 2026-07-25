# 研究来源与独立实现声明

## 本项目没有采用开源游戏实现

`ricochet-tank-duel` 第一版非视觉核心从零编写，没有参考或复制任何开源坦克游戏、商业游戏、物理引擎或碰撞库的代码、API、地图、数值、测试、品牌、图标或素材，也没有新增运行时依赖。

## 学术与标准资料

以下资料只用于理解抽象工程问题，不构成软件依赖：

1. Min Tang, Young J. Kim, Dinesh Manocha, *Controlled Conservative Advancement for Continuous Collision Detection of Polygonal Models*, ICRA 2009。  
   <https://gamma-web.iacs.umd.edu/papers/documents/articles/2009/tang09.pdf>
2. Jeff Linahan, *Improving the Numerical Robustness of Sphere Swept Collision Detection*, 2012。  
   <https://arxiv.org/abs/1211.0059>
3. Joachim Breitner, Chris Smith, *Lock-step simulation is child's play*, 2017。  
   <https://arxiv.org/abs/1705.09704>
4. W3C, *High Resolution Time Level 3*。  
   <https://www.w3.org/TR/hr-time-3/>
5. WHATWG, *HTML — Animation frames* 与 *Page visibility*。  
   <https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames>  
   <https://html.spec.whatwg.org/multipage/interaction.html#page-visibility>

实际借鉴范围仅为：

- 用固定逻辑步长隔离渲染帧率；
- 在运动区间中求最早接触，避免离散终点检测造成高速穿透；
- 冻结并列事件、零时间接触和数值边界；
- 相同初始状态与输入日志必须得到相同演化；
- 页面恢复后不追赶后台时间。

没有复制论文中的源码、伪代码、实验数据、模型、图表或示例参数。几何、Q10 数值、镜像地图、状态机、重放和测试均依据本仓库 `docs/299–302` 独立实现。

如后续实际参考任何开源软件，必须在合入前补充固定 URL、commit/tag、许可证、版权人、借鉴内容和未复制范围。
