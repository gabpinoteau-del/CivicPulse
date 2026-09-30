// Paramètres centraux du MVP. Tout ce qui est ici est un choix produit
// documenté dans docs/choix-techniques.md.

// Date de référence de la démo : les données fictives sont datées autour
// du 30 septembre 2026 (vote au Sénat le jeudi 1er octobre). On peut la
// remplacer par la date réelle avec CIVICPULSE_NOW=now.
export function now() {
  const env = process.env.CIVICPULSE_NOW;
  if (env === 'now') return new Date();
  return new Date(env || '2026-09-30T09:00:00+02:00');
}

export const SEUIL_AVIS_REGION = 50; // en dessous : "pas encore assez d'avis"
export const SEUIL_SCORE_FIL = 40; // score minimal pour entrer dans le fil
export const FENETRE_VOTE_JOURS = 7; // un vote dans les 7 jours force l'affichage
export const ANCIENNETE_MAX_JOURS = 30; // sans activité depuis 30 j : hors du fil

export const REGIONS = [
  { code: 'HDF', nom: 'Hauts-de-France', col: 2, row: 0 },
  { code: 'NOR', nom: 'Normandie', col: 1, row: 1 },
  { code: 'IDF', nom: 'Île-de-France', col: 2, row: 1 },
  { code: 'GES', nom: 'Grand Est', col: 3, row: 1 },
  { code: 'BRE', nom: 'Bretagne', col: 0, row: 2 },
  { code: 'PDL', nom: 'Pays de la Loire', col: 1, row: 2 },
  { code: 'CVL', nom: 'Centre-Val de Loire', col: 2, row: 2 },
  { code: 'BFC', nom: 'Bourgogne-Franche-Comté', col: 3, row: 2 },
  { code: 'NAQ', nom: 'Nouvelle-Aquitaine', col: 1, row: 3 },
  { code: 'ARA', nom: 'Auvergne-Rhône-Alpes', col: 3, row: 3 },
  { code: 'OCC', nom: 'Occitanie', col: 2, row: 4 },
  { code: 'PAC', nom: "Provence-Alpes-Côte d'Azur", col: 3, row: 4 },
  { code: 'COR', nom: 'Corse', col: 4, row: 5 },
  { code: 'GUA', nom: 'Guadeloupe', outremer: true },
  { code: 'MTQ', nom: 'Martinique', outremer: true },
  { code: 'GUF', nom: 'Guyane', outremer: true },
  { code: 'REU', nom: 'La Réunion', outremer: true },
  { code: 'MAY', nom: 'Mayotte', outremer: true },
];

export const CATEGORIES = [
  { id: 'peche', libelle: 'Pêche', icone: '🎣' },
  { id: 'logement', libelle: 'Logement', icone: '🏠' },
  { id: 'sante', libelle: 'Santé', icone: '🏥' },
  { id: 'education', libelle: 'Éducation', icone: '🎓' },
  { id: 'agriculture', libelle: 'Agriculture', icone: '🌾' },
];

// Correspondance thèmes Sénat (Dosleg) -> catégories de l'app.
export const THEMES_SENAT_VERS_CATEGORIE = {
  'Agriculture et pêche': null, // thème mixte : on regarde le sous-thème
  'Pêche': 'peche',
  'Mer et littoral': 'peche',
  'Logement et urbanisme': 'logement',
  'Santé': 'sante',
  'Éducation': 'education',
  'Agriculture': 'agriculture',
  'Environnement': null,
};
