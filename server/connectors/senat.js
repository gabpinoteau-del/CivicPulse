// Connecteur Sénat (data.senat.fr / data.gouv.fr)
// Exports CSV Dosleg (dossiers, thèmes, scrutins) + Ameli (amendements),
// import quotidien. Les thèmes alimentent les catégories de l'app.
import { lireFixture, parseCsv, metrique, jours } from './util.js';
import { THEMES_SENAT_VERS_CATEGORIE } from '../config.js';

export const id = 'senat';
export const nom = 'Sénat';
export const frequence = 'Quotidienne (exports CSV Dosleg et Ameli)';
export const URL_REELLE = 'https://data.senat.fr/dosleg/';

export async function recuperer() {
  return {
    dossiers: parseCsv(await lireFixture('senat/dosleg-dossiers.csv')),
    amendements: parseCsv(await lireFixture('senat/ameli-amendements.csv')),
    scrutins: parseCsv(await lireFixture('senat/dosleg-scrutins.csv')),
  };
}

export function categorieDepuisThemes(themes) {
  for (const theme of themes.split('|').map((x) => x.trim())) {
    const cat = THEMES_SENAT_VERS_CATEGORIE[theme];
    if (cat) return cat;
  }
  return null;
}

export function transformer(brut, maintenant) {
  const textes = [];
  const metriques = [];
  for (const d of brut.dossiers) {
    const ref = d['Référence AN'];
    const src = { source_libelle: 'Sénat — Dosleg', source_url: d['URL du dossier'] };
    textes.push({
      ref_an: ref,
      url_senat: d['URL du dossier'],
      stade: d['Etat du dossier'].replace(/^En (cours|attente) - /, ''),
      categorie: categorieDepuisThemes(d['Thèmes']),
      commission: d['Commission saisie au fond'],
      prochain_vote: d['Date prochaine séance publique'] || null,
    });
    if (d['Date prochaine séance publique']) {
      metriques.push(metrique(ref, id, 'prochaine_seance', d['Date prochaine séance publique'], { date_mesure: d['Date initiale'], ...src }));
    }
    const amdts = brut.amendements.filter((a) => a['Référence AN'] === ref);
    if (amdts.length) {
      const dates = amdts.map((a) => a['Date de dépôt']).sort();
      metriques.push(
        metrique(ref, id, 'amendements_deposes', amdts.length, { date_mesure: dates.at(-1), ...src }),
        metrique(ref, id, 'amendements_30j', amdts.filter((a) => jours(new Date(a['Date de dépôt']), maintenant) <= 30).length, { date_mesure: dates.at(-1), ...src }),
      );
      const t = textes.at(-1);
      t.derniere_activite = dates.at(-1);
    }
  }
  return { textes, metriques };
}
