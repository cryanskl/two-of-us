# B 级“全景回忆”规格

## 1. Brainstorm 结论

本批补齐仓库首个真正的 B 级作品：用户从自己的电脑选择一张完整 360° 等距柱状全景照片，在本机浏览器中拖动回看当时的地点。照片不进入仓库、不上传到 Node 服务、不写入浏览器存储；关闭或更换照片后释放浏览器对象 URL。

| 方案 | 优点 | 风险与成本 | 本批决定 |
| --- | --- | --- | --- |
| 原生 Canvas / CSS 伪 360° | 不新增依赖 | 正确投影、视角和 WebGL 兼容处理成本高，容易做成横向滚图 | 不采用 |
| PhotoSwipe 私人相册 | 成熟、MIT、体积小 | 普通画廊在 `file://` 也能实现，不能验证真实 B 级边界 | 留作 A 级照片故事候选 |
| 原生 Canvas 私人拼图 | 隐私边界简单，可单文件 | 更适合 A 级，不能验证本地浏览器依赖管理 | 留作 A 级候选 |
| Pannellum 全景查看器 | 专门处理等距柱状全景；MIT；上游明确要求本地 Web 服务 | WebGL、输入照片质量和移动端能力需要实际 Gate | 采用固定版本 2.5.7 |

首版只支持单张、完整 360°、接近 2:1 的 JPEG / PNG / WebP。明确不做多场景、热点、地图、音频、VR、设备方向权限、云相册、EXIF、自动保存、裁剪、拼接和多分辨率切片。

## 2. 为什么必须是 B 级

Pannellum 当前上游 README 明确说明：受浏览器安全限制，本地测试也必须通过 Web server。仓库已经把这一步封装在统一启动器中：

1. 首次双击 `setup.command` / `setup.bat`，根依赖锁定并安装；
2. 以后双击 `start.command` / `start.bat`；
3. 从统一门户打开“全景回忆”；
4. 页面、Pannellum 构建文件和用户照片全部在本机处理，游玩时不访问公网。

直接打开作品 `index.html` 时不伪装成可用：静态 HTML 保留清楚的 B 级启动提示。只有本地服务和 Pannellum 均可用时才显示照片选择器。

## 3. 依赖与精确静态映射

根依赖新增：

```text
pannellum = 2.5.7
```

不复制或改写上游源码，不把整个 `node_modules` 设为公开目录。共享运行时维护精确白名单：

```text
/vendor/pannellum/2.5.7/pannellum.css
  → node_modules/pannellum/build/pannellum.css

/vendor/pannellum/2.5.7/pannellum.js
  → node_modules/pannellum/build/pannellum.js
```

版本不匹配、目录遍历、其他 Pannellum 文件和其他依赖路径都返回 404。仓库验证器与静态服务复用同一份映射，避免“测试认为存在、服务器实际不提供”或反过来。

## 4. 用户流程

1. 页面先展示用途、格式和隐私说明；
2. 用户点击“选择 360° 照片”；
3. 浏览器只接受 JPEG / PNG / WebP，并检查文件大小、可解码性和尺寸；
4. 完整全景的宽高比必须在 `1.9–2.1`；过小图片允许加载但提示清晰度可能不足；
5. 验证通过后创建 `blob:` URL，并初始化 Pannellum；
6. `load` 后显示“照片只在这台设备的当前页面中”；
7. 用户可拖动、键盘浏览、缩放、进入全屏，也可“更换照片”或“清除照片”；
8. 新照片验证失败时保留当前有效全景，不先破坏已有体验；
9. 更换、清除或离开页面时依次销毁 viewer 并撤销旧对象 URL。

## 5. 文件与尺寸 Gate

纯逻辑返回稳定错误码与用户文案，不依赖 DOM：

```text
validateFileMetadata({ type, size })
assessPanoramaDimensions({ width, height })
```

### 文件 Gate

- 类型：`image/jpeg`、`image/png`、`image/webp`；
- 大小：必须大于 0，最大 40 MiB；
- 文件名只用于本地可见状态，不写入 URL、服务端日志或持久存储；
- 不读取 EXIF、GPS 和拍摄时间。

### 尺寸 Gate

- 宽高必须为正整数；
- 宽高比 `width / height` 必须在 `1.9–2.1`；
- 小于 `2048×1024` 返回非阻塞清晰度提醒；
- 大于 `4096×2048` 返回性能提醒，大于 `8192×4096` 拒绝并建议先在本地缩小；
- 解码失败、非完整 360° 比例或 Pannellum `error` 进入明确错误状态；
- 首版不猜测局部全景的 `haov / vaov`，避免错误投影。

## 6. 生命周期与失败顺序

浏览器私有状态：

```text
idle → validating → loading → ready
                  ↘ error
```

替换照片使用“两阶段提交”思路：

1. 新文件先完成元数据和尺寸验证；
2. 验证失败：撤销新对象 URL，保留旧 viewer；
3. 验证成功：销毁旧 viewer、撤销旧 URL，再创建新 viewer；
4. Pannellum 加载失败：销毁失败 viewer、撤销新 URL，显示错误；
5. `pagehide` / `beforeunload`：统一清理一次，重复清理保持安全。

