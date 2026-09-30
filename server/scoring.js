// Score de pertinence d'un texte (0 à 100).
//
//   score = 100 × (0,40 × activité parlementaire
//                + 0,30 × intérêt public
//                + 0,30 × participation dans l'app)
//           × facteur d'ancienneté
//
// Chaque composante est normalisée entre 0 et 1 ; le détail est renvoyé
// pour être affiché ("pourquoi je vois ce texte ?") et testé.
import { SEUIL_SCORE_FIL, FENETRE_VOTE_JOURS, ANCIENNETE_MAX_JOURS } from './config.js';

export const POIDS = { activite: 0.4, interet: 0.3, participation: 0.3 };

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const JOUR = 86400000;
const r2 = (x) => Math.round(x * 100) / 100;

// Date calendaire à Paris (AAAA-MM-JJ), indépendante du fuseau du serveur.
export const jourParis = (date) =>
  new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(date);

export function joursAvantVote(prochainVote, maintenant) {
  if (!prochainVote) return null;
  const d = Math.round((new Date(prochainVote) - new Date(jourParis(maintenant))) / JOUR);
  return d >= 0 ? d : null;
}

// Activité parlementaire : amendements récents + proximité d'un scrutin.
export function scoreActivite({ amendements30j = 0, joursVote = null }) {
  const amdt = clamp(amendements30j / 300);
  let vote = 0;
  if (joursVote != null) vote = joursVote <= FENETRE_VOTE_JOURS ? 1 : joursVote <= 30 ? 0.6 : 0.3;
  return 0.5 * amdt + 0.5 * vote;
}

// Intérêt public : pétitions liées (échelle log, 500 000 signatures = 1)
// + pic de vues Wikipédia (+200 % sur 7 jours = 1).
export function scoreInteret({ signatures = 0, variationWiki = 0 }) {
  const petition = clamp(Math.log10(1 + signatures) / Math.log10(500001));
  const pic = clamp(variationWiki / 2);
  return 0.5 * petition + 0.5 * pic;
}

// Divergence : entropie normalisée des parts d'opinions (0 = unanimité,
// 1 = avis également répartis entre toutes les opinions).
export function divergence(parts) {
  const p = parts.filter((x) => x > 0);
  const total = p.reduce((s, x) => s + x, 0);
  if (p.length < 2 || !total) return 0;
  const h = -p.reduce((s, x) => s + (x / total) * Math.log(x / total), 0);
  return h / Math.log(p.length);
}

// Participation : volume d'avis (échelle log, 5 000 avis = 1) + divergence.
export function scoreParticipation({ nbAvis = 0, partsOpinions = [] }) {
  const volume = clamp(Math.log10(1 + nbAvis) / Math.log10(5001));
  return 0.6 * volume + 0.4 * divergence(partsOpinions);
}

// Ancienneté : plein score jusqu'à 14 jours sans activité, décroissance
// linéaire jusqu'à ×0,5 à 30 jours, puis sortie du fil.
export function facteurAnciennete(joursInactif) {
  if (joursInactif <= 14) return 1;
  if (joursInactif <= ANCIENNETE_MAX_JOURS) return 1 - 0.5 * ((joursInactif - 14) / (ANCIENNETE_MAX_JOURS - 14));
  return 0;
}

export function calculerScore(entrees, maintenant) {
  const joursVote = joursAvantVote(entrees.prochainVote, maintenant);
  const joursInactif = joursVote != null
    ? 0 // un scrutin programmé est une activité en cours
    : Math.round((new Date(jourParis(maintenant)) - new Date(entrees.derniereActivite)) / JOUR);

  const activite = scoreActivite({ amendements30j: entrees.amendements30j, joursVote });
  const interet = scoreInteret(entrees);
  const participation = scoreParticipation(entrees);
  const brut = POIDS.activite * activite + POIDS.interet * interet + POIDS.participation * participation;
  const facteur = facteurAnciennete(joursInactif);
  const total = Math.round(100 * brut * facteur);

  const perime = joursInactif > ANCIENNETE_MAX_JOURS;
  const voteImminent = joursVote != null && joursVote <= FENETRE_VOTE_JOURS;
  const dansLeFil = !perime && (total >= SEUIL_SCORE_FIL || voteImminent);
  let raison;
  if (perime) raison = `Sans activité depuis ${joursInactif} jours : hors du fil`;
  else if (voteImminent) raison = joursVote === 0 ? 'Vote aujourd’hui' : `Vote dans ${joursVote} jour${joursVote > 1 ? 's' : ''}`;
  else if (total >= SEUIL_SCORE_FIL) raison = `Score ${total} ≥ seuil ${SEUIL_SCORE_FIL}`;
  else raison = `Score ${total} < seuil ${SEUIL_SCORE_FIL} : visible dans Explorer`;

  return {
    total,
    activite: r2(activite),
    interet: r2(interet),
    participation: r2(participation),
    facteur_anciennete: r2(facteur),
    jours_inactif: joursInactif,
    jours_avant_vote: joursVote,
    dans_le_fil: dansLeFil,
    raison,
  };
}
