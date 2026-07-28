# 门户预览图与精选入口规格

- 状态：`implemented`
- 日期：2026-07-28
- 影响范围：`experiences/catalog.json`、`index.html`、`shared/runtime/catalog.js`、`shared/portal-filters.js`、`scripts/previews.mjs`、`scripts/validate-repository.mjs`、根 README

## 问题

Catalog 已经收录 75 个作品，但门户和 README 只能用标题加一句描述来区分它们。这带来两个具体后果：

1. **没有画面。** 门户卡片全是文字，浏览 75 个体验既慢又难以判断“这个我会不会喜欢”；README 在 GitHub 上同样只有文字。
2. **没有入口。** 75 个平铺的选项对第一次打开的人是选择瘫痪；没有任何一处告诉他“先玩哪个”。

## 决策

### 一、每个作品在自己的目录里带一张 `preview.webp`

- 路径固定为入口同目录的 `preview.webp`，由 catalog 的 `preview` 字段声明，schema 用与 `entry`／`readme` 相同的精确正则约束分类目录与 id；
- 放在作品目录而不是集中目录，理由是它随作品一起被复制或单独赠送，也直接落在静态服务已经放行的 `experiences/` 前缀内；
- 预览图**不是运行依赖**：任何作品都不加载它，门户在字段缺失、文件缺失或图片 `error` 时移除 `<img>`，退回纯文字卡片。

### 二、`preview` 与 `featured` 在 schema 中可选、在仓库验收中必需

`shared/runtime/catalog.js` 把两个字段定义为可选：缺失不算格式错误，但一旦出现就必须精确合规（`preview` 必须是本作品目录下的 `preview.webp`，`featured` 必须是 boolean）。

`scripts/validate-repository.mjs` 再要求：每个 `installed` 作品都声明 `preview`，且文件真实存在。这样新作品可以先落地再补图，但仓库验收不会放它过关。

### 三、精选是一个小而稳定的 opt-in 集合

- 只有 `featured: true` 的作品进入精选，默认不写这个字段；
- 当前为 9 个，覆盖三种分类，并同时覆盖“一个人准备”“同屏合作”“两台设备”三种玩法；A 级 7 个、C 级 2 个，保证大多数精选双击即玩；
- 测试把上界锁在 12 个并要求三分类齐全：精选的价值来自“少”，一旦退化成第二个全量列表就失去意义；
- 精选不改变 catalog 的既有顺序，只作为筛选项与卡片角标出现，另有一行提示引导第一次打开的人。

### 四、预览图由本机 Chromium 生成，不进入依赖

`scripts/previews.mjs` 启动一次本地运行时，通过 DevTools 协议在 1280×800 布局下截取每个作品的开场画面，用 `deviceScaleFactor 0.5` 输出 640×400，并直接由 `Page.captureScreenshot` 编码为 WebP。

这样做的原因：

- 截图与编码都在浏览器内完成，不需要 Sharp、Pillow、FFmpeg 或任何新依赖，也就不改变 `package.json` 与 lockfile；
- 参见 [`bugs/2026-07-18-four-hands-harmony-webp-encoder-unavailable.md`](../bugs/2026-07-18-four-hands-harmony-webp-encoder-unavailable.md)：本机 WebP 编码链不可靠，浏览器自带的编码器是这台机器上最稳定的一条路径；
- Chromium 只在制作期使用；缺少浏览器时脚本明确报错并退出，不影响 `npm start`、`npm test` 或 `npm run verify`。

**开场画面就是最诚实的预览**，因此默认不做任何交互。只有当作品的开场确实没有可看内容时，才在 `captureRecipes` 中登记一条最小配方。当前只有一条：Love Tree 打开时只有一颗待点击的种子，需要先点一下并等待生长动画结束。

## 验收

- [x] `npm run verify` 通过，75 个作品全部声明并存在 `preview.webp`；
- [x] `npm test` 全绿（新增 `scripts/portal-catalog.test.mjs` 与 catalog schema、portal filter 用例）；
- [x] 内联 fallback catalog 与 `experiences/catalog.json` 的镜像字段一致，由测试锁定；
- [x] 门户在 360 / 420 / 640 / 900 / 1280 五个宽度下无横向溢出；
- [x] 预览图总体积 1.2 MB（75 张，平均约 16 KB）。

## 未决

- 预览图目前是静态截图。动图（GIF／短视频）对“摇柄”“拔河”这类以动作为核心的作品表现力更强，但会显著增加仓库体积，留待单独评估；
- 精选集合应随作品增减重新评估，不应只增不减。
