/* =============================================================================
 * about.js —— 关于页
 * 内容：app/content/about.md
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;
  var root = document.getElementById('viewRoot');

  document.title = String(C.site.titleTemplate || '{title}')
    .replace('{title}', C.pages.about.title).replace('{site}', C.site.name || '');
  Nav.render();
  Dom.clear(root);

  Page.content('about', root).then(function () {
    Page.mountFooter(root);
  });
})();
