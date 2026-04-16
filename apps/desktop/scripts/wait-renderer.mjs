import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const waitOn = require('wait-on');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, '..');

function loadEnvFile(filePath, { override } = { override: false }) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (override || process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(desktopRoot, '.env'), { override: false });
loadEnvFile(path.join(desktopRoot, '.env.local'), { override: true });

const port = process.env.MIRA_RENDERER_DEV_PORT || '59247';
const mainJs = path.join(desktopRoot, 'dist/main/background.js');

async function main() {
  await waitOn({
    resources: [`tcp:127.0.0.1:${port}`, mainJs],
    timeout: 120_000,
    interval: 400,
    window: 1000,
  });
}

main().catch((err) => {
  console.error('[wait-renderer]', err);
  process.exit(1);
});
