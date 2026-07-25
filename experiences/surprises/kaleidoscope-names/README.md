# 把名字折成同一束光

一个准备者提前写好线索、体验者稍后单人打开的本地惊喜。体验者根据两条线索
选择镜面阶数、转动相位；两项严格对齐后，还要主动按下“照见我们”，两枚名字
标记和留言才会进入页面。

## 点开即用

直接双击本目录的 `index.html` 即可通过 `file://` 打开，不需要安装、构建、
本地服务、账号或网络。

30 秒规则：

1. 从 `4 面` 到 `9 面` 中选一个折面；
2. 用 `0–23` 的原生相位滑杆寻找另一项答案；
3. “已经贴近”只说明答案在附近，不提供增减或旋转方向；
4. 两项都显示“已对齐”后，主动揭晓结果。

错误没有惩罚、计时、分数或失败结局。

## 输入与无障碍

- 鼠标和触屏：点按折面按钮，拖动原生 range；
- 键盘：Tab 移动焦点，Enter/Space 选择折面，方向键、Home、End 操作相位；
- 每个按钮与相位控件都有不小于 48 CSS px 的目标；
- far / near / exact 同时使用文字和不同轮廓，不只依赖颜色；
- `prefers-reduced-motion` 下取消非必要过渡；
- Canvas 不可用时自动显示 CSS 折光环，文字、控件、对齐和揭晓仍然有效；
- 禁用 JavaScript 时只显示公共介绍和启用提示，不伪装成可玩控件。

Canvas 只是当前公开 pattern model 的投影，不参与答案判断，也不绘制两枚名字
或结尾文字。

## 准备自己的惊喜

用文本编辑器打开同目录的 `config.js`，只修改 `createConfig()` 返回对象中的值。

| 字段 | 含义 |
| --- | --- |
| `publicTitle` | 公共标题 |
| `publicInstructions` | 开始前的公共说明 |
| `foldHint` | 折面线索 |
| `phaseHint` | 相位线索 |
| `targetFolds` | 整数答案，范围 `4–9` |
| `targetPhase` | 整数答案，范围 `0–23` |
| `marks` | 两枚标记，每枚 1–2 个 Unicode code point |
| `finalTitle` | 揭晓后的标题 |
| `finalMessage` | 揭晓后的留言 |
| `signature` | 署名 |

`phaseStep` 和 `targetPhase` 都直接使用 `0–23`，页面不会擅自加一。若把 24 格
理解为每小时两格的钟面，则十一点对应 `22`。默认答案就是
`targetFolds: 5`、`targetPhase: 22`。

配置必须整份合法，否则会原子回退到默认示例；不要新增字段，不要把数字写成
字符串。marks 按 code point 而不是完整 grapheme 计算，因此某些 emoji ZWJ
序列即使看起来只有一个图形，也可能超过 1–2 的限制。

## 隐私与本地边界

`config.js` 是明文，不是加密文件。把整个目录交给别人，也等于把其中的线索、
答案、标记和留言源文件交给对方。页面提供的是“正常体验流程不提前渲染”的
叙事隐私，不承诺防止查看源码。

运行时保持：

- 零网络；
- 零存储、Cookie 或 URL 私人参数；
- 零权限申请；
- 零摄像头、麦克风、位置、传感器、通知或文件权限；
- 零第三方运行依赖；
- 重开后不保留上一轮状态。

## 本地验证

```bash
node --check experiences/surprises/kaleidoscope-names/config.js
node --check experiences/surprises/kaleidoscope-names/logic.js
node --check experiences/surprises/kaleidoscope-names/app.js
node --test experiences/surprises/kaleidoscope-names/logic.test.js \
  experiences/surprises/kaleidoscope-names/ui-contract.test.js
```

## 借鉴与来源声明

二维校准玩法、2520 整数圈模型、状态机、默认内容、Canvas 图案、DOM、CSS 与
测试均由本仓库独立设计和编写。没有参考或复制第三方万花筒实现、源码、纹样、
图片、字体、图标、文案或视觉作品，运行时也没有第三方依赖。

平台边界只依据 WHATWG 与 W3C/WAI 的一手标准文档；完整链接、许可证和后续
开源参考规则见 [ATTRIBUTION.md](./ATTRIBUTION.md)。如果未来参考开源项目，
必须先固定版本、许可证、版权所有者、实际借鉴与未复制范围。
