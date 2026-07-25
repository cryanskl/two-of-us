# 蜜径相逢

一款同设备热座双人对抗游戏：两枚棋子在 37 格六角蜂巢上轮流移动或放置封蜡，
先到对边者获胜，但任何一次封蜡都不能让任一方失去全部路线。

## 启动

双击本目录的 `index.html`，浏览器会用 `file://` 直接打开。作品不需要安装、构建、
本地服务、账号、权限或联网；也没有第三方运行依赖。

如果浏览器限制本地文件脚本，也可在仓库根目录运行任意静态文件服务，再打开：

```text
experiences/versus/honeycomb-passage/index.html
```

这只是可选验证方式，不是运行依赖。

## 玩法

- 蜜黄先手，两个人轮流在同一设备操作。
- 每个半回合选择“移动”或“封蜡”：
  - 移动：走到相邻、没有封蜡且没有另一枚棋子的格；
  - 封蜡：消耗自己 1 枚封蜡，永久封住任意空格。
- 每人初始有 4 枚封蜡。
- 封蜡不能切断蜜黄或暮紫的全部永久路线；不合法格会解释“会让谁无路可走”。
- 合法行动后进入热座交接，页面提示交给下一位；确认“交给下一位”不会增加行动、
  修改 history 或消耗封蜡。
- 最多 16 个完整回合。若无人抵达，先比较距目标边的最短距离，再比较剩余封蜡，
  仍相同即平局。

所有格子都是原生按钮。鼠标、触屏、Tab、Enter 和 Space 都可完成操作；颜色之外
还使用棋子刻纹、封蜡文字、合法移动圆点、合法封蜡斜线和完整状态文字。

## 个性化

直接编辑 `config.js` 中的纯文本：

```js
window.HONEYCOMB_PASSAGE_CONFIG = {
  playerNames: ["蜜黄", "暮紫"],
  finalNote: "绕一点路，也还是会在对面相逢。"
};
```

实际文件以 `globalThis.HONEYCOMB_PASSAGE_CONFIG` 暴露同一对象。`playerNames` 是
两个不同的 1–12 字符名字，`finalNote` 是 1–80 字符结语；非法配置安全回退默认值。

这些本地纯文本不是秘密：拿到作品目录的人可以直接阅读。页面只用 `textContent`
显示它们，不把内容当作 HTML。

## 本地与隐私合同

- 零网络：不使用 fetch、XHR、WebSocket、CDN、远程字体或远程素材。
- 不使用 storage：不写 localStorage、sessionStorage、IndexedDB、Cache Storage、
  Cookie、URL query 或 hash。
- 不请求摄像头、麦克风、定位、通知或其他权限。
- 不使用 Service Worker、Worker、音频、随机数或真实计时。
- 刷新或关闭页面会清空当前对局；没有长期战绩、分享链接或后台同步。

## 自测

在仓库根目录运行：

```bash
node --test \
  experiences/versus/honeycomb-passage/logic.test.js \
  experiences/versus/honeycomb-passage/ui-contract.test.js
```

全仓检查：

```bash
npm test
npm run verify
```

## 借鉴声明

“蜜径相逢”的规则组合、生产代码、测试、中文文案、CSS 视觉、图标与交互均为本仓库
独立实现，零第三方运行依赖。调研参考：

- Amit Patel / Red Blob Games 的 **Hexagonal Grids** 与
  **Implementation of Hex Grids**：只核对轴坐标、六邻接和图寻路教学概念；
- `flauwekeul/honeycomb@6353276ef8197fbdba60d0c964f7bd4f2169064c`
  （MIT，Copyright © 2017 Abbe Keultjes）：只核对坐标、网格、渲染职责分离；
- `tridpt/TwoPlayerGames@c96b802232d87d58408ed653dcbe43c0a68611f6`
  （MIT，Copyright © 2026 tridpt）：只作为主动避开的 Hex 连边落子反例；
- W3C WCAG 2.2：只用于键盘、焦点、状态消息和目标尺寸校准。

未复制、翻译、改写或打包上述来源的代码、API、测试、公式排版、DOM、CSS、示例、
图片、字体、音频或品牌元素。固定来源、许可证链接与更完整的未复制边界见
`ATTRIBUTION.md`。
