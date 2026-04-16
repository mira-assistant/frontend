import path from 'path';
import dotenv from 'dotenv';

// Must load before any module that reads process.env (e.g. shared/api/client).
// Packaged apps ship `.env.production` (written in CI before `npm run package`).
const rootDir = path.join(__dirname, '../..');
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.production'), override: true });