同一轮异步验证要使用递增 token。若用户连续选择两张照片，较慢的旧解码结果不能覆盖后选照片，也必须撤销旧 token 对应的 URL。

## 7. 页面与可访问性

- 主要输入使用原生 `<input type="file">` 与关联 `<label>`；
- 空状态、验证中、加载中、成功、警告和错误通过 `aria-live="polite"` 宣布；
- viewer 外保留键盘说明和“清除照片”按钮；
- 不自动请求设备方向、摄像头、麦克风、位置或文件系统权限；
- 不自动旋转，避免眩晕；`prefers-reduced-motion` 下不添加页面级动效；
- 390×844 无横向溢出，选择、替换和清除按钮至少 48px 高；
- 若 WebGL 或 Pannellum 不可用，页面仍能解释原因和启动方式，而不是空白。

Pannellum 上游说明移动 / app / web framework 不属于其官方支持目标。仓库会实测当前 Chrome 桌面与 390×844 响应式布局，但 README 不夸大为所有移动浏览器正式支持。

## 8. 隐私与安全边界

- Node 只提供静态 HTML / CSS / JS；没有照片上传 API；
- 照片由用户手势进入浏览器 `File` 对象，再转为 `blob:` URL；
- 不使用 `fetch`、表单提交、IndexedDB、localStorage、Service Worker 或云同步保存照片；
- Network 验收允许 `localhost` 页面、vendor 资源和浏览器内部 `blob:` 读取，不允许公网请求；
- 文件类型和尺寸检查是稳定性 Gate，不是恶意文件安全扫描；图片最终仍由浏览器解码；
- 用户应在自己控制的设备和可信网络中使用，不把本地服务暴露到公网。

共享启动器仍需为 C 级作品监听局域网地址，但本作品没有照片上传路由，也不会生成可供其他设备访问的照片 URL；`blob:` 数据只存在于选择照片的浏览器上下文。为 B 级单独增加 loopback-only 启动模式可作为后续运行时增强，不是当前照片数据路径成立的前置条件。

## 9. 文件结构

```text
shared/runtime/
├── vendor.js
├── vendor.test.js
├── static.js
└── static.test.js

experiences/surprises/panorama-memory/
├── index.html
├── styles.css
├── app.js
├── logic.js
├── logic.test.js
└── README.md
```

同时更新 `package.json`、`package-lock.json`、目录、门户静态回退、分类 README、根 README 和文档状态。

## 10. 借鉴与来源声明

- [Pannellum](https://github.com/mpetroff/pannellum) 2.5.7（MIT）：作为根目录固定版本直接依赖，运行时加载其官方 `build/pannellum.js` 与 `build/pannellum.css`；保留 npm 包内 `COPYING` 和版权信息；不复制示例全景图、示例配置、文档文案或项目视觉；
- Pannellum README 说明历史版本曾基于 three.js r40（MIT）；当前作品不单独引入 Three.js；
- 上游示例全景图为 CC BY-SA 3.0，本作品不复制、不分发该图片；测试使用临时生成的本地 2:1 图像，不进入作品目录；
- 本仓库共享运行时：复用统一安装、启动和静态文件边界；vendor 精确映射为本批新实现。

许可证于 2026-07-15 通过上游 GitHub `COPYING` 复核：MIT，版权 `2011–2026 Matthew Petroff`。npm 当前版本为 2.5.7，发布于 2026-02-19，包解压约 780 KiB。

2.5.7 的上游 release 明确包含热点属性 XSS、standalone JSON 配置同源限制与错误 URL 清理三项安全修复。本作品锁定该版本，同时不使用 standalone viewer、远程 JSON 配置或热点 HTML。

## 11. 自动测试

至少覆盖：

- 合法 JPEG / PNG / WebP；空文件、超大文件和其他类型；
- 合法 2:1、边界 1.9 / 2.1、越界比例和非法尺寸；
- 小尺寸只警告不拒绝；
- vendor 两条精确映射存在且可访问；
- 未登记版本、其他构建文件、目录遍历和任意 `node_modules` 路径不可访问；
- 仓库 verifier 能识别 vendor URL，但仍拒绝未登记资源；
- 生命周期通过浏览器验证：替换、清除、失败保留旧照片、快速连续选择和 URL 释放。

## 12. 验收标准

- 首次统一安装后无需再次联网，双击启动器可打开作品；
- 选择有效 2:1 图片后出现可拖动、缩放和键盘操作的全景；
- 非图片、超大、错误比例和损坏图片有稳定提示；
- 替换非法图片不清除当前有效全景；
- 替换、清除和离开页面会销毁 viewer、撤销对象 URL；
- Chrome 桌面核心流程通过；390×844 页面控制区无横向溢出；
- 控制台无未处理错误，Network 无公网请求；
- `npm test`、`npm run verify`、`git diff --check` 通过；
- README 明确 B 级启动、移动支持边界、隐私路径和完整借鉴声明。
