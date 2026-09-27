/* ============================================================
 * theme-init.js —— 首帧亮暗
 * 放在 <head> 里、样式表之前执行，避免闪白。
 * 手动选过主题后 manualTtl 毫秒内不再跟随系统（0 = 永久记住）。
 * ============================================================ */
(function () {
  'use strict';

  var cfg = (window.BLOG_CONFIG || {}).theme || {};
  var KEY = (cfg.storagePrefix || 'blog') + ':mode';
  var TS = (cfg.storagePrefix || 'blog') + ':mode-ts';
  var TTL = cfg.manualTtl == null ? 600000 : cfg.manualTtl;

  function manual() {
    try {
      var m = localStorage.getItem(KEY);
      if (m !== 'light' && m !== 'dark') return null;
      if (!TTL) return m;
      var ts = Number(localStorage.getItem(TS) || 0);
      return (Date.now() - ts < TTL) ? m : null;
    } catch (e) { return null; }
  }

  function system() {
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }

  function set(theme) { document.documentElement.setAttribute('data-theme', theme); }

  try {
    set(manual() || system());
    if (window.matchMedia) {
      var mql = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () { if (!manual()) set(system()); };
      if (mql.addEventListener) mql.addEventListener('change', onChange);
      else if (mql.addListener) mql.addListener(onChange);
    }
  } catch (e) {
    set('light');
  }
})();
