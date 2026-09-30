// Génère les fichiers bruts FICTIFS des sources officielles, au même format
// (simplifié) que les vraies publications open data. Déterministe : relancer
// le script redonne exactement les mêmes fichiers.
//
//   npm run fixtures
//
// Les connecteurs (server/connectors/*) ne lisent que ces fichiers bruts :
// pour brancher les vraies données, il suffit de remplacer la lecture locale
// par le téléchargement réel (voir la constante URL_REELLE de chaque connecteur).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'server', 'fixtures');

function rng(seed) {
  // mulberry32
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260930);

function write(rel, content) {
  const path = join(ROOT, rel);
  mkdirSync(dirname(path), { recursive: true });
  // Les gros fichiers (amendements) sont écrits compacts pour limiter la taille du dépôt.
  const indent = rel.includes('amendements') ? 0 : 1;
  writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content, null, indent) + '\n');
}

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const REF = new Date('2026-09-30T00:00:00Z');

// ---------------------------------------------------------------------------
// Catalogue des textes fictifs
// ---------------------------------------------------------------------------
const TEXTES = [
  {
    cle: 'peche',
    uidAN: 'DLR5L17N52110',
    texteAN: 'PRJLANR5L17B1432',
    titre: 'Projet de loi relatif à la pêche durable et à l’adaptation des quotas de capture',
    titreCourt: 'Projet de loi pêche',
    type: 'Projet de loi ordinaire',
    themeSenat: 'Pêche',
    dateDepot: '2026-04-15',
    amendementsAN: { total: 842, adoptes: 97, du: '2026-05-20', au: '2026-07-06' },
    scrutinAN: { numero: '1532', date: '2026-07-08', pour: 312, contre: 180, abstentions: 10 },
    senat: {
      numero: '712 (2025-2026)',
      etat: 'En cours - 1re lecture Sénat',
      prochaineSeance: '2026-10-01',
      commission: 'Commission des affaires économiques',
      amendements: { total: 214, du: '2026-09-15', au: '2026-09-29' },
    },
    petition: { id: 'i-2291', titre: 'Non à une nouvelle baisse des quotas pour la petite pêche côtière', signatures: 120431, etat: 'En cours d’examen', depot: '2026-05-02', commission: 'Commission des affaires économiques' },
    wiki: { article: 'Projet_de_loi_relatif_à_la_pêche_durable', base: 205, pic: 902 },
  },
  {
    cle: 'logement',
    uidAN: 'DLR5L17N51877',
    texteAN: 'PPLANR5L17B1301',
    titre: 'Proposition de loi visant à réguler les meublés de tourisme dans les zones tendues',
    titreCourt: 'Loi meublés de tourisme',
    type: 'Proposition de loi ordinaire',
    themeSenat: 'Logement et urbanisme',
    dateDepot: '2026-02-03',
    amendementsAN: { total: 511, adoptes: 64, du: '2026-09-01', au: '2026-09-26' },
    scrutinAN: { numero: '1401', date: '2026-04-16', pour: 289, contre: 241, abstentions: 25 },
    senat: {
      numero: '455 (2025-2026)',
      etat: 'En cours - 2e lecture Assemblée nationale',
      prochaineSeance: '2026-10-21',
      commission: 'Commission des affaires économiques',
      amendements: { total: 0 },
    },
    petition: null,
    wiki: { article: 'Meublé_de_tourisme', base: 610, pic: 1180 },
  },
  {
    cle: 'sante',
    uidAN: 'DLR5L17N52004',
    texteAN: 'PPLANR5L17B1377',
    titre: 'Proposition de loi pour garantir l’accès aux soins dans les territoires sous-dotés',
    titreCourt: 'Loi accès aux soins',
    type: 'Proposition de loi ordinaire',
    themeSenat: 'Santé',
    dateDepot: '2026-03-11',
    amendementsAN: { total: 377, adoptes: 51, du: '2026-05-04', au: '2026-06-10' },
    scrutinAN: { numero: '1488', date: '2026-06-12', pour: 402, contre: 88, abstentions: 41 },
    senat: {
      numero: '688 (2025-2026)',
      etat: 'En cours - 1re lecture Sénat',
      prochaineSeance: '2026-10-28',
      commission: 'Commission des affaires sociales',
      amendements: { total: 96, du: '2026-09-10', au: '2026-09-25' },
    },
    petition: { id: 'i-2104', titre: 'Pour un médecin traitant accessible partout', signatures: 48210, etat: 'Classée', depot: '2026-01-20', commission: 'Commission des affaires sociales' },
    wiki: { article: 'Désert_médical_en_France', base: 540, pic: 690 },
  },
  {
    cle: 'education',
    uidAN: 'DLR5L17N52188',
    texteAN: 'PRJLANR5L17B1455',
    titre: 'Projet de loi d’orientation pour la voie professionnelle',
    titreCourt: 'Loi voie professionnelle',
    type: 'Projet de loi ordinaire',
    themeSenat: 'Éducation',
    dateDepot: '2026-07-22',
    amendementsAN: { total: 38, adoptes: 0, du: '2026-09-20', au: '2026-09-28' },
    scrutinAN: null,
    senat: null,
    petition: null,
    wiki: { article: 'Lycée_professionnel_en_France', base: 300, pic: 330 },
  },
  {
    cle: 'agriculture',
    uidAN: 'DLR5L17N51650',
    texteAN: 'PPLANR5L17B1190',
    titre: 'Proposition de loi relative au partage de l’eau pour l’irrigation agricole',
    titreCourt: 'Loi eau agricole',
    type: 'Proposition de loi ordinaire',
    themeSenat: 'Agriculture',
    dateDepot: '2026-01-14',
    amendementsAN: { total: 206, adoptes: 23, du: '2026-06-01', au: '2026-07-20' },
    scrutinAN: { numero: '1510', date: '2026-07-23', pour: 270, contre: 230, abstentions: 30 },
    senat: {
      numero: '740 (2025-2026)',
      etat: 'En attente - 1re lecture Sénat',
      prochaineSeance: '',
      commission: 'Commission des affaires économiques',
      amendements: { total: 0 },
    },
    petition: null,
    wiki: { article: 'Irrigation_en_France', base: 260, pic: 250 },
  },
];

