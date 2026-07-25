# “这一圈，和你同时到”最终验收

- 日期：2026-07-25
- 工作 ID：`twin-orbit`
- 目录：`experiences/co-op/twin-orbit/`
- 生产分支：`codex/exp-twin-orbit-production-ui`
- 启动等级：A，`file://` 直接打开
- 产品关系：两人、同一设备、实时合作
- 状态：生产实现与项目级验收通过；本工作包按边界尚未修改 catalog、分类
  README、根门户或 Board

## 1. 交付闭包

生产目录包含：

```text
index.html
styles.css
config.js
logic.js
fixtures.js
app.js
favicon.svg
package.json
logic.test.js
solver.test.js
static-contract.test.js
ui-contract.test.js
README.md
ATTRIBUTION.md
```

`index.html` 只按 `config.js → logic.js → fixtures.js → app.js` 的经典相对脚本
顺序加载，不使用 module、CDN、远程字体、远程图片、网络 API、Storage、权限或
共享运行时。所有生产资源都在项目目录内，双击 `index.html` 即可运行。

无 JavaScript 时，说明文字诚实提示启用 JavaScript，主动作与两个实时控制均
为 disabled；脚本成功初始化后，渲染器只在 public phase 存在合法动作时启用
主按钮。由此既保留渐进增强入口，也不留下无响应假控件。

## 2. 规则与核心证明

项目级 47 项测试覆盖：

- 两席使用同一个 30Hz 固定步，外轨每 tick 前进 2 格，内轨前进 3 格；
- 五关门位、要求轨道、共同窗口与公开说明均由固定配置定义；
- 只有两颗星在同一个逻辑 tick、沿各自要求轨道穿门时才成功；
- 四类失败原因绑定真实穿门快照，失败只重试当前关；
- `Escape`、blur、hidden、pagehide 与异常长帧都通过 `SUSPEND` 清空输入，
  不补算后台时间；
- revision、input epoch、tick batch、不可达角度、伪造 retry / complete、
  hostile Proxy 和整数溢出边界均被拒绝；
- 独立求解器的 golden replay 确认五关都可从公开规则完成，并覆盖
  `intro → gate-intro → playing → gate-success / gate-retry → complete →
  restart`；
- intro、complete 等非关卡阶段不公开秘密门位；SVG 使用真实 `hidden`
  attribute，不把门位泄露到首屏。

生产 controller 只从 `getPublicView()` 渲染，不读取核心私有门配置或权威状态
字段；SVG 只表达结果，不参与成功判定。

## 3. 浏览器真实路线与证据边界

Chrome 通过纯静态 localhost 服务真实完成：

```text
intro
→ 点击“开始第一圈”
→ gate-intro
→ 点击“两边准备好”
→ playing
→ 无输入运行到 gate-retry
→ 显示“再试一次”和“共同开门 62 / 60”
```

首屏两扇门均有 `hidden` attribute、`display:none`、0×0 边界且无角度
transform；进入关卡说明后才公开当前门位。页面加载与重载期间 console
error / warn、runtime exception 和 network loading failure 均为 0，
`favicon.svg` 返回 200 / 304。

当前浏览器控制接口不能表达持续双键或双指按住，因此没有把“五关成功、
complete、再走一遍”声称为浏览器真人通关。该完整路线由确定性核心 golden
replay 覆盖；浏览器 Gate 只报告实际走过的入口、失败、布局与降级路径。

自动化释放标签后，清理器额外请求站点根 `/favicon.ico` 并产生两次 404；
该请求不在页面 load / reload 的 CDP 序列，项目页面实际声明并成功加载
`favicon.svg`，因此记为清理器噪声，不作为产品回归。

## 4. 响应式、触控与系统模式

以下六种视口均满足 `scrollWidth === clientWidth`，两个实时控制等宽、等高、
可达且至少 48px：

| 视口 | 横向溢出 | 控件可达性 |
| --- | ---: | --- |
| 1504×1000 | 0 | 通过 |
| 1440×900 | 0 | 通过 |
| 768×1024 | 0 | 通过 |
| 390×844 | 0 | 控件与暂停位于首屏 |
| 320×568 | 0 | 控件与暂停位于首屏 |
| 844×390 | 0 | 完整舞台在顶部，控件可纵向滚动到达 |

