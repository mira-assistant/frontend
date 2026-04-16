import * as keytar from 'keytar';

const SERVICE_NAME = 'mira-desktop';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const CLIENT_NAME_KEY = 'client_name';

export class TokenStorage {
  /**
   * Store tokens securely in OS keychain
   */
  static async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      // Store access token in keychain
      await keytar.setPassword(SERVICE_NAME, ACCESS_TOKEN_KEY, accessToken);

      // Store refresh token in keychain
      await keytar.setPassword(SERVICE_NAME, REFRESH_TOKEN_KEY, refreshToken);

      console.log('Tokens stored securely');
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw new Error('Failed to store authentication tokens');
    }
  }

  /**
   * Get access token from keychain
   */
  static async getAccessToken(): Promise<string | null> {
    try {
      return await keytar.getPassword(SERVICE_NAME, ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error retrieving access token:', error);
      return null;
    }
  }

  /**
   * Get refresh token from keychain
   */
  static async getRefreshToken(): Promise<string | null> {
    try {
      return await keytar.getPassword(SERVICE_NAME, REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error retrieving refresh token:', error);
      return null;
    }
  }

  /**
   * Get both tokens
   */
  static async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const [accessToken, refreshToken] = await Promise.all([
      TokenStorage.getAccessToken(),
      TokenStorage.getRefreshToken(),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Clear all stored tokens
   */
  static async clearTokens(): Promise<void> {
    try {
      await keytar.deletePassword(SERVICE_NAME, ACCESS_TOKEN_KEY);
      await keytar.deletePassword(SERVICE_NAME, REFRESH_TOKEN_KEY);
      console.log('Tokens cleared');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Check if tokens exist
   */
  static async hasTokens(): Promise<boolean> {
    const refreshToken = await TokenStorage.getRefreshToken();
    return !!refreshToken;
  }

  /**
 * Store client name
 */
  static async storeClientName(clientName: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, CLIENT_NAME_KEY, clientName);
  }

  /**
   * Get client name
   */
  static async getClientName(): Promise<string | null> {
    return await keytar.getPassword(SERVICE_NAME, CLIENT_NAME_KEY);
  }

  /**
   * Clear client name
   */
  static async clearClientName(): Promise<void> {
    await keytar.deletePassword(SERVICE_NAME, CLIENT_NAME_KEY);
  }
}