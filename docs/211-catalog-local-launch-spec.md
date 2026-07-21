# Catalog 本地直达合同实现规格

- 日期：2026-07-21
- Brainstorm：[210-catalog-local-launch-brainstorm.md](./210-catalog-local-launch-brainstorm.md)
- 实施计划：[212-catalog-local-launch-plan.md](./212-catalog-local-launch-plan.md)
- 状态：冻结

## 1. 文件与职责

新增：

```text
scripts/
├── experience-contracts.mjs
└── experience-contracts.test.mjs
```

修改：

```text
scripts/validate-repository.mjs
shared/runtime/catalog.js
shared/runtime/catalog.test.js
scripts/start-target.test.mjs
scripts/runtime-reuse.test.mjs
README.md
docs/README.md
```

`experience-contracts.mjs` 只导出确定性 helper 和异步仓库检查；不在 import 时读取磁盘或退出进程。`validate-repository.mjs` 仍是 CLI 所有者。现有目录测试改为复用启动器 renderer，避免双真相。

## 2. 公开 API

```js
renderMacLauncher(experienceId) -> string
renderWindowsLauncher(experienceId) -> string
validateExperienceContracts({ rootDir, catalog }) -> Promise<string[]>
```

- renderer 只接受 lower-kebab ID；非法 ID 抛 `TypeError`；
- 返回文本与 190 已提交启动器逐字相同，包括换行；
- validator 不抛普通合同错误，返回去重、排序、冻结的字符串数组；
- 根目录可以是路径字符串或 file URL；catalog 必须先通过增强后的共享 validator，schema 错误由 CLI 负责转成一条稳定错误。

## 3. installed 通用合同

共享 `validateCatalog` 先冻结：

- `id/title/category/level/players/devices/entry/readme/description` 都是非空字符串；
- `installed/networkRequired` 都是 boolean；
- category 只允许 `surprise/co-op/versus`，并分别对应 entry/readme 中的 `surprises/co-op/versus`；
- readme 精确为同一作品目录的 `README.md`；
- ID 与 entry 均不得重复。

随后对 `installed === true` 的每项：

1. `networkRequired === false`；
2. root、entry、README 都取 realpath；用 `path.relative(realRoot, realTarget)` 判断包含关系，不用字符串前缀；
3. 两文件存在、为普通文件且不是符号链接；仓库内目录 symlink 导致的真实目标越界同样拒绝；
4. README 包含独立标题 `## 借鉴与来源声明`；
5. entry 的目录末段与 ID 已由 catalog validator 保证。

不存在、目录冒充文件、symlink 越界、权限/读取错误都转为作品级错误；不把系统绝对路径写入错误。

## 4. HTML 运行资源图

对 A 级入口使用一套严格但有限的仓库 profile，而不是声称完整解析任意 HTML。资源组合冻结如下；标签名、属性名和 rel token ASCII case-insensitive：

| 处理 | 精确标签/属性组合 |
| --- | --- |
| 解析本地资源 | `script[src]`、`img[src]`、`audio[src]`、`video[src]`、`video[poster]`、`source[src]`、`track[src]`、`object[data]` |
| 解析 CSS | `link[rel~=stylesheet][href]`、`style` 正文、任意 HTML 元素的 `style` 属性 |
| 窄例外 | `link[rel~=icon][href]`，只接受本地文件、精确 `data:,` 或五个 SHA allowlist |
| 一律拒绝标签 | `base`、`iframe`、`frame`、`embed` |
| 一律拒绝组合 | `meta[http-equiv=refresh]`、`img[srcset]`、`source[srcset]`、`input[type=image][src]`、`form[action]`、`button[formaction]`、`input[formaction]`、`a[ping]`、`area[ping]` |
| 一律拒绝 SVG 组合 | `image[href]`、`image[xlink:href]`、`use[href]`、`use[xlink:href]`、`feImage[href]`、`feImage[xlink:href]` |
| 一律拒绝 link | 带 `href` 但 rel token 不只由 `stylesheet` / `icon` 组成的 link，包括 preload/modulepreload/prefetch/dns-prefetch/preconnect/manifest |

普通 `<a href>` / `<area href>` 不是自动加载资源，本合同忽略；用户主动导航归作品交互测试。表外普通属性不参与资源判断。表内 URL 属性必须恰好出现一次、使用单引号或双引号；缺值、重复、未加引号和无法可靠归类的畸形资源标签直接报错。

profile 解析以下静态属性：

| 标签 | 属性 |
| --- | --- |
| script | src |
| link | href；只允许 stylesheet 或 icon |
| img、audio、video、source、track | src |
| video | poster |
| object | data |

首版禁止 `srcset`，避免以不完整的逗号切分器制造安全错觉；响应式图片使用普通 `<img src>` 配合 CSS media query，首版不支持 `<picture>` 响应式 source。敏感 URL 属性中禁止 HTML entity、反斜杠、NUL 与控制字符，要求作者写清晰的 quoted 相对 URL。fragment-only 允许；空值忽略。

引用分类：

- `./`、`../`、裸相对路径：解析后必须仍在 root 内且为普通文件；
- `#fragment`：允许；
- `/...`、`//...`、任意 scheme 与 blob：拒绝；唯一例外是 `link rel=icon` 的精确 `data:,`，或 SHA-256 命中下列五个既有完整 href。未来新增或改变图标一律改用本地文件，不开放通用 data SVG 解析：

