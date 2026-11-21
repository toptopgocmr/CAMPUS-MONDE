<?php
/* =========================================================
   CAMPUS MONDE — API (PHP 8 / MySQL)
   Mêmes adresses et mêmes règles que la version d'origine : l'interface n'a pas changé.
   ========================================================= */
declare(strict_types=1);
require_once __DIR__ . '/payments.php';
require_once __DIR__ . '/interviews.php';
require_once __DIR__ . '/photos.php';

/* ---------- Référentiels ---------- */
const STATUS_FR = ['draft' => 'À compléter', 'submitted' => 'Soumis', 'review' => 'En vérification', 'incomplete' => 'Pièces à compléter', 'ready' => 'Prêt à transmettre', 'transmitted' => 'Transmis', 'pending' => 'En attente de décision', 'admitted' => 'Admis', 'refused' => 'Refusé', 'predeparture' => 'Accompagnement pré-départ', 'enrolled' => 'Inscrit', 'withdrawn' => 'Retiré', 'closed' => 'Clôturé'];
const DOC_FR = ['id' => "Passeport ou pièce d'identité", 'diploma' => 'Diplômes obtenus', 'transcript' => 'Relevés de notes', 'cv' => 'Curriculum vitae', 'letter' => 'Lettre de motivation', 'lang' => "Preuve de niveau d'anglais", 'photo' => "Photo d'identité"];
const DOCST_FR = ['pending' => 'À contrôler', 'ok' => 'Conforme', 'illegible' => 'Illisible', 'expired' => 'Expirée', 'replace' => 'À remplacer'];
const ROLE_FR = ['candidat' => 'Candidat', 'agent' => 'Agent admissions', 'responsable' => 'Responsable admissions', 'admin' => 'Administrateur'];
const STAFF = ['agent', 'responsable', 'admin'];
const FINAL_ST = ['withdrawn', 'closed', 'enrolled', 'refused'];
const AGENT_STATUSES = ['review', 'incomplete'];
const MGR_STATUSES = ['review', 'incomplete', 'ready', 'pending', 'admitted', 'refused', 'predeparture', 'enrolled', 'withdrawn', 'closed'];

final class HttpDone extends Exception {}
function send_json($data, int $st = 200): never {
    http_response_code($st);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo je($data);
    throw new HttpDone();
}
function E(int $st, string $fr, ?string $en = null): never { send_json(['error' => ['fr' => $fr, 'en' => $en ?? $fr]], $st); }
function ok(array $extra = []): never { send_json(['ok' => true] + $extra); }

$ME = null; // utilisateur connecté
function is_mgr(?array $u): bool { return $u && in_array($u['role'], ['responsable', 'admin'], true); }
function audit(string $action, ?string $target = null, ?string $who = null): void {
    global $ME;
    q('insert into audit(at,usr,action,target) values(?,?,?,?)', [now_db(), $who ?? ($ME['email'] ?? client_ip()), mb_substr($action, 0, 500), mb_substr($target ?: '—', 0, 300)]);
}
function auth(array $roles = [], bool $unverified = false): array {
    global $ME;
    if (!$ME) E(401, 'Connexion requise.', 'Login required.');
    if ($ME['role'] === 'candidat' && !$ME['verified'] && !$unverified) E(403, "Vérifiez d'abord votre adresse e-mail.", 'Please verify your email first.');
    if ($roles && !in_array($ME['role'], $roles, true)) E(403, 'Accès refusé.', 'Access denied.');
    return $ME;
}
function rate_limit(string $bucket, int $limit, int $window, string $fr, string $en): void {
    $k = $bucket . ':' . client_ip(); $t = time();
    $r = one('select hits, reset_at from rate_limits where k=?', [$k]);
    if (!$r || $r['reset_at'] < $t) { q('replace into rate_limits(k,hits,reset_at) values(?,1,?)', [$k, $t + $window]); return; }
    if ($r['hits'] >= $limit) E(429, $fr, $en);
    q('update rate_limits set hits=hits+1 where k=?', [$k]);
    if (random_int(1, 200) === 1) q('delete from rate_limits where reset_at<?', [$t]);
}
function new_session(string $uid): void {
    session_regenerate_id(true);
    $_SESSION = ['uid' => $uid];
}
function user_by(string $col, string $v): ?array { return one("select * from users where $col=?", [$v]); }
function profile_complete(array $p): bool { foreach (['first', 'last', 'dob', 'nat', 'country', 'city', 'phone'] as $k) if (empty($p[$k])) return false; return true; }

/* ---------- Règles métier ---------- */
function required_docs(array $a): array {
    $p = $a['prog'] ? one('select lang from programs where id=?', [$a['prog']]) : null;
    $r = ['id', 'diploma', 'transcript', 'cv', 'letter'];
    if ($p && $p['lang'] === 'EN') $r[] = 'lang';
    if ($a['country'] === 'canada') $r[] = 'photo';
    return $r;
}
function latest_docs(string $appId): array {
    $out = [];
    foreach (all('select id,type,status,version from documents where app=? order by type, version desc', [$appId]) as $d)
        if (!isset($out[$d['type']])) $out[$d['type']] = $d;
    return $out;
}
function missing(array $a, array $okStatuses = []): array {
    $have = latest_docs($a['id']); $miss = [];
    foreach (required_docs($a) as $k) if (!isset($have[$k]) || ($okStatuses && !in_array($have[$k]['status'], $okStatuses, true))) $miss[] = $k;
    return $miss;
}
function json_push(string $appId, string $col, array $item): void {
    $r = one("select $col from applications where id=?", [$appId]);
    $arr = jd($r[$col] ?? null); $arr[] = $item;
    q("update applications set $col=? where id=?", [je($arr), $appId]);
}
function set_status(array $a, string $s, string $note = ''): void {
    global $ME;
    json_push($a['id'], 'history', ['s' => $s, 'at' => now_iso(), 'by' => $ME['name'], 'note' => $note]);
    q('update applications set status=? where id=?', [$s, $a['id']]);
    $c = one('select email from users where id=?', [$a['uid']]);
    $subj = ['incomplete' => 'Campus Monde — pièce(s) à compléter', 'transmitted' => 'Campus Monde — dossier transmis', 'admitted' => 'Campus Monde — décision reçue', 'refused' => 'Campus Monde — décision reçue', 'pending' => 'Campus Monde — décision reçue', 'submitted' => 'Campus Monde — candidature reçue'][$s] ?? 'Campus Monde — mise à jour de votre dossier';
    mail_to($c['email'], $subj, "Bonjour, votre dossier {$a['ref']} est passé au statut « " . STATUS_FR[$s] . " ». Connectez-vous à votre espace étudiant pour consulter le détail.");
    audit('Statut → ' . STATUS_FR[$s] . ($note ? " ($note)" : ''), $a['ref']);
}
// Accès à un dossier : le candidat propriétaire, les responsables/admins, ou l'agent affecté.
function access_app(?array $u, $id): ?array {
    if (!$u || !preg_match('/^[0-9a-f-]{36}$/i', (string)$id)) return null;
    $a = one('select * from applications where id=?', [$id]);
    if (!$a) return null;
    if ($u['role'] === 'candidat') return $a['uid'] === $u['id'] ? $a : null;
    if ($a['status'] === 'draft') return null;
    if (is_mgr($u) || $a['agent'] === $u['id']) return $a;
    return null;
}
function app_or_404($id, string $fr = 'Dossier introuvable.', string $en = 'File not found.'): array {
    global $ME; $a = access_app($ME, $id); if (!$a) E(404, $fr, $en); return $a;
}

/* ---------- Formats de sortie ---------- */
function pub_user(array $x): array {
    return ['photo' => !empty($x['photo']) ? substr(sha1($x['photo']), 0, 10) : null, 'id' => $x['id'], 'email' => $x['email'], 'name' => $x['name'], 'role' => $x['role'], 'verified' => (bool)$x['verified'], 'created' => iso($x['created']), 'mkt' => (bool)$x['mkt'], 'profile' => (object)jd($x['profile'])];
}
function pub_inst(array $i): array { $i['verified'] = iso($i['verified']); return $i; }
function pub_prog(array $p): array { $p['open'] = (bool)$p['open']; return $p; }

/* =========================================================
   Routage
   ========================================================= */
