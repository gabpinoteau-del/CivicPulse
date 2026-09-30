// Serveur HTTP sans dépendance : API JSON + fichiers statiques du front.
//   npm start  ->  http://localhost:3000
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerStore } from './store.js';
import { CATEGORIES, REGIONS, SEUIL_AVIS_REGION, now } from './config.js';
import { CONNECTEURS, PLANIFICATION, ingerer } from './connectors/index.js';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const ENTETES_SECURITE = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
};

export async function creerApp({ store } = {}) {
  store ??= await creerStore();

  const routes = [
    ['GET', /^\/api\/config$/, () => ({ categories: CATEGORIES, regions: REGIONS.map(({ code, nom }) => ({ code, nom })), seuil_avis_region: SEUIL_AVIS_REGION, maintenant: store.maintenant })],
    ['GET', /^\/api\/accueil$/, () => store.accueil()],
    ['GET', /^\/api\/textes$/, (_, q) => store.listerTextes({ categorie: q.get('categorie') || undefined })],
    ['GET', /^\/api\/textes\/([\w-]+)$/, ([id]) => store.texte(id)],
    ['GET', /^\/api\/textes\/([\w-]+)\/avis$/, ([id], q) => store.avis(id, { opinion: q.get('opinion') || undefined, page: Math.max(1, Number(q.get('page')) || 1) })],
    ['GET', /^\/api\/textes\/([\w-]+)\/regions$/, ([id]) => store.carteRegions(id)],
    ['POST', /^\/api\/textes\/([\w-]+)\/avis$/, ([id], _, body, user) => store.ajouterAvis(id, user, body.contenu)],
    ['POST', /^\/api\/avis\/(a\d+)\/contestation$/, ([id], _, body, user) => store.contester(id, user, body)],
    ['GET', /^\/api\/moi$/, (_, __, ___, user) => store.utilisateur(user)],
    ['PUT', /^\/api\/moi$/, (_, __, body, user) => store.majUtilisateur(user, body)],
    ['POST', /^\/api\/moi\/badges$/, (_, __, body, user) => store.ajouterBadge(user, body)],
    ['GET', /^\/api\/moi\/avis$/, (_, __, ___, user) => store.mesAvis(user)],
    ['GET', /^\/api\/moi\/export$/, (_, __, ___, user) => store.exporterDonnees(user)],
    ['DELETE', /^\/api\/moi$/, (_, __, ___, user) => store.supprimerDonnees(user)],
    ['GET', /^\/api\/sources$/, () => ({ ...store.sources(), connecteurs: CONNECTEURS.map((c) => ({ id: c.id, nom: c.nom, frequence: c.frequence, url: c.URL_REELLE })) })],
  ];

  async function lireCorps(req) {
    let taille = 0;
    const morceaux = [];
    for await (const m of req) {
      taille += m.length;
      if (taille > 20000) throw Object.assign(new Error('Requête trop volumineuse'), { status: 413 });
      morceaux.push(m);
    }
    if (!morceaux.length) return {};
    try {
      return JSON.parse(Buffer.concat(morceaux).toString('utf8'));
    } catch {
      throw Object.assign(new Error('JSON invalide'), { status: 400 });
    }
  }

  function envoyer(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...ENTETES_SECURITE });
    res.end(JSON.stringify(data));
  }

  async function servirFichier(res, chemin) {
    const rel = normalize(decodeURIComponent(chemin)).replace(/^([/\\])+/, '');
    if (rel.includes('..')) return envoyer(res, 400, { erreur: 'Chemin invalide' });
    const fichier = join(PUBLIC, rel || 'index.html');
    try {
      const contenu = await readFile(fichier);
      res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] ?? 'application/octet-stream', ...ENTETES_SECURITE });
      res.end(contenu);
    } catch {
      // Application monopage : toute route inconnue renvoie index.html.
      const index = await readFile(join(PUBLIC, 'index.html'));
      res.writeHead(200, { 'Content-Type': TYPES['.html'], ...ENTETES_SECURITE });
      res.end(index);
    }
  }

  return async function gerer(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return servirFichier(res, url.pathname);
    // MVP : un seul compte de démonstration. En production : session issue
    // de l'authentification (un compte par personne, voir docs).
    const user = 'moi';
    for (const [methode, motif, action] of routes) {
      const m = motif.exec(url.pathname);
      if (!m || req.method !== methode) continue;
      try {
        const body = ['POST', 'PUT'].includes(methode) ? await lireCorps(req) : {};
        const out = await action(m.slice(1), url.searchParams, body, user);
        return out == null ? envoyer(res, 404, { erreur: 'Introuvable' }) : envoyer(res, methode === 'POST' ? 201 : 200, out);
      } catch (e) {
        if (!e.status) console.error(e);
        return envoyer(res, e.status ?? 500, { erreur: e.status ? e.message : 'Erreur interne' });
      }
    }
    envoyer(res, 404, { erreur: 'Route inconnue' });
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const store = await creerStore();
  const port = Number(process.env.PORT) || 3000;
  createServer(await creerApp({ store })).listen(port, () => {
    console.log(`CivicPulse : http://localhost:${port}`);
    console.log(`Classement des avis : ${process.env.ANTHROPIC_API_KEY ? 'Claude' : 'local (définir ANTHROPIC_API_KEY pour utiliser Claude)'}`);
    for (const j of store.journalIngestion) console.log(`  source ${j.connecteur} : ${j.ok ? `${j.metriques} métriques` : `ERREUR ${j.erreur}`}`);
  });
  // Tâches planifiées : chaque connecteur repasse à sa fréquence. Dans le
  // MVP les fichiers fictifs ne changent pas ; on journalise simplement.
  const checkpoints = {};
  for (const [id, ms] of Object.entries(PLANIFICATION)) {
    setInterval(async () => {
      const { journal } = await ingerer(now(), { checkpoints, seulement: [id] });
      console.log(`[planif] ${id}`, journal.find((j) => j.connecteur === id));
    }, ms).unref();
  }
}
