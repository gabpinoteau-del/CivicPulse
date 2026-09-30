// Orchestration des connecteurs : chaque source est isolée dans son module
// (recuperer() = accès réseau/fichier, transformer() = pur, testable).
// Les résultats sont fusionnés par identifiant de dossier AN (pivot).
import * as assemblee from './assemblee.js';
import * as senat from './senat.js';
import * as petitions from './petitions.js';
import * as wikimedia from './wikimedia.js';

export const CONNECTEURS = [assemblee, senat, petitions, wikimedia];

// Planification côté serveur (tâches planifiées). En production : cron / file
// de tâches ; ici setInterval lancé par server/index.js.
export const PLANIFICATION = {
  assemblee: 60 * 60 * 1000, // vérification du flux toutes les heures
  senat: 24 * 60 * 60 * 1000,
  petitions: 7 * 24 * 60 * 60 * 1000,
  wikimedia: 24 * 60 * 60 * 1000,
};

const MOTS_CATEGORIES = [
  ['peche', /p[êe]che|quota|halieut|marin/i],
  ['logement', /logement|meubl[ée]|loyer|urbanis/i],
  ['sante', /sant[ée]|soins|m[ée]decin|h[ôo]pital/i],
  ['education', /[ée]ducation|lyc[ée]e|[ée]cole|professionnel/i],
  ['agriculture', /agricol|irrigation|agricult/i],
];
export function categorieParMotsCles(titre) {
  return MOTS_CATEGORIES.find(([, re]) => re.test(titre))?.[0] ?? 'autre';
}

export async function ingerer(maintenant, { checkpoints = {}, seulement } = {}) {
  const textes = new Map();
  const metriques = [];
  const journal = [];
  for (const c of CONNECTEURS.filter((x) => !seulement || seulement.includes(x.id))) {
    const debut = Date.now();
    try {
      const brut = await c.recuperer({ depuis: checkpoints[c.id] });
      const res = c.transformer(brut, maintenant);
      for (const t of res.textes) {
        const cur = textes.get(t.ref_an) ?? {};
        const derniere = [cur.derniere_activite, t.derniere_activite].filter(Boolean).sort().at(-1);
        textes.set(t.ref_an, { ...cur, ...Object.fromEntries(Object.entries(t).filter(([, v]) => v != null)), derniere_activite: derniere });
      }
      metriques.push(...res.metriques.map((m) => ({ ...m, recupere_le: maintenant.toISOString() })));
      checkpoints[c.id] = maintenant;
      journal.push({ connecteur: c.id, ok: true, textes: res.textes.length, metriques: res.metriques.length, ms: Date.now() - debut });
    } catch (e) {
      // Une source en panne ne bloque pas les autres : on garde les
      // dernières valeurs connues et on journalise l'erreur.
      journal.push({ connecteur: c.id, ok: false, erreur: e.message });
    }
  }
  for (const t of textes.values()) t.categorie ??= categorieParMotsCles(t.titre ?? '');
  return { textes: [...textes.values()], metriques, journal, checkpoints };
}