function handle_api(string $method, string $path): void {
    global $ME;
    try {
        // Protection CSRF : en-tête personnalisé obligatoire + même origine pour toute écriture.
        if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'CampusMonde') E(403, 'Requête refusée.', 'Request refused.');
            $o = $_SERVER['HTTP_ORIGIN'] ?? '';
            if ($o !== '') {
                $oh = parse_url($o, PHP_URL_HOST) . (parse_url($o, PHP_URL_PORT) ? ':' . parse_url($o, PHP_URL_PORT) : '');
                $h = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? ($_SERVER['HTTP_HOST'] ?? '');
                if (strcasecmp($oh, $h) !== 0 && strcasecmp((string)parse_url($o, PHP_URL_HOST), explode(':', $h)[0]) !== 0) E(403, 'Origine refusée.', 'Origin refused.');
            }
        }
        if ($path === '/api/health') { q('select 1'); send_json(['ok' => true]); }

        install();
        start_session();
        if (!empty($_SESSION['uid'])) {
            $ME = user_by('id', $_SESSION['uid']);
            if (!$ME) unset($_SESSION['uid']);
        }
        $B = [];
        if (str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
            $raw = file_get_contents('php://input', false, null, 0, 200 * 1024 + 1);
            if (strlen((string)$raw) > 200 * 1024) E(413, 'Requête trop volumineuse.', 'Request too large.');
            $B = json_decode((string)$raw, true) ?: [];
        } elseif ($method === 'POST') $B = $_POST;
        if (str_starts_with($path, '/api/auth/')) rate_limit('auth', 40, 900, 'Trop de tentatives, réessayez plus tard.', 'Too many attempts, try again later.');

        route($method, $path, $B);
        E(404, 'Ressource introuvable.', 'Not found.');
    } catch (HttpDone $d) {
        // réponse déjà envoyée
    } catch (Throwable $e) {
        logline('[erreur] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        if (!headers_sent()) { http_response_code(500); header('Content-Type: application/json; charset=utf-8'); }
        echo je(['error' => ['fr' => 'Erreur serveur, veuillez réessayer.', 'en' => 'Server error, please try again.']]);
    }
}