- `prefers-reduced-motion: reduce`：匹配成功，animation / transition 压缩到
  `1e-06s`，规则不等待动画；
- `forced-colors: active`：匹配成功，左右席仍保留文字、星形与纹理冗余；
- JavaScript enabled：intro 主动作在首次 render 后启用，真实点击进入
  `gate-intro`；
- JavaScript disabled：`noscript` 可见，主动作和两席 hold 均 disabled，
  暂停隐藏，不存在可操作假控件。

## 5. 视觉保真台账

生产 UI 落实 `docs/310` 的“午夜双环刻度盘”方向：

1. 墨靛夜纸背景、象牙刻度线与克制的仪器台层级；
2. 单一同心双环作为主视觉，不引入太空生存 HUD；
3. 左席为琥珀六角点纹，右席为雾蓝四角横纹；
4. 两席控制面积、速度能力和状态层级完全对等；
5. 顶部共同窗口、五圈轨迹和双门形成共享目标；
6. 移动端重排为共享进度、轨道、双控制，不缩成不可触摸桌面稿；
7. CSS / SVG 原生绘制全部界面，不引用 docs 概念 PNG。

概念图只作为构图提案：

```text
desktop:
7f3da887cffc664ab5c332510e0b460dac4cf65a341460dd786e225752507df9

mobile:
72954afaedebba84a83426eb7ea942214c47d06c58dd71989cdf8b7bce924fcf
```

## 6. 来源、借鉴与依赖

`README.md` 与 `ATTRIBUTION.md` 已明确：

- 唯一机制边界参考是仓库内部 `orbit-star-race` 的“离散半径选择不同角速度”
  高层抽象；
- 没有复制、修改或打包其源码、常量、连续角速度、三轨、反向移动、随机星流、
  比分、测试、界面、文案或资产；
- 本作的同向双星、`+2 / +3` 整数速度、五关、双门同 tick 合作、输入协议、
  状态机、测试和生产 UI 均独立设计；
- 外部开源项目直接借鉴为 0，第三方代码、素材、字体、音频、图标和项目级依赖
  均为 0；
- W3C、WHATWG 与 WAI 一手标准只用于校准输入、页面生命周期和无障碍边界，
  没有复制规范代码、正文、表格或测试；
- “Twin Orbit” 只作内部 ID，对外页面、README、favicon 与目录卡片只使用
  “这一圈，和你同时到”。

## 7. 缺陷与沉淀

生产 UI 阶段发现并修复三项真实缺陷：

- SVG 元素使用 JavaScript property 写 `hidden`，未形成实际 attribute，
  导致 intro 门位泄露；
- 页面没有显式本地 favicon，localhost 验收产生资源 404；
- 主动作只依赖脚本管理，禁用 JavaScript 时成为无响应假按钮。

对应记录：

- `bugs/2026-07-25-twin-orbit-svg-hidden-target-leak.md`
- `bugs/2026-07-25-twin-orbit-localhost-favicon-404.md`
- `bugs/2026-07-25-twin-orbit-no-js-false-primary-action.md`

核心阶段既有的输入、快照、配置、来源状态和可达性缺陷仍保留在 `bugs/`，并由
当前 47 项项目测试继续回归。本轮没有出现超出既有规格、值得单独新增到
`learn/` 的新工程结论。

## 8. 自动化结果

```text
node --check config.js / logic.js / fixtures.js / app.js
PASS

node --test experiences/co-op/twin-orbit/*.test.js
47 tests, 47 pass, 0 fail

git diff --check
PASS
```

阶段提交：

```text
97f4373  test: define twin orbit production ui contract
49bb538  feat: build twin orbit local experience
79f5791  docs: document twin orbit local experience
00df655  fix: hide inactive twin orbit gates
79e7ca8  fix: provide twin orbit local favicon
f869e28  fix: disable twin orbit action without javascript
```
