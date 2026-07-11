<?php
$path = $_SERVER['REQUEST_URI'];
$path = strtok($path, '?');
$path = rtrim($path, '/');

if ($path === '' || $path === '/') {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/index.html');
    exit;
}

if ($path === '/dashboard') {
    header('Content-Type: text/html; charset=utf-8');
    readfile(__DIR__ . '/dashboard.html');
    exit;
}

if (strpos($path, '/api/') === 0) {
    $apiPath = substr($path, 4);
    $_SERVER['PATH_INFO'] = '/' . $apiPath;
    require __DIR__ . '/api/index.php';
    exit;
}

$file = __DIR__ . $path;
if (is_file($file)) {
    $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $types = [
        'html' => 'text/html; charset=utf-8',
        'css'  => 'text/css; charset=utf-8',
        'js'   => 'application/javascript; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon',
        'webp' => 'image/webp',
        'woff' => 'font/woff',
        'woff2'=> 'font/woff2',
        'ttf'  => 'font/ttf',
    ];
    header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
    readfile($file);
    exit;
}

if (is_file($file . '.html')) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($file . '.html');
    exit;
}

header('Content-Type: text/html; charset=utf-8');
http_response_code(200);
readfile(__DIR__ . '/index.html');
exit;
