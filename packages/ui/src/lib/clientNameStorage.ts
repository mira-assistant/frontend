const KEY = 'mira_client_name';

export function getStoredClientName(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setStoredClientName(name: string): void {
  try {
    localStorage.setItem(KEY, name);
  } catch {
    /* ignore */
  }
}
