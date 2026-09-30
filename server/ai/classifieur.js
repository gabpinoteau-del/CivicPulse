// Classement d'un avis dans une opinion.
//
// - Avec ANTHROPIC_API_KEY : appel à Claude (sorties structurées, schéma
//   imposé) avec le prompt de server/ai/prompt-classement.js.
// - Sans clé (démo hors ligne, tests) : classement local par mots-clés,
//   volontairement simple, qui renvoie exactement le même format.
import { PROMPT_SYSTEME, construireMessage, schemaSortie } from './prompt-classement.js';
import { normaliser } from '../moderation/filtre.js';

export const MODELE = process.env.CIVICPULSE_MODELE || 'claude-opus-5-5';

let clientParDefaut;
async function client() {
  if (clientParDefaut !== undefined) return clientParDefaut;
  if (!process.env.ANTHROPIC_API_KEY) return (clientParDefaut = null);
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    clientParDefaut = new Anthropic();
  } catch {
    clientParDefaut = null; // SDK non installé : repli local
  }
  return clientParDefaut;
}

export async function classer(entree, { anthropic } = {}) {
  const c = anthropic ?? (await client());
  if (c) {
    try {
      return await classerAvecClaude(c, entree);
    } catch (e) {
      // Panne de l'API : on ne perd pas l'avis, on le classe localement et
      // on le marque pour relecture.
      const r = classerLocalement(entree);
      return { ...r, moteur: 'local (repli après erreur IA)', erreur_ia: e.message };
    }
  }
  return classerLocalement(entree);
}

export async function classerAvecClaude(anthropic, entree) {
  const codes = entree.opinions.map((o) => o.code);
  const reponse = await anthropic.beta.messages.create({
    model: MODELE,
    max_tokens: 2048,
    // Classement court et répétitif : effort bas suffisant.
    output_config: { effort: 'low', format: { type: 'json_schema', schema: schemaSortie(codes) } },
    // Si un filtre de sécurité refuse la requête, l'API relance sur un
    // modèle de secours choisi selon la catégorie du refus.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: PROMPT_SYSTEME,
    messages: [{ role: 'user', content: construireMessage({ ...entree, avis: entree.contenu }) }],
  });
  if (reponse.stop_reason === 'refusal') {
    const r = classerLocalement(entree);
    return { ...r, moteur: 'local (refus IA)', moderation: { statut: 'a_revoir', motif: 'Refus du modèle : relecture humaine' } };
  }
  const bloc = reponse.content.find((b) => b.type === 'text');
  const sortie = JSON.parse(bloc.text);
  return { ...sortie, confiance: Math.min(1, Math.max(0, sortie.confiance)), moteur: `claude (${reponse.model})` };
}

// ---------------------------------------------------------------------------
// Classement local de secours
// ---------------------------------------------------------------------------
const contient = (texte, motCle) => new RegExp(`(^|[^a-z])${motCle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(texte);

export function classerLocalement({ opinions, contenu, profilsConcernes = [] }) {
  const n = normaliser(contenu);
  const scores = opinions
    .map((o) => ({
      o,
      score: o.mots_cles.reduce((s, m) => s + (contient(n, m) ? (m.includes(' ') ? 2 : 1) : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);
  const [premier, second] = scores;

  let opinion, explication, nouvelle = '';
  if (!premier || premier.score < 2) {
    opinion = 'NOUVELLE';
    nouvelle = propositionDepuis(contenu);
    explication = 'L’avis exprime une position qui ne correspond à aucune opinion existante.';
  } else {
    opinion = premier.o.code;
    explication = `L’avis ${premier.o.explication}, ce qui correspond à l’opinion ${opinion}.`;
  }
  const confiance = premier?.score ? Math.round((premier.score / (premier.score + (second?.score ?? 0) + 1)) * 100) / 100 : 0.2;

  return {
    opinion,
    opinion_secondaire: second && second.score >= 2 && opinion !== 'NOUVELLE' ? second.o.code : '',
    confiance,
    explication,
    nouvelle_opinion: nouvelle,
    profil_suggere: suggererProfil(n, profilsConcernes),
    moderation: { statut: 'ok', motif: '' },
    moteur: 'local',
  };
}

function propositionDepuis(contenu) {
  const phrase = contenu.split(/(?<=[.!?])\s/)[0].trim();
  return phrase.length > 140 ? `${phrase.slice(0, 137)}…` : phrase;
}

export function suggererProfil(n, profilsConcernes) {
  if (/je suis (chercheu|enseignant-chercheu|docteure? en)|mes travaux|ma these|mon laboratoire/.test(n)) {
    return { type: 'chercheur', libelle: 'Chercheur·se', a_verifier: true };
  }
  if (/mon entreprise|ma societe|je dirige|chef d'entreprise|je suis gerant/.test(n)) {
    return { type: 'entreprise', libelle: 'Chef d’entreprise', a_verifier: true };
  }
  for (const p of profilsConcernes) {
    if (new RegExp(`\\b(je suis|nous sommes|en tant que|j'ai|mon|ma|mes)\\b.*(${normaliser(p.motif)})`).test(n)) {
      return { type: 'concerne', libelle: `Personne directement concernée — ${p.libelle}`, a_verifier: true };
    }
  }
  return { type: 'aucun', libelle: '', a_verifier: true };
}
