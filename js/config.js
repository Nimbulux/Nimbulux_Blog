/* =============================================================================
 * config.js —— 全站唯一配置入口
 * 迁移时只改这个文件：路径、文案、开关、尺寸、外链都在这里。
 * 各页面自己写页面专属配置（pages/<页面>/page.js 顶部），这里只放公共信息。
 *
 * 下面所有路径都按「相对 app/ 根目录」写（首页就在 app/ 根，其他页在 app/pages/<页面>/）：
 * 文件末尾会用 appBase() 自动补成从当前页面出发的地址，所以增删页面、改目录深浅都不用动路径。
 * ========================================================================== */

/** 从 app/js/config.js 自己的地址，推出「当前页面目录 → app/ 根」的前缀（首页 './'，内页 '../../'） */
function appBase() {
  var self = (document.currentScript && document.currentScript.src) || '';
  if (!self) {
    try {
      var tags = document.querySelectorAll('script[src]');
      for (var i = 0; i < tags.length; i++) {
        if (/\/js\/config\.js(\?|#|$)/.test(tags[i].src || '')) { self = tags[i].src; break; }
      }
    } catch (e) { /* 拿不到就按内页深度算 */ }
  }
  if (!self || !location.href) return '../../';
  var here = location.href.split(/[?#]/)[0].split('/');
  var app = self.split(/[?#]/)[0].split('/');
  here.pop(); app.pop(); app.pop();                 // 页面所在目录 / app 根目录
  while (here.length && app.length && here[0] === app[0]) { here.shift(); app.shift(); }
  return here.length ? new Array(here.length + 1).join('../') : './';
}

/** 拼相对地址并顺手消掉 ./ 与多余的 ../（结尾的 / 要留住，否则目录地址会被服务器 301 掉、丢掉 ?p= 参数） */
function joinPath(base, rel) {
  if (/^(?:[a-z]+:)?\/\//i.test(rel) || rel.charAt(0) === '/') return rel;   // 绝对地址原样保留
  var tail = /\/$/.test(rel) ? '/' : '';
  var out = [], parts = (base + rel).split('/');
  parts.forEach(function (p) {
    if (!p || p === '.') return;
    if (p === '..' && out.length && out[out.length - 1] !== '..') out.pop();
    else out.push(p);
  });
  var s = out.join('/') || './';
  return tail && s.charAt(s.length - 1) !== '/' ? s + '/' : s;
}

window.BLOG_CONFIG = {

  /* -------------------------------- 站点 ---------------------------------- */
  site: {
    name: '云中霞光',
    tagline: '一个小博客',
    description: 'Nimbulux的博客网站 · 云中霞光',
    // 页面标题模板：{title} / {site}
    titleTemplate: '{title} · {site}',
    language: 'zh-CN',
    brand: {
      logo: 'logo.svg',    // assets 里的图片；留空则用站点名首字母
    }
  },

  /* ------------------------------ 自定义资源 ------------------------------- */
  // 分成两处：网点自己的图放 app/assets/，需要给外层基本页面公用的图标放仓库根 assets/
  assets: {
    root: 'assets',              // app 内的站点资源（正文插图、头像、封面等）
    shared: '../assets',         // 外层公用：favicon、站点 logo 等
    // 按需增减，type 会写进 <link type>
    favicons: [
      { file: 'favicon.svg', type: 'image/svg+xml' }
    ]
  },

  /* -------------------------------- 页面 ---------------------------------- */
  // key 对应页面地址；folder 为空 = 页面就在 app/ 根（模板首页），否则在 app/pages/<folder>/
  pages: {
    home: { folder: '', title: '主页' },
    post: { folder: 'post', title: '文章', queryKey: 'p' },
    friends: { folder: 'friends', title: '好友' },
    about: { folder: 'about', title: '关于' }
  },
  defaultPage: 'home',
  articlePage: 'post',

  /* ------------------------------ 页面内容 -------------------------------- */
  // 页面正文用哪个 md（相对 app/）。写目录（以 / 结尾）就会在目录里找 readmeNames 里的文件名：
  //   home: '../'  = 在仓库根找 README，找不到再用 contentFallback
  // 也可以写数组，按顺序依次探测；也可以直接写文件路径。
  content: {
    home: '../',
    about: 'content/about.md',
    friends: 'content/friends.md'
  },
  // 找 README 时按顺序试这些名字（大小写都照顾到）
  readmeNames: ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README.markdown'],
  // 上面全都找不到时用这个兜底；也没有就显示「读不到内容文件」
  contentFallback: 'content/home.md',

  /* -------------------------------- 顶栏 ---------------------------------- */
  topbar: {
    nav: [
      { key: 'home', label: '主页' },
      { key: 'post', label: '文章' },
      { key: 'friends', label: '好友' },
      { key: 'about', label: '关于' }
    ],
    labels: { palette: '主题色', theme: '亮暗', close: '收起' },
    // 屏幕比这个窄时，顶栏那排导航钻进功能区（文章页的右侧栏），变成一条能左右滑的轮盘
    // 0 = 永远留在顶栏
    navCollapseAt: 900
  },

  /* -------------------------------- 依赖 ---------------------------------- */
  vendor: {
    marked: 'vendor/marked/marked.min.js',
    dompurify: 'vendor/dompurify/purify.min.js',
    highlight: 'vendor/highlight/highlight.min.js',
    highlightLight: 'vendor/highlight/github.min.css',
    highlightDark: 'vendor/highlight/github-dark.min.css'
  },

  /* -------------------------------- 数据源 -------------------------------- */
  posts: {
    root: '../posts',              // 构建产物目录（仓库根），相对 app/
    indexUrl: '../posts/list.json',// 整棵索引；取不到则显示空状态
    // 本机先看效果：改成 '../_posts-demo' 与 '../_posts-demo/list.json'
    listFile: 'list.json',
    plainFile: 'page.md',
    encryptedFile: 'page.enc',
    ignoreTitles: ['.github', '.git', 'node_modules'],
    pruneEmpty: true,
    // 地址里中文路径怎么写：none（可读）| all（百分号编码）
    encode: 'none',
    labels: {
      empty: '这里还没有文章',
      emptyList: '没有拿到文章索引，检查一下 posts 配置'
    }
  },

  /* -------------------------------- 首页 ---------------------------------- */
  // 现在主页只渲染 content.home 那个 md（也就是仓库根的 README）；
  // 想恢复「精选 + 最近更新」卡片，把 showLists 打开即可，其余参数都还在。
  home: {
    intro: false,              // 顶部「站点名 + 一句话」那块
    showLists: false,          // 精选 / 最近更新 卡片列表（连着 posts 索引一起要）
    featuredTitle: '精选',
    featuredCount: 3,
    recentTitle: '最近更新',
    recentCount: 6,
    showExcerpt: true,
    showTags: true,
    // 首页不放侧栏：就是一个标题 + 内容 + 卡片
    cardColumns: 3
  },

  /* -------------------------------- 文章页 -------------------------------- */
  article: {
    sidebar: true,             // 文章页要不要右侧功能区
    header: { showDate: true, showUpdated: true, showReadingTime: true, showTags: true },
    readingTimeText: '约 {n} 分钟',
    updatedText: '更新于 {date}',
    // 上下篇：scope 'folder' = 只在同一个文件夹里排（一本小说一个序列）；'all' = 整站串成一条
    //        order 'tree' = 按目录树顺序（树是新的在前，会翻成阅读顺序：上一篇=更早，下一篇=更晚）
    //        order 'index' = 按索引里的原始次序（章节顺序），原样用不翻
    prevNext: { enabled: true, scope: 'folder', order: 'tree', prevLabel: '上一篇', nextLabel: '下一篇', emptyText: '没有了' },
    // 提示条：正文前面 / 后面各一条，type = info | tip | warn，title / text 都可以不写
    notices: {
      top: { enabled: false, type: 'info', text: '' },
      bottom: { enabled: true, type: 'tip', text: '本文采用 CC BY-NC-SA 4.0 授权，转载请注明出处。' }
    },
    markdown: true,
    highlight: true,
    codeCopy: true,
    loadingDelay: 400,         // 超过这么久还没取到正文才显示加载占位条（快的时候就不出现，免得闪一下）
    labels: { copy: '复制代码' },
    missingTitle: '找不到这篇文章',
    indexErrorTitle: '没有拿到文章索引',
    indexErrorTip: '索引是相对文章页地址取的：确认 posts 目录在服务器根下，并且 posts.root / posts.indexUrl 指对了。',
    backText: '回到主页',
    errorTitle: '正文加载失败',
    errorTip: 'file:// 直接打开时浏览器会拦截 fetch，请用本地静态服务器预览。'
  },

  /* ------------------------------ 加密文章 -------------------------------- */
  encrypted: {
    enabled: true,
    title: '这是一篇加密文章',
    // 密码只在当前页面的内存里用一下：不写 cookie，也不写 localStorage / sessionStorage，
    // 所以刷新页面、跳走再回来，都要重新输入。
    hint: '密码只在本机使用，不会上传、不会写进文件，也不会记在浏览器里。',
    placeholder: '密码',
    submitText: '解密',
    wrongText: '密码不对，再试一次',
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 100000, saltBytes: 16 },
    cipher: { name: 'AES-GCM', ivBytes: 12, tagBytes: 16, keyBits: 256 }
  },

  /* ---------------------------- 文章目录（切换） --------------------------- */
  switcher: {
    title: '文章目录',
    collapseDepth: 2,
    showCount: true,
    expandCurrent: true,
    // 展开某一支时的聚焦淡出：默认关。开了的话（true）不属于这一支的条目会淡出
    focusFade: false,
    focusMode: 'hold',         // 'hold' = 一直藏着，收起/换文章才淡回；'pulse' = 展开后过一会儿自动淡回
    fadeMs: 340,               // 只在 pulse 模式下用
    // 层级辅助线：'full' 竖线 + 连到每一项的横线（默认）；'line' 只竖线；'none' 不要线只留缩进
    treeGuide: 'full',
    // 搜索：整棵树一起搜（scope: 'current' 才只搜当前目录）
    // 查询会按空格 / 标点拆词（拆词搜索），每个词都要命中，结果按匹配度从高到低排
    search: { enabled: true, placeholder: '搜索…', scope: 'all', maxResults: 60 },
    emptyText: '没有找到文章',
    loadingText: '正在读取…'
  },

  /* ------------------------- 文章导航（本文标题树） ------------------------ */
  navTree: {
    title: '文章导航',
    showProgress: true,
    collapseDepth: 2,
    flashMs: 1400,
    emptyText: '本文没有子标题',
    loadingText: '正在加载…'
  },

  /* -------------------------------- 音乐 ---------------------------------- */
  music: {
    enabled: true,
    title: '正在播放',
    volume: 0.7,
    autoplay: false,
    defaultPlayMode: 'list',
    coverFallback: 'letter',
    pinned: false,             // true = 播放条贴住功能区底部（sticky）；false = 跟其它模块一起滚
    labels: {
      more: '播放目录', prev: '上一曲', next: '下一曲', play: '播放', pause: '暂停',
      open: '打开原页面', modeList: '顺序播放', modeShuffle: '随机播放', modeSingle: '单曲循环',
      unknownTrack: '未选择曲目', unknownArtist: '—'
    },
    playlist: [
      { title: '夜行电车', artist: 'Aoi', duration: '3:42', cover: '', src: 'demo:chord-1', url: 'https://example.com/night-tram' },
      { title: 'Starlight Path', artist: 'Mizu', duration: '4:08', cover: '', src: 'demo:chord-2', url: 'https://example.com/starlight-path' }
    ]
  },

  /* ------------------------------ 回到顶部 -------------------------------- */
  jumpCapsule: {
    enabled: true,
    side: 'left',              // 胶囊挂在左下角；'right' 就回右边
    idleDelay: 3000,
    undoWindow: 5000,
    edgeThreshold: 120,
    scrollDuration: 520,
    labels: { top: '回到顶部', bottom: '去到底部', undo: '撤销跳转' }
  },

  /* -------------------------------- 布局 ---------------------------------- */
  layout: {
    container: '860px',
    fullWidth: true,           // true = 所有页面用下面的 maxWidth；false = 退回 container（窄版）
    maxWidth: '1440px',        // 整页最大宽度：顶栏 / 正文 / 侧栏 / 页脚都对齐在这条线里居中
    articlePadding: 'clamp(22px, 3vw, 56px)',   // 左右留白，随窗口宽度伸缩
    topbarHeight: '56px',
    gap: '18px',
    sidebarWidth: '320px',
    radius: '14px',
    treeIndent: '14px',        // 右侧文章目录每一层缩进多少（层级提示线跟着这个走）
    // 手机（宽度 <= mobileBreakpoint）时，右侧功能区变成一层浮在正文上的可折叠覆盖层
    mobileBreakpoint: 900,
    mobilePanelWidth: '360px',
    labels: { toggle: '功能区', collapse: '收起' }
  },

  /* ------------------------------- 主题 ----------------------------------- */
  theme: {
    defaultHue: 214,
    defaultSaturation: 56,
    defaultMode: 'auto',
    storagePrefix: 'nimbulux-blog',
    // 手动选过主题后，多久之内不再跟随系统（毫秒）；0 = 永久记住
    manualTtl: 10 * 60 * 1000,
    presets: [8, 32, 52, 96, 152, 190, 214, 268, 316],
    presetSaturation: 62,
    presetLightness: 58,
    slider: 'spectrum',
    /* 颜色配方：全站颜色都从「主题色相 + 偏移」算出来（app/js/theme.js 的 color()）
     *   l  亮度（必填）
     *   s  饱和度，不写就是 0（灰）
     *   dh 相对主题色相的偏移（度）：0/不写 = 同一个色相，正数往色环前面转
     *   h  写死色相（语义色用，不跟主题走）
     *   a  透明度，写了输出 hsla()
     * 直接写成 '#fff' / 'rgba(...)' 也认，原样输出（个别地方不想跟主题走时用）
     * 下面这套配方在默认色相 214 下就是原来的配色，动滑块时整页一起变。 */
    tokens: {
      light: {
        /* 浅色这套压低了一点亮度、把饱和度调上来：底色能看出主题色相，不再是惨白一片 */
        bg:               { l: 94, s: 34, dh: 6 },
        bgBlur:           { l: 94, s: 34, dh: 6, a: 0.8 },
        surface:          { l: 100 },
        surface2:         { l: 90.5, s: 32, dh: 3 },
        surface3:         { l: 86.5, s: 34, dh: 3 },
        border:           { l: 86, s: 30, dh: 5 },
        borderStrong:     { l: 78, s: 28, dh: 5 },
        text:             { l: 12.9, s: 18.2, dh: 6 },
        text2:            { l: 40.2, s: 11.2, dh: 3 },
        text3:            { l: 58.8, s: 10.5, dh: 4 },
        textInv:          { l: 100 },
        hover:            { l: 11.8, s: 26.7, dh: 4, a: 0.05 },
        active:           { l: 11.8, s: 26.7, dh: 4, a: 0.09 },
        codeBg:           { l: 90.5, s: 30, dh: 2 },
        codeBorder:       { l: 84.5, s: 30, dh: 2 },
        inlineCodeBg:     { l: 52.9, s: 12.5, dh: 2, a: 0.13 },
        inlineCodeFg:     { l: 46.7, s: 49.6, dh: 122 },
        scrollThumb:      { l: 52.9, s: 12.5, dh: 2, a: 0.34 },
        scrollThumbHover: { l: 45.1, s: 13, dh: 2, a: 0.55 },
        track:            { l: 52.9, s: 12.5, dh: 2, a: 0.22 },
        scrim:            { l: 9.4, s: 25, dh: 6, a: 0.28 },
        coverBg:          { l: 52, s: 42, dh: 0, a: 0.18 },     // 音乐封面占位：主题色 + 半透明
        coverFg:          { l: 42, s: 46, dh: 0 },
        warnBg:           { h: 38, s: 82, l: 48, a: 0.12 },     // 警告提示条：琥珀色淡淡一层
        warnBorder:       { h: 38, s: 70, l: 46, a: 0.42 },
        // 语义色自带含义（绿 / 琥珀 / 红），默认锁死色相；想跟着主题走就换成 dh: -62 这种
        state: {
          ok:     { h: 152, s: 42, l: 38 },
          warn:   { h: 38, s: 68, l: 42 },
          danger: { h: 2, s: 58, l: 48 }
        }
      },
      dark: {
        bg:               { l: 8.4, s: 16.3, dh: 9 },
        bgBlur:           { l: 8.4, s: 16.3, dh: 9, a: 0.78 },
        surface:          { l: 11.6, s: 15.3, dh: 6 },
        surface2:         { l: 14.3, s: 15.1, dh: 4 },
        surface3:         { l: 17.5, s: 14.6, dh: 3 },
        border:           { l: 18.4, s: 14.9, dh: 5 },
        borderStrong:     { l: 24.7, s: 14.3, dh: 3 },
        text:             { l: 92.4, s: 23.1, dh: 6 },
        text2:            { l: 68, s: 12.9, dh: 3 },
        text3:            { l: 50.4, s: 9.1, dh: 3 },
        textInv:          { l: 8.6, s: 18.2, dh: 11 },
        hover:            { l: 100, a: 0.06 },
        active:           { l: 100, a: 0.1 },
        codeBg:           { l: 13.1, s: 16.4, dh: 4 },
        codeBorder:       { l: 19.6, s: 16, dh: 4 },
        inlineCodeBg:     { l: 68.6, s: 18.8, dh: 2, a: 0.16 },
        inlineCodeFg:     { l: 75.1, s: 76.4, dh: 122 },
        scrollThumb:      { l: 64.7, s: 16.7, dh: 2, a: 0.28 },
        scrollThumbHover: { l: 72.5, s: 21.4, dh: 2, a: 0.46 },
        track:            { l: 64.7, s: 16.7, dh: 2, a: 0.22 },
        scrim:            { l: 4.3, s: 27.3, dh: 6, a: 0.5 },
        coverBg:          { l: 62, s: 42, dh: 0, a: 0.22 },     // 音乐封面占位：主题色 + 半透明
        coverFg:          { l: 76, s: 46, dh: 0 },
        warnBg:           { h: 38, s: 62, l: 62, a: 0.16 },     // 警告提示条：琥珀色淡淡一层
        warnBorder:       { h: 38, s: 58, l: 62, a: 0.4 },
        state: {
          ok:     { h: 152, s: 40, l: 62 },
          warn:   { h: 38, s: 62, l: 66 },
          danger: { h: 2, s: 62, l: 66 }
        }
      }
    },
    brand: {
      light: { satOffset: [18, 10, 4, 0, 0], light: [97, 93, 86, 54, 44], ink: '#ffffff' },
      dark: { satOffset: [-14, -6, -2, 2, 4], light: [15, 21, 30, 68, 78], inkLight: 10, inkSat: 26 }
    }
  },

  /* -------------------------------- 好友 ---------------------------------- */
  friends: {
    heading: '好友',
    applyTip: '想交换友链？在任意文章下留言即可。',
    // 留空则用 app/content/friends.md；想用结构化卡片就填 groups
    groups: []
  },

  /* -------------------------------- 页脚 ---------------------------------- */
  footer: {
    enabled: true,
    copyright: '© {year} Nimbulux',
    extra: '',
    links: [{ label: 'GitHub', url: 'https://github.com/Nimbulux' }]
  },

  /* -------------------------------- 高级 ---------------------------------- */
  advanced: {
    debug: true,
    reducedMotion: 'auto'
  }
};

/* =============================================================================
 * 路径补全 —— 上面的路径按「相对 app/ 根」写，这里补成从当前页面出发的地址。
 * 页面深浅由 appBase() 自动判断：首页在 app/ 根，其他页在 app/pages/<页面>/，都不用改配置。
 * ========================================================================== */
(function (C) {
  var BASE = appBase();
  var fix = function (v) { return (typeof v === 'string' && v) ? joinPath(BASE, v) : v; };

  C.assets.root = fix(C.assets.root);
  C.assets.shared = fix(C.assets.shared);
  Object.keys(C.content).forEach(function (k) { C.content[k] = fix(C.content[k]); });
  Object.keys(C.vendor).forEach(function (k) { C.vendor[k] = fix(C.vendor[k]); });
  C.posts.root = fix(C.posts.root);
  C.posts.indexUrl = fix(C.posts.indexUrl);

  // 页面地址：folder 为空 = 就在 app/ 根，否则 app/pages/<folder>/
  Object.keys(C.pages).forEach(function (k) {
    var p = C.pages[k];
    p.url = fix(p.folder ? 'pages/' + p.folder + '/' : './');
  });
})(window.BLOG_CONFIG);
