// Connecteur Wikimedia Analytics (API REST pageviews, sans clé)
// Vues quotidiennes de l'article Wikipédia lié au texte : détecte les pics
// d'intérêt (moyenne des 7 derniers jours vs 28 jours précédents).
import { lireFixture, metrique } from './util.js';
import { LIENS_WIKIPEDIA } from './liens.js';

export const id = 'wikimedia';
export const nom = 'Wikimedia (vues Wikipédia)';
export const frequence = 'Quotidienne';
export const URL_REELLE =
  'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/{article}/daily/{debut}/{fin}';

export async function recuperer() {
  const out = {};
  for (const [ref, { fixture }] of Object.entries(LIENS_WIKIPEDIA)) {
    out[ref] = JSON.parse(await lireFixture(`wikimedia/${fixture}`));
  }
  return out;
}

export function variationInteret(items) {
  const vues = items.map((i) => i.views);
  const moy = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const recent = moy(vues.slice(-7));
  const reference = moy(vues.slice(-35, -7));
  return { recent: Math.round(recent), reference: Math.round(reference), variation: reference ? recent / reference - 1 : 0 };
}

export function transformer(brut) {
  const metriques = [];
  for (const [ref, { items }] of Object.entries(brut)) {
    const v = variationInteret(items);
    const article = items[0].article;
    metriques.push(
      metrique(ref, id, 'vues_wikipedia', { ...v, article, serie: items.slice(-28).map((i) => i.views) }, {
        date_mesure: items.at(-1).timestamp.replace(/(\d{4})(\d{2})(\d{2})\d{2}/, '$1-$2-$3'),
        source_libelle: 'Wikimedia Analytics — vues de l’article Wikipédia',
        source_url: `https://pageviews.wmcloud.org/?project=fr.wikipedia.org&pages=${encodeURIComponent(article)}`,
      }),
    );
  }
  return { textes: [], metriques };
}
