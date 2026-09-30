// Test de bout en bout dans Chromium (Playwright), en affichage mobile.
//   npm run e2e
// Démarre le serveur en mémoire, parcourt tous les écrans, vérifie la
// navigation, le parcours d'avis complet et enregistre des captures dans
// docs/captures/.
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { creerApp } from '../../server/index.js';
import { chargerPlaywright } from './charger-playwright.mjs';

const CAPTURES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'captures');
mkdirSync(CAPTURES, { recursive: true });

const serveur = createServer(await creerApp());
await new Promise((r) => serveur.listen(0, r));
const base = `http://localhost:${serveur.address().port}/`;

const { chromium } = chargerPlaywright();
const navigateur = await chromium.launch();
const resultats = [];
let echec = false;

async function etape(nom, fn) {
  try {
    await fn();
    resultats.push(`✔ ${nom}`);
  } catch (e) {
    echec = true;
    resultats.push(`✘ ${nom}\n    ${e.message.split('\n')[0]}`);
  }
}

async function nouvellePage(largeur = 390, hauteur = 844, options = {}) {
  const page = await navigateur.newPage({ viewport: { width: largeur, height: hauteur }, deviceScaleFactor: 2, ...options });
  page.erreurs = [];
  page.on('pageerror', (e) => page.erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.erreurs.push(m.text()); });
  return page;
}

async function pasDeDebordement(page) {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  assert.ok(sw <= iw, `débordement horizontal : ${sw}px > ${iw}px`);
}

const page = await nouvellePage();
const titreH1 = () => page.locator('h1').first().textContent();
// Les nombres français utilisent des espaces insécables : on les normalise.
const texteDe = async (loc) => (await loc.textContent()).replace(/[\u202f\u00a0]/g, ' ');

await etape('Accueil : carte « Vote cette semaine » avec métriques', async () => {
  await page.goto(base);
  await page.getByText('Vote cette semaine').waitFor();
  const carte = page.locator('.carte').first();
  const texte = await texteDe(carte);
  for (const attendu of ['Projet de loi pêche', 'Vote demain', '1 240 avis', 'amendements', 'signatures', 'Intérêt']) assert.ok(texte.includes(attendu), `manque « ${attendu} »`);
  assert.ok(await page.getByText('Débats très partagés').isVisible());
  assert.ok(await page.getByText('Où il y a consensus').isVisible());
  assert.equal(await page.locator('.categories a').count(), 5);
  await page.screenshot({ path: join(CAPTURES, '1-accueil.png') });
  await pasDeDebordement(page);
});

await etape('Barre de navigation : les 4 onglets fonctionnent', async () => {
  for (const [lien, h1, onglet] of [['Explorer', 'Explorer', 'explorer'], ['Mes avis', 'Mes avis', 'mes-avis'], ['Compte', 'Compte', 'compte'], ['Accueil', 'Actus', 'accueil']]) {
    await page.locator('.barre-onglets').getByRole('link', { name: lien }).click();
    await page.waitForFunction((o) => document.querySelector(`.barre-onglets a[data-onglet="${o}"]`)?.getAttribute('aria-current') === 'page', onglet);
    await page.locator('h1').first().waitFor();
    assert.ok((await titreH1()).includes(h1), `titre attendu ${h1}, obtenu ${await titreH1()}`);
    assert.equal(await page.locator('.barre-onglets [aria-current="page"]').count(), 1);
    await pasDeDebordement(page);
  }
});

await etape('Sélecteur Actus / Carte et barre de localisation', async () => {
  await page.locator('.segment').getByRole('link', { name: 'Carte' }).click();
  await page.locator('.carte-france').waitFor();
  assert.equal(await page.locator('.segment [aria-current="page"]').textContent(), 'Carte');
  assert.ok((await page.locator('.localisation').textContent()).includes('Lorient'));
});

