<?php
/* =========================================================
   CAMPUS MONDE — point d'entrée unique
   - Apache (XAMPP, hébergeur) : via .htaccess
   - Serveur PHP intégré : php -S localhost:8000 -t public public/index.php
   ========================================================= */
declare(strict_types=1);
require __DIR__ . '/../src/bootstrap.php';

$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

// Serveur intégré : laisser passer les fichiers statiques existants (sauf .php)
if (PHP_SAPI === 'cli-server' && $path !== '/' && !str_ends_with($path, '.php')) {
    $f = realpath(__DIR__ . $path);
    if ($f && str_starts_with($f, realpath(__DIR__)) && is_file($f)) return false;
}

// En-têtes de sécurité (équivalent Helmet)
header_remove('X-Powered-By');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://thumb.wikimedia.org https://upload.wikimedia.org; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'" . (PROD ? '; upgrade-insecure-requests' : ''));
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Cross-Origin-Opener-Policy: same-origin');
if (PROD) header('Strict-Transport-Security: max-age=15552000; includeSubDomains');

if ($path === '/api' || str_starts_with($path, '/api/')) {
    require __DIR__ . '/../src/api.php';
    handle_api($method, rtrim($path, '/') ?: '/');
    exit;
}
if ($path === '/robots.txt') {
    header('Content-Type: text/plain; charset=utf-8');
    echo "User-agent: *\nDisallow: /api/\nAllow: /\n" . (env('APP_URL') ? 'Sitemap: ' . env('APP_URL') . "/sitemap.xml\n" : '');
    exit;
}
if ($path === '/sitemap.xml') {
    $base = env('APP_URL') ?: ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    header('Content-Type: application/xml; charset=utf-8');
    echo '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' . htmlspecialchars($base) . '/</loc></url></urlset>';
    exit;
}
// Toute autre adresse : la page unique du site
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache');
readfile(__DIR__ . '/index.html');
