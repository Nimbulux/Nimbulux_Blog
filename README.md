# Nimbulux_Blog

扁平化 + 淡色系的博客页面。**每个页面都是普通网页**：直接打开就能用，站内链接是真实跳转，
没有 SPA 外壳、没有构建步骤。

## 目录

```
index.html                       入口：跳到 app/
assets/                          外层公用资源（仓库根的基本页面也用得上）
├─ favicon.svg                   标签页图标（自带亮暗自适应）
├─ logo.svg                      顶栏 logo
└─ README.md                     怎么换图 / 路径怎么写

app/                             模板本体，整个目录搬走也能用
├─ index.html  home.js          ★ 模板首页（就在 app/ 根）：content/home.md + 精选 + 最近更新
├─ pages/                       其余页面一个页面一个文件夹
│   ├─ post/     index.html  post.js  post.css  crypto.js
│   │                                          文章页：./?p=<路径>
│   ├─ friends/  index.html  friends.js        好友：content/friends.md
│   └─ about/    index.html  about.js          关于：content/about.md
├─ js/                           公共脚本
│   ├─ config.js      ★ 全部配置（站点 / 页面 / 路径 / 文案 / 配色）
│   ├─ theme-init.js  首帧亮暗（放在 <head> 里，避免闪白）
│   ├─ dom.js         小工具：建节点、取 JSON、按需加载
│   ├─ icons.js       图标调用（图形在 app/assets/icons/*.svg，已内联进页面）
│   ├─ theme.js       色相 + 饱和度 → 全部 CSS 变量；亮 / 暗 / 自动
│   ├─ nav.js         顶栏（站点名 / 功能页 / 主题开关 / 调色板胶囊）
│   ├─ posts.js       文章数据：读 list.json、拍平、搜索
│   ├─ markdown.js    md → HTML（marked 按需加载，高亮可选）
│   ├─ page.js        页面里重复用的小块：文章卡片、区块标题、页脚、渲染 md
│   ├─ article.js     文章正文渲染 + 阅读进度 + 标题锚点
│   └─ widgets.js     文章页右侧功能区：目录树 / 文章导航 / 音乐 / 光晕 / 回到顶部
├─ content/                      主页 / 好友 / 关于 的正文 md
├─ css/style.css                 全站样式（外观沿用原设计，合并成这一份）
├─ assets/icons/*.svg            42 个图标，每个一个文件（站点内部用）
└─ vendor/                       marked（必需）、highlight、dompurify（可选）

posts/                           文章产物：list.json + page.md / page.enc
_posts-demo/                     内置示例数据，用来离线跑自检
```

首页只有一个层级（`app/`），其他页在 `app/pages/<页面>/`，所以配置里的路径统一按
**相对 `app/` 根**写，`config.js` 末尾会按当前页面深度自动补前缀（见下面「配置」）。
每个页面只引自己用得到的脚本（公共 `js/...` 或 `../js/...` + 本页 `./x.js`，共 10~13 个）。

## 运行

```
node _serve.js                       # http://127.0.0.1:5173/（自动进 app/）
node _selftest.js                    # 用 _posts-demo/ 跑一遍（四个页面 + 解密）
SELFTEST_REAL=1 node _selftest.js    # 用默认的 ../posts 自检
node _makedemo.js                     # 重新生成 _posts-demo/
node _syncposts.js --write            # 索引里的 title 和真实目录名对不上时，补 slug 并重写 posts/list.json
```

`.vscode` 里 Live Server 跑在 5500，开 `http://localhost:5500/` 即可（根会跳到 `app/`）。

## 页面

| 页面 | 地址 | 内容 |
| --- | --- | --- |
| 主页 | `app/` | 现在只渲染 `content/home.md` 指向的 **README**（文章卡片用 `home.showLists` 开关） |
| 文章 | `app/pages/post/?p=<路径>` | 正文（`page.md` / `page.enc`）+ 右侧功能区 |
| 好友 | `app/pages/friends/` | `content/friends.md`（也可在 config 写结构化 groups） |
| 关于 | `app/pages/about/` | `content/about.md` |

文章之间靠**文章页右侧的目录树**切换（整棵 `posts/` 树 + 搜索），所以没有单独的列表页。
首页固定显示"精选 + 最近更新"，其余文章从右侧目录里找。

