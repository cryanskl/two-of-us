# “同一张，谁先拼回”借鉴与来源声明

## 独立实现声明

本项目的 3×3 滑块规则、确定性打乱、双人状态机、输入映射、公开视图合同、测试和
中文文案均在本仓库独立设计与实现。首版未复制、改写、翻译、移植、链接、打包或
依赖任何开源滑块拼图项目的代码、测试、页面、规则文本、视觉、图片、字体、图标、
声音或其他资产。

经典滑块拼图只作为公共玩法类型存在，不在本项目中对应某个被借鉴的开源仓库。
如果后续实际引入第三方内容，必须在合并前更新本文件，逐项列出固定 commit、许可
证、版权主体、借鉴或复制范围、修改内容与分发义务；届时不能继续沿用当前
“零代码、零素材复制”的结论。

## 平台与标准来源

以下标准只用于说明后续浏览器界面的能力和验收边界，不是本阶段逻辑代码的来源：

- [WHATWG HTML：ImageBitmap](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html)
  用于后续本地图片方向解码和显式释放约束；
- [W3C File API](https://www.w3.org/TR/FileAPI/)
  用于后续用户选择文件与 Blob URL 生命周期约束；
- [W3C High Resolution Time Level 3](https://www.w3.org/TR/hr-time-3/)
  用于后续界面提供单调时间戳的约束；
- [WHATWG HTML：Page Visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility)
  用于后续页面隐藏时触发双方暂停的约束。

本阶段不调用 DOM、Canvas、Blob、File、ImageBitmap、计时器、网络或存储 API，
也未复制上述标准的文字、IDL、示例代码或站点视觉。

## 图片权利边界

后续内置默认图应由本项目代码原创生成。用户只能选择自己拍摄、已获授权或有权
使用的照片；本地处理不会改变照片原有的权利归属。本阶段只保存
`kind/status/generation/errorCode` 四项非识别性来源元数据，不接收或公开文件名、
路径、URL、Blob、MIME、尺寸、EXIF、GPS 或原始文件对象。