```text
b2852b9e9fdae62ad0eaa5db210ab48eb69977bd16ca8f425d18dd04b2bd2756
9657a78561dce8c0417ab8cb43245a130014b3e98a8131a75ee008ec7d131017
bcc0c76df661ab442a2bf23d8ed33c4b942173db3bde414d69ceef31d2625332
d1161e065c88729cc06549280031ad0899412f2383454286143633a71a0d4495
ad125a9e9e46b6c667b6267ddf885a54228776035e34374570e78e32f4074187
```
- query/fragment 在落盘和显示前移除；data/blob 分别显示 `<data-url>` / `<blob-url>`，控制字符转义；
- percent-encoded 路径交给 WHATWG file URL + `fileURLToPath` 规范化，再做 realpath containment；编码后的分隔符、NUL、控制字符和解析后越界拒绝。

HTML 中任意 script 的 type 经 ASCII trim/lowercase 后为 `module` 即拒绝。`<style>` 正文和 style 属性进入同一 CSS profile。经典 JS、inline script 与事件属性不做 token 硬失败：旧兼容库声明某项能力不能证明页面实际使用它。

## 5. CSS 与 JS

仅遍历从入口真实可达的外部文件：

- stylesheet、`<style>` 和 style attribute 用单遍 lexer 读取 quoted/unquoted `url()`、`@import "..."` 与 `@import url(...)`；只在字符串/URL 外识别注释并以一个空白替代，未闭合注释/字符串/token、反斜杠 escape 或无法归类的 import/url 直接拒绝；
- 外部 stylesheet 以当前 CSS 文件为基准递归；循环用 realpath 去重；
- `url()` 中 `#fragment` 允许；其余沿用 HTML 引用分类；
- classic script 只检查文件存在，不递归猜测字符串拼接出的文件名；
- 不实现 JS token lint。真实 Chrome 的导航前请求监听负责观测实际首屏，作品测试负责交互后路径；Love Tree 的既有 `eval`/`Function`/XHR capability 不因此被误判为联网。

## 6. 非 A 启动器

对 installed B/C/D：

- `start.command` 与 `start.bat` 必须为普通文件且自身不是 symlink，realpath 仍在 root 内；
- UTF-8 内容分别等于 renderer 输出；
- `start.command` mode 的低九位精确为 `0755`；
- validator 不修改文件，不自动 chmod。

`shared/runtime/catalog.test.js` 的既有动态测试继续保留，但 expected 文本改用 renderer；它仍负责真实仓库 mode 断言。新 fixture 测试负责缺失、内容漂移和权限错误。

## 7. 测试矩阵

至少覆盖：

1. 合法 A：inline classic JS、外部 JS、递归 CSS、普通 img src、图片/音视频/object 全通过；
2. 合法 B/C/D：精确两启动器与 mode；
3. A 的 module、表中 deny 标签/组合、root-relative、remote、protocol-relative、非 icon data、blob 与 socket 静态资源声明逐项失败；经典 JS 内存在兼容 capability 或未执行 dynamic import 不做静态失败；首屏实际执行的 dynamic import 由浏览器证据捕获；
4. 精确 `data:,`、五个 SHA allowlist SVG、未知/改变后的 data SVG、非 icon data、base64 SVG、srcset、HTML entity、重复/未加引号属性、HTML/CSS 缺失引用、两种 CSS import、CSS 循环、escape、畸形 token、控制字符；
5. CSS lexer 覆盖字符串内 `/* */`、标识符中的注释空白、未闭合注释与循环 import；
6. catalog 缺字段、错类型、错 category 映射、重复 ID/entry；entry/README 缺失、为目录或 symlink 越界、README 无声明、networkRequired true；同步更新 start-target/runtime-reuse 既有 fixture 而不改变原负例含义；
7. 启动器缺失、漂移、错误 ID、错误 mode；
8. 多错误排序、去重、冻结；
9. root symlink 合法解析、仓库外文件/目录 symlink、sibling-prefix、percent-encoded dot/backslash；
10. 脱敏 query/fragment/data/blob/control character；
11. 当前真实 catalog 返回零错误（47 A、8 非 A）。

## 8. 集成与命令 Gate

`validate-repository.mjs` 必须先调用共享 catalog validator，再执行原验证和新合同；最终成功文案增加 A 级直开与非 A 启动器计数。

浏览器验收另用临时页面证明 `http/https` request、`ws/wss` WebSocket 和 WebTransport 分别会被对应监听拒绝；未执行的交互代码不由首屏证据推断。

```bash
node --test scripts/experience-contracts.test.mjs shared/runtime/catalog.test.js
npm test
npm run verify
git diff --check
```

## 9. 安全与隐私

- 不执行被扫描页面的 JS；
- 不读取 localStorage、cookie、表单或私人配置的运行结果；
- 错误只含 catalog ID、仓库相对文件和引用；
- 不访问网络；
- realpath 后不跟随仓库外路径；
- 浏览器批次不填写或揭晓任何私人配置。

## 10. 借鉴声明

实现来自本仓库 190 规格、现有启动器与验证器的内部抽象；本批没有新增外部参考、依赖、代码或素材。README/验收记录应明确这一点。
