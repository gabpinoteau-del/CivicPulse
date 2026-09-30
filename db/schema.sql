-- CivicPulse — schéma PostgreSQL (cible de production).
-- Le MVP tourne en mémoire (server/store.js) avec les mêmes entités.
-- Diagramme : docs/schema-base-de-donnees.md

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------- Référentiels
CREATE TABLE regions (
  code        text PRIMARY KEY,              -- 'BRE', 'NAQ'…
  nom         text NOT NULL,
  outremer    boolean NOT NULL DEFAULT false
);

CREATE TABLE categories (
  id          text PRIMARY KEY,              -- 'peche', 'logement'…
  libelle     text NOT NULL,
  icone       text
);

CREATE TABLE sources (
  id          text PRIMARY KEY,              -- 'assemblee', 'senat', 'petitions', 'wikimedia', 'legifrance'
  nom         text NOT NULL,
  url         text NOT NULL,
  frequence   interval NOT NULL              -- '1 hour', '1 day', '7 days'
);

-- ---------------------------------------------------------------- Utilisateurs
-- Minimisation RGPD : aucun nom, aucune date de naissance, aucune adresse.
-- L'identité sert seulement à garantir « un compte par personne ».
CREATE TABLE utilisateurs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_fournisseur text NOT NULL,            -- 'franceconnect' | 'email' (décision à prendre)
  auth_sub_hash   text NOT NULL,             -- empreinte de l'identifiant du fournisseur
  ville           text NOT NULL,
  region_code     text NOT NULL REFERENCES regions(code),
  csp             text,                      -- catégorie socioprofessionnelle (facultative)
  cree_le         timestamptz NOT NULL DEFAULT now(),
  supprime_le     timestamptz,               -- effacement RGPD : données vidées, ligne gardée pour l'unicité
  UNIQUE (auth_fournisseur, auth_sub_hash)
);

CREATE TYPE type_badge   AS ENUM ('concerne', 'chercheur', 'entreprise');
CREATE TYPE niveau_badge AS ENUM ('declare', 'verifie');

CREATE TABLE badges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id  uuid NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  type            type_badge NOT NULL,
  libelle         text NOT NULL,             -- « Marin-pêcheur », « Chercheuse en halieutique »
  niveau          niveau_badge NOT NULL DEFAULT 'declare',
  preuve          text CHECK (preuve IN ('ORCID', 'SIREN')),
  preuve_hash     text,                      -- empreinte de l'ORCID / SIREN, jamais affichée
  verifie_le      timestamptz,
  cree_le         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (utilisateur_id, type),
  CHECK (niveau = 'declare' OR preuve IS NOT NULL)
);

-- ---------------------------------------------------------------- Textes
CREATE TABLE textes (
  id                text PRIMARY KEY,        -- slug : 'peche'
  ref_an            text UNIQUE NOT NULL,    -- DLR5L17N52110 (pivot entre sources)
  ref_senat         text,
  titre             text NOT NULL,
  titre_court       text NOT NULL,
  type              text NOT NULL,           -- projet / proposition de loi
  categorie_id      text REFERENCES categories(id),
  stade             text,                    -- calculé depuis les sources, jamais rédigé à la main
  prochain_vote     date,
  date_depot        date,
  derniere_activite date,
  url_an            text,
  url_senat         text,
  publie            boolean NOT NULL DEFAULT false  -- publié une fois le résumé relu
);

CREATE TABLE resumes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texte_id       text NOT NULL REFERENCES textes(id) ON DELETE CASCADE,
  version        int NOT NULL,
  ce_qui_change  jsonb NOT NULL,             -- tableau de phrases
  pour_qui       jsonb NOT NULL,
  genere_par     text NOT NULL,              -- modèle IA utilisé
  relu_par       text,                       -- relecteur humain
  publie_le      timestamptz,
  UNIQUE (texte_id, version)
);

-- Rattachement des sources qui ne portent pas l'identifiant AN
-- (pétitions, articles Wikipédia).
CREATE TABLE liens_sources (
  texte_id            text NOT NULL REFERENCES textes(id) ON DELETE CASCADE,
  source_id           text NOT NULL REFERENCES sources(id),
  identifiant_externe text NOT NULL,         -- 'i-2291', 'Projet_de_loi_relatif_à_la_pêche_durable'
  methode             text NOT NULL CHECK (methode IN ('auto', 'manuel')),
  valide_par          text,
  PRIMARY KEY (texte_id, source_id, identifiant_externe)
);

