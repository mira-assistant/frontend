import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(desktopRoot, '.env') });
dotenv.config({ path: path.join(desktopRoot, '.env.local'), override: true });

const port = process.env.MIRA_RENDERER_DEV_PORT || '59247';
const url = process.env.MIRA_RENDERER_DEV_URL || `http://127.0.0.1:${port}`;
execSync(`npx wait-on "${url}"`, { stdio: 'inherit', cwd: desktopRoot });
