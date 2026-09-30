import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtrer } from '../server/moderation/filtre.js';
import { detecterCampagnes } from '../server/moderation/campagnes.js';

test('filtre : menaces et insultes refusées, critique virulente acceptée', () => {
  assert.equal(filtrer('Ceux qui votent ça, je vais les tuer.').statut, 'rejete');
  assert.equal(filtrer('Mort aux pêcheurs industriels !').statut, 'rejete');
  assert.equal(filtrer('Ce texte est une honte absolue, le gouvernement se moque de nous.').statut, 'ok');
  assert.equal(filtrer('trop court').statut, 'rejete');
});

test('filtre : e-mails et téléphones masqués (RGPD)', () => {
  const r = filtrer('Contactez-moi : jean.dupont@exemple.fr ou 06 12 34 56 78 pour en parler.');
  assert.equal(r.statut, 'ok');
  assert.ok(!r.contenu.includes('@') && !r.contenu.includes('06 12'));
  assert.ok(r.motifs.includes('Données personnelles masquées'));
});

const H = 3600 * 1000;
const T0 = new Date('2026-09-29T10:00:00Z').getTime();
function jeu({ n, recents, identique = true, ecartMin = 5 }) {
  const users = new Map();
  const avis = [];
  for (let i = 0; i < n; i++) {
    const id = `u${i}`;
    const creation = i < recents ? T0 - 2 * 24 * H : T0 - 400 * 24 * H;
    users.set(id, { id, cree_le: new Date(creation).toISOString() });
    avis.push({ id: `a${i}`, texte_ref: 'T', user_id: id, cree_le: new Date(T0 + i * ecartMin * 60000).toISOString(), contenu: identique ? 'Cette loi est une atteinte au droit de propriété, il faut la retirer' : `Avis numéro ${i} sur un sujet différent ${'abcdefghij'[i % 10]} ${i * 7}` });
  }
  return { avis, users };
}

test('campagne : 15 avis identiques de comptes récents en rafale sont signalés', () => {
  const { avis, users } = jeu({ n: 15, recents: 15 });
  const s = detecterCampagnes(avis, users);
  assert.ok(s.some((x) => x.type === 'avis_identiques' && x.avis_ids.length === 15));
});

test('pas de faux positif : 15 avis identiques de comptes anciens', () => {
  const { avis, users } = jeu({ n: 15, recents: 0 });
  assert.equal(detecterCampagnes(avis, users).length, 0);
});

test('afflux de comptes récents sur 24 h, même avec des textes différents', () => {
  const { avis, users } = jeu({ n: 30, recents: 25, identique: false, ecartMin: 20 });
  const s = detecterCampagnes(avis, users);
  assert.ok(s.some((x) => x.type === 'comptes_recents'));
});
