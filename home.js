/* =============================================================================
 * home.js —— 主页
 * 内容 = app/content/home.md（config.content.home 指定，现在指向仓库根的 README）
 *      + 可选：精选文章卡片 + 最近更新卡片（config.home.showLists，默认关着）
 * 主页没有侧栏，就是一个标题 + 内容 + 卡片。
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;
  var H = C.home || {};
  var root = document.getElementById('viewRoot');

  function section(text) {
    return Page.sectionTitle(text);
  }

  function mount(nodes) {
    if (!nodes.length) return Page.empty(Page.emptyPostsText());
    return Page.grid(nodes, H.cardColumns || 2);
  }

  function render() {
    Dom.clear(root);

    if (H.intro !== false) {
      root.appendChild(Dom.el('div', { class: 'home-intro' }, [
        Dom.el('h1', { class: 'home-title', text: C.site.name || '' }),
        C.site.tagline ? Dom.el('p', { class: 'home-tagline', text: C.site.tagline }) : null
      ]));
    }
    // 正文是异步取 md 的，页脚必须等它渲染完再挂，否则页脚会跑到正文上面去
    var content = Page.content('home', root);

    // 只要正文就先结束，连文章索引都不用去读
    if (H.showLists === false) {
      content.then(function () { Page.mountFooter(root); });
      return;
    }

    content.then(Posts.load).then(function () {
      var featured = Posts.featured(H.featuredCount || 3);
      if (featured.length) {
        var box = Dom.el('section', { class: 'home-section' }, [section(H.featuredTitle || '精选')]);
        box.appendChild(mount(featured));
        root.appendChild(box);
      }

      var sec = Dom.el('section', { class: 'home-section' }, [section(H.recentTitle || '最近更新')]);
      sec.appendChild(mount(Posts.latest(H.recentCount || 6)));
      root.appendChild(sec);

      Page.mountFooter(root);
    });
  }

  document.title = String(C.site.titleTemplate || '{title}')
    .replace('{title}', C.pages.home.title).replace('{site}', C.site.name || '');
  Nav.render();
  render();
})();
