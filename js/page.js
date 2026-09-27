/* =============================================================================
 * page.js —— 页面里反复用到的几块 UI
 * 文章卡片 / 区块标题 / 页脚 / 页面正文（md）
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;

  function icon(name, cls) {
    var svg = window.Icons && Icons.svg(name);
    if (!svg) return null;
    if (cls) svg.setAttribute('class', cls);
    return svg;
  }

  /** 文章卡片：标题 +（精选标记）+ 摘要 + 日期 / 目录 / 标签 */
  function postCard(node) {
    var h = C.home || {};
    var card = Dom.el('a', { class: 'card post-card', href: Posts.href(node) }, [
      Dom.el('div', { class: 'pc-head' }, [
        Dom.el('span', { class: 'pc-title', text: node.title }),
        node.featured ? Dom.el('span', { class: 'pc-featured', text: h.featuredTitle || '精选' }) : null
      ])
    ]);
    if (h.showExcerpt !== false && node.excerpt) {
      card.appendChild(Dom.el('div', { class: 'pc-excerpt', text: node.excerpt }));
    }
    var meta = Dom.el('div', { class: 'pc-meta' });
    if (node.date) meta.appendChild(Dom.el('span', { text: Dom.formatDate(node.date) }));
    if (node.parent) meta.appendChild(Dom.el('span', { text: node.parent.title }));
    if (h.showTags !== false) node.tags.slice(0, 3).forEach(function (t) {
      meta.appendChild(Dom.el('span', { class: 'tag', text: t }));
    });
    if (node.encrypted && meta.children.length === 0) meta.appendChild(Dom.el('span', { text: '加密' }));
    card.appendChild(meta);
    return card;
  }

  function grid(nodes, columns) {
    var n = columns || 2;
    // data-cols 给窄屏用，--card-cols 给宽屏用，两边都跟着 config.home.cardColumns
    var box = Dom.el('div', { class: 'card-grid', dataset: { cols: String(n) }, style: '--card-cols:' + n });
    nodes.forEach(function (x) { box.appendChild(postCard(x)); });
    return box;
  }

  /** 区块标题：左边标题（可带搜索框），右边“更多 / 返回”链接 */
  function sectionTitle(text, opt) {
    opt = opt || {};
    var left = Dom.el('div', { class: 'title-left' }, [Dom.el('span', { text: text })]);
    if (opt.searchMount) left.appendChild(opt.searchMount);
    var row = Dom.el('div', { class: 'section-title' }, [left]);
    if (opt.link) row.appendChild(Dom.el('a', { class: 'more-link', href: opt.link.href, text: opt.link.text }));
    return row;
  }

  function empty(text) {
    return Dom.el('div', { class: 'empty-state', text: text });
  }

  /** 文章列表为空时的提示文案（索引挂了就把具体地址带出来，好排查） */
  function emptyPostsText() {
    var L = (C.posts || {}).labels || {};
    var err = Posts.error();
    return err ? ((L.emptyList || '') + '：' + err) : (L.empty || '');
  }

  function footer() {
    var F = C.footer || {};
    if (!F.enabled) return null;
    var box = Dom.el('footer', { class: 'site-footer' }, [
      Dom.el('span', { text: String(F.copyright || '').replace('{year}', String(new Date().getFullYear())) }),
      F.extra ? Dom.el('span', { text: F.extra }) : null
    ]);
    if ((F.links || []).length) {
      var links = Dom.el('span', { class: 'footer-links' });
      F.links.forEach(function (l) {
        links.appendChild(Dom.el('a', {
          href: l.url, text: l.label,
          target: /^https?:/.test(l.url) ? '_blank' : null,
          rel: 'noopener noreferrer'
        }));
      });
      box.appendChild(links);
    }
    return box;
  }

  function mountFooter(host) {
    var f = footer();
    if (f) host.appendChild(f);
  }

  /** 渲染 app/content 下的一个 md 文件 */
  /**
   * 一个页面可能的正文文件，按顺序探测：
   *   目录（以 / 结尾）→ 目录下的 readmeNames（README.md / readme.md …）
   *   数组 → 依次来
   *   普通路径 → 就是它
   * 最后再补一个 contentFallback：都没有就用它，简称“回落文件”。
   */
  function contentList(key) {
    var raw = (C.content || {})[key];
    var names = C.readmeNames || ['README.md', 'readme.md', 'README.MD'];
    var out = [];
    function add(p) {
      if (!p) return;
      if (/\/$/.test(p)) names.forEach(function (n) { out.push(p + n); });
      else out.push(p);
    }
    (Array.isArray(raw) ? raw : [raw]).forEach(add);
    var fb = (C.content || {}).fallback || C.contentFallback;
    if (fb) (Array.isArray(fb) ? fb : [fb]).forEach(add);
    return out.filter(function (p, i) { return out.indexOf(p) === i; });
  }

  var sources = {};                       // 每个页面最后用的是哪个文件（方便自检 / 排查）

  /** 依次探测，谁先读到就用谁；全读不到就在页面上列出试过哪些路径 */
  function content(key, host) {
    var list = contentList(key);
    if (!list.length) return Promise.resolve(false);
    return Markdown.ready().then(function () {
      var tryNext = function (i) {
        if (i >= list.length) {
          host.appendChild(empty((C.posts && C.posts.labels && C.posts.labels.emptyList) || '读不到内容文件：' + list.join(' / ')));
          return false;
        }
        return Dom.fetchText(list[i]).then(function (md) {
          if (md == null) return tryNext(i + 1);
          var prose = Dom.el('div', { class: 'prose' });
          Markdown.render(prose, md);
          host.appendChild(prose);
          sources[key] = list[i];
          Dom.log('正文来源 ' + key + '：' + list[i]);
          return true;
        });
      };
      return tryNext(0);
    });
  }

  window.Page = {
    icon: icon, postCard: postCard, grid: grid, sectionTitle: sectionTitle,
    empty: empty, emptyPostsText: emptyPostsText,
    footer: footer, mountFooter: mountFooter, content: content,
    contentList: contentList, contentSource: function (key) { return sources[key] || ''; }
  };
})();
