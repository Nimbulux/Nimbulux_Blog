/* =============================================================================
 * article.js —— 文章正文渲染
 * 数据：Posts 节点 + <posts.root>/<路径>/page.md | page.enc
 * 产出：正文 HTML、标题大纲数据、阅读进度。
 * 用自定义事件通知右侧功能区：article:rendered / article:heading /
 * article:progress / article:cleared
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;
  var A = C.article || {};

  var state = {
    node: null, refs: [], tree: [], active: null, progress: -1,
    prose: null, scroller: null, onScroll: null, onResize: null
  };

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  /* ---------------------------- 读取正文 --------------------------------- */
  function readContent(node, onWork) {
    var url = Posts.pageUrl(node);
    if (!node.encrypted) {
      return Dom.fetchText(url).then(function (text) {
        if (text == null) throw new Error('读不到 ' + url);
        return { text: text, url: url };
      });
    }
    // 加密文章：解密器在文章页自己的目录里（pages/post/crypto.js）
    // 传 path 只是当内存缓存的键：同一个页面里不重复弹框，但不会写进任何存储
    // 传 onWork：等用户输完密码、真正开始解密时才让页面出加载态
    return window.Decrypt.ready(url, node.path, onWork).then(function (text) { return { text: text, url: url }; });
  }

  /* ------------------------------ 片段 ----------------------------------- */
  function meta(text, iconName) {
    return Dom.el('span', { class: 'm' }, [Dom.icon(iconName), Dom.el('span', { text: text })]);
  }

  function headerEl(node) {
    var H = A.header || {};
    var box = Dom.el('header', { class: 'article-head' }, [
      Dom.el('h1', { class: 'article-title', text: node.title })
    ]);
    var row = Dom.el('div', { class: 'article-meta' });
    if (H.showDate !== false && node.date) row.appendChild(meta(Dom.formatDate(node.date), 'calendar'));
    if (H.showUpdated !== false && node.updated && Dom.formatDate(node.updated) !== Dom.formatDate(node.date)) {
      row.appendChild(meta(String(A.updatedText || '{date}').replace('{date}', Dom.formatDate(node.updated)), 'pen'));
    }
    if (H.showReadingTime !== false) {
      row.appendChild(meta(String(A.readingTimeText || '{n}').replace('{n}', node.readingTime || 1), 'clock'));
    }
    box.appendChild(row);
    if (H.showTags !== false && node.tags.length) {
      var tags = Dom.el('div', { class: 'article-tags' });
      node.tags.forEach(function (t) { tags.appendChild(Dom.el('span', { class: 'tag', text: t })); });
      box.appendChild(tags);
    }
    return box;
  }

  function prevNextEl(node) {
    var PN = A.prevNext || {};
    if (PN.enabled === false) return null;
    // 默认只在同一个文件夹里排（一本小说一个序列）；PN.scope = 'all' 才整站串成一条
    // 目录树是「新的在前」，所以这里翻一下，按阅读顺序来：上一篇 = 更早的，下一篇 = 更晚的
    // PN.order = 'index' 时按索引里的原始次序，不再翻
    var list = (PN.scope === 'all') ? Posts.all() : Posts.siblings(node, PN.order === 'index');
    if (PN.order !== 'index') list = list.slice().reverse();
    var i = list.indexOf(node);
    var prev = i > 0 ? list[i - 1] : null;
    var next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;

    function card(item, label, dir, href) {
      var box = Dom.el(href ? 'a' : 'div', {
        class: 'pn-card' + (dir === 'next' ? ' is-next' : '') + (item ? '' : ' is-empty'),
        href: href
      }, [
        Dom.el('span', { class: 'pn-label' }, [
          dir === 'prev' ? Dom.icon('arrowLeft') : null,
          Dom.el('span', { text: label }),
          dir === 'next' ? Dom.icon('arrowRight') : null
        ]),
        Dom.el('span', { class: 'pn-title', text: item ? item.title : (PN.emptyText || '') })
      ]);
      return box;
    }

    return Dom.el('nav', { class: 'prev-next' }, [
      card(prev, PN.prevLabel || '', 'prev', prev ? Posts.href(prev) : null),
      card(next, PN.nextLabel || '', 'next', next ? Posts.href(next) : null)
    ]);
  }

  /** 提示条：config.article.notices.top / .bottom 各一条，type = info | tip | warn */
  function noticeEl(cfg) {
    if (!cfg || !cfg.enabled) return null;
    var type = cfg.type || 'info';
    var iconName = type === 'warn' ? 'noticeWarn' : type === 'tip' ? 'noticeTip' : 'noticeInfo';
    return Dom.el('div', { class: 'notice is-' + type }, [
      Dom.icon(iconName),
      Dom.el('div', { class: 'grow' }, [
        cfg.title ? Dom.el('div', { class: 'notice-title', text: cfg.title }) : null,
        cfg.text ? Dom.el('div', { class: 'notice-text', text: cfg.text }) : null
      ])
    ]);
  }

  /* ---------------------------- 标题大纲 --------------------------------- */
  function scanHeadings(prose) {
    var flat = [], stack = [], used = {};
    Array.prototype.forEach.call(prose.querySelectorAll('h1,h2,h3,h4,h5,h6'), function (el) {
      var level = parseInt(el.tagName.charAt(1), 10);
      if (level < 2) return;
      var id = 'h' + (flat.length + 1) + '-' + (el.textContent || '').trim().toLowerCase()
        .replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '').slice(0, 40);
      if (used[id]) id += '-' + (used[id]++); else used[id] = 1;
      el.id = id;
      var node = { id: id, text: (el.textContent || '').trim(), level: level, el: el, children: [], parent: null, absTop: 0, index: flat.length };
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      if (stack.length) { node.parent = stack[stack.length - 1]; node.parent.children.push(node); }
      stack.push(node);
      flat.push(node);
    });
    state.refs = flat;
    state.tree = flat.filter(function (n) { return !n.parent; });
    return flat;
  }

  function measure() {
    if (!state.scroller) return;
    var boxTop = state.scroller.getBoundingClientRect().top;
    var base = state.scroller.scrollTop;
    state.refs.forEach(function (n) { n.absTop = n.el.getBoundingClientRect().top - boxTop + base; });
  }

  function updateActive() {
    if (!state.scroller) return;
    if (state.refs.length) {
      var line = state.scroller.scrollTop + 88;
      var active = state.refs[0];
      for (var i = 0; i < state.refs.length; i++) {
        if (state.refs[i].absTop <= line) active = state.refs[i]; else break;
      }
      if (!state.active || state.active.id !== active.id) {
        state.active = active;
        emit('article:heading', { node: active, refs: state.refs });
      }
    }
    updateProgress();
  }

  function updateProgress() {
    if (!state.scroller) return;
    var max = state.scroller.scrollHeight - state.scroller.clientHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, state.scroller.scrollTop / max)) : 0;
    if (Math.abs(p - state.progress) < 0.002) return;
    state.progress = p;
    var bar = document.getElementById('readProgressBar');
    if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    emit('article:progress', { progress: p });
  }

  function bindScroll() {
    unbindScroll();
    state.onScroll = function () { updateActive(); };
    state.scroller.addEventListener('scroll', state.onScroll, { passive: true });
    state.onResize = Dom.debounce(function () { measure(); updateActive(); }, 180);
    window.addEventListener('resize', state.onResize);
  }

  function unbindScroll() {
    if (state.onScroll && state.scroller) state.scroller.removeEventListener('scroll', state.onScroll);
    if (state.onResize) window.removeEventListener('resize', state.onResize);
    state.onScroll = state.onResize = null;
  }

  /* ---------------------------- 跳转提示 --------------------------------- */
  function flash(el) {
    if (!el) return;
    var ms = (C.navTree || {}).flashMs || 1400;
    el.classList.remove('jump-flash');
    void el.offsetWidth;
    el.style.setProperty('--flash-ms', ms + 'ms');
    el.classList.add('jump-flash');
    clearTimeout(el.__flash);
    el.__flash = setTimeout(function () { el.classList.remove('jump-flash'); }, ms + 60);
  }

  function scrollToId(id) {
    var node = null;
    for (var i = 0; i < state.refs.length; i++) if (state.refs[i].id === id) node = state.refs[i];
    if (!node || !state.scroller) return;
    state.scroller.scrollTo({ top: Math.max(0, node.absTop - 88), behavior: Dom.reducedMotion() ? 'auto' : 'smooth' });
    flash(node.el);
    emit('navtree:jump', { id: id });
  }

  /* ------------------------------ 渲染 ----------------------------------- */
  function mountProgressBar() {
    var wrap = state.scroller && state.scroller.parentNode;
    if (!wrap) return;
    var old = wrap.querySelector('.read-progress');
    if (old) old.remove();
    wrap.appendChild(Dom.el('div', { class: 'read-progress' }, [Dom.el('span', { id: 'readProgressBar' })]));
  }

  /**
   * @param {Element} host #viewRoot
   * @param {string} path  文章路径（相对 posts.root）
   */
  function render(host, path) {
    unbindScroll();
    state.node = null;
    state.refs = [];
    state.tree = [];
    state.active = null;
    state.progress = -1;
    state.prose = null;
    state.scroller = document.getElementById('contentScroll');

    Dom.clear(host);
    mountProgressBar();
    emit('article:cleared', {});

    return Posts.load().then(function () {
      var node = Posts.get(path) || Posts.all()[0];
      if (!node || !node.hasPage) {
        var idxErr = Posts.error ? Posts.error() : '';
        host.appendChild(Dom.el('div', { class: 'empty-state' }, [
          Dom.el('div', { text: idxErr ? (A.indexErrorTitle || A.missingTitle || '') : (A.missingTitle || '') }),
          idxErr ? Dom.el('div', { class: 'muted', text: idxErr }) : (path ? Dom.el('div', { class: 'muted', text: path }) : null),
          idxErr ? Dom.el('div', { class: 'muted', text: A.indexErrorTip || '' }) : null,
          Dom.el('div', { style: 'margin-top:14px' }, [
            Dom.el('a', { class: 'pill', href: ((C.pages || {}).home || {}).url || '../', text: A.backText || '' })
          ])
        ]));
        return false;
      }

      state.node = node;
      document.title = String((C.site || {}).titleTemplate || '{title}')
        .replace('{title}', node.title).replace('{site}', (C.site || {}).name || '');

      host.appendChild(headerEl(node));
      var topNotice = noticeEl((A.notices || {}).top);      // 正文前面的提示（config.article.notices.top）
      if (topNotice) host.appendChild(topNotice);
      var holder = Dom.el('div', { class: 'prose' });
      host.appendChild(holder);
      // 本地加载通常几毫秒就好了，立刻插占位条只会闪一下；超过 loadingDelay 还没好才显示
      var skeleton = Dom.el('div', { class: 'loading-block' }, [
        Dom.el('div', { class: 'skeleton lg' }), Dom.el('div', { class: 'skeleton md' })
      ]);
      var skeletonTimer = null;
      function laterSkeleton(delay) {
        clearTimeout(skeletonTimer);
        skeletonTimer = setTimeout(function () {
          holder.classList.add('is-loading');       // 占位条绝对定位盖住，正文进来时不会顶一下
          holder.appendChild(skeleton);
        }, delay);
      }
      // 加密文章：等密码输完、开始解密时再出加载态（对着密码框一直闪很烦）
      if (!node.encrypted) laterSkeleton(A.loadingDelay == null ? 400 : A.loadingDelay);
      emit('article:loading', { node: node });

      // marked 先拉起来，和正文并行下载，别串行等
      if (A.markdown !== false) Markdown.ready();

      return readContent(node, function () { laterSkeleton(0); }).then(function (res) {
        return Markdown.ready().then(function () {
          clearTimeout(skeletonTimer);
          // 占位条已经在显示的话淡出，不做硬切（硬切看着就是“闪一下”）
          if (skeleton.parentNode) {
            skeleton.classList.add('is-hiding');
            setTimeout(function () {
              if (skeleton.parentNode) skeleton.parentNode.removeChild(skeleton);
              holder.classList.remove('is-loading');     // 淡出完再解除绝对定位
            }, 180);
          } else {
            Dom.clear(holder);
          }
          Markdown.render(holder, res.text);
          state.prose = holder;

          var bottom = noticeEl((A.notices || {}).bottom);
          if (bottom) host.appendChild(bottom);
          var pn = prevNextEl(node);
          if (pn) host.appendChild(pn);

          scanHeadings(holder);
          measure();
          if (state.scroller) state.scroller.scrollTop = 0;
          measure();
          bindScroll();
          emit('article:rendered', { node: node, refs: state.refs, tree: state.tree, hasHeadings: state.refs.length > 0 });
          updateActive();
          return true;
        });
      }).catch(function (err) {
        clearTimeout(skeletonTimer);
        Dom.clear(holder);
        holder.appendChild(Dom.el('div', { class: 'notice is-warn' }, [
          Dom.icon('noticeWarn'),
          Dom.el('div', { class: 'grow' }, [
            Dom.el('div', { class: 'notice-title', text: A.errorTitle || '' }),
            A.errorTip ? Dom.el('div', { class: 'notice-text', text: A.errorTip }) : null
          ])
        ]));
        console.warn('[article] 正文渲染失败 ' + Posts.pageUrl(node) + '（' + ((err && err.message) || err) + '）');
        return false;
      });
    });
  }

  window.Article = {
    render: render,
    scrollToId: scrollToId,
    refs: function () { return state.refs; },
    active: function () { return state.active; },
    progress: function () { return state.progress < 0 ? 0 : state.progress; },
    node: function () { return state.node; },
    remeasure: function () { measure(); updateActive(); }
  };
})();
