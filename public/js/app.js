// Routeur (hash) et coquille commune : en haut le sélecteur Actus/Carte et
// la barre de localisation ; la navigation à 4 onglets est en bas sur mobile
// et tablette, dans une barre latérale sur ordinateur (tout en CSS).
// Chaque écran indique sa mise en page (`mise`) : le CSS s'en sert pour
// choisir la disposition sur grand écran, sans code spécifique par taille.
import { html, api, annoncer } from './util.js';
import { RETOUR } from './composants.js';
import * as E from './ecrans.js';

export const etat = { config: null, moi: null, dernierResultat: null, installation: null };

const ROUTES = [
  [/^\/$/, E.accueil],
  [/^\/carte$/, E.carte],
  [/^\/explorer$/, E.explorer],
  [/^\/mes-avis$/, E.mesAvis],
  [/^\/compte$/, E.compte],
  [/^\/texte\/([\w-]+)$/, E.detail],
  [/^\/texte\/([\w-]+)\/avis$/, E.saisie],
  [/^\/texte\/([\w-]+)\/confirmation$/, E.confirmation],
];

export function naviguer(hash, { remplacer = false, force = false } = {}) {
  if (location.hash === hash && force) return rendre();
  if (remplacer) {
    history.replaceState(null, '', hash);
    rendre();
  } else location.hash = hash;
  return null;
}

function hautOnglets(actif) {
  const moi = etat.moi;
  return html`<header class="haut">
    <nav class="segment" aria-label="Affichage">
      <a href="#/" ${actif === 'accueil' ? html`aria-current="page"` : ''}>Actus</a>
      <a href="#/carte" ${actif === 'carte' ? html`aria-current="page"` : ''}>Carte</a>
    </nav>
    <a class="localisation" href="#/compte" aria-label="Ma localisation : ${moi.ville}, ${moi.region_nom}. Modifier">
      <span aria-hidden="true">📍</span><span>${moi.ville}<span class="discret">, ${moi.region_nom}</span></span>
    </a>
  </header>`;
}

function hautRetour({ retour, titre, h1 = true }) {
  return html`<header class="entete-retour">
    <a class="bouton-icone" href="${retour}" aria-label="Retour">${RETOUR}</a>
    ${h1 ? html`<h1>${titre}</h1>` : html`<p><strong>${titre}</strong></p>`}
  </header>`;
}

let ecranCourant = null;
function afficherHaut() {
  const e = ecranCourant;
  document.getElementById('haut').innerHTML = String(e.haut === 'onglets' ? hautOnglets(e.onglet) : hautRetour(e.haut));
}

let jeton = 0;
async function rendre() {
  const monJeton = ++jeton;
  const [chemin, requete = ''] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(requete);
  const route = ROUTES.find(([re]) => re.test(chemin));
  const main = document.getElementById('main');
  if (!route) return naviguer('#/', { remplacer: true });
  let ecran;
  try {
    ecran = await route[1](params, ...chemin.match(route[0]).slice(1));
  } catch (e) {
    ecran = { titre: 'Erreur', erreur: true, haut: 'onglets', contenu: html`<div class="vide"><h1 class="h-vide">Impossible de charger cette page</h1>${messageErreur(e)}<a class="bouton mt-16" href="#/">Retour à l’accueil</a></div>` };
  }
  if (!ecran || monJeton !== jeton) return;

  const ongletBas = ecran.onglet === 'carte' ? 'accueil' : ecran.onglet;
  const app = document.getElementById('app');
  ecranCourant = ecran;
  app.dataset.mise = ecran.mise ?? 'lecture';
  afficherHaut();
  main.innerHTML = String(ecran.contenu);
  // Le bouton d'action (.cta-fixe) fait partie de l'écran : fixé en bas sur
  // mobile et tablette, dans la colonne de droite sur ordinateur.
  app.classList.toggle('avec-cta', !!main.querySelector('.cta-fixe'));
  document.querySelectorAll('.barre-onglets a').forEach((a) => {
    if (a.dataset.onglet === ongletBas) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  // Les largeurs de barres sont posées par JS : la CSP interdit les styles en ligne.
  document.querySelectorAll('[data-flex]').forEach((e) => { e.style.flex = e.dataset.flex; });
  ecran.apres?.(main);

  document.title = `${ecran.titre} · CivicPulse`;
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
  annoncer(ecran.titre);
}

function messageErreur(e) {
  return navigator.onLine === false
    ? html`<p class="meta mt-8">Tu es hors ligne. L’interface reste disponible, mais les données ne peuvent pas être chargées. Elles s’afficheront dès le retour de la connexion.</p>`
    : html`<p class="meta mt-8">${e.message}</p>`;
}

// App installable : le navigateur (Chrome, Edge, Android) propose
// l'installation ; on garde l'événement pour le bouton de l'écran Compte.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  etat.installation = e;
  document.dispatchEvent(new Event('installation-change'));
});
window.addEventListener('appinstalled', () => {
  etat.installation = null;
  document.dispatchEvent(new Event('installation-change'));
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}

let demarre = false;
async function demarrer() {
  const main = document.getElementById('main');
  try {
    [etat.config, etat.moi] = await Promise.all([api('/config'), api('/moi')]);
  } catch (e) {
    main.innerHTML = String(html`<div class="vide"><h1 class="h-vide">CivicPulse</h1>${messageErreur(e)}<button type="button" class="bouton mt-16" id="reessayer">Réessayer</button></div>`);
    main.querySelector('#reessayer').addEventListener('click', demarrer);
    return;
  }
  demarre = true;
  window.addEventListener('hashchange', rendre);
  // Retour de la connexion : on recharge l'écran s'il n'avait pas pu charger
  // (jamais un écran en cours de saisie, pour ne pas perdre un avis).
  window.addEventListener('online', () => ecranCourant?.erreur && rendre());
  // Localisation modifiée dans Compte : on met à jour la barre du haut.
  document.addEventListener('moi-change', () => ecranCourant && afficherHaut());
  rendre();
}
window.addEventListener('online', () => { if (!demarre) demarrer(); });
demarrer();
