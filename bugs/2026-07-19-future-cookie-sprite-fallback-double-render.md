# 三枚以后，都是我们：图集与 CSS 备用饼干双重渲染

- 状态：`fixed`
- 日期：2026-07-19
- 环境：Codex In-app Browser，正常图片加载
- 影响阶段：collecting / ready

## 复现

正常加载 `future-cookie-atlas.png`，打开中间签。截图中饼干半片之间出现深色环线，签条下又出现额外椭圆轮廓；原始图集在深墨蓝底合成后没有这些形状。

## 根因

`.cookie-fallback` 与透明 `.cookie-sprite` 永久叠放。备用轮廓虽然位于下层，但会从图集的透明间隙透出，导致正式素材与降级素材同时可见。

## 修复

- 默认隐藏 `.cookie-fallback`；
- 用独立 `Image` 探针监听本地图集 `load` / `error`；
- 只有加载失败时给 body 加 `cookie-asset-failed`，隐藏 sprite 并显示 CSS 轮廓；
- forced-colors 下仍强制使用不依赖图片的轮廓。

## 回归

- [x] 正常加载时 body 为 `cookie-asset-ready`，fallback `display: none`，sprite `display: block`
- [x] 阻断图集时 body 为 `cookie-asset-failed`，fallback `display: block`，sprite `display: none`
- [x] 阻断背景与图集后仍能打开中间签并显示对应正文
- [x] forced-colors 规则隐藏 sprite、强制显示非图片轮廓
