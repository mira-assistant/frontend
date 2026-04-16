import path from 'path';
import { existsSync } from 'fs';
import dotenv from 'dotenv';

// Must load before any module that reads process.env (e.g. shared/api/client).
// Prefer monorepo `frontend/.env` in dev; fall back to app root (packaged / legacy `apps/desktop/.env`).
const frontendRoot = path.resolve(__dirname, '../../../..');
const appRoot = path.resolve(__dirname, '../..');

const envDir = existsSync(path.join(frontendRoot, '.env')) ? frontendRoot : appRoot;
dotenv.config({ path: path.join(envDir, '.env') });

const prodCandidates = [path.join(frontendRoot, '.env.production'), path.join(appRoot, '.env.production')];
for (const p of prodCandidates) {
  if (existsSync(p)) {
    dotenv.config({ path: p, override: true });
    break;
  }
}
