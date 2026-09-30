// Magasin de données en mémoire. Il reproduit les tables de db/schema.sql
// (textes, metriques, utilisateurs, badges, avis, opinions, contestations)
// pour que le MVP tourne sans base ; en production, chaque fonction devient
// une requête SQL sur PostgreSQL.
import { now as maintenantParDefaut, REGIONS, CATEGORIES, SEUIL_AVIS_REGION } from './config.js';
import { ingerer } from './connectors/index.js';
import { EDITORIAL } from './data/editorial.js';
import { genererParticipation } from './data/seed.js';
import { calculerScore, divergence } from './scoring.js';
import { detecterCampagnes, trigrammes, jaccard } from './moderation/campagnes.js';
import { filtrer } from './moderation/filtre.js';
import { classer } from './ai/classifieur.js';

export const SEUIL_ANONYMAT_VILLE = 10; // ville affichée seulement si ≥ 10 participants de cette ville
export const SEUIL_NOUVELLE_OPINION = 3; // avis nécessaires pour ouvrir une nouvelle opinion
const JOUR = 86400000;
const NOM_REGION = Object.fromEntries(REGIONS.map((r) => [r.code, r.nom]));

export async function creerStore({ maintenant = maintenantParDefaut(), ingestion } = {}) {
  const ing = ingestion ?? (await ingerer(maintenant));

  const textes = new Map();
  for (const t of ing.textes) {
    const e = EDITORIAL[t.ref_an];
    if (!e) continue; // texte non encore résumé : pas publié
    textes.set(e.id, {
      ...t,
      id: e.id,
      titre_court: e.titre_court,
      resume: e.resume,
      profils_concernes: e.profils_concernes,
      opinions: e.opinions.map((o) => ({ ...o, statut: 'active' })),
    });
  }
  const parRef = new Map([...textes.values()].map((t) => [t.ref_an, t]));
  const metriques = ing.metriques;

  const { users, avis } = genererParticipation(maintenant);
  users.push({ id: 'moi', cree_le: new Date(maintenant - 200 * JOUR).toISOString(), region: 'BRE', ville: 'Lorient', csp: 'Employé·e', badges: [] });
  const usersById = new Map(users.map((u) => [u.id, u]));
  const propositions = []; // nouvelles opinions proposées par l'IA
  const contestations = [];
  const signalements = detecterCampagnes(avis, usersById);
  appliquerSignalements(signalements);

  function appliquerSignalements(liste) {
    const index = new Map(avis.map((a) => [a.id, a]));
    for (const s of liste) {
      for (const id of s.avis_ids) {
        const a = index.get(id);
        if (a && a.statut === 'publie') Object.assign(a, { statut: 'en_revue', motif_revue: s.motif });
      }
    }
  }

  // ------------------------------------------------------------------ calculs
  const avisDu = (ref) => avis.filter((a) => a.texte_ref === ref);
  const comptes = (liste) => liste.filter((a) => a.statut === 'publie');

  function repartition(t, liste) {
    const valides = comptes(liste);
    const total = valides.length;
    const parCode = {};
    for (const a of valides) {
      const k = a.opinion_code ?? 'autres';
      parCode[k] = (parCode[k] ?? 0) + 1;
    }
    const actives = t.opinions.filter((o) => o.statut === 'active');
    const nombres = [...actives.map((o) => parCode[o.code] ?? 0), parCode.autres ?? 0];
    const pct = pourcentages(nombres);
    const opinions = actives.map((o, i) => ({ code: o.code, libelle: o.libelle, nombre: nombres[i], pourcentage: pct[i] }));
    return {
      total,
      opinions,
      autres: { nombre: nombres.at(-1), pourcentage: pct.at(-1) },
      en_revue: liste.filter((a) => a.statut === 'en_revue').length,
    };
  }

  function metriquesDe(ref) {
    const m = metriques.filter((x) => x.texte_ref === ref);
    const get = (source, cle) => m.find((x) => x.source === source && x.cle === cle);
    return {
      scrutinAN: get('assemblee', 'scrutin_final'),
      amdtAN: get('assemblee', 'amendements_deposes'),
      amdtANAdoptes: get('assemblee', 'amendements_adoptes'),
      amdtAN30: get('assemblee', 'amendements_30j'),
      amdtSenat: get('senat', 'amendements_deposes'),
      amdtSenat30: get('senat', 'amendements_30j'),
      seance: get('senat', 'prochaine_seance'),
      petition: get('petitions', 'petition'),
      wiki: get('wikimedia', 'vues_wikipedia'),
    };
  }

  function score(t) {
    const m = metriquesDe(t.ref_an);
    const r = repartition(t, avisDu(t.ref_an));
    return calculerScore({
      prochainVote: t.prochain_vote,
      derniereActivite: t.derniere_activite,
      amendements30j: (m.amdtAN30?.valeur ?? 0) + (m.amdtSenat30?.valeur ?? 0),
      signatures: m.petition?.valeur.signatures ?? 0,
      variationWiki: m.wiki?.valeur.variation ?? 0,
      nbAvis: r.total,
      partsOpinions: [...r.opinions.map((o) => o.nombre), r.autres.nombre],
    }, maintenant);
  }

  function carte(t) {
    const r = repartition(t, avisDu(t.ref_an));
    return {
      id: t.id,
      titre: t.titre,
      titre_court: t.titre_court,
      categorie: t.categorie,
      stade: t.stade,
      prochain_vote: t.prochain_vote,
      nb_avis: r.total,
      nb_opinions: r.opinions.length,
      opinion_dominante: [...r.opinions].sort((a, b) => b.nombre - a.nombre)[0] ?? null,
      divergence: Math.round(divergence([...r.opinions.map((o) => o.nombre), r.autres.nombre]) * 100) / 100,
      metriques: resumeMetriques(t),
      score: score(t),
    };
  }

  function resumeMetriques(t) {
    const m = metriquesDe(t.ref_an);
    return {
      amendements: m.amdtAN ? m.amdtAN.valeur + (m.amdtSenat?.valeur ?? 0) : null,
      signatures: m.petition?.valeur.signatures ?? null,
      interet_variation: m.wiki ? Math.round(m.wiki.valeur.variation * 100) : null,
    };
  }

  // Métriques affichées sur la fiche, chacune avec sa source officielle.
  function metriquesAffichees(t) {
    const m = metriquesDe(t.ref_an);
    const src = (x) => ({ source: x.source_libelle, url: x.source_url, date: x.recupere_le });
    const out = [];
    const ligneSenat = { source: 'Sénat — Dosleg', url: t.url_senat, date: metriques[0]?.recupere_le ?? null };
    if (t.stade) out.push({ cle: 'stade', libelle: 'Stade', valeur: t.stade, ...(t.url_senat ? ligneSenat : { source: 'Assemblée nationale — open data', url: t.url_an }) });
    if (m.seance) out.push({ cle: 'prochain_vote', libelle: 'Prochain vote', valeur: m.seance.valeur, type: 'date', ...src(m.seance) });
    if (m.scrutinAN) {
      const s = m.scrutinAN.valeur;
      out.push({ cle: 'scrutin_an', libelle: 'Assemblée', valeur: `${s.resultat} ${s.pour} / ${s.contre}`, detail: s, ...src(m.scrutinAN) });
    }
    if (m.amdtAN) out.push({ cle: 'amendements_an', libelle: 'Amendements (Assemblée)', valeur: `${m.amdtAN.valeur} déposés (${m.amdtANAdoptes.valeur} adoptés)`, nombre: m.amdtAN.valeur, adoptes: m.amdtANAdoptes.valeur, ...src(m.amdtAN) });
    if (m.amdtSenat) out.push({ cle: 'amendements_senat', libelle: 'Amendements (Sénat)', valeur: `${m.amdtSenat.valeur} déposés, examen en cours`, nombre: m.amdtSenat.valeur, ...src(m.amdtSenat) });
    if (m.petition) out.push({ cle: 'petition', libelle: 'Pétition liée', valeur: m.petition.valeur.signatures, titre: m.petition.valeur.titre, etat: m.petition.valeur.etat, ...src(m.petition) });
    if (m.wiki) out.push({ cle: 'interet', libelle: 'Intérêt public', valeur: Math.round(m.wiki.valeur.variation * 100), detail: { recent: m.wiki.valeur.recent, reference: m.wiki.valeur.reference, serie: m.wiki.valeur.serie, article: m.wiki.valeur.article }, ...src(m.wiki) });
    return out;
  }

  const POIDS_BADGE = { verifie: 3, declare: 2 };
  function poidsProfil(u) {
    const experts = u.badges.filter((b) => ['concerne', 'chercheur', 'entreprise'].includes(b.type));
    return Math.max(1, ...experts.map((b) => POIDS_BADGE[b.niveau] ?? 1));
  }

  function lieuAffiche(u, ref) {
    const memeVille = new Set(avisDu(ref).map((a) => a.user_id).filter((id) => usersById.get(id)?.ville === u.ville));
    return memeVille.size >= SEUIL_ANONYMAT_VILLE ? u.ville : NOM_REGION[u.region];
  }

  // Avis affichés de façon anonymisée : profil + lieu, jamais d'identité.
  function avisPublic(a, t) {
    const u = usersById.get(a.user_id);
    const badges = u.badges.map((b) => ({ type: b.type, libelle: b.libelle, niveau: b.niveau, preuve: b.preuve ?? null }));
    return {
      id: a.id,
      contenu: a.contenu,
      opinion: a.opinion_code,
      profil: badges.length ? badges : [{ type: 'citoyen', libelle: 'Citoyen·ne', niveau: 'declare', detail: u.csp }],
      lieu: lieuAffiche(u, t.ref_an),
      date: a.cree_le,
      poids: poidsProfil(u),
    };
  }

  function avisClasses(t, { opinion, page = 1, parPage = 10 } = {}) {
    const liste = comptes(avisDu(t.ref_an))
      .filter((a) => !opinion || (opinion === 'autres' ? !a.opinion_code : a.opinion_code === opinion))
      .map((a) => ({ a, poids: poidsProfil(usersById.get(a.user_id)) }))
      // Profils concernés et experts d'abord (vérifiés avant déclarés), puis
      // avis à la une, puis les plus récents. Tous les avis restent visibles.
      .sort((x, y) => y.poids - x.poids || y.a.a_la_une - x.a.a_la_une || new Date(y.a.cree_le) - new Date(x.a.cree_le));
    return {
      total: liste.length,
      page,
      avis: liste.slice((page - 1) * parPage, page * parPage).map(({ a }) => avisPublic(a, t)),
    };
  }

  function regions(t) {
    const liste = comptes(avisDu(t.ref_an));
    return REGIONS.map((r) => {
      const ici = liste.filter((a) => usersById.get(a.user_id).region === r.code);
      const n = ici.length;
      const parCode = {};
      for (const a of ici) parCode[a.opinion_code ?? 'autres'] = (parCode[a.opinion_code ?? 'autres'] ?? 0) + 1;
      const actives = t.opinions.filter((o) => o.statut === 'active');
      const nombres = [...actives.map((o) => parCode[o.code] ?? 0), parCode.autres ?? 0];
      const pct = pourcentages(nombres);
      const ops = actives.map((o, i) => ({ code: o.code, nombre: nombres[i], pourcentage: pct[i] }));
      const suffisant = n >= SEUIL_AVIS_REGION;
      const dom = [...ops].sort((a, b) => b.nombre - a.nombre)[0];
      return {
        code: r.code,
        nom: r.nom,
        col: r.col,
        row: r.row,
        outremer: !!r.outremer,
        nb_avis: n,
        suffisant,
        // Sous le seuil : on n'affiche AUCUN pourcentage (fiabilité).
        dominante: suffisant ? { code: dom.code, pourcentage: dom.pourcentage } : null,
        opinions: suffisant ? ops : null,
        autres: suffisant ? pct.at(-1) : null,
      };
    });
  }

  // ------------------------------------------------------------------ API
  const api = {
    maintenant,
    signalements,
    journalIngestion: ing.journal,

    listerTextes({ categorie } = {}) {
      return [...textes.values()]
        .filter((t) => !categorie || t.categorie === categorie)
        .map(carte)
        .sort((a, b) => b.score.total - a.score.total);
    },

    accueil() {
      const tous = api.listerTextes();
      const fil = tous.filter((t) => t.score.dans_le_fil);
      const voteSemaine = fil
        .filter((t) => t.score.jours_avant_vote != null && t.score.jours_avant_vote <= 7)
        .sort((a, b) => a.score.jours_avant_vote - b.score.jours_avant_vote);
      return {
        vote_cette_semaine: voteSemaine[0] ?? null,
        fil,
        categories: CATEGORIES.map((c) => ({ ...c, nombre: tous.filter((t) => t.categorie === c.id).length })),
        debats_partages: tous.filter((t) => t.nb_opinions >= 3 && t.nb_avis >= SEUIL_AVIS_REGION).sort((a, b) => b.divergence - a.divergence).slice(0, 3),
        consensus: tous.filter((t) => t.opinion_dominante && t.nb_avis >= SEUIL_AVIS_REGION && pctDominante(t) >= 70).sort((a, b) => pctDominante(b) - pctDominante(a)).slice(0, 3),
      };
    },

    texte(id) {
      const t = textes.get(id);
      if (!t) return null;
      const r = repartition(t, avisDu(t.ref_an));
      return {
        id: t.id,
        ref_an: t.ref_an,
        titre: t.titre,
        titre_court: t.titre_court,
        type: t.type,
        categorie: t.categorie,
        stade: t.stade,
        prochain_vote: t.prochain_vote,
        url_an: t.url_an,
        url_senat: t.url_senat,
        resume: t.resume,
        metriques: metriquesAffichees(t),
        repartition: r,
        propositions: propositions.filter((p) => p.texte_ref === t.ref_an && p.statut === 'proposee').map((p) => ({ libelle: p.libelle, nombre: p.avis_ids.length })),
        avis: avisClasses(t),
        score: score(t),
        transparence: `Ces résultats reflètent les ${r.total.toLocaleString('fr-FR')} personnes qui ont participé sur CivicPulse, pas l’ensemble de la population française.`,
      };
    },

    avis(id, options) {
      const t = textes.get(id);
      return t ? avisClasses(t, options) : null;
    },

    carteRegions(id) {
      const t = textes.get(id);
      if (!t) return null;
      return { id: t.id, titre_court: t.titre_court, seuil: SEUIL_AVIS_REGION, opinions: t.opinions.filter((o) => o.statut === 'active').map(({ code, libelle }) => ({ code, libelle })), regions: regions(t) };
    },

    utilisateur(id) {
      const u = usersById.get(id);
      return u && { id: u.id, ville: u.ville, region: u.region, region_nom: NOM_REGION[u.region], csp: u.csp, badges: u.badges, cree_le: u.cree_le };
    },

    majUtilisateur(id, { ville, region, csp }) {
      const u = usersById.get(id);
      if (!u) return null;
      if (region && !NOM_REGION[region]) throw erreur(400, 'Région inconnue');
      if (ville !== undefined) {
        const v = String(ville).trim();
        if (!v || v.length > 80) throw erreur(400, 'Ville invalide');
        u.ville = v;
      }
      if (region) u.region = region;
      if (csp !== undefined) u.csp = csp;
      return api.utilisateur(id);
    },

    ajouterBadge(id, { type, identifiant, libelle }) {
      const u = usersById.get(id);
      if (!u) return null;
      let niveau = 'declare', preuve = null;
      if (type === 'chercheur' && identifiant) {
        if (!orcidValide(identifiant)) throw erreur(400, 'Identifiant ORCID invalide (format 0000-0000-0000-0000)');
        niveau = 'verifie'; preuve = 'ORCID';
      } else if (type === 'entreprise' && identifiant) {
        if (!sirenValide(identifiant)) throw erreur(400, 'Numéro SIREN invalide (9 chiffres)');
        niveau = 'verifie'; preuve = 'SIREN';
      } else if (!['concerne', 'chercheur', 'entreprise'].includes(type)) {
        throw erreur(400, 'Type de badge inconnu');
      }
      const libelleParDefaut = { chercheur: 'Chercheur·se', entreprise: 'Chef d’entreprise', concerne: 'Personne directement concernée' }[type];
      u.badges = u.badges.filter((b) => b.type !== type);
      u.badges.push({ type, libelle: (libelle || libelleParDefaut).slice(0, 80), niveau, preuve });
      return api.utilisateur(id);
    },

    async ajouterAvis(texteId, userId, contenu, { anthropic, date = new Date(maintenant.getTime()) } = {}) {
      const t = textes.get(texteId);
      const u = usersById.get(userId);
      if (!t || !u) throw erreur(404, 'Texte ou utilisateur introuvable');

      const filtre = filtrer(contenu);
      if (filtre.statut === 'rejete') throw erreur(422, filtre.motifs.join(' ; '));

      const opinionsActives = t.opinions.filter((o) => o.statut === 'active');
      const c = await classer({ texte: t, opinions: opinionsActives, contenu: filtre.contenu, profilDeclare: u.badges, profilsConcernes: t.profils_concernes }, { anthropic });
      if (c.moderation.statut === 'rejete') throw erreur(422, c.moderation.motif || 'Contenu refusé par la modération');

      // Un avis par personne et par texte : un nouvel envoi remplace le précédent.
      const existant = avis.find((a) => a.texte_ref === t.ref_an && a.user_id === u.id);
      const code = opinionsActives.some((o) => o.code === c.opinion) ? c.opinion : null;
      const a = existant ?? { id: `a${avis.length + 1}`, texte_ref: t.ref_an, user_id: u.id, a_la_une: false };
      Object.assign(a, {
        contenu: filtre.contenu,
        opinion_code: code,
        explication: c.explication,
        confiance: c.confiance,
        classe_par: c.moteur,
        statut: 'publie',
        motif_revue: null,
        cree_le: date.toISOString(),
      });
      if (!existant) avis.push(a);

      if (filtre.statut === 'a_revoir' || c.moderation.statut === 'a_revoir') {
        Object.assign(a, { statut: 'en_revue', motif_revue: [...filtre.motifs, c.moderation.motif].filter(Boolean).join(' ; ') });
      }

      // Détection de campagne sur les 24 dernières heures de ce texte.
      const recents = avisDu(t.ref_an).filter((x) => date - new Date(x.cree_le) <= JOUR);
      const nouveauxSignalements = detecterCampagnes(recents, usersById).filter((s) => s.avis_ids.includes(a.id));
      appliquerSignalements(nouveauxSignalements);
      signalements.push(...nouveauxSignalements);

      let proposition = null;
      if (c.opinion === 'NOUVELLE') proposition = proposerOpinion(t, a, c.nouvelle_opinion);

      const opinion = t.opinions.find((o) => o.code === a.opinion_code);
      return {
        avis: { id: a.id, statut: a.statut, motif_revue: a.motif_revue ?? null, contenu: a.contenu },
        classement: {
          opinion: a.opinion_code,
          opinion_libelle: opinion?.libelle ?? null,
          type: c.opinion === 'NOUVELLE' ? 'nouvelle' : c.opinion === 'HORS_SUJET' ? 'hors_sujet' : 'existante',
          proposition,
          explication: c.explication,
          confiance: c.confiance,
          opinion_secondaire: c.opinion_secondaire || null,
          profil_suggere: c.profil_suggere.type === 'aucun' ? null : c.profil_suggere,
          moteur: c.moteur,
        },
        remplace_avis_precedent: !!existant,
        donnees_personnelles_masquees: filtre.motifs.includes('Données personnelles masquées'),
      };
    },

    contester(avisId, userId, { opinion_code, commentaire = '' }) {
      const a = avis.find((x) => x.id === avisId);
      if (!a) throw erreur(404, 'Avis introuvable');
      if (a.user_id !== userId) throw erreur(403, 'Seul l’auteur peut contester le classement de son avis');
      const t = parRef.get(a.texte_ref);
      const cible = t.opinions.find((o) => o.code === opinion_code && o.statut === 'active');
      if (opinion_code && opinion_code !== 'autres' && !cible) throw erreur(400, 'Opinion inconnue');
      const c = { id: `c${contestations.length + 1}`, avis_id: a.id, ancienne_opinion: a.opinion_code, nouvelle_opinion: cible?.code ?? null, commentaire: String(commentaire).slice(0, 500), cree_le: new Date(maintenant).toISOString() };
      contestations.push(c);
      // L'auteur connaît mieux que l'IA sa propre position : le reclassement
      // est appliqué tout de suite et journalisé pour améliorer le classement.
      a.opinion_code = c.nouvelle_opinion;
      a.classe_par = 'auteur (contestation)';
      a.explication = cible ? `Reclassé par l’auteur dans l’opinion ${cible.code}.` : 'Reclassé par l’auteur dans « Autres ».';
      return { contestation: c, opinion: cible ? { code: cible.code, libelle: cible.libelle } : null };
    },

    mesAvis(userId) {
      return avis
        .filter((a) => a.user_id === userId)
        .map((a) => {
          const t = parRef.get(a.texte_ref);
          const o = t.opinions.find((x) => x.code === a.opinion_code);
          return { id: a.id, texte_id: t.id, texte: t.titre_court, contenu: a.contenu, opinion: a.opinion_code, opinion_libelle: o?.libelle ?? null, explication: a.explication ?? null, statut: a.statut, date: a.cree_le };
        })
        .sort((x, y) => new Date(y.date) - new Date(x.date));
    },

    // RGPD : droit d'accès (export) et droit à l'effacement.
    exporterDonnees(userId) {
      return { utilisateur: usersById.get(userId), avis: avis.filter((a) => a.user_id === userId), contestations: contestations.filter((c) => avis.find((a) => a.id === c.avis_id)?.user_id === userId) };
    },
    supprimerDonnees(userId) {
      const n = avis.length;
      for (let i = avis.length - 1; i >= 0; i--) if (avis[i].user_id === userId) avis.splice(i, 1);
      const u = usersById.get(userId);
      if (u) Object.assign(u, { badges: [], csp: null });
      return { avis_supprimes: n - avis.length };
    },

    sources() {
      return { journal: ing.journal, metriques: metriques.length, signalements: signalements.map((s) => ({ texte: parRef.get(s.texte_ref)?.titre_court, type: s.type, nombre: s.avis_ids.length, motif: s.motif })) };
    },
  };

  function pctDominante(c) {
    return c.nb_avis ? Math.round((100 * c.opinion_dominante.nombre) / c.nb_avis) : 0;
  }

  function proposerOpinion(t, a, libelle) {
    const tri = trigrammes(libelle || a.contenu);
    let p = propositions.find((x) => x.texte_ref === t.ref_an && x.statut === 'proposee' && jaccard(trigrammes(x.libelle), tri) >= 0.3);
    if (!p) {
      p = { id: `p${propositions.length + 1}`, texte_ref: t.ref_an, libelle: libelle || a.contenu.slice(0, 140), avis_ids: [], statut: 'proposee' };
      propositions.push(p);
    }
    if (!p.avis_ids.includes(a.id)) p.avis_ids.push(a.id);
    // Assez d'avis similaires : l'opinion est ouverte (lettre suivante) et
    // les avis de la proposition y sont rattachés.
    if (p.avis_ids.length >= SEUIL_NOUVELLE_OPINION) {
      const code = String.fromCharCode(65 + t.opinions.length);
      t.opinions.push({ code, libelle: p.libelle, explication: `rejoint la position « ${p.libelle} »`, mots_cles: [], statut: 'active' });
      for (const id of p.avis_ids) {
        const x = avis.find((y) => y.id === id);
        if (x) x.opinion_code = code;
      }
      p.statut = 'ouverte';
      p.code = code;
    }
    return { libelle: p.libelle, nombre: p.avis_ids.length, seuil: SEUIL_NOUVELLE_OPINION, ouverte: p.statut === 'ouverte', code: p.code ?? null };
  }

  return api;
}

