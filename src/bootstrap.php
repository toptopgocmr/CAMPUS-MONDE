<?php
/* =========================================================
   CAMPUS MONDE — noyau PHP : configuration, base MySQL, sessions, e-mails
   ========================================================= */
declare(strict_types=1);

const ROOT = __DIR__ . '/..';

/* ---------- Configuration (.env + variables d'environnement) ---------- */
(function () {
    $f = ROOT . '/.env';
    if (!is_file($f)) return;
    foreach (file($f, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) continue;
        [$k, $v] = array_map('trim', explode('=', $line, 2));
        if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && substr($v, -1) === $v[0]) $v = substr($v, 1, -1);
        if (getenv($k) === false) { putenv("$k=$v"); $_ENV[$k] = $v; }
    }
})();
function env(string $k, ?string $d = null): ?string { $v = getenv($k); return ($v === false || $v === '') ? $d : $v; }

define('PROD', env('APP_ENV', env('NODE_ENV')) === 'production');
define('MFA_ON', env('MFA_DISABLED') !== 'true');
// Mode local : les codes (MFA, vérification, réinitialisation) s'affichent à l'écran. Jamais en production.
define('SHOW_CODES', !PROD && (env('SHOW_CODES') === 'true' || (env('SHOW_CODES') === null && env('APP_ENV') === 'local')));
// Paiements : « simulation » (par défaut hors production) ou « live » (prestataire réel configuré)
define('PAY_MODE', env('PAY_MODE', PROD ? 'live' : 'simulation'));
define('STORAGE', rtrim(env('STORAGE_DIR', ROOT . '/storage/documents'), '/\\'));
date_default_timezone_set('UTC');
ini_set('display_errors', '0');

/* ---------- Base de données ---------- */
function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    // Accepte DATABASE_URL / MYSQL_URL (mysql://user:pass@hôte:port/base), les variables Railway MYSQL*, ou DB_*.
    $url = env('DATABASE_URL') ?: env('MYSQL_URL');
    if ($url && preg_match('#^mysql://#', $url)) {
        $p = parse_url($url);
        $host = $p['host'] ?? '127.0.0.1'; $port = (string)($p['port'] ?? 3306);
        $user = urldecode($p['user'] ?? 'root'); $pass = urldecode($p['pass'] ?? '');
        $name = ltrim($p['path'] ?? '/campusmonde', '/');
    } else {
        $host = env('DB_HOST', env('MYSQLHOST', '127.0.0.1'));
        $port = env('DB_PORT', env('MYSQLPORT', '3306'));
        $user = env('DB_USER', env('MYSQLUSER', 'root'));
        $pass = env('DB_PASSWORD', env('MYSQLPASSWORD', '')) ?? '';
        $name = env('DB_NAME', env('MYSQLDATABASE', 'campusmonde'));
    }
    $opt = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false];
    try {
        $pdo = new PDO("mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4", $user, $pass, $opt);
    } catch (PDOException $e) {
        // Base absente : on tente de la créer (pratique sous XAMPP)
        if (str_contains($e->getMessage(), 'Unknown database')) {
            $tmp = new PDO("mysql:host=$host;port=$port;charset=utf8mb4", $user, $pass, $opt);
            $tmp->exec("CREATE DATABASE IF NOT EXISTS `" . str_replace('`', '', $name) . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo = new PDO("mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4", $user, $pass, $opt);
        } else throw $e;
    }
    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}
function q(string $sql, array $p = []): PDOStatement { $s = db()->prepare($sql); $s->execute($p); return $s; }
function one(string $sql, array $p = []): ?array { $r = q($sql, $p)->fetch(); return $r === false ? null : $r; }
function all(string $sql, array $p = []): array { return q($sql, $p)->fetchAll(); }
function in_list(array $vals): array { // pour « where x in (?, ?, …) »
    return [implode(',', array_fill(0, max(1, count($vals)), '?')), $vals ?: [null]];
}

