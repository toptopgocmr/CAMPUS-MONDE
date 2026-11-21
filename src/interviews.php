<?php
/* =========================================================
   CAMPUS MONDE — entretiens d'orientation avec un conseiller
   Les créneaux sont calculés à partir des disponibilités réglées dans la console
   (jours, plages horaires, durée, délai de prévenance, horizon, nombre de conseillers en parallèle).
   Toutes les heures sont celles de Brazzaville (UTC+1) ; stockage en UTC.
   ========================================================= */
declare(strict_types=1);

const IV_MODES = ['presentiel' => 'Au bureau (Brazzaville)', 'visio' => 'Visioconférence', 'telephone' => 'Téléphone'];
const IV_TOPICS = ['orientation' => 'Orientation et choix des études', 'dossier' => 'Constitution du dossier', 'visa' => 'Visa et départ', 'financement' => 'Financement et bourses', 'autre' => 'Autre question'];
const IV_STATUS = ['requested' => 'Demandé', 'confirmed' => 'Confirmé', 'done' => 'Réalisé', 'no_show' => 'Absent', 'cancelled' => 'Annulé'];
const IV_TZ = 'Africa/Brazzaville';

function iv_settings(): array {
    $modes = array_values(array_intersect(array_keys(IV_MODES), explode(',', setting('iv_modes', 'presentiel,visio,telephone'))));
    $hours = [];
    foreach (explode(',', setting('iv_hours', '09:00-12:00,14:00-17:00')) as $r)
        if (preg_match('/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/', trim($r), $m)) $hours[] = [(int)$m[1] * 60 + (int)$m[2], (int)$m[3] * 60 + (int)$m[4]];
    return [
        'enabled' => setting('iv_enabled', '1') === '1',
        'days' => array_values(array_filter(array_map('intval', explode(',', setting('iv_days', '1,2,3,4,5'))), fn($d) => $d >= 1 && $d <= 7)),
        'hours' => setting('iv_hours', '09:00-12:00,14:00-17:00'), 'ranges' => $hours,
        'duration' => max(15, min(120, (int)setting('iv_duration', '30'))),
        'modes' => $modes ?: ['presentiel'],
        'notice' => max(0, (int)setting('iv_notice', '24')), 'horizon' => max(1, min(90, (int)setting('iv_horizon', '21'))),
        'capacity' => max(1, min(10, (int)setting('iv_capacity', '1'))),
    ];
}
function iv_local(string $utc): DateTime { $d = new DateTime($utc, new DateTimeZone('UTC')); $d->setTimezone(new DateTimeZone(IV_TZ)); return $d; }
function iv_label(string $utc): string {
    $d = iv_local($utc);
    $j = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'][(int)$d->format('N') - 1];
    $m = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][(int)$d->format('n') - 1];
    return "$j " . $d->format('j') . " $m à " . $d->format('H\hi');
}
// Créneaux libres (UTC, format Y-m-d H:i:s)
function iv_free_slots(): array {
    $c = iv_settings(); if (!$c['enabled'] || !$c['days'] || !$c['ranges']) return [];
    $tz = new DateTimeZone(IV_TZ); $now = new DateTime('now', $tz);
    $min = (clone $now)->modify('+' . $c['notice'] . ' hours');
    $taken = [];
    foreach (all("select slot, count(*) as n from interviews where status in ('requested','confirmed') and slot>=? group by slot", [gmdate('Y-m-d H:i:s')]) as $r) $taken[$r['slot']] = (int)$r['n'];
    $out = [];
    for ($i = 0; $i <= $c['horizon']; $i++) {
        $day = (clone $now)->setTime(0, 0)->modify("+$i day");
        if (!in_array((int)$day->format('N'), $c['days'], true)) continue;
        foreach ($c['ranges'] as [$a, $b]) for ($t = $a; $t + $c['duration'] <= $b; $t += $c['duration']) {
            $s = (clone $day)->setTime(intdiv($t, 60), $t % 60);
            if ($s < $min) continue;
            $u = (clone $s)->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
            if (($taken[$u] ?? 0) < $c['capacity']) $out[] = $u;
        }
    }
    return $out;
}
function iv_public(array $x): array {
    return ['id' => $x['id'], 'ref' => $x['ref'], 'uid' => $x['uid'], 'app' => $x['app'], 'slot' => iso($x['slot']), 'duration' => (int)$x['duration'],
        'mode' => $x['mode'], 'topic' => $x['topic'], 'message' => $x['message'], 'phone' => $x['phone'], 'status' => $x['status'],
        'staff' => $x['staff'], 'link' => $x['link'], 'notes' => jd($x['notes'] ?? null), 'created' => iso($x['created']), 'updated' => iso($x['updated'])];
}
function iv_mail(array $iv, string $what): void {
    $c = one('select email from users where id=?', [$iv['uid']]); if (!$c) return;
    $when = iv_label($iv['slot']); $mode = IV_MODES[$iv['mode']] ?? $iv['mode'];
    $where = $iv['mode'] === 'presentiel' ? ' Adresse : 211, av. de la Base, Batignolles (arrêt Bopaka), Brazzaville.' : ($iv['mode'] === 'visio' ? ($iv['link'] ? " Lien de connexion : {$iv['link']}" : ' Le lien de connexion vous sera envoyé avant le rendez-vous.') : " Un conseiller vous appellera au {$iv['phone']}.");
    $t = [
        'requested' => ['Campus Monde — demande d\'entretien reçue', "Votre demande d'entretien {$iv['ref']} ($mode) pour le $when (heure de Brazzaville) est bien reçue. Un conseiller va la confirmer."],
        'confirmed' => ['Campus Monde — entretien confirmé', "Votre entretien {$iv['ref']} est confirmé pour le $when (heure de Brazzaville), $mode.$where"],
        'cancelled' => ['Campus Monde — entretien annulé', "L'entretien {$iv['ref']} prévu le $when a été annulé. Vous pouvez réserver un nouveau créneau depuis votre espace étudiant."],
        'done' => ['Campus Monde — merci pour votre entretien', "Merci pour votre entretien {$iv['ref']}. Retrouvez la suite de votre accompagnement dans votre espace étudiant."],
    ][$what] ?? null;
    if ($t) mail_to($c['email'], $t[0], $t[1]);
}
