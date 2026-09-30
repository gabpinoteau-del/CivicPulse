// Connecteur Pétitions de l'Assemblée nationale (jeu de données data.gouv.fr)
// Nombre de signatures, statut, commission — import hebdomadaire.
// Le lien pétition -> texte n'existe pas dans la source : il est tenu dans
// liens.js (proposé automatiquement par mots-clés, validé par un humain).
import { lireFixture, metrique } from './util.js';
import { LIENS_PETITIONS } from './liens.js';

export const id = 'petitions';
export const nom = 'Pétitions de l’Assemblée nationale';
export const frequence = 'Hebdomadaire (data.gouv.fr)';
export const URL_REELLE = 'https://www.data.gouv.fr/fr/datasets/?q=petitions+assemblee+nationale';

export async function recuperer() {
  return JSON.parse(await lireFixture('petitions/petitions-an.json'));
}

export function transformer(brut) {
  const metriques = [];
  for (const p of brut.petitions) {
    const ref = LIENS_PETITIONS[p.id];
    if (!ref) continue; // pétition non rattachée à un texte suivi
    metriques.push(
      metrique(ref, id, 'petition', {
        id: p.id,
        titre: p.titre,
        signatures: p.nombre_signatures,
        etat: p.etat,
        commission: p.commission,
      }, { date_mesure: brut.derniere_mise_a_jour, source_libelle: 'Pétitions AN — data.gouv.fr', source_url: p.url }),
    );
  }
  return { textes: [], metriques };
}