## 文章索引里的 title 和 slug

`posts/list.json` 的 `title` 是**显示标题**，不一定等于真实文件夹名。比如索引写 `001-甜同甜`，
磁盘上却是 `002-甜同甜`；索引写 `lan的杂念集`，磁盘上是 `lan的散文集`。
文章地址是按**目录名**拼的（`<posts.root>/<目录>/page.md`），对不上就 404。

所以索引可以额外带一个 `slug`（真实目录名）：

- `app/js/posts.js` 用 `slug` 拼地址、用 `title` 显示；没有 `slug` 就退回 `title`
- 手上这份索引对不上时补一次即可：

```
node _syncposts.js          # 只看会改什么，不写文件
node _syncposts.js --write  # 以磁盘为准补 slug、重写 posts/list.json（原文件备份为 list.json.bak）
```

自检里有一条「每篇的正文地址都要落到真实文件」，`SELFTEST_REAL=1 node _selftest.js` 就能查出来。

## 好友 / 关于

这两页结构一样：一个 `index.html` + 一个页面 js，正文取 `config.content.<页面>` 指向的 md。

- 关于：改 `app/content/about.md` 就行
- 好友：默认渲染 `app/content/friends.md`；想用卡片列表就在 `config.friends.groups` 里写
  `[{ name: '分组名', links: [{ name, url, desc }] }]`，一填就自动换成卡片版（两套二选一）
- 加一个新页面：复制 `app/pages/about/` 改个名 → 在 `config.pages` 里加一项 → 在 `config.topbar.nav` 里加入口

## 右侧功能区（只在文章页）

| 模块 | 作用 |
| --- | --- |
| 文章目录 | 整棵目录树，点就是换文章；搜索是**整棵树**范围的（`switcher.search.scope`） |
| 文章导航 | 当前这一篇的标题树 + 阅读进度，点跳转并框选提示 |
| 音乐播放 | 播放条 + 歌单，都在这一列里，跟着一起滚 |

目录树按层级缩进（`layout.treeIndent`，默认 14px，走 `--tree-step`），每展开一层画一条浅色竖线
（`.switcher-children::before`，位置对齐上一层的箭头）+ 连到每一项的短横线，当前那一项的两条线会变成
`--brand-3`。缩进按 `--depth` 算，嵌套多深都不会糊成一坨（以前是两条写死的选择器，「三层以上全卡在 28px」）。

**展开聚焦**（`switcher.focusFade`，默认开）：展开某一支时，不属于这一支的条目（表兄弟、别的顶层分支）
淡出，**一直藏着**；收起这一支（或者换文章重新渲染）之后再淡回来。保留的是「祖先链 + 这一支自己的子树」。
只改透明度、不动布局，所以不会跳。想改成「淡出一下就自动淡回」，把 `switcher.focusMode` 设成 `'pulse'`
（多久淡回由 `switcher.fadeMs`，默认 340ms）；`focusFade: false` 就整个关掉。

> 类名上有一点要留意：顶栏那几个导航链接是 `.nav-link`，而「文章导航」里的小标题链接是
> `.navtree-link`（`.navtree-item / -caret / -children / -list / -progress / -empty` 同理）。
> 以前两边同名，后写的规则会把顶栏那条覆盖掉 —— 表现就是顶栏文字贴左、高亮色块多出一截。
> 自检里有一条断言盯着「顶栏 `.nav-link` 只允许 3 条规则」。

### 搜索：整树 + 拆词 + 按匹配度排

- 查询按空格 / 逗号 / 顿号 / 斜杠等拆成词（`Posts.terms`），**每个词都要命中**才算（AND）
- 命中范围：标题（权重最高）→ 标签 → 路径 → 摘要 → 上级目录名；命中越靠前、占比越大、出现次数越多，分越高
- 结果按分数从高到低排，同分按日期新的在前；命中的词在结果里高亮
- 想在当前目录里搜，把 `config.switcher.search.scope` 改成 `'current'`

这一列自己是一个滚动区（`.sidebar-inner`）：上面三段按顺序排，**一起滚**。
歌单展开只是让音乐模块变高，滚动条跟着变长，播放条没有特殊定位；
歌单本身有自己的 `max-height` 和一条内部滚动，太长也不会把整列撑爆。
顶栏那个按钮可以把整个功能区收起，正文区独立滚动、顶部有阅读进度线。

