/* =============================================================================
 * nav.js —— 顶栏
 * 左边站点名（可换成 assets 里的图片），中间功能页，右边主题开关。
 * 顶栏在每个页面里都是一个空的 <header id="site-nav">，由这里填充。
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;
  var TB = C.topbar || {};
  var site = C.site || {};
  var L = TB.labels || {};
  var open = false;

  function pageOf(key) {
    var p = (C.pages || {})[key] || {};
    return p.url || '../';
  }

  /** 站点 logo：写文件名就取 assets.shared（外层公用），写 ../ 或 http 开头就原样用 */
  function logoUrl(file) {
    var f = String(file || '');
    if (!f) return '';
    if (/^(?:[a-z]+:)?\/\//i.test(f) || f.charAt(0) === '/' || f.slice(0, 2) === '..') return f;
    return ((C.assets && (C.assets.shared || C.assets.root)) || '../assets') + '/' + f;
  }

  /** 图标：config.assets.favicons 说了算，页面里的 <link> 只是没脚本时的兜底 */
  function icon_links() {
    var list = (C.assets && C.assets.favicons) || [];
    list.forEach(function (f) {
      if (!f || !f.file) return;
      var href = logoUrl(f.file);
      var old = document.querySelector('link[rel="icon"]');
      var link = old || Dom.el('link', { rel: 'icon' });
      link.setAttribute('href', href);
      if (f.type) link.setAttribute('type', f.type);
      if (!old && document.head) document.head.appendChild(link);
    });
  }

  function isCurrent(key) {
    var here = location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '');
    var href = new URL(pageOf(key), location.href).pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '');
    return here === href;
  }

  /** 站点 logo：能拿到 svg 源码就内联（只有内联时 currentColor 才跟着文字颜色走，暗色下不会看不见） */
  function inlineLogo(mark) {
    var file = (site.brand || {}).logo;
    if (!file) return;
    Dom.fetchText(logoUrl(file)).then(function (txt) {
      if (!txt || txt.indexOf('<svg') < 0 || !mark.parentNode) return;
      var box = Dom.el('span');
      box.innerHTML = txt;
      var svg = box.firstElementChild;
      if (!svg || String(svg.tagName).toLowerCase() !== 'svg') return;
      svg.setAttribute('class', 'nav-logo');
      svg.setAttribute('aria-hidden', 'true');
      mark.parentNode.replaceChild(svg, mark);
    });
  }

  function brand() {
    var b = site.brand || {};
    var initial = function () {
      return Dom.el('span', { class: 'nav-initial', text: String(site.name || 'B').charAt(0) });
    };
    var mark;
    if (b.logo) {
      mark = Dom.el('img', { class: 'nav-logo', src: logoUrl(b.logo), alt: '', loading: 'lazy' });
      // 图没取到就退回首字母色块，别在导航里留一个破图
      mark.addEventListener('error', function () {
        var span = initial();
        if (mark.parentNode) mark.parentNode.replaceChild(span, mark);
      });
      inlineLogo(mark);
    } else {
      mark = initial();
    }
    return Dom.el('a', { class: 'nav-brand', href: pageOf(C.defaultPage || 'home'), title: site.name || '' },
      [mark, Dom.el('span', { class: 'nav-name', text: site.name || '' })]);
  }

  function linkEl(item) {
    return Dom.el('a', {
      class: 'nav-link' + (isCurrent(item.key) ? ' is-active' : ''),
      href: pageOf(item.key),
      text: item.label
    });
  }

  function menu() {
    var box = Dom.el('nav', { class: 'nav-menu', 'aria-label': '主导航' });
    (TB.nav || []).forEach(function (item) { box.appendChild(linkEl(item)); });
    return box;
  }

  /** 窄屏时顶栏放不下：同一排导航变成一条能左右滑的轮盘 */
  function wheel() {
    var box = Dom.el('nav', { class: 'nav-wheel', 'aria-label': '主导航' });
    (TB.nav || []).forEach(function (item) { box.appendChild(linkEl(item)); });
    return box;
  }

  function navCollapsed() {
    var at = parseInt(TB.navCollapseAt, 10);
    if (!at) return false;
    try { return window.matchMedia('(max-width: ' + at + 'px)').matches; } catch (e) { return false; }
  }

  /* ---------------------------- 主题区 ----------------------------------- */
  var MODE_ICON = { light: 'sun', dark: 'moon', auto: 'auto' };

  function themeBox() {
    var box = Dom.el('div', { class: 'nav-theme' });

    var modeBtn = Dom.el('button', {
      class: 'nav-btn', type: 'button', 'aria-label': L.theme || '亮暗',
      on: { click: function () { Theme.cycleMode(); sync(); } }
    }, [icon('sun')]);

    var dot = Dom.el('span', { class: 'nav-dot' });
    var paletteBtn = Dom.el('button', {
      class: 'nav-btn', type: 'button', 'aria-label': L.palette || '主题色',
      on: { click: function () { toggle(); } }
    }, [icon('palette'), dot]);

    box.appendChild(modeBtn);
    box.appendChild(paletteBtn);
    box.appendChild(capsule());
    box.__modeBtn = modeBtn;
    box.__dot = dot;
    return box;
  }

  function icon(name, size) {
    var svg = window.Icons && Icons.svg(name, { size: size });
    if (svg) return svg;
    return Dom.el('span', { class: 'icon-missing' });
  }

  /** 一个小胶囊：色相滑条 + 预设色 + 关闭 */
  function capsule() {
    var T = C.theme || {};
    var box = Dom.el('div', { class: 'nav-capsule' });

    var thumb = Dom.el('span', { class: 'hue-thumb' });
    var range = Dom.el('input', { type: 'range', min: 0, max: 360, step: 1, value: Math.round(Theme.get().hue), 'aria-label': '色相' });
    range.addEventListener('input', function () { Theme.setHue(parseFloat(range.value)); });
    var slider = Dom.el('div', { class: 'hue-slider' }, [Dom.el('span', { class: 'hue-track' }), thumb, range]);

    var presets = Dom.el('div', { class: 'hue-presets' });
    (T.presets || []).forEach(function (h) {
      presets.appendChild(Dom.el('button', {
        class: 'hue-preset', type: 'button', title: String(h),
        style: 'background:hsl(' + h + ' ' + (T.presetSaturation || 62) + '% ' + (T.presetLightness || 58) + '%)',
        on: { click: function () { Theme.setHue(h); } }
      }));
    });

    var close = Dom.el('button', {
      class: 'nav-btn', type: 'button', 'aria-label': L.close || '收起',
      on: { click: function () { toggle(false); } }
    }, [icon('close', 16)]);

    box.appendChild(slider);
    box.appendChild(presets);
    box.appendChild(close);
    box.__range = range;
    box.__thumb = thumb;
    box.__presets = presets;
    return box;
  }

  function sync() {
    var t = Theme.get();
    var mode = t.mode;
    if (root) {
      var btn = root.querySelector('.nav-theme');
      if (btn && btn.__modeBtn) {
        Dom.clear(btn.__modeBtn);
        btn.__modeBtn.appendChild(icon(mode === 'auto' ? 'auto' : MODE_ICON[mode]));
        btn.__modeBtn.title = (L.theme || '亮暗') + '：' + mode;
      }
      if (btn && btn.__dot) btn.__dot.style.background = 'var(--brand-4)';
      var cap = root.querySelector('.nav-capsule');
      if (cap) {
        if (cap.__range) cap.__range.value = Math.round(t.hue);
        if (cap.__thumb) cap.__thumb.style.left = (t.hue / 360 * 100) + '%';
        if (cap.__presets) {
          Array.prototype.forEach.call(cap.__presets.children, function (b) {
            var h = parseFloat(b.title);
            b.classList.toggle('is-active', Math.abs(h - t.hue) < 1);
          });
        }
      }
    }
  }

  function toggle(force) {
    open = force === undefined ? !open : !!force;
    if (!root) return;
    var cap = root.querySelector('.nav-capsule');
    var btn = root.querySelector('.nav-theme .nav-btn:last-of-type');
    if (cap) cap.classList.toggle('is-open', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  var root = null, lastCollapsed = null;

  function render() {
    root = document.getElementById('site-nav');
    icon_links();
    if (!root) return;
    Dom.clear(root);

    var collapsed = navCollapsed();
    lastCollapsed = collapsed;
    document.body.classList.toggle('nav-collapsed', collapsed);

    var inner = Dom.el('div', { class: 'nav-inner container wide' }, [brand()]);
    var right = Dom.el('div', { class: 'nav-right' });
    // 窄屏：导航钻进功能区（文章页的右侧栏）最上面，变成一条左右滑的轮盘
    var slot = collapsed ? document.getElementById('sidebarInner') : null;
    var stale = document.querySelector('.nav-wheel');       // 重排时先把旧的收掉，别叠两条
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
    if (slot) {
      var wheelBox = wheel();
      wheelBox.classList.add('is-in-panel');
      slot.insertBefore(wheelBox, slot.firstChild);
    } else {
      right.appendChild(collapsed ? wheel() : menu());
    }
    right.appendChild(themeBox());
    inner.appendChild(right);
    root.appendChild(inner);
    document.addEventListener('click', function (e) {
      if (!open) return;
      if (e.target.closest && e.target.closest('.nav-theme')) return;
      toggle(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) toggle(false); });
    // 顶栏被重建了：让文章页把自己的「功能区」开关按钮再插回来
    document.dispatchEvent(new CustomEvent('nav:rendered', { detail: { collapsed: collapsed } }));

    if (!render.watch) {
      render.watch = true;
      window.addEventListener('resize', Dom.debounce(function () {
        if (navCollapsed() !== lastCollapsed) render();     // 只在跨断点时重排
      }, 200));
    }

    Theme.onChange(sync);
    sync();
  }

  window.Nav = { render: render, sync: sync, closeCapsule: function () { toggle(false); } };
})();
