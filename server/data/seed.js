// Participation SIMULÉE dans l'app (utilisateurs + avis), déterministe.
// Aucune donnée réelle : villes et profils sont tirés au sort, les avis sont
// des phrases fictives. Les avis "à la une" sont rédigés à la main.
import { REGIONS } from '../config.js';

function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const VILLES = {
  BRE: ['Brest', 'Rennes', 'Lorient', 'Quimper', 'Saint-Malo', 'Concarneau'],
  NAQ: ['Bordeaux', 'La Rochelle', 'Saint-Jean-de-Luz', 'Arcachon', 'Limoges', 'Pau'],
  NOR: ['Caen', 'Le Havre', 'Cherbourg-en-Cotentin', 'Rouen', 'Granville'],
  PDL: ['Nantes', 'Saint-Nazaire', 'Les Sables-d’Olonne', 'Angers', 'Le Mans'],
  HDF: ['Lille', 'Boulogne-sur-Mer', 'Amiens', 'Dunkerque', 'Calais'],
  OCC: ['Toulouse', 'Montpellier', 'Sète', 'Perpignan', 'Nîmes'],
  PAC: ['Marseille', 'Nice', 'Toulon', 'Avignon', 'Martigues'],
  IDF: ['Paris', 'Montreuil', 'Versailles', 'Saint-Denis', 'Créteil'],
  ARA: ['Lyon', 'Grenoble', 'Clermont-Ferrand', 'Annecy', 'Saint-Étienne'],
  GES: ['Strasbourg', 'Reims', 'Metz', 'Nancy', 'Mulhouse'],
  CVL: ['Tours', 'Orléans', 'Bourges', 'Blois'],
  BFC: ['Dijon', 'Besançon', 'Auxerre'],
  COR: ['Ajaccio', 'Bastia'],
  GUA: ['Pointe-à-Pitre', 'Les Abymes'],
  MTQ: ['Fort-de-France'],
  GUF: ['Cayenne'],
  REU: ['Saint-Pierre', 'Le Port'],
  MAY: ['Mamoudzou'],
};

const CSP = ['Employé·e', 'Cadre', 'Ouvrier·e', 'Retraité·e', 'Étudiant·e', 'Profession intermédiaire', 'Artisan·e ou commerçant·e', 'Agent·e public', 'Sans emploi', 'Agriculteur·rice'];

// Loi pêche : répartition explicite [A, B, C, autres] par région (1 240 avis).
const PECHE_REGIONS = {
  BRE: [158, 56, 31, 10], NAQ: [62, 98, 37, 8], NOR: [41, 51, 18, 5], PDL: [47, 41, 18, 4],
  HDF: [29, 41, 16, 4], OCC: [34, 29, 19, 3], PAC: [28, 19, 30, 3], IDF: [50, 35, 24, 6],
  ARA: [26, 15, 11, 3], GES: [18, 12, 8, 2], CVL: [9, 6, 4, 1], BFC: [7, 5, 3, 0],
  COR: [6, 9, 6, 1], GUA: [3, 3, 2, 0], MTQ: [2, 3, 2, 0], GUF: [1, 1, 1, 0], REU: [5, 4, 3, 0], MAY: [1, 1, 1, 0],
};

const POIDS_POP = { IDF: 12.3, ARA: 8.1, NAQ: 6.1, OCC: 6.1, HDF: 6.0, GES: 5.6, PAC: 5.1, PDL: 3.9, BRE: 3.4, NOR: 3.3, BFC: 2.8, CVL: 2.6, COR: 0.35, GUA: 0.38, MTQ: 0.35, GUF: 0.29, REU: 0.87, MAY: 0.31 };

const AUTRES = {
  DLR5L17N51877: { total: 2300, mix: [0.36, 0.33, 0.27, 0.04], concernes: 0.12 },
  DLR5L17N52004: { total: 1650, mix: [0.78, 0.16, 0, 0.06], concernes: 0.1 },
  DLR5L17N52188: { total: 180, mix: [0.55, 0.38, 0, 0.07], concernes: 0.15 },
  DLR5L17N51650: { total: 95, mix: [0.5, 0.45, 0, 0.05], concernes: 0.2 },
};