想让播放条一直贴在功能区底部不跟着滚，把 `config.music.pinned` 设成 `true`
（对应 CSS 里的 `.widget.music.is-pinned`，默认关着）。

## 文章之间的上下篇

正文底部的「上一篇 / 下一篇」默认**只在同一个文件夹里排**：一本小说的章节是一串，
不同小说、不同分类之间互不干扰（不会把整站文章串成一条）。

```js
article: {
  prevNext: {
    enabled: true,
    scope: 'folder',   // 'folder' = 只在本文件夹内（默认）；'all' = 整站串成一条
    order: 'tree',     // 'tree' = 跟着目录树顺序；'index' = 按索引里的原始次序（章节顺序）
    prevLabel: '上一篇', nextLabel: '下一篇', emptyText: '没有了'
  }
}
```

方向按**阅读顺序**：`上一篇` = 更早的那篇，`下一篇` = 更晚的那篇。
目录树本身是「新的在前」，所以代码里翻了一下再用；`order: 'index'` 时按索引原始次序，不翻。
（排序用的日期解析两种写法都认：`2026-09-27T08:00:00+08:00` 和 `2026-09-27`；
以前带时间的会被当非法日期，退化成按标题排，现在不会了。）

## 手机上的功能区

宽度 ≤ `config.layout.mobileBreakpoint`（默认 900）时，右侧功能区不再占一列，而是变成
**一层浮在正文上的可折叠覆盖层**：

- 默认收起，点顶栏那个按钮弹出（浮层右上角也有「收起」）
- 点面板外面、按 Esc、点顶栏按钮都能收起；点面板里的标题跳转后也会自动收起
- 开着的时候正文不跟着滚，底部那个「回到顶部」胶囊会暂时让位
- 宽度取 `config.layout.mobilePanelWidth`，按钮文案取 `config.layout.labels`

宽屏下还是原来的样子：左边正文、右边一列功能区。

## 按需加载

页面里只引公共脚本，用到才拉：

- `marked`：渲染主页 / 好友 / 关于的 md，以及文章正文
- `highlight` + 主题 css：文章页（代码高亮）
- `dompurify`：文章页（清洗渲染结果，可选）
- `pages/post/crypto.js`：打开 `encrypted: true` 的文章时才拉（解密就放在文章页目录里）

## 加密文章

密文格式 `salt(16) + iv(12) + authTag(16) + ciphertext`，PBKDF2-SHA256 派生密钥、AES-GCM 解密，
密码**只在当前页面的内存里用一下**：

- 不写 cookie，不写 `localStorage` / `sessionStorage`，也不进 URL
- 所以刷新页面、跳到别的文章再回来，都要重新输入（这是故意的）
- 同一次页面加载里重复渲染同一篇不会重复弹框（内存里那份明文）；页面一关就没了
- **等密码期间不出加载占位条**（不然对着密码框一直闪）；密码到手、真正开始解密时才会显示一下，
  然后淡出换成正文 —— 这个时机由 `Decrypt.ready(url, path, onWork)` 的第三个参数回调触发
- 密码框本身也是主题色：底 `--brand-1`、边 `--brand-3`，聚焦只是加深到 `--brand-2` + `--brand-4` 边，
  不会一失焦就从主题色变成白底（浏览器的自动填充底色也用内阴影盖掉了）
- 自检里有一条静态检查：`crypto.js` 里出现 `localStorage` / `sessionStorage` / `document.cookie`
  就直接失败，防止以后又被加回去

## 图标

`app/assets/icons/*.svg` 每个图标一个文件。页面里内联了它们的符号表
（`<symbol id="i-moon">`），所以运行时零请求、`file://` 也能用；代码里只写名字：

```js
Dom.icon('moon')   // -> <span class="icon"><svg><use href="#i-moon"/></svg></span>
```

加/改图标：改 `app/assets/icons/` 后，把每个页面里那段
`<svg class="icon-sprite">…</svg>` 换成新的（从已有页面复制一份即可）。

`favicon.svg` 和 `logo.svg` 不在这里：它们要跟外层基本页面共用，放在仓库根 `assets/`
（见 `assets/README.md`）。