// ---------------------------------------------------------------------------
// 1. Assemblée nationale
// ---------------------------------------------------------------------------
const SORTS = ['Rejeté', 'Non soutenu', 'Retiré', 'Tombé'];
const flux = [];

const dossiers = TEXTES.map((t) => ({
  dossierParlementaire: {
    uid: t.uidAN,
    legislature: '17',
    titreDossier: { titre: t.titre, titreChemin: t.cle },
    procedureParlementaire: { libelle: t.type },
    actesLegislatifs: {
      acteLegislatif: [
        { codeActe: 'AN1-DEPOT', dateActe: t.dateDepot, texteAssocie: t.texteAN },
        ...(t.scrutinAN ? [{ codeActe: 'AN1-DEBATS-DEC', dateActe: t.scrutinAN.date, voteRefs: { voteRef: `VTANR5L17V${t.scrutinAN.numero}` }, statutConclusion: { libelle: 'adopté' } }] : []),
        ...(t.senat ? [{ codeActe: 'SN1-DEPOT', dateActe: t.scrutinAN ? iso(addDays(new Date(t.scrutinAN.date), 3)) : t.dateDepot }] : []),
      ],
    },
  },
}));
write('an/dossiers-legislatifs.json', { export: { dossiersLegislatifs: { dossier: dossiers } } });
flux.push({ fichier: 'dossiers-legislatifs.json', type: 'dossiers', dateMaj: '2026-09-30T06:00:00+02:00' });

