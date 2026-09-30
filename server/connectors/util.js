import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');

// MVP : lecture des fichiers fictifs. En production, chaque connecteur
// remplace cet appel par un fetch() vers son URL_REELLE.
export async function lireFixture(rel) {
  return readFile(join(FIXTURES, rel), 'utf8');
}

export const JOUR_MS = 86400000;
export const jours = (a, b) => Math.floor((b - a) / JOUR_MS);

// Parseur CSV minimal (séparateur « ; », guillemets doublés) : suffisant
// pour les exports Dosleg / Ameli, sans dépendance.
export function parseCsv(texte, sep = ';') {
  const lignes = [];
  let ligne = [], champ = '', guillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; }
      else if (c === '"') guillemets = false;
      else champ += c;
    } else if (c === '"') guillemets = true;
    else if (c === sep) { ligne.push(champ); champ = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texte[i + 1] === '\n') i++;
      ligne.push(champ); champ = '';
      if (ligne.some((x) => x !== '')) lignes.push(ligne);
      ligne = [];
    } else champ += c;
  }
  if (champ !== '' || ligne.length) { ligne.push(champ); lignes.push(ligne); }
  const [entetes, ...rows] = lignes;
  return rows.map((r) => Object.fromEntries(entetes.map((h, i) => [h, r[i] ?? ''])));
}

// Une métrique = une valeur + sa source officielle (affichée dans l'app).
export function metrique(texteRef, source, cle, valeur, extra = {}) {
  return { texte_ref: texteRef, source, cle, valeur, ...extra };
}
