# UMD 双出口不等于真实双模块：最近 package 边界才决定 Node 解释方式

## 适用范围

适用于同一份 `.js` 既要作为浏览器经典脚本直接加载，又希望在 Node 测试或复制到其他目录后通过 `require()` 使用的本地优先作品。

## 关键结论

UMD 包装器解决的是“代码执行后把 API 挂到哪里”，Node 的 ESM/CommonJS 判定解决的是“这份 `.js` 先按什么语法和加载器执行”。两者不是同一层。

在 `"type": "module"` 的仓库里，仅仅写：

```js
if (typeof module === "object" && module.exports) module.exports = api;
```

不能证明真实 `require("./logic.js")` 可用。VM 中手工注入 `module` 只能证明包装器分支本身可执行，不能证明 Node 会按 CommonJS 加载该文件。

## 最小可靠模式

若某个体验确实要求 `.js` 同时支持真实 CommonJS 与浏览器经典脚本，可以在该体验目录放置最小边界：

```json
{"type":"commonjs"}
```

它只改变该子树内 `.js` 的 Node 解释方式，不要求安装依赖，也不影响浏览器 `<script>`。测试应分别取证：

```bash
node -e "const api=require('./path/logic.js'); if(typeof api.reduce!=='function')process.exit(1)"
node --test path/logic.test.js
```

第二类浏览器证据仍应在不提供 `module` 的 VM 或真实页面里检查全局导出。

## 反例

- 只在 VM 中注入 `{ module: { exports: {} } }`，然后称为“CommonJS 已验证”；
- 为了一个子目录改动根 `package.json`，导致全仓测试语法反转；
- 在子目录 `package.json` 顺手加入 scripts、dependencies 或 main，扩大了本来只需模块判定的边界。

## 验证方法

1. 直接执行真实 `require()`，检查 API 精确 key 和递归冻结；
2. 在无 `module` 的经典脚本环境检查浏览器全局；
3. 跑全仓测试，确认最近 package 边界没有改变兄弟目录；
4. 校验子目录 `package.json` 内容精确为单一 `type` 字段。

本仓实证：影子双人舞定向 27 / 27、全仓 1590 / 1590，且统一仓库校验通过。