await etape('Carte : pastilles par région, gris sous 50 avis', async () => {
  const bretagne = page.locator('[data-region="BRE"]');
  assert.match(await bretagne.getAttribute('aria-label'), /opinion A en tête, 62 %/);
  assert.match(await page.locator('[data-region="GES"]').getAttribute('aria-label'), /pas encore assez d’avis \(40\)/);
  assert.ok((await page.locator('#detail-region').textContent()).includes('Bretagne : opinion A (62 %)'));
  await page.screenshot({ path: join(CAPTURES, '2-carte.png') });
  await page.locator('[data-region="NAQ"]').click();
  assert.ok((await page.locator('#detail-region').textContent()).includes('Nouvelle-Aquitaine : opinion B'));
  await page.locator('[data-region="COR"]').click();
  assert.ok((await page.locator('#detail-region').textContent()).includes('Pas encore assez d’avis'));
  await page.getByRole('link', { name: 'Voir sous forme de tableau' }).click();
  await page.locator('table').waitFor();
  assert.equal(await page.locator('tbody tr').count(), 18);
  await pasDeDebordement(page);
});

await etape('Détail : résumé neutre, métriques sourcées, opinions, avis classés', async () => {
  await page.goto(`${base}#/texte/peche`);
  await page.getByText('Ce que le texte change').waitFor();
  const metriques = await texteDe(page.locator('.metriques'));
  for (const attendu of ['1re lecture Sénat', 'demain', 'adopté 312 / 180', '842 déposés (97 adoptés)', '120 431 signatures', '+359 %']) assert.ok(metriques.includes(attendu), `métrique manquante : ${attendu}`);
  assert.equal(await page.locator('.metriques .source').count(), 7, 'chaque métrique cite sa source');
  assert.ok((await page.locator('[role="note"]').textContent()).includes('pas l’ensemble de la population française'));
  const premier = await page.locator('.avis').first().textContent();
  assert.ok(premier.includes('vérifié'), 'un profil vérifié apparaît en premier');
  await page.screenshot({ path: join(CAPTURES, '3-detail.png') });
  await page.locator('[data-opinion="B"]').click();
  await page.waitForFunction(() => [...document.querySelectorAll('.avis .pied')].every((e) => e.textContent.includes('Opinion B')));
  await page.getByRole('tab', { name: 'Texte complet' }).click();
  await page.getByText('Dossier sur le site du Sénat').waitFor();
  await pasDeDebordement(page);
});

await etape('Parcours d’avis : exemple du pêcheur classé dans l’opinion B', async () => {
  await page.goto(`${base}#/texte/peche`);
  await page.getByRole('link', { name: /Ajouter mon avis/ }).click();
  await page.locator('#avis').fill('Je suis pêcheur à Saint-Jean-de-Luz. Si on baisse encore les quotas, je devrai vendre mon bateau d’ici deux ans.');
  await page.screenshot({ path: join(CAPTURES, '4-saisie.png') });
  await page.getByRole('button', { name: 'Envoyer mon avis' }).click();
  await page.getByText('Ton avis a rejoint l’opinion B').waitFor();
  const corps = await page.locator('main').textContent();
  assert.ok(corps.includes('crainte de l’impact économique des quotas sur une petite entreprise'));
  assert.ok(corps.includes('Tu sembles directement concerné·e'));
  await page.screenshot({ path: join(CAPTURES, '5-confirmation.png') });
  await page.getByRole('button', { name: 'Ajouter le badge' }).click();
  await page.locator('#suggestion-profil').getByText('Badge ajouté').waitFor();
  await page.getByLabel(/^C —/).check();
  await page.getByRole('button', { name: 'Contester le classement' }).click();
  await page.getByText('ton avis est maintenant dans l’opinion C').waitFor();
  await pasDeDebordement(page);
});

await etape('Mes avis : l’avis apparaît avec son opinion', async () => {
  await page.locator('.barre-onglets').getByRole('link', { name: 'Mes avis' }).click();
  await page.getByText('Saint-Jean-de-Luz').waitFor();
  assert.ok((await page.locator('main').textContent()).includes('Opinion C'));
  await page.screenshot({ path: join(CAPTURES, '6-mes-avis.png') });
});

await etape('Modération : un avis menaçant est refusé', async () => {
  await page.goto(`${base}#/texte/peche/avis`);
  await page.locator('#avis').fill('Les députés qui votent ça, je vais les tuer.');
  await page.getByRole('button', { name: 'Envoyer mon avis' }).click();
  await page.getByText('Menace de violence').waitFor();
});

