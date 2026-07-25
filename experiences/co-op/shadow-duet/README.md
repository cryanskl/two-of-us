# 把影子，跳成我们

一款同设备双人合作的本地纸幕影子舞。左席用 `W / A / S / D`，右席用方向键；
也可以在触屏上同时按住两边的原生姿势按钮。每幕目标始终公开，两边在定格窗里把
正确姿势共同留住六小拍，就能把这张合照收进记录。

## 打开方式

直接双击本目录的 `index.html`。作品使用经典相对脚本，不需要安装依赖、启动服务、
连接网络或授予浏览器权限。若浏览器对本地文件有额外安全限制，也可以从仓库根目录
运行统一的本地启动命令后访问本页；这不是完整游玩的必要条件。

## 玩法

- 左席：`W` 举高、`A` 展开、`S` 低身、`D` 向内。
- 右席：`↑` 举高、`→` 展开、`↓` 低身、`←` 向内。
- 先看公开目标，再点“开始这一幕”。拍灯亮起后，两边把正确姿势连续保持六小拍。
- 没接住只重排当前幕，已经完成的合照不会丢失；最终只汇总共同尝试，不比较个人表现。
- 舞动中按 `Escape`、切走窗口或把页面放到后台会安全暂停并回到本幕说明，不追赶后台时间。

同一设备无法证明操作两边的是两个不同的人；本作只保证两席输入缺一不可，不使用
摄像头、账号或身份识别来验证关系。

## 本地与无障碍边界

- 不联网、不保存、不录音、不录像，不读取相机、麦克风、定位、传感器或浏览器存储。
- 不使用 Canvas、运行时图片、远程字体、CDN、ES Module、`fetch()` 或 Service Worker。
- 键盘使用物理 `KeyboardEvent.code`；触屏使用可取消的 Pointer Events 会话。
- 八个姿势按钮在全部阶段保持原生节点与左右席语义，非舞动阶段真实禁用。
- 所有目标、当前姿势、稳定进度、结果与记录都有文本；颜色和动画不是唯一提示。
- 支持系统减少动态效果与强制颜色；JavaScript 关闭时仍显示中性纸幕、提示和隐私说明。

## 借鉴与来源声明

本作的规则、代码、六幕姿势、界面、中文文案和纯 CSS 纸幕人物均为独立实现。开发前
只研究以下固定版本的抽象机制和权利边界；没有复制、翻译、改写、链接或打包它们的
源码、算法表达、判定参数、谱面、模型、WASM、素材、资源、品牌、界面或测试。它们都
不是运行依赖。

- [Bemuse](https://github.com/bemusic/bemuse/tree/5688164b1904c0cc129b832c91160704b96b3cf3)，
  commit `5688164b1904c0cc129b832c91160704b96b3cf3`。根许可证为 GNU AGPL v3，
  项目 metadata 同时保留历史 `AGPL-1.0` 标记，author 为 Thai Pangsakulyanont。
  仅研究输入、公开时间线与反馈分层；未复制或链接 AGPL 代码。
- [osu!](https://github.com/ppy/osu/tree/b11b274d1cb5c22eabe9dba5df14fa1e4ecc4e6d)，
  commit `b11b274d1cb5c22eabe9dba5df14fa1e4ecc4e6d`，代码许可证 MIT，
  Copyright (c) 2025 ppy Pty Ltd。仅研究规则时间与视觉表现分层；品牌和另行授权资源
  全部排除。
- [PixiJS](https://github.com/pixijs/pixijs/tree/1d90a20c62433ba68dff78466e06ee372a5a5232)，
  commit `1d90a20c62433ba68dff78466e06ee372a5a5232`，MIT，
  Copyright (c) 2013–2023 Mathew Groves, Chad Engler。仅研究 ticker、场景与交互职责
  分离；未使用引擎 API、源码、示例或资产。
- [MediaPipe](https://github.com/google-ai-edge/mediapipe/tree/0ad5a71bcdff3d756dc5b07f93765aaeb4152538)，
  commit `0ad5a71bcdff3d756dc5b07f93765aaeb4152538`，Apache-2.0。只用于确认真人
  姿态识别的模型、媒体输入和隐私成本；本作未使用其代码、模型、WASM、landmark 或相机流程。

16 张视觉概念图由 OpenAI 内置 `image_gen` 根据原创文字 brief 生成，只用于设计确认
和 fidelity 对照，全部为 docs-only，未进入运行目录，也不是页面背景或姿势图。完整的
固定版本、许可证哈希、生成链、文件哈希、有限权利说明和排除范围见 `ATTRIBUTION.md`
及 `docs/assets/shadow-duet/GENERATION.md`。
