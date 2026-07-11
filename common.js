/* common.js — Helpers partagés par index.html et dashboard.html
 * Rend l'interface cohérente : bannière globale + détection propre
 * du cas où le serveur du bot (les routes /api/*) est injoignable.
 */
(function () {
  'use strict';

  // URL publique du bot (allocation YorkHost). Le portail appelle le bot en
  // direct (CORS activé côté bot) quel que soit l'hébergeur du site.
  // Override possible via le champ « URL du bot » (mémorisé en localStorage).
  const BOT_DEFAULT_URL = 'http://83.150.218.85:26030';

  window.SITE = window.SITE || {};

  (function () {
    let base = '';
    try {
      base = (localStorage.getItem('botApiBase') || BOT_DEFAULT_URL).trim().replace(/\/+$/, '');
    } catch (e) {
      base = BOT_DEFAULT_URL;
    }
    window.SITE.apiBase = base;

    // Définit l'URL de base du bot (sans slash final). Vide = même origine.
    window.setApiBase = function (url) {
      url = (url || '').trim().replace(/\/+$/, '');
      try {
        localStorage.setItem('botApiBase', url);
      } catch (e) {}
      window.SITE.apiBase = url;
      return url;
    };

    window.getApiBase = function () {
      return window.SITE.apiBase || '';
    };
  })();

  let __banner = null;
  function ensureBanner() {
    if (__banner) return __banner;
    __banner = document.createElement('div');
    __banner.id = 'siteBanner';
    __banner.style.cssText =
      'position:fixed;top:0;left:0;right:0;z-index:9999;padding:10px 16px;' +
      'font-size:.85em;font-family:system-ui,-apple-system,sans-serif;text-align:center;' +
      'display:none;backdrop-filter:blur(8px);box-shadow:0 2px 12px rgba(0,0,0,.3)';
    (document.body || document.documentElement).appendChild(__banner);
    return __banner;
  }

  const COLORS = {
    warn: ['rgba(243,156,18,.96)', '#1a1206'],
    bad:  ['rgba(231,76,60,.96)', '#fff'],
    ok:   ['rgba(46,204,113,.96)', '#04210f'],
    info: ['rgba(153,51,255,.96)', '#fff'],
  };

  function notify(msg, type) {
    const b = ensureBanner();
    const c = COLORS[type] || COLORS.info;
    b.style.background = c[0];
    b.style.color = c[1];
    b.textContent = msg;
    b.style.display = 'block';
    if (notify._t) clearTimeout(notify._t);
    if (type !== 'bad' && type !== 'warn') {
      notify._t = setTimeout(() => { b.style.display = 'none'; }, 6000);
    }
  }
  window.notify = notify;

  // Le bot est-il joignable ? (échec réseau / HTML au lieu de JSON)
  function isBackendDown(err) {
    const m = err && err.message ? err.message : String(err || '');
    return /Failed to fetch|NetworkError|Load failed|net::ERR|ERR_|<!DOCTYPE|Unexpected token|SyntaxError/i.test(m);
  }
  window.isBackendDown = isBackendDown;

  function backendUnreachable(reason) {
    notify(
      "⚠️ Serveur du bot injoignable — le dashboard nécessite le bot en ligne. " +
      "Renseigne l'URL de ton bot (champ « URL du bot » en bas de la connexion) ou, " +
      "si hébergé sur Netlify, configure le proxy /api/* dans netlify.toml. " +
      (reason ? '(' + reason + ')' : ''),
      'warn'
    );
  }
  window.backendUnreachable = backendUnreachable;

  // Teste rapidement si /api/bot/stats répond.
  async function checkBackend() {
    try {
      const r = await fetch(window.SITE.apiBase + '/api/bot/stats', {
        method: 'GET',
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return true;
    } catch (e) {
      return false;
    }
  }
  window.checkBackend = checkBackend;
})();
