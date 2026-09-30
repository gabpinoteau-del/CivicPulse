// Écrans de l'application. Chaque écran renvoie :
//   { titre, haut: 'onglets' | { retour, titre }, contenu, cta?, apres?(racine) }
import { html, api, nombre, compact, dateLongue, quandVote, dateRelative, annoncer } from './util.js';
import { barreOpinions, lettre, avisItem, carteTexte, metriquesCourtes, badgeNiveau, ICONES_CATEGORIE, CHEVRON } from './composants.js';
import { etat, naviguer } from './app.js';

// ------------------------------------------------------------------ Accueil
export async function accueil() {
  const d = await api('/accueil');
  const v = d.vote_cette_semaine;
  const autresDuFil = d.fil.filter((t) => t.id !== v?.id);
  return {
    titre: 'Actus',
    haut: 'onglets',
    onglet: 'accueil',
    contenu: html`
      <h1 class="sr-only">Actus : textes de loi en discussion</h1>
      ${v ? html`<section class="section" aria-labelledby="titre-vote">
        <div class="carte">
          <span class="pastille">🏛 Vote cette semaine</span>
          <h2 id="titre-vote" class="mt-8"><a href="#/texte/${v.id}">${v.titre_court}</a></h2>
          <p class="meta">${quandVote(v.prochain_vote, v.score.jours_avant_vote)} · ${nombre(v.nb_avis)} avis</p>
          ${metriquesCourtes(v)}
          <a class="bouton mt-16" href="#/texte/${v.id}/avis">Donner mon avis <span aria-hidden="true">→</span></a>
        </div>
      </section>` : ''}

      <section class="section" aria-labelledby="titre-cat">
        <h2 id="titre-cat">Thèmes</h2>
        <div class="categories">
          ${d.categories.map((c) => html`<a href="#/explorer?categorie=${c.id}"><span class="emoji" aria-hidden="true">${c.icone}</span>${c.libelle}</a>`)}
        </div>
      </section>

      ${d.debats_partages.length ? html`<section class="section" aria-labelledby="titre-debats">
        <h2 id="titre-debats">Débats très partagés</h2>
        <div class="carte">
          ${d.debats_partages.map((t) => html`<a class="ligne-liste" href="#/texte/${t.id}">
            <div><h3>${t.titre_court}</h3><p class="meta">${t.nb_opinions} opinions · ${nombre(t.nb_avis)} avis</p></div>${CHEVRON}
          </a>`)}
        </div>
      </section>` : ''}

      ${d.consensus.length ? html`<section class="section" aria-labelledby="titre-consensus">
        <h2 id="titre-consensus">Où il y a consensus</h2>
        <div class="carte">
          ${d.consensus.map((t) => html`<a class="ligne-liste" href="#/texte/${t.id}">
            <div><h3>${t.titre_court}</h3><p class="meta">${Math.round((100 * t.opinion_dominante.nombre) / t.nb_avis)} % d’accord : « ${t.opinion_dominante.libelle} »</p></div>${CHEVRON}
          </a>`)}
        </div>
      </section>` : ''}

      ${autresDuFil.length ? html`<section class="section" aria-labelledby="titre-fil">
        <h2 id="titre-fil">Dans l’actualité</h2>
        ${autresDuFil.map(carteTexte)}
      </section>` : ''}
      <p class="aide mt-16">Le fil n’affiche que les textes dont le score de pertinence dépasse le seuil ou dont le vote a lieu dans les 7 jours. Tous les textes restent dans Explorer.</p>
    `,
  };
}

