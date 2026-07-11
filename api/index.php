<?php
/* ============================================================
   𝓼ιмρℓє — API minimale (optionnelle, pour hébergement cPanel)
   Le site fonctionne SANS ce fichier (mode démo local).
   Actif seulement si l'URL du bot est renseignée dans le portail.
   Les données persistent dans api/data/*.json (dossier inscriptible).
   ============================================================ */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, x-session-token, x-user-id');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$DATA = __DIR__ . '/data';
@mkdir($DATA, 0755, true);

function read_json($f, $def) {
  global $DATA;
  $p = $DATA . '/' . $f;
  if (!file_exists($p)) return $def;
  $c = file_get_contents($p);
  $v = json_decode($c, true);
  return $v === null ? $def : $v;
}
function write_json($f, $v) {
  global $DATA;
  file_put_contents($DATA . '/' . $f, json_encode($v, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}
function req_body() {
  $raw = file_get_contents('php://input');
  $v = json_decode($raw, true);
  return is_array($v) ? $v : [];
}
function ok($data) { echo json_encode($data); exit; }
function fail($msg, $code = 400) { http_response_code($code); echo json_encode(['error' => $msg]); exit; }

/* ---- route ---- */
$path = '';
if (!empty($_SERVER['PATH_INFO'])) $path = $_SERVER['PATH_INFO'];
elseif (!empty($_GET['p'])) $path = '/' . ltrim($_GET['p'], '/');
else { fail('Route inconnue', 404); }

$method = $_SERVER['REQUEST_METHOD'];
$segments = array_values(array_filter(explode('/', $path), 'strlen'));
if (count($segments) >= 1 && $segments[0] === 'api') array_shift($segments);
$r = implode('/', $segments); // ex: bot/stats

$token = $_SERVER['HTTP_X_SESSION_TOKEN'] ?? '';
$uid = $_SERVER['HTTP_X_USER_ID'] ?? '';
$body = req_body();

/* ---- helpers data ---- */
function badge($level) {
  if ($level >= 999) return ['emoji' => '🌟', 'name' => 'Super Admin'];
  if ($level >= 80) return ['emoji' => '🔴', 'name' => 'Admin'];
  if ($level >= 68) return ['emoji' => '🟢', 'name' => 'Modérateur'];
  if ($level >= 15) return ['emoji' => '💎', 'name' => 'VIP'];
  if ($level >= 2) return ['emoji' => '🏆', 'name' => 'OG Fondateur'];
  return ['emoji' => '👤', 'name' => 'Membre'];
}
function derive($userId) {
  $h = 0; for ($i = 0; $i < strlen($userId); $i++) $h = ($h * 31 + ord($userId[$i])) & 0xffffffff;
  $isSuper = ($userId === '1513286724183130122') || ($h % 97 === 0);
  $permLevel = $isSuper ? 999 : 15 + ($h % 60);
  $xpLevel = 1 + ($h % 80);
  $b = badge($permLevel);
  return ['id' => $userId, 'level' => $permLevel, 'xp' => $xpLevel, 'isSuper' => $isSuper,
          'permName' => $b['name'], 'permLevel' => $permLevel, 'xpLevel' => $xpLevel,
          'canAccessDashboard' => $permLevel >= 2];
}
$SEED_COMMANDS = [
  ['ping','moderation'],['ban','moderation'],['kick','moderation'],['mute','moderation'],['warn','moderation'],['clear','moderation'],
  ['ticket','tickets'],['close','tickets'],['claim','tickets'],['daily','economy'],['work','economy'],['pay','economy'],
  ['balance','economy'],['shop','economy'],['slots','casino'],['roulette','casino'],['blackjack','casino'],['rank','leveling'],
  ['leaderboard','leveling'],['xp','leveling'],['play','music'],['skip','music'],['queue','music'],['stop','music'],
  ['help','information'],['stats','information'],['invite','invites'],['setrank','admin'],['reload','admin'],['config','configuration'],
  ['say','utility'],['avatar','images'],['cat','images'],['8ball','fun'],['meme','fun'],['giveaway','giveaway'],
  ['poll','community'],['welcome','welcome'],['autorole','roles'],['suggest','suggestion'],
];
function commands_list() {
  global $SEED_COMMANDS;
  $state = read_json('cmds.json', null);
  if ($state === null) { $state = []; foreach ($SEED_COMMANDS as $i => $c) $state[$c[0].'_'.$i] = ($i % 7 !== 0); write_json('cmds.json', $state); }
  $out = [];
  foreach ($SEED_COMMANDS as $i => $c) { $k = $c[0].'_'.$i; $out[] = ['key' => $k, 'name' => $c[0], 'category' => $c[1], 'enabled' => !empty($state[$k])]; }
  return $out;
}
function roles_for($gid) {
  return [
    ['id' => 'r1', 'name' => 'Fondateur', 'color' => '#ffd700', 'memberCount' => 1, 'permissionLevel' => 999],
    ['id' => 'r2', 'name' => 'Admin', 'color' => '#e74c3c', 'memberCount' => 4, 'permissionLevel' => 80],
    ['id' => 'r3', 'name' => 'Modérateur', 'color' => '#2ecc71', 'memberCount' => 12, 'permissionLevel' => 68],
    ['id' => 'r4', 'name' => 'VIP', 'color' => '#9b59b6', 'memberCount' => 53, 'permissionLevel' => 15],
    ['id' => 'r5', 'name' => 'Membre', 'color' => '#95a5a6', 'memberCount' => 9800, 'permissionLevel' => 1],
  ];
}
function role_vis($gid) {
  $s = read_json('roles_'.$gid.'.json', null);
  if ($s === null) {
    $rs = roles_for($gid);
    $s = ['displayed' => [$rs[0]['id'], $rs[1]['id'], $rs[2]['id']], 'hidden' => [$rs[3]['id']], 'locked' => ['r1','r2'], 'claimable' => ['r4']];
    write_json('roles_'.$gid.'.json', $s);
  }
  return $s;
}

/* ---- routing ---- */
try {
  if ($r === 'auth/login' && $method === 'POST') {
    $userId = trim($body['userId'] ?? '');
    if (!$userId) fail('ID Discord requis');
    $profile = derive($userId);
    $tok = 'tok-' . $userId . '-' . bin2hex(random_bytes(8));
    $sessions = read_json('sessions.json', []);
    $sessions[$tok] = ['userId' => $userId, 'ts' => time()];
    write_json('sessions.json', $sessions);
    ok(['token' => $tok, 'user' => ['id' => $profile['id'], 'level' => $profile['level'], 'xp' => $profile['xp'], 'isSuper' => $profile['isSuper']],
        'permissionLevel' => $profile['permLevel'], 'permissionName' => $profile['permName'], 'profile' => $profile]);
  }
  if ($r === 'auth/verify') {
    $sessions = read_json('sessions.json', []);
    if (!$token || empty($sessions[$token])) fail('Session invalide', 401);
    $userId = $sessions[$token]['userId'];
    $profile = derive($userId);
    ok(['valid' => true, 'session' => ['id' => $userId], 'user' => ['id' => $userId], 'profile' => $profile]);
  }
  if ($r === 'auth/logout' && $method === 'POST') {
    $sessions = read_json('sessions.json', []);
    unset($sessions[$token]);
    write_json('sessions.json', $sessions);
    ok(['ok' => true]);
  }

  if ($r === 'bot/stats') ok(['guilds' => 4, 'users' => 18857, 'ping' => 42, 'uptime' => 1234567, 'channels' => 342, 'commands' => count(commands_list()), 'memory' => 128*1024*1024, 'files' => 285]);
  if ($r === 'bot/tickets') ok(['open' => 2, 'closed' => 2, 'total' => 4, 'categories' => 4]);
  if ($r === 'bot/moderation/stats') ok(['activeMutes' => 3, 'totalWarnings' => 87, 'totalCases' => 212, 'totalStrikes' => 9]);
  if ($r === 'bot/leveling/stats') ok(['players' => 15420, 'totalXp' => 98234100, 'totalLevels' => 412000, 'topPlayers' => [['level' => 80]]]);
  if ($r === 'bot/fun/stats') ok(['totalDuels' => 1423]);
  if ($r === 'bot/giveaways/stats') ok(['active' => 2, 'ended' => 18, 'total' => 20]);
  if ($r === 'bot/voice/stats') ok(['usersInVoice' => 37]);

  if ($r === 'bot/commands') ok(['commands' => commands_list()]);
  if ($r === 'bot/commands/toggle' && $method === 'PUT') {
    $state = read_json('cmds.json', []);
    $k = $body['key'] ?? '';
    $state[$k] = empty($state[$k]);
    write_json('cmds.json', $state);
    ok(['ok' => true]);
  }

  if ($r === 'bot/guilds') ok([
    ['id' => '801234567890123456', 'name' => 'Simple Officiel', 'memberCount' => 10234, 'openTickets' => 3],
    ['id' => '801234567890123457', 'name' => 'Communauté Gaming', 'memberCount' => 5421, 'openTickets' => 1],
    ['id' => '801234567890123458', 'name' => 'Zone Membres', 'memberCount' => 2890, 'openTickets' => 0],
    ['id' => '801234567890123459', 'name' => 'Serveur Test', 'memberCount' => 312, 'openTickets' => 2],
  ]);
  if ($r === 'bot/tickets/recent') ok(['tickets' => [
    ['id' => 142, 'userId' => '412345678901234567', 'guildId' => '801234567890123456', 'open' => true, 'createdAt' => time()*1000 - 3600000],
    ['id' => 141, 'userId' => '412345678901234568', 'guildId' => '801234567890123457', 'open' => true, 'createdAt' => time()*1000 - 7200000],
    ['id' => 140, 'userId' => '412345678901234569', 'guildId' => '801234567890123456', 'open' => false, 'createdAt' => time()*1000 - 86400000],
  ]]);
  if ($r === 'bot/tickets/categories' || $r === 'bot/guilds/categories') ok(['categories' => [
    ['id' => 'c1', 'name' => 'Support', 'emoji' => '🛠️', 'memberLimit' => 1, 'discordCategory' => true],
    ['id' => 'c2', 'name' => 'Partenariat', 'emoji' => '🤝', 'memberLimit' => 1, 'discordCategory' => true],
  ]]);
  if ($r === 'bot/leveling/leaderboard') {
    $lb = [];
    for ($i = 0; $i < 20; $i++) $lb[] = ['id' => '41'.(200000000000000 + $i*1234567), 'rank' => $i+1, 'level' => 80 - $i*3, 'xp' => 250000 - $i*9000];
    ok($lb);
  }

  /* chat */
  if ($r === 'bot/chat/conversations') {
    $chat = read_json('chat.json', []);
    $list = [];
    foreach ($chat as $id => $c) { $last = end($c['messages']); $list[] = ['userId' => $id, 'username' => $c['username'], 'lastMessage' => $last['content'] ?? '', 'lastTime' => $last['createdAt'] ?? time()*1000]; }
    ok(['conversations' => $list]);
  }
  if (preg_match('#^bot/chat/messages/([^/]+)$#', $r, $m)) {
    $chat = read_json('chat.json', []);
    $id = $m[1];
    ok(['messages' => $chat[$id]['messages'] ?? []]);
  }
  if ($r === 'bot/chat/send' && $method === 'POST') {
    $chat = read_json('chat.json', []);
    $target = $body['userId'] ?? '';
    if (!$target) fail('userId requis');
    if (empty($chat[$target])) $chat[$target] = ['username' => 'Membre ' . substr($target, -4), 'messages' => []];
    $chat[$target]['messages'][] = ['direction' => 'outgoing', 'content' => $body['message'] ?? '', 'createdAt' => time()*1000];
    $chat[$target]['messages'][] = ['direction' => 'incoming', 'content' => 'Merci ! Un staff te répondra sous peu. (démo)', 'createdAt' => (time()+1)*1000];
    write_json('chat.json', $chat);
    ok(['ok' => true]);
  }

  /* inventory */
  if (preg_match('#^inventory/([^/]+)/roles/([^/]+)/visibility$#', $r, $m) && $method === 'PUT') {
    $gid = $m[1]; $rid = $m[2];
    $s = role_vis($gid);
    if (in_array($rid, $s['displayed'])) { $s['displayed'] = array_values(array_diff($s['displayed'], [$rid])); $action = 'hidden'; }
    else { $s['hidden'] = array_values(array_diff($s['hidden'] ?? [], [$rid])); $action = 'shown'; }
    write_json('roles_'.$gid.'.json', $s);
    $rs = roles_for($gid); $roleName = $rid;
    foreach ($rs as $x) if ($x['id'] === $rid) $roleName = $x['name'];
    ok(['action' => $action, 'roleName' => $roleName]);
  }
  if (preg_match('#^inventory/([^/]+)/roles$#', $r, $m)) {
    $gid = $m[1]; $s = role_vis($gid); $rs = roles_for($gid);
    $pick = function($ids) use ($rs) { return array_values(array_filter($rs, fn($x) => in_array($x['id'], $ids))); };
    ok(['badge' => ['emoji' => '💎', 'name' => 'VIP'], 'memberLevel' => 15,
        'displayed' => $pick($s['displayed']), 'hidden' => $pick($s['hidden'] ?? []),
        'locked' => $pick($s['locked']), 'claimable' => $pick($s['claimable'])]);
  }

  fail('Route non supportée: ' . $r, 404);
} catch (Throwable $e) {
  fail('Erreur serveur: ' . $e->getMessage(), 500);
}