function route(string $M, string $P, array $B): void {
    global $ME;
    $seg = explode('/', trim($P, '/')); // api, x, y, z
    $r = fn(string $m, string $pattern) => $M === $m && preg_match('#^' . $pattern . '$#', $P);
    $id = $seg[2] ?? '';

    /* ---------- État pour l'interface ---------- */
    if ($r('GET', '/api/state')) {
        $u = $ME;
        $out = ['session' => $u['id'] ?? null, 'mfaPending' => !empty($_SESSION['pendingUid']),
            'institutions' => array_map('pub_inst', all('select * from institutions order by country, name')),
            'programs' => array_map('pub_prog', all('select * from programs order by inst, id')),
            'users' => [], 'apps' => [], 'outbox' => [], 'audit' => [], 'contacts' => [], 'payments' => [], 'pay' => pay_settings(), 'interviews' => [], 'iv' => array_diff_key(iv_settings(), ['ranges' => 1]), 'photos' => photos_public()];
        if (SHOW_CODES) {
            if (!empty($_SESSION['pendingUid'])) $out['devCode'] = $_SESSION['devCode'] ?? null;
            elseif ($u && $u['role'] === 'candidat' && !$u['verified']) $out['devCode'] = $_SESSION['devVerify'] ?? null;
        }
        if (!$u) send_json($out);
        $out['interviews'] = $u['role'] === 'candidat'
            ? array_map(fn($x) => ['notes' => []] + iv_public($x), all('select * from interviews where uid=? order by slot desc', [$u['id']]))
            : array_map('iv_public',
                all("select * from interviews where slot >= ? or status in ('requested','confirmed') order by slot", [gmdate('Y-m-d H:i:s', time() - 60 * 86400)]));
        if ($u['role'] !== 'candidat') {
            $known = array_flip(array_column($out['users'] ?? [], 'id'));
            $miss = array_values(array_diff(array_unique(array_column($out['interviews'], 'uid')), array_keys($known)));
            $out['ivUsers'] = $miss ? (function ($ids) { [$ph, $v] = in_list($ids); return array_map('pub_user', all("select * from users where id in ($ph)", $v)); })($miss) : [];
        }
        $staff = all("select * from users where role<>'candidat'");
        if ($u['role'] === 'candidat') {
            $apps = all('select * from applications where uid=? order by created desc', [$u['id']]);
            $out['users'] = array_merge([pub_user($u)], array_map(fn($s) => ['id' => $s['id'], 'name' => $s['name'], 'role' => $s['role']], $staff));
            $out['outbox'] = all('select * from outbox where to_email=? order by at desc, id desc limit 100', [$u['email']]);
        } else {
            $apps = is_mgr($u)
                ? all("select * from applications where status<>'draft' order by created desc")
                : all("select * from applications where status<>'draft' and agent=? order by created desc", [$u['id']]);
            if ($u['role'] === 'admin') $out['users'] = array_map('pub_user', all('select * from users order by created'));
            else {
                $ids = array_values(array_unique(array_column($apps, 'uid')));
                [$ph, $vals] = in_list($ids);
                $c = $ids ? all("select * from users where id in ($ph)", $vals) : [];
                $out['users'] = array_map('pub_user', array_merge($staff, $c));
            }
            $out['contacts'] = array_map(fn($c) => ['at' => iso($c['at'])] + $c, all('select * from contacts order by at desc, id desc limit 300'));
            $out['outbox'] = is_mgr($u)
                ? all('select * from outbox order by at desc, id desc limit 300')
                : all('select * from outbox where to_email=? order by at desc, id desc limit 300', [$u['email']]);
            if (is_mgr($u)) $out['audit'] = array_map(fn($x) => ['at' => iso($x['at']), 'user' => $x['usr'], 'action' => $x['action'], 'target' => $x['target']], all('select * from audit order by id desc limit 300'));
        }
        $docs = [];
        if ($apps) {
            [$ph, $vals] = in_list(array_column($apps, 'id'));
            foreach (all("select id,app,type,name,`stored`,size,mime,version,status,comment,checked_by,checked_at,uploaded_at from documents where app in ($ph) order by uploaded_at, version", $vals) as $d)
                $docs[$d['app']][] = ['id' => $d['id'], 'type' => $d['type'], 'name' => $d['name'], 'stored' => $d['stored'], 'size' => (int)$d['size'], 'mime' => $d['mime'], 'version' => (int)$d['version'], 'status' => $d['status'], 'comment' => $d['comment'], 'checkedBy' => $d['checked_by'], 'checkedAt' => iso($d['checked_at']), 'uploadedAt' => iso($d['uploaded_at'])];
        }
        $cand = $u['role'] === 'candidat';
        $pays = [];
        if ($apps) {
            [$ph, $vals] = in_list(array_column($apps, 'id'));
            foreach (all("select * from payments where app in ($ph) order by created", $vals) as $py) $pays[$py['app']][] = pay_public($py);
        }
        if (is_mgr($u)) {
            $out['payments'] = array_map(fn($py) => pay_public($py) + ['appRef' => $py['aref'], 'candidate' => $py['cname']],
                all('select p.*, a.ref as aref, u.name as cname from payments p join applications a on a.id=p.app join users u on u.id=p.uid order by p.created desc limit 1000'));
        }
        $out['apps'] = array_map(fn($a) => [
            'id' => $a['id'], 'ref' => $a['ref'], 'uid' => $a['uid'], 'country' => $a['country'], 'inst' => $a['inst'], 'prog' => $a['prog'], 'level' => $a['level'], 'intake' => $a['intake'], 'alt' => $a['alt'],
            'status' => $a['status'], 'agent' => $a['agent'], 'history' => jd($a['history']), 'messages' => jd($a['messages']),
            'notes' => $cand ? [] : jd($a['notes']), 'transmission' => $cand ? null : jd($a['transmission'], null),
            'decision' => jd($a['decision'], null), 'created' => iso($a['created']), 'submitted' => iso($a['submitted']), 'receipt' => receipt_token($a),
            'docs' => $docs[$a['id']] ?? [], 'payments' => $pays[$a['id']] ?? []], $apps);
        $out['outbox'] = array_map(fn($m) => ['id' => (int)$m['id'], 'to' => $m['to_email'], 'subj' => $m['subj'], 'body' => $m['body'], 'at' => iso($m['at']), 'read' => (bool)$m['read'], 'sent' => (bool)$m['sent']], $out['outbox']);
        send_json($out);
    }

    /* ---------- Authentification ---------- */
    if ($r('POST', '/api/auth/register')) {
        $first = str_in($B['first'] ?? '', 80); $last = str_in($B['last'] ?? '', 80); $email = strtolower(str_in($B['email'] ?? '', 200)); $pw = $B['pw'] ?? null;
        if (!$first || !$last || !email_ok($email)) E(400, 'Informations incomplètes ou e-mail invalide.', 'Incomplete information or invalid email.');
        if (!pw_ok($pw)) E(400, 'Mot de passe : 8 caractères minimum dont 1 chiffre.', 'Password: at least 8 characters including 1 digit.');
        if (($B['consent'] ?? null) !== true) E(400, 'Le consentement à la politique de confidentialité est requis.', 'Consent to the privacy policy is required.');
        if (user_by('email', $email)) E(409, 'Un compte existe déjà avec cet e-mail.', 'An account already exists with this email.');
        $code = code6(); $uid = uuid();
        q("insert into users(id,email,name,role,pw,verified,code_hash,code_exp,mkt,profile,created) values(?,?,?,'candidat',?,0,?,?,?,?,?)",
            [$uid, $email, "$first $last", password_hash($pw, PASSWORD_BCRYPT, ['cost' => 12]), sha($code), in_min(15), ($B['mkt'] ?? null) === true ? 1 : 0, je(['first' => $first, 'last' => $last]), now_db()]);
        new_session($uid); $ME = user_by('id', $uid);
        if (SHOW_CODES) $_SESSION['devVerify'] = $code;
        mail_to($email, 'Campus Monde — vérifiez votre adresse e-mail', "Bienvenue ! Votre code de vérification est $code. Il expire dans 15 minutes.", $code);
        audit('Création de compte candidat', $email);
        ok();
    }
    if ($r('POST', '/api/auth/verify')) {
        $u = auth([], true);
        if (!$u['code_hash'] || past($u['code_exp']) || !hash_equals($u['code_hash'], sha(str_in($B['code'] ?? '', 10)))) E(400, 'Code incorrect ou expiré.', 'Incorrect or expired code.');
        q('update users set verified=1, code_hash=null, code_exp=null where id=?', [$u['id']]);
        mail_to($u['email'], 'Campus Monde — compte activé', 'Votre compte est activé. Complétez votre profil puis déposez votre candidature.');
        audit('E-mail vérifié', $u['email']);
        ok();
    }
    if ($r('POST', '/api/auth/resend')) {
        $u = auth([], true); $code = code6();
        q('update users set code_hash=?, code_exp=? where id=?', [sha($code), in_min(15), $u['id']]);
        if (SHOW_CODES) $_SESSION['devVerify'] = $code;
        mail_to($u['email'], 'Campus Monde — code de vérification', "Votre code de vérification est $code. Il expire dans 15 minutes.", $code);
        ok();
    }
    if ($r('POST', '/api/auth/login')) {
        $email = strtolower(str_in($B['email'] ?? '', 200));
        $u = $email ? user_by('email', $email) : null;
        if ($u && $u['locked_until'] && !past($u['locked_until'])) E(429, 'Compte temporairement bloqué après plusieurs échecs. Réessayez dans 15 minutes.', 'Account temporarily locked after several failures. Try again in 15 minutes.');
        $good = $u && is_string($B['pw'] ?? null) && password_verify($B['pw'], $u['pw']);
        if (!$good) {
            if ($u) {
                if ($u['fails'] + 1 >= 5) q('update users set fails=0, locked_until=? where id=?', [in_min(15), $u['id']]);
                else q('update users set fails=fails+1 where id=?', [$u['id']]);
            }
            audit('Échec de connexion', client_ip(), $email ?: 'inconnu');
            E(401, 'E-mail ou mot de passe incorrect.', 'Incorrect email or password.');
        }
        q('update users set fails=0, locked_until=null where id=?', [$u['id']]);
        if (in_array($u['role'], STAFF, true) && MFA_ON) {
            $code = code6();
            session_regenerate_id(true);
            $_SESSION = ['pendingUid' => $u['id'], 'mfaHash' => sha($code), 'mfaExp' => time() + 600, 'mfaTries' => 0];
            if (SHOW_CODES) $_SESSION['devCode'] = $code;
            mail_to($u['email'], 'Campus Monde — code de connexion', "Votre code de connexion au back-office est $code. Il expire dans 10 minutes.", $code);
            ok(['mfa' => true] + (SHOW_CODES ? ['devCode' => $code] : []));
        }
        new_session($u['id']); $ME = $u;
        audit('Connexion', '—');
        ok(['role' => $u['role']]);
    }
    if ($r('POST', '/api/auth/mfa')) {
        if (empty($_SESSION['pendingUid'])) E(400, 'Aucune connexion en attente.', 'No pending login.');
        $_SESSION['mfaTries'] = ($_SESSION['mfaTries'] ?? 0) + 1;
        if ($_SESSION['mfaTries'] > 5 || time() > ($_SESSION['mfaExp'] ?? 0)) { $_SESSION = []; E(400, 'Code expiré, reconnectez-vous.', 'Code expired, please log in again.'); }
        if (!hash_equals($_SESSION['mfaHash'], sha(str_in($B['code'] ?? '', 10)))) E(400, 'Code incorrect.', 'Incorrect code.');
        $uid = $_SESSION['pendingUid'];
        new_session($uid); $ME = user_by('id', $uid);
        audit('Connexion (MFA)', '—');
        ok(['role' => $ME['role']]);
    }
    if ($r('POST', '/api/auth/logout')) {
        if ($ME) audit('Déconnexion', '—');
        end_session(); ok();
    }
    if ($r('POST', '/api/auth/logout-all')) {
        $u = auth([], true);
        audit('Déconnexion de toutes les sessions', $u['email']);
        q('delete from sessions where uid=?', [$u['id']]);
        end_session(); ok();
    }
    if ($r('POST', '/api/auth/forgot')) {
        $email = strtolower(str_in($B['email'] ?? '', 200));
        $u = $email ? user_by('email', $email) : null;
        if ($u) {
            $code = code6();
            q('update users set reset_hash=?, reset_exp=? where id=?', [sha($code), in_min(15), $u['id']]);
            mail_to($u['email'], 'Campus Monde — réinitialisation du mot de passe', "Votre code de réinitialisation est $code. Il expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.", $code);
            audit('Demande de réinitialisation', '—', $email);
            if (SHOW_CODES) ok(['devCode' => $code]);
        }
        ok(); // réponse identique que le compte existe ou non
    }
    if ($r('POST', '/api/auth/reset')) {
        $email = strtolower(str_in($B['email'] ?? '', 200));
        $u = $email ? user_by('email', $email) : null;
        if (!$u || !$u['reset_hash'] || past($u['reset_exp']) || !hash_equals($u['reset_hash'], sha(str_in($B['code'] ?? '', 10)))) E(400, 'Code invalide ou expiré.', 'Invalid or expired code.');
        if (!pw_ok($B['pw'] ?? null)) E(400, 'Mot de passe : 8 caractères minimum dont 1 chiffre.', 'Password: at least 8 characters including 1 digit.');
        q('update users set pw=?, reset_hash=null, reset_exp=null, fails=0, locked_until=null where id=?', [password_hash($B['pw'], PASSWORD_BCRYPT, ['cost' => 12]), $u['id']]);
        q('delete from sessions where uid=?', [$u['id']]);
        audit('Mot de passe réinitialisé', '—', $email);
        ok();
    }

    /* ---------- Candidat ---------- */
    if ($r('POST', '/api/profile')) {
        $u = auth(['candidat']); $p = [];
        foreach (['first', 'last', 'dob', 'nat', 'country', 'city', 'phone', 'emergency'] as $k) $p[$k] = str_in($B[$k] ?? '', 120);
        if ($p['dob'] && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $p['dob'])) E(400, 'Date de naissance invalide.', 'Invalid date of birth.');
        $name = trim("{$p['first']} {$p['last']}") ?: $u['name'];
        q('update users set profile=?, name=? where id=?', [je($p), $name, $u['id']]);
        audit('Profil mis à jour', $u['email']);
        ok();
    }
    /* ---------- Photo de profil (obligatoire pour les candidats) ---------- */
    if ($r('POST', '/api/profile/photo')) {
        $u = auth();
        $f = $_FILES['file'] ?? null;
        if ($f && in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) E(413, 'Photo trop volumineuse (2 Mo maximum).', 'Photo too large (max 2 MB).');
        if (!$f || $f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) E(400, 'Aucune photo reçue.', 'No photo received.');
        if ($f['size'] > 2 * 1024 * 1024) E(413, 'Photo trop volumineuse (2 Mo maximum).', 'Photo too large (max 2 MB).');
        $head = (string)file_get_contents($f['tmp_name'], false, null, 0, 8);
        $ext = str_starts_with($head, "\xFF\xD8\xFF") ? 'jpg' : ($head === "\x89PNG\r\n\x1A\n" ? 'png' : null);
        if (!$ext) E(400, 'Format refusé : photo JPG ou PNG uniquement.', 'Format rejected: JPG or PNG photo only.');
        $info = @getimagesize($f['tmp_name']);
        if (!$info || $info[0] < 150 || $info[1] < 150) E(400, 'Photo trop petite : 150 × 150 pixels minimum.', 'Photo too small: at least 150 × 150 pixels.');
        $dir = STORAGE . '/avatars';
        if (!is_dir($dir) && !mkdir($dir, 0770, true)) throw new RuntimeException('Dossier des photos non accessible');
        $name = $u['id'] . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
        if (!move_uploaded_file($f['tmp_name'], "$dir/$name")) throw new RuntimeException("Impossible d'enregistrer la photo");
        if (!empty($u['photo'])) @unlink("$dir/{$u['photo']}");
        q('update users set photo=? where id=?', [$name, $u['id']]);
        audit('Photo de profil mise à jour', $u['email']);
        ok();
    }
    if ($r('GET', '/api/avatar/[^/]+')) {
        $u = auth([], true);
        if (!preg_match('/^[0-9a-f-]{36}$/i', $id)) E(404, 'Photo introuvable.', 'Photo not found.');
        // Visible par la personne elle-même et par le personnel ; jamais publique
        if ($u['id'] !== $id && !in_array($u['role'], STAFF, true)) E(404, 'Photo introuvable.', 'Photo not found.');
        $x = one('select photo from users where id=?', [$id]);
        $file = $x && $x['photo'] ? STORAGE . '/avatars/' . basename($x['photo']) : '';
        if (!$file || !is_file($file)) E(404, 'Photo introuvable.', 'Photo not found.');
        header('Content-Type: ' . (str_ends_with($file, '.png') ? 'image/png' : 'image/jpeg'));
        header('Cache-Control: private, max-age=86400');
        header('Content-Length: ' . filesize($file));
        readfile($file);
        throw new HttpDone();
    }
    /* ---------- Changement de mot de passe (connecté) ---------- */
    if ($r('POST', '/api/auth/password')) {
        $u = auth([], true);
        if (!is_string($B['current'] ?? null) || !password_verify($B['current'], $u['pw'])) E(400, 'Mot de passe actuel incorrect.', 'Current password is incorrect.');
        if (!pw_ok($B['pw'] ?? null)) E(400, 'Nouveau mot de passe : 8 caractères minimum dont 1 chiffre.', 'New password: at least 8 characters including 1 digit.');
        q('update users set pw=? where id=?', [password_hash($B['pw'], PASSWORD_BCRYPT, ['cost' => 12]), $u['id']]);
        q('delete from sessions where uid=? and id<>?', [$u['id'], session_id()]);
        mail_to($u['email'], 'Campus Monde — mot de passe modifié', "Le mot de passe de votre compte a été modifié. Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement Campus Monde.");
        audit('Mot de passe modifié', $u['email']);
        ok();
    }
    if ($r('POST', '/api/outbox/read')) { $u = auth([], true); q('update outbox set `read`=1 where to_email=?', [$u['email']]); ok(); }
    if ($r('GET', '/api/me/export')) {
        $u = auth(['candidat']);
        $apps = all('select id,ref,status,country,inst,prog,intake,history,messages,created,submitted from applications where uid=?', [$u['id']]);
        foreach ($apps as &$a) {
            $a['history'] = jd($a['history']); $a['messages'] = jd($a['messages']); $a['created'] = iso($a['created']); $a['submitted'] = iso($a['submitted']);
            $a['documents'] = array_map(fn($d) => ['uploaded_at' => iso($d['uploaded_at'])] + $d, all('select type,name,version,status,uploaded_at from documents where app=?', [$a['id']]));
        }
        unset($a);
        audit('Export de ses données personnelles', $u['email']);
        header('Content-Disposition: attachment; filename="campus-monde-mes-donnees.json"');
        send_json(['compte' => ['email' => $u['email'], 'nom' => $u['name'], 'cree' => iso($u['created']), 'marketing' => (bool)$u['mkt'], 'photo_de_profil' => !empty($u['photo'])], 'profil' => (object)jd($u['profile']), 'candidatures' => $apps]);
    }

    if ($r('POST', '/api/apps')) {
        $u = auth(['candidat']); $country = $inst = $prog = '';
        if (!empty($B['prog'])) {
            $p = one('select p.id, p.inst, i.country from programs p join institutions i on i.id=p.inst where p.id=?', [str_in($B['prog'], 40)]);
            if ($p) { $prog = $p['id']; $inst = $p['inst']; $country = $p['country']; }
        }
        q('insert into app_ref_seq values()'); $n = (int)db()->lastInsertId();
        $ref = 'CM-' . gmdate('Y') . '-' . str_pad((string)$n, 4, '0', STR_PAD_LEFT);
        $aid = uuid();
        q("insert into applications(id,ref,uid,country,inst,prog,level,intake,status,history,messages,notes,created) values(?,?,?,?,?,?,'bac',?,'draft',?,'[]','[]',?)",
            [$aid, $ref, $u['id'], $country, $inst, $prog, 'Septembre ' . ((int)gmdate('Y') + 1), je([['s' => 'draft', 'at' => now_iso(), 'by' => $u['name']]]), now_db()]);
        audit('Brouillon de candidature créé', $ref);
        ok(['id' => $aid]);
    }
    if ($r('PATCH', '/api/apps/[^/]+')) {
        auth(['candidat']); $a = access_app($ME, $id);
        if (!$a || $a['status'] !== 'draft') E(404, 'Brouillon introuvable.', 'Draft not found.');
        $v = [];
        foreach (['country', 'inst', 'prog', 'level', 'intake', 'alt'] as $k) $v[$k] = array_key_exists($k, $B) ? str_in($B[$k], 200) : $a[$k];
        // Passage à l'étape suivante : tous les champs obligatoires doivent être remplis et cohérents
        if (($B['validate'] ?? null) === true) {
            $miss = [];
            $inst = $v['inst'] ? one('select id,country from institutions where id=?', [$v['inst']]) : null;
            $prog = $v['prog'] ? one('select id,inst from programs where id=?', [$v['prog']]) : null;
            if ($v['country'] === '' || !one('select 1 as x from institutions where country=? limit 1', [$v['country']])) $miss[] = ['Pays visé', 'Target country'];
            if (!$inst || $inst['country'] !== $v['country']) $miss[] = ['Établissement', 'Institution'];
            if (!$prog || $prog['inst'] !== $v['inst']) $miss[] = ['Programme', 'Programme'];
            if (!in_array($v['level'], ['bac', 'licence', 'master', 'autre'], true)) $miss[] = ["Niveau d'études actuel", 'Current level of study'];
            if ($v['intake'] === '') $miss[] = ['Rentrée souhaitée', 'Desired intake'];
            if ($miss) E(400, 'Champs obligatoires à compléter : ' . implode(', ', array_column($miss, 0)) . '.', 'Required fields missing: ' . implode(', ', array_column($miss, 1)) . '.');
        }
        q('update applications set country=?,inst=?,prog=?,level=?,intake=?,alt=? where id=?', [$v['country'], $v['inst'], $v['prog'], $v['level'], $v['intake'], $v['alt'], $a['id']]);
        ok();
    }
    if ($r('DELETE', '/api/apps/[^/]+')) {
        auth(['candidat']); $a = access_app($ME, $id);
        if (!$a || $a['status'] !== 'draft') E(404, 'Brouillon introuvable.', 'Draft not found.');
        if (app_paid($a['id'])) E(409, 'Ce brouillon a des frais de dossier payés : il ne peut pas être supprimé. Contactez Campus Monde pour toute demande.', 'This draft has a paid fee and cannot be deleted. Please contact Campus Monde.');
        foreach (all('select path from documents where app=?', [$a['id']]) as $d) @unlink(STORAGE . '/' . $d['path']);
        q('delete from applications where id=?', [$a['id']]);
        audit('Brouillon supprimé', $a['ref']);
        ok();
    }
    if ($r('POST', '/api/apps/[^/]+/submit')) {
        $u = auth(['candidat']); $a = access_app($ME, $id);
        if (!$a || $a['status'] !== 'draft') E(404, 'Brouillon introuvable.', 'Draft not found.');
        if (($B['exact'] ?? null) !== true || ($B['share'] ?? null) !== true) E(400, 'Merci de cocher les deux attestations.', 'Please tick both declarations.');
        if (!profile_complete(jd($u['profile']))) E(400, 'Complétez votre profil avant de soumettre.', 'Complete your profile before submitting.');
        if (empty($u['photo'])) E(400, 'Ajoutez votre photo de profil avant de soumettre.', 'Add your profile photo before submitting.');
        if (!$a['prog']) E(400, 'Choisissez un programme.', 'Choose a programme.');
        if (missing($a)) E(400, 'Toutes les pièces requises doivent être ajoutées.', 'All required documents must be uploaded.');
        if (pay_required() && !app_paid($a['id'])) E(402, 'Le paiement des frais de dossier est requis avant la soumission.', 'The application fee must be paid before submitting.');
        $ag = one("select u.id, u.email from users u where u.role='agent' order by (select count(*) from applications x where x.agent=u.id and x.status not in ('draft','withdrawn','closed','enrolled','refused')) asc, rand() limit 1");
        q('update applications set submitted=?, agent=? where id=?', [now_db(), $ag['id'] ?? null, $a['id']]);
        set_status($a, 'submitted');
        if ($ag) mail_to($ag['email'], '[Interne] Nouveau dossier', "Le dossier {$a['ref']} vous a été affecté.");
        ok();
    }
    if ($r('POST', '/api/apps/[^/]+/withdraw')) {
        auth(['candidat']); $a = access_app($ME, $id);
        if (!$a || $a['status'] === 'draft' || in_array($a['status'], FINAL_ST, true)) E(400, 'Action impossible.', 'Action not possible.');
        set_status($a, 'withdrawn', 'Retrait par le candidat');
        ok();
    }

    /* ---------- Paiement des frais de dossier ---------- */
    if ($r('POST', '/api/apps/[^/]+/pay')) {
        $u = auth(['candidat']); $a = access_app($ME, $id);
        if (!$a || $a['status'] !== 'draft') E(404, 'Brouillon introuvable.', 'Draft not found.');
        $cfg = pay_settings();
        if ($cfg['fee'] <= 0 || !$cfg['methods']) E(400, "Aucun frais de dossier n'est demandé actuellement.", 'No application fee is currently required.');
        if (app_paid($a['id'])) E(409, 'Les frais de ce dossier sont déjà payés.', 'The fee for this file has already been paid.');
        $method = str_in($B['method'] ?? '', 10);
        if (!in_array($method, $cfg['methods'], true)) E(400, 'Moyen de paiement non disponible.', 'Payment method not available.');
        $phone = '';
        if (PAY_METHODS[$method]['kind'] === 'momo') {
            $phone = normalize_phone(str_in($B['phone'] ?? '', 30), $method);
            if (!$phone) E(400, $method === 'mtn' ? 'Numéro MTN invalide : 9 chiffres commençant par 06 (ex. 06 123 45 67).' : 'Numéro Airtel invalide : 9 chiffres commençant par 05 ou 04 (ex. 05 123 45 67).', $method === 'mtn' ? 'Invalid MTN number: 9 digits starting with 06.' : 'Invalid Airtel number: 9 digits starting with 05 or 04.');
        }
        q("update payments set status='cancelled', updated=? where app=? and status='pending'", [now_db(), $a['id']]);
        $pid = uuid(); $pref = 'PAY-' . gmdate('ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
        q('insert into payments(id,ref,app,uid,method,phone,amount,currency,status,created,updated) values(?,?,?,?,?,?,?,?,?,?,?)', [$pid, $pref, $a['id'], $u['id'], $method, $phone, $cfg['fee'], $cfg['currency'], 'pending', now_db(), now_db()]);
        $p = one('select * from payments where id=?', [$pid]);
        try { $init = pay_provider_init($p); }
        catch (RuntimeException $e) {
            q("update payments set status='failed', note=?, updated=? where id=?", ['Prestataire non configuré', now_db(), $pid]);
            if ($e->getMessage() === 'PAY_PROVIDER_NOT_CONFIGURED') E(503, "Le paiement en ligne n'est pas encore activé. Contactez Campus Monde.", 'Online payment is not yet enabled. Please contact Campus Monde.');
            throw $e;
        }
        q('update payments set provider=?, provider_ref=?, updated=? where id=?', [$init['provider'] ?? '', $init['provider_ref'] ?? '', now_db(), $pid]);
        audit('Paiement initié (' . PAY_METHODS[$method]['fr'] . ', ' . money($cfg['fee'], $cfg['currency']) . ", $pref)", $a['ref']);
        ok(['payment' => pay_public(one('select * from payments where id=?', [$pid])), 'redirect' => $init['redirect'] ?? null]);
    }
    if ($r('GET', '/api/payments/[^/]+')) {
        $u = auth();
        $p = preg_match('/^[0-9a-f-]{36}$/i', $id) ? one('select * from payments where id=?', [$id]) : null;
        if (!$p || !access_app($ME, $p['app'])) E(404, 'Paiement introuvable.', 'Payment not found.');
        if ($p['status'] === 'pending' && PAY_MODE !== 'simulation') {
            $st = pay_provider_check($p);
            if ($st !== 'pending') { pay_settle($p, $st); $p = one('select * from payments where id=?', [$id]); }
        }
        send_json(['payment' => pay_public($p)]);
    }
    if ($r('POST', '/api/payments/[^/]+/simulate')) {
        $u = auth(['candidat']);
        if (PAY_MODE !== 'simulation' || PROD) E(403, 'Simulation désactivée.', 'Simulation disabled.');
        $p = preg_match('/^[0-9a-f-]{36}$/i', $id) ? one('select * from payments where id=?', [$id]) : null;
        if (!$p || $p['uid'] !== $u['id']) E(404, 'Paiement introuvable.', 'Payment not found.');
        if ($p['status'] !== 'pending') E(409, 'Ce paiement est déjà traité.', 'This payment has already been processed.');
        pay_settle($p, ($B['result'] ?? '') === 'paid' ? 'paid' : 'failed');
        send_json(['payment' => pay_public(one('select * from payments where id=?', [$id]))]);
    }
    if ($r('POST', '/api/payments/[^/]+/cancel')) {
        $u = auth(['candidat']);
        $p = preg_match('/^[0-9a-f-]{36}$/i', $id) ? one('select * from payments where id=?', [$id]) : null;
        if (!$p || $p['uid'] !== $u['id']) E(404, 'Paiement introuvable.', 'Payment not found.');
        if ($p['status'] === 'pending') q("update payments set status='cancelled', updated=? where id=?", [now_db(), $p['id']]);
        ok();
    }
    if ($r('POST', '/api/payments/[^/]+/refund')) {
        $u = auth(['admin']);
        $p = preg_match('/^[0-9a-f-]{36}$/i', $id) ? one('select * from payments where id=?', [$id]) : null;
        if (!$p) E(404, 'Paiement introuvable.', 'Payment not found.');
        if ($p['status'] !== 'paid') E(409, 'Seul un paiement confirmé peut être remboursé.', 'Only a confirmed payment can be refunded.');
        $note = str_in($B['note'] ?? '', 250);
        if ($note === '') E(400, 'Indiquez le motif et la référence du remboursement.', 'Give the reason and refund reference.');
        q("update payments set status='refunded', note=?, updated=? where id=?", [$note, now_db(), $p['id']]);
        $a = one('select ref from applications where id=?', [$p['app']]); $c = one('select email from users where id=?', [$p['uid']]);
        mail_to($c['email'], 'Campus Monde — remboursement des frais de dossier', 'Le paiement ' . $p['ref'] . ' de ' . money((int)$p['amount'], $p['currency']) . " pour le dossier {$a['ref']} a été remboursé. Motif : $note");
        audit('Paiement remboursé (' . $p['ref'] . ", $note)", $a['ref']);
        ok();
    }
    if ($r('PATCH', '/api/settings')) {
        auth(['admin']);
        if (array_key_exists('fee', $B)) {
            $fee = filter_var($B['fee'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 10000000]]);
            if ($fee === false) E(400, 'Montant invalide.', 'Invalid amount.');
            set_setting('fee_amount', (string)$fee); audit('Frais de dossier → ' . money($fee, setting('fee_currency', 'XAF')), 'Réglages');
        }
        if (array_key_exists('methods', $B) && is_array($B['methods'])) {
            $m = array_values(array_intersect(array_keys(PAY_METHODS), $B['methods']));
            set_setting('pay_methods', implode(',', $m)); audit('Moyens de paiement → ' . ($m ? implode(', ', $m) : 'aucun'), 'Réglages');
        }
        ok();
    }

    /* ---------- Documents (stockage privé hors du dossier public, jamais d'URL directe) ---------- */
    if ($r('POST', '/api/apps/[^/]+/docs')) {
        auth(['candidat']); $a = access_app($ME, $id);
        $type = str_in($_POST['type'] ?? '', 20);
        if (!$a || !isset(DOC_FR[$type])) E(404, 'Dossier introuvable.', 'File not found.');
        $latest = latest_docs($a['id'])[$type] ?? null;
        $open = in_array($a['status'], ['draft', 'submitted', 'review', 'incomplete'], true) || ($latest && in_array($latest['status'], ['replace', 'illegible', 'expired'], true));
        if (!$open || in_array($a['status'], FINAL_ST, true)) E(403, "Le dépôt de pièces n'est plus possible à cette étape.", 'Uploads are no longer possible at this stage.');
        $f = $_FILES['file'] ?? null;
        if ($f && in_array($f['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) E(413, 'Fichier trop volumineux (5 Mo maximum).', 'File too large (max 5 MB).');
        if (!$f || $f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) E(400, 'Aucun fichier reçu.', 'No file received.');
        if ($f['size'] > 5 * 1024 * 1024) E(413, 'Fichier trop volumineux (5 Mo maximum).', 'File too large (max 5 MB).');
        $head = (string)file_get_contents($f['tmp_name'], false, null, 0, 8);
        $mime = str_starts_with($head, '%PDF') ? 'application/pdf' : (str_starts_with($head, "\xFF\xD8\xFF") ? 'image/jpeg' : ($head === "\x89PNG\r\n\x1A\n" ? 'image/png' : null));
        if (!$mime || !preg_match('/\.(pdf|jpe?g|png)$/i', $f['name'])) E(400, 'Format refusé : PDF, JPG ou PNG uniquement.', 'Format rejected: PDF, JPG or PNG only.');
        if (!scan_file($f['tmp_name'])) E(400, "Fichier refusé par l'analyse de sécurité.", 'File rejected by security scan.');
        $v = (int)(one('select max(version) as v from documents where app=? and type=?', [$a['id'], $type])['v'] ?? 0) + 1;
        $ext = ['application/pdf' => 'pdf', 'image/jpeg' => 'jpg', 'image/png' => 'png'][$mime];
        $stored = "{$a['ref']}_{$type}_v$v.$ext";
        $did = uuid(); $rel = $a['id'] . '/' . $did . '.' . $ext;
        if (!is_dir(STORAGE . '/' . $a['id']) && !mkdir(STORAGE . '/' . $a['id'], 0770, true)) throw new RuntimeException('Dossier de stockage non accessible : ' . STORAGE);
        if (!move_uploaded_file($f['tmp_name'], STORAGE . '/' . $rel)) throw new RuntimeException("Impossible d'enregistrer le fichier");
        q('insert into documents(id,app,type,name,`stored`,size,mime,version,uploaded_at,path) values(?,?,?,?,?,?,?,?,?,?)', [$did, $a['id'], $type, str_in($f['name'], 180), $stored, (int)$f['size'], $mime, $v, now_db(), $rel]);
        audit('Document déposé (' . DOC_FR[$type] . ", v$v)", $a['ref']);
        if ($a['status'] === 'incomplete' && !missing($a, ['ok', 'pending'])) set_status($a, 'review', 'Pièces complétées par le candidat');
        if ($a['agent'] && $a['status'] !== 'draft') { $g = one('select email from users where id=?', [$a['agent']]); if ($g) mail_to($g['email'], '[Interne] Nouveau document', "Le candidat a déposé un document sur le dossier {$a['ref']}."); }
        ok();
    }
    if ($r('GET', '/api/docs/[^/]+')) {
        auth();
        if (!preg_match('/^[0-9a-f-]{36}$/i', $id)) E(404, 'Document introuvable.', 'Document not found.');
        $d = one('select * from documents where id=?', [$id]);
        $a = $d ? access_app($ME, $d['app']) : null;
        $file = $d ? STORAGE . '/' . $d['path'] : '';
        if (!$a || !is_file($file)) E(404, 'Document introuvable.', 'Document not found.');
        audit('Consultation de document', "{$a['ref']} / {$d['stored']}");
        header('Content-Type: ' . $d['mime']);
        header('Content-Disposition: inline; filename="' . $d['stored'] . '"');
        header('Cache-Control: private, no-store');
        header('Content-Length: ' . filesize($file));
        readfile($file);
        throw new HttpDone();
    }
    if ($r('POST', '/api/docs/[^/]+/status')) {
        $u = auth(STAFF);
        if (!preg_match('/^[0-9a-f-]{36}$/i', $id)) E(404, 'Document introuvable.', 'Document not found.');
        $d = one('select id,app,type from documents where id=?', [$id]);
        $a = $d ? access_app($ME, $d['app']) : null;
        $s = str_in($B['status'] ?? '', 20);
        if (!$a || !isset(DOCST_FR[$s])) E(404, 'Document introuvable.', 'Document not found.');
        $comment = ['illegible' => 'Document illisible, merci de le renvoyer.', 'expired' => 'Document expiré, merci de fournir une version valide.', 'replace' => 'Merci de remplacer ce document.'][$s] ?? '';
        q('update documents set status=?, comment=?, checked_by=?, checked_at=? where id=?', [$s, $comment, $u['name'], now_db(), $d['id']]);
        audit('Contrôle pièce : ' . DOC_FR[$d['type']] . ' → ' . DOCST_FR[$s], $a['ref']);
        if ($a['status'] === 'submitted') set_status($a, 'review');
        ok();
    }

    /* ---------- Échanges ---------- */
    if ($r('POST', '/api/apps/[^/]+/messages')) {
        $u = auth(); $a = access_app($ME, $id); $text = str_in($B['text'] ?? '', 2000);
        if (!$a || $text === '') E(404, 'Dossier introuvable.', 'File not found.');
        $cand = $u['role'] === 'candidat';
        json_push($a['id'], 'messages', ['from' => $cand ? 'candidat' : 'staff', 'name' => $u['name'], 'text' => $text, 'at' => now_iso()]);
        if ($cand) { if ($a['agent']) { $g = one('select email from users where id=?', [$a['agent']]); if ($g) mail_to($g['email'], '[Interne] Nouveau message', "Nouveau message du candidat sur le dossier {$a['ref']}."); } }
        else { $c = one('select email from users where id=?', [$a['uid']]); mail_to($c['email'], 'Campus Monde — nouveau message', "Vous avez un nouveau message concernant le dossier {$a['ref']}. Connectez-vous pour le lire."); }
        audit($cand ? 'Message candidat' : 'Message au candidat', $a['ref']);
        ok();
    }
    if ($r('POST', '/api/apps/[^/]+/notes')) {
        $u = auth(STAFF); $a = access_app($ME, $id); $text = str_in($B['text'] ?? '', 2000);
        if (!$a || $text === '') E(404, 'Dossier introuvable.', 'File not found.');
        json_push($a['id'], 'notes', ['author' => $u['name'], 'text' => $text, 'at' => now_iso()]);
        audit('Note interne ajoutée', $a['ref']);
        ok();
    }

    /* ---------- Traitement back-office ---------- */
    if ($r('POST', '/api/apps/[^/]+/assign')) {
        auth(['responsable', 'admin']); $a = app_or_404($id);
        $g = !empty($B['agent']) ? one("select id,name,email from users where id=? and role='agent'", [str_in($B['agent'], 40)]) : null;
        q('update applications set agent=? where id=?', [$g['id'] ?? null, $a['id']]);
        audit('Affectation à ' . ($g['name'] ?? '—'), $a['ref']);
        if ($g) mail_to($g['email'], '[Interne] Dossier affecté', "Le dossier {$a['ref']} vous a été affecté.");
        ok();
    }
    if ($r('POST', '/api/apps/[^/]+/status')) {
        $u = auth(STAFF); $a = app_or_404($id);
        $s = str_in($B['s'] ?? '', 20); $note = str_in($B['note'] ?? '', 300);
        $allowed = is_mgr($u) ? MGR_STATUSES : AGENT_STATUSES;
        if (!in_array($s, $allowed, true)) E(403, 'Changement de statut non autorisé pour votre rôle.', 'Status change not allowed for your role.');
        if (in_array($s, ['admitted', 'refused'], true) && !$a['decision']) E(400, 'Enregistrez la décision avec son justificatif dans le bloc « Décision ».', 'Record the decision with its proof in the “Decision” block.');
        if ($s === 'enrolled' && $note === '') E(400, 'Le statut « Inscrit » nécessite une preuve : précisez-la en commentaire.', '“Enrolled” requires proof: specify it in the comment.');
        if ($s === 'ready' && missing($a, ['ok'])) E(400, 'Toutes les pièces doivent être conformes avant validation.', 'All documents must be compliant before validation.');
        set_status($a, $s, $note);
        ok();
    }
    if ($r('POST', '/api/apps/[^/]+/ask-docs')) {
        $u = auth(STAFF); $a = app_or_404($id);
        $list = implode(', ', array_map(fn($k) => DOC_FR[$k], missing($a, ['ok', 'pending']))) ?: 'pièces à préciser par votre conseiller';
        json_push($a['id'], 'messages', ['from' => 'staff', 'name' => $u['name'], 'text' => "Merci de compléter votre dossier : $list.", 'at' => now_iso()]);
        set_status($a, 'incomplete', $list);
        ok();
    }
    if ($r('POST', '/api/apps/[^/]+/validate')) {
        auth(['responsable', 'admin']); $a = access_app($ME, $id);
        if (!$a || !in_array($a['status'], ['review', 'submitted'], true)) E(400, 'Validation impossible à cette étape.', 'Validation not possible at this stage.');
        if (missing($a, ['ok'])) E(400, 'Toutes les pièces doivent être conformes.', 'All documents must be compliant.');
        set_status($a, 'ready', 'Validation interne');
        ok();
    }
    if ($r('POST', '/api/apps/[^/]+/transmit')) {
        $u = auth(['responsable', 'admin']); $a = access_app($ME, $id);
        if (!$a || $a['status'] !== 'ready') E(400, 'Le dossier doit être « Prêt à transmettre ».', 'File must be “Ready to send”.');
        $t = ['channel' => str_in($B['channel'] ?? '', 60), 'recipient' => str_in($B['recipient'] ?? '', 200), 'date' => str_in($B['date'] ?? '', 10), 'docs' => str_in($B['docs'] ?? '', 300), 'ack' => str_in($B['ack'] ?? '', 300), 'by' => $u['name']];
        if ($t['recipient'] === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $t['date'])) E(400, 'Destinataire et date obligatoires.', 'Recipient and date are required.');
        q('update applications set transmission=? where id=?', [je($t), $a['id']]);
        set_status($a, 'transmitted', "{$t['channel']} → {$t['recipient']}");
        ok();
    }
    if ($r('POST', '/api/apps/[^/]+/decision')) {
        $u = auth(['responsable', 'admin']); $a = access_app($ME, $id);
        $value = str_in($B['value'] ?? '', 20); $ref = str_in($B['ref'] ?? '', 300); $date = str_in($B['date'] ?? '', 10);
        if (!$a || !in_array($a['status'], ['transmitted', 'pending'], true)) E(400, 'Décision possible après transmission uniquement.', 'Decision only possible after submission.');
        if (!in_array($value, ['admitted', 'refused', 'pending'], true) || $ref === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) E(400, 'Décision, référence et date obligatoires.', 'Decision, reference and date are required.');
        if ($value !== 'pending') q('update applications set decision=? where id=?', [je(['value' => $value, 'ref' => $ref, 'date' => $date, 'by' => $u['name']]), $a['id']]);
        set_status($a, $value, 'Réf. ' . $ref);
        ok();
    }
    if ($r('GET', '/api/export.csv')) {
        auth(['responsable', 'admin']);
        $rows = all("select a.*, u.name as cname, u.email as cemail, g.name as gname, i.name as iname, p.fr as pname
            from applications a join users u on u.id=a.uid left join users g on g.id=a.agent left join institutions i on i.id=a.inst left join programs p on p.id=a.prog
            where a.status<>'draft' order by a.created");
        $cell = fn($v) => '"' . preg_replace('/^[=+\-@]/', "'$0", str_replace('"', '""', (string)($v ?? ''))) . '"';
        $lines = [implode(';', array_map($cell, ['Référence', 'Candidat', 'E-mail', 'Pays', 'Établissement', 'Programme', 'Rentrée', 'Statut', 'Agent', 'Soumis le', 'Transmis le', 'Décision', 'Paiement', 'Montant', 'Réf. paiement']))];
        foreach ($rows as $a) {
            $t = jd($a['transmission'], null); $d = jd($a['decision'], null); $py = app_paid($a['id']);
            $lines[] = implode(';', array_map($cell, [$a['ref'], $a['cname'], $a['cemail'], $a['country'], $a['iname'], $a['pname'], $a['intake'], STATUS_FR[$a['status']] ?? $a['status'], $a['gname'], $a['submitted'] ? substr($a['submitted'], 0, 10) : '', $t['date'] ?? '', $d ? (STATUS_FR[$d['value']] ?? '') : '', $py ? (PAY_METHODS[$py['method']]['fr'] ?? $py['method']) : 'Non payé', $py ? $py['amount'] : '', $py['ref'] ?? '']));
        }
        audit('Export CSV des dossiers', count($rows) . ' lignes');
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="campus-monde-dossiers-' . gmdate('Y-m-d') . '.csv"');
        echo "\xEF\xBB\xBF" . implode("\r\n", $lines);
        throw new HttpDone();
    }

    /* ---------- Vérification publique d'un reçu (QR code) ---------- */
    if ($r('GET', '/api/receipt/[^/]+')) {
        rate_limit('receipt', 60, 3600, 'Trop de vérifications, réessayez plus tard.', 'Too many checks, try again later.');
        $ref = str_in($id, 30); $t = strtoupper(preg_replace('/[^0-9A-Fa-f]/', '', (string)($_GET['t'] ?? '')));
        $a = one("select a.*, u.name as cname, p.fr as pfr, p.en as pen, i.name as iname from applications a join users u on u.id=a.uid left join programs p on p.id=a.prog left join institutions i on i.id=a.inst where a.ref=?", [$ref]);
        $tok = $a ? receipt_token($a) : null;
        if (!$a || !$tok || strlen($t) !== 16 || !hash_equals($tok, $t)) E(404, 'Reçu introuvable ou code de vérification invalide.', 'Receipt not found or invalid verification code.');
        // Données minimales : le nom est abrégé, aucune coordonnée n'est exposée
        $parts = preg_split('/\s+/', trim(preg_replace('/\(.*\)/', '', $a['cname'])));
        $short = ($parts[0] ?? '') . (isset($parts[1]) ? ' ' . mb_substr($parts[1], 0, 1) . '.' : '');
        send_json(['ok' => true, 'ref' => $a['ref'], 'candidate' => $short, 'programme' => ['fr' => $a['pfr'], 'en' => $a['pen']], 'institution' => $a['iname'], 'country' => $a['country'], 'intake' => $a['intake'], 'submitted' => iso($a['submitted']), 'status' => $a['status']]);
    }

    /* ---------- Entretiens avec un conseiller ---------- */
    if ($r('GET', '/api/interviews/slots')) { auth(['candidat']); send_json(['slots' => array_map('iso', iv_free_slots()), 'settings' => array_diff_key(iv_settings(), ['ranges' => 1])]); }
    if ($r('POST', '/api/interviews')) {
        $u = auth(['candidat']); $c = iv_settings();
        if (!$c['enabled']) E(400, 'La prise de rendez-vous est momentanément fermée. Contactez Campus Monde.', 'Booking is temporarily closed. Please contact Campus Monde.');
        if (one("select 1 as x from interviews where uid=? and status in ('requested','confirmed') and slot>=?", [$u['id'], gmdate('Y-m-d H:i:s')]))
            E(409, 'Vous avez déjà un entretien à venir. Annulez-le pour en réserver un autre.', 'You already have an upcoming interview. Cancel it to book another one.');
        $slot = str_replace(['T', 'Z'], [' ', ''], substr(str_in($B['slot'] ?? '', 30), 0, 19));
        if (!in_array($slot, iv_free_slots(), true)) E(409, "Ce créneau n'est plus disponible. Choisissez-en un autre.", 'This slot is no longer available. Please choose another one.');
        $mode = str_in($B['mode'] ?? '', 12); if (!in_array($mode, $c['modes'], true)) E(400, "Choisissez le type d'entretien.", 'Choose the interview type.');
        $topic = str_in($B['topic'] ?? '', 40); if (!isset(IV_TOPICS[$topic])) $topic = 'autre';
        $phone = str_in($B['phone'] ?? '', 40); if ($mode === 'telephone' && !preg_match('/\d{8,}/', preg_replace('/\D/', '', $phone))) E(400, 'Indiquez le numéro sur lequel le conseiller doit vous appeler.', 'Give the number the adviser should call.');
        $app = null; if (!empty($B['app'])) { $a = access_app($ME, str_in($B['app'], 40)); $app = $a['id'] ?? null; }
        $iid = uuid(); $ref = 'RDV-' . strtoupper(bin2hex(random_bytes(3)));
        q('insert into interviews(id,ref,uid,app,slot,duration,mode,topic,message,phone,status,notes,created,updated) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [$iid, $ref, $u['id'], $app, $slot, $c['duration'], $mode, $topic, str_in($B['message'] ?? '', 1000), $phone, 'requested', '[]', now_db(), now_db()]);
        $iv = one('select * from interviews where id=?', [$iid]);
        iv_mail($iv, 'requested');
        foreach (all("select email from users where role in ('responsable','admin')") as $m) mail_to($m['email'], '[Interne] Nouvelle demande d\'entretien', "{$u['name']} — " . iv_label($slot) . ' (' . IV_MODES[$mode] . ', ' . IV_TOPICS[$topic] . ')');
        audit('Entretien demandé (' . IV_MODES[$mode] . ', ' . iv_label($slot) . ')', $ref);
        ok(['interview' => iv_public($iv)]);
    }
    if ($r('POST', '/api/interviews/[^/]+/cancel')) {
        $u = auth();
        $iv = preg_match('/^[0-9a-f-]{36}$/i', $id) ? one('select * from interviews where id=?', [$id]) : null;
        if (!$iv || ($u['role'] === 'candidat' && $iv['uid'] !== $u['id'])) E(404, 'Entretien introuvable.', 'Interview not found.');
        if (!in_array($iv['status'], ['requested', 'confirmed'], true)) E(409, 'Cet entretien ne peut plus être annulé.', 'This interview can no longer be cancelled.');
        q("update interviews set status='cancelled', updated=? where id=?", [now_db(), $iv['id']]);
        iv_mail($iv, 'cancelled');
        audit('Entretien annulé' . ($u['role'] === 'candidat' ? ' par le candidat' : ''), $iv['ref']);
        ok();
    }
    if ($r('PATCH', '/api/interviews/[^/]+')) {
        $u = auth(STAFF);
        $iv = preg_match('/^[0-9a-f-]{36}$/i', $id) ? one('select * from interviews where id=?', [$id]) : null;
        if (!$iv) E(404, 'Entretien introuvable.', 'Interview not found.');
        if (array_key_exists('staff', $B)) {
            $s = $B['staff'] ? one("select id,name from users where id=? and role<>'candidat'", [str_in($B['staff'], 40)]) : null;
            q('update interviews set staff=?, updated=? where id=?', [$s['id'] ?? null, now_db(), $iv['id']]);
            audit('Entretien attribué à ' . ($s['name'] ?? '—'), $iv['ref']);
        }
        if (array_key_exists('link', $B)) {
            $link = str_in($B['link'], 300);
            if ($link !== '' && !preg_match('#^https://#', $link)) E(400, 'Le lien de visioconférence doit commencer par https://', 'The video link must start with https://');
            q('update interviews set link=?, updated=? where id=?', [$link, now_db(), $iv['id']]);
        }
        if (!empty($B['note'])) {
            $n = jd($iv['notes']); $n[] = ['author' => $u['name'], 'text' => str_in($B['note'], 2000), 'at' => now_iso()];
            q('update interviews set notes=?, updated=? where id=?', [je($n), now_db(), $iv['id']]);
        }
        if (!empty($B['status'])) {
            $st = str_in($B['status'], 12);
            $allowed = ['requested' => ['confirmed', 'cancelled'], 'confirmed' => ['done', 'no_show', 'cancelled'], 'done' => [], 'no_show' => ['done'], 'cancelled' => []][$iv['status']] ?? [];
            if (!in_array($st, $allowed, true)) E(400, 'Changement de statut impossible.', 'Status change not allowed.');
            if ($st === 'confirmed' && !$iv['staff'] && empty($B['staff'])) q('update interviews set staff=? where id=?', [$u['id'], $iv['id']]);
            q('update interviews set status=?, updated=? where id=?', [$st, now_db(), $iv['id']]);
            iv_mail(one('select * from interviews where id=?', [$iv['id']]), $st);
            audit('Entretien → ' . IV_STATUS[$st], $iv['ref']);
        }
        ok();
    }
    if ($r('PATCH', '/api/settings/interviews')) {
        auth(['admin']);
        $days = array_values(array_filter(array_map('intval', (array)($B['days'] ?? [])), fn($d) => $d >= 1 && $d <= 7));
        $hours = str_in($B['hours'] ?? '', 120);
        foreach (array_filter(explode(',', $hours)) as $h) {
            if (!preg_match('/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/', trim($h), $m) || ((int)$m[3] * 60 + (int)$m[4]) <= ((int)$m[1] * 60 + (int)$m[2]))
                E(400, 'Plages horaires invalides. Exemple : 09:00-12:00,14:00-17:00', 'Invalid time ranges. Example: 09:00-12:00,14:00-17:00');
        }
        $modes = array_values(array_intersect(array_keys(IV_MODES), (array)($B['modes'] ?? [])));
        if (!$days || !$modes || $hours === '') E(400, 'Choisissez au moins un jour, une plage horaire et un type d\'entretien.', 'Choose at least one day, one time range and one interview type.');
        set_setting('iv_enabled', !empty($B['enabled']) ? '1' : '0'); set_setting('iv_days', implode(',', $days)); set_setting('iv_hours', preg_replace('/\s+/', '', $hours));
        set_setting('iv_modes', implode(',', $modes));
        foreach (['duration' => [15, 120], 'notice' => [0, 168], 'horizon' => [1, 90], 'capacity' => [1, 10]] as $k => [$a, $b])
            if (isset($B[$k])) set_setting("iv_$k", (string)max($a, min($b, (int)$B[$k])));
        audit("Réglages des entretiens mis à jour", 'Réglages');
        ok();
    }

    /* ---------- Photos du site : copie locale (administrateur) ---------- */
    if ($r('POST', '/api/admin/photos/sync')) {
        auth(['admin']);
        @set_time_limit(300);
        $res = photos_sync(($B['force'] ?? null) === true);
        $ok = count(array_filter($res, fn($x) => $x !== 'échec'));
        audit("Photos du site copiées sur le serveur ($ok/" . count($res) . ')', 'Photos');
        ok(['result' => $res]);
    }

    /* ---------- Contact ---------- */
    if ($r('POST', '/api/contact')) {
        rate_limit('contact', 10, 3600, 'Trop de messages envoyés, réessayez plus tard.', 'Too many messages, try again later.');
        if (!empty($B['website'])) ok(); // pot de miel anti-robots
        $c = ['kind' => str_in($B['kind'] ?? '', 30), 'name' => str_in($B['name'] ?? '', 120), 'email' => str_in($B['email'] ?? '', 200), 'phone' => str_in($B['phone'] ?? '', 40), 'dest' => str_in($B['dest'] ?? '', 60), 'msg' => str_in($B['msg'] ?? '', 3000)];
        if ($c['name'] === '' || !email_ok($c['email']) || $c['msg'] === '' || ($B['consent'] ?? null) !== true) E(400, 'Merci de remplir les champs obligatoires.', 'Please fill in the required fields.');
        q('insert into contacts(at,kind,name,email,phone,dest,msg) values(?,?,?,?,?,?,?)', [now_db(), $c['kind'], $c['name'], $c['email'], $c['phone'], $c['dest'], $c['msg']]);
        mail_to($c['email'], 'Campus Monde — demande bien reçue', 'Merci pour votre message. Un conseiller Campus Monde vous répondra rapidement.');
        foreach (all("select email from users where role in ('responsable','admin')") as $m) mail_to($m['email'], "[Interne] Nouvelle demande d'information", "{$c['kind']} — {$c['name']}");
        audit('Demande de contact reçue', $c['kind'], $c['email']);
        ok();
    }

    /* ---------- Administration ---------- */
    if ($r('PATCH', '/api/institutions/[^/]+')) {
        auth(['admin']);
        $i = one('select * from institutions where id=?', [str_in($id, 40)]);
        if (!$i) E(404, 'Établissement introuvable.');
        if (!empty($B['relation'])) {
            if (!in_array($B['relation'], ['partenaire', 'discussion', 'informatif'], true)) E(400, 'Statut invalide.');
            q('update institutions set relation=? where id=?', [$B['relation'], $i['id']]);
            audit('Statut de relation → ' . $B['relation'], $i['name']);
        }
        if (!empty($B['verify'])) { q('update institutions set verified=? where id=?', [now_db(), $i['id']]); audit('Fiche établissement vérifiée', $i['name']); }
        ok();
    }
    if ($r('POST', '/api/institutions')) {
        auth(['admin']);
        $name = str_in($B['name'] ?? '', 160); $country = str_in($B['country'] ?? '', 30); $city = str_in($B['city'] ?? '', 80); $site = str_in($B['site'] ?? '', 200);
        if ($name === '' || $country === '' || !preg_match('#^https?://#', $site)) E(400, 'Nom, pays et site officiel (https://…) obligatoires.', 'Name, country and official website are required.');
        $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', (string)iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name)), '-'));
        $iid = substr($slug ?: 'etab', 0, 30) . '-' . bin2hex(random_bytes(2));
        q("insert into institutions(id,name,country,city,type,relation,site) values(?,?,?,?,'Établissement','informatif',?)", [$iid, $name, $country, $city, $site]);
        audit('Établissement ajouté', $name);
        ok();
    }
    if ($r('POST', '/api/programs')) {
        auth(['admin']);
        $inst = str_in($B['inst'] ?? '', 40); $fr = str_in($B['fr'] ?? '', 200); $en = str_in($B['en'] ?? '', 200) ?: $fr; $level = str_in($B['level'] ?? '', 20);
        $lang = str_in($B['lang'] ?? '', 2) === 'EN' ? 'EN' : 'FR'; $dur = str_in($B['dur'] ?? '', 40);
        if (!one('select 1 as x from institutions where id=?', [$inst]) || $fr === '' || !in_array($level, ['licence', 'master'], true)) E(400, 'Informations de formation incomplètes.', 'Incomplete programme information.');
        q('insert into programs(id,inst,fr,en,level,lang,dur) values(?,?,?,?,?,?,?)', ['p' . bin2hex(random_bytes(4)), $inst, $fr, $en, $level, $lang, $dur]);
        audit('Formation ajoutée', $fr);
        ok();
    }
    if ($r('PATCH', '/api/programs/[^/]+')) {
        auth(['admin']);
        $p = one('select * from programs where id=?', [str_in($id, 40)]);
        if (!$p) E(404, 'Formation introuvable.');
        if (array_key_exists('open', $B)) { q('update programs set `open`=? where id=?', [$B['open'] === true ? 1 : 0, $p['id']]); audit(($B['open'] ? 'Ouverture' : 'Fermeture') . ' des candidatures', $p['fr']); }
        if (array_key_exists('period', $B)) q('update programs set period=? where id=?', [str_in($B['period'], 80), $p['id']]);
        ok();
    }
    if ($r('PATCH', '/api/users/[^/]+')) {
        $u = auth(['admin']);
        $x = one('select * from users where id=?', [str_in($id, 40)]);
        $role = str_in($B['role'] ?? '', 20);
        if (!$x || $x['role'] === 'candidat' || !in_array($role, STAFF, true)) E(400, 'Modification impossible.', 'Change not possible.');
        if ($x['id'] === $u['id']) E(400, 'Vous ne pouvez pas modifier votre propre rôle.', 'You cannot change your own role.');
        q('update users set role=? where id=?', [$role, $x['id']]);
        q('delete from sessions where uid=?', [$x['id']]);
        audit('Rôle → ' . ROLE_FR[$role], $x['email']);
        ok();
    }
    if ($r('POST', '/api/users')) {
        auth(['admin']);
        $name = str_in($B['name'] ?? '', 120); $email = strtolower(str_in($B['email'] ?? '', 200)); $role = str_in($B['role'] ?? '', 20);
        if ($name === '' || !email_ok($email) || !in_array($role, STAFF, true)) E(400, 'Informations incomplètes.', 'Incomplete information.');
        if (user_by('email', $email)) E(409, 'E-mail déjà utilisé.', 'Email already in use.');
        $temp = rtrim(strtr(base64_encode(random_bytes(6)), '+/', '-_'), '=') . '7';
        q("insert into users(id,email,name,role,pw,verified,profile,created) values(?,?,?,?,?,1,'{}',?)", [uuid(), $email, $name, $role, password_hash($temp, PASSWORD_BCRYPT, ['cost' => 12]), now_db()]);
        mail_to($email, 'Campus Monde — accès au back-office', 'Un compte ' . ROLE_FR[$role] . " a été créé pour vous. Mot de passe temporaire : $temp — à changer via « Mot de passe oublié » dès la première connexion.", $temp);
        audit('Compte personnel créé (' . ROLE_FR[$role] . ')', $email);
        ok(['temp' => $temp]);
    }
}

function end_session(): void {
    $_SESSION = [];
    if (session_status() === PHP_SESSION_ACTIVE) session_destroy();
    setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
}
// Point d'extension : brancher ici un antivirus (ex. ClamAV : clamdscan) avant l'enregistrement.
function scan_file(string $path): bool { return true; }
