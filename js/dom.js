/* =============================================================================
 * dom.js —— 小工具
 * 只放真正被多处用到的函数：建节点、取 JSON、转义、日期。
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'on') Object.keys(v).forEach(function (evt) { node.addEventListener(evt, v[evt]); });
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = String(v[d]); });
        else node.setAttribute(k, v);
      });
    }
    if (children != null) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c == null || c === false) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** 取 JSON：失败只 warn，返回 null（页面自己显示空状态） */
  function fetchJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).catch(function (err) {
      console.warn('[dom] 读不到 ' + url + '（' + (err && err.message || err) + '）');
      return null;
    });
  }

  /** 取文本：失败同样只 warn */
  function fetchText(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).catch(function (err) {
      console.warn('[dom] 读不到 ' + url + '（' + (err && err.message || err) + '）');
      return null;
    });
  }

  /** 按需加载脚本，加载过就不再重复 */
  var loaded = {};
  function loadScript(src) {
    var href = new URL(src, document.baseURI).href;
    if (loaded[href]) return loaded[href];
    loaded[href] = new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = href;
      s.onload = function () { resolve(true); };
      s.onerror = function () { console.warn('[dom] 脚本加载失败 ' + href); resolve(false); };
      document.head.appendChild(s);
    });
    return loaded[href];
  }

  /** 等一个全局对象就位，没有就按需加载它的脚本 */
  function need(globalName, src) {
    if (window[globalName]) return Promise.resolve(true);
    return loadScript(src).then(function (ok) {
      if (window[globalName]) return true;
      if (!ok) return false;
      return new Promise(function (resolve) {
        var waited = 0;
        var t = setInterval(function () {
          waited += 40;
          if (window[globalName] || waited > 4000) { clearInterval(t); resolve(!!window[globalName]); }
        }, 40);
      });
    });
  }

  /** 图标：<span class="icon"><svg><use href="#i-name"/></svg></span> */
  function icon(name, opt) {
    opt = opt || {};
    var wrap = el('span', { class: 'icon' + (opt.cls ? ' ' + opt.cls : '') });
    var svg = window.Icons && window.Icons.svg(name, opt);
    if (svg) wrap.appendChild(svg);
    else wrap.classList.add('icon-missing');
    return wrap;
  }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      var self = this, a = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, wait);
    };
  }

  function formatDate(input) {
    if (!input) return '';
    var d = new Date(String(input).replace(/-/g, '/'));
    if (isNaN(d.getTime())) return String(input);
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function reducedMotion() {
    var cfg = (C.advanced || {}).reducedMotion;
    if (cfg === true) return true;
    if (cfg === false) return false;
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function log() {
    if ((C.advanced || {}).debug === false) return;
    console.log.apply(console, ['%c[blog]', 'color:#5b8def'].concat(Array.prototype.slice.call(arguments)));
  }

  window.Dom = {
    el: el, qs: qs, clear: clear, esc: esc, icon: icon,
    fetchJSON: fetchJSON, fetchText: fetchText,
    loadScript: loadScript, need: need, debounce: debounce,
    formatDate: formatDate, reducedMotion: reducedMotion, log: log
  };
})();