for (const t of TEXTES) {
  const a = t.amendementsAN;
  const du = new Date(a.du);
  const span = Math.max(1, Math.round((new Date(a.au) - du) / 86400000));
  const adoptesIdx = new Set();
  while (adoptesIdx.size < a.adoptes) adoptesIdx.add(Math.floor(rand() * a.total));
  const liste = [];
  for (let i = 0; i < a.total; i++) {
    const encours = !t.scrutinAN; // texte pas encore voté : sort non connu
    liste.push({
      uid: `AMANR5L17PO${t.texteAN.slice(-4)}N${String(i + 1).padStart(4, '0')}`,
      identification: { numeroLong: `${i < a.total * 0.6 ? 'CE' : ''}${i + 1}` },
      texteLegislatifRef: t.texteAN,
      cycleDeVie: {
        dateDepot: iso(addDays(du, Math.floor(rand() * (span + 1)))),
        sort: encours ? null : adoptesIdx.has(i) ? 'Adopté' : SORTS[Math.floor(rand() * SORTS.length)],
        etatDesTraitements: { etat: { libelle: encours ? 'En traitement' : 'Traité' } },
      },
    });
  }
  write(`an/amendements-${t.texteAN}.json`, { export: { amendements: { amendement: liste } } });
  flux.push({ fichier: `amendements-${t.texteAN}.json`, type: 'amendements', dateMaj: `${a.au}T22:00:00+02:00` });
}

const GROUPES = [
  ['PO845401', 'RN', 123], ['PO845407', 'EPR', 92], ['PO845413', 'LFI-NFP', 71], ['PO845419', 'SOC', 66],
  ['PO845425', 'DR', 47], ['PO845431', 'EcoS', 38], ['PO845437', 'Dem', 36], ['PO845443', 'HOR', 34],
  ['PO845449', 'LIOT', 23], ['PO845455', 'GDR', 17], ['PO845461', 'UDR', 16], ['PO845467', 'NI', 8],
];
const scrutins = TEXTES.filter((t) => t.scrutinAN).map((t) => {
  const s = t.scrutinAN;
  // Ventilation par groupe : répartit pour/contre/abstention proportionnellement.
  let restePour = s.pour, resteContre = s.contre, resteAbs = s.abstentions;
  const groupes = GROUPES.map(([ref, sigle, membres], i) => {
    const last = i === GROUPES.length - 1;
    const part = membres / 577;
    const pour = last ? restePour : Math.min(restePour, Math.round(s.pour * part * (0.6 + rand() * 0.8)));
    const contre = last ? resteContre : Math.min(resteContre, Math.round(s.contre * part * (0.6 + rand() * 0.8)));
    const abst = last ? resteAbs : Math.min(resteAbs, Math.round(s.abstentions * part));
    restePour -= pour; resteContre -= contre; resteAbs -= abst;
    const pos = pour >= contre && pour >= abst ? 'pour' : contre >= abst ? 'contre' : 'abstention';
    return { organeRef: ref, libelleAbrege: sigle, nombreMembresGroupe: String(membres), vote: { positionMajoritaire: pos, decompteVoix: { pour: String(pour), contre: String(contre), abstentions: String(abst) } } };
  });
  return {
    scrutin: {
      uid: `VTANR5L17V${s.numero}`,
      numero: s.numero,
      dateScrutin: s.date,
      typeVote: { libelleTypeVote: 'scrutin public solennel' },
      sort: { code: 'adopté', libelle: 'l\'Assemblée nationale a adopté' },
      titre: `l'ensemble du ${t.titre.charAt(0).toLowerCase()}${t.titre.slice(1)} (première lecture)`,
      objet: { dossierLegislatif: t.uidAN },
      syntheseVote: {
        nombreVotants: String(s.pour + s.contre + s.abstentions),
        suffragesExprimes: String(s.pour + s.contre),
        decompte: { pour: String(s.pour), contre: String(s.contre), abstentions: String(s.abstentions), nonVotants: '0' },
      },
      ventilationVotes: { organe: { groupes: { groupe: groupes } } },
    },
  };
});
write('an/scrutins.json', { export: { scrutins: { scrutin: scrutins } } });
flux.push({ fichier: 'scrutins.json', type: 'scrutins', dateMaj: '2026-09-30T06:00:00+02:00' });
write('an/flux-quotidien.json', { genere: '2026-09-30T06:05:00+02:00', publications: flux });

