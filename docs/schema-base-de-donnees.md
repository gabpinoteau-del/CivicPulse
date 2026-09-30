# Schéma de la base de données

Le SQL complet (PostgreSQL) est dans [`db/schema.sql`](../db/schema.sql). Le MVP tourne en mémoire (`server/store.js`) avec les mêmes entités, ce qui permet de le lancer sans base.

```mermaid
erDiagram
    REGIONS ||--o{ UTILISATEURS : "habite"
    UTILISATEURS ||--o{ BADGES : "porte"
    UTILISATEURS ||--o{ AVIS : "écrit"
    CATEGORIES ||--o{ TEXTES : "classe"
    TEXTES ||--o{ RESUMES : "résumé neutre (versionné)"
    TEXTES ||--o{ METRIQUES : "mesuré par"
    SOURCES ||--o{ METRIQUES : "fournit"
    SOURCES ||--o{ INGESTIONS : "journal"
    TEXTES ||--o{ LIENS_SOURCES : "rattaché à"
    SOURCES ||--o{ LIENS_SOURCES : ""
    TEXTES ||--o{ SCORES : "score de pertinence"
    TEXTES ||--o{ OPINIONS : "regroupe"
    TEXTES ||--o{ AVIS : "reçoit"
    OPINIONS ||--o{ AVIS : "contient"
    AVIS ||--o{ CONTESTATIONS : "contesté"
    TEXTES ||--o{ SIGNALEMENTS : "campagnes détectées"

    UTILISATEURS {
        uuid id PK
        text auth_fournisseur "franceconnect | email"
        text auth_sub_hash "un compte par personne"
        text ville
        text region_code FK
        text csp "facultatif"
        timestamptz cree_le "sert à repérer les comptes récents"
    }
    BADGES {
        uuid id PK
        uuid utilisateur_id FK
        enum type "concerne | chercheur | entreprise"
        text libelle
        enum niveau "declare | verifie"
        text preuve "ORCID | SIREN"
    }
    TEXTES {
        text id PK "peche"
        text ref_an UK "pivot entre sources"
        text titre
        text categorie_id FK
        text stade "calculé depuis les sources"
        date prochain_vote
        date derniere_activite
    }
    RESUMES {
        uuid id PK
        text texte_id FK
        int version
        jsonb ce_qui_change
        jsonb pour_qui
        text genere_par
        text relu_par
    }
    SOURCES {
        text id PK "assemblee | senat | petitions | wikimedia"
        text url
        interval frequence
    }
    METRIQUES {
        bigint id PK
        text texte_id FK
        text source_id FK
        text cle "amendements_deposes, scrutin_final…"
        jsonb valeur
        text source_url "citée dans l'app"
        timestamptz recupere_le
    }
    SCORES {
        text texte_id FK
        int total
        numeric activite
        numeric interet
        numeric participation
        bool dans_le_fil
    }
    OPINIONS {
        uuid id PK
        text texte_id FK
        text code "A, B, C…"
        text libelle
        enum statut "proposee | active | fusionnee"
    }
    AVIS {
        uuid id PK
        text texte_id FK
        uuid utilisateur_id FK
        text contenu
        uuid opinion_id FK
        text explication "affichée à l'auteur"
        numeric confiance
        enum statut "publie | en_revue | rejete"
    }
    CONTESTATIONS {
        uuid id PK
        uuid avis_id FK
        uuid ancienne_opinion_id
        uuid nouvelle_opinion_id
    }
    SIGNALEMENTS {
        uuid id PK
        text texte_id FK
        text type "avis_identiques | comptes_recents"
        uuid[] avis_ids
        text statut
    }
```

## Points clés

- **Un avis par personne et par texte** : contrainte `UNIQUE (texte_id, utilisateur_id)`. Un nouvel envoi remplace l’avis précédent.
- **Traçabilité des métriques** : chaque valeur garde sa source, son URL et sa date de relevé ; l’historique permet de calculer les tendances (pic Wikipédia, amendements des 30 derniers jours).
- **Opinions proposées** : une nouvelle opinion naît en statut `proposee` ; ses avis sont comptés dans « Autres » jusqu’à son activation (3 avis similaires dans le MVP, ou validation par un modérateur).
- **RGPD** : ni nom, ni e-mail en clair, ni adresse. ORCID et SIREN ne sont stockés que sous forme d’empreinte. L’effacement vide le profil et supprime les avis (`ON DELETE CASCADE`).
- **Résultats par région** : vue matérialisée `resultats_region` ; l’application n’affiche aucun pourcentage sous 50 avis.