## 配置

`app/js/config.js` 全部可调：站点信息、页面清单（目录名 / 标题 / 参数名）、
`content` 指向的 md、`vendor` 与 `assets`（内站资源 / 外层公用）路径、`posts` 数据源、
各模块文案与开关、`layout` 尺寸、`theme` 配色 token。模块代码里没有写死的路径、文案或尺寸。

路径都按**相对 `app/` 根**写，例如 `content/home.md`、`vendor/marked/marked.min.js`、
`../posts`；文件末尾那段 `appBase()` 会按当前页面深度补成 `./…` 或 `../../…`。
所以首页放 `app/` 根、内页放 `app/pages/<页面>/` 都不用改路径，整个 `app/` 换目录也不用。
每个页面还拿到了一个现成的 `config.pages.<key>.url`，站内跳转都走它。

## 配色：所有颜色都从色相算出来

`config.theme.tokens` 里每一种颜色都是一份**配方**，`app/js/theme.js` 的 `color()` 负责算成
真正的颜色 —— 所以色相滑块一动，底色、边框、文字、代码块、滚动条、遮罩**全都跟着变**，
不再是「只有品牌色会动、其余继续发灰」：

```js
bg:               { l: 97.1, s: 20, dh: 6 },              // hsl(色相 + 6, 20%, 97.1%)
surface2:         { l: 95.5, s: 21.7, dh: 2 },
text:             { l: 12.9, s: 18.2, dh: 6 },
hover:            { l: 11.8, s: 26.7, dh: 4, a: 0.05 },   // 带透明度 → hsla()
scrim:            { l: 9.4, s: 25, dh: 6, a: 0.28 },      // 手机浮层那层遮罩
```

| 字段 | 含义 |
| --- | --- |
| `l` | 亮度（必填） |
| `s` | 饱和度，不写 = 0（纯灰） |
| `dh` | 相对主题色相的偏移（度）；不写 = 同一个色相 |
| `h` | 写死色相，不跟主题走（语义色 `ok / warn / danger` 用它保住绿 / 琥珀 / 红） |
| `a` | 透明度，写了输出 `hsla()` |

也可以直接写 `'#fff'` / `'rgba(...)'`，原样输出 —— 个别地方不想跟主题走时用这个。

`presets` 里那 9 个色相点、饱和度、滑块样式都还在 `config.theme` 里；亮暗两套各一份配方。
默认色相 214 下算出来的颜色和原来**逐像素一致**（自检里有一条「和 `style.css` 兜底比对，
RGB 偏差 ≤ 3 才算过」守着这件事，换配方不会悄悄把风格改掉）。

顶栏调色板按钮右下角那个小圆点显示的就是当前主题色（`.nav-dot`，绝对定位），
所以 `.nav-btn` 必须是 `position: relative` —— 少了这行它会挂到整个顶栏的右下角去。

## 布局宽度

所有页面共用一条宽度线，不会「文章宽一截、别的窄一截」：

```js
layout: {
  fullWidth: true,                            // true = 用下面的 maxWidth；false = 退回 container（860px 窄版）
  maxWidth: '1440px',                         // 顶栏 / 正文 / 侧栏 / 页脚都在这条线里居中
  articlePadding: 'clamp(22px, 3vw, 56px)',   // 左右留白，随窗口宽度伸缩
  sidebarWidth: '320px',
}
```

`theme.js` 把这条线写成 `--page-w`，`.container`、`.container.wide`（顶栏）、`.layout`（文章页两栏）、
页脚全都用它 —— 所以顶栏品牌、正文左边缘、页脚永远对齐。

- 宽屏下正文一行大约 950px（1440 − 320 侧栏 − 留白），不会拉成一行一千多像素
- 首页卡片默认 `home.cardColumns: 3`（用 `--card-cols` 传下去），窄屏自动变 1 列

回到顶部 / 去到底部的那颗胶囊默认挂**左下角**（`jumpCapsule.side: 'left'`，改 `'right'` 回右边）；
宽屏时正文区自己滚、手机时整页滚，两种都由 `widgets.js` 里的 `scrollHost()` 自动判断。

## 主页（自动找 README，找不到用回落文件）

