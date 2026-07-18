# 把这首转给你

一个 A 级、本地优先的单人惊喜：接收者顺时针转动音乐盒摇柄，32 个齿位会逐音播放一段原创合成旋律，并在八圈内逐步展开纸雕夜景。完成第八圈后，页面才创建最终留言。

## 打开

在完整仓库内直接双击 `index.html` 即可。也可以从仓库根目录运行 `start.command` / `start.bat`，再从统一门户打开。

- 不需要安装 npm 包；
- 不需要服务器、账号或网络；
- 声音不可用或主动静音时，视觉进度与最终留言仍然完整可玩；
- 刷新页面会从头开始，不保存进度。

若要把作品单独赠送，需要同时复制仓库的 `shared/audio/tone-player.js`，并保持 `experiences/surprises/hand-crank-music-box/` 到该文件的相对目录结构。共享脚本缺失时仍可无声完成，但不会播放合成音。

## 玩法

1. 点击“开始转动”；
2. 在摇柄圆形区域按住并顺时针拖动；
3. 也可聚焦摇柄后按 `ArrowRight` / `Space`，或点击“转一格”；
4. 每四格完成一圈，八圈后展开留言；
5. 点击“再转一次”清空本轮进度。

来回摆动不能重复刷进度：反向转动只会离开历史最高角度，必须重新追平旧峰值后才会继续产生新齿位。

## 准备一份自己的惊喜

用文本编辑器打开 `config.js`，可修改：

- `recipientName`：完成后显示的称呼；
- `finalTitle`：最终标题；
- `finalMessage`：最终留言；
- `composeMotif`：可选的 5–10 行旋律策略。

`composeMotif` 返回 8–16 个合法 note ID；可用值为 `c5 / d5 / e5 / f5 / g5 / a5 / c6 / d6`。返回 `null` 使用内置原创动机；返回非法数组或抛出异常会安全回退，不会阻断惊喜。

## 本地、隐私与降级边界

- 页面没有网络请求、输入框、账号、Cookie、`localStorage`、IndexedDB 或 Service Worker；
- 文案只存在本地 `config.js`，不会上传；但它是本地明文，不是密码学保密；
- 最终称呼、标题和留言在 `intro` / `playing` 阶段不会创建到 DOM，只有完成后才生成；
- 图片加载失败时改用 CSS 的“月亮—路径—两点灯”场景，不显示破图图标；
- Web Audio 初始化或播放失败时显示“无声也能继续”，规则进度不受影响；
- 页面进入后台时取消指针会话并关闭当前声音上下文，返回后下一次真实操作再尝试恢复声音；
- `prefers-reduced-motion` 下取消错峰和位移动画，直接呈现目标状态。

## 借鉴与来源声明

本作只借鉴传统圆筒音乐盒“旋转圆筒的凸点依次拨动音梳”的公共机械原理。机械类比参考 [Smithsonian Paillard & Cie. Cylinder Music Box](https://americanhistory.si.edu/collections/object/nmah_605759) 和 [Smithsonian 乐器目录研究](https://repository.si.edu/bitstreams/b8449723-a7f4-4b27-8ccb-f43ded30d579/download)；馆藏内容仅用于研究，没有下载、描摹或分发馆藏图片。

Web Audio 的用户手势、自动播放与失败降级边界依据：

- [W3C Web Audio API](https://www.w3.org/TR/webaudio-1.0/)；
- [W3C Autoplay Policy Detection](https://www.w3.org/TR/autoplay-detection/)；
- [MDN Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)。

状态机、角度展开、防摆动规则、八音动机、中文文案、DOM、CSS 和测试均为本仓库原创。没有读取、运行、复制或改写第三方音乐盒项目源码，没有引入 Tone.js，没有使用商业音乐、第三方代码、第三方歌曲或馆藏图片。

运行纸雕资产由 OpenAI ImageGen 于 2026-07-18 生成，详情见 [`assets/ATTRIBUTION.md`](./assets/ATTRIBUTION.md)。唯一复用的运行时代码是本仓库自己的 [`../../../shared/audio/tone-player.js`](../../../shared/audio/tone-player.js)。
