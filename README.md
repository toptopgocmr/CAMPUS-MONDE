# Campus Monde — plateforme web (PHP / MySQL)

Site bilingue (FR/EN) de recrutement et de suivi des candidatures étudiantes à l'international :

- **Site public** : accueil, à propos, destinations, établissements, formations, services, FAQ, contact, pages légales.
- **Espace étudiant** : inscription avec vérification de l'e-mail, profil, candidature en 3 étapes avec brouillon, dépôt de pièces (PDF/JPG/PNG, 5 Mo), suivi du dossier, messagerie, reçu de dépôt, export de ses données.
- **Back-office** : connexion avec code MFA par e-mail, rôles (agent, responsable, administrateur), tableau de bord, contrôle des pièces, demandes de complément, affectation, validation, transmission tracée, décision avec justificatif, notes internes, export CSV, catalogue, utilisateurs, journal d'activité.

**Technique** : PHP 8.1+ sans framework ni dépendance · MySQL 5.7+ / MariaDB 10.3+ (PDO) · sessions en base · mots de passe bcrypt · documents stockés hors du dossier public (jamais d'URL directe) · CSP et en-têtes de sécurité, anti-CSRF, limitation des tentatives, verrouillage de compte, contrôle du vrai type des fichiers · envoi SMTP intégré.

---

## Lancer sur ton ordinateur (Windows + WampServer ou XAMPP)

1. **WampServer** : lance-le et attends que l'icône près de l'horloge soit **verte**. (Avec XAMPP : Start sur MySQL.) Il faut PHP 8.1 ou plus récent.
2. Double-clique sur **`LANCER-EN-LOCAL.bat`**. Le navigateur s'ouvre sur http://localhost:8000.

Au premier lancement, la base `campusmonde`, les tables, le catalogue et les comptes sont créés automatiquement. Tu peux aussi les créer à la main en important `database/schema.sql` dans phpMyAdmin.

Réglages : fichier **`.env`** (par défaut WampServer/XAMPP : utilisateur `root` sans mot de passe, port 3306 ; MariaDB de WampServer : port 3307).

| Espace | Adresse | Identifiants (démo) |
|---|---|---|
| Site public | http://localhost:8000 | — |
| Espace étudiant | bouton Connexion | `etudiant@demo.cg` / `demo1234` |
| Administration | http://localhost:8000/#admin | `admin@campusmonde.local` / `Admin2026` |
| Responsable / agents | /#admin | `responsable@campusmonde.demo`, `agent1@campusmonde.demo`, `agent2@campusmonde.demo` / `demo1234` |

Sans SMTP, les e-mails ne partent pas. Les codes de vérification et les codes MFA de l'administration s'affichent alors dans la **fenêtre noire** du serveur. On peut aussi les voir dans le back-office, sous « Notifications envoyées », où les codes sont masqués.

**Repartir de zéro** : supprime la base `campusmonde` dans phpMyAdmin et le fichier `storage/.installed`, puis relance.

### Avec Apache (XAMPP ou hébergeur mutualisé)
Fais pointer le site (ou un VirtualHost) sur le dossier **`public/`**. Si l'hébergeur pointe sur la racine du projet, le `.htaccess` de la racine redirige vers `public/` et bloque `src/`, `storage/`, `database/` et `.env`. Le site doit être servi **à la racine d'un domaine ou d'un sous-domaine** (et non dans un sous-dossier comme `localhost/campus-monde`), car l'interface appelle `/api/...`.

---

## Photo de profil (obligatoire)
Chaque candidat doit ajouter une photo d'identité (JPG ou PNG, 2 Mo maximum, 150 × 150 px minimum) avant de pouvoir soumettre un dossier. Les photos sont stockées hors du dossier public (`storage/documents/avatars`) et ne sont visibles que par le candidat et le personnel connecté. Elle apparaît sur le reçu de dépôt.

## Paiement des frais de dossier
- Moyens proposés : **MTN Mobile Money**, **Airtel Money**, **carte bancaire** (Visa / Mastercard).
- Le paiement est **obligatoire avant la soumission** quand le montant est supérieur à 0.
- Montant et moyens proposés : console d'administration → **Paiements → Réglages des frais de dossier** (25 000 FCFA par défaut).
- `PAY_MODE=simulation` (par défaut hors production) : aucun argent ne circule, le paiement est confirmé ou refusé à l'écran pour les tests.
- `PAY_MODE=live` : brancher l'API du prestataire choisi dans `src/payments.php` (`pay_provider_init` et `pay_provider_check`) et renseigner ses clés dans `.env`. Aucun numéro de carte n'est saisi ni stocké sur ce serveur : la carte se règle sur la page sécurisée du prestataire.
- Console **Paiements** : suivi, filtres, export CSV, remboursement (administrateur, avec motif obligatoire).

## Entretiens avec un conseiller
- Les candidats réservent un entretien gratuit depuis **Espace étudiant → Mon entretien** (ou la tuile « Prendre rendez-vous » de l'accueil, lien `#espace-rdv`) : sujet, type (au bureau, visioconférence, téléphone), date et heure parmi les créneaux libres.
- Un seul entretien à venir par candidat ; un créneau pris disparaît pour les autres. E-mails à la demande, à la confirmation et à l'annulation ; fichier agenda (.ics) téléchargeable.
- Console **Entretiens** : à confirmer, à venir, historique ; confirmation, attribution d'un conseiller, lien de visioconférence, notes internes (jamais visibles par le candidat), réalisé / absent / annulé.
- **Disponibilités** (administrateur) : jours, plages horaires (heure de Brazzaville), durée, délai minimum, horizon de réservation, nombre de conseillers en parallèle, types proposés, ouverture ou fermeture des réservations.

## Photos du site
24 photos libres de droits (Wikimedia Commons : villes, universités, campus) illustrent l'accueil, les destinations, les établissements et les encarts promotionnels. Crédits affichés sur les photos et dans les Mentions légales. Copie locale depuis **Catalogue → Photos du site** ; remplacement par vos propres photos : voir `public/photos/LISEZ-MOI.txt`.

## Déployer sur Railway

1. Mets le projet sur GitHub. Le fichier `.env` est exclu automatiquement.
   ```bash
   git init && git add . && git commit -m "Campus Monde PHP/MySQL"
   git branch -M main && git remote add origin https://github.com/<compte>/campus-monde.git && git push -u origin main
   ```
2. Sur Railway : **New Project → Deploy from GitHub repo**. Le `Dockerfile` (PHP 8.3 + Apache) est utilisé automatiquement.
3. **+ Create → Database → MySQL**.
4. Ajoute un **Volume** au service web, monté sur `/data`, pour conserver les documents déposés.
5. Variables du service web :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` |
| `APP_ENV` | `production` |
| `APP_URL` | l'adresse publique du site |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | premier administrateur (8 caractères min. dont 1 chiffre) |
| `STORAGE_DIR` | `/data/documents` |
| `APP_SECRET` | une longue chaîne aléatoire (signe les QR codes des reçus) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | service d'e-mail (Brevo, Mailjet, Google Workspace…) |

6. **Settings → Networking → Generate Domain** (ou domaine personnalisé). Contrôle de santé : `https://<domaine>/api/health` doit renvoyer `{"ok":true}`.

---

## Structure
```
public/index.php     point d'entrée unique (routage, en-têtes de sécurité)
public/index.html    page unique (styles)
public/app.js        interface : site public, espace étudiant, back-office
public/photos/       photos du site (voir LISEZ-MOI.txt)
src/bootstrap.php    configuration, connexion MySQL, sessions, e-mails, installation
src/api.php          toutes les routes /api et les règles métier
database/schema.sql  schéma MySQL
storage/documents/   pièces déposées (privé)
.env                 réglages locaux (jamais publié)
Dockerfile           déploiement Railway / Docker
LANCER-EN-LOCAL.bat  lancement en un double-clic sous Windows
```

## Avant l'ouverture au public
- [ ] Raison sociale, RCCM, directeur de publication et hébergeur dans les mentions légales (`public/app.js`, fonction `vLegal`).
- [ ] Faire valider la politique de confidentialité, les durées de conservation et les CGU par un conseil juridique.
- [ ] Confirmer l'adresse, les téléphones, l'e-mail officiel et les horaires.
- [ ] Liste des établissements réellement partenaires (avec preuves) et des formations ouvertes.
- [ ] Configurer le SMTP sur un domaine propre avec SPF, DKIM et DMARC.
- [ ] Brancher un antivirus sur les fichiers déposés (`scan_file` dans `src/api.php`, ex. ClamAV).
- [ ] Activer les sauvegardes MySQL et du volume de documents, puis tester une restauration.
- [ ] Retirer `SEED_DEMO` et supprimer les comptes de démonstration.