```js
content: {
  home: '../',                 // 写目录（以 / 结尾）= 在目录里找 README
  about: 'content/about.md',   // 也可以直接写文件，或写数组按顺序探测
  friends: 'content/friends.md'
},
readmeNames: ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README.markdown'],
contentFallback: 'content/home.md',   // 上面全都没找到时用它
home: {
  intro: false,       // 顶部「站点名 + 一句话」那块
  showLists: false,   // 精选 / 最近更新 卡片（连着 posts 索引一起要，现在关着）
  cardColumns: 3,
}
```

`Page.content()` 会把每个页面要读的文件摊成一个候选列表（目录 → `readmeNames` 逐个试 → 数组里的
下一项 → 最后的 `contentFallback`），**谁先读到就用谁**，读不到才在页面上列出试过的路径。
用的是哪一个记在 `Page.contentSource(key)` 里，控制台也会打一行 `正文来源 home：../README.md`。

所以：仓库根有 `README.md` 就显示它；哪天改名/删掉，就自动回落到 `content/home.md`。
想恢复「精选 + 最近更新」把 `home.showLists` 打开就行。页脚是等正文渲染完才挂的，不会跑到正文上面去。

## 提示条（config 里配）

```js
article: {
  notices: {
    top:    { enabled: false, type: 'info', text: '' },
    bottom: { enabled: true,  type: 'tip',  text: '本文采用 CC BY-NC-SA 4.0 授权，转载请注明出处。' }
  }
}
```

`type` 决定图标和染色：`info` / `tip` 用品牌色（`--brand-1` 底 + `--brand-3` 边 + `--brand-4` 图标，
跟着主题色相走），`warn` 用琥珀色（`--warn-bg` / `--warn-border`，在 `theme.tokens` 里）。

正文用到的排版（`.prose`：标题 / 列表 / 引用 / 代码块 / 表格 / 图片）都在**公共的 `css/style.css`** 里，
因为主页、好友、关于也要渲染 md；`pages/post/post.css` 只留文章页专属的
文章头 / 提示条 / 上下篇 / 加密框。

- 代码块底色只听 `--code-bg`：高亮主题自带的 `#fff` 和 `.hljs-addition / .hljs-deletion` 的浅绿浅红
  都被 `!important` 压掉了，夜里不会白一块；高亮主题本身也跟着亮暗切（`Theme.loadStyles()` 之后会
  再 `syncSheets()` 一次，避免暗色下还挂着浅色那套）
- 表格铺一层 `--surface`、表头染 `--brand-2`（跟着主题色相走），不会跟页面底色糊在一起
- 提示条按类型染色：`info` / `tip` 用 `--brand-1` 底 + `--brand-3` 边 + `--brand-4` 图标，
  `warn` 用 `--warn-bg` / `--warn-border`（琥珀）
- 正文没渲染完时的加载占位条（骨架屏）整条都是主题色（`--brand-2` 底 + `--brand-3` 扫光）；
  **只有真慢的时候才出现**（超过 `article.loadingDelay`，默认 400ms）——本地几毫秒就加载完了，
  所以刷新时根本不会闪一条占位；真出现时也是**淡出**（`is-hiding`，绝对定位盖在正文开头），
  不做硬切。`marked` 会在取正文的同时并行下载（`Markdown.ready()`），别串行等
- 音乐封面没配 `cover` 时不用白色占位图了：改成一层 `--cover-bg`（主题色 + 半透明）+
  标题首字 `--cover-fg`，所以刷新时不会再闪一下白图；`music.coverFallback: 'none'` 就只留遮罩不要首字

## 出错时的行为

数据取不到（`list.json` / `page.md` / `page.enc`）不会抛异常，也不会停在加载态：
控制台 `console.warn` 一行原始错误，页面上显示可读提示。

索引拿不到时，页面上会直接把**取过的地址**打出来（`posts.indexUrl` 解析后的绝对地址），
不用开控制台就知道是哪一步不对；正文取不到时同样把地址写在提示里。

> 浏览器调试器开着「Pause on exceptions」时，这些**已被内部处理**的 404 会让调试器停下来
> 显示「出现异常 / Error: HTTP 404」——那是断点，不是页面崩了，继续放行或关掉这个开关即可。
