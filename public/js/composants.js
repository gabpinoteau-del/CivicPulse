import { html, nombre, compact, quandVote } from './util.js';

export const ICONES_CATEGORIE = { peche: '🎣', logement: '🏠', sante: '🏥', education: '🎓', agriculture: '🌾' };
const classeOp = (code) => `op-${code ?? 'autres'}`;

export function lettre(code, extra = '') {
  return html`<span class="lettre ${classeOp(code)} ${extra}" aria-hidden="true">${code ?? '…'}</span>`;
}

// Barre empilée : chaque segment porte sa lettre (pas d'identité par la
// couleur seule) et la liste textuelle est fournie aux lecteurs d'écran.
export function barreOpinions(rep, { grande = false } = {}) {
  const segments = [...rep.opinions.map((o) => ({ code: o.code, pct: o.pourcentage })), { code: null, pct: rep.autres.pourcentage }].filter((s) => s.pct > 0);
  const texte = segments.map((s) => `${s.code ? `opinion ${s.code}` : 'autres'} ${s.pct} %`).join(', ');
  return html`<div class="barre-opinions ${grande ? 'grande' : ''}" role="img" aria-label="Répartition : ${texte}">
    ${segments.map((s) => html`<span class="${classeOp(s.code)}" data-flex="${s.pct}">${grande && s.pct >= 8 ? (s.code ?? '+') : ''}</span>`)}
  </div>`;
}

export function badgeNiveau(b) {
  return b.niveau === 'verifie'
    ? html`<span class="badge-niveau verifie">✔ vérifié${b.preuve ? ` ${b.preuve}` : ''}</span>`
    : html`<span class="badge-niveau">déclaré</span>`;
}

export function iconeProfil(b, categorie) {
  if (b.type === 'chercheur') return '🔬';
  if (b.type === 'entreprise' || b.type === 'concerne') return ICONES_CATEGORIE[categorie] ?? '🏷';
  return '👤';
}

export function avisItem(a, categorie) {
  const principal = a.profil[0];
  return html`<article class="avis">
    <div class="profil">
      <span aria-hidden="true">${iconeProfil(principal, categorie)}</span>
      <span>${principal.libelle}</span>
      ${principal.type !== 'citoyen' ? badgeNiveau(principal) : html`<span class="meta">${principal.detail ?? ''}</span>`}
      <span class="meta">· ${a.lieu}</span>
    </div>
    ${a.profil.slice(1).map((b) => html`<div class="profil meta">${b.libelle} ${badgeNiveau(b)}</div>`)}
    <p class="corps">${a.contenu}</p>
    <div class="pied">${a.opinion ? html`${lettre(a.opinion)}<span>Opinion ${a.opinion}</span>` : html`<span>Autres avis</span>`}</div>
  </article>`;
}

export function metriquesCourtes(t) {
  const m = t.metriques;
  return html`<p class="metriques-ligne">
    ${m.amendements != null ? html`<span>📝 ${nombre(m.amendements)} amendements</span>` : ''}
    ${m.signatures != null ? html`<span>✍ ${compact(m.signatures)} signatures</span>` : ''}
    ${m.interet_variation != null ? html`<span>Intérêt <span class="tendance">${m.interet_variation >= 0 ? '↗' : '↘'} ${m.interet_variation >= 0 ? '+' : ''}${m.interet_variation} %</span></span>` : ''}
  </p>`;
}

export function carteTexte(t) {
  const vote = quandVote(t.prochain_vote, t.score.jours_avant_vote);
  return html`<a class="carte carte-lien" href="#/texte/${t.id}">
    <p class="meta">${ICONES_CATEGORIE[t.categorie] ?? ''} ${t.stade ?? ''}</p>
    <h3 class="mt-4">${t.titre_court}</h3>
    <p class="meta">${vote ? `${vote} · ` : ''}${nombre(t.nb_avis)} avis</p>
    ${metriquesCourtes(t)}
    <p class="score">Pourquoi ce texte ? ${t.score.raison}</p>
  </a>`;
}

export const CHEVRON = html`<svg class="chevron" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg>`;
export const RETOUR = html`<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M19 12H5m6-7-7 7 7 7"/></svg>`;