-- Une ligne par valeur relevée : on garde l'historique et la source exacte.
CREATE TABLE metriques (
  id           bigserial PRIMARY KEY,
  texte_id     text NOT NULL REFERENCES textes(id) ON DELETE CASCADE,
  source_id    text NOT NULL REFERENCES sources(id),
  cle          text NOT NULL,                -- 'amendements_deposes', 'scrutin_final', 'petition', 'vues_wikipedia'…
  valeur       jsonb NOT NULL,
  date_mesure  date,
  source_url   text NOT NULL,                -- lien affiché sous la métrique
  recupere_le  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX metriques_derniere ON metriques (texte_id, cle, recupere_le DESC);

CREATE TABLE ingestions (
  id          bigserial PRIMARY KEY,
  source_id   text NOT NULL REFERENCES sources(id),
  debut       timestamptz NOT NULL,
  fin         timestamptz,
  ok          boolean,
  erreur      text,
  checkpoint  timestamptz                    -- dernière publication traitée (flux AN)
);

CREATE TABLE scores (
  texte_id           text NOT NULL REFERENCES textes(id) ON DELETE CASCADE,
  calcule_le         timestamptz NOT NULL DEFAULT now(),
  total              int NOT NULL,
  activite           numeric(3,2) NOT NULL,
  interet            numeric(3,2) NOT NULL,
  participation      numeric(3,2) NOT NULL,
  facteur_anciennete numeric(3,2) NOT NULL,
  dans_le_fil        boolean NOT NULL,
  raison             text NOT NULL,
  PRIMARY KEY (texte_id, calcule_le)
);

-- ---------------------------------------------------------------- Opinions et avis
CREATE TYPE statut_opinion AS ENUM ('proposee', 'active', 'fusionnee', 'archivee');

CREATE TABLE opinions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texte_id    text NOT NULL REFERENCES textes(id) ON DELETE CASCADE,
  code        text,                          -- 'A', 'B'… attribué à l'activation
  libelle     text NOT NULL,
  statut      statut_opinion NOT NULL DEFAULT 'proposee',
  fusionnee_dans uuid REFERENCES opinions(id),
  cree_par    text NOT NULL,                 -- 'ia' | 'moderation'
  cree_le     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (texte_id, code)
);

CREATE TYPE statut_avis AS ENUM ('publie', 'en_revue', 'rejete');

CREATE TABLE avis (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texte_id        text NOT NULL REFERENCES textes(id) ON DELETE CASCADE,
  utilisateur_id  uuid NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  contenu         text NOT NULL CHECK (length(contenu) BETWEEN 15 AND 2000),
  opinion_id      uuid REFERENCES opinions(id),   -- NULL ou opinion 'proposee' = « Autres »
  explication     text,
  confiance       numeric(3,2),
  classe_par      text NOT NULL,             -- 'claude-opus-5-5', 'local', 'auteur (contestation)'
  statut          statut_avis NOT NULL DEFAULT 'publie',
  motif_revue     text,
  cree_le         timestamptz NOT NULL DEFAULT now(),
  modifie_le      timestamptz,
  UNIQUE (texte_id, utilisateur_id)          -- un avis par personne et par texte
);
CREATE INDEX avis_texte_statut ON avis (texte_id, statut, cree_le);

CREATE TABLE contestations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avis_id              uuid NOT NULL REFERENCES avis(id) ON DELETE CASCADE,
  ancienne_opinion_id  uuid REFERENCES opinions(id),
  nouvelle_opinion_id  uuid REFERENCES opinions(id),
  commentaire          text CHECK (length(commentaire) <= 500),
  cree_le              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE signalements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  texte_id    text NOT NULL REFERENCES textes(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('avis_identiques', 'comptes_recents', 'utilisateur', 'moderation_ia')),
  motif       text NOT NULL,
  avis_ids    uuid[] NOT NULL,
  statut      text NOT NULL DEFAULT 'ouvert' CHECK (statut IN ('ouvert', 'confirme', 'infirme')),
  traite_par  text,
  cree_le     timestamptz NOT NULL DEFAULT now()
);

-- Résultats par région (rafraîchis après chaque lot d'avis). Seuls les avis
-- publiés comptent ; l'application masque les régions sous 50 avis.
CREATE MATERIALIZED VIEW resultats_region AS
SELECT a.texte_id, u.region_code, a.opinion_id, count(*) AS nombre
FROM avis a JOIN utilisateurs u ON u.id = a.utilisateur_id
WHERE a.statut = 'publie' AND u.supprime_le IS NULL
GROUP BY a.texte_id, u.region_code, a.opinion_id;
