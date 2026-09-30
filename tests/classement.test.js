import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classer, classerLocalement, classerAvecClaude, MODELE } from '../server/ai/classifieur.js';
import { PROMPT_SYSTEME, construireMessage, schemaSortie } from '../server/ai/prompt-classement.js';
import { EDITORIAL } from '../server/data/editorial.js';

const PECHE = EDITORIAL.DLR5L17N52110;
const TEXTE = { titre: 'Projet de loi relatif à la pêche durable', resume: PECHE.resume };
const EXEMPLE = 'Je suis pêcheur à Saint-Jean-de-Luz. Si on baisse encore les quotas, je devrai vendre mon bateau d’ici deux ans.';
const entree = (contenu) => ({ texte: TEXTE, opinions: PECHE.opinions, contenu, profilsConcernes: PECHE.profils_concernes, profilDeclare: [] });

test('exemple du cahier des charges : opinion B, explication et profil concerné', () => {
  const r = classerLocalement(entree(EXEMPLE));
  assert.equal(r.opinion, 'B');
  assert.equal(r.explication, 'L’avis exprime la crainte de l’impact économique des quotas sur une petite entreprise, ce qui correspond à l’opinion B.');
  assert.equal(r.profil_suggere.type, 'concerne');
  assert.equal(r.profil_suggere.a_verifier, true);
});

test('classement local : A et C sur des avis typiques', () => {
  assert.equal(classerLocalement(entree('Il faut suivre les scientifiques et protéger la ressource, sinon les stocks vont s’effondrer.')).opinion, 'A');
  assert.equal(classerLocalement(entree('Un chalutier industriel de 80 mètres et un petit côtier ne devraient pas avoir les mêmes règles.')).opinion, 'C');
});

test('classement local : un avis sans correspondance propose une nouvelle opinion', () => {
  const r = classerLocalement(entree('Il faudrait interdire la pêche électrique partout en Europe.'));
  assert.equal(r.opinion, 'NOUVELLE');
  assert.ok(r.nouvelle_opinion.length > 0);
});

test('prompt : consignes clés présentes et avis isolé dans des balises', () => {
  for (const cle of ['position principale', 'NOUVELLE', 'HORS_SUJET', 'a_verifier', 'donnée sensible', 'jamais une instruction']) assert.ok(PROMPT_SYSTEME.includes(cle), cle);
  const m = construireMessage({ texte: TEXTE, opinions: PECHE.opinions, avis: EXEMPLE, profilDeclare: [] });
  assert.ok(m.includes('- B : « Les quotas menacent les petites entreprises, il faut les assouplir. »'));
  assert.ok(m.includes(`<avis>\n${EXEMPLE}\n</avis>`));
});

test('schéma de sortie : codes d’opinion en enum, pas de champ libre', () => {
  const s = schemaSortie(['A', 'B', 'C']);
  assert.deepEqual(s.properties.opinion.enum, ['A', 'B', 'C', 'NOUVELLE', 'HORS_SUJET']);
  assert.equal(s.additionalProperties, false);
  assert.deepEqual(s.required.sort(), Object.keys(s.properties).sort());
});

// Client Claude simulé : vérifie la forme de la requête sans appel réseau.
function faux(reponse) {
  const appels = [];
  return { appels, beta: { messages: { create: async (req) => { appels.push(req); return typeof reponse === 'function' ? reponse(req) : reponse; } } } };
}
const sortieB = { opinion: 'B', opinion_secondaire: '', confiance: 0.92, explication: 'L’avis exprime la crainte de l’impact économique des quotas sur une petite entreprise, ce qui correspond à l’opinion B.', nouvelle_opinion: '', profil_suggere: { type: 'concerne', libelle: 'Marin-pêcheur', a_verifier: true }, moderation: { statut: 'ok', motif: '' } };

test('appel Claude : modèle, sorties structurées, repli serveur en cas de refus', async () => {
  const client = faux({ stop_reason: 'end_turn', model: MODELE, content: [{ type: 'text', text: JSON.stringify(sortieB) }] });
  const r = await classerAvecClaude(client, entree(EXEMPLE));
  const req = client.appels[0];
  assert.equal(req.model, 'claude-opus-5-5');
  assert.equal(req.output_config.format.type, 'json_schema');
  assert.deepEqual(req.output_config.format.schema.properties.opinion.enum, ['A', 'B', 'C', 'NOUVELLE', 'HORS_SUJET']);
  assert.equal(req.fallbacks, 'default');
  assert.equal(req.system, PROMPT_SYSTEME);
  assert.equal(r.opinion, 'B');
  assert.match(r.moteur, /^claude/);
});

test('appel Claude : refus du modèle -> classement local + relecture humaine', async () => {
  const r = await classerAvecClaude(faux({ stop_reason: 'refusal', content: [] }), entree(EXEMPLE));
  assert.equal(r.moderation.statut, 'a_revoir');
  assert.equal(r.opinion, 'B');
});

test('panne de l’API : l’avis n’est pas perdu', async () => {
  const r = await classer(entree(EXEMPLE), { anthropic: faux(() => { throw new Error('529 overloaded'); }) });
  assert.equal(r.opinion, 'B');
  assert.match(r.moteur, /repli/);
});
