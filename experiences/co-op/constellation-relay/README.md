# 把星光，一笔一笔交给你

一款两个人共用同一台设备的本地合作接线题。你们从固定线轴出发，轮流追加一根线；十根公开星线必须全部恰好接过一次，不能重复、不能穿线，也不能让剩余线路变得无法完成。

## 直接打开

双击 [`index.html`](./index.html) 即可游玩。作品使用经典脚本与相对本地资源，不需要安装依赖、启动服务器、联网或登录。

如果浏览器询问是否允许打开本地文件，只需要允许打开本页；作品不会读取作品目录之外的文件。

## 两个人怎么玩

1. 点击“开始接线”，把设备交给页面写明的席位；
2. 当前席点击“接过观测台”；
3. 从亮着的当前线头选择下一颗星。接通后，把设备交给下一位；
4. 如果线路重复、相撞、离开公开轮廓，或会让余下线路无法接完，本次不会推进，也不会换席；
5. 十根线接通后，两席会刚好各完成五根，再一起留下完成纪念。

鼠标和触屏直接点击星点。键盘先用 `Tab` 进入棋盘，再用方向键移动焦点，按 `Enter` 或空格接线；`Escape` 会清除预览并回到当前线头。

## 同机信任边界

这是一张始终公开的共同棋盘，不存在需要遮住的私人答案。页面会明确提示当前由谁操作，请按提示轮流交接同一台设备。

作品不验证现实身份，也不会阻止另一位代按；合作与轮流依靠两个人之间的约定。

## 本地定制

用文本编辑器打开 [`config.js`](./config.js)，可以修改两席称呼和完成结语：

```js
window.CONSTELLATION_RELAY_CONFIG = {
  seats: { a: "你", b: "TA" },
  completionNote: "这十次交接，刚好把同一束星光送到了彼此手里。"
};
```

两席称呼去空白后各为 1–12 个 Unicode 字素，且不能相同；完成结语为 1–80 个字素。任一字段或结构不合法时，整份配置会安全回退，不会把示例和半份自定义混在一起。配置只能改变称呼和完成语气，不能改写关卡、点位、线路、轮值或胜利条件。

## 隐私、依赖与降级

- 不发起网络请求，不使用 `fetch`、WebSocket、远程字体、CDN 或第三方运行时；
- 不使用 Cookie、localStorage、sessionStorage、IndexedDB、Worker 或 Service Worker；
- 不保存称呼、线路、尝试或完成结果，刷新页面会从头开始；
- 背景和完成纪念图均随目录本地提供；图片缺失时会使用纯色面板，HTML 星点、SVG 线路、规则、日志和完整玩法仍然可用；
- 作品目录不引用 `shared/` 或其他体验目录，复制整个 `constellation-relay` 文件夹后仍可直接打开。

## 借鉴与来源声明

本作的规则、代码、关卡、点位、连线、界面、文案与生成式视觉资产均为独立实现。开发前曾研究 Cross-Link 的星点连接与次序规划、robust-segment-intersect 的相交边界、Paper.js 的输入/几何/渲染分层、NetworkX 的 Euler 路径定义，以及 d3-celestial 的星点数据分层；未复制这些项目的源码、算法实现、测试、数据集、天文坐标、素材或界面。

五个项目的固定版本、许可证、版权主体、研究范围和明确排除项，以及两张 OpenAI ImageGen 运行资产的日期、尺寸与 SHA-256，见 [`ATTRIBUTION.md`](./ATTRIBUTION.md)。完整调研见 [`../../../docs/166-constellation-relay-research.md`](../../../docs/166-constellation-relay-research.md)，规则规格与视觉冻结分别见 [`../../../docs/167-constellation-relay-spec.md`](../../../docs/167-constellation-relay-spec.md) 和 [`../../../docs/168-constellation-relay-design.md`](../../../docs/168-constellation-relay-design.md)。

Vanta.js 只在调研中作为排除项记录：作品不使用或复制其 WebGL、Three.js/p5.js、NET 效果、着色器、粒子布局、参数或画廊视觉。

## 开发检查

在仓库根目录运行：

```bash
node --check experiences/co-op/constellation-relay/app.js
node --test experiences/co-op/constellation-relay/logic.test.js
npm run verify
npm test
```

浏览器验收还应覆盖完整十线流程、四类失败、纯键盘路径、`1504×1046`、`1280×800`、`390×844`、`320×568`、200% 缩放、减少动态效果、强制颜色和图片阻断。
