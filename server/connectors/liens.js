// Table de rattachement des sources qui ne portent pas l'identifiant du
// dossier législatif. En production : table `liens_sources` en base,
// proposée automatiquement (mots-clés du titre) et validée par un modérateur.

export const LIENS_PETITIONS = {
  'i-2291': 'DLR5L17N52110', // Non à une nouvelle baisse des quotas… -> loi pêche
  'i-2104': 'DLR5L17N52004', // Médecin traitant accessible -> loi accès aux soins
};

export const LIENS_WIKIPEDIA = {
  DLR5L17N52110: { fixture: 'pageviews-peche.json' },
  DLR5L17N51877: { fixture: 'pageviews-logement.json' },
  DLR5L17N52004: { fixture: 'pageviews-sante.json' },
  DLR5L17N52188: { fixture: 'pageviews-education.json' },
  DLR5L17N51650: { fixture: 'pageviews-agriculture.json' },
};