// Phrases fictives (début + argument) combinées pour varier les avis générés.
const DEBUTS = ['', 'Franchement, ', 'À mon avis, ', 'Je pense que ', 'Pour moi, ', 'Honnêtement, ', 'Selon moi, '];
const ARGUMENTS = {
  DLR5L17N52110: {
    A: ['sans quotas il n’y aura plus de poisson pour les générations suivantes.', 'les stocks se reconstituent grâce aux quotas, il faut les maintenir.', 'il faut suivre les avis scientifiques pour protéger la ressource.', 'la surpêche a déjà vidé certaines zones, on ne peut pas revenir en arrière.', 'protéger les espèces, c’est protéger l’avenir de la pêche.'],
    B: ['les petites entreprises de pêche ne pourront pas survivre à une nouvelle baisse.', 'on demande toujours plus d’efforts aux artisans pêcheurs, il faut assouplir.', 'des familles entières vivent de ce métier, la baisse des quotas va les ruiner.', 'le fonds de 45 millions ne compensera jamais la perte de revenu.', 'les quotas sont trop stricts pour la petite pêche côtière.'],
    C: ['un chalutier-usine et un bateau de 10 mètres ne devraient pas avoir les mêmes règles.', 'il faudrait des quotas selon la taille des navires.', 'la pêche industrielle devrait porter l’effort, pas les petits bateaux côtiers.', 'différencier les quotas selon la flottille serait plus juste.'],
    X: ['il faudrait surtout lutter contre la pêche illégale.', 'les consommateurs devraient mieux connaître l’origine du poisson.', 'il faut former plus de jeunes aux métiers de la mer.'],
  },
  DLR5L17N51877: {
    A: ['dans ma ville on ne trouve plus de logement à l’année, il faut limiter les meublés de tourisme.', 'les loyers explosent à cause des locations touristiques.', 'il faut rendre les logements aux habitants.'],
    B: ['c’est au maire de décider selon la situation de sa commune.', 'une règle nationale ne peut pas convenir à tous les territoires.', 'chaque commune doit pouvoir choisir.'],
    C: ['louer mon bien quelques semaines est un complément de revenu légitime.', 'la loi va trop loin, les propriétaires doivent rester libres.', 'on s’attaque aux petits propriétaires au lieu de construire.'],
    X: ['il faudrait surtout construire plus de logements sociaux.'],
  },
  DLR5L17N52004: {
    A: ['je n’ai plus de médecin traitant depuis deux ans, il faut agir.', 'l’accès aux soins doit être garanti partout.', 'six mois d’attente pour un rendez-vous, ce n’est pas normal.'],
    B: ['contraindre l’installation découragera les vocations.', 'les jeunes médecins iront exercer ailleurs si on les contraint.'],
    X: ['il faut d’abord former plus de médecins.'],
  },
  DLR5L17N52188: {
    A: ['plus de stages, c’est plus concret pour trouver un emploi.', 'les stages en entreprise aident à l’insertion.'],
    B: ['on retire des heures de français et de maths, c’est une erreur.', 'il faut garder l’enseignement général pour la poursuite d’études.'],
    X: ['il faudrait revaloriser les enseignants de lycée pro.'],
  },
  DLR5L17N51650: {
    A: ['l’eau potable et les rivières doivent passer avant tout.', 'avec les sécheresses, il faut préserver les nappes.'],
    B: ['sans irrigation, pas de récolte : il faut sécuriser l’eau agricole.', 'les retenues d’eau sont nécessaires pour produire.'],
    X: ['il faut surtout changer de cultures.'],
  },
};