// ---------------------------------------------------------------------------
// 2. Sénat — exports CSV Dosleg (séparateur « ; »)
// ---------------------------------------------------------------------------
const csvEsc = (v) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ''));
const dosleg = [
  ['Titre', 'URL du dossier', 'Type de dossier', 'Etat du dossier', 'Thèmes', 'Date initiale', 'Numéro du texte', 'Commission saisie au fond', 'Date prochaine séance publique', 'Référence AN'],
];
for (const t of TEXTES.filter((x) => x.senat)) {
  dosleg.push([
    t.titre,
    `https://www.senat.fr/dossier-legislatif/pjl25-${t.cle}.html`,
    t.type,
    t.senat.etat,
    t.themeSenat === 'Pêche' ? 'Agriculture et pêche|Pêche|Mer et littoral' : t.themeSenat,
    t.dateDepot,
    t.senat.numero,
    t.senat.commission,
    t.senat.prochaineSeance,
    t.uidAN,
  ]);
}
write('senat/dosleg-dossiers.csv', dosleg.map((r) => r.map(csvEsc).join(';')).join('\n') + '\n');

const ameli = [['Numéro', 'Texte', 'Date de dépôt', 'Sort', 'Référence AN']];
for (const t of TEXTES.filter((x) => x.senat && x.senat.amendements.total)) {
  const a = t.senat.amendements;
  const du = new Date(a.du);
  const span = Math.round((new Date(a.au) - du) / 86400000);
  for (let i = 0; i < a.total; i++) {
    ameli.push([`${i + 1}`, t.senat.numero, iso(addDays(du, Math.floor(rand() * (span + 1)))), 'Non encore examiné', t.uidAN]);
  }
}
write('senat/ameli-amendements.csv', ameli.map((r) => r.map(csvEsc).join(';')).join('\n') + '\n');
write('senat/dosleg-scrutins.csv', 'Numéro;Date;Objet;Référence AN;Pour;Contre;Abstentions;Résultat\n');

// ---------------------------------------------------------------------------
// 3. Pétitions de l'Assemblée — jeu de données data.gouv.fr (JSON)
// ---------------------------------------------------------------------------
const petitions = TEXTES.filter((t) => t.petition).map((t) => ({
  id: t.petition.id,
  titre: t.petition.titre,
  date_depot: t.petition.depot,
  etat: t.petition.etat,
  commission: t.petition.commission,
  nombre_signatures: t.petition.signatures,
  url: `https://petitions.assemblee-nationale.fr/initiatives/${t.petition.id}`,
}));
petitions.push({ id: 'i-2310', titre: 'Pour la gratuité des transports scolaires', date_depot: '2026-06-01', etat: 'En cours d’examen', commission: 'Commission des affaires culturelles', nombre_signatures: 8120, url: 'https://petitions.assemblee-nationale.fr/initiatives/i-2310' });
write('petitions/petitions-an.json', { derniere_mise_a_jour: '2026-09-28', petitions });

// ---------------------------------------------------------------------------
// 4. Wikimedia Analytics — format exact de l'API REST pageviews per-article
// ---------------------------------------------------------------------------
for (const t of TEXTES) {
  const items = [];
  for (let d = 59; d >= 1; d--) {
    const day = addDays(REF, -d);
    const recent = d <= 7;
    const base = recent ? t.wiki.pic : t.wiki.base;
    const views = Math.round(base * (0.85 + rand() * 0.3));
    items.push({
      project: 'fr.wikipedia',
      article: t.wiki.article,
      granularity: 'daily',
      timestamp: `${iso(day).replace(/-/g, '')}00`,
      access: 'all-access',
      agent: 'user',
      views,
    });
  }
  write(`wikimedia/pageviews-${t.cle}.json`, { items });
}

console.log(`Fixtures générées dans ${ROOT}`);
