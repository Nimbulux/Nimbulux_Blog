/* =============================================================================
 * friends.js —— 好友页
 * 数据：app/content/friends.md 里的一段 markdown（默认就用它，简单直接），
 *       也可以在 config.friends.groups 里写结构化列表，两者取其一。
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;
  var F = C.friends || {};
  var root = document.getElementById('viewRoot');

  function cards(groups) {
    var box = Dom.el('div', {});
    groups.forEach(function (g) {
      if (g.name) box.appendChild(Dom.el('div', { class: 'group-title', text: g.name }));
      var grid = Dom.el('div', { class: 'card-grid', dataset: { cols: '2' } });
      (g.links || []).forEach(function (l) {
        grid.appendChild(Dom.el('a', {
          class: 'card friend-card',
          href: l.url,
          target: /^https?:/.test(l.url || '') ? '_blank' : null,
          rel: 'noopener noreferrer'
        }, [
          Dom.el('div', { class: 'fc-head' }, [
            Dom.el('span', { class: 'fc-name', text: l.name || '' }),
            Dom.el('span', { class: 'fc-go', text: '访问' })
          ]),
          l.desc ? Dom.el('div', { class: 'fc-desc', text: l.desc }) : null
        ]));
      });
      box.appendChild(grid);
    });
    return box;
  }

  document.title = String(C.site.titleTemplate || '{title}')
    .replace('{title}', C.pages.friends.title).replace('{site}', C.site.name || '');
  Nav.render();
  Dom.clear(root);

  if (F.groups && F.groups.length) {
    root.appendChild(Page.sectionTitle(F.heading || C.pages.friends.title));
    root.appendChild(cards(F.groups));
    if (F.applyTip) root.appendChild(Dom.el('div', { class: 'muted tip', text: F.applyTip }));
    Page.mountFooter(root);
  } else {
    Page.content('friends', root).then(function () { Page.mountFooter(root); });
  }
})();