// Avis "à la une" (rédigés à la main) pour la loi pêche et les autres textes.
const A_LA_UNE = {
  DLR5L17N52110: [
    { opinion: 'C', region: 'BRE', ville: 'Lorient', badges: [{ type: 'entreprise', libelle: 'Chef d’entreprise de pêche (PME)', niveau: 'verifie', preuve: 'SIREN' }, { type: 'concerne', libelle: 'Professionnel·le de la pêche', niveau: 'declare' }], contenu: 'Nous armons 4 navires de 12 mètres. Nous ne pêchons pas comme un chalutier-usine de 80 mètres, pourtant la baisse s’applique à tous de la même façon. Des quotas par taille de navire seraient plus justes.' },
    { opinion: 'A', region: 'BRE', ville: 'Brest', badges: [{ type: 'chercheur', libelle: 'Chercheuse en halieutique', niveau: 'verifie', preuve: 'ORCID' }], contenu: 'Les évaluations scientifiques montrent que le stock de sole du golfe de Gascogne reste sous le seuil de précaution. Là où les quotas ont été respectés, le merlu s’est reconstitué : relâcher l’effort maintenant ferait perdre ces gains.' },
    { opinion: 'B', region: 'NAQ', ville: 'Bordeaux', badges: [], csp: 'Cadre', contenu: 'Je ne suis pas pêcheur, mais je vois les ports de la côte basque se vider. Une nouvelle baisse sans aide suffisante va faire disparaître les petites entreprises.' },
    { opinion: 'B', region: 'HDF', ville: 'Boulogne-sur-Mer', badges: [{ type: 'concerne', libelle: 'Filière produits de la mer', niveau: 'declare' }], contenu: 'Mareyeuse depuis 20 ans. Moins de débarquements, c’est moins de travail à la criée et dans les ateliers. Il faut assouplir le calendrier de baisse.' },
    { opinion: 'A', region: 'BRE', ville: 'Rennes', badges: [], csp: 'Profession intermédiaire', contenu: 'Si on ne protège pas la ressource maintenant, il n’y aura plus de pêche du tout dans vingt ans. Les quotas sont le seul outil qui a fait ses preuves.' },
    { opinion: 'C', region: 'PAC', ville: 'Marseille', badges: [{ type: 'chercheur', libelle: 'Chercheur en économie maritime', niveau: 'declare' }], contenu: 'Les petits métiers de Méditerranée ont un impact très différent des grandes unités. Un système de quotas différencié selon la taille des navires existe déjà dans plusieurs pays européens.' },
    { opinion: 'B', region: 'NAQ', ville: 'Arcachon', badges: [{ type: 'concerne', libelle: 'Filière produits de la mer', niveau: 'declare' }], contenu: 'On nous impose la déclaration électronique et la baisse en même temps. Pour une petite entreprise familiale, c’est trop d’un coup.' },
    { opinion: 'A', region: 'PDL', ville: 'Nantes', badges: [], csp: 'Agent·e public', contenu: 'Les quotas ne sont pas contre les pêcheurs : sans stock, il n’y a pas de métier. Le fonds d’accompagnement est une bonne chose pour passer le cap.' },
  ],
  DLR5L17N51877: [
    { opinion: 'A', region: 'PAC', ville: 'Marseille', badges: [{ type: 'concerne', libelle: 'Propriétaire ou locataire concerné·e', niveau: 'declare' }], contenu: 'Locataire à Marseille, j’ai cherché six mois un logement à l’année dans mon quartier : tout est en location touristique.' },
    { opinion: 'C', region: 'BRE', ville: 'Saint-Malo', badges: [{ type: 'concerne', libelle: 'Propriétaire ou locataire concerné·e', niveau: 'declare' }], contenu: 'Je loue mon ancien appartement l’été pour compléter ma retraite. La limite de 90 jours me l’interdirait presque.' },
    { opinion: 'B', region: 'ARA', ville: 'Annecy', badges: [], csp: 'Cadre', contenu: 'La situation d’Annecy n’a rien à voir avec celle d’une petite commune rurale. Laissons les maires décider.' },
  ],
  DLR5L17N52004: [
    { opinion: 'A', region: 'CVL', ville: 'Bourges', badges: [], csp: 'Retraité·e', contenu: 'Mon médecin est parti à la retraite sans remplaçant. Je fais 40 km pour une consultation.' },
    { opinion: 'B', region: 'IDF', ville: 'Paris', badges: [{ type: 'concerne', libelle: 'Professionnel·le de santé', niveau: 'declare' }], contenu: 'Interne en médecine générale : beaucoup d’entre nous hésiteront à s’installer en libéral si on nous impose le lieu.' },
  ],
  DLR5L17N52188: [
    { opinion: 'B', region: 'GES', ville: 'Metz', badges: [{ type: 'concerne', libelle: 'Communauté éducative', niveau: 'declare' }], contenu: 'Professeure de lettres en lycée pro : réduire encore l’enseignement général ferme la porte au BTS.' },
  ],
  DLR5L17N51650: [
    { opinion: 'B', region: 'OCC', ville: 'Nîmes', badges: [{ type: 'concerne', libelle: 'Exploitant·e agricole', niveau: 'declare' }], contenu: 'Maraîcher : sans irrigation garantie en juillet, je perds ma récolte.' },
  ],
};

const JOUR = 86400000;

