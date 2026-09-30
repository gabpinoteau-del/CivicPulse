import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { creerApp } from '../server/index.js';
import { creerStore, orcidValide, sirenValide } from '../server/store.js';

let serveur, base;
before(async () => {
  serveur = createServer(await creerApp({ store: await creerStore({ maintenant: new Date('2026-09-30T09:00:00+02:00') }) }));
  await new Promise((r) => serveur.listen(0, r));
  base = `http://localhost:${serveur.address().port}/api`;
});
after(() => serveur.close());
const get = async (p) => (await fetch(base + p)).json();
const envoyer = async (p, corps, methode = 'POST') => {
  const r = await fetch(base + p, { method: methode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  return { status: r.status, data: await r.json() };
};

test('détail pêche : répartition, métriques sourcées, avertissement de représentativité', async () => {
  const t = await get('/textes/peche');
  assert.equal(t.repartition.total, 1240);
  assert.deepEqual(t.repartition.opinions.map((o) => [o.code, o.pourcentage]), [['A', 42], ['B', 35], ['C', 19]]);
  assert.ok(t.metriques.every((m) => m.source));
  assert.match(t.transparence, /pas l’ensemble de la population française/);
});

test('carte : sous 50 avis, aucun pourcentage n’est renvoyé', async () => {
  const c = await get('/textes/peche/regions');
  const bre = c.regions.find((r) => r.code === 'BRE');
  assert.deepEqual(bre.dominante, { code: 'A', pourcentage: 62 });
  for (const r of c.regions.filter((x) => x.nb_avis < 50)) {
    assert.equal(r.suffisant, false);
    assert.equal(r.dominante, null);
    assert.equal(r.opinions, null);
  }
});

test('avis affichés anonymisés : ni identifiant ni ville isolée', async () => {
  const { avis } = await get('/textes/peche/avis?page=1');
  for (const a of avis) {
    assert.ok(!('user_id' in a));
    assert.ok(a.lieu);
  }
  assert.ok(avis[0].profil[0].niveau === 'verifie', 'experts vérifiés en premier');
});

test('campagne simulée sur la loi meublés : 42 avis en revue, non comptés', async () => {
  const t = await get('/textes/logement');
  assert.equal(t.repartition.en_revue, 42);
  assert.equal(t.repartition.total, 2300);
});

test('parcours complet : dépôt, classement B, contestation, un avis par personne', async () => {
  const r1 = await envoyer('/textes/peche/avis', { contenu: 'Je suis pêcheur à Saint-Jean-de-Luz. Si on baisse encore les quotas, je devrai vendre mon bateau d’ici deux ans.' });
  assert.equal(r1.status, 201);
  assert.equal(r1.data.classement.opinion, 'B');
  const r2 = await envoyer(`/avis/${r1.data.avis.id}/contestation`, { opinion_code: 'C' });
  assert.equal(r2.data.opinion.code, 'C');
  const r3 = await envoyer('/textes/peche/avis', { contenu: 'Finalement je pense qu’il faut protéger la ressource et maintenir les quotas.' });
  assert.equal(r3.data.remplace_avis_precedent, true);
  assert.equal((await get('/moi/avis')).filter((a) => a.texte_id === 'peche').length, 1);
});

test('nouvelle opinion ouverte après 3 avis similaires', async () => {
  let r;
  for (const x of ['Il faudrait interdire la pêche électrique en Europe.', 'Il faudrait interdire la pêche électrique en Europe, c’est une catastrophe.', 'Il faudrait interdire la pêche électrique en Europe au plus vite.']) {
    r = await envoyer('/textes/sante/avis', { contenu: x }); // texte santé : hors sujet pour ses opinions
  }
  // Un seul auteur (démo) : l'avis est remplacé, la proposition ne compte qu'un avis.
  assert.equal(r.data.classement.type, 'nouvelle');
  assert.equal(r.data.classement.proposition.nombre, 1);
});

test('erreurs : avis refusé (422), texte inconnu (404), JSON invalide (400)', async () => {
  assert.equal((await envoyer('/textes/peche/avis', { contenu: 'Je vais les tuer tous.' })).status, 422);
  assert.equal((await fetch(`${base}/textes/inconnu`)).status, 404);
  const r = await fetch(`${base}/textes/peche/avis`, { method: 'POST', body: '{pas du json' });
  assert.equal(r.status, 400);
});

test('RGPD : export puis suppression des données', async () => {
  const exp = await get('/moi/export');
  assert.ok(exp.utilisateur && Array.isArray(exp.avis));
  const { data } = await envoyer('/moi', {}, 'DELETE');
  assert.ok(data.avis_supprimes >= 1);
  assert.equal((await get('/moi/avis')).length, 0);
});

test('badges : ORCID et SIREN vérifiés par clé de contrôle', async () => {
  assert.equal(orcidValide('0000-0002-1825-0097'), true);
  assert.equal(orcidValide('0000-0002-1825-0098'), false);
  assert.equal(sirenValide('732829320'), true);
  assert.equal(sirenValide('732829321'), false);
  const { status } = await envoyer('/moi/badges', { type: 'chercheur', identifiant: '1234' });
  assert.equal(status, 400);
});

test('sécurité : en-têtes CSP et pas de traversée de répertoire', async () => {
  const r = await fetch(base.replace('/api', '/../server/store.js'));
  assert.ok(!(await r.text()).includes('creerStore'));
  assert.match((await fetch(base.replace('/api', '/'))).headers.get('content-security-policy'), /script-src 'self'/);
});
