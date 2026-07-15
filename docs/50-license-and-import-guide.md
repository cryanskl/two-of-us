# 第三方项目引入、离线化与许可证指南

> 这是一份项目维护清单，不是法律意见。遇到商业用途、再分发音乐或不明确的许可证时，应向权利人确认。

## 1. 三个问题必须分开回答

看到一个喜欢的网页时，依次确认：

1. **源码是否可见**：能否看到真实 HTML/CSS/JS，而不只是在线页面；
2. **是否有权复制**：仓库是否有明确许可证，素材是否另有条款；
3. **是否能本地运行**：是否依赖构建、CDN、API、账号或后端。

GitHub 官方说明：没有许可证时适用默认版权规则，其他人通常无权复制、分发或制作衍生作品。公开仓库不等于开源仓库。参见 [GitHub：Licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)。

## 2. 本项目常见许可证速查

| 许可证 | 引入态度 | 本项目至少要做什么 |
| --- | --- | --- |
| MIT / ISC / BSD | 适合优先评估 | 保留版权和许可证文本，标明修改 |
| Apache-2.0 | 适合优先评估 | 保留许可证、版权和适用的 `NOTICE`；注意专利条款 |
| MPL-2.0 | 可以评估 | 修改过的 MPL 文件继续按 MPL 提供源码；不要删除声明 |
| GPL-2.0 / GPL-3.0 | 谨慎引入 | 分发衍生作品时遵守 GPL 的源码与同许可证义务 |
| AGPL-3.0 | 通常不直接引入 | 除分发义务外还涉及网络提供服务时的源码义务；本仓库的轻量目标很少需要它 |
| CC0 / Unlicense / 0BSD | 通常容易引入 | 核对项目内是否仍有第三方素材；保留来源记录是良好实践 |
| Creative Commons | 多用于素材，不默认用于软件 | 检查是否要求署名、相同方式共享，或禁止商业/演绎 |
| 未声明 / `NOASSERTION` | 不复制 | 只在调研文档中链接和描述创意，或先取得作者授权 |

`NOASSERTION` 只表示平台无法确认一个标准许可证，必须打开仓库中的具体文件再判断。例如项目可能同时包含 Apache 代码和 CC BY 题库。

## 3. 素材权利单独核验

每次引入至少检查：

- `LICENSE`、`COPYING`、`NOTICE`、README 的 Credits；
- 图片、GIF、字体、图标、音效和音乐是否来自第三方；
- 素材文件夹是否有单独许可证；
- 人物照片是否获得公开和再分发同意；
- 歌曲是否只是个人购买，而不是可随源码再分发的录音授权。

尤其不要因为 JavaScript 使用 MIT，就推定其中的商业歌曲也能放进公开仓库。

## 4. 从在线项目改造成离线 HTML

### A 级：双击即开

优先选择：

- 普通 `<script src="相对路径">`，而不是 ES Modules；
- 数据直接写在 JS 变量中，而不是启动时 `fetch()` JSON；
- 字体、图片、音频和脚本全部保存在作品目录；
- 不注册 Service Worker；
- 不请求远程 API、地图瓦片、分析脚本或 CDN；
- 只使用相对路径，不使用以 `/` 开头的站点根路径。

### B 级：本地静态服务器

如果项目使用 ES Modules、`fetch()`、Service Worker 或 WebAssembly，通常应保留原结构并提供本地服务器。例如：

```bash
python3 -m http.server 8000
```

然后访问 `http://127.0.0.1:8000/`。这仍然是本地运行，但不应宣传成“直接双击”。

现代浏览器通常把 `file://` 文件视为不透明来源，同一文件夹内的请求也可能触发跨域限制；参见 [MDN：Same-origin policy / File origins](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy#file_origins)。

### C 级：需要构建

React、Vue、Svelte、Vite 等项目可在首次安装依赖后构建成静态产物，但必须进一步确认：

- 构建产物使用相对 base path；
- 产物没有运行时 API；
- 依赖许可证随产物保留；
- 仓库只保存源码还是同时保存 `dist/`，规则要统一。

### D 级：依赖服务

凡是依赖 Firebase、Supabase、WebSocket、数据库、地图 API、邮件或账号系统的项目，默认只作架构灵感。不要为了“看起来能离线”而在仓库中硬编码密钥或把隐私数据塞进前端。

## 5. 音频与浏览器权限

有声媒体通常会被浏览器阻止自动播放，除非用户已经点击、触摸或按键。适合惊喜页的方式是：

1. 首屏明确提示“点击开始”；
2. 在同一次点击事件里调用 `audio.play()`；
3. 捕获返回 Promise 的失败并显示静音提示；
4. 始终提供暂停/静音控制。

参见 [MDN：Autoplay guide for media and Web Audio APIs](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)。

## 6. 隐私基线

- 默认不发送统计、崩溃日志或使用行为；
- 不把私人内容写入 URL query 或第三方请求；
- 本地存档优先使用下载 JSON，而不是隐式云同步；
- 使用 `localStorage` 时提供“清空数据”；
- 摄像头和麦克风功能必须在操作前说明用途；
- 公开仓库使用示例素材，真实照片和私密文字留在不提交的本地配置中。

## 7. 引入流程

1. 在调研文档登记原仓库、作者、commit/tag、许可证和素材来源；
2. 在临时目录运行并断网复测；
3. 决定原样引入、重写玩法，还是只保留灵感；
4. 放入 `experiences/<category>/<slug>/`；
5. 新增作品 README，记录来源、修改和启动方式；
6. 移除统计代码、远程字体和不必要依赖；
7. 验证桌面 Chrome，并在作品声称支持移动端时验证触屏；
8. 检查根目录文档和相对链接；
9. 独立 commit，不把多个来源复杂的项目混成一次不可审计的导入。

## 8. 适合本仓库的实现策略

优先顺序建议为：

1. 参考 MIT / Apache 项目的交互，自己写体积小的原生实现；
2. 原样引入结构简单、许可证和素材都清楚的项目；
3. 对 GPL / MPL 项目单独保留许可证边界；
4. 对无许可证、需要后端或素材不清楚的项目，只记录玩法，不复制代码。

如果未来需要在线分享，GitHub Pages 可以直接发布仓库中的 HTML、CSS 和 JavaScript 静态文件；但“可在线托管”仍不代表“可在 `file://` 双击运行”。参见 [GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)。