// Pourcentages entiers dont la somme fait exactement 100 (plus fort reste).
export function pourcentages(nombres) {
  const total = nombres.reduce((a, b) => a + b, 0);
  if (!total) return nombres.map(() => 0);
  const bruts = nombres.map((n) => (100 * n) / total);
  const res = bruts.map(Math.floor);
  let reste = 100 - res.reduce((a, b) => a + b, 0);
  bruts.map((b, i) => [b - Math.floor(b), i]).sort((x, y) => y[0] - x[0]).forEach(([, i]) => { if (reste-- > 0) res[i]++; });
  return res;
}

export function erreur(status, message) {
  return Object.assign(new Error(message), { status });
}

// ORCID : 16 caractères, clé de contrôle ISO 7064 MOD 11-2.
export function orcidValide(s) {
  const m = /^(\d{4})-(\d{4})-(\d{4})-(\d{3}[\dX])$/.exec(String(s).trim());
  if (!m) return false;
  const chiffres = m.slice(1).join('');
  let total = 0;
  for (const c of chiffres.slice(0, 15)) total = (total + Number(c)) * 2;
  const r = (12 - (total % 11)) % 11;
  return chiffres[15] === (r === 10 ? 'X' : String(r));
}

// SIREN : 9 chiffres, clé de Luhn.
export function sirenValide(s) {
  const v = String(s).replace(/\s/g, '');
  if (!/^\d{9}$/.test(v)) return false;
  let total = 0;
  for (let i = 0; i < 9; i++) {
    let d = Number(v[8 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    total += d;
  }
  return total % 10 === 0;
}
