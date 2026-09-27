/* =============================================================================
 * markdown.js —— 正文渲染
 * 依赖 vendor/marked（按需加载）；代码高亮用 vendor/highlight（可选）；
 * 输出先过 DOMPurify（放了 vendor/dompurify 就自动生效）。
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;
  var V = C.vendor || {};
  var A = C.article || {};

  var SRC = { marked: 'marked', DOMPurify: 'dompurify', hljs: 'highlight' };

  function ensure(globalName) {
    var src = V[SRC[globalName]];
    if (!src) return Promise.resolve(!!window[globalName]);
    return Dom.need(globalName, src);
  }

  function highlight(code, lang) {
    if (!window.hljs || A.highlight === false) return Dom.esc(code);
    try {
      if (!lang) return window.hljs.highlightAuto(code).value;               // 没标语言就自动猜
      if (window.hljs.getLanguage && !window.hljs.getLanguage(lang)) return window.hljs.highlightAuto(code).value;
      return window.hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    } catch (e) {
      return Dom.esc(code);
    }
  }

  function codeBlock(code, lang) {
    return '<div class="code-block">' +
      (lang ? '<span class="code-lang">' + Dom.esc(lang) + '</span>' : '') +
      '<button class="code-copy" type="button" title="' + Dom.esc((A.labels || {}).copy || '') + '"></button>' +
      '<pre><code class="hljs' + (lang ? ' language-' + Dom.esc(lang) : '') + '">' + highlight(code, lang) + '</code></pre></div>';
  }

  function setup() {
    if (!window.marked || setup.done) return;
    setup.done = true;
    window.marked.use({
      gfm: true,
      breaks: false,
      renderer: {
        heading: function (token) {
          var text = this.parser ? this.parser.parseInline(token.tokens) : token.text;
          return '<h' + token.depth + '>' + text + '</h' + token.depth + '>\n';
        },
        code: function (token) {
          return codeBlock(token.text, String(token.lang || '').trim().split(/\s+/)[0]);
        }
      }
    });
  }

  function toHTML(md) {
    if (!window.marked) return '<p class="empty-state">缺少 vendor/marked/marked.min.js，正文无法渲染。</p>';
    var html;
    try { html = window.marked.parse(md || ''); }
    catch (e) { return '<p class="empty-state">Markdown 解析失败：' + Dom.esc(e && e.message) + '</p>'; }
    var pure = window.DOMPurify;
    return (pure && typeof pure.sanitize === 'function') ? pure.sanitize(html) : html;
  }

  /** 渲染进一个 .prose 容器：补表格横滚 + 代码复制 */
  function render(host, md) {
    host.innerHTML = toHTML(md);
    Array.prototype.forEach.call(host.querySelectorAll('table'), function (t) {
      if (t.parentNode && !t.parentNode.classList.contains('table-wrap')) {
        var w = Dom.el('div', { class: 'table-wrap' });
        t.parentNode.insertBefore(w, t);
        w.appendChild(t);
      }
    });
    // 复制按钮里的图标用 DOM 节点插进去（不再拼 HTML 字符串，避免序列化把 <use> 弄丢）
    Array.prototype.forEach.call(host.querySelectorAll('.code-copy'), function (btn) {
      var icon = (window.Icons && Icons.has('copy')) ? Dom.icon('copy', { size: 13 }) : null;
      if (icon) btn.appendChild(icon);
      else btn.textContent = (A.labels || {}).copy || '';      // 符号表里没有就退回文字，别留个空按钮
      btn.addEventListener('click', function () { copy(btn); });
    });
  }

  function copy(btn) {
    var code = btn.parentNode.querySelector('code');
    var text = code ? code.textContent : '';
    var done = function () {
      btn.classList.add('is-copied');
      setTimeout(function () { btn.classList.remove('is-copied'); }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text, done); });
    } else {
      legacyCopy(text, done);
    }
  }

  function legacyCopy(text, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    } catch (e) { console.warn('[markdown] 复制失败', e); }
    done();
  }

  /**
   * 高亮是后台加载的：到货之后把「已经渲染出来但还没高亮」的代码块补一遍。
   * 不然第一次渲染正好赶在高亮库到货之前，代码块就一直是白底黑字（看着像高亮丢了）。
   */
  function upgrade(host) {
    if (!window.hljs || A.highlight === false) return 0;
    var root = host || document;
    var blocks = root.querySelectorAll('.prose pre > code.hljs');
    var n = 0;
    Array.prototype.forEach.call(blocks, function (el) {
      if (el.__hl) return;
      var lang = (/(?:^|\s)language-([\w+#.-]+)/.exec(String(el.className || '')) || [])[1] || '';
      el.innerHTML = highlight(el.textContent || '', lang);
      el.__hl = true;
      n++;
    });
    return n;
  }

  /** 页面入口：只等 marked（必需）；高亮与清洗能在就用，不影响渲染时机 */
  function ready() {
    // 高亮与清洗后台加载；到货后换主题样式，并把已经画出来的代码块补上高亮
    Promise.all([ensure('DOMPurify'), ensure('hljs')]).then(function () {
      if (window.hljs) {
        Theme.loadStyles();
        if (upgrade()) Dom.log('代码高亮补齐');
      }
    });
    return ensure('marked').then(function (ok) {
      if (ok) setup();
      return ok;
    });
  }

  window.Markdown = { ready: ready, render: render, toHTML: toHTML, upgrade: upgrade };
})();
