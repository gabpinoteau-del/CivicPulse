// Contenu éditorial des textes (DONNÉES FICTIVES pour la démo).
//
// - resume : en production, généré par l'IA à partir du texte officiel avec
//   le prompt server/ai/prompt-resume.js, puis relu par un humain avant
//   publication. Le stade d'examen, lui, est toujours calculé à partir des
//   sources (jamais rédigé à la main).
// - opinions : créées au fil de l'eau par le classement IA (une opinion
//   naît quand plusieurs avis ne rentrent dans aucune opinion existante).
//   Les mots-clés et "explication" servent uniquement au classement local de
//   secours (sans clé API) ; le classement réel est fait par Claude.

export const EDITORIAL = {
  DLR5L17N52110: {
    id: 'peche',
    titre_court: 'Projet de loi pêche',
    resume: {
      ce_qui_change: [
        'Fixe des quotas nationaux de capture sur 3 ans pour 12 espèces, dans la limite des totaux admissibles de captures décidés au niveau européen.',
        'Réduit à partir de 2027 le quota de sole du golfe de Gascogne (−8 %) et celui du merlu (−5 %).',
        'Crée un fonds d’accompagnement de 45 millions d’euros pour les entreprises de pêche dont le chiffre d’affaires baisse de plus de 20 %.',
        'Rend obligatoire la déclaration électronique des captures pour les navires de moins de 12 mètres.',
      ],
      pour_qui: [
        'Les entreprises de pêche maritime, leurs équipages et les armateurs.',
        'Les organisations de producteurs, qui répartissent les quotas entre navires.',
        'Les criées, mareyeurs et entreprises de transformation.',
      ],
    },
    profils_concernes: [
      { motif: 'p[eê]cheu(r|se)|marin|armateu|patron|mon bateau|mon navire|ma p[eê]che', libelle: 'Professionnel·le de la pêche' },
      { motif: 'mareyeu|criée|poissonni|ostr[eé]icult|conchylicult', libelle: 'Filière produits de la mer' },
    ],
    opinions: [
      {
        code: 'A',
        libelle: 'Les quotas protègent la ressource, il faut les maintenir.',
        explication: 'exprime l’attachement aux quotas comme moyen de protéger la ressource en poissons',
        mots_cles: ['ressource', 'stock', 'proteg', 'preserv', 'maintenir', 'surpeche', 'biodiversit', 'scientifi', 'renouvel', 'reconstitu', 'especes', 'ocean', 'generations', 'ciem', 'sans quotas', 'plus de poisson', 'long terme', 'avenir de la peche'],
      },
      {
        code: 'B',
        libelle: 'Les quotas menacent les petites entreprises, il faut les assouplir.',
        explication: 'exprime la crainte de l’impact économique des quotas sur une petite entreprise',
        mots_cles: ['entreprise', 'emploi', 'faillite', 'vendre', 'metier', 'revenu', 'survie', 'assoupli', 'trop strict', 'baisse', 'fermer', 'famille', 'economi', 'mon bateau', 'fin du mois', 'petite peche', 'artisan', 'vivre', 'endett'],
      },
      {
        code: 'C',
        libelle: 'Il faut des quotas différents selon la taille des navires.',
        explication: 'demande une différenciation des quotas selon la taille des navires',
        mots_cles: ['taille', 'navire', 'chalutier', 'industriel', 'usine', 'petits bateaux', 'grands', 'cotier', 'differenci', 'selon', 'proportion', 'metres', 'flottille', 'meme regle', 'memes regles'],
      },
    ],
  },
  DLR5L17N51877: {
    id: 'logement',
    titre_court: 'Loi meublés de tourisme',
    resume: {
      ce_qui_change: [
        'Permet aux communes en zone tendue de plafonner à 90 jours par an la location d’une résidence principale en meublé de tourisme.',
        'Aligne la fiscalité des meublés de tourisme sur celle des locations meublées classiques.',
        'Impose un numéro d’enregistrement national pour toute annonce en ligne.',
      ],
      pour_qui: [
        'Les propriétaires qui louent un logement pour de courtes durées.',
        'Les communes situées en zone tendue et leurs habitants.',
        'Les plateformes de location en ligne.',
      ],
    },
    profils_concernes: [
      { motif: 'je loue|mon appartement|propri[eé]taire|mon logement|locataire', libelle: 'Propriétaire ou locataire concerné·e' },
    ],
    opinions: [
      { code: 'A', libelle: 'Il faut limiter fortement les meublés de tourisme pour rendre des logements aux habitants.', explication: 'demande de limiter les meublés de tourisme au profit du logement des habitants', mots_cles: ['habitants', 'loyers', 'logements', 'limiter', 'airbnb', 'centre-ville', 'se loger', 'penurie'] },
      { code: 'B', libelle: 'La régulation doit rester locale : chaque commune doit décider.', explication: 'défend une régulation décidée commune par commune', mots_cles: ['commune', 'maire', 'local', 'chaque ville', 'territoire', 'au cas par cas'] },
      { code: 'C', libelle: 'Les propriétaires doivent rester libres de louer : la loi va trop loin.', explication: 'défend la liberté des propriétaires de louer leur bien', mots_cles: ['liberte', 'propriet', 'trop loin', 'complement de revenu', 'mon bien', 'tourisme local'] },
    ],
  },
  DLR5L17N52004: {
    id: 'sante',
    titre_court: 'Loi accès aux soins',
    resume: {
      ce_qui_change: [
        'Conditionne l’installation d’un médecin libéral en zone bien dotée au départ d’un confrère exerçant dans la même zone.',
        'Crée une obligation de permanence des soins le soir et le week-end, organisée par territoire.',
        'Étend à tout le territoire l’accès direct aux kinésithérapeutes et aux infirmiers en pratique avancée.',
      ],
      pour_qui: [
        'Les patients, en particulier dans les territoires où il manque des médecins.',
        'Les médecins libéraux et les étudiants en médecine.',
        'Les kinésithérapeutes et infirmiers.',
      ],
    },
    profils_concernes: [
      { motif: 'm[eé]decin|infirmi|kin[eé]|interne|pharmacien|soignant', libelle: 'Professionnel·le de santé' },
    ],
    opinions: [
      { code: 'A', libelle: 'Le texte va dans le bon sens : il faut garantir un médecin accessible partout.', explication: 'soutient l’objectif d’un accès aux soins garanti partout', mots_cles: ['medecin traitant', 'desert', 'acces', 'partout', 'attente', 'urgences', 'rendez-vous'] },
      { code: 'B', libelle: 'Contraindre l’installation des médecins découragera les vocations.', explication: 'craint que la contrainte à l’installation décourage les médecins', mots_cles: ['contraindre', 'liberte d\'installation', 'vocations', 'decourag', 'coercit'] },
    ],
  },
  DLR5L17N52188: {
    id: 'education',
    titre_court: 'Loi voie professionnelle',
    resume: {
      ce_qui_change: [
        'Augmente de 50 % la durée des stages en entreprise en terminale professionnelle.',
        'Crée une allocation de stage versée par l’État aux lycéens professionnels.',
      ],
      pour_qui: ['Les lycéens de la voie professionnelle et leurs familles.', 'Les enseignants et les entreprises d’accueil.'],
    },
    profils_concernes: [{ motif: 'enseignant|professeur|lyc[eé]en|apprenti', libelle: 'Communauté éducative' }],
    opinions: [
      { code: 'A', libelle: 'Plus de stages en entreprise, c’est une bonne chose pour l’insertion.', explication: 'soutient l’allongement des stages pour l’insertion professionnelle', mots_cles: ['stage', 'entreprise', 'insertion', 'emploi', 'concret'] },
      { code: 'B', libelle: 'Le lycée professionnel doit garder ses heures d’enseignement général.', explication: 'défend le maintien des heures d’enseignement général', mots_cles: ['enseignement general', 'francais', 'maths', 'heures', 'poursuite d\'etudes'] },
    ],
  },
  DLR5L17N51650: {
    id: 'agriculture',
    titre_court: 'Loi eau agricole',
    resume: {
      ce_qui_change: [
        'Fixe un ordre de priorité des usages de l’eau en période de sécheresse.',
        'Encadre la construction de nouvelles retenues d’eau pour l’irrigation.',
      ],
      pour_qui: ['Les exploitants agricoles irrigants.', 'Les collectivités chargées de l’eau potable.'],
    },
    profils_concernes: [{ motif: 'agricult|[eé]leveu|exploitant|irrigant|ma ferme', libelle: 'Exploitant·e agricole' }],
    opinions: [
      { code: 'A', libelle: 'L’eau doit aller d’abord à l’eau potable et aux milieux naturels.', explication: 'donne la priorité à l’eau potable et aux milieux naturels', mots_cles: ['eau potable', 'riviere', 'nappe', 'milieux', 'secheresse'] },
      { code: 'B', libelle: 'Il faut sécuriser l’irrigation pour maintenir la production agricole.', explication: 'défend la sécurisation de l’irrigation agricole', mots_cles: ['irrigation', 'production', 'retenue', 'recolte', 'souverainete'] },
    ],
  },
};
