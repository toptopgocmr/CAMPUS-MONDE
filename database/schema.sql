-- =========================================================
-- CAMPUS MONDE — schéma MySQL / MariaDB
-- Compatible MySQL 5.7+ et MariaDB 10.3+ (XAMPP, WAMP, hébergeurs, Railway).
-- Les tables sont aussi créées automatiquement au premier appel du site.
-- Toutes les dates sont enregistrées en UTC.
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(200) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  role VARCHAR(20) NOT NULL,
  pw VARCHAR(255) NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  code_hash CHAR(64) NULL, code_exp DATETIME NULL,
  reset_hash CHAR(64) NULL, reset_exp DATETIME NULL,
  mkt TINYINT(1) NOT NULL DEFAULT 0,
  profile LONGTEXT NOT NULL,
  photo VARCHAR(120) NULL,
  fails INT NOT NULL DEFAULT 0,
  locked_until DATETIME NULL,
  created DATETIME NOT NULL,
  CONSTRAINT users_role_chk CHECK (role IN ('candidat','agent','responsable','admin'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS institutions (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  country VARCHAR(30) NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT '',
  type VARCHAR(80) NOT NULL DEFAULT 'Établissement',
  relation VARCHAR(20) NOT NULL DEFAULT 'informatif',
  site VARCHAR(255) NOT NULL DEFAULT '',
  verified DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS programs (
  id VARCHAR(40) NOT NULL PRIMARY KEY,
  inst VARCHAR(40) NOT NULL,
  fr VARCHAR(255) NOT NULL, en VARCHAR(255) NOT NULL,
  level VARCHAR(20) NOT NULL, lang VARCHAR(2) NOT NULL DEFAULT 'FR', dur VARCHAR(60) NOT NULL DEFAULT '',
  `open` TINYINT(1) NOT NULL DEFAULT 0,
  period VARCHAR(100) NOT NULL DEFAULT '',
  CONSTRAINT programs_inst_fk FOREIGN KEY (inst) REFERENCES institutions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Compteur des références de dossier (CM-2026-0001…)
CREATE TABLE IF NOT EXISTS app_ref_seq (
  n INT NOT NULL AUTO_INCREMENT PRIMARY KEY
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS applications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  ref VARCHAR(30) NOT NULL UNIQUE,
  uid CHAR(36) NOT NULL,
  country VARCHAR(30) NOT NULL DEFAULT '', inst VARCHAR(40) NOT NULL DEFAULT '', prog VARCHAR(40) NOT NULL DEFAULT '',
  level VARCHAR(30) NOT NULL DEFAULT 'bac', intake VARCHAR(100) NOT NULL DEFAULT '', alt VARCHAR(255) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  agent CHAR(36) NULL,
  history LONGTEXT NOT NULL,
  messages LONGTEXT NOT NULL,
  notes LONGTEXT NOT NULL,
  transmission LONGTEXT NULL, decision LONGTEXT NULL,
  created DATETIME NOT NULL,
  submitted DATETIME NULL,
  KEY applications_uid (uid), KEY applications_agent (agent),
  CONSTRAINT applications_uid_fk FOREIGN KEY (uid) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT applications_agent_fk FOREIGN KEY (agent) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Les fichiers sont stockés hors du dossier public (storage/documents), jamais accessibles par URL directe.
CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  app CHAR(36) NOT NULL,
  type VARCHAR(20) NOT NULL, name VARCHAR(200) NOT NULL, `stored` VARCHAR(120) NOT NULL,
  size INT NOT NULL, mime VARCHAR(40) NOT NULL, version INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', comment VARCHAR(500) NOT NULL DEFAULT '',
  checked_by VARCHAR(200) NOT NULL DEFAULT '', checked_at DATETIME NULL,
  uploaded_at DATETIME NOT NULL,
  path VARCHAR(255) NOT NULL,
  KEY documents_app (app),
  CONSTRAINT documents_app_fk FOREIGN KEY (app) REFERENCES applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  at DATETIME NOT NULL,
  usr VARCHAR(200) NOT NULL, action VARCHAR(500) NOT NULL, target VARCHAR(300) NOT NULL DEFAULT '—'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS outbox (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  at DATETIME NOT NULL,
  to_email VARCHAR(200) NOT NULL, subj VARCHAR(300) NOT NULL, body TEXT NOT NULL,
  sent TINYINT(1) NOT NULL DEFAULT 0, `read` TINYINT(1) NOT NULL DEFAULT 0,
  KEY outbox_to (to_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contacts (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  at DATETIME NOT NULL,
  kind VARCHAR(40), name VARCHAR(150), email VARCHAR(200), phone VARCHAR(50), dest VARCHAR(80), msg TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions PHP stockées en base (permet « déconnecter toutes mes sessions »)
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) NOT NULL PRIMARY KEY,
  uid CHAR(36) NULL,
  data MEDIUMTEXT NOT NULL,
  expires INT NOT NULL,
  KEY sessions_uid (uid), KEY sessions_exp (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Limitation du nombre de tentatives (connexion, formulaire de contact)
CREATE TABLE IF NOT EXISTS rate_limits (
  k VARCHAR(190) NOT NULL PRIMARY KEY,
  hits INT NOT NULL,
  reset_at INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Réglages modifiables depuis la console (frais de dossier, moyens de paiement…)
CREATE TABLE IF NOT EXISTS settings (
  k VARCHAR(60) NOT NULL PRIMARY KEY,
  v TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Paiements des frais de dossier (Mobile Money MTN / Airtel, carte bancaire)
-- Aucun numéro de carte n'est jamais stocké : le paiement par carte se fait sur la page sécurisée du prestataire.
CREATE TABLE IF NOT EXISTS payments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  ref VARCHAR(30) NOT NULL UNIQUE,
  app CHAR(36) NOT NULL,
  uid CHAR(36) NOT NULL,
  method VARCHAR(10) NOT NULL,
  phone VARCHAR(20) NOT NULL DEFAULT '',
  amount INT NOT NULL,
  currency VARCHAR(5) NOT NULL DEFAULT 'XAF',
  status VARCHAR(12) NOT NULL DEFAULT 'pending',
  provider VARCHAR(30) NOT NULL DEFAULT '',
  provider_ref VARCHAR(120) NOT NULL DEFAULT '',
  note VARCHAR(300) NOT NULL DEFAULT '',
  created DATETIME NOT NULL,
  updated DATETIME NOT NULL,
  paid_at DATETIME NULL,
  KEY payments_app (app), KEY payments_status (status),
  CONSTRAINT payments_app_fk FOREIGN KEY (app) REFERENCES applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Entretiens d'orientation avec un conseiller (réservés par les candidats)
CREATE TABLE IF NOT EXISTS interviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  ref VARCHAR(20) NOT NULL UNIQUE,
  uid CHAR(36) NOT NULL,
  app CHAR(36) NULL,
  slot DATETIME NOT NULL,
  duration INT NOT NULL DEFAULT 30,
  mode VARCHAR(12) NOT NULL,
  topic VARCHAR(40) NOT NULL DEFAULT 'orientation',
  message VARCHAR(1000) NOT NULL DEFAULT '',
  phone VARCHAR(40) NOT NULL DEFAULT '',
  status VARCHAR(12) NOT NULL DEFAULT 'requested',
  staff CHAR(36) NULL,
  link VARCHAR(300) NOT NULL DEFAULT '',
  notes LONGTEXT NULL,
  created DATETIME NOT NULL,
  updated DATETIME NOT NULL,
  KEY interviews_slot (slot), KEY interviews_uid (uid),
  CONSTRAINT interviews_uid_fk FOREIGN KEY (uid) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT interviews_staff_fk FOREIGN KEY (staff) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
