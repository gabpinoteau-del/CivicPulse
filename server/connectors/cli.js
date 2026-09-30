// npm run ingest : lance tous les connecteurs et affiche le score de chaque texte.
import { ingerer } from './index.js';
import { now } from '../config.js';
import { creerStore } from '../store.js';

const maintenant = now();
const { journal } = await ingerer(maintenant);
console.table(journal);
const store = await creerStore({ maintenant });
console.table(
  store.listerTextes().map((t) => ({
    texte: t.titre_court,
    score: t.score.total,
    activite: t.score.activite,
    interet: t.score.interet,
    participation: t.score.participation,
    dans_le_fil: t.score.dans_le_fil,
    raison: t.score.raison,
  })),
);
