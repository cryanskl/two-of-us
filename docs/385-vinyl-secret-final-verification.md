# “把秘密藏进这一圈”最终验收

- 日期：2026-07-25
- 工作 ID：`vinyl-secret`
- 目录：`experiences/surprises/vinyl-secret/`
- 分支：`codex/exp-vinyl-secret-production-ui`
- 启动等级：A，`file://` 直接打开
- 产品关系：准备者预先编辑，接收者随后单人体验
- 状态：生产实现与项目级验收通过；本工作包按边界未改 catalog、分类 README、
  根门户或 Board

## 1. 交付闭包

生产目录包含：

```text
index.html
styles.css
config.js
logic.js
logic.test.js
ui-contract.test.js
app.js
README.md
ATTRIBUTION.md
assets/favicon.svg
```

`index.html` 只以 `config.js → logic.js → app.js` 的相对经典脚本顺序加载，
没有 module、CDN、远程字体、远程图片、iframe、表单、网络 API 或共享运行时。
全部本地引用都能在独立目录内解析；README 记录了直接双击和自备音频方法。

静态 HTML 只有公共标题、空 stage、单一礼貌状态区和无 `src` 的单一
`<audio preload="none">`。无 JavaScript 时只显示诚实提示，不显示可点击的
伪玩法。由此满足 A 级直开结构合同；受控 Chrome 的 `file://` 限制不被冒充为
产品失败，真实交互使用等价的纯静态 localhost 服务验证。

## 2. 规则与秘密 Gate

本项目级 46 项测试证明：

- 固定 12 圈、三条有序轨道和四级距离信号；
- 默认目标为 `3 / 7 / 11`；
- 错误落针不推进，正确落针先进入 `playing`，精确 token 才能结算；
- 默认无音频仍可完整完成；
- restart 保持 token 单调并拒绝陈旧回调；
- intro 不公开任何配置秘密；
- seeking 只公开当前 clue；
- playing 只公开刚命中轨的 note 与可选音频路径；
- track-result 移除公开音频元数据；
- complete 才公开收件人、三段 note 与最终文案，始终不公开目标圈和音频路径。

生产 controller 只读取公开 view model，不读取权威状态字段；每次换阶段使用
`replaceChildren()` 销毁旧节点。浏览器用独立 `SENTINEL_*` 配置复核：

- intro：任何 sentinel 均不在 DOM / 可访问树中；
- 第一轨 seeking：只有 `SENTINEL_CLUE_ONE`，没有当前 note、未来 clue 或 final；
- 第一轨 playing：出现 `SENTINEL_NOTE_ONE`，未来内容仍不存在；
- 第二轨 playing：只有第二轨 note，第三轨与 final 仍不存在；
- restart：notes、final 和音频 `src` 全部清空。

## 3. 浏览器完整路线

Chrome 从默认配置完成了：

```text
intro
→ 双击“开始寻声”，只消费一次
→ 第 1 圈错误落针，不揭晓
→ 键盘移动到第 3 圈，命中第一轨
→ 逐圈按钮与 Home / End / 方向键移动到第 7 圈，命中第二轨
→ 手机视口真实 touchStart / touchMove / touchEnd 拖到第 11 圈
→ 命中第三轨并打开最终封套
→ 重新开始，回到无秘密 intro
```

确认信号从“寂静 / 微响 / 靠近 / 清晰”随圈位更新；原生 range 在输入期间
保持节点身份与焦点；每阶段的下一动作焦点落到对应标题或控件。全路线只有一个
audio 元素，默认始终无 `src`。

## 4. 可选本地音频

用未写入仓库的内存本地服务提供一段短 WAV 和一条故意缺失的 MP3：

- 命中包含 WAV 的轨道时，`play()` 在点击任务内触发，声音成功播放，
  `paused === false`，并只在 loading / playing 时提供“停止声音”；
- WAV 结束后文字路线继续，不把 `ended` 纳入规则；
- 命中缺失 MP3 时，audio 立即移除 `src`，状态提示“这段声音没有播放，
  文字已经为你留下”，仍按 420ms 正常结算；