// ------------------------------------------------------------------ Carte
export async function carte(params) {
  const liste = await api('/textes');
  const id = params.get('texte') || liste[0]?.id;
  const d = await api(`/textes/${id}/regions`);
  const maRegion = etat.moi?.region;
  let selection = params.get('region') || maRegion || 'BRE';
  const metro = d.regions.filter((r) => !r.outremer);
  const outremer = d.regions.filter((r) => r.outremer);
  const vueListe = params.get('vue') === 'liste';

  const rond = (r) => html`<button type="button" class="region" data-region="${r.code}" aria-pressed="${r.code === selection}"
      aria-label="${r.nom} : ${r.suffisant ? `opinion ${r.dominante.code} en tête, ${r.dominante.pourcentage} %, ${r.nb_avis} avis` : `pas encore assez d’avis (${r.nb_avis})`}"
      ${r.outremer ? '' : html`data-col="${r.col + 1}" data-row="${r.row + 1}"`}>
      <span class="rond ${r.suffisant ? `op-${r.dominante.code}` : 'insuffisant'}" aria-hidden="true">${r.suffisant ? html`${r.dominante.code}<small>${r.dominante.pourcentage} %</small>` : '—'}</span>
      <span class="nom" aria-hidden="true">${r.nom}</span>
    </button>`;

  const detailRegion = (code) => {
    const r = d.regions.find((x) => x.code === code);
    if (!r) return html``;
    if (!r.suffisant) {
      return html`<h3>${r.nom}</h3><p class="meta">Pas encore assez d’avis : ${r.nb_avis} sur ${d.seuil} nécessaires pour afficher un résultat fiable.</p>`;
    }
    const op = d.opinions.find((o) => o.code === r.dominante.code);
    return html`<h3>${r.nom} : opinion ${r.dominante.code} (${r.dominante.pourcentage} %)</h3>
      <p class="meta">« ${op.libelle} » · ${nombre(r.nb_avis)} avis</p>
      ${barreOpinions({ opinions: r.opinions.map((o) => ({ code: o.code, pourcentage: o.pourcentage })), autres: { pourcentage: r.autres } }, { grande: true })}`;
  };

  return {
    titre: 'Carte',
    haut: 'onglets',
    onglet: 'carte',
    contenu: html`
      <h1 class="sr-only">Carte des opinions par région</h1>
      <div class="mt-12">
        <label for="choix-texte">Texte affiché</label>
        <select id="choix-texte">${liste.map((t) => html`<option value="${t.id}" ${t.id === id ? 'selected' : ''}>${t.titre_court}</option>`)}</select>
      </div>
      <p class="aide">Pastille = opinion en tête dans la région et son pourcentage. Pointillés : moins de ${d.seuil} avis, pas de résultat affiché.</p>
      <p class="mt-8"><a href="#/carte?texte=${id}${vueListe ? '' : '&vue=liste'}" class="lien-bouton">${vueListe ? 'Voir la carte' : 'Voir sous forme de tableau'}</a></p>
      ${vueListe ? html`<table class="mt-8">
          <caption class="sr-only">Opinion en tête par région pour ${d.titre_court}</caption>
          <thead><tr><th scope="col">Région</th><th scope="col">Opinion en tête</th><th scope="col" class="nombre">Avis</th></tr></thead>
          <tbody>${d.regions.map((r) => html`<tr><th scope="row">${r.nom}</th><td>${r.suffisant ? `${r.dominante.code} (${r.dominante.pourcentage} %)` : 'Pas encore assez d’avis'}</td><td class="nombre">${nombre(r.nb_avis)}</td></tr>`)}</tbody>
        </table>`
      : html`<div class="carte-france" role="group" aria-label="Régions de France métropolitaine">${metro.map(rond)}</div>
        <div class="outremer" role="group" aria-label="Outre-mer">${outremer.map(rond)}</div>`}
      <section class="feuille" aria-labelledby="titre-feuille">
        <div class="poignee" aria-hidden="true"></div>
        <h2 id="titre-feuille">${d.titre_court}</h2>
        <div id="detail-region" class="mt-8" aria-live="polite">${detailRegion(selection)}</div>
        <ul class="legende mt-16">
          ${d.opinions.map((o) => html`<li>${lettre(o.code)}<span>${o.libelle}</span></li>`)}
        </ul>
        <a class="bouton secondaire mt-16" href="#/texte/${id}">Voir le texte et les avis</a>
      </section>`,
    apres(racine) {
      racine.querySelector('#choix-texte').addEventListener('change', (e) => naviguer(`#/carte?texte=${e.target.value}${vueListe ? '&vue=liste' : ''}`));
      racine.querySelectorAll('[data-col]').forEach((b) => { b.style.gridColumn = b.dataset.col; b.style.gridRow = b.dataset.row; });
      racine.querySelectorAll('.region').forEach((b) => b.addEventListener('click', () => {
        selection = b.dataset.region;
        racine.querySelectorAll('.region').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        const zone = racine.querySelector('#detail-region');
        zone.innerHTML = String(detailRegion(selection));
        zone.querySelectorAll('[data-flex]').forEach((e) => { e.style.flex = e.dataset.flex; });
      }));
    },
  };
}

