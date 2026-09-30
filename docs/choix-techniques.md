# Choix techniques, expliqués simplement

## En une phrase

Une application web mobile (installable sur l’écran d’accueil), servie par un petit serveur Node.js qui va chercher les données officielles, calcule un score pour chaque texte et demande à une IA de ranger les avis dans des opinions.

## Pourquoi une application web plutôt qu’une app iOS/Android

- **Un seul code** pour iPhone, Android et ordinateur, et pas de validation par les stores pour publier une correction.
- **Installable** comme une app (manifeste web), sans téléchargement.
- **Accessible par défaut** : les lecteurs d’écran (VoiceOver, TalkBack) comprennent le HTML nativement.
- Si besoin plus tard (notifications de vote, par exemple), on peut l’emballer dans une app native (Capacitor) sans tout réécrire.

## Pourquoi « sans framework »

Le front est en JavaScript standard, le serveur en Node.js sans bibliothèque (seul le SDK Anthropic est optionnel). Pour un MVP d’intérêt public :

- rien à mettre à jour ni à auditer côté dépendances, donc moins de failles ;
- le projet démarre avec `npm start`, sans étape de compilation ;
- le code reste lisible par quelqu’un qui débute.

Si l’équipe grandit, passer à React/Next.js ou Svelte est simple : les écrans sont déjà découpés en fonctions (`public/js/ecrans.js`).

## Les données officielles : un connecteur par source

Chaque source (Assemblée, Sénat, pétitions, Wikipédia) a son propre fichier dans `server/connectors/` avec deux fonctions :

1. `recuperer()` va chercher les fichiers. **Dans le MVP, elle lit des fichiers fictifs** (`server/fixtures/`) au même format que les vrais.
2. `transformer()` les convertit en métriques. Elle ne touche pas au réseau, donc elle se teste facilement.

Pour brancher une vraie source, on ne remplace que `recuperer()`. Si une source tombe en panne, les autres continuent (testé).

Le pivot entre les sources est l’identifiant du dossier à l’Assemblée (`DLR5L17N…`). Les pétitions et les articles Wikipédia ne le portent pas : leur rattachement est tenu dans une table dédiée, à valider par un humain.

## Le score de pertinence

```
score = 100 × (0,40 × activité + 0,30 × intérêt public + 0,30 × participation) × ancienneté
```

| Composante | Calcul (chaque partie entre 0 et 1) |
|---|---|
| Activité parlementaire | ½ amendements des 30 derniers jours (300 = max) + ½ proximité du vote (≤ 7 j = 1, ≤ 30 j = 0,6, plus tard = 0,3) |
| Intérêt public | ½ signatures de la pétition liée (échelle log, 500 000 = max) + ½ pic Wikipédia (+200 % sur 7 jours = max) |
| Participation | 0,6 × nombre d’avis (échelle log, 5 000 = max) + 0,4 × divergence des opinions |
| Ancienneté | ×1 jusqu’à 14 jours sans activité, puis baisse jusqu’à ×0,5 à 30 jours, puis sortie du fil |

Le fil affiche les textes au-dessus de **40** ou dont le vote a lieu dans les **7 jours**. Chaque carte affiche « Pourquoi ce texte ? » pour que le tri reste transparent. Résultat sur les données fictives : pêche 88, meublés 65, soins 55, voie pro 24 (Explorer seulement), eau agricole hors du fil (66 jours sans activité).

Les poids et seuils sont dans `server/config.js` et `server/scoring.js`. Ce sont des **valeurs de départ** à ajuster sur données réelles.

## L’IA

- **Classement des avis** : Claude, avec un schéma de réponse imposé, pour obtenir un format toujours exploitable. Le prompt est dans `docs/prompt-classement.md`.
- **Transparence** : chaque classement est accompagné d’une phrase d’explication, affichée à l’auteur, qui peut le contester en un geste. Les contestations sont enregistrées pour améliorer le classement.
- **Nouvelles opinions** : quand un avis ne rentre nulle part, l’IA propose une formulation. L’opinion n’apparaît qu’à partir de 3 avis similaires, pour ne pas multiplier les opinions à un seul avis.
- **Résumés neutres** : prompt prêt (`server/ai/prompt-resume.js`), avec relecture humaine avant publication. Le **stade d’examen** n’est jamais écrit par l’IA : il vient des sources officielles.

## Neutralité et confiance

- **Couleurs neutres pour les opinions** : A, B et C sont en niveaux de gris, avec leur lettre toujours affichée. Une couleur (vert/rouge) suggérerait une « bonne » ou une « mauvaise » opinion. Le vert d’accent est réservé aux actions et aux badges vérifiés.
- **Fiabilité** : sous 50 avis dans une région, aucun pourcentage n’est calculé côté serveur (pas seulement masqué à l’écran).
- **Représentativité** : chaque texte rappelle que les résultats reflètent les participants et non la population française.
- **Sources** : chaque métrique affiche sa source officielle, avec un lien et la date du relevé.
- **Arrondis** : les pourcentages sont arrondis pour que leur somme fasse toujours 100 %.

## Protection contre les abus

- **Un compte par personne** et **un avis par personne et par texte** (un nouvel envoi remplace l’ancien).
- **Campagnes coordonnées** (`server/moderation/campagnes.js`) :
  1. au moins 10 avis quasi identiques en rafale, dont la moitié de comptes de moins de 7 jours (ou 50 avis quasi identiques, quels que soient les comptes) ;
  2. plus de 60 % d’avis venant de comptes récents sur 24 h (à partir de 20 avis).
  Les avis signalés passent « en vérification » et ne sont plus comptés tant qu’un modérateur ne les a pas validés. La démo contient une fausse campagne de 42 avis sur la loi meublés : elle est détectée au démarrage.
- **Modération** en deux temps : pré-filtre local immédiat (menaces, insultes, données personnelles), puis contrôle par l’IA des cas plus subtils.

## RGPD

- Collecte minimale : ville, région, catégorie socioprofessionnelle facultative, badges, avis. Aucun nom.
- Affichage anonymisé : profil + lieu. La ville n’est affichée que si au moins 10 participants en viennent pour ce texte ; sinon on affiche la région.
- E-mails et téléphones masqués automatiquement dans les avis.
- Export et suppression des données depuis l’onglet Compte.
- Attention : une opinion sur un texte de loi peut révéler une opinion politique (donnée sensible, article 9 du RGPD). Il faudra un consentement explicite à l’inscription et une analyse d’impact (AIPD) avant l’ouverture au public.

## Accessibilité

- Contrastes vérifiés (texte secondaire à 7,6:1, texte noir sur vert à 8,8:1 ; le vert n’est jamais utilisé comme couleur de texte sur fond blanc).
- Cibles tactiles d’au moins 44 px (testé), navigation au pouce, onglets en bas.
- Carte doublée d’un **tableau** pour les lecteurs d’écran ; chaque pastille a une description complète (« Bretagne : opinion A en tête, 62 %, 255 avis »).
- Barres d’opinions : lettres affichées dans les segments (pas d’information portée par la couleur seule) et description textuelle.
- Un seul titre principal par écran, focus déplacé au changement d’écran, annonces vocales des résultats, lien d’évitement, mode sombre, animations désactivées si l’utilisateur le demande.

## Sécurité

- Politique de sécurité du contenu stricte (aucun script ni style en ligne) et échappement de tout contenu affiché : un avis contenant du HTML ne peut pas s’exécuter.
- Taille des requêtes limitée, chemins de fichiers contrôlés.
