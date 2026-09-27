/* =============================================================================
 * crypto.js —— 加密文章解密（只有文章页需要，所以放在这个页面目录里）
 * 密文格式 = salt(16) + iv(12) + authTag(16) + ciphertext，与构建脚本一致。
 * 对外只暴露 Decrypt.ready(url, path)：拿到就返回明文，需要密码就弹框。
 *
 * 密码**只留在当前页面的内存里**：不写 cookie，不写 localStorage / sessionStorage。
 * 所以刷新、跳到别的文章再回来，都要重新输入。
 * ========================================================================== */
(function () {
  'use strict';

  var C = window.BLOG_CONFIG;
  var E = C.encrypted || {};
  var KDF = E.kdf || {};
  var CIPHER = E.cipher || {};
  var memo = {};          // 只在这一次页面加载里有效，用来避免同一篇反复弹框

  function subtle() {
    var c = window.crypto || window.msCrypto;
    if (!c || !c.subtle) throw new Error('浏览器不支持 WebCrypto');
    return c.subtle;
  }

  function decrypt(buffer, password) {
    var saltLen = KDF.saltBytes == null ? 16 : KDF.saltBytes;
    var ivLen = CIPHER.ivBytes == null ? 12 : CIPHER.ivBytes;
    var tagLen = CIPHER.tagBytes == null ? 16 : CIPHER.tagBytes;
    var u8 = new Uint8Array(buffer);
    if (u8.length <= saltLen + ivLen + tagLen) return Promise.reject(new Error('密文长度不对'));

    var salt = u8.slice(0, saltLen);
    var iv = u8.slice(saltLen, saltLen + ivLen);
    var tag = u8.slice(saltLen + ivLen, saltLen + ivLen + tagLen);
    var data = u8.slice(saltLen + ivLen + tagLen);
    var joined = new Uint8Array(data.length + tag.length);
    joined.set(data, 0);
    joined.set(tag, data.length);

    var s = subtle();
    var enc = new TextEncoder();
    return s.importKey('raw', enc.encode(password), { name: KDF.name || 'PBKDF2' }, false, ['deriveKey'])
      .then(function (baseKey) {
        return s.deriveKey({
          name: KDF.name || 'PBKDF2',
          salt: salt,
          iterations: KDF.iterations || 100000,
          hash: KDF.hash || 'SHA-256'
        }, baseKey, { name: CIPHER.name || 'AES-GCM', length: CIPHER.keyBits || 256 }, false, ['decrypt']);
      })
      .then(function (key) {
        return s.decrypt({ name: CIPHER.name || 'AES-GCM', iv: iv, tagLength: tagLen * 8 }, key, joined);
      })
      .then(function (plain) { return new TextDecoder('utf-8').decode(plain); });
  }

  /* ---------------------------- 密码框 ----------------------------------- */
  function askPassword() {
    return new Promise(function (resolve) {
      var input = Dom.el('input', { class: 'lock-input', type: 'password', placeholder: E.placeholder || '', autocomplete: 'current-password' });
      var err = Dom.el('div', { class: 'lock-error' });
      var btn = Dom.el('button', { class: 'lock-btn', type: 'submit', text: E.submitText || '' });
      var form = Dom.el('form', { class: 'lock-form' }, [input, btn]);

      var box = Dom.el('div', { class: 'lock-box' }, [
        Dom.icon('lock'),
        Dom.el('div', { class: 'lock-title', text: E.title || '' }),
        Dom.el('div', { class: 'lock-hint', text: E.hint || '' }),
        form,
        err
      ]);
      document.body.appendChild(box);
      input.focus();

      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var pwd = input.value;
        if (!pwd) return;
        btn.disabled = true;
        err.textContent = '';
        if (pendingWork) { try { pendingWork(); } catch (e) { /* 通知失败不影响解密 */ } }   // 密码到手，开始解密
        fetchBuffer(pendingUrl)
          .then(function (buf) { return decrypt(buf, pwd); })
          .then(function (text) {
            if (pendingPath) memo[pendingPath] = text;     // 只在内存里，页面一关就没了
            box.remove();
            resolve(text);
          })
          .catch(function () {
            err.textContent = E.wrongText || '';
            btn.disabled = false;
            input.select();
          });
      });
      window.addEventListener('keydown', function onEsc(ev) {
        if (ev.key === 'Escape') { window.removeEventListener('keydown', onEsc); box.remove(); resolve(null); }
      });
    });
  }

  function fetchBuffer(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer();
    });
  }

  var pendingUrl = '', pendingPath = '', pendingWork = null;

  /** @returns {Promise<string|null>} 明文；用户取消返回 null */
  function ready(url, path, onWork) {
    pendingUrl = url;
    pendingPath = path || '';
    pendingWork = typeof onWork === 'function' ? onWork : null;   // 真正开始解密时通知页面（那会儿才需要加载态）
    if (E.enabled === false || !window.crypto || !window.crypto.subtle) {
      console.warn('[crypto] 浏览器不支持解密');
      return Promise.resolve(null);
    }
    // 本次页面加载里已经解过的，直接用内存里的（不进任何存储）
    if (pendingPath && memo[pendingPath]) return Promise.resolve(memo[pendingPath]);
    return askPassword();
  }

  window.Decrypt = { ready: ready, decrypt: decrypt };
})();
