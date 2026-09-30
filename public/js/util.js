// Petits utilitaires : échappement HTML, appels API, formats français.

const ECHAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const echapper = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ECHAP[c]);

// Gabarit HTML : toute valeur interpolée est échappée, sauf les fragments
// déjà produits par html`` (objets Brut) — évite les injections XSS.
class Brut { constructor(s) { this.s = s; } toString() { return this.s; } }
export const brut = (s) => new Brut(s);
export function html(chaines, ...valeurs) {
  let out = '';
  chaines.forEach((c, i) => {
    out += c;
    if (i < valeurs.length) out += rendre(valeurs[i]);
  });
  return new Brut(out);
}
function rendre(v) {
  if (v instanceof Brut) return v.s;
  if (Array.isArray(v)) return v.map(rendre).join('');
  if (v === false || v == null) return '';
  return echapper(v);
}

export async function api(chemin, { methode = 'GET', corps } = {}) {
  const res = await fetch(`/api${chemin}`, {
    method: methode,
    headers: corps ? { 'Content-Type': 'application/json' } : {},
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.erreur || `Erreur ${res.status}`), { status: res.status });
  return data;
}

const nf = new Intl.NumberFormat('fr-FR');
export const nombre = (n) => nf.format(n);
export function compact(n) {
  if (n >= 1000) return `${nf.format(Math.round(n / 1000))} k`;
  return nf.format(n);
}
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
export function dateLongue(iso) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
export function quandVote(iso, jours) {
  if (jours == null) return null;
  if (jours === 0) return 'Vote aujourd’hui';
  if (jours === 1) return 'Vote demain';
  if (jours < 7) return `Vote ${JOURS[new Date(`${iso}T12:00:00`).getDay()]}`;
  return `Vote le ${new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
}
export function dateRelative(iso, maintenant) {
  const j = Math.floor((new Date(maintenant) - new Date(iso)) / 86400000);
  if (j <= 0) return 'aujourd’hui';
  if (j === 1) return 'hier';
  if (j < 30) return `il y a ${j} jours`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export function annoncer(message) {
  const zone = document.getElementById('annonce');
  zone.textContent = '';
  requestAnimationFrame(() => { zone.textContent = message; });
}
