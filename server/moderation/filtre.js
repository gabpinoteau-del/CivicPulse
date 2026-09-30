// Pré-filtre de modération, exécuté AVANT tout appel à l'IA.
// Rapide et déterministe : bloque l'évident (menaces, insultes), masque les
// données personnelles. Le prompt de classement fait une seconde passe
// (contenus haineux ou illégaux plus subtils) et les signalements des
// utilisateurs alimentent une file de modération humaine.

export const normaliser = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'");

const REJET = [
  { motif: 'Menace de violence', re: /\b(je vais|on va|il faut|faut) (te|les|vous|le|la) (tuer|buter|crever|egorger|pendre)\b/ },
  { motif: 'Appel à la haine', re: /\bmort aux?\b/ },
  { motif: 'Insulte', re: /\b(connard|connasse|encul[eé]s?|salope|fdp|ntm|nique ta|batard)\b/ },
];
const REVUE = [
  { motif: 'Propos possiblement déshumanisants', re: /\b(sont des|ces|les) (rats|cafards|vermines?|parasites)\b/ },
];

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const TEL = /(?:(?:\+|00)33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/g;

export const LONGUEUR_MIN = 15;
export const LONGUEUR_MAX = 2000;

export function filtrer(contenu) {
  const texte = (contenu ?? '').trim();
  if (texte.length < LONGUEUR_MIN) return { statut: 'rejete', motifs: [`Avis trop court (${LONGUEUR_MIN} caractères minimum)`], contenu: texte };
  if (texte.length > LONGUEUR_MAX) return { statut: 'rejete', motifs: [`Avis trop long (${LONGUEUR_MAX} caractères maximum)`], contenu: texte };
  const n = normaliser(texte);
  const rejets = REJET.filter((r) => r.re.test(n)).map((r) => r.motif);
  if (rejets.length) return { statut: 'rejete', motifs: rejets, contenu: texte };
  const revue = REVUE.filter((r) => r.re.test(n)).map((r) => r.motif);
  // RGPD : on ne publie jamais d'e-mail ni de numéro de téléphone.
  const masque = texte.replace(EMAIL, '[e-mail masqué]').replace(TEL, '[téléphone masqué]');
  const motifs = [...revue];
  if (masque !== texte) motifs.push('Données personnelles masquées');
  return { statut: revue.length ? 'a_revoir' : 'ok', motifs, contenu: masque };
}