await etape('Sécurité : un avis contenant du HTML s’affiche comme du texte', async () => {
  await page.goto(`${base}#/texte/logement/avis`);
  await page.locator('#avis').fill('Test <img src=x onerror="window.pirate=1"> il faut limiter les meublés pour les habitants.');
  await page.getByRole('button', { name: 'Envoyer mon avis' }).click();
  await page.getByText('Ton avis a rejoint').waitFor();
  await page.goto(`${base}#/mes-avis`);
  await page.getByText('<img src=x', { exact: false }).first().waitFor();
  assert.equal(await page.evaluate(() => window.pirate), undefined);
  assert.equal(await page.locator('main img').count(), 0);
});

await etape('Explorer : les textes hors du fil restent accessibles', async () => {
  await page.goto(`${base}#/explorer`);
  await page.locator('#resultats .carte').first().waitFor();
  const t = await page.locator('#resultats').textContent();
  assert.ok(t.includes('Loi eau agricole') && t.includes('hors du fil'));
  await page.goto(`${base}#/explorer?categorie=peche`);
  await page.waitForFunction(() => document.querySelectorAll('#resultats .carte').length === 1);
  await page.screenshot({ path: join(CAPTURES, '7-explorer.png') });
});

await etape('Compte : modification de la localisation', async () => {
  await page.goto(`${base}#/compte`);
  await page.locator('#ville').fill('Bayonne');
  await page.locator('#region').selectOption('NAQ');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByText('Localisation enregistrée.').waitFor();
  assert.ok((await page.locator('.localisation').textContent()).includes('Bayonne'));
  await page.locator('#type-badge').selectOption('chercheur');
  await page.locator('#identifiant').fill('0000-0002-1825-0097');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await page.getByText('vérifié ORCID').waitFor();
  await page.screenshot({ path: join(CAPTURES, '8-compte.png') });
});

await etape('Accessibilité : noms accessibles, titres, langue', async () => {
  for (const h of ['#/', '#/carte', '#/texte/peche', '#/texte/peche/avis', '#/explorer', '#/compte']) {
    await page.goto(`${base}${h}`);
    await page.locator('main h1, header h1').first().waitFor();
    const sansNom = await page.evaluate(() => [...document.querySelectorAll('a, button, input, select, textarea')]
      .filter((e) => !e.closest('[hidden]'))
      .filter((e) => {
        const nom = e.getAttribute('aria-label') || e.textContent.trim() || (e.id && document.querySelector(`label[for="${e.id}"]`)?.textContent) || e.closest('label')?.textContent;
        return !nom || !nom.trim();
      }).map((e) => e.outerHTML.slice(0, 80)));
    assert.deepEqual(sansNom, [], `${h} : éléments sans nom accessible`);
    assert.equal(await page.locator('h1').count(), 1, `${h} : un seul h1`);
  }
  assert.equal(await page.getAttribute('html', 'lang'), 'fr');
  const petits = await page.evaluate(() => [...document.querySelectorAll('.barre-onglets a, .bouton, .segment a')].filter((e) => e.getBoundingClientRect().height < 44).length);
  assert.equal(petits, 0, 'cibles tactiles < 44 px');
});

await etape('Aucune erreur JavaScript ni violation CSP', async () => {
  assert.deepEqual(page.erreurs.filter((e) => !e.includes('status of 422')), []);
});

await etape('Affichage large (tablette / ordinateur) et mode sombre', async () => {
  const large = await nouvellePage(1280, 900);
  await large.goto(base);
  await large.getByText('Vote cette semaine').waitFor();
  await large.screenshot({ path: join(CAPTURES, '9-bureau.png') });
  await pasDeDebordement(large);
  const sombre = await nouvellePage(390, 844, { colorScheme: 'dark' });
  await sombre.goto(`${base}#/texte/peche`);
  await sombre.getByText('Ce qu’en pensent les participants').waitFor();
  await sombre.getByText('Ce qu’en pensent les participants').scrollIntoViewIfNeeded();
  await sombre.screenshot({ path: join(CAPTURES, '10-sombre.png') });
  assert.deepEqual([...large.erreurs, ...sombre.erreurs], []);
});

await navigateur.close();
serveur.close();
console.log(resultats.join('\n'));
console.log(echec ? '\nÉCHEC' : `\n${resultats.length} étapes réussies`);
process.exit(echec ? 1 : 0);
