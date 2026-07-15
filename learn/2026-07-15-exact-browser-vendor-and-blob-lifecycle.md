# 固定浏览器依赖与私人 Blob 生命周期

## 1. 不要公开整个 `node_modules`

B 级页面需要浏览器依赖时，可以把固定 URL 映射到固定版本包内的少量构建文件。静态服务器与 verifier 共用同一张登记表：未登记版本、其他构建产物和任意 `node_modules` 路径都拒绝。这样既保留统一安装，也不会把依赖树变成公开静态目录。

版本同时出现在依赖锁和浏览器 URL 中，例如 `/vendor/pannellum/2.5.7/pannellum.js`。升级时必须显式修改依赖、映射和引用，不会被 `latest` 悄悄改变行为。

## 2. 本机文件先验证，再提交替换

私人照片适合使用浏览器 `File → blob:` 路径。新文件先检查 MIME、大小、可解码尺寸与业务比例；只有全部通过，才替换当前有效 viewer。验证失败时撤销候选 URL，但保留旧 viewer，避免一次误选破坏正在展示的内容。

连续选图需要递增 token。旧图片解码较慢时，其完成回调先比较 token；已过期就只释放自己的候选 URL，不能覆盖后选文件。

## 3. 第三方查看器可能再创建一层 URL

应用创建一个 blob URL 不代表页面只有一个。Pannellum 读取 blob 后会为内部二进制数据再创建对象 URL。浏览器 QA 包裹 `URL.createObjectURL` 与 `URL.revokeObjectURL` 后观测到：加载共创建 2 个 URL，清除后共撤销 2 个。

因此资源回收要同时做两件事：先调用第三方 viewer 的 `destroy()`，让它清理内部资源；再撤销应用持有的候选或活动 URL。`pagehide`、`beforeunload` 和用户“清除”可以复用同一个幂等清理函数。

## 4. 浏览器文件上传 QA 的权限边界

Chrome 扩展若未开启 file URL 访问，自动化的 `fileChooser.setFiles` 会被拒绝。这不是页面 bug。可在 localhost QA 页面内通过 CDP 临时生成 Canvas，转成 `File` 后触发同一个 input change 流程；验证结束必须重新加载页面，不把测试钩子或测试图片写进产品代码。

真实交付仍使用原生文件选择器，并应单独检查 input 的 accept、label、禁用态和可访问名称。
