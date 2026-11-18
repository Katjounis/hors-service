-- Hors Service : base des comptes (Cloudflare D1, offre gratuite).
-- npx wrangler d1 execute hors-service-comptes --remote --file schema.sql
CREATE TABLE IF NOT EXISTS comptes (
  id TEXT PRIMARY KEY,
  email_h TEXT NOT NULL UNIQUE,          -- empreinte de l'adresse (pour la retrouver sans la lire)
  email TEXT NOT NULL,                   -- l'adresse, pour l'afficher dans « Mon compte »
  cree TEXT NOT NULL,
  vu TEXT,
  cartes TEXT NOT NULL DEFAULT '["C-001"]',   -- identifiants des skins débloqués (JSON)
  skin TEXT,                             -- skin choisi pour les cartes, ou NULL
  perso TEXT,                            -- le profil de l'appli (pseudo, avatar…) en JSON
  perso_maj TEXT,
  parties INTEGER NOT NULL DEFAULT 0,    -- parties lancées en tout
  jeux TEXT NOT NULL DEFAULT '{}',       -- parties lancées par jeu (JSON)
  cles TEXT NOT NULL DEFAULT '[]'        -- 300 dernières parties comptées (pour ne pas compter deux fois)
);
CREATE TABLE IF NOT EXISTS codes (
  email_h TEXT PRIMARY KEY,
  h TEXT NOT NULL,                       -- empreinte du code à 6 chiffres
  essais INTEGER NOT NULL DEFAULT 0,
  expire INTEGER NOT NULL                -- secondes depuis 1970
);
CREATE TABLE IF NOT EXISTS sessions (
  h TEXT PRIMARY KEY,                    -- empreinte du jeton gardé par le téléphone
  compte_id TEXT NOT NULL,
  expire INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_compte ON sessions (compte_id);
CREATE TABLE IF NOT EXISTS limites (
  cle TEXT PRIMARY KEY,                  -- compteurs anti-abus (par adresse, par réseau)
  n INTEGER NOT NULL,
  expire INTEGER NOT NULL
);