// ------------------------------------------------------------------ Détail
export async function detail(params, id) {
  const t = await api(`/textes/${id}`);
  const onglet = params.get('onglet') === 'complet' ? 'complet' : 'resume';
  let filtre = null;
  let page = 1;
  const r = t.repartition;

  const valeurMetrique = (m) => {
    switch (m.cle) {
      case 'prochain_vote': return quandVote(m.valeur, t.score.jours_avant_vote)?.replace('Vote ', '') ?? dateLongue(m.valeur);
      case 'petition': return `${nombre(m.valeur)} signatures`;
      case 'interet': return html`<span class="tendance">${m.valeur >= 0 ? '↗ +' : '↘ '}${m.valeur} %</span>`;
      default: return m.valeur;
    }
  };
  const detailMetrique = (m) => {
    if (m.cle === 'interet') return `Vues de l’article Wikipédia : ${nombre(m.detail.recent)}/jour sur 7 jours, contre ${nombre(m.detail.reference)}/jour les 4 semaines précédentes.`;
    if (m.cle === 'petition') return `« ${m.titre} » — ${m.etat}`;
    if (m.cle === 'scrutin_an') return `Scrutin n° ${m.detail.numero} du ${new Date(m.detail.date).toLocaleDateString('fr-FR')} : ${m.detail.pour} pour, ${m.detail.contre} contre, ${m.detail.abstentions} abstentions.`;
    return '';
  };

  const listeAvis = (a) => html`${a.avis.map((x) => avisItem(x, t.categorie))}
    ${a.total > a.page * 10 ? html`<button type="button" class="bouton secondaire mt-12" id="plus-avis">Voir plus d’avis (${nombre(a.total - a.page * 10)} restants)</button>` : ''}`;

  return {
    titre: t.titre_court,
    haut: { retour: '#/', titre: t.titre_court },
    cta: html`<a class="bouton" href="#/texte/${t.id}/avis"><span aria-hidden="true">+</span> Ajouter mon avis</a>`,
    contenu: html`
      <div class="onglets-texte" role="tablist" aria-label="Contenu du texte">
        <button type="button" role="tab" id="tab-resume" aria-selected="${onglet === 'resume'}" aria-controls="panneau">Résumé neutre</button>
        <button type="button" role="tab" id="tab-complet" aria-selected="${onglet === 'complet'}" aria-controls="panneau">Texte complet</button>
      </div>
      <div id="panneau" role="tabpanel" aria-labelledby="tab-${onglet}">
      ${onglet === 'resume' ? html`<section class="section resume">
          <p class="meta">${ICONES_CATEGORIE[t.categorie] ?? ''} ${t.type}</p>
          <h2 class="mt-4">${t.titre}</h2>
          <h3>Ce que le texte change</h3>
          <ul>${t.resume.ce_qui_change.map((x) => html`<li>${x}</li>`)}</ul>
          <h3>Pour qui</h3>
          <ul>${t.resume.pour_qui.map((x) => html`<li>${x}</li>`)}</ul>
          <p class="aide mt-12">Résumé strictement factuel : il décrit le texte sans le juger. Données fictives de démonstration.</p>
        </section>`
      : html`<section class="section">
          <p>Le texte intégral et son historique sont publiés par les assemblées :</p>
          <div class="pile mt-12">
            ${t.url_an ? html`<a class="bouton secondaire" href="${t.url_an}" rel="noopener" target="_blank">Dossier sur le site de l’Assemblée nationale ↗</a>` : ''}
            ${t.url_senat ? html`<a class="bouton secondaire" href="${t.url_senat}" rel="noopener" target="_blank">Dossier sur le site du Sénat ↗</a>` : ''}
          </div>
          <p class="aide mt-12">V2 : texte consolidé affiché ici via l’API Légifrance.</p>
        </section>`}
      </div>

      <section class="section" aria-labelledby="titre-metriques">
        <h2 id="titre-metriques">Où en est le texte</h2>
        <ul class="metriques carte">
          ${t.metriques.map((m) => html`<li>
            <div class="ligne"><span>${m.libelle}</span><span class="valeur">${valeurMetrique(m)}</span></div>
            ${detailMetrique(m) ? html`<p class="meta">${detailMetrique(m)}</p>` : ''}
            <p class="source">Source : ${m.url ? html`<a href="${m.url}" rel="noopener" target="_blank">${m.source}</a>` : m.source}${m.date ? ` · relevé le ${new Date(m.date).toLocaleDateString('fr-FR')}` : ''}</p>
          </li>`)}
        </ul>
      </section>

      <section class="section" aria-labelledby="titre-opinions">
        <h2 id="titre-opinions">Ce qu’en pensent les participants</h2>
        <p class="meta">${nombre(r.total)} avis regroupés en ${r.opinions.length} opinions par l’IA</p>
        ${barreOpinions(r, { grande: true })}
        <div class="avertissement mt-12" role="note"><span aria-hidden="true">ℹ️</span><p>${t.transparence}${r.en_revue ? ` ${nombre(r.en_revue)} avis en cours de vérification (campagne coordonnée possible) ne sont pas comptés.` : ''}</p></div>
        <div class="choix-opinions mt-12" role="group" aria-label="Filtrer les avis par opinion">
          ${r.opinions.map((o) => html`<button type="button" data-opinion="${o.code}" aria-pressed="false">${lettre(o.code)}${o.pourcentage} %</button>`)}
          <button type="button" data-opinion="autres" aria-pressed="false" aria-label="Autres avis, ${r.autres.pourcentage} %">${lettre(null)}+ ${r.autres.pourcentage} %</button>
        </div>
        <div>
          ${r.opinions.map((o) => html`<div class="opinion-detail">${lettre(o.code)}<p>${o.libelle}</p><span class="pct">${o.pourcentage} %</span></div>`)}
          <div class="opinion-detail">${lettre(null)}<p>Autres avis, pas encore regroupés${t.propositions.length ? ` (nouvelle opinion proposée : « ${t.propositions[0].libelle} »)` : ''}</p><span class="pct">${r.autres.pourcentage} %</span></div>
        </div>
      </section>

      <section class="section" aria-labelledby="titre-avis">
        <h2 id="titre-avis">Avis</h2>
        <p class="aide">Les personnes directement concernées et les experts apparaissent d’abord (vérifiés, puis déclarés). Tous les avis restent visibles, affichés sans nom.</p>
        <div id="liste-avis" aria-live="polite">${listeAvis(t.avis)}</div>
      </section>
      <p class="score mt-16">Score de pertinence : ${t.score.total}/100 (activité ${t.score.activite}, intérêt ${t.score.interet}, participation ${t.score.participation}) — ${t.score.raison}</p>`,
    apres(racine) {
      racine.querySelector('#tab-resume').addEventListener('click', () => naviguer(`#/texte/${t.id}`, { remplacer: true }));
      racine.querySelector('#tab-complet').addEventListener('click', () => naviguer(`#/texte/${t.id}?onglet=complet`, { remplacer: true }));
      const zone = racine.querySelector('#liste-avis');
      async function charger(ajouter) {
        const q = new URLSearchParams({ page });
        if (filtre) q.set('opinion', filtre);
        const a = await api(`/textes/${t.id}/avis?${q}`);
        const existant = ajouter ? [...zone.querySelectorAll('.avis')].map((e) => e.outerHTML).join('') : '';
        zone.innerHTML = existant + String(listeAvis(a));
        brancherPlus();
        annoncer(`${a.total} avis${filtre ? ` pour ${filtre === 'autres' ? 'les autres avis' : `l’opinion ${filtre}`}` : ''}`);
      }
      function brancherPlus() {
        zone.querySelector('#plus-avis')?.addEventListener('click', () => { page += 1; charger(true); });
      }
      brancherPlus();
      racine.querySelectorAll('[data-opinion]').forEach((b) => b.addEventListener('click', () => {
        filtre = filtre === b.dataset.opinion ? null : b.dataset.opinion;
        page = 1;
        racine.querySelectorAll('[data-opinion]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.opinion === filtre)));
        charger(false);
      }));
    },
  };
}

// ------------------------------------------------------------------ Saisie
export async function saisie(params, id) {
  const t = await api(`/textes/${id}`);
  const moi = etat.moi;
  const profil = moi.badges[0];
  return {
    titre: `Mon avis — ${t.titre_court}`,
    haut: { retour: `#/texte/${id}`, titre: 'Mon avis' },
    contenu: html`
      <section class="section">
        <p class="meta">${t.titre_court}</p>
        <details class="mt-8"><summary>Rappel : ce que change le texte</summary>
          <ul class="mt-8">${t.resume.ce_qui_change.map((x) => html`<li>${x}</li>`)}</ul>
        </details>
      </section>
      <form class="section" id="form-avis" novalidate>
        <label for="avis">Qu’en penses-tu ? Explique avec tes mots.</label>
        <textarea id="avis" name="contenu" maxlength="2000" required aria-describedby="aide-avis compteur"></textarea>
        <p id="compteur" class="compteur">0 / 2000</p>
        <p id="aide-avis" class="aide">Une IA rattachera ton avis à l’opinion la plus proche et t’expliquera pourquoi ; tu pourras contester. N’écris ni nom, ni e-mail, ni numéro de téléphone.</p>
        <p class="mt-12">Ton avis sera affiché comme : <strong>${profil ? `${profil.libelle}` : 'Citoyen·ne'}</strong> ${profil ? badgeNiveau(profil) : ''} · ${moi.ville} ou ${moi.region_nom} <a href="#/compte">modifier</a></p>
        <div id="erreur" class="erreur" role="alert"></div>
        <button class="bouton mt-16" type="submit" id="envoyer">Envoyer mon avis</button>
      </form>`,
    apres(racine) {
      const zone = racine.querySelector('#avis');
      const compteur = racine.querySelector('#compteur');
      zone.addEventListener('input', () => { compteur.textContent = `${zone.value.length} / 2000`; });
      racine.querySelector('#form-avis').addEventListener('submit', async (e) => {
        e.preventDefault();
        const bouton = racine.querySelector('#envoyer');
        const erreur = racine.querySelector('#erreur');
        erreur.textContent = '';
        if (zone.value.trim().length < 15) {
          erreur.textContent = 'Ton avis doit faire au moins 15 caractères.';
          zone.focus();
          return;
        }
        bouton.disabled = true;
        bouton.innerHTML = '<span class="chargement"><span class="spinner" aria-hidden="true"></span>L’IA classe ton avis…</span>';
        annoncer('Envoi en cours, l’IA classe ton avis');
        try {
          etat.dernierResultat = { ...(await api(`/textes/${id}/avis`, { methode: 'POST', corps: { contenu: zone.value } })), texte: t };
          naviguer(`#/texte/${id}/confirmation`);
        } catch (err) {
          erreur.textContent = err.message;
          bouton.disabled = false;
          bouton.textContent = 'Envoyer mon avis';
        }
      });
    },
  };
}

// ------------------------------------------------------------------ Confirmation
export async function confirmation(params, id) {
  const res = etat.dernierResultat;
  if (!res || res.texte.id !== id) return naviguer(`#/texte/${id}`, { remplacer: true });
  const c = res.classement;
  const t = res.texte;
  const titre = c.type === 'existante' ? `Ton avis a rejoint l’opinion ${c.opinion}`
    : c.type === 'nouvelle' ? (c.proposition?.ouverte ? `Ton avis ouvre l’opinion ${c.proposition.code}` : 'Ton avis propose une nouvelle opinion')
    : 'Ton avis a été enregistré';
  return {
    titre,
    haut: { retour: `#/texte/${id}`, titre: t.titre_court, h1: false },
    contenu: html`
      <div class="confirmation-tete">
        <div class="coche" aria-hidden="true">✓</div>
        <h1>${titre}</h1>
        ${res.remplace_avis_precedent ? html`<p class="meta mt-8">Il remplace ton avis précédent sur ce texte (un avis par personne).</p>` : ''}
      </div>
      ${res.avis.statut === 'en_revue' ? html`<div class="avertissement"><span aria-hidden="true">⏳</span><p>Ton avis est en cours de vérification (${res.avis.motif_revue}). Il sera compté après relecture.</p></div>` : ''}
      ${res.donnees_personnelles_masquees ? html`<div class="avertissement mt-8"><span aria-hidden="true">🔒</span><p>Nous avons masqué des données personnelles (e-mail ou téléphone) dans ton avis.</p></div>` : ''}
      <section class="carte mt-16">
        ${c.type === 'existante' ? html`<div class="opinion-rejointe">${lettre(c.opinion)}<p><strong>${c.opinion_libelle}</strong></p></div>`
          : c.type === 'nouvelle' ? html`<p><strong>« ${c.proposition.libelle} »</strong></p><p class="meta mt-4">${c.proposition.ouverte ? 'Assez d’avis similaires : cette opinion est désormais affichée.' : `Elle sera affichée quand ${c.proposition.seuil} avis similaires l’auront rejointe (${c.proposition.nombre}/${c.proposition.seuil}).`}</p>`
          : html`<p>Ton avis ne semble pas porter sur ce texte : il est classé dans « Autres ».</p>`}
        <h2 class="mt-16">Pourquoi ?</h2>
        <p class="mt-4">${c.explication}</p>
        <p class="aide mt-8">Classement proposé par l’IA (${c.moteur}) · confiance ${Math.round(c.confiance * 100)} %</p>
      </section>

      ${c.profil_suggere ? html`<section class="carte mt-12" id="suggestion-profil">
        <h2>Tu sembles directement concerné·e</h2>
        <p class="mt-4">${c.profil_suggere.libelle}. Ajouter ce badge à ton profil ? Il sera affiché « déclaré » tant qu’il n’est pas vérifié.</p>
        <div class="pile mt-12">
          <button type="button" class="bouton accent" id="ajouter-badge">Ajouter le badge</button>
          <button type="button" class="bouton secondaire" id="refuser-badge">Non merci</button>
        </div>
      </section>` : ''}

      <section class="section" aria-labelledby="titre-contester">
        <h2 id="titre-contester">Ce classement ne te correspond pas ?</h2>
        <form id="form-contester" class="mt-8">
          <fieldset class="pile">
            <legend class="meta">Choisis l’opinion qui reflète le mieux ton avis :</legend>
            ${t.repartition.opinions.map((o) => html`<label class="option-radio"><input type="radio" name="opinion" value="${o.code}" ${o.code === c.opinion ? 'checked' : ''}><span><strong>${o.code}</strong> — ${o.libelle}</span></label>`)}
            <label class="option-radio"><input type="radio" name="opinion" value="autres" ${!c.opinion ? 'checked' : ''}><span>Aucune : ranger mon avis dans « Autres »</span></label>
          </fieldset>
          <label for="commentaire" class="mt-12">Commentaire (facultatif)</label>
          <input type="text" id="commentaire" maxlength="500">
          <button class="bouton secondaire mt-12" type="submit">Contester le classement</button>
          <p id="retour-contestation" class="mt-8" role="status"></p>
        </form>
      </section>
      <div class="pile section">
        <a class="bouton" href="#/texte/${id}">Voir les résultats</a>
        <a class="bouton secondaire" href="#/carte?texte=${id}">Voir sur la carte</a>
      </div>`,
    apres(racine) {
      racine.querySelector('#ajouter-badge')?.addEventListener('click', async () => {
        etat.moi = await api('/moi/badges', { methode: 'POST', corps: { type: c.profil_suggere.type, libelle: c.profil_suggere.libelle.replace(/^Personne directement concernée — /, '') } });
        racine.querySelector('#suggestion-profil').innerHTML = '<p>Badge ajouté à ton profil (déclaré). Tu peux le faire vérifier depuis Compte.</p>';
        annoncer('Badge ajouté');
      });
      racine.querySelector('#refuser-badge')?.addEventListener('click', () => racine.querySelector('#suggestion-profil').remove());
      racine.querySelector('#form-contester').addEventListener('submit', async (e) => {
        e.preventDefault();
        const choix = new FormData(e.target).get('opinion');
        const r = await api(`/avis/${res.avis.id}/contestation`, { methode: 'POST', corps: { opinion_code: choix === 'autres' ? null : choix, commentaire: racine.querySelector('#commentaire').value } });
        racine.querySelector('#retour-contestation').textContent = r.opinion ? `C’est noté : ton avis est maintenant dans l’opinion ${r.opinion.code}. Merci, cela nous aide à améliorer le classement.` : 'C’est noté : ton avis est rangé dans « Autres ».';
      });
    },
  };
}

// ------------------------------------------------------------------ Explorer
export async function explorer(params) {
  const categorie = params.get('categorie');
  const [liste, config] = [await api(`/textes${categorie ? `?categorie=${encodeURIComponent(categorie)}` : ''}`), etat.config];
  return {
    titre: 'Explorer',
    haut: 'onglets',
    onglet: 'explorer',
    contenu: html`
      <h1 class="mt-16">Explorer</h1>
      <p class="meta mt-4">Tous les textes suivis, y compris ceux hors du fil d’actus.</p>
      <div class="recherche"><label for="recherche" class="sr-only">Rechercher un texte</label><input type="text" id="recherche" placeholder="Rechercher un texte" autocomplete="off"></div>
      <div class="categories mt-12">
        <a href="#/explorer" aria-current="${!categorie}"><span class="emoji" aria-hidden="true">🗂</span>Tous</a>
        ${config.categories.map((c) => html`<a href="#/explorer?categorie=${c.id}" aria-current="${c.id === categorie}"><span class="emoji" aria-hidden="true">${c.icone}</span>${c.libelle}</a>`)}
      </div>
      <div id="resultats" class="section">${liste.length ? liste.map(carteTexte) : html`<p class="vide">Aucun texte dans ce thème pour l’instant.</p>`}</div>`,
    apres(racine) {
      racine.querySelector('#recherche').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        racine.querySelectorAll('#resultats .carte').forEach((c) => { c.hidden = q && !c.textContent.toLowerCase().includes(q); });
      });
    },
  };
}

