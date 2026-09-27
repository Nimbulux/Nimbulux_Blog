/* =============================================================================
 * icons.js —— 图标调用
 * 图形本体是 assets/icons/*.svg 的独立文件；_makepages.js 构建时把它们内联成
 * 页面顶部的 <svg class="icon-sprite"> 符号表，所以离线 file:// 也能用，且
 * 运行时零请求。这里只负责生成 <svg><use href="#i-name"/></svg>。
 * ========================================================================== */
(function () {
  'use strict';

  var PREFIX = 'i-';
  var NS = 'http://www.w3.org/2000/svg';

  function symbol(id) { return document.getElementById(PREFIX + id); }

  function svgEl(name, opt) {
    opt = opt || {};
    var sym = symbol(name);
    if (!sym) return null;

    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', sym.getAttribute('viewBox') || '0 0 24 24');
    // 统一 fill=none：实际填充由各 <path> 自带（描边型继承 currentColor）
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    if (opt.size) {
      svg.style.width = opt.size + 'px';
      svg.style.height = opt.size + 'px';
    }
    var use = document.createElementNS(NS, 'use');
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + PREFIX + name);
    use.setAttribute('href', '#' + PREFIX + name);
    svg.appendChild(use);
    return svg;
  }

  window.Icons = {
    has: function (name) { return !!symbol(name); },
    svg: svgEl,
    /** 当前页面符号表里有哪些图标 */
    names: function () {
      return Array.prototype.slice.call(document.querySelectorAll('.icon-sprite symbol'))
        .map(function (s) { return s.id.replace(PREFIX, ''); })
        .sort();
    }
  };
})();
