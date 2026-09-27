/* =============================================================================
 * posts.js —— 文章数据
 * 数据是构建产物：<posts.root>/list.json 是一整棵树（每个目录也各有一份）。
 * 节点字段沿用它：{ type, title, excerpt, date, updated, tags, reading_time,
 *                  encrypted, file, children }
 * 这里只负责读、拍平、查找；渲染在各页自己的 js 里。
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;
  var P = C.posts || {};

  var state = { tree: [], flat: [], byPath: {}, loaded: false, error: '', promise: null };

  function rootUrl() { return String(P.root || '.').replace(/\/$/, ''); }

  function joinUrl() {
    return Array.prototype.slice.call(arguments).filter(Boolean)
      .join('/').replace(/([^:])\/{2,}/g, '$1/');
  }

  /** 地址里的中文保留可读，只转义必须转义的字符 */
  function encPath(p) {
    return String(p || '').split('/').filter(Boolean).map(function (seg) {
      if (P.encode === 'all') return encodeURIComponent(seg);
      try { return decodeURIComponent(encodeURI(seg)); } catch (e) { return encodeURI(seg); }
    }).join('/');
  }

  function listUrl(dir) { return joinUrl(rootUrl(), encPath(dir), P.listFile || 'list.json'); }
  function pageUrl(node) {
    var file = node.file || (node.encrypted ? P.encryptedFile : P.plainFile);
    return joinUrl(rootUrl(), encPath(node.path), file);
  }

  /** 日期 → 时间戳：ISO（带时间/时区）和 2026-09-27 这种都要认 */
  function dateNum(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s) return 0;
    var t = Date.parse(s);
    if (!isNaN(t)) return t;
    t = Date.parse(s.replace(/-/g, '/'));
    return isNaN(t) ? 0 : t;
  }

  function latestDate(a, b) { return dateNum(b.date) - dateNum(a.date); }

  function mapNode(raw, parent, path, depth) {
    var kids = (Array.isArray(raw.children) ? raw.children : [])
      .filter(function (c) { return (P.ignoreTitles || []).indexOf(String(c.title)) < 0; });
    var node = {
      title: raw.title || '',
      excerpt: raw.excerpt || '',
      date: raw.date || '',
      updated: raw.updated || '',
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      readingTime: raw.reading_time || 0,
      encrypted: !!raw.encrypted,
      featured: !!raw.featured,
      file: raw.file || '',
      path: path,
      parent: parent,
      children: [],
      hasPage: !!(raw.file || raw.encrypted)
    };
    kids.forEach(function (c, i) {
      // 地址用 slug（真实目录名），显示用 title；索引没给 slug 就退回 title
      var slug = String(c.slug || c.dir || c.folder || c.title || '').trim() || ('item-' + i);
      var kid = mapNode(c, node, path ? path + '/' + slug : slug, depth + 1);
      if (kid) kid.index = i;          // 在索引里原本的次序（上下篇按 order: 'index' 时用）
      node.children.push(kid);
    });
    if (P.pruneEmpty !== false && !node.children.length && !node.hasPage) return null;
    return node;
  }

  function sortTree(nodes) {
    nodes.sort(function (a, b) {
      var d = latestDate(a, b);
      if (d) return d;
      return String(a.title).localeCompare(String(b.title), 'zh-Hans-CN');
    });
    nodes.forEach(function (n) { if (n.children.length) sortTree(n.children); });
  }

  function flatten(nodes, out) {
    nodes.forEach(function (n) { out.push(n); if (n.children.length) flatten(n.children, out); });
    return out;
  }

  function setTree(raw, source) {
    var nodes = [];
    (Array.isArray(raw) ? raw : [raw]).forEach(function (item) {
      if (!item || (P.ignoreTitles || []).indexOf(String(item.title)) >= 0) return;
      // 索引最外层是 posts 根目录本身，不参与路径
      var n = mapNode(item, null, '', 0);
      if (n) nodes.push(n);
    });
    sortTree(nodes);
    state.tree = nodes;
    state.flat = flatten(nodes, []);
    state.byPath = {};
    state.flat.forEach(function (n) { state.byPath[n.path] = n; });
    state.loaded = true;
    Dom.log('文章树：' + state.flat.length + ' 个节点（' + source + '）');
    return state.tree;
  }

  /** 读整棵索引；失败只 warn，页面拿到空数组并显示提示 */
  function load() {
    if (state.promise) return state.promise;
    state.error = '';
    state.promise = Promise.resolve()
      .then(function () {
        if (!P.indexUrl) throw new Error('未配置 indexUrl');
        return Dom.fetchJSON(P.indexUrl);
      })
      .then(function (raw) {
        if (raw == null) throw new Error('读不到索引');
        setTree(raw, 'index');
      })
      .catch(function (err) {
        var abs = String(P.indexUrl || '');
        try { abs = new URL(P.indexUrl, location.href).href; } catch (e) { /* 原样用 */ }
        state.error = '索引读取失败：' + (err && err.message || err) + '（' + abs + '）';
        console.warn('[posts] ' + state.error);
        setTree([], 'empty');
      });
    return state.promise;
  }

  function articles() { return state.flat.filter(function (n) { return n.hasPage; }); }

  /**
   * 同一个文件夹里的文章（含自己）。上下篇就在这里面找：
   * 一本小说一个序列，不会把整个站的文章串成一条。
   * @param {object} node
   * @param {boolean} byIndex true = 按索引里的原始次序（章节顺序），否则按目录树顺序（默认）
   */
  function siblings(node, byIndex) {
    if (!node) return [];
    var box = node.parent ? node.parent.children : state.tree;
    var out = box.filter(function (n) { return n && n.hasPage; });
    if (byIndex) {
      out = out.slice().sort(function (a, b) { return (a.index || 0) - (b.index || 0); });
    }
    return out;
  }
  function latest(limit) {
    var list = articles().sort(latestDate);
    return limit ? list.slice(0, limit) : list;
  }
  function featured(limit) {
    var list = articles().filter(function (n) { return n.featured; });
    return limit ? list.slice(0, limit) : list;
  }
  /**
   * 找一篇文章：地址里的路径可能被浏览器 / 复制粘贴弄脏，所以多兜几层
   * （原始 → 解码后 → 忽略大小写 → 只按最后一段标题找唯一一篇）
   */
  function get(path) {
    var p = String(path || '').trim();
    if (!p) return null;
    if (state.byPath[p]) return state.byPath[p];
    var dec = p;
    try { dec = decodeURIComponent(p); } catch (e) { /* 原样用 */ }
    if (state.byPath[dec]) return state.byPath[dec];
    var low = dec.toLowerCase();
    var hit = state.flat.filter(function (n) { return n.path.toLowerCase() === low; })[0];
    if (hit) return hit;
    var tail = dec.split('/').filter(Boolean).pop();
    if (tail) {
      var same = state.flat.filter(function (n) {
        return n.hasPage && String(n.title).trim().toLowerCase() === tail.toLowerCase();
      });
      if (same.length === 1) return same[0];
    }
    return null;
  }

  /** 文章地址：<文章页 url>?p=<路径> */
  function href(node) {
    var page = (C.pages || {})[C.articlePage || 'post'] || {};
    var base = page.url || './';
    return base + '?p=' + encPath(typeof node === 'string' ? node : (node && node.path) || '');
  }

  function dirOf(node) {
    if (!node) return null;
    return node.children.length ? node : node.parent;
  }

  /* ------------------------------- 搜索 ---------------------------------- */
  var SF = {                     // 各字段的权重（越大越算“命中得准”）
    title: 100,
    tag: 45,
    path: 26,
    excerpt: 16,
    parent: 10
  };

  /** 拆词：空白 + 常见分隔符都当断点（中文没空格时整串当一个词） */
  function terms(keyword) {
    return String(keyword || '')
      .toLowerCase()
      .split(/[\s,，、;；|/\\·．.。!！?？:：'"“”()（）\[\]【】]+/)
      .filter(Boolean)
      .filter(function (t, i, arr) { return arr.indexOf(t) === i; });
  }

  /** 一个词在文本里的命中分：位置越靠前、占比越大、越接近整串，分越高 */
  function hit(text, term, weight) {
    var s = String(text || '').toLowerCase();
    if (!s || !term) return 0;
    var at = s.indexOf(term);
    if (at < 0) return 0;
    var score = weight;
    if (s === term) score += weight * 1.5;                     // 整串就是它
    else if (at === 0) score += weight * 0.8;                  // 开头命中
    else score += weight * 0.3 * (1 - at / s.length);           // 越靠前越好
    score += weight * 0.5 * (term.length / s.length);           // 命中占比越高越好
    if (s.indexOf(term, at + 1) >= 0) score += weight * 0.15;   // 出现多次
    return score;
  }

  /**
   * 给一篇文章打分：把查询拆成词，每个词都要在某个字段里出现（AND），
   * 再把各字段的命中分加起来 —— 分数就是“匹配度”，用来排序。
   * @returns {number} 0 = 不匹配
   */
  function scoreOf(node, list) {
    var total = 0;
    for (var i = 0; i < list.length; i++) {
      var t = list[i], best = 0, s;
      s = hit(node.title, t, SF.title); if (s > best) best = s;
      s = hit((node.tags || []).join(' '), t, SF.tag); if (s > best) best = s;
      s = hit(node.path.replace(/\//g, ' '), t, SF.path); if (s > best) best = s;
      s = hit(node.excerpt, t, SF.excerpt); if (s > best) best = s;
      s = hit(node.parent ? node.parent.title : '', t, SF.parent); if (s > best) best = s;
      if (!best) return 0;                                       // 有一个词没命中就不算
      total += best;
    }
    // 整串出现在标题里，或者所有词都落在标题上，额外加分
    var whole = list.join(' ').toLowerCase();
    if (whole && String(node.title).toLowerCase().indexOf(whole) >= 0) total += SF.title * 0.9;
    var allInTitle = list.every(function (t) { return String(node.title).toLowerCase().indexOf(t) >= 0; });
    if (allInTitle && list.length > 1) total += SF.title * 0.4 * (list.length - 1);
    return total;
  }

  /**
   * 搜索：默认整棵树都搜，拆词之后按匹配度排序（同分再按日期新的在前）。
   * @param {string} keyword
   * @param {object} [scopeNode] 只在这个目录里搜（不传就是全站）
   * @param {number} [limit]
   */
  function search(keyword, scopeNode, limit) {
    var list = terms(keyword);
    if (!list.length) return [];
    var pool = scopeNode ? (function walk(n, out) {
      if (n.hasPage) out.push(n);
      n.children.forEach(function (c) { walk(c, out); });
      return out;
    })(scopeNode, []) : articles();

    var hits = [];
    pool.forEach(function (n) {
      var sc = scoreOf(n, list);
      if (sc > 0) hits.push({ node: n, score: sc });
    });
    hits.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return latestDate(a.node, b.node) || String(a.node.title).localeCompare(String(b.node.title), 'zh-Hans-CN');
    });
    var out = hits.map(function (h) { return h.node; });
    return limit ? out.slice(0, limit) : out;
  }

  window.Posts = {
    load: load,
    isLoaded: function () { return state.loaded; },
    error: function () { return state.error; },
    roots: function () { return state.tree; },
    all: articles,
    siblings: siblings,
    latest: latest,
    featured: featured,
    get: get,
    href: href,
    pageUrl: pageUrl,
    dirOf: dirOf,
    terms: terms,
    scoreOf: scoreOf,
    search: search
  };
})();
