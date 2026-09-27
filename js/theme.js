/* =============================================================================
 * theme.js —— 主题
 * 一个色相滑块 + 饱和度（配置项）推导出全部颜色 token；亮 / 暗 / 自动三种模式。
 * 首帧的亮暗由各页面 <head> 里的 theme-init.js 决定，避免闪白。
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;
  var T = C.theme || {};
  var KEY = T.storagePrefix || 'blog';
  var MODES = ['light', 'dark', 'auto'];
  var root = document.documentElement;
  var listeners = [];

  function read(k) { try { return localStorage.getItem(KEY + ':' + k); } catch (e) { return null; } }
  function write(k, v) { try { localStorage.setItem(KEY + ':' + k, String(v)); } catch (e) {} }
  function num(v, dflt, min, max) {
    var n = parseFloat(v);
    if (isNaN(n)) n = dflt;
    return Math.min(max, Math.max(min, n));
  }
  function round(n) { return Math.round(n * 100) / 100; }
  function hsl(h, s, l) { return 'hsl(' + round(h) + ' ' + round(s) + '% ' + round(l) + '%)'; }
  function hsla(h, s, l, a) { return 'hsla(' + round(h) + ',' + round(s) + '%,' + round(l) + '%,' + a + ')'; }

  function systemMode() {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }

  var state = {
    hue: num(read('hue'), T.defaultHue == null ? 214 : T.defaultHue, 0, 360),
    sat: num(read('sat'), T.defaultSaturation == null ? 56 : T.defaultSaturation, 0, 100),
    mode: MODES.indexOf(read('mode')) >= 0 ? read('mode') : (MODES.indexOf(T.defaultMode) >= 0 ? T.defaultMode : 'auto')
  };
  var resolved = state.mode === 'auto' ? systemMode() : state.mode;

  // 驼峰 → 连字符：codeBg → code-bg；名字里带数字也要断开（surface2 → surface-2，
  // 不然 CSS 里写的 var(--surface-2) 永远匹配不上，只能吃 :root 里的兜底值）
  function kebab(s) {
    return String(s).replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); })
      .replace(/([a-z])(\d)/g, '$1-$2');
  }

  /**
   * 一份颜色配方 → 最终颜色字符串。所有 token 都是这么算出来的，所以色相一动全站颜色跟着动。
   *   { l: 97, s: 20, dh: 6 }        → hsl(主题色相 + 6, 20%, 97%)
   *   { h: 152, s: 42, l: 38 }       → hsl(152, 42%, 38%)，写死色相（语义色用）
   *   { l: 11.8, s: 26, dh: 4, a: .05 } → hsla(..., .05)
   *   直接写字符串（'#fff' / 'rgba(...)'）也认，原样输出，方便个别地方不跟主题走。
   */
  function color(spec) {
    if (spec == null) return null;
    if (typeof spec === 'string') return spec;
    var h = spec.h != null ? spec.h : state.hue + (spec.dh || 0);
    var s = spec.s == null ? 0 : spec.s;
    var l = spec.l == null ? 50 : spec.l;
    return spec.a == null ? hsl(h, s, l) : hsla(h, s, l, spec.a);
  }

  function build() {
    var dark = resolved === 'dark';
    var tk = (T.tokens || {})[dark ? 'dark' : 'light'] || {};
    var b = (T.brand || {})[dark ? 'dark' : 'light'] || {};
    var off = b.satOffset || [0, 0, 0, 0, 0];
    var light = b.light || [97, 93, 86, 54, 44];
    var v = {};

    for (var i = 0; i < 5; i++) {
      v['--brand-' + (i + 1)] = hsl(state.hue, Math.min(100, state.sat + (off[i] || 0)), light[i]);
    }
    v['--brand'] = v['--brand-4'];
    v['--brand-ink'] = dark ? hsl(state.hue, b.inkSat || 26, b.inkLight || 10) : (b.ink || '#fff');

    // 底色 / 文字 / 边框 / 代码块 …… 全部按配方算，色相 + 偏移
    Object.keys(tk).forEach(function (k) {
      if (k === 'state') return;
      var c = color(tk[k]);
      if (c != null) v['--' + kebab(k)] = c;
    });
    var st = tk.state || {};
    v['--ok'] = color(st.ok || { h: 152, s: 42, l: 38 });
    v['--warn'] = color(st.warn || { h: 38, s: 68, l: 42 });
    v['--danger'] = color(st.danger || { h: 2, s: 58, l: 48 });

    v['--link'] = v['--brand-5'];
    v['--link-hover'] = v['--brand-4'];
    v['--topbar-bg'] = color(tk.bgBlur) || v['--bg'];
    v['--shadow-1'] = dark ? '0 1px 2px hsla(' + state.hue + ',30%,2%,.5)' : '0 1px 2px hsla(' + state.hue + ',30%,30%,.06)';
    v['--shadow-2'] = dark ? '0 6px 20px hsla(' + state.hue + ',30%,2%,.55)' : '0 6px 20px hsla(' + state.hue + ',30%,30%,.1)';
    v['--glow'] = hsla(state.hue, Math.min(100, state.sat + 10), dark ? 60 : 52, dark ? 0.5 : 0.34);
    v['--flash-bg'] = dark ? hsla(state.hue, Math.min(100, state.sat + 6), 62, 0.16) : hsla(state.hue, state.sat, 54, 0.12);
    v['--flash-line'] = dark ? hsla(state.hue, Math.min(100, state.sat + 6), 68, 0.55) : hsla(state.hue, state.sat, 54, 0.45);
    v['--hue-track'] = T.slider === 'brand'
      ? 'linear-gradient(90deg,' + hsl(state.hue, 6, 88) + ',' + hsl(state.hue, 92, 52) + ')'
      : 'linear-gradient(90deg,hsl(0 72% 62%),hsl(45 72% 60%),hsl(90 58% 56%),hsl(150 58% 52%),hsl(200 68% 58%),hsl(250 62% 64%),hsl(300 60% 64%),hsl(360 72% 62%))';

    var S = C.layout || {};
    v['--container'] = S.container;
    // 整页宽度：顶栏 / 正文 / 侧栏 / 页脚共用这一条线，宽屏也不会把文章拉成一行一千多像素
    v['--page-w'] = S.fullWidth === false ? (S.container || '860px') : (S.maxWidth || '100%');
    v['--article-pad'] = S.articlePadding;
    v['--tree-step'] = S.treeIndent;
    v['--topbar-h'] = S.topbarHeight;
    v['--gap'] = S.gap;
    v['--sidebar-w'] = S.sidebarWidth;
    v['--mobile-panel-w'] = S.mobilePanelWidth;
    v['--radius'] = S.radius;

    Object.keys(v).forEach(function (k) { if (v[k] != null) root.style.setProperty(k, String(v[k])); });
  }

  function syncSheets() {
    var a = document.getElementById('hljs-theme-light');
    var b = document.getElementById('hljs-theme-dark');
    var dark = resolved === 'dark';
    if (a) a.media = dark ? 'not all' : 'all';
    if (b) b.media = dark ? 'all' : 'not all';
  }

  function apply(persist) {
    resolved = state.mode === 'auto' ? systemMode() : state.mode;
    root.setAttribute('data-theme', resolved);
    root.setAttribute('data-mode', state.mode);
    build();
    syncSheets();
    var meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? 'dark light' : 'light dark');
    if (persist !== false) {
      write('hue', Math.round(state.hue));
      write('sat', Math.round(state.sat));
      write('mode', state.mode);
    }
    var snap = get();
    listeners.forEach(function (fn) { try { fn(snap); } catch (e) { console.error('[theme]', e); } });
  }

  function get() {
    return { hue: state.hue, saturation: state.sat, mode: state.mode, resolved: resolved };
  }

  /** 高亮样式表按需注入：文件不存在也不会有 404 噪音 */
  var sheets = false;
  function loadStyles() {
    if (sheets) return;
    sheets = true;
    var V = C.vendor || {};
    link(V.highlightLight, 'hljs-theme-light', true);
    link(V.highlightDark, 'hljs-theme-dark', false);
    syncSheets();          // 可能已经是暗色了，刚插进来的样式表要按当前模式切一遍
  }
  function link(href, id, active) {
    if (!href || document.getElementById(id)) return;
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.id = id;
    if (!active) l.media = 'not all';
    l.onerror = function () { if (l.parentNode) l.parentNode.removeChild(l); };
    document.head.appendChild(l);
  }

  try {
    var mql = window.matchMedia('(prefers-color-scheme: dark)');
    var onSys = function () { if (state.mode === 'auto') apply(true); };
    if (mql.addEventListener) mql.addEventListener('change', onSys);
    else if (mql.addListener) mql.addListener(onSys);
  } catch (e) {}

  window.Theme = {
    get: get,
    apply: apply,
    resolved: function () { return resolved; },
    onChange: function (fn) { listeners.push(fn); },
    loadStyles: loadStyles,
    setHue: function (h) { state.hue = num(h, state.hue, 0, 360); apply(true); },
    setSat: function (s) { state.sat = num(s, state.sat, 0, 100); apply(true); },
    setMode: function (m) { if (MODES.indexOf(m) >= 0) { state.mode = m; apply(true); } },
    cycleMode: function () { window.Theme.setMode(MODES[(MODES.indexOf(state.mode) + 1) % MODES.length]); }
  };

  apply(false);
})();
