// Routeur (hash) et coquille commune : en haut le sélecteur Actus/Carte et
// la barre de localisation, en bas la barre de navigation à 4 onglets.
import { html, api, annoncer } from './util.js';
import { RETOUR } from './composants.js';
import * as E from './ecrans.js';

export const etat = { config: null, moi: null, dernierResultat: null };

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
    ecran = { titre: 'Erreur', haut: 'onglets', contenu: html`<div class="vide"><p>Impossible de charger cette page.</p><p class="meta">${e.message}</p><a class="bouton mt-16" href="#/">Retour à l’accueil</a></div>` };
  }
  if (!ecran || monJeton !== jeton) return;

  const ongletBas = ecran.onglet === 'carte' ? 'accueil' : ecran.onglet;
  ecranCourant = ecran;
  afficherHaut();
  main.innerHTML = String(ecran.contenu);
  document.getElementById('cta').innerHTML = ecran.cta ? `<div class="cta-fixe">${ecran.cta}</div>` : '';
  document.getElementById('app').classList.toggle('avec-cta', !!ecran.cta);
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

async function demarrer() {
  [etat.config, etat.moi] = await Promise.all([api('/config'), api('/moi')]);
  window.addEventListener('hashchange', rendre);
  // Localisation modifiée dans Compte : on met à jour la barre du haut.
  document.addEventListener('moi-change', () => ecranCourant && afficherHaut());
  rendre();
}
demarrer();