/* ---------- Utilitaires ---------- */
function uuid(): string { $b = random_bytes(16); $b[6] = chr((ord($b[6]) & 0x0f) | 0x40); $b[8] = chr((ord($b[8]) & 0x3f) | 0x80); return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4)); }
function sha(string $s): string { return hash('sha256', $s); }
function code6(): string { return (string)random_int(100000, 999999); }
function now_db(): string { return gmdate('Y-m-d H:i:s'); }
function in_min(int $m): string { return gmdate('Y-m-d H:i:s', time() + $m * 60); }
function now_iso(): string { return gmdate('Y-m-d\TH:i:s.v\Z'); }
function iso(?string $d): ?string { return $d ? str_replace(' ', 'T', $d) . 'Z' : null; }
function past(?string $d): bool { return !$d || strtotime($d . ' UTC') < time(); }
function pw_ok($p): bool { return is_string($p) && strlen($p) <= 200 && mb_strlen($p) >= 8 && preg_match('/\d/', $p); }
function email_ok($e): bool { return is_string($e) && strlen($e) < 200 && (bool)preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $e); }
function str_in($v, int $n = 500): string { if (is_array($v) || is_object($v)) return ''; if (is_bool($v)) $v = $v ? 'true' : ''; return mb_substr(trim((string)($v ?? '')), 0, $n); }
function jd(?string $s, $def = []) { if ($s === null || $s === '') return $def; $v = json_decode($s, true); return $v ?? $def; }
function je($v): string { return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
function client_ip(): string {
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) return trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
    return $_SERVER['REMOTE_ADDR'] ?? '—';
}
// Clé secrète du site (APP_SECRET, sinon générée une fois dans storage/secret.key) : sert à signer les reçus.
function app_secret(): string {
    static $k = null; if ($k) return $k;
    if ($k = env('APP_SECRET')) return $k;
    $f = ROOT . '/storage/secret.key';
    if (!is_file($f)) @file_put_contents($f, bin2hex(random_bytes(32)));
    return $k = (trim((string)@file_get_contents($f)) ?: sha(__FILE__));
}
// Code de vérification du reçu de dépôt (imprimé en clair et dans le QR code)
function receipt_token(array $a): ?string {
    if (empty($a['submitted'])) return null;
    return strtoupper(substr(hash_hmac('sha256', $a['ref'] . '|' . $a['uid'] . '|' . $a['submitted'], app_secret()), 0, 16));
}
function logline(string $m): void { if (PHP_SAPI === 'cli-server') file_put_contents('php://stderr', '[' . date('H:i:s') . "] $m\n"); else error_log('[Campus Monde] ' . $m); }

/* ---------- Sessions en base MySQL ---------- */
class DbSession implements SessionHandlerInterface {
    public function open($p, $n): bool { return true; }
    public function close(): bool { return true; }
    public function read($id): string|false { $r = one('select data from sessions where id=? and expires>?', [$id, time()]); return $r ? $r['data'] : ''; }
    public function write($id, $data): bool {
        $uid = $_SESSION['uid'] ?? null;
        q('insert into sessions(id,uid,data,expires) values(?,?,?,?) on duplicate key update uid=values(uid), data=values(data), expires=values(expires)', [$id, $uid, $data, time() + 8 * 3600]);
        return true;
    }
    public function destroy($id): bool { q('delete from sessions where id=?', [$id]); return true; }
    public function gc($max): int|false { return q('delete from sessions where expires<?', [time()])->rowCount(); }
}
function start_session(): void {
    session_set_save_handler(new DbSession(), true);
    session_name('cm_sid');
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => PROD || $https]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', (string)(8 * 3600));
    ini_set('session.gc_probability', '1'); ini_set('session.gc_divisor', '100');
    session_start();
}

