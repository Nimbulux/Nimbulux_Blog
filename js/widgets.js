/* =============================================================================
 * widgets.js —— 文章页右侧功能区
 *   tree   文章目录（整棵 list.json，用来切换文章，带搜索）
 *   nav    文章导航（当前这一篇的标题树 + 阅读进度）
 *   music  音乐播放（播放条贴在功能区底部，歌单在它上方展开；展开时播放条不动）
 *   fades  滚动区上下边缘的光晕
 *   jump   回到顶部 / 底部胶囊
 * 只在文章页引用；样式沿用原来的 classes。
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;

  function head(title, iconName, onCollapse) {
    var row = Dom.el('div', { class: 'widget-head' }, [
      Dom.icon(iconName),
      Dom.el('span', { class: 'widget-title', text: title })
    ]);
    if (onCollapse) {
      row.appendChild(Dom.el('div', { class: 'widget-actions' }, [
        Dom.el('button', {
          class: 'icon-btn', type: 'button', title: (C.layout || {}).labels.collapse || '',
          on: { click: function () { onCollapse(row.parentNode); } }
        }, [Dom.icon('chevronDown', { cls: 'widget-caret' })])
      ]));
    }
    return row;
  }

  /* ============================ 文章目录（切换） ========================== */
  var Switcher = (function () {
    var W = C.switcher || {};
    var S = W.search || {};
    var root, refs = {}, rows = {}, current = null, query = '';

    function countArticles(node) {
      var n = 0;
      (function walk(x) { if (x.hasPage) n++; x.children.forEach(walk); })(node);
      return n;
    }

    function itemEl(node, depth) {
      depth = depth || 0;
      var wrap = Dom.el('div', { class: 'switcher-node' });
      // 层级缩进交给 CSS：--depth 决定缩进量，data-depth 给样式做判断
      var row = Dom.el('div', {
        class: 'switcher-item',
        dataset: { path: node.path, depth: String(depth) },
        style: '--depth:' + depth
      });
      var caret = null;

      if (node.children.length) {
        caret = Dom.el('button', {
          class: 'switcher-caret', type: 'button', 'aria-label': '展开/收起',
          on: { click: function (e) { e.stopPropagation(); e.preventDefault(); toggle(row, node); } }
        }, [Dom.icon('chevronDown')]);
      }

      var link = Dom.el(node.hasPage ? 'a' : 'span', {
        class: 'switcher-link',
        href: node.hasPage ? Posts.href(node) : null
      });
      link.appendChild(Dom.el('span', { class: 'switcher-icon' }, [Dom.icon(node.children.length ? 'folder' : 'fileText')]));
      link.appendChild(Dom.el('span', { class: 'switcher-title', text: node.title }));
      if (node.encrypted) link.appendChild(Dom.icon('lock', { cls: 'switcher-lock' }));
      if (W.showCount !== false && node.children.length) {
        link.appendChild(Dom.el('span', { class: 'switcher-count', text: String(countArticles(node)) }));
      }
      if (!node.hasPage && node.children.length) {
        link.addEventListener('click', function (e) { e.preventDefault(); toggle(row, node); });
      }

      row.appendChild(caret || Dom.el('span', { class: 'switcher-caret is-leaf' }));
      row.appendChild(link);
      wrap.appendChild(row);

      if (node.children.length) {
        var kids = Dom.el('div', {
          class: 'switcher-children', role: 'group',
          dataset: { depth: String(depth) },
          style: '--depth:' + depth      // 竖提示线跟这一层的缩进对齐
        });
        node.children.forEach(function (c) { kids.appendChild(itemEl(c, depth + 1)); });
        wrap.appendChild(kids);
        row.__kids = kids;
      }
      rows[node.path] = row;
      return wrap;
    }

    function toggle(row, node) {
      if (!row.__kids) return;
      var collapsed = !row.classList.contains('is-collapsed');
      row.classList.toggle('is-collapsed', collapsed);
      row.__kids.hidden = collapsed;
      if (collapsed) clearFocus();          // 收起来 → 别的分支淡回来
      else focusOn(node);                   // 展开 → 聚焦这一支
    }

    var focusNode = null, fadeTimer = null;

    /** 取消聚焦：被淡出的条目淡回来 */
    function clearFocus() {
      clearTimeout(fadeTimer);
      if (!refs.tree) return;
      refs.tree.classList.remove('is-focusing');
      Object.keys(rows).forEach(function (p) { rows[p].classList.remove('is-dim'); });
      focusNode = null;
    }

    /**
     * 聚焦某一支：把「不属于这一支」的条目淡出。
     * 保留 = 祖先链 + 这一支自己的子树；其余（表兄弟、别的顶层分支）淡出。
     * 只改透明度、不动布局。默认常驻到「收起 / 换一篇 / 重新渲染」为止；
     * switcher.focusMode = 'pulse' 时改成淡出一会儿再自动淡回。
     */
    function focusOn(node) {
      if (W.focusFade === false || !refs.tree || !node) return;
      var keep = {};
      var up = node;
      while (up) { keep[up.path] = true; up = up.parent; }
      (function sub(n) { keep[n.path] = true; n.children.forEach(sub); })(node);
      var dimmed = 0;
      Object.keys(rows).forEach(function (p) {
        var off = !keep[p];
        rows[p].classList.toggle('is-dim', off);
        if (off) dimmed++;
      });
      if (!dimmed) { clearFocus(); return; }
      focusNode = node;
      refs.tree.classList.add('is-focusing');
      clearTimeout(fadeTimer);
      if (W.focusMode === 'pulse') fadeTimer = setTimeout(clearFocus, W.fadeMs == null ? 340 : W.fadeMs);
    }

    function renderTree() {
      if (!refs.tree) return;
      clearFocus();                       // 重新渲染之后行都是新的，聚焦状态一并清掉
      Dom.clear(refs.tree);
      rows = {};
      if (!Posts.roots().length) {
        refs.tree.appendChild(Dom.el('div', { class: 'switcher-empty', text: Posts.error() ? Page.emptyPostsText() : (W.emptyText || '') }));
        return;
      }
      Posts.roots().forEach(function (n) { refs.tree.appendChild(itemEl(n)); });

      var depth = W.collapseDepth == null ? 2 : W.collapseDepth;
      Object.keys(rows).forEach(function (p) {
        var node = Posts.get(p);
        if (node && node.children.length && node.path.split('/').length - 1 >= depth) {
          rows[p].classList.add('is-collapsed');
          rows[p].__kids.hidden = true;
        }
      });
      markCurrent();
    }

    function markCurrent() {
      Object.keys(rows).forEach(function (p) { rows[p].classList.remove('is-current'); });
      if (!current) return;
      if (W.expandCurrent !== false) {
        var p = current.parent;
        while (p) {
          if (rows[p.path]) { rows[p.path].classList.remove('is-collapsed'); rows[p.path].__kids.hidden = false; }
          p = p.parent;
        }
      }
      var self = rows[current.path];
      if (self) self.classList.add('is-current');
    }

    /** 搜索命中处高亮：先转义再套 <mark>，不会把 HTML 放进来 */
    function markHits(text, list) {
      var out = Dom.esc(String(text == null ? '' : text));
      list.forEach(function (t) {
        if (!t) return;
        var re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        out = out.replace(re, '<mark>$1</mark>');
      });
      return out;
    }

    /** 结果里显示它在哪一层：小说 / lan的小说 / 002-甜同甜 */
    function trail(node) {
      var p = node.parent, names = [];
      while (p) { names.unshift(p.title); p = p.parent; }
      return names.join(' / ');
    }

    function renderSearch() {
      var q = query.trim();
      if (!refs.tree) return;
      clearFocus();
      Dom.clear(refs.tree);
      rows = {};
      if (!q) { renderTree(); return; }
      // 默认整棵树一起搜（S.scope = 'current' 才只搜当前目录），结果按匹配度排序
      var found = Posts.search(q, S.scope === 'current' ? Posts.dirOf(current) : null, S.maxResults || 60);
      if (!found.length) {
        refs.tree.appendChild(Dom.el('div', { class: 'switcher-empty', text: W.emptyText || '' }));
        return;
      }
      var list = Posts.terms ? Posts.terms(q) : [];
      found.forEach(function (n) {
        var item = Dom.el('a', { class: 'switcher-item switcher-hit', href: Posts.href(n), dataset: { path: n.path } });
        item.appendChild(Dom.el('span', { class: 'switcher-caret is-leaf' }));
        item.appendChild(Dom.el('span', { class: 'switcher-link' }, [
          Dom.el('span', { class: 'switcher-title', html: markHits(n.title, list) }),
          trail(n) ? Dom.el('span', { class: 'switcher-excerpt', html: markHits(trail(n), list) }) : null
        ]));
        rows[n.path] = item;
        refs.tree.appendChild(item);
      });
      markCurrent();
    }

    function mount(host) {
      if (root) { host.appendChild(root); return; }
      root = Dom.el('section', { class: 'widget switcher' });
      refs = {};
      rows = {};

      var search = null;
      if (S.enabled !== false) {
        search = Dom.el('input', {
          class: 'switcher-search', type: 'search', placeholder: S.placeholder || '', 'aria-label': S.placeholder || '',
          on: {
            input: function () { query = search.value; if (query.trim()) renderSearch(); else renderTree(); },
            keydown: function (e) { if (e.key === 'Escape') { search.value = ''; query = ''; renderTree(); } }
          }
        });
      }

      var list = Dom.el('div', { class: 'switcher-list' });
      refs.tree = Dom.el('div', { class: 'switcher-tree' });
      // 层级辅助线由 config.switcher.treeGuide 决定：'line' 只竖线，'full' 竖线 + 横线
      if (W.treeGuide === 'line' || W.treeGuide === 'full') refs.tree.classList.add('is-guide-' + W.treeGuide);
      list.appendChild(refs.tree);

      root.appendChild(head(W.title || '', 'tree', function (el) { el.classList.toggle('is-collapsed'); }));
      root.appendChild(Dom.el('div', { class: 'widget-body is-flush' }, [search, list]));
      host.appendChild(root);

      refs.tree.appendChild(Dom.el('div', { class: 'switcher-empty', text: W.loadingText || '' }));
      if (Posts.isLoaded()) renderTree();
      else Posts.load().then(renderTree);
    }

    return {
      mount: mount,
      setCurrent: function (node) { current = node || null; markCurrent(); },
      reload: function () { if (refs.tree) (query.trim() ? renderSearch() : renderTree()); }
    };
  })();

  /* ========================= 文章导航（本文标题树） ======================== */
  var NavTree = (function () {
    var W = C.navTree || {};
    var root, refs = {}, nodes = {}, activeId = null;

    function setCollapsed(item, collapsed) {
      if (!item) return;
      item.classList.toggle('is-collapsed', collapsed);
      if (item.__kids) item.__kids.hidden = collapsed;
    }

    function buildNode(node, container, depth) {
      var wrap = Dom.el('div', { class: 'navtree-node' });
      var item = Dom.el('div', { class: 'navtree-item', dataset: { depth: String(depth) } });
      var isLeaf = !node.children.length;

      item.appendChild(Dom.el('button', {
        class: 'navtree-caret' + (isLeaf ? ' is-leaf' : ''), type: 'button', 'aria-label': '折叠/展开',
        on: { click: function (e) { e.stopPropagation(); if (!isLeaf) setCollapsed(item, !item.classList.contains('is-collapsed')); } }
      }, [Dom.icon('chevronDown')]));

      item.appendChild(Dom.el('button', {
        class: 'navtree-link', type: 'button', title: node.text,
        on: { click: function () { if (window.Article) Article.scrollToId(node.id); if (!isLeaf) setCollapsed(item, false); } }
      }, [Dom.el('span', { class: 'dot' }), Dom.el('span', { class: 'text', text: node.text })]));

      wrap.appendChild(item);
      if (!isLeaf) {
        var kids = Dom.el('div', { class: 'navtree-children', role: 'group' });
        node.children.forEach(function (c) { buildNode(c, kids, depth + 1); });
        wrap.appendChild(kids);
        item.__kids = kids;
      }
      nodes[node.id] = { item: item, node: node };
      container.appendChild(wrap);
    }

    function renderList(tree) {
      if (!refs.list) return;
      Dom.clear(refs.list);
      nodes = {};
      activeId = null;
      if (!tree || !tree.length) {
        refs.list.appendChild(Dom.el('div', { class: 'navtree-empty', text: W.emptyText || '' }));
        root.classList.add('is-hidden');
        return;
      }
      root.classList.remove('is-hidden');
      tree.forEach(function (n) { buildNode(n, refs.list, 0); });
      var depth = W.collapseDepth == null ? 2 : W.collapseDepth;
      Array.prototype.forEach.call(refs.list.querySelectorAll('.navtree-item'), function (item) {
        if (parseInt(item.dataset.depth, 10) >= depth) setCollapsed(item, true);
      });
      setActive(window.Article ? Article.active() : null);
      updateProgress(window.Article ? Article.progress() : 0);
    }

    function setActive(node) {
      var id = node ? node.id : null;
      Object.keys(nodes).forEach(function (k) {
        nodes[k].item.classList.toggle('is-active', k === id);
        nodes[k].item.classList.toggle('is-read', node ? (nodes[k].node.index < node.index) : false);
      });
      if (node) {
        var p = node.parent;
        while (p) { if (nodes[p.id]) setCollapsed(nodes[p.id].item, false); p = p.parent; }
      }
    }

    function updateProgress(p) {
      if (!refs.bar) return;
      var pct = Math.round((p || 0) * 100);
      refs.bar.style.width = pct + '%';
      refs.pct.textContent = pct + '%';
    }

    function mount(host) {
      if (root) { host.appendChild(root); return; }
      root = Dom.el('section', { class: 'widget navtree' });
      refs = {};

      if (W.showProgress !== false) {
        var progress = Dom.el('div', { class: 'navtree-progress' }, [
          Dom.el('div', { class: 'bar' }, [Dom.el('span')]),
          Dom.el('span', { class: 'pct', text: '0%' })
        ]);
        refs.bar = progress.querySelector('.bar span');
        refs.pct = progress.querySelector('.pct');
        root.appendChild(head(W.title || '', 'toc', function (el) { el.classList.toggle('is-collapsed'); }));
        root.appendChild(Dom.el('div', { class: 'widget-body is-flush' }, [progress, (refs.list = Dom.el('div', { class: 'navtree-list' }))]));
      } else {
        refs.list = Dom.el('div', { class: 'navtree-list' });
        root.appendChild(head(W.title || '', 'toc', function (el) { el.classList.toggle('is-collapsed'); }));
        root.appendChild(Dom.el('div', { class: 'widget-body is-flush' }, [refs.list]));
      }
      host.appendChild(root);
    }

    return { mount: mount, renderList: renderList, setActive: setActive, updateProgress: updateProgress };
  })();

  /* =============================== 音乐 ================================= */
  var Music = (function () {
    var M = C.music || {};
    var L = M.labels || {};
    var list = (M.playlist || []).slice();
    var MODES = { list: 'playOrder', shuffle: 'playShuffle', single: 'playSingle' };
    var root, refs = {}, audio = null, index = 0, mode = M.defaultPlayMode || 'list', cache = {};

    function fmt(sec) {
      if (!isFinite(sec) || sec < 0) sec = 0;
      var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
      return m + ':' + (s < 10 ? '0' + s : s);
    }
    function parseDur(v) {
      if (v == null) return 0;
      var m = /^(\d+):(\d+)$/.exec(String(v).trim());
      if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      var n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    }
    /**
     * 封面：只有配置里真写了 cover 才用 <img>；
     * 没封面就用一个「主题色 + 半透明」的遮罩层 + 标题首字（不再用白色 SVG 占位图，避免每次刷新闪白）
     */
    function setCover(box, t, i) {
      if (!box) return;
      var url = (t && t.cover) || '';
      var letter = M.coverFallback === 'none' ? '' : String((t && t.title) || '?').charAt(0);
      Dom.clear(box);
      box.classList.toggle('is-fallback', !url);
      if (url) box.appendChild(Dom.el('img', { src: url, alt: '', loading: 'lazy' }));
      else box.appendChild(Dom.el('span', { class: 'cover-letter', text: letter, title: (t && t.title) || '' }));
      return box;
    }
    function srcOf(t) {
      if (!t) return '';
      if (/^demo:/.test(t.src || '')) {
        if (!cache[t.src]) cache[t.src] = synth(t.src);
        return cache[t.src];
      }
      return t.src || '';
    }
    /* 示例音频：本机合成一段循环 pad，不需要音频文件 */
    function synth(key) {
      try {
        var seed = 0;
        for (var k = 0; k < key.length; k++) seed = (seed * 31 + key.charCodeAt(k)) % 9973;
        var sr = 8000, dur = 8, n = sr * dur;
        var scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
        var base = scale[seed % scale.length];
        var buf = new Int16Array(n);
        for (var i = 0; i < n; i++) {
          var t = i / sr, seg = Math.floor(t / 2) % 4;
          var f = seg === 0 ? base : seg === 1 ? base * 1.4983 : seg === 2 ? base * 1.2599 : base * 1.1225;
          var env = Math.min(1, t / 0.6) * Math.min(1, (dur - t) / 0.8) * (0.62 + 0.38 * Math.sin(2 * Math.PI * 0.12 * t));
          var v = 0.3 * Math.sin(2 * Math.PI * f * t) + 0.15 * Math.sin(2 * Math.PI * f * 2 * t + 0.7) +
            0.09 * Math.sin(2 * Math.PI * f * 3 * t + 1.4) + 0.06 * Math.sin(Math.PI * f * t);
          buf[i] = Math.max(-1, Math.min(1, v * env * 0.9)) * 32767;
        }
        var ab = new ArrayBuffer(44 + buf.length * 2), dv = new DataView(ab);
        var ws = function (off, s) { for (var j = 0; j < s.length; j++) dv.setUint8(off + j, s.charCodeAt(j)); };
        ws(0, 'RIFF'); dv.setUint32(4, 36 + buf.length * 2, true); ws(8, 'WAVE');
        ws(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
        dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
        ws(36, 'data'); dv.setUint32(40, buf.length * 2, true);
        for (var p = 0; p < buf.length; p++) dv.setInt16(44 + p * 2, buf[p], true);
        var bytes = new Uint8Array(ab), bin = '', chunk = 0x8000;
        for (var q = 0; q < bytes.length; q += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(q, q + chunk));
        return 'data:audio/wav;base64,' + btoa(bin);
      } catch (e) { return ''; }
    }

    function track() { return list[index] || null; }

    function ensureAudio() {
      if (audio) return audio;
      audio = new Audio();
      audio.preload = 'metadata';
      audio.volume = M.volume == null ? 0.7 : M.volume;
      audio.addEventListener('timeupdate', onTime);
      audio.addEventListener('loadedmetadata', onTime);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('play', function () { setPlaying(true); });
      audio.addEventListener('pause', function () { setPlaying(false); });
      return audio;
    }

    function load(i, play) {
      if (!list.length) return;
      index = (i + list.length) % list.length;
      var a = ensureAudio();
      a.src = srcOf(track()) || '';
      a.loop = mode === 'single';
      a.load();
      renderTrack();
      markCurrent();
      if (play) { var p = a.play(); if (p && p.catch) p.catch(function () {}); }
      else setPlaying(false);
    }

    function toggle() {
      var a = ensureAudio();
      if (!a.src && list.length) load(index, false);
      if (a.paused) { var p = a.play(); if (p && p.catch) p.catch(function () {}); }
      else a.pause();
    }

    function next(step, random) {
      if (!list.length) return;
      if (random && list.length > 1) {
        var n = index;
        while (n === index) n = Math.floor(Math.random() * list.length);
        load(n, true); return;
      }
      load(index + (step == null ? 1 : step), true);
    }

    function prev() {
      var a = ensureAudio();
      if (a.currentTime > 3) { a.currentTime = 0; return; }
      next(-1, false);
    }

    function onEnded() {
      if (mode === 'single') return;
      if (mode === 'shuffle') { next(1, true); return; }
      if (index >= list.length - 1) { setPlaying(false); return; }
      load(index + 1, true);
    }

    function cycleMode() {
      var order = ['list', 'shuffle', 'single'];
      mode = order[(order.indexOf(mode) + 1) % order.length];
      ensureAudio().loop = mode === 'single';
      syncModes();
    }

    function onTime() {
      var a = audio;
      if (!a || !refs.rail) return;
      var d = a.duration;
      var pct = isFinite(d) && d > 0 ? (a.currentTime / d) * 100 : 0;
      refs.rail.style.width = pct.toFixed(2) + '%';
      refs.knob.style.left = pct.toFixed(2) + '%';
      refs.cur.textContent = fmt(a.currentTime);
      refs.dur.textContent = fmt(isFinite(d) && d > 0 ? d : parseDur((track() || {}).duration));
    }

    function seek(clientX) {
      var a = ensureAudio();
      var box = refs.seek.getBoundingClientRect();
      var ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
      if (isFinite(a.duration) && a.duration > 0) a.currentTime = ratio * a.duration;
    }

    function setPlaying(on) {
      if (!root) return;
      root.classList.toggle('is-playing', !!on);
      if (!refs.playBtn) return;
      Dom.clear(refs.playBtn);
      refs.playBtn.appendChild(Dom.icon(on ? 'pause' : 'play', { size: 18 }));
      refs.playBtn.title = (on ? L.pause : L.play) || '';
    }

    function renderTrack() {
      var t = track() || {};
      setCover(refs.cover, t, index);
      if (refs.title) refs.title.textContent = t.title || L.unknownTrack || '';
      if (refs.artist) refs.artist.textContent = t.artist || L.unknownArtist || '';
      if (refs.urlBtn) refs.urlBtn.disabled = !t.url;
      if (refs.dur) refs.dur.textContent = fmt(parseDur(t.duration));
      if (refs.cur) refs.cur.textContent = '0:00';
      if (refs.rail) refs.rail.style.width = '0%';
      if (refs.knob) refs.knob.style.left = '0%';
    }

    function markCurrent() {
      if (!refs.playlist) return;
      Array.prototype.forEach.call(refs.playlist.children, function (item) {
        item.classList.toggle('is-current', parseInt(item.dataset.index, 10) === index);
      });
    }

    function syncModes() {
      if (!refs.modeBtn) return;
      Dom.clear(refs.modeBtn);
      refs.modeBtn.appendChild(Dom.icon(MODES[mode], { size: 17 }));
      refs.modeBtn.title = mode;
    }

    function togglePlaylist(force) {
      var open = force === undefined ? !refs.wrap.classList.contains('is-open') : !!force;
      refs.wrap.classList.toggle('is-open', open);
      refs.more.classList.toggle('is-active', open);
      refs.more.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function renderPlaylist() {
      Dom.clear(refs.playlist);
      list.forEach(function (t, i) {
        // 每一条就是「点一下播这首」：封面 + 标题 + 歌手 + 时长，没有别的按钮
        var item = Dom.el('div', {
          class: 'playlist-item', dataset: { index: String(i) },
          on: { click: function () { load(i, true); } }
        }, [
          setCover(Dom.el('span', { class: 'cover' }), t, i),
          Dom.el('div', { class: 'info' }, [
            Dom.el('div', { class: 't', text: t.title || '' }),
            Dom.el('div', { class: 'a', text: t.artist || L.unknownArtist || '' })
          ]),
          Dom.el('span', { class: 'dur', text: t.duration || '' })
        ]);
        refs.playlist.appendChild(item);
      });
      markCurrent();
    }

    function mount(host) {
      if (root) { host.appendChild(root); return; }
      root = Dom.el('section', { class: 'widget music player' + (M.pinned === false ? '' : ' is-pinned') });
      refs = {};

      refs.seek = Dom.el('div', { class: 'player-seek' });
      refs.rail = Dom.el('span');
      refs.knob = Dom.el('span', { class: 'knob' });
      refs.seek.appendChild(Dom.el('span', { class: 'rail' }, [refs.rail]));
      refs.seek.appendChild(refs.knob);
      refs.cur = Dom.el('span', { class: 'player-time', text: '0:00' });
      refs.dur = Dom.el('span', { class: 'player-time is-right', text: '0:00' });

      var dragging = false;
      refs.seek.addEventListener('pointerdown', function (e) { dragging = true; seek(e.clientX); });
      refs.seek.addEventListener('pointermove', function (e) { if (dragging) seek(e.clientX); });
      refs.seek.addEventListener('pointerup', function () { dragging = false; });
      refs.seek.addEventListener('pointercancel', function () { dragging = false; });

      refs.more = Dom.el('button', {
        class: 'icon-btn', type: 'button', title: L.more || '', 'aria-expanded': 'false',
        on: { click: function () { togglePlaylist(); } }
      }, [Dom.icon('playlist')]);
      refs.modeBtn = Dom.el('button', { class: 'icon-btn', type: 'button', on: { click: cycleMode } }, [Dom.icon(MODES[mode], { size: 17 })]);
      refs.playBtn = Dom.el('button', { class: 'play-main', type: 'button', title: L.play || '', on: { click: toggle } }, [Dom.icon('play', { size: 18 })]);
      refs.urlBtn = Dom.el('button', {
        class: 'icon-btn', type: 'button', title: L.open || '',
        on: { click: function () { var t = track(); if (t && t.url) window.open(t.url, '_blank', 'noopener'); } }
      }, [Dom.icon('globe')]);
      refs.cover = Dom.el('span', { class: 'player-cover' });
      refs.title = Dom.el('div', { class: 'player-title' });
      refs.artist = Dom.el('div', { class: 'player-artist' });

      refs.wrap = Dom.el('div', { class: 'playlist-wrap' });
      refs.playlist = Dom.el('div', { class: 'playlist-list' });
      refs.wrap.appendChild(Dom.el('div', { class: 'playlist-inner' }, [refs.playlist]));

      root.appendChild(head(M.title || '', 'music', null));
      root.appendChild(refs.wrap);
      root.appendChild(Dom.el('div', { class: 'player-bar-wrap' }, [
        Dom.el('div', { class: 'player-top' }, [
          refs.cover,
          Dom.el('div', { class: 'player-meta grow' }, [refs.title, refs.artist])
        ]),
        Dom.el('div', { class: 'player-bar' }, [refs.cur, refs.seek, refs.dur]),
        Dom.el('div', { class: 'player-controls' }, [
          Dom.el('div', { class: 'side' }, [
            refs.more, refs.modeBtn,
            Dom.el('button', { class: 'icon-btn', type: 'button', title: L.prev || '', on: { click: prev } }, [Dom.icon('prevTrack')]),
            refs.playBtn,
            Dom.el('button', {
              class: 'icon-btn', type: 'button', title: L.next || '',
              on: { click: function () { next(1, mode === 'shuffle'); } }
            }, [Dom.icon('nextTrack')])
          ]),
          Dom.el('div', { class: 'side is-right' }, [refs.urlBtn])
        ])
      ]));
      host.appendChild(root);

      renderPlaylist();
      load(0, false);
      setPlaying(false);
      if (M.autoplay) { var p = ensureAudio().play(); if (p && p.catch) p.catch(function () {}); }
    }

    return { mount: mount };
  })();

  /* ======================== 滚动光晕 + 回到顶部 ========================= */
  function initFades(scroller, wrap) {
    if (!scroller) return;
    wrap = wrap || scroller.closest('.scroll-wrap');
    if (!wrap) return;
    var top = wrap.querySelector('[data-fade="top"]');
    var bottom = wrap.querySelector('[data-fade="bottom"]');
    if (!top || !bottom) return;
    var raf = 0;
    var schedule = function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        var max = scroller.scrollHeight - scroller.clientHeight;
        top.classList.toggle('is-visible', scroller.scrollTop > 2);
        bottom.classList.toggle('is-visible', max > 2 && scroller.scrollTop < max - 2);
      });
    };
    scroller.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(schedule);
      ro.observe(scroller);
      // 每个模块都盯一下：树/列表长高了、音乐模块展开，都要重算光晕
      Array.prototype.forEach.call(scroller.children, function (c) { ro.observe(c); });
    }
    schedule();
  }

  /**
   * 到底谁在滚：正文区自己滚（宽屏）就用它，手机上整页滚就用页面。
   * 每次现算，断点切换后不用重新初始化。
   */
  function scrollHost(el) {
    if (el && el.scrollHeight > el.clientHeight + 2) return el;
    return document.scrollingElement || document.documentElement || el;
  }

  function initJump(root, scroller) {
    var J = C.jumpCapsule || {};
    if (!root || J.enabled === false) return;
    var L = J.labels || {};
    var idle = null, undo = null, pending = null;

    Dom.clear(root);                                  // 重复初始化时别把按钮叠两遍
    if (J.side === 'left') root.classList.add('is-left');
    else if (J.side === 'right') root.classList.remove('is-left');

    function metrics() {
      var box = scrollHost(scroller);
      return { top: box.scrollTop || 0, max: Math.max(0, (box.scrollHeight || 0) - (box.clientHeight || 0)) };
    }
    function show() { root.classList.add('is-visible'); root.setAttribute('aria-hidden', 'false'); update(); }
    function hide() { root.classList.remove('is-visible'); root.setAttribute('aria-hidden', 'true'); }
    function update() {
      var m = metrics(), thr = J.edgeThreshold == null ? 120 : J.edgeThreshold;
      top.disabled = m.top <= thr;
      bottom.disabled = m.top >= m.max - thr;
    }
    function schedule(delay) {
      clearTimeout(idle);
      idle = setTimeout(function () { if (metrics().max > 40) show(); else hide(); }, delay == null ? (J.idleDelay || 3000) : delay);
    }
    function jumpTo(pos) {
      var from = metrics().top;
      scrollHost(scroller).scrollTo({ top: Math.max(0, pos), behavior: Dom.reducedMotion() ? 'auto' : 'smooth' });
      pending = { from: from };
      root.classList.add('is-undo');
      clearTimeout(undo);
      undo = setTimeout(cancel, J.undoWindow || 5000);
      show();
      setTimeout(update, 80);
    }
    function cancel() { pending = null; root.classList.remove('is-undo'); update(); }

    var top = Dom.el('button', { class: 'jump-btn', type: 'button', title: L.top || '', on: { click: function () { if (!pending) jumpTo(0); } } }, [Dom.icon('arrowUp')]);
    var bottom = Dom.el('button', { class: 'jump-btn', type: 'button', title: L.bottom || '', on: { click: function () { if (!pending) jumpTo(metrics().max); } } }, [Dom.icon('arrowDown')]);
    var undoBtn = Dom.el('button', {
      class: 'jump-btn is-undo', type: 'button', title: L.undo || '',
      on: { click: function () { if (!pending) return; var from = metrics().top; scrollHost(scroller).scrollTo({ top: pending.from, behavior: 'smooth' }); pending = { from: from }; setTimeout(update, 80); } }
    }, [Dom.icon('undo')]);

    root.appendChild(top);
    root.appendChild(Dom.el('span', { class: 'jump-sep' }));
    root.appendChild(bottom);
    root.appendChild(undoBtn);

    // 滚动之后要把两个按钮的可用状态刷新一遍，否则“回到顶部”会一直是禁用状态
    function onScroll() { if (pending) return; hide(); update(); schedule(); }
    /** 点在胶囊自己身上不算“离开”——否则 pointerdown 先把胶囊藏了，后面的 click 就落空 */
    function fromCapsule(e) {
      var t = e && e.target;
      return !!(t && root.contains && root.contains(t));
    }
    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        if (pending || fromCapsule(e)) return;
        hide(); update(); schedule();
      }, { passive: true });
    });
    schedule();
  }

  /* --------------------------- 文章页装配 -------------------------------- */
  var bound = false;

  function bindArticle() {
    if (bound) return;
    bound = true;
    document.addEventListener('article:rendered', function (e) {
      NavTree.renderList(e.detail.tree);
      if (e.detail.node && Switcher.setCurrent) Switcher.setCurrent(e.detail.node);
    });
    document.addEventListener('article:cleared', function () {
      NavTree.renderList([]);
    });
    document.addEventListener('article:heading', function (e) {
      NavTree.setActive(e.detail.node);
    });
    document.addEventListener('article:progress', function (e) { NavTree.updateProgress(e.detail.progress); });
  }

  /** 文章页调用：把右侧功能区装起来 */
  function mountSidebar(slot, scroller) {
    if (!slot) return;
    bindArticle();
    Switcher.mount(slot);
    NavTree.mount(slot);
    Music.mount(slot);
    initFades(scroller);
    initFades(slot, slot.closest('.sidebar') || slot.parentNode);   // 侧栏自己的上下光晕
    initJump(document.getElementById('jumpCapsule'), scroller);
  }

  window.Widgets = { mountSidebar: mountSidebar, initFades: initFades, initJump: initJump };
})();
