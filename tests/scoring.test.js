import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerScore, divergence, facteurAnciennete, scoreInteret, joursAvantVote } from '../server/scoring.js';
import { creerStore } from '../server/store.js';

const MAINTENANT = new Date('2026-09-30T09:00:00+02:00');

test('divergence : 0 pour l’unanimité, 1 pour une répartition égale', () => {
  assert.equal(divergence([100]), 0);
  assert.equal(divergence([50, 50]), 1);
  assert.ok(divergence([78, 16, 6]) < divergence([36, 33, 27, 4]));
});

test('ancienneté : plein score jusqu’à 14 jours, 0 au-delà de 30', () => {
  assert.equal(facteurAnciennete(10), 1);
  assert.equal(facteurAnciennete(22), 0.75);
  assert.equal(facteurAnciennete(30), 0.5);
  assert.equal(facteurAnciennete(31), 0);
});

test('intérêt public : pétition sur échelle log et pic Wikipédia plafonné', () => {
  assert.equal(scoreInteret({ signatures: 0, variationWiki: 0 }), 0);
  assert.equal(scoreInteret({ signatures: 500000, variationWiki: 5 }), 1);
});

test('jours avant le vote calculés en jours calendaires à Paris', () => {
  assert.equal(joursAvantVote('2026-10-01', MAINTENANT), 1);
  assert.equal(joursAvantVote('2026-09-30', MAINTENANT), 0);
  assert.equal(joursAvantVote('2026-09-01', MAINTENANT), null);
});

test('un vote dans les 7 jours force l’entrée dans le fil, même avec un score faible', () => {
  const s = calculerScore({ prochainVote: '2026-10-03', derniereActivite: '2026-01-01', amendements30j: 0, signatures: 0, variationWiki: 0, nbAvis: 0, partsOpinions: [] }, MAINTENANT);
  assert.ok(s.total < 40);
  assert.equal(s.dans_le_fil, true);
});

test('un texte sans activité depuis plus de 30 jours sort du fil', () => {
  const s = calculerScore({ prochainVote: null, derniereActivite: '2026-07-23', amendements30j: 0, signatures: 200000, variationWiki: 3, nbAvis: 5000, partsOpinions: [50, 50] }, MAINTENANT);
  assert.equal(s.dans_le_fil, false);
  assert.equal(s.total, 0);
});

test('scores des 5 textes fictifs : pêche en tête, fil = 3 textes', async () => {
  const store = await creerStore({ maintenant: MAINTENANT });
  const textes = store.listerTextes();
  const par = Object.fromEntries(textes.map((t) => [t.id, t.score]));
  assert.equal(textes[0].id, 'peche');
  assert.equal(par.peche.total, 88);
  assert.equal(par.peche.raison, 'Vote dans 1 jour');
  assert.equal(par.education.dans_le_fil, false); // score < 40 : Explorer seulement
  assert.equal(par.agriculture.dans_le_fil, false); // 66 jours sans activité
  assert.deepEqual(store.accueil().fil.map((t) => t.id), ['peche', 'logement', 'sante']);
});

test('pourcentages arrondis : la somme fait toujours 100', async () => {
  const { pourcentages } = await import('../server/store.js');
  assert.deepEqual(pourcentages([527, 429, 234, 50]), [42, 35, 19, 4]);
  assert.deepEqual(pourcentages([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(pourcentages([0, 0]), [0, 0]);
});
