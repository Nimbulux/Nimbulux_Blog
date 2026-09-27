/* =============================================================================
 * post.js —— 文章页
 * 地址：./?p=<相对 posts.root 的路径>
 * 左边正文，右边功能区（文章目录 / 文章导航 / 标题大纲 / 音乐）；
 * 正文来自 posts 构建产物的 page.md / page.enc。
 * 目录树带搜索，所以不需要单独的列表页。
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;
  var A = C.article || {};
  var L = C.layout || {};
  var root = document.getElementById('viewRoot');
  var sidebar = document.getElementById('sidebar');
  var sidebarInner = document.getElementById('sidebarInner');
  var scroller = document.getElementById('contentScroll');

  function articlePath() {
    try { return new URLSearchParams(location.search).get((C.pages.post || {}).queryKey || 'p') || ''; }
    catch (e) { return ''; }
  }

  /* --------------------- 手机上的覆盖层（折叠 / 收起） --------------------- */
  var MOBILE = '(max-width: ' + (L.mobileBreakpoint || 900) + 'px)';
  function isMobile() { return window.matchMedia(MOBILE).matches; }
  function isOpen() { return !!(sidebar && !sidebar.classList.contains('is-hidden')); }

  /* ------------------------- 功能区显示 / 收起 ---------------------------- */
  function setSidebar(show) {
    if (!sidebar) return;
    sidebar.classList.toggle('is-hidden', !show);
    document.body.classList.toggle('has-sidebar', show);
    var btn = document.getElementById('sidebarToggle');
    if (btn) btn.classList.toggle('is-open', show);
    try { localStorage.setItem('sidebar:open', show ? '1' : '0'); } catch (e) {}
  }

  function sidebarDefault() {
    if (A.sidebar === false) return false;
    if (isMobile()) return false;              // 手机上功能区是覆盖层，默认收起
    try { if (localStorage.getItem('sidebar:open') === '0') return false; } catch (e) {}
    return true;
  }

  function addCloseBtn() {
    if (!sidebarInner || document.getElementById('sidebarClose')) return;
    sidebarInner.insertBefore(Dom.el('button', {
      id: 'sidebarClose', class: 'sidebar-close', type: 'button',
      'aria-label': L.labels.collapse, title: L.labels.collapse,
      on: { click: function () { setSidebar(false); } }
    }, [Dom.icon('close', { size: 16 }), Dom.el('span', { text: L.labels.collapse })]), sidebarInner.firstChild);
  }

  /** 手机上：点面板外面、或者按 Esc 就收起 */
  function closeOnOutside() {
    document.addEventListener('click', function (e) {
      if (!isMobile() || !isOpen()) return;
      var t = e.target;
      if (t && t.closest && (t.closest('.sidebar') || t.closest('#sidebarToggle'))) return;
      setSidebar(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isMobile() && isOpen()) setSidebar(false);
    });
  }

  function addToggle() {
    var bar = document.getElementById('site-nav');
    if (!bar || document.getElementById('sidebarToggle')) return;
    var wrap = bar.querySelector('.nav-right');
    if (!wrap) return;
    var btn = Dom.el('button', {
      id: 'sidebarToggle', class: 'nav-btn', type: 'button',
      'aria-label': L.labels.toggle, title: L.labels.toggle,
      on: { click: function () { setSidebar(sidebar.classList.contains('is-hidden')); } }
    }, [Dom.icon('tree', { size: 18 })]);
    wrap.insertBefore(btn, wrap.firstChild);
  }

  /* ------------------------------ 启动 ----------------------------------- */
  document.title = String(C.site.titleTemplate || '{title}')
    .replace('{title}', C.pages.post.title).replace('{site}', C.site.name || '');
  Nav.render();
  addToggle();
  document.addEventListener('nav:rendered', addToggle);   // 顶栏被重建（跨断点重排）后把按钮插回来

  Widgets.mountSidebar(sidebarInner, scroller);
  addCloseBtn();
  closeOnOutside();
  setSidebar(sidebarDefault());

  Article.render(root, articlePath()).then(function () {
    var node = Article.node();
    if (node) {
      document.title = String(C.site.titleTemplate || '{title}')
        .replace('{title}', node.title).replace('{site}', C.site.name || '');
    }
  });

  // 手机上滚动 / 地址栏变化也会触发 resize，所以只在「宽屏 → 手机」这一刻收起
  var wasMobile = isMobile();
  window.addEventListener('resize', Dom.debounce(function () {
    var now = isMobile();
    if (now && !wasMobile) setSidebar(false);
    wasMobile = now;
  }, 200));

  document.addEventListener('navtree:jump', function () {
    if (isMobile()) setSidebar(false);
  });
})();
