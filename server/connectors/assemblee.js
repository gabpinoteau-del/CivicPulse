// Connecteur Assemblée nationale (data.assemblee-nationale.fr)
// - flux quotidien des publications, vérifié toutes les heures : on ne
//   re-télécharge que les fichiers modifiés depuis le dernier passage ;
// - dossiers législatifs, scrutins (par groupe), amendements (nombre, sort).
import { lireFixture, metrique, jours } from './util.js';

export const id = 'assemblee';
export const nom = 'Assemblée nationale';
export const frequence = 'Toutes les heures (flux quotidien open data)';
export const URL_REELLE = 'https://data.assemblee-nationale.fr/travaux-parlementaires';

const source = (url) => ({ source_libelle: 'Assemblée nationale — open data', source_url: url });

export async function recuperer({ depuis } = {}) {
  const flux = JSON.parse(await lireFixture('an/flux-quotidien.json'));
  const nouveaux = flux.publications.filter((p) => !depuis || new Date(p.dateMaj) > depuis);
  const fichiers = {};
  for (const p of nouveaux) fichiers[p.fichier] = JSON.parse(await lireFixture(`an/${p.fichier}`));
  return { genere: flux.genere, publications: nouveaux, fichiers };
}

export function transformer(brut, maintenant) {
  const textes = [];
  const metriques = [];
  const f = brut.fichiers;

  const dossiers = f['dossiers-legislatifs.json']?.export.dossiersLegislatifs.dossier ?? [];
  const texteVersDossier = {};
  for (const { dossierParlementaire: d } of dossiers) {
    const actes = d.actesLegislatifs.acteLegislatif;
    const depot = actes.find((a) => a.codeActe === 'AN1-DEPOT');
    texteVersDossier[depot.texteAssocie] = d.uid;
    textes.push({
      ref_an: d.uid,
      titre: d.titreDossier.titre,
      type: d.procedureParlementaire.libelle,
      date_depot: depot.dateActe,
      url_an: `https://www.assemblee-nationale.fr/dyn/17/dossiers/${d.titreDossier.titreChemin}`,
      derniere_activite: actes.map((a) => a.dateActe).sort().at(-1),
    });
  }

  for (const [nomFichier, contenu] of Object.entries(f)) {
    if (!nomFichier.startsWith('amendements-')) continue;
    const liste = contenu.export.amendements.amendement;
    if (!liste.length) continue;
    const ref = texteVersDossier[liste[0].texteLegislatifRef];
    const adoptes = liste.filter((a) => a.cycleDeVie.sort === 'Adopté').length;
    const dates = liste.map((a) => a.cycleDeVie.dateDepot).sort();
    const recents = liste.filter((a) => jours(new Date(a.cycleDeVie.dateDepot), maintenant) <= 30).length;
    const url = `https://www.assemblee-nationale.fr/dyn/17/amendements?dossier=${ref}`;
    metriques.push(
      metrique(ref, id, 'amendements_deposes', liste.length, { date_mesure: dates.at(-1), ...source(url) }),
      metrique(ref, id, 'amendements_adoptes', adoptes, { date_mesure: dates.at(-1), ...source(url) }),
      metrique(ref, id, 'amendements_30j', recents, { date_mesure: dates.at(-1), ...source(url) }),
    );
    const t = textes.find((x) => x.ref_an === ref);
    if (t && dates.at(-1) > t.derniere_activite) t.derniere_activite = dates.at(-1);
  }

  for (const { scrutin: s } of f['scrutins.json']?.export.scrutins.scrutin ?? []) {
    const ref = s.objet.dossierLegislatif;
    const d = s.syntheseVote.decompte;
    metriques.push(
      metrique(ref, id, 'scrutin_final', {
        numero: s.numero,
        date: s.dateScrutin,
        resultat: s.sort.code,
        pour: Number(d.pour),
        contre: Number(d.contre),
        abstentions: Number(d.abstentions),
        groupes: s.ventilationVotes.organe.groupes.groupe.map((g) => ({
          groupe: g.libelleAbrege,
          position: g.vote.positionMajoritaire,
          pour: Number(g.vote.decompteVoix.pour),
          contre: Number(g.vote.decompteVoix.contre),
          abstentions: Number(g.vote.decompteVoix.abstentions),
        })),
      }, { date_mesure: s.dateScrutin, ...source(`https://www.assemblee-nationale.fr/dyn/17/scrutins/${s.numero}`) }),
    );
  }

  return { textes, metriques };
}