export function genererParticipation(maintenant) {
  const rand = rng(1789);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const users = [];
  const avis = [];
  let n = 0;

  function nouvelUtilisateur(region, { ville, badges = [], csp, ancienneteJours } = {}) {
    // Les grandes villes reçoivent plus d'avis (1re ville = 40 % de la région).
    const villes = VILLES[region];
    const v = ville ?? (rand() < 0.4 ? villes[0] : pick(villes));
    const u = {
      id: `u${++n}`,
      // Comptes créés avant leurs avis (les avis simulés remontent à 60 jours).
      cree_le: new Date(maintenant - (ancienneteJours ?? 61 + rand() * 700) * JOUR).toISOString(),
      region,
      ville: v,
      csp: csp ?? pick(CSP),
      badges,
    };
    users.push(u);
    return u;
  }

  function nouvelAvis(texteRef, user, opinion, contenu, { joursAvant, aLaUne = false } = {}) {
    avis.push({
      id: `a${avis.length + 1}`,
      texte_ref: texteRef,
      user_id: user.id,
      contenu,
      opinion_code: opinion === 'X' ? null : opinion,
      statut: 'publie',
      classe_par: 'seed',
      a_la_une: aLaUne,
      cree_le: new Date(maintenant - (joursAvant ?? rand() * 60) * JOUR).toISOString(),
    });
  }

  function badgesAleatoires(texteRef, tauxConcernes) {
    const r = rand();
    if (r < 0.02) return [{ type: 'chercheur', libelle: 'Chercheur·se', niveau: rand() < 0.5 ? 'verifie' : 'declare', preuve: 'ORCID' }];
    if (r < 0.02 + tauxConcernes) {
      const b = [{ type: 'concerne', libelle: 'Personne directement concernée', niveau: 'declare' }];
      if (rand() < 0.3) b.unshift({ type: 'entreprise', libelle: 'Chef d’entreprise', niveau: 'verifie', preuve: 'SIREN' });
      return b;
    }
    return [];
  }

  function texteAleatoire(texteRef, opinion) {
    const phrase = pick(ARGUMENTS[texteRef][opinion]);
    const debut = pick(DEBUTS);
    return debut ? debut + phrase : phrase.charAt(0).toUpperCase() + phrase.slice(1);
  }

  // Avis à la une (comptés dans la répartition de leur région).
  const dejaCompte = {};
  for (const [ref, liste] of Object.entries(A_LA_UNE)) {
    liste.forEach((a, i) => {
      const u = nouvelUtilisateur(a.region, { ville: a.ville, badges: a.badges, csp: a.csp });
      nouvelAvis(ref, u, a.opinion, a.contenu, { joursAvant: 1 + i * 2.3, aLaUne: true });
      const k = `${ref}|${a.region}|${a.opinion}`;
      dejaCompte[k] = (dejaCompte[k] ?? 0) + 1;
    });
  }

  function remplir(ref, region, opinion, nombre, tauxConcernes) {
    const reste = nombre - (dejaCompte[`${ref}|${region}|${opinion}`] ?? 0);
    for (let i = 0; i < reste; i++) {
      const u = nouvelUtilisateur(region, { badges: badgesAleatoires(ref, tauxConcernes) });
      nouvelAvis(ref, u, opinion, texteAleatoire(ref, opinion));
    }
  }

  const OPS = ['A', 'B', 'C', 'X'];
  for (const [region, comptes] of Object.entries(PECHE_REGIONS)) {
    comptes.forEach((c, i) => remplir('DLR5L17N52110', region, OPS[i], c, 0.09));
  }

  const totalPoids = Object.values(POIDS_POP).reduce((s, x) => s + x, 0);
  for (const [ref, { total, mix, concernes }] of Object.entries(AUTRES)) {
    const codes = REGIONS.map((r) => r.code);
    let reste = total;
    codes.forEach((region, idx) => {
      const nb = idx === codes.length - 1 ? reste : Math.round((total * POIDS_POP[region]) / totalPoids);
      reste -= nb;
      // Variation régionale : ±20 % sur la 1re opinion.
      const bruit = 1 + (rand() - 0.5) * 0.4;
      const m = mix.map((p, i) => (i === 0 ? p * bruit : p));
      const s = m.reduce((a, b) => a + b, 0);
      let r2 = nb;
      m.forEach((p, i) => {
        const c = i === m.length - 1 ? r2 : Math.round((nb * p) / s);
        r2 -= c;
        if (c > 0) remplir(ref, region, OPS[i], c, concernes);
      });
    });
  }

  // Campagne coordonnée SIMULÉE sur la loi meublés : 42 avis quasi
  // identiques, en 3 heures, depuis des comptes créés la veille. Le détecteur
  // (server/moderation/campagnes.js) doit les repérer au démarrage.
  const debutCampagne = maintenant - 20 * 3600 * 1000;
  for (let i = 0; i < 42; i++) {
    const u = nouvelUtilisateur(pick(['IDF', 'PAC', 'OCC']), { ancienneteJours: 1 + rand() });
    avis.push({
      id: `a${avis.length + 1}`,
      texte_ref: 'DLR5L17N51877',
      user_id: u.id,
      contenu: `Cette loi est une atteinte au droit de propriété, les propriétaires doivent rester libres de louer${i % 3 === 0 ? ' !' : '.'}`,
      opinion_code: 'C',
      statut: 'publie',
      classe_par: 'seed',
      a_la_une: false,
      cree_le: new Date(debutCampagne + rand() * 3 * 3600 * 1000).toISOString(),
    });
  }

  return { users, avis };
}
