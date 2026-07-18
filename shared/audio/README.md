# 共享短音播放器

`tone-player.js` 是给纯静态体验使用的最小 Web Audio 适配层。它只负责：

- 在用户手势内创建或恢复一份 `AudioContext`；
- 合成一个带淡入、淡出的短音；
- 音符结束后断开节点，页面离开时关闭上下文。

页面需在自身 `app.js` 之前引入：

```html
<script src="../../../shared/audio/tone-player.js" defer></script>
```

随后通过全局工厂创建播放器：

```js
const tonePlayer = globalThis.TWO_OF_US_TONE_PLAYER?.createTonePlayer();
await tonePlayer?.ensureReady(); // 必须由点击或按键等用户手势触发
tonePlayer?.playTone({
  frequency: 440,
  type: "sine",
  duration: .2,
  attack: .015,
  gain: .12,
});
```

节拍、频率表、播放队列和“声音开关”仍由各体验自行管理。浏览器不支持 Web Audio 或恢复失败时，方法返回 `false`，页面应继续提供完整的无声视觉玩法。
