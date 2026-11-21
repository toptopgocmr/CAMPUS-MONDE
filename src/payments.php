<?php
/* =========================================================
   CAMPUS MONDE — paiement des frais de dossier
   Moyens : MTN Mobile Money, Airtel Money, carte bancaire (Visa / Mastercard)

   PAY_MODE=simulation : aucun argent ne circule, le candidat (ou le testeur) confirme
                         ou refuse le paiement à l'écran. Activé par défaut hors production.
   PAY_MODE=live       : appel du prestataire réel (agrégateur Mobile Money / carte).
                         Brancher l'API du prestataire choisi dans pay_provider_init()
                         et pay_provider_check(), puis renseigner ses clés dans .env.

   Règle de sécurité : aucun numéro de carte n'est saisi ni stocké sur ce serveur.
   Le paiement par carte se fait toujours sur la page sécurisée du prestataire.
   ========================================================= */
declare(strict_types=1);

const PAY_METHODS = [
    'mtn'    => ['fr' => 'MTN Mobile Money', 'en' => 'MTN Mobile Money', 'kind' => 'momo'],
    'airtel' => ['fr' => 'Airtel Money', 'en' => 'Airtel Money', 'kind' => 'momo'],
    'card'   => ['fr' => 'Carte bancaire (Visa / Mastercard)', 'en' => 'Bank card (Visa / Mastercard)', 'kind' => 'card'],
];
const PAY_STATUS_FR = ['pending' => 'En attente', 'paid' => 'Payé', 'failed' => 'Échoué', 'cancelled' => 'Annulé', 'refunded' => 'Remboursé'];

function setting(string $k, string $def = ''): string { $r = one('select v from settings where k=?', [$k]); return $r ? $r['v'] : $def; }
function set_setting(string $k, string $v): void { q('insert into settings(k,v) values(?,?) on duplicate key update v=values(v)', [$k, $v]); }
function pay_settings(): array {
    $m = array_values(array_intersect(array_keys(PAY_METHODS), array_filter(explode(',', setting('pay_methods', 'mtn,airtel,card')))));
    return ['fee' => max(0, (int)setting('fee_amount', '0')), 'currency' => setting('fee_currency', 'XAF') ?: 'XAF', 'methods' => $m, 'mode' => PAY_MODE];
}
function pay_required(): bool { $s = pay_settings(); return $s['fee'] > 0 && $s['methods']; }
function app_paid(string $appId): ?array { return one("select * from payments where app=? and status='paid' order by paid_at desc limit 1", [$appId]); }
function money(int $n, string $cur): string { return number_format($n, 0, ',', ' ') . ' ' . ($cur === 'XAF' ? 'FCFA' : $cur); }

// Numéro congolais : 9 chiffres commençant par 0 (06 = MTN ; 05 / 04 = Airtel). Accepte +242 / 242.
function normalize_phone(string $p, string $method): ?string {
    $d = preg_replace('/\D+/', '', $p);
    if (str_starts_with($d, '242') && strlen($d) === 12) $d = substr($d, 3);
    if (strlen($d) === 8) $d = '0' . $d;
    if (!preg_match('/^0\d{8}$/', $d)) return null;
    if ($method === 'mtn' && !str_starts_with($d, '06')) return null;
    if ($method === 'airtel' && !preg_match('/^0[45]/', $d)) return null;
    return '242' . substr($d, 1);
}
function pay_public(array $p): array {
    return ['id' => $p['id'], 'ref' => $p['ref'], 'app' => $p['app'], 'method' => $p['method'], 'phone' => $p['phone'] ? '+' . substr($p['phone'], 0, 5) . '•••' . substr($p['phone'], -2) : '',
        'amount' => (int)$p['amount'], 'currency' => $p['currency'], 'status' => $p['status'], 'provider' => $p['provider'], 'providerRef' => $p['provider_ref'],
        'note' => $p['note'], 'created' => iso($p['created']), 'updated' => iso($p['updated']), 'paidAt' => iso($p['paid_at'])];
}

/* ---------- Prestataire ---------- */
// Démarre le paiement chez le prestataire. Retourne ['provider_ref' => …, 'redirect' => URL de la page de paiement (carte) ou null].
function pay_provider_init(array $p): array {
    if (PAY_MODE === 'simulation') return ['provider' => 'simulation', 'provider_ref' => 'SIM-' . strtoupper(bin2hex(random_bytes(5))), 'redirect' => null];
    // Mode live : à brancher sur le prestataire retenu (ex. agrégateur Mobile Money / carte).
    // 1. Mobile Money : demande de paiement (push USSD) vers $p['phone'] pour $p['amount'] $p['currency'], référence $p['ref'].
    // 2. Carte : création d'une session de paiement et retour de l'URL de la page sécurisée du prestataire.
    // Les clés d'API se lisent avec env('PAY_API_KEY') etc. Le prestataire confirme ensuite via le webhook.
    throw new RuntimeException('PAY_PROVIDER_NOT_CONFIGURED');
}
// Interroge le prestataire sur l'état d'un paiement en attente. Retourne 'pending' | 'paid' | 'failed'.
function pay_provider_check(array $p): string {
    return $p['status']; // en simulation, l'état change uniquement par confirmation à l'écran ; en live, à brancher
}

// Passe un paiement à « payé » ou « échoué » (une seule fois) et prévient le candidat.
function pay_settle(array $p, string $status, string $by = ''): void {
    if ($p['status'] !== 'pending' || !in_array($status, ['paid', 'failed'], true)) return;
    q('update payments set status=?, updated=?, paid_at=? where id=? and status=\'pending\'', [$status, now_db(), $status === 'paid' ? now_db() : null, $p['id']]);
    $a = one('select ref,uid from applications where id=?', [$p['app']]);
    $c = one('select email from users where id=?', [$p['uid']]);
    $m = PAY_METHODS[$p['method']]['fr'] ?? $p['method'];
    if ($status === 'paid') {
        mail_to($c['email'], 'Campus Monde — paiement reçu', 'Nous avons bien reçu votre paiement de ' . money((int)$p['amount'], $p['currency']) . " ($m) pour le dossier {$a['ref']}. Référence de transaction : {$p['ref']}. Vous pouvez maintenant soumettre votre candidature.");
        q('insert into audit(at,usr,action,target) values(?,?,?,?)', [now_db(), $by ?: $c['email'], "Paiement reçu ({$m}, " . money((int)$p['amount'], $p['currency']) . ", {$p['ref']})", $a['ref']]);
    } else {
        mail_to($c['email'], 'Campus Monde — paiement non abouti', "Le paiement {$p['ref']} pour le dossier {$a['ref']} n'a pas abouti. Aucun montant n'a été débité. Vous pouvez réessayer depuis votre espace étudiant.");
        q('insert into audit(at,usr,action,target) values(?,?,?,?)', [now_db(), $by ?: $c['email'], "Paiement échoué ({$m}, {$p['ref']})", $a['ref']]);
    }
}
