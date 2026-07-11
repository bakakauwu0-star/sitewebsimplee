/* ============================================================
   app.js — Shared logic for 𝓼ιмρℓє
   - Coherent config (SITE) + banner notifications
   - Local data layer so the site is 100% functional WITHOUT a
     backend (works on cPanel public_html AND GitHub Pages)
   - Optional remote backend: set the bot URL -> uses /api/*
   ============================================================ */
(function () {
  'use strict';

  /* ---------- config ---------- */
  const BOT_DEFAULT_URL = ''; // empty = local/demo mode (no backend)
  window.SITE = window.SITE || {};

  let base = '';
  try { base = (localStorage.getItem('botApiBase') || BOT_DEFAULT_URL).trim().replace(/\/+$/, ''); }
  catch (e) { base = BOT_DEFAULT_URL; }
  window.SITE.apiBase = base;
  window.SITE.useRemote = !!base;

  window.setApiBase = function (url) {
    url = (url || '').trim().replace(/\/+$/, '');
    try { localStorage.setItem('botApiBase', url); } catch (e) {}
    window.SITE.apiBase = url;
    window.SITE.useRemote = !!url;
    return url;
  };
  window.getApiBase = function () { return window.SITE.apiBase || ''; };

  /* ---------- small storage helpers ---------- */
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  window.LS = LS;

  /* ---------- banner ---------- */
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
  window.notify = function (msg, type) {
    const b = ensureBanner();
    const c = COLORS[type] || COLORS.info;
    b.style.background = c[0]; b.style.color = c[1];
    b.textContent = msg; b.style.display = 'block';
    if (window.notify._t) clearTimeout(window.notify._t);
    if (type !== 'bad' && type !== 'warn') window.notify._t = setTimeout(() => { b.style.display = 'none'; }, 6000);
  };

  function isBackendDown(err) {
    const m = err && err.message ? err.message : String(err || '');
    return /Failed to fetch|NetworkError|Load failed|net::ERR|ERR_|<!DOCTYPE|Unexpected token|SyntaxError|Not Found|404/i.test(m);
  }
  window.isBackendDown = isBackendDown;
  window.backendUnreachable = function (reason) {
    window.notify('⚠️ Mode démo : le bot n’est pas joignable. Renseigne l’URL du bot pour activer le vrai backend. ' + (reason ? '(' + reason + ')' : ''), 'warn');
  };

  /* ---------- badge / profile helpers ---------- */
  window.getBadgeForLevel = function (level) {
    if (level >= 999) return { emoji: '🌟', name: 'Super Admin', color: '#ffd700' };
    if (level >= 100) return { emoji: '👑', name: 'Owner', color: '#ffd700' };
    if (level >= 97) return { emoji: '👑', name: 'Co-Owner', color: '#ffd700' };
    if (level >= 93) return { emoji: '🔧', name: 'Dév', color: '#3498db' };
    if (level >= 90) return { emoji: '🎖️', name: 'Directeur', color: '#9b59b6' };
    if (level >= 87) return { emoji: '⭐', name: 'Manageur', color: '#e67e22' };
    if (level >= 84) return { emoji: '🛡️', name: 'Resp. Modération', color: '#e74c3c' };
    if (level >= 80) return { emoji: '🔴', name: 'Admin', color: '#e74c3c' };
    if (level >= 68) return { emoji: '🟢', name: 'Modérateur', color: '#2ecc71' };
    if (level >= 40) return { emoji: '💚', name: 'Helper', color: '#2ecc71' };
    if (level >= 30) return { emoji: '📢', name: 'CM', color: '#9b59b6' };
    if (level >= 15) return { emoji: '💎', name: 'VIP', color: '#9b59b6' };
    if (level >= 12) return { emoji: '🚀', name: 'Booster', color: '#e91e63' };
    if (level >= 9)  return { emoji: '⚡', name: 'Immortal', color: '#00bcd4' };
    if (level >= 2)  return { emoji: '🏆', name: 'OG Fondateur', color: '#ffd700' };
    if (level >= 1)  return { emoji: '🐾', name: 'Good Boy/Girl', color: '#e91e63' };
    return { emoji: '👤', name: 'Membre', color: '#95a5a6' };
  };

  // Deterministic profile derived from a Discord ID (so it's stable per user)
  function hashId(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return h;
  }
  function deriveProfile(userId) {
    const h = hashId(userId);
    const isSuper = userId === '1513286724183130122' || (h % 97 === 0);
    const permLevel = isSuper ? 999 : 15 + (h % 60); // VIP..Admin demo range
    const xpLevel = 1 + (h % 80);
    const badge = window.getBadgeForLevel(permLevel);
    return {
      id: userId,
      level: permLevel,
      xp: xpLevel,
      isSuper,
      permName: badge.name,
      permLevel,
      xpLevel,
      canAccessDashboard: permLevel >= 2,
    };
  }
  window.deriveProfile = deriveProfile;

  /* ============================================================
     LOCAL DATA LAYER (demo, fully functional offline)
     ============================================================ */
  const CATEGORIES = {
    moderation: '🛡️ Modération', admin: '👑 Admin', configuration: '⚙️ Config',
    tickets: '🎫 Tickets', community: '👥 Communauté', information: 'ℹ️ Info',
    fun: '🎉 Fun', giveaway: '🎁 Giveaway', invites: '📨 Invit',
    leveling: '⭐ XP', casino: '💰 Casino', utility: '🔧 Util', protection: '🔒 Protect',
    roles: '🔰 Rôles', suggestion: '💡 Suggest', voice: '🎤 Vocal', welcome: '👋 Bienvenue',
    xp: '⭐ XP', backup: '💾 Backup', automod: '🤖 Auto-Mod', panel: '🎛️ Panneaux',
    economy: '💰 Économie', games: '🎮 Jeux', images: '🖼️ Images', levels: '⭐ Niveaux',
    music: '🎵 Musique', profile: '👤 Profil', tools: '🔧 Outils', suggestions: '💡 Suggestions',
    afk: '💤 AFK', birthdays: '🎂 Anniversaires', family: '👨‍👩‍👧 Famille',
    reactionroles: '🔘 Réaction Rôles',
  };

  const SEED_COMMANDS = [
    ['ping', 'moderation'], ['ban', 'moderation'], ['kick', 'moderation'], ['mute', 'moderation'],
    ['warn', 'moderation'], ['clear', 'moderation'], ['ticket', 'tickets'], ['close', 'tickets'],
    ['claim', 'tickets'], ['daily', 'economy'], ['work', 'economy'], ['pay', 'economy'],
    ['balance', 'economy'], ['shop', 'economy'], ['slots', 'casino'], ['roulette', 'casino'],
    ['blackjack', 'casino'], ['rank', 'leveling'], ['leaderboard', 'leveling'], ['xp', 'leveling'],
    ['play', 'music'], ['skip', 'music'], ['queue', 'music'], ['stop', 'music'],
    ['help', 'information'], ['stats', 'information'], ['invite', 'invites'], ['setrank', 'admin'],
    ['reload', 'admin'], ['config', 'configuration'], ['say', 'utility'], ['avatar', 'images'],
    ['cat', 'images'], ['8ball', 'fun'], ['meme', 'fun'], ['giveaway', 'giveaway'],
    ['poll', 'community'], ['welcome', 'welcome'], ['autorole', 'roles'], ['suggest', 'suggestion'],
  ].map(([name, category], i) => ({ key: name + '_' + i, name, category, enabled: i % 7 !== 0 }));

  const SEED_SERVERS = [
    { id: '801234567890123456', name: 'Simple Officiel', memberCount: 10234, openTickets: 3, icon: '' },
    { id: '801234567890123457', name: 'Communauté Gaming', memberCount: 5421, openTickets: 1, icon: '' },
    { id: '801234567890123458', name: 'Zone Membres', memberCount: 2890, openTickets: 0, icon: '' },
    { id: '801234567890123459', name: 'Serveur Test', memberCount: 312, openTickets: 2, icon: '' },
  ];

  const SEED_TICKETS = [
    { id: 142, userId: '412345678901234567', guildId: '801234567890123456', open: true, createdAt: Date.now() - 3600e3 },
    { id: 141, userId: '412345678901234568', guildId: '801234567890123457', open: true, createdAt: Date.now() - 7200e3 },
    { id: 140, userId: '412345678901234569', guildId: '801234567890123456', open: false, createdAt: Date.now() - 86400e3 },
    { id: 139, userId: '412345678901234570', guildId: '801234567890123458', open: false, createdAt: Date.now() - 172800e3 },
  ];

  const SEED_LEADERBOARD = Array.from({ length: 20 }, (_, i) => ({
    id: '41' + (200000000000000 + i * 1234567), rank: i + 1, level: 80 - i * 3, xp: 250000 - i * 9000,
  }));

  const SEED_ROLES = (guildId) => ([
    { id: 'r1', name: 'Fondateur', color: '#ffd700', memberCount: 1, permissionLevel: 999 },
    { id: 'r2', name: 'Admin', color: '#e74c3c', memberCount: 4, permissionLevel: 80 },
    { id: 'r3', name: 'Modérateur', color: '#2ecc71', memberCount: 12, permissionLevel: 68 },
    { id: 'r4', name: 'VIP', color: '#9b59b6', memberCount: 53, permissionLevel: 15 },
    { id: 'r5', name: 'Membre', color: '#95a5a6', memberCount: 9800, permissionLevel: 1 },
  ]);

  /* localStorage-persisted overrides */
  function cmdState() {
    let s = LS.get('demo_cmds', null);
    if (!s) { s = {}; SEED_COMMANDS.forEach(c => s[c.key] = c.enabled); LS.set('demo_cmds', s); }
    return s;
  }
  function setCmd(key, val) { const s = cmdState(); s[key] = val; LS.set('demo_cmds', s); }

  function roleVis(guildId) {
    let s = LS.get('demo_roles_' + guildId, null);
    if (!s) {
      const rs = SEED_ROLES(guildId);
      s = { displayed: rs.slice(0, 3).map(r => r.id), hidden: rs.slice(3, 4).map(r => r.id), locked: ['r1', 'r2'], claimable: ['r4'] };
      LS.set('demo_roles_' + guildId, s);
    }
    return s;
  }
  function setRoleVis(guildId, type, id) {
    const s = roleVis(guildId);
    s[type] = s[type] || [];
    if (s[type].includes(id)) s[type] = s[type].filter(x => x !== id); else s[type].push(id);
    LS.set('demo_roles_' + guildId, s);
  }

  function chatStore() {
    let s = LS.get('demo_chat', {});
    return s;
  }
  function chatSave(s) { LS.set('demo_chat', s); }

  /* ---------- local data handlers (no backend needed) ---------- */
  const botStats = () => ({ guilds: SEED_SERVERS.length, users: 18857, ping: 42, uptime: 1234567, channels: 342, commands: SEED_COMMANDS.length, memory: 128 * 1024 * 1024, files: 285 });
  const botTickets = () => ({ open: SEED_TICKETS.filter(t => t.open).length, closed: SEED_TICKETS.filter(t => !t.open).length, total: SEED_TICKETS.length, categories: 4 });
  const botMod = () => ({ activeMutes: 3, totalWarnings: 87, totalCases: 212, totalStrikes: 9 });
  const botLvl = () => ({ players: 15420, totalXp: 98234100, totalLevels: 412000, topPlayers: [{ level: 80 }] });
  const botFun = () => ({ totalDuels: 1423 });
  const botGive = () => ({ active: 2, ended: 18, total: 20 });
  const botVoice = () => ({ usersInVoice: 37 });
  const botCmds = () => { const st = cmdState(); return { commands: SEED_COMMANDS.map(c => ({ ...c, enabled: st[c.key] })) }; };
  const botGuilds = () => SEED_SERVERS;
  const botTicketsRecent = () => ({ tickets: SEED_TICKETS });
  const botCats = () => ({ categories: [
    { id: 'c1', name: 'Support', emoji: '🛠️', memberLimit: 1, discordCategory: true },
    { id: 'c2', name: 'Partenariat', emoji: '🤝', memberLimit: 1, discordCategory: true },
  ] });
  const botLeaderboard = () => SEED_LEADERBOARD;

  function invRoles(gid) {
    const rs = SEED_ROLES(gid); const vis = roleVis(gid);
    const pick = ids => rs.filter(r => vis[ids] && vis[ids].includes(r.id));
    return { badge: { emoji: '💎', name: 'VIP' }, memberLevel: 15,
      displayed: pick('displayed'), hidden: pick('hidden'), locked: pick('locked'), claimable: pick('claimable') };
  }
  function invVis(gid, roleId) {
    const vis = roleVis(gid); let action = 'hidden';
    if (vis.displayed.includes(roleId)) { setRoleVis(gid, 'displayed', roleId); }
    else { setRoleVis(gid, 'hidden', roleId); action = 'shown'; }
    const r = SEED_ROLES(gid).find(x => x.id === roleId);
    return { action, roleName: r ? r.name : roleId };
  }
  function chatConvs(uid) {
    const store = chatStore();
    return { conversations: Object.values(store).map(c => ({
      userId: c.userId, username: c.username, lastMessage: (c.messages[c.messages.length - 1] || {}).content || '', lastTime: (c.messages[c.messages.length - 1] || {}).createdAt || Date.now(),
    })) };
  }
  function chatMsgs(target) {
    const store = chatStore();
    const c = store[target] || { userId: target, username: 'Membre ' + target.slice(-4), messages: [] };
    return { messages: c.messages };
  }
  function chatSend(body, uid, target) {
    const store = chatStore();
    if (!store[target]) store[target] = { userId: target, username: 'Membre ' + target.slice(-4), messages: [] };
    store[target].messages.push({ direction: 'outgoing', content: body.message, createdAt: Date.now() });
    store[target].messages.push({ direction: 'incoming', content: 'Merci ! Un staff te répondra sous peu. (démo)', createdAt: Date.now() + 1000 });
    chatSave(store);
    return { ok: true };
  }

  /* ---------- local router (regex based, handles dynamic ids) ---------- */
  function localCall(base, path, opts) {
    const full = (base + path).replace(/\/+/g, '/');
    const body = opts && opts.body ? JSON.parse(opts.body) : {};
    const uid = (opts && opts.headers && opts.headers['x-user-id']) || LS.get('chat_uid', '');
    let m;

    if ((m = full.match(/^\/api\/inventory\/([^/]+)\/roles\/([^/]+)\/visibility$/))) return Promise.resolve(invVis(m[1], m[2]));
    if ((m = full.match(/^\/api\/inventory\/([^/]+)\/roles$/))) return Promise.resolve(invRoles(m[1]));
    if ((m = full.match(/^\/api\/bot\/chat\/messages\/([^/?]+)/))) return Promise.resolve(chatMsgs(m[1]));
    if (full === '/api/bot/chat/conversations') return Promise.resolve(chatConvs(uid));
    if (full === '/api/bot/chat/send') return Promise.resolve(chatSend(body, uid, body.userId));
    if (full === '/api/bot/commands/toggle') { setCmd(body.key, !cmdState()[body.key]); return Promise.resolve({ ok: true }); }

    const map = {
      '/api/bot/stats': botStats, '/api/bot/tickets': botTickets, '/api/bot/moderation/stats': botMod,
      '/api/bot/leveling/stats': botLvl, '/api/bot/fun/stats': botFun, '/api/bot/giveaways/stats': botGive,
      '/api/bot/voice/stats': botVoice, '/api/bot/commands': botCmds, '/api/bot/guilds': botGuilds,
      '/api/bot/tickets/recent': botTicketsRecent, '/api/bot/tickets/categories': botCats,
      '/api/bot/guilds/categories': botCats, '/api/bot/leveling/leaderboard': botLeaderboard,
    };
    if (map[full]) return Promise.resolve(map[full]());
    return Promise.reject(new Error('Not found locally: ' + full));
  }

  /* ---------- unified request: remote with local fallback ---------- */
  async function request(base, path, opts) {
    opts = opts || {};
    if (window.SITE.useRemote) {
      try {
        const url = window.SITE.apiBase + base + path;
        const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } catch (e) {
        if (isBackendDown(e)) { window.SITE.useRemote = false; window.backendUnreachable(e.message); }
        else throw e;
      }
    }
    return localCall(base, path, opts);
  }
  window.api = (p, o) => request('/api/bot', p, o);
  window.apiRaw = (base, p, o) => request(base, p, o);

  /* ---------- auth (local + optional remote) ---------- */
  async function authCall(path, body) {
    if (window.SITE.useRemote) {
      try {
        const token = localStorage.getItem('session_token') || '';
        const res = await fetch(window.SITE.apiBase + '/api/auth' + path, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-token': token }, body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.json();
      } catch (e) {
        if (isBackendDown(e)) { window.SITE.useRemote = false; window.backendUnreachable(e.message); }
        else throw e;
      }
    }
    // local demo auth
    const userId = (body.userId || '').trim();
    if (!userId) throw new Error('ID Discord requis');
    const profile = deriveProfile(userId);
    const token = 'demo-' + userId + '-' + Date.now();
    return { token, user: { id: profile.id, level: profile.level, xp: profile.xp, isSuper: profile.isSuper },
             permissionLevel: profile.permLevel, permissionName: profile.permName, profile };
  }
  window.authCall = authCall;

  /* ---------- formatters ---------- */
  window.fmt = (n) => (n == null ? 0 : Number(n)).toLocaleString('fr-FR');
  window.ut = (s) => { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), se = Math.floor(s % 60); return `${d}j ${h}h ${m}m ${se}s`; };
  window.esc = (s) => { const d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; };
  window.catName = (c) => CATEGORIES[c] || ('📁 ' + c);

  /* ---------- re-check backend reachability (optional) ---------- */
  window.checkBackend = async function () {
    if (!window.SITE.useRemote) return false;
    try { const r = await fetch(window.SITE.apiBase + '/api/bot/stats', { cache: 'no-store' }); return r.ok; }
    catch (e) { return false; }
  };
})();
