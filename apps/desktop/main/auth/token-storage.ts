import { app, safeStorage } from 'electron';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as keytar from 'keytar';

const SERVICE_NAME = 'dadei-desktop';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const CLIENT_NAME_KEY = 'client_name';

/** Encrypted auth payload in userData (one decrypt per read vs many keytar keychain hits). */
const AUTH_STORE_FILE = 'auth-store.v1.json';

type AuthBlob = {
  accessToken: string | null;
  refreshToken: string | null;
  clientName: string | null;
};

const emptyBlob = (): AuthBlob => ({
  accessToken: null,
  refreshToken: null,
  clientName: null,
});

function authStorePath(): string {
  return path.join(app.getPath('userData'), AUTH_STORE_FILE);
}

function useEncryptedFile(): boolean {
  return safeStorage.isEncryptionAvailable();
}

async function readEncryptedFile(): Promise<AuthBlob | null> {
  try {
    const raw = await fs.readFile(authStorePath(), 'utf-8');
    const parsed = JSON.parse(raw) as { enc?: string };
    if (!parsed.enc) return null;
    const plain = safeStorage.decryptString(Buffer.from(parsed.enc, 'base64'));
    const data = JSON.parse(plain) as AuthBlob;
    return {
      accessToken: data.accessToken ?? null,
      refreshToken: data.refreshToken ?? null,
      clientName: data.clientName ?? null,
    };
  } catch (e) {
    console.warn('Auth store unreadable, resetting file:', e);
    await removeEncryptedFile();
    return null;
  }
}

async function writeEncryptedFile(blob: AuthBlob): Promise<void> {
  const plain = JSON.stringify(blob);
  const enc = safeStorage.encryptString(plain).toString('base64');
  await fs.writeFile(authStorePath(), JSON.stringify({ enc }), 'utf-8');
}

async function removeEncryptedFile(): Promise<void> {
  await fs.unlink(authStorePath()).catch(() => {});
}

async function migrateKeytarToFileIfPresent(): Promise<AuthBlob | null> {
  const [accessToken, refreshToken, clientName] = await Promise.all([
    keytar.getPassword(SERVICE_NAME, ACCESS_TOKEN_KEY),
    keytar.getPassword(SERVICE_NAME, REFRESH_TOKEN_KEY),
    keytar.getPassword(SERVICE_NAME, CLIENT_NAME_KEY),
  ]);

  if (!accessToken && !refreshToken && !clientName) {
    return null;
  }

  const blob: AuthBlob = { accessToken, refreshToken, clientName };
  await writeEncryptedFile(blob);

  await Promise.all([
    keytar.deletePassword(SERVICE_NAME, ACCESS_TOKEN_KEY).catch(() => {}),
    keytar.deletePassword(SERVICE_NAME, REFRESH_TOKEN_KEY).catch(() => {}),
    keytar.deletePassword(SERVICE_NAME, CLIENT_NAME_KEY).catch(() => {}),
  ]);

  return blob;
}

async function readStateKeytar(): Promise<AuthBlob> {
  const [accessToken, refreshToken, clientName] = await Promise.all([
    keytar.getPassword(SERVICE_NAME, ACCESS_TOKEN_KEY),
    keytar.getPassword(SERVICE_NAME, REFRESH_TOKEN_KEY),
    keytar.getPassword(SERVICE_NAME, CLIENT_NAME_KEY),
  ]);
  return { accessToken, refreshToken, clientName };
}

async function writeStateKeytar(blob: AuthBlob): Promise<void> {
  const entries: [string, string | null][] = [
    [ACCESS_TOKEN_KEY, blob.accessToken],
    [REFRESH_TOKEN_KEY, blob.refreshToken],
    [CLIENT_NAME_KEY, blob.clientName],
  ];
  for (const [account, value] of entries) {
    if (value) {
      await keytar.setPassword(SERVICE_NAME, account, value);
    } else {
      await keytar.deletePassword(SERVICE_NAME, account).catch(() => {});
    }
  }
}

async function readState(): Promise<AuthBlob> {
  if (!useEncryptedFile()) {
    return readStateKeytar();
  }

  let fromFile = await readEncryptedFile();
  if (!fromFile) {
    fromFile = await migrateKeytarToFileIfPresent();
  }
  return fromFile ?? emptyBlob();
}

async function writeState(blob: AuthBlob): Promise<void> {
  if (!useEncryptedFile()) {
    await writeStateKeytar(blob);
    return;
  }

  const isEmpty = !blob.accessToken && !blob.refreshToken && !blob.clientName;
  if (isEmpty) {
    await removeEncryptedFile();
    return;
  }
  await writeEncryptedFile(blob);
}

export class TokenStorage {
  /**
   * Store tokens securely (encrypted app data on macOS/Windows when available; else OS keychain / credential store).
   */
  static async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      const cur = await readState();
      await writeState({
        ...cur,
        accessToken,
        refreshToken,
      });
      console.log('Tokens stored securely');
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  static async getAccessToken(): Promise<string | null> {
    try {
      const s = await readState();
      return s.accessToken;
    } catch (error) {
      console.error('Error retrieving access token:', error);
      return null;
    }
  }

  static async getRefreshToken(): Promise<string | null> {
    try {
      const s = await readState();
      return s.refreshToken;
    } catch (error) {
      console.error('Error retrieving refresh token:', error);
      return null;
    }
  }

  static async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const s = await readState();
    return { accessToken: s.accessToken, refreshToken: s.refreshToken };
  }

  static async clearTokens(): Promise<void> {
    try {
      const cur = await readState();
      await writeState({
        ...cur,
        accessToken: null,
        refreshToken: null,
      });
      console.log('Tokens cleared');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  static async hasTokens(): Promise<boolean> {
    const s = await readState();
    return !!s.refreshToken;
  }

  static async storeClientName(clientName: string): Promise<void> {
    const cur = await readState();
    await writeState({ ...cur, clientName });
  }

  static async getClientName(): Promise<string | null> {
    const s = await readState();
    return s.clientName;
  }

  static async clearClientName(): Promise<void> {
    const cur = await readState();
    await writeState({ ...cur, clientName: null });
  }
}