/* ---------- E-mails (SMTP intégré, sans dépendance) ---------- */
function smtp_send(string $to, string $subj, string $text): void {
    $host = env('SMTP_HOST'); $port = (int)env('SMTP_PORT', '587'); $secure = env('SMTP_SECURE') === 'true';
    $user = env('SMTP_USER'); $pass = env('SMTP_PASS', '');
    $from = env('MAIL_FROM', $user ?: 'no-reply@localhost');
    preg_match('/<([^>]+)>/', $from, $m); $fromAddr = $m[1] ?? $from;
    $ctx = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
    $fp = stream_socket_client(($secure ? 'ssl://' : 'tcp://') . "$host:$port", $errno, $err, 15, STREAM_CLIENT_CONNECT, $ctx);
    if (!$fp) throw new RuntimeException("connexion SMTP impossible : $err");
    stream_set_timeout($fp, 20);
    $read = function () use ($fp) { $o = ''; while (($l = fgets($fp, 515)) !== false) { $o .= $l; if (strlen($l) < 4 || $l[3] === ' ') break; } return $o; };
    $cmd = function (string $c, array $ok) use ($fp, $read) { if ($c !== '') fwrite($fp, $c . "\r\n"); $r = $read(); if (!in_array((int)substr($r, 0, 3), $ok, true)) throw new RuntimeException('SMTP : ' . trim($r)); return $r; };
    $cmd('', [220]);
    $ehlo = 'EHLO ' . (parse_url(env('APP_URL', 'http://localhost'), PHP_URL_HOST) ?: 'localhost');
    $r = $cmd($ehlo, [250]);
    if (!$secure && stripos($r, 'STARTTLS') !== false) {
        $cmd('STARTTLS', [220]);
        if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('STARTTLS impossible');
        $cmd($ehlo, [250]);
    }
    if ($user) { $cmd('AUTH LOGIN', [334]); $cmd(base64_encode($user), [334]); $cmd(base64_encode($pass), [235]); }
    $cmd("MAIL FROM:<$fromAddr>", [250]);
    $cmd("RCPT TO:<$to>", [250, 251]);
    $cmd('DATA', [354]);
    $enc = fn($s) => '=?UTF-8?B?' . base64_encode($s) . '?=';
    $fromHdr = preg_match('/^(.*)<([^>]+)>$/', trim($from), $fm) ? $enc(trim(trim($fm[1]), '"')) . ' <' . $fm[2] . '>' : $from;
    $body = chunk_split(base64_encode($text));
    $msg = "From: $fromHdr\r\nTo: <$to>\r\nSubject: " . $enc($subj) . "\r\nDate: " . date('r') . "\r\nMessage-ID: <" . bin2hex(random_bytes(12)) . "@" . (parse_url(env('APP_URL', 'http://localhost'), PHP_URL_HOST) ?: 'localhost') . ">\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n$body\r\n.";
    $cmd($msg, [250]);
    $cmd('QUIT', [221, 250]);
    fclose($fp);
}
// Les notifications ne contiennent jamais de documents ; les codes sont masqués dans l'historique.
function mail_to(string $to, string $subj, string $body, ?string $secret = null): void {
    $stored = $secret ? str_replace($secret, '••••••', $body) : $body;
    q('insert into outbox(at,to_email,subj,body) values(?,?,?,?)', [now_db(), $to, $subj, $stored]);
    $id = (int)db()->lastInsertId();
    $text = $body . "\n\n— Campus Monde" . (env('APP_URL') ? "\n" . env('APP_URL') : '');
    // Railway (offres Free/Trial/Hobby) bloque le SMTP sortant : on passe d'abord par une API e-mail en HTTPS (Brevo ou Resend).
    if (env('BREVO_API_KEY') || env('RESEND_API_KEY')) {
        try { api_mail_send($to, $subj, $text); q('update outbox set sent=1 where id=?', [$id]); }
        catch (Throwable $e) { logline('[mail API] échec : ' . $e->getMessage()); }
    } elseif (env('SMTP_HOST')) {
        try { smtp_send($to, $subj, $text); q('update outbox set sent=1 where id=?', [$id]); }
        catch (Throwable $e) { logline('[mail] échec : ' . $e->getMessage()); }
    } else logline("[mail – aucun envoi configuré] → $to | $subj | $body");
}
// Envoi par API HTTPS (port 443, autorisé partout) — Brevo en priorité, sinon Resend.
function api_mail_send(string $to, string $subj, string $text): void {
    $from = env('MAIL_FROM', 'Campus Monde <no-reply@localhost>');
    $fromName = 'Campus Monde'; $fromAddr = $from;
    if (preg_match('/^(.*)<([^>]+)>$/', trim($from), $fm)) { $fromName = trim(trim($fm[1]), '"') ?: 'Campus Monde'; $fromAddr = trim($fm[2]); }
    if ($key = trim((string)env('BREVO_API_KEY'))) {
        // Brevo affiche parfois la clé encodée (base64 de {"api_key":"xkeysib-..."}) : on accepte les deux formats.
        if (strpos($key, 'xkeysib-') !== 0 && ($j = json_decode((string)base64_decode($key, true), true)) && !empty($j['api_key'])) $key = $j['api_key'];
        $url = 'https://api.brevo.com/v3/smtp/email';
        $hdr = ['api-key: ' . $key, 'Content-Type: application/json', 'Accept: application/json'];
        $payload = ['sender' => ['name' => $fromName, 'email' => $fromAddr], 'to' => [['email' => $to]], 'subject' => $subj, 'textContent' => $text];
    } else {
        $url = 'https://api.resend.com/emails';
        $hdr = ['Authorization: Bearer ' . env('RESEND_API_KEY'), 'Content-Type: application/json'];
        $payload = ['from' => "$fromName <$fromAddr>", 'to' => [$to], 'subject' => $subj, 'text' => $text];
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_HTTPHEADER => $hdr, CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE), CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20]);
    $res = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
    if ($res === false || $code < 200 || $code >= 300) throw new RuntimeException("HTTP $code " . ($err ?: substr((string)$res, 0, 300)));
}

