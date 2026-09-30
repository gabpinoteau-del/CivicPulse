// Détection des campagnes coordonnées.
//
// Deux signaux, calculés par texte :
//  1. Pic d'avis quasi identiques : une grappe d'avis dont les textes se
//     ressemblent (Jaccard sur trigrammes de mots ≥ SIMILARITE) dans une
//     fenêtre de FENETRE_H heures, signalée si elle compte au moins
//     TAILLE_MIN avis dont la moitié vient de comptes récents, ou au moins
//     TAILLE_MAX avis quels que soient les comptes. (Des avis courts et
//     proches sont normaux sur un texte très suivi : la taille seule ne
//     suffit pas.)
//  2. Afflux de comptes récents : sur 24 h, au moins 20 avis dont plus de
//     60 % viennent de comptes créés depuis moins de 7 jours.
//
// Les avis repérés passent en statut "en_revue" : ils restent visibles pour
// leur auteur mais ne sont plus comptés dans les pourcentages tant qu'un
// modérateur ne les a pas validés.
import { normaliser } from './filtre.js';

export const PARAMS = {
  FENETRE_H: 6,
  SIMILARITE: 0.6,
  TAILLE_MIN: 10,
  PART_RECENTS_GRAPPE: 0.5,
  TAILLE_MAX: 50,
  COMPTE_RECENT_JOURS: 7,
  AFFLUX_MIN: 20,
  AFFLUX_PART_RECENTS: 0.6,
};

const H = 3600 * 1000;

export function trigrammes(texte) {
  const mots = normaliser(texte).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const s = new Set();
  for (let i = 0; i < mots.length - 2; i++) s.add(`${mots[i]} ${mots[i + 1]} ${mots[i + 2]}`);
  if (!s.size && mots.length) s.add(mots.join(' '));
  return s;
}

export function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

export function detecterCampagnes(avis, usersById, p = PARAMS) {
  const signalements = [];
  const parTexte = new Map();
  for (const a of avis) {
    if (!parTexte.has(a.texte_ref)) parTexte.set(a.texte_ref, []);
    parTexte.get(a.texte_ref).push(a);
  }
  for (const [texteRef, liste] of parTexte) {
    liste.sort((x, y) => new Date(x.cree_le) - new Date(y.cree_le));
    const t = liste.map((a) => new Date(a.cree_le).getTime());
    const tri = liste.map((a) => trigrammes(a.contenu));

    const estRecent = (a) => {
      const u = usersById.get(a.user_id);
      return u && new Date(a.cree_le) - new Date(u.cree_le) < p.COMPTE_RECENT_JOURS * 24 * H;
    };

    // 1. Grappes de textes quasi identiques (union-find dans la fenêtre).
    const parent = liste.map((_, i) => i);
    const racine = (i) => (parent[i] === i ? i : (parent[i] = racine(parent[i])));
    for (let i = 0; i < liste.length; i++) {
      for (let j = i + 1; j < liste.length && t[j] - t[i] <= p.FENETRE_H * H; j++) {
        if (jaccard(tri[i], tri[j]) >= p.SIMILARITE) parent[racine(j)] = racine(i);
      }
    }
    const grappes = new Map();
    liste.forEach((a, i) => {
      const r = racine(i);
      if (!grappes.has(r)) grappes.set(r, []);
      grappes.get(r).push(a);
    });
    for (const g of grappes.values()) {
      const recents = g.filter(estRecent).length;
      if ((g.length >= p.TAILLE_MIN && recents / g.length >= p.PART_RECENTS_GRAPPE) || g.length >= p.TAILLE_MAX) {
        signalements.push({ texte_ref: texteRef, type: 'avis_identiques', avis_ids: g.map((a) => a.id), motif: `${g.length} avis quasi identiques publiés en rafale (écarts < ${p.FENETRE_H} h, ${recents} de comptes récents)` });
      }
    }

    // 2. Afflux de comptes récents sur 24 h glissantes.
    let debut = 0;
    const dejaSignales = new Set();
    for (let fin = 0; fin < liste.length; fin++) {
      while (t[fin] - t[debut] > 24 * H) debut++;
      const fenetre = liste.slice(debut, fin + 1);
      if (fenetre.length < p.AFFLUX_MIN) continue;
      const recents = fenetre.filter(estRecent);
      if (recents.length / fenetre.length > p.AFFLUX_PART_RECENTS) {
        const nouveaux = recents.filter((a) => !dejaSignales.has(a.id));
        nouveaux.forEach((a) => dejaSignales.add(a.id));
        if (nouveaux.length) signalements.push({ texte_ref: texteRef, type: 'comptes_recents', avis_ids: nouveaux.map((a) => a.id), motif: `${recents.length} avis sur ${fenetre.length} en 24 h viennent de comptes de moins de ${p.COMPTE_RECENT_JOURS} jours` });
      }
    }
  }
  return signalements;
}