// ------------------------------------------------------------------ Mes avis
export async function mesAvis() {
  const liste = await api('/moi/avis');
  const statut = { publie: 'Publié', en_revue: 'En vérification' };
  return {
    titre: 'Mes avis',
    haut: 'onglets',
    onglet: 'mes-avis',
    contenu: html`
      <h1 class="mt-16">Mes avis</h1>
      ${liste.length ? html`<div class="section">${liste.map((a) => html`<a class="carte carte-lien" href="#/texte/${a.texte_id}">
          <p class="meta">${a.texte} · ${dateRelative(a.date, etat.config.maintenant)} · ${statut[a.statut] ?? a.statut}</p>
          <p class="mt-8">${a.contenu}</p>
          <div class="opinion-rejointe mt-12">${lettre(a.opinion)}<p class="meta">${a.opinion ? `Opinion ${a.opinion} : ${a.opinion_libelle}` : 'Autres avis'}</p></div>
        </a>`)}</div>`
      : html`<div class="vide"><p>Tu n’as pas encore donné d’avis.</p><a class="bouton mt-16" href="#/">Voir les textes en discussion</a></div>`}`,
  };
}

// ------------------------------------------------------------------ Compte
export async function compte() {
  const moi = (etat.moi = await api('/moi'));
  const { regions } = etat.config;
  const sources = await api('/sources');
  return {
    titre: 'Compte',
    haut: 'onglets',
    onglet: 'compte',
    contenu: html`
      <h1 class="mt-16">Compte</h1>
      <form class="section carte" id="form-lieu">
        <h2>Ma localisation</h2>
        <p class="aide">Sert uniquement à calculer les résultats par région. Ta ville n’est affichée que si au moins 10 participants en viennent.</p>
        <label for="ville" class="mt-12">Ville</label>
        <input type="text" id="ville" value="${moi.ville}" autocomplete="address-level2" required maxlength="80">
        <label for="region" class="mt-12">Région</label>
        <select id="region">${regions.map((r) => html`<option value="${r.code}" ${r.code === moi.region ? 'selected' : ''}>${r.nom}</option>`)}</select>
        <button class="bouton mt-16" type="submit">Enregistrer</button>
        <p id="retour-lieu" role="status" class="mt-8"></p>
      </form>

      <section class="section carte" aria-labelledby="titre-badges">
        <h2 id="titre-badges">Mes badges</h2>
        <p class="aide">Déclarés par toi, ou vérifiés : ORCID pour les chercheurs, SIREN pour les entreprises.</p>
        ${moi.badges.length ? html`<ul class="metriques mt-8">${moi.badges.map((b) => html`<li><div class="ligne"><span>${b.libelle}</span>${badgeNiveau(b)}</div></li>`)}</ul>` : html`<p class="mt-8">Aucun badge : tes avis sont affichés comme « Citoyen·ne ».</p>`}
        <form id="form-badge" class="mt-12">
          <label for="type-badge">Ajouter un badge</label>
          <select id="type-badge">
            <option value="concerne">Personne directement concernée (déclaré)</option>
            <option value="chercheur">Chercheur·se (vérification ORCID)</option>
            <option value="entreprise">Entreprise (vérification SIREN)</option>
          </select>
          <label for="identifiant" class="mt-12">Précision ou identifiant</label>
          <input type="text" id="identifiant" placeholder="Ex. : Marin-pêcheur, 0000-0002-1825-0097, 732829320">
          <button class="bouton secondaire mt-12" type="submit">Ajouter</button>
          <p id="retour-badge" role="status" class="mt-8"></p>
        </form>
      </section>

      <section class="section carte" aria-labelledby="titre-donnees">
        <h2 id="titre-donnees">Mes données (RGPD)</h2>
        <p class="aide">Nous ne conservons que ta ville, ta région, ta catégorie socioprofessionnelle, tes badges et tes avis. Tes avis sont publiés sans nom.</p>
        <div class="pile mt-12">
          <button type="button" class="bouton secondaire" id="exporter">Télécharger mes données</button>
          <button type="button" class="bouton secondaire" id="supprimer">Supprimer mes avis et mon profil</button>
        </div>
        <p id="retour-donnees" role="status" class="mt-8"></p>
      </section>

      <section class="section carte" aria-labelledby="titre-sources">
        <h2 id="titre-sources">Sources des données</h2>
        <ul class="metriques mt-8">${sources.connecteurs.map((c) => {
          const j = sources.journal.find((x) => x.connecteur === c.id);
          return html`<li><div class="ligne"><span>${c.nom}</span><span class="valeur">${j?.ok ? '✔ à jour' : '⚠ indisponible'}</span></div><p class="source">${c.frequence} · <a href="${c.url.split('{')[0]}" rel="noopener" target="_blank">site officiel</a></p></li>`;
        })}</ul>
        <p class="aide mt-8">MVP : ces flux sont simulés avec des données fictives au format des sources réelles.</p>
      </section>`,
    apres(racine) {
      racine.querySelector('#form-lieu').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          etat.moi = await api('/moi', { methode: 'PUT', corps: { ville: racine.querySelector('#ville').value, region: racine.querySelector('#region').value } });
          racine.querySelector('#retour-lieu').textContent = 'Localisation enregistrée.';
          document.dispatchEvent(new Event('moi-change'));
        } catch (err) { racine.querySelector('#retour-lieu').textContent = err.message; }
      });
      racine.querySelector('#form-badge').addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = racine.querySelector('#type-badge').value;
        const valeur = racine.querySelector('#identifiant').value.trim();
        const corps = type === 'concerne' ? { type, libelle: valeur } : { type, identifiant: valeur };
        try {
          etat.moi = await api('/moi/badges', { methode: 'POST', corps });
          naviguer('#/compte', { remplacer: true, force: true });
        } catch (err) { racine.querySelector('#retour-badge').textContent = err.message; }
      });
      racine.querySelector('#exporter').addEventListener('click', async () => {
        const data = await api('/moi/export');
        const lien = document.createElement('a');
        lien.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        lien.download = 'mes-donnees-civicpulse.json';
        lien.click();
        racine.querySelector('#retour-donnees').textContent = 'Export téléchargé.';
      });
      racine.querySelector('#supprimer').addEventListener('click', async () => {
        if (!confirm('Supprimer définitivement tes avis et ton profil ?')) return;
        const r = await api('/moi', { methode: 'DELETE' });
        racine.querySelector('#retour-donnees').textContent = `${r.avis_supprimes} avis supprimé(s).`;
      });
    },
  };
}