/* ---------- Installation automatique (tables, catalogue, comptes) ---------- */
const SCHEMA_VERSION = '5'; // à augmenter à chaque évolution du schéma : les nouvelles tables sont alors créées automatiquement
function install(): void {
    $lock = ROOT . '/storage/.installed';
    if (is_file($lock) && trim((string)file_get_contents($lock)) === SCHEMA_VERSION) return;
    $sql = file_get_contents(ROOT . '/database/schema.sql');
    $sql = preg_replace('/^\s*--.*$/m', '', $sql);
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) db()->exec($stmt);

    if (!one('select 1 as x from institutions limit 1')) {
        $INST = [
            ['laval', 'Université Laval', 'canada', 'Québec', 'Université publique', 'https://www.ulaval.ca'],
            ['umontreal', 'Université de Montréal', 'canada', 'Montréal', 'Université publique', 'https://www.umontreal.ca'],
            ['lorraine', 'Université de Lorraine', 'france', 'Nancy / Metz', 'Université publique', 'https://www.univ-lorraine.fr'],
            ['unistra', 'Université de Strasbourg', 'france', 'Strasbourg', 'Université publique', 'https://www.unistra.fr'],
            ['ulb', 'Université libre de Bruxelles', 'belgique', 'Bruxelles', 'Université', 'https://www.ulb.be'],
            ['uclouvain', 'UCLouvain', 'belgique', 'Louvain-la-Neuve', 'Université', 'https://www.uclouvain.be'],
            ['um5', 'Université Mohammed V de Rabat', 'maroc', 'Rabat', 'Université publique', 'https://www.um5.ac.ma'],
        ];
        $PROG = [
            ['laval', 'Baccalauréat en informatique', 'Bachelor in Computer Science', 'licence', 'FR', '4 ans / 4 years'],
            ['laval', 'Maîtrise en administration des affaires (MBA)', 'Master of Business Administration (MBA)', 'master', 'FR', '2 ans / 2 years'],
            ['umontreal', 'Baccalauréat en sciences biomédicales', 'Bachelor in Biomedical Sciences', 'licence', 'FR', '3 ans / 3 years'],
            ['lorraine', 'Licence Économie-Gestion', 'Bachelor in Economics & Management', 'licence', 'FR', '3 ans / 3 years'],
            ['lorraine', 'Master Génie civil', 'Master in Civil Engineering', 'master', 'FR', '2 ans / 2 years'],
            ['unistra', 'Master Droit international', 'Master in International Law', 'master', 'FR', '2 ans / 2 years'],
            ['ulb', "Bachelier en sciences de l'ingénieur", 'Bachelor in Engineering Sciences', 'licence', 'FR', '3 ans / 3 years'],
            ['uclouvain', 'Master in Data Science', 'Master in Data Science', 'master', 'EN', '2 ans / 2 years'],
            ['um5', 'Licence en sciences économiques', 'Bachelor in Economics', 'licence', 'FR', '3 ans / 3 years'],
        ];
        foreach ($INST as $i) q("insert into institutions(id,name,country,city,type,relation,site) values(?,?,?,?,?,'informatif',?)", $i);
        $n = 1; foreach ($PROG as $p) q('insert into programs(id,inst,fr,en,level,lang,dur) values(?,?,?,?,?,?,?)', array_merge(['p' . $n++], $p));
        logline('✓ Catalogue initial créé');
    }
    if (!one("select 1 as x from users where role='admin' limit 1")) {
        $email = strtolower(env('ADMIN_EMAIL', '')); $pw = env('ADMIN_PASSWORD');
        if (email_ok($email) && pw_ok($pw)) {
            q("insert into users(id,email,name,role,pw,verified,profile,created) values(?,?,'Administrateur','admin',?,1,'{}',?)", [uuid(), $email, password_hash($pw, PASSWORD_BCRYPT, ['cost' => 12]), now_db()]);
            logline("✓ Compte administrateur créé : $email");
        } else { logline('⚠️  Aucun administrateur : définissez ADMIN_EMAIL et ADMIN_PASSWORD (8 caractères min. dont 1 chiffre).'); return; }
    }
    if (env('SEED_DEMO') === 'true' && !one("select 1 as x from users where email='agent1@campusmonde.demo'")) {
        $h = password_hash('demo1234', PASSWORD_BCRYPT, ['cost' => 12]);
        foreach ([['responsable@campusmonde.demo', 'Responsable Admissions', 'responsable'], ['agent1@campusmonde.demo', 'Agent Nkounkou', 'agent'], ['agent2@campusmonde.demo', 'Agent Moukoko', 'agent']] as [$e, $n, $r])
            q("insert ignore into users(id,email,name,role,pw,verified,profile,created) values(?,?,?,?,?,1,'{}',?)", [uuid(), $e, $n, $r, $h, now_db()]);
        q("insert ignore into users(id,email,name,role,pw,verified,profile,created) values(?,'etudiant@demo.cg','Grâce Mabiala (fictif)','candidat',?,1,?,?)",
            [uuid(), $h, je(['first' => 'Grâce', 'last' => 'Mabiala', 'dob' => '2004-05-12', 'nat' => 'Congolaise', 'country' => 'Congo', 'city' => 'Brazzaville', 'phone' => '+242 06 000 00 00']), now_db()]);
        logline('✓ Comptes de démonstration créés (mot de passe demo1234)');
    }
    foreach (['fee_amount' => '25000', 'fee_currency' => 'XAF', 'pay_methods' => 'mtn,airtel,card',
              'iv_enabled' => '1', 'iv_days' => '1,2,3,4,5', 'iv_hours' => '09:00-12:00,14:00-17:00', 'iv_duration' => '30',
              'iv_modes' => 'presentiel,visio,telephone', 'iv_notice' => '24', 'iv_horizon' => '21', 'iv_capacity' => '1'] as $k => $v)
        q('insert ignore into settings(k,v) values(?,?)', [$k, $v]);
    if (!is_dir(STORAGE)) @mkdir(STORAGE, 0770, true);
    // Migrations des installations existantes
    if (!one("select 1 as x from information_schema.columns where table_schema=database() and table_name='users' and column_name='photo'"))
        db()->exec('alter table users add column photo VARCHAR(120) NULL after profile');
    @file_put_contents($lock, SCHEMA_VERSION);
    logline('✓ Campus Monde prêt (MySQL)');
}
