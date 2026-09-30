import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as assemblee from '../server/connectors/assemblee.js';
import * as senat from '../server/connectors/senat.js';
import * as petitions from '../server/connectors/petitions.js';
import * as wikimedia from '../server/connectors/wikimedia.js';
import { ingerer } from '../server/connectors/index.js';
import { parseCsv } from '../server/connectors/util.js';

const MAINTENANT = new Date('2026-09-30T09:00:00+02:00');
const REF_PECHE = 'DLR5L17N52110';
const val = (ms, source, cle) => ms.find((m) => m.texte_ref === REF_PECHE && m.source === source && m.cle === cle)?.valeur;

test('Assemblée : 842 amendements dont 97 adoptés, scrutin 312 / 180 ventilé par groupe', async () => {
  const { metriques, textes } = assemblee.transformer(await assemblee.recuperer(), MAINTENANT);
  assert.equal(textes.length, 5);
  assert.equal(val(metriques, 'assemblee', 'amendements_deposes'), 842);
  assert.equal(val(metriques, 'assemblee', 'amendements_adoptes'), 97);
  const s = val(metriques, 'assemblee', 'scrutin_final');
  assert.equal(s.pour, 312);
  assert.equal(s.contre, 180);
  assert.equal(s.groupes.reduce((n, g) => n + g.pour, 0), 312, 'la ventilation par groupe retombe sur le total');
});

test('Assemblée : le flux quotidien ne renvoie que les fichiers modifiés depuis le dernier passage', async () => {
  const brut = await assemblee.recuperer({ depuis: new Date('2026-09-29T00:00:00+02:00') });
  assert.ok(brut.publications.length > 0);
  assert.ok(brut.publications.every((p) => new Date(p.dateMaj) > new Date('2026-09-29T00:00:00+02:00')));
  assert.ok(!('amendements-PRJLANR5L17B1432.json' in brut.fichiers), 'amendements AN pêche inchangés depuis juillet');
});

test('Sénat : stade, prochaine séance et catégorie depuis les thèmes Dosleg', async () => {
  const { textes, metriques } = senat.transformer(await senat.recuperer(), MAINTENANT);
  const peche = textes.find((t) => t.ref_an === REF_PECHE);
  assert.equal(peche.stade, '1re lecture Sénat');
  assert.equal(peche.categorie, 'peche');
  assert.equal(peche.prochain_vote, '2026-10-01');
  assert.equal(val(metriques, 'senat', 'amendements_deposes'), 214);
});

test('CSV : guillemets et séparateurs dans les champs', () => {
  const lignes = parseCsv('a;b\n"x;y";"il dit ""oui"""\n');
  assert.deepEqual(lignes, [{ a: 'x;y', b: 'il dit "oui"' }]);
});

test('Pétitions : seules les pétitions rattachées à un texte sont gardées', async () => {
  const { metriques } = petitions.transformer(await petitions.recuperer());
  assert.equal(metriques.length, 2);
  assert.equal(val(metriques, 'petitions', 'petition').signatures, 120431);
});

test('Wikimedia : pic d’intérêt = 7 derniers jours vs 28 précédents', async () => {
  const { metriques } = wikimedia.transformer(await wikimedia.recuperer());
  const v = val(metriques, 'wikimedia', 'vues_wikipedia');
  assert.ok(v.variation > 3 && v.variation < 4, `variation ${v.variation}`);
  assert.equal(wikimedia.variationInteret([...Array(28).fill({ views: 100 }), ...Array(7).fill({ views: 200 })]).variation, 1);
});

test('Chaque métrique cite sa source officielle (libellé + URL)', async () => {
  const { metriques, journal } = await ingerer(MAINTENANT);
  assert.ok(journal.every((j) => j.ok));
  for (const m of metriques) {
    assert.ok(m.source_libelle, `${m.cle} sans libellé de source`);
    assert.match(m.source_url, /^https:\/\//);
  }
});

test('Une source en panne ne bloque pas les autres', async () => {
  const { CONNECTEURS } = await import('../server/connectors/index.js');
  const i = CONNECTEURS.findIndex((c) => c.id === 'petitions');
  const avant = CONNECTEURS[i];
  CONNECTEURS[i] = { ...avant, recuperer: async () => { throw new Error('HTTP 503'); } };
  try {
    const { journal, metriques } = await ingerer(MAINTENANT);
    assert.equal(journal.find((j) => j.connecteur === 'petitions').ok, false);
    assert.ok(metriques.some((m) => m.source === 'assemblee'));
  } finally {
    CONNECTEURS[i] = avant;
  }
});
