// Charge Playwright depuis le projet ou, à défaut, depuis l'installation globale.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

export function chargerPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    const global = execSync('npm root -g').toString().trim();
    return require(join(global, 'playwright'));
  }
}