- generation 与 pending token 双重失效保护生效，清理顺序为
  `pause → remove src → load`；
- 临时服务与音频在验收后已停止，没有创建或提交私人媒体文件。

## 5. 响应式、触控与系统模式

首屏和终局分别检查以下六种视口：

| 视口 | 首屏横向溢出 | 终局横向溢出 | 最小按钮高度 |
| --- | ---: | ---: | ---: |
| 1504×1000 | 0 | 0 | 48px |
| 1440×900 | 0 | 0 | 48px |
| 768×1024 | 0 | 0 | 48px |
| 390×844 | 0 | 0 | 48px |
| 320×568 | 0 | 0 | 48px |
| 844×390 | 0 | 0 | 48px |

320px 仅产生预期纵向滚动，不出现横向截断。按钮均至少 48×48px，滑杆高度
48px，并有键盘和逐圈按钮替代拖动。

- `prefers-reduced-motion: reduce`：命中后通过 microtask 立即进入
  `track-result`，唱片不持续旋转；
- `forced-colors: active`：系统 Canvas / CanvasText / Highlight 生效，
  按钮与关键边界仍可见，横向溢出为 0；
- JavaScript disabled：stage 为空、按钮为 0、audio 无 `src`，只显示
  “此体验需要浏览器启用 JavaScript”；
- 浏览器 warning / error 日志：0。

## 6. 视觉保真台账

对照已确认的桌面寻槽与移动终局概念图，逐项保留：

1. 深茶黑压片桌背景与细黄铜工作线；
2. 唱片作为唯一主视觉，不引入专辑封面浏览器；
3. 12 圈沟槽、暗红标签、黄铜唱臂和唱针位置反馈；
4. 线索侧轨、四段信号尺与大号当前信号文字；
5. 象牙纸终局封套、细内框与暗红标题点缀；
6. 三段正文以 `01 / 02 / 03` 编号排布；
7. 移动端“给你 → 唱片 → 展开纸张 → 重新开始”的纵向层级；
8. 底部整宽暗红主动作。

成品将概念稿的位图质感改写为纯 CSS 渐变、边框与排版，没有把概念 PNG 或
任何第三方素材带入运行包。

概念图冻结值：

```text
desktop:
c0f16b83610f550de7dc143ef4012933f263adc1b15d86efe649b2fa11025d82

mobile:
8d2e7e260bf823c7efb52cc892749df50189be59705240b0fbd98e51c771d53f
```

## 7. 来源、权利与隐私

`README.md` 与 `ATTRIBUTION.md` 已明确：

- 没有参考、下载、vendoring 或复制第三方开源项目；
- 因此没有第三方 commit / tag / LICENSE / NOTICE 需要归档；
- 运行代码、文案、CSS 图形与 favicon 均为本仓库原创；
- 概念图由 OpenAI 图像生成工具生成，只在 docs 中用于沟通，不进入运行时；
- 一手资料只用于唱片历史、HTML media、slider、WCAG、自动播放和录音权边界；
- `config.js` 与自备音频是本地明文，不是加密；
- 自备音频必须分别确认词曲权、具体录音与表演权，并取得其他参与者同意；
- 照片、封面、字体和纹理需要分别确认许可。

未发现需要新增到 `bugs/` 的产品缺陷，也没有出现超出既有规格、值得单独新增到
`learn/` 的新工程结论。第一次全仓测试因当前 worktree 尚未安装根依赖而缺少
`qrcode`；执行锁文件对应的 `npm ci` 后全绿，这是环境准备，不是产品 bug，
也未修改依赖清单或锁文件。

## 8. 自动化结果

```text
node --check config.js / logic.js / app.js
PASS

node --test logic.test.js ui-contract.test.js
46 tests, 46 pass, 0 fail

npm test
2364 tests, 2364 pass, 0 fail

npm run verify
64 个作品入口
56 个 A 级直开
8 个非 A 启动器
仓库验收通过

git diff --check
PASS
```

阶段提交：

```text
7d26cac  test: freeze vinyl secret production UI contract
4b955de  feat: ship vinyl secret production experience
cc173ef  docs: close vinyl secret local-use and attribution boundary
```
